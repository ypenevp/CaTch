# End-to-end check of CaTch for one bracelet. It replays real recorded motion over MQTT in phases
# (walking, still, lying, fall) with a different heart rate per phase and checks:
#   - services: Spring, AI server, Mosquitto, database
#   - vitals: the latest reading matches what was sent, the bracelet is online
#   - AI: every phase is recognised (walking / still / lie_getup_transition / fall)
#   - statistics: the 10-minute summary covers the heart rates of all phases
#   - notifications: a fall creates one notification (cooldown), WebSocket / email / push delivery,
#     and with -Email also the API: unread count, list, mark as read
#   - with -Adb the fall runs twice: once with the app open (no system notification, the Alerts badge grows)
#     and once with the app in the background (a system notification appears)
# Without -Email it checks through the database (Docker); with -Email it also logs in and checks the API.
# The password is read hidden and is never printed or saved.
param(
    [string]$Email,
    [string]$DeviceId = "Catch-001",
    [string]$ApiUrl = "http://127.0.0.1:8080",
    [string]$AiUrl = "http://127.0.0.1:8001",
    # 127.0.0.1, not localhost: Mosquitto listens on IPv4 only and localhost tries IPv6 first (2 s delay)
    [string]$Broker = "127.0.0.1",
    [int]$Port = 1883,
    # The server analyses the last 75 readings after every 38 new ones, so 120 s gives every phase a clean window
    [int]$PhaseSeconds = 120,
    [string[]]$Phases = @("walking", "still", "lying", "fall"),
    # Quiet time between the two falls with -Adb; must be longer than the server cooldown (60 s)
    [int]$RecoverySeconds = 70,
    [string]$DbContainer = "docker-sql-db-1",
    [string]$DbName = "CaTchDB",
    # Use the Android emulator: screenshots, the fall with the app open and in the background, push checks
    [switch]$Adb,
    [string]$ScreenshotDir = (Join-Path $PSScriptRoot "test-screens")
)

$mosquittoPub = "C:\Program Files\Mosquitto\mosquitto_pub.exe"
$appPackage = "com.catchapp.app"
$topic = "devices/$DeviceId/measurements"
$encodedDevice = [Uri]::EscapeDataString($DeviceId)
$culture = [Globalization.CultureInfo]::InvariantCulture
$useApi = [bool]$Email
$script:token = $null
$script:results = New-Object System.Collections.ArrayList
$script:allRates = New-Object System.Collections.ArrayList
$script:lastAnalysisId = 0
$script:lastNotificationId = 0
$script:unreadBefore = 0

# With -File, "-Phases walking,fall" arrives as one string, so split it here
$Phases = @($Phases | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })

$expected = @{
    walking = @{ activities = @("walking", "stairs"); heartRate = 96 }
    still   = @{ activities = @("still"); heartRate = 72 }
    lying   = @{ activities = @("lie_getup_transition"); heartRate = 62 }
    fall    = @{ activities = @("fall"); heartRate = 110 }
}

# ---------------------------------------------------------------------------
function Step([string]$text) { Write-Host ""; Write-Host $text -ForegroundColor Cyan }
function Report([string]$result, [string]$check, [string]$detail) {
    $color = @{ PASS = "Green"; FAIL = "Red"; INFO = "Gray" }[$result]
    Write-Host ("  [{0}] {1}: {2}" -f $result, $check, $detail) -ForegroundColor $color
    [void]$script:results.Add([pscustomobject]@{ Result = $result; Check = $check; Detail = $detail })
}
function Pass([string]$check, [string]$detail) { Report "PASS" $check $detail }
function Fail([string]$check, [string]$detail) { Report "FAIL" $check $detail }
function Info([string]$check, [string]$detail) { Report "INFO" $check $detail }

function Api([string]$Method, [string]$Path, $Body = $null) {
    $headers = @{ Accept = "application/json" }
    if ($script:token) { $headers.Authorization = "Bearer $($script:token)" }
    $request = @{ Method = $Method; Uri = "$ApiUrl$Path"; Headers = $headers; TimeoutSec = 10 }
    if ($null -ne $Body) {
        $request.Body = $Body | ConvertTo-Json -Compress
        $request.ContentType = "application/json"
    }
    try {
        return @{ ok = $true; data = Invoke-RestMethod @request }
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $message = $_.ErrorDetails.Message
        try { $message = ($message | ConvertFrom-Json).message } catch {}
        if (-not $message) { $message = $_.Exception.Message }
        return @{ ok = $false; status = $status; message = $message }
    }
}

function Db([string]$sql) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $null }
    $result = docker exec $DbContainer psql -U postgres -d $DbName -tAc $sql 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $result
}

function ToEpoch($value) {
    if ($value -is [DateTime]) { return ([DateTimeOffset]$value).ToUnixTimeMilliseconds() / 1000.0 }
    return [DateTimeOffset]::Parse([string]$value, $culture).ToUnixTimeMilliseconds() / 1000.0
}
function NowEpoch { return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() / 1000.0 }

function Publish($motion, [int]$heartRate, [double]$spo2) {
    $reading = [ordered]@{
        ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); deviceId = $DeviceId
        accelX = $motion[0]; accelY = $motion[1]; accelZ = $motion[2]
        gyroX = $motion[3]; gyroY = $motion[4]; gyroZ = $motion[5]
        heartRate = $heartRate; spo2 = $spo2
    }
    $reading | ConvertTo-Json -Compress | & $mosquittoPub -h $Broker -p $Port -t $topic -s
}

# New AI analyses since an id, oldest first: { id, activity, fall, p, windowStart }
function Get-NewAnalyses([long]$sinceId) {
    $list = @()
    if ($useApi) {
        $page = Api GET "/api/v1/devices/$encodedDevice/analyses?page=0&size=10"
        if ($page.ok) {
            $list = @($page.data.content | Where-Object { $_.id -gt $sinceId } | ForEach-Object {
                [pscustomobject]@{ id = [long]$_.id; activity = $_.activity; fall = [bool]$_.fallDetected
                    p = [double]$_.fallProbability; windowStart = ToEpoch $_.windowStartAt }
            })
        }
    } else {
        $rows = Db "select id, activity, fall_detected, fall_probability, extract(epoch from window_start_at) from ai_analyses where device_id = $script:devicePk and id > $sinceId order by id"
        $list = @($rows | Where-Object { $_ } | ForEach-Object {
            $c = $_ -split '\|'
            [pscustomobject]@{ id = [long]$c[0]; activity = $c[1]; fall = ($c[2] -eq 't')
                p = [double]::Parse($c[3], $culture); windowStart = [double]::Parse($c[4], $culture) }
        })
    }
    return @($list | Sort-Object id)
}

function Get-LatestReading {
    if ($useApi) {
        $r = Api GET "/api/v1/devices/$encodedDevice/measurements/latest"
        if ($r.ok) { return [pscustomobject]@{ heartRate = [int]$r.data.heartRate; spo2 = [double]$r.data.spo2 } }
        return $null
    }
    $row = Db "select heart_rate, spo2 from device_measurements where device_id = $script:devicePk order by id desc limit 1"
    if (-not $row) { return $null }
    $c = $row -split '\|'
    return [pscustomobject]@{ heartRate = [int]$c[0]; spo2 = [double]::Parse($c[1], $culture) }
}

function Test-Online {
    if ($useApi) {
        $d = Api GET "/api/v1/devices/$encodedDevice"
        return ($d.ok -and $d.data.online)
    }
    return ((Db "select coalesce(now() - max(received_at) < interval '10 seconds', false) from device_measurements where device_id = $script:devicePk") -eq 't')
}

function Get-UnreadCount {
    if ($useApi) { return [int](Api GET "/api/v1/notifications/unread-count").data.unreadCount }
    return 0
}

# --- emulator helpers ------------------------------------------------------
function AdbShot([string]$name) {
    if (-not $Adb) { return }
    New-Item -ItemType Directory -Force -Path $ScreenshotDir | Out-Null
    $path = Join-Path $ScreenshotDir "$name.png"
    cmd /c "adb exec-out screencap -p > `"$path`""
    Info "Screenshot" $path
}
function Count-AppNotifications { return @(adb shell dumpsys notification --noredact 2>$null | Select-String "pkg=$appPackage").Count }
function Test-AppInForeground { return [bool](adb shell dumpsys activity activities 2>$null | Select-String "ResumedActivity.*$appPackage") }
function Open-App { adb shell monkey -p $appPackage -c android.intent.category.LAUNCHER 1 2>$null | Out-Null; Start-Sleep -Seconds 3 }
function Send-AppToBackground { adb shell input keyevent 3 | Out-Null; Start-Sleep -Seconds 2 }
# The Alerts tab says "Alerts, N unread" to screen readers; -1 when the tab bar is not on screen
function Get-AlertsBadge {
    $xml = adb exec-out uiautomator dump /dev/tty 2>$null | Out-String
    $match = [regex]::Match($xml, 'content-desc="Alerts, (\d+) unread"')
    if ($match.Success) { return [int]$match.Groups[1].Value }
    if ($xml -match 'content-desc="Alerts"') { return 0 }
    return -1
}

# --- one phase of motion -----------------------------------------------------
function Run-Phase([string]$phase, [string]$label, [int]$seconds, [switch]$SkipAi) {
    Step ("Phase '{0}' for {1} s (heart rate ~{2})" -f $label, $seconds, $expected[$phase].heartRate)
    $samples = $segments[$phase]
    $phaseStart = NowEpoch
    $analyses = @()
    $lastRate = 0
    $clock = [Diagnostics.Stopwatch]::StartNew()
    for ($second = 0; $second -lt $seconds; $second++) {
        $lastRate = $expected[$phase].heartRate + (Get-Random -Minimum -2 -Maximum 3)
        [void]$script:allRates.Add($lastRate)
        Publish $samples[$second % $samples.Count] $lastRate 97.5

        if ($second % 5 -eq 4) {
            foreach ($a in (Get-NewAnalyses $script:lastAnalysisId)) {
                $analyses += $a
                $script:lastAnalysisId = $a.id
                Write-Host ("    {0,3} s  AI: {1,-22} fall={2} p={3}" -f ($second + 1), $a.activity, $a.fall, [math]::Round($a.p, 2)) -ForegroundColor Gray
            }
        }
        $wait = ($second + 1) * 1000 - $clock.ElapsedMilliseconds
        if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
    }
    Start-Sleep -Seconds 2
    foreach ($a in (Get-NewAnalyses $script:lastAnalysisId)) { $analyses += $a; $script:lastAnalysisId = $a.id }

    if (-not $SkipAi) {
        # Only a window that started inside this phase shows the phase alone
        $clean = @($analyses | Where-Object { $_.windowStart -ge $phaseStart - 1 }) | Select-Object -Last 1
        if (-not $clean) {
            Fail "AI $label" "no analysis with a full window inside the phase ($($analyses.Count) analyses in total)"
        } elseif ($expected[$phase].activities -contains $clean.activity) {
            Pass "AI $label" "$($clean.activity) (fall=$($clean.fall), p=$([math]::Round($clean.p, 2)))"
        } else {
            Fail "AI $label" "got $($clean.activity), expected $($expected[$phase].activities -join ' or ')"
        }
        if ($phase -eq "fall" -and $clean) {
            if ($clean.fall) { Pass "Fall detected ($label)" "fallDetected=true" } else { Fail "Fall detected ($label)" "fallDetected=false" }
        }
    }

    $reading = Get-LatestReading
    if ($reading -and $reading.heartRate -eq $lastRate) { Pass "Vitals $label" "latest heart rate $($reading.heartRate), SpO2 $($reading.spo2)" }
    elseif ($reading) { Fail "Vitals $label" "latest heart rate $($reading.heartRate), last sent $lastRate" }
    else { Fail "Vitals $label" "no latest reading" }
    if (Test-Online) { Pass "Online $label" "bracelet is online" } else { Fail "Online $label" "bracelet is not online" }
}

# --- the notification after a fall -----------------------------------------
# $appState: "open" (expect no system notification, the Alerts badge grows), "background" (expect a system
# notification) or "any" (no emulator)
function Check-Notification([string]$label, [string]$appState, [int]$systemBefore, [int]$badgeBefore) {
    Step "Notification ($label)"
    $ids = @()
    for ($i = 0; $i -lt 10 -and -not $ids.Count; $i++) {
        if ($useDb) {
            $ids = @(Db "select id from notifications where device_id = $script:devicePk and id > $script:lastNotificationId order by id" | Where-Object { $_ } | ForEach-Object { [long]$_ })
        } elseif ((Get-UnreadCount) -gt $script:unreadBefore) {
            $ids = @([long](Api GET "/api/v1/notifications?page=0&size=1").data.content[0].id)
        }
        if (-not $ids.Count) { Start-Sleep -Seconds 2 }
    }
    if (-not $ids.Count) {
        Fail "Notification ($label)" "none created. A notification for this bracelet in the last 60 s blocks a new one (cooldown)."
        return
    }
    $notification = $ids[-1]
    $script:lastNotificationId = $notification
    Pass "Notification ($label)" "id $notification created"

    if ($useDb) {
        if ($ids.Count -eq 1) { Pass "Cooldown ($label)" "one notification for the whole fall" }
        else { Info "Cooldown ($label)" "$($ids.Count) notifications (one per recipient is expected)" }

        Start-Sleep -Seconds 5
        $c = (Db "select realtime_status, email_status, push_status from notifications where id = $notification") -split '\|'
        if ($c[0] -eq "SENT") { Pass "WebSocket ($label)" "SENT" } else { Fail "WebSocket ($label)" $c[0] }
        if ($c[1] -eq "SENT") { Pass "Email ($label)" "SENT" } else { Fail "Email ($label)" $c[1] }
        switch ($c[2]) {
            "SENT" { Pass "Push ($label)" "SENT to FCM" }
            "SKIPPED" { Info "Push ($label)" "SKIPPED: the server has no Firebase key (FIREBASE_CREDENTIALS_PATH)" }
            default { Fail "Push ($label)" "$($c[2]): see 'Push for notification $notification' in the server log" }
        }
    } else {
        Start-Sleep -Seconds 5
    }

    if ($Adb -and $appState -ne "any") {
        $foreground = Test-AppInForeground
        $shown = (Count-AppNotifications) -gt $systemBefore
        if ($appState -eq "open") {
            if (-not $foreground) { Info "App open" "the app was not in the foreground when the notification came, so this case is not tested" }
            elseif ($shown) { Fail "No system notification (app open)" "a system notification appeared although the app is open" }
            else { Pass "No system notification (app open)" "nothing in the notification shade, as expected" }

            $badgeAfter = Get-AlertsBadge
            if ($badgeBefore -lt 0 -or $badgeAfter -lt 0) { Info "Alerts badge" "the tab bar is not on screen, so the badge is not checked" }
            elseif ($badgeAfter -gt $badgeBefore) { Pass "Alerts badge (app open)" "$badgeBefore -> $badgeAfter unread" }
            else { Fail "Alerts badge (app open)" "$badgeBefore -> $badgeAfter unread, expected more" }
            AdbShot "fall-app-open"
        } else {
            if ($foreground) { Info "App in background" "the app was opened during the test, so Android shows no system notification" }
            elseif ($shown) { Pass "System notification (app in background)" "shown in the notification shade" }
            else { Fail "System notification (app in background)" "not shown in the notification shade" }
            adb shell cmd statusbar expand-notifications | Out-Null
            Start-Sleep -Seconds 2
            AdbShot "fall-app-background"
            adb shell cmd statusbar collapse | Out-Null
        }
    }

    if ($useApi) {
        $list = Api GET "/api/v1/notifications?page=0&size=1"
        $first = $list.data.content | Select-Object -First 1
        if ($list.ok -and $first.id -eq $notification -and $first.deviceId -eq $DeviceId -and -not $first.readAt) {
            Pass "Notification list ($label)" "$($first.title) | $($first.deviceId) | unread"
        } else { Fail "Notification list ($label)" "newest item is not the new unread notification" }

        $read = Api PATCH "/api/v1/notifications/$notification/read"
        if ($read.ok -and $read.data.readAt) { Pass "Mark as read ($label)" "readAt set" } else { Fail "Mark as read ($label)" "($($read.status)) $($read.message)" }
        $after = Get-UnreadCount
        $expectedUnread = $script:unreadBefore + $ids.Count - 1
        if ($after -eq $expectedUnread) { Pass "Unread count ($label)" "$after after marking it as read" }
        else { Fail "Unread count ($label)" "$after, expected $expectedUnread" }
        $script:unreadBefore = $after
    }
}

# ---------------------------------------------------------------------------
Step "Services"
try { Invoke-WebRequest -Uri "$ApiUrl/api/v1/auth/me" -UseBasicParsing -TimeoutSec 5 | Out-Null; Pass "Spring" "$ApiUrl is up" }
catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { Pass "Spring" "$ApiUrl is up" }
    else { Fail "Spring" "$ApiUrl is not reachable"; exit 1 }
}
try { Invoke-WebRequest -Uri "$AiUrl/docs" -UseBasicParsing -TimeoutSec 5 | Out-Null; Pass "AI server" "$AiUrl is up" }
catch { Fail "AI server" "$AiUrl is not reachable" }

$tcp = New-Object Net.Sockets.TcpClient
if ($tcp.ConnectAsync($Broker, $Port).Wait(2000)) { Pass "Mosquitto" "${Broker}:$Port is up" } else { Fail "Mosquitto" "${Broker}:$Port is not reachable"; exit 1 }
$tcp.Close()
if (-not (Test-Path $mosquittoPub)) { Fail "mosquitto_pub" "not found at $mosquittoPub"; exit 1 }

$useDb = (Db "select 1") -eq "1"
if ($useDb) { Pass "Database" "$DbContainer / $DbName" } else { Info "Database" "not reachable through Docker; delivery statuses and push tokens are skipped" }
if (-not $useApi -and -not $useDb) { Fail "Mode" "Needs -Email (API) or the database through Docker"; exit 1 }
if ($useApi) { Info "Mode" "API (+ database where available)" } else { Info "Mode" "database only; add -Email to also check the API" }

if ($Adb) {
    if (@(adb devices 2>$null | Select-String "\tdevice$").Count) { Pass "Emulator" "connected" }
    else { Fail "Emulator" "no device in 'adb devices'"; exit 1 }
}

$segments = @{}
(Get-Content -Raw -Path (Join-Path $PSScriptRoot "motion-segments.json") | ConvertFrom-Json).segments |
    ForEach-Object { $segments[$_.name] = $_.samples }
foreach ($name in $Phases) {
    if (-not $segments.ContainsKey($name) -or -not $expected.ContainsKey($name)) { Fail "Phases" "Unknown phase '$name'"; exit 1 }
}
if ($PhaseSeconds -lt 80) { Info "Phases" "PhaseSeconds below 80 may leave a phase without a clean 75-reading window" }
if ($RecoverySeconds -lt 61) { Info "Phases" "RecoverySeconds below 61 may hit the 60 s cooldown before the second fall" }

Step "Account and bracelet"
if ($useApi) {
    $secure = Read-Host "  Password for $Email" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    $login = Api POST "/api/v1/auth/login" @{ email = $Email; password = $password }
    $password = $null
    if (-not $login.ok) { Fail "Login" "($($login.status)) $($login.message)"; exit 1 }
    $script:token = $login.data.accessToken
    Pass "Login" $Email

    $me = Api GET "/api/v1/auth/me"
    if (-not $me.ok) { Fail "Profile" "($($me.status)) $($me.message)"; exit 1 }
    $ownerId = $me.data.id
    Pass "Profile" "$($me.data.username) (id $ownerId)"

    $device = Api GET "/api/v1/devices/$encodedDevice"
    if (-not $device.ok) { Fail "Bracelet" "($($device.status)) $($device.message). Is it ACTIVE and yours?"; exit 1 }
    if ($device.data.status -ne "ACTIVE") { Fail "Bracelet" "status is $($device.data.status)"; exit 1 }
    Pass "Bracelet" "$DeviceId is ACTIVE"
}
if ($useDb) {
    $row = Db "select id, status, coalesce(owner_id, 0) from devices where device_id = '$($DeviceId -replace "'", "''")'"
    if (-not $row) { Fail "Bracelet" "$DeviceId is not in the database"; exit 1 }
    $c = $row -split '\|'
    $script:devicePk = [long]$c[0]
    if (-not $useApi) {
        $ownerId = [long]$c[2]
        if ($c[1] -ne "ACTIVE") { Fail "Bracelet" "status is $($c[1])"; exit 1 }
        Pass "Bracelet" "$DeviceId is ACTIVE, owner id $ownerId"
    }
}

$others = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*simulate-bracelet*' })
if ($others.Count) {
    $others | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    Info "Simulators" "stopped $($others.Count) running simulator(s) so they do not mix with the test data"
}

$existing = Get-NewAnalyses 0
if ($existing.Count) { $script:lastAnalysisId = ($existing | Select-Object -Last 1).id }
if ($useDb) {
    $script:lastNotificationId = [long](Db "select coalesce(max(id), 0) from notifications where device_id = $script:devicePk")
    $tokens = [int](Db "select count(*) from user_push_tokens where user_id = $ownerId and active")
    if ($tokens -gt 0) { Pass "Push token" "$tokens active token(s) registered by the app" }
    else { Info "Push token" "none yet: log in on the phone and allow notifications to test push" }
}
if ($useApi) { $script:unreadBefore = Get-UnreadCount }

# ---------------------------------------------------------------------------
foreach ($phase in $Phases) {
    if ($phase -ne "fall") {
        Run-Phase $phase $phase $PhaseSeconds
        AdbShot "phase-$phase"
        continue
    }

    if (-not $Adb) {
        Run-Phase "fall" "fall" $PhaseSeconds
        Check-Notification "fall" "any" 0 -1
        continue
    }

    # 1) The app is open: Android shows no system notification, the app updates the Alerts badge itself
    Open-App
    $systemBefore = Count-AppNotifications
    $badgeBefore = Get-AlertsBadge
    Info "Emulator" "app open for the first fall (Alerts badge: $badgeBefore unread)"
    Run-Phase "fall" "fall, app open" $PhaseSeconds
    Check-Notification "app open" "open" $systemBefore $badgeBefore

    # 2) The app is in the background: a system notification must appear
    Send-AppToBackground
    Info "Emulator" "app sent to the background; do not open it until the test ends"
    Run-Phase "still" "recovery" $RecoverySeconds -SkipAi
    $systemBefore = Count-AppNotifications
    Run-Phase "fall" "fall, app in background" $PhaseSeconds
    Check-Notification "app in background" "background" $systemBefore -1
    Open-App
}

# ---------------------------------------------------------------------------
Step "Statistics (last 10 min)"
$sentMin = ($script:allRates | Measure-Object -Minimum).Minimum
$sentMax = ($script:allRates | Measure-Object -Maximum).Maximum
$recentRates = $script:allRates.Count
if ($useApi) {
    $stats = Api GET "/api/v1/devices/$encodedDevice/statistics?minutes=10"
    if ($stats.ok) { $statMin = $stats.data.heartRate.min; $statMax = $stats.data.heartRate.max; $samples = $stats.data.heartRate.samples; $points = @($stats.data.points).Count }
} else {
    $c = (Db "select min(heart_rate_min), max(heart_rate_max), sum(heart_rate_sample_count), count(*) from device_statistics where device_id = $script:devicePk and bucket_start > now() - interval '10 minutes'") -split '\|'
    $statMin = $c[0]; $statMax = $c[1]; $samples = $c[2]; $points = $c[3]
}
# A long run (-Adb) is longer than 10 minutes, so only the readings of the last 10 minutes count
$windowRates = @($script:allRates | Select-Object -Last 600)
$windowMin = ($windowRates | Measure-Object -Minimum).Minimum
$windowMax = ($windowRates | Measure-Object -Maximum).Maximum
if ($null -eq $statMin -or "$statMin" -eq "") {
    Fail "Statistics" "no statistics for the last 10 minutes"
} else {
    if ([int]$statMin -le $windowMin -and [int]$statMax -ge $windowMax) { Pass "Statistics range" "min $statMin, max $statMax (sent $windowMin to $windowMax in the last 10 min)" }
    else { Fail "Statistics range" "min $statMin, max $statMax, but sent $windowMin to $windowMax in the last 10 min" }
    if ([int]$samples -ge $windowRates.Count * 0.9) { Pass "Statistics samples" "$samples heart rate samples in $points bucket(s)" }
    else { Fail "Statistics samples" "$samples samples, sent $($windowRates.Count) in the last 10 min" }
}

# ---------------------------------------------------------------------------
Step "Summary"
$script:results | Format-Table -AutoSize Result, Check, Detail | Out-String -Width 220 | Write-Host
$failures = @($script:results | Where-Object { $_.Result -eq "FAIL" }).Count
if ($failures -eq 0) { Write-Host "  All checks passed." -ForegroundColor Green }
else { Write-Host "  $failures check(s) failed." -ForegroundColor Red }
exit $failures

# ---------------------------------------------------------------------------
# Run (from the client folder; needs the server, the database, Mosquitto and the AI server running).
# Open the app on the bracelet screen first to watch the posture change.
#
# Through the database only (no password), about 8 minutes:
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
#
# Also through the API (asks for the password):
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Email you@example.com
#
# With the emulator, about 11 minutes: screenshots in scripts\test-screens and the fall twice,
# once with the app open (no system notification, the Alerts badge grows) and once in the background
# (a system notification appears). Do not touch the emulator while it runs.
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Adb
#
# Shorter run or other phases (a fall needs at least 60 s since the last notification):
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -PhaseSeconds 90 -Phases walking,fall
#
# Stop:
#   Ctrl+C in the terminal where it runs.
# ---------------------------------------------------------------------------
