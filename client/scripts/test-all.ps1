# End-to-end test of everything CaTch can do so far, for one account and one bracelet.
#
# It asks for the email and the password of your account, then picks your bracelet from GET /devices/my
# (a list to choose from when you have more than one). Services and the database come from client/.env
# (the same file the app uses) with fallbacks from server/.env, so nobody has to edit the script.
# Parameters override everything.
#
# What it checks (each check is numbered and logged with the request, the expected and the actual result):
#   Services      Spring, AI server, Mosquitto, mosquitto_pub, database (Docker or local PostgreSQL), emulator
#   Auth          401 without/with a bad token, validation errors, wrong password, duplicate email,
#                 verify/resend for a verified account, login, profile, refresh rotation, logout, admin-only 403
#   Password      forgot-password -> wrong code / mismatch -> the real code you type -> login (password unchanged)
#   Devices       my devices, one device, unknown device, measurements (limit, clamp, order), latest reading
#   Pairing       validation, unknown device, a claimed device, unknown pairing, claim errors, factory 403
#   Relatives     lists, inviting yourself / an unknown user, unknown invitation / relative, RELATIVE-only 403
#   Notifications list, unread count, unknown id, push token register / validation / remove
#   Statistics    shape, out-of-range minutes (known 500)
#   Realtime      STOMP: bad token -> ERROR, CONNECTED, device + notification subscriptions, live events
#   Bracelet      recorded motion over MQTT in phases (walking, still, lying, fall) with a heart rate per phase:
#                 AI activity per phase, fall detection, vitals, online, live measurement/analysis events,
#                 fall notification (cooldown, WebSocket, email, push, list, mark as read, unread count),
#                 AI endpoints, statistics range and samples, online -> offline with a live status event
#   Emulator      with -Adb: screenshots, a fall with the app open (Alerts badge) and in the background (system notification)
#
# It never creates users or bracelets and writes nothing to the database itself. Through the API it changes only
# your own data: it marks the new fall notifications as read, adds and removes one test push token and, if you
# type the reset code, sets your password to the same password again.
param(
    [string]$Email,
    [string]$DeviceId,
    # auto: Docker if the container runs, else a local psql; none: no database checks
    [ValidateSet("auto", "docker", "local", "none")]
    [string]$Db,
    [int]$PhaseSeconds = 30,
    # Readings per second. The AI analyses the last 75 readings after every 38 new ones, so a phase needs at least
    # 113 readings for a clean window: 30 s x 4/s = 120.
    [double]$Rate = 4,
    [string[]]$Phases = @("walking", "still", "lying", "fall"),
    # Quiet time between the two falls with -Adb; longer than the server's 60 s notification cooldown
    [int]$RecoverySeconds = 65,
    [switch]$Adb,
    # Never ask for anything (password, reset code); steps that need input are skipped
    [switch]$NoPrompt,
    # Only the API and realtime checks, no bracelet phases
    [switch]$SkipPhases,
    # Also print request/response bodies (secrets hidden) and SQL
    [switch]$DebugLog,
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env"),
    [string]$ServerEnvFile = (Join-Path $PSScriptRoot "..\..\server\.env"),
    [string]$ScreenshotDir = (Join-Path $PSScriptRoot "test-screens")
)

$ErrorActionPreference = "Continue"
$culture = [Globalization.CultureInfo]::InvariantCulture
$appPackage = "com.catchapp.app"

$script:results = New-Object System.Collections.ArrayList
$script:testNo = 0
$script:group = ""
$script:token = $null
$script:refreshToken = $null
$script:password = $null
$script:sentRates = New-Object System.Collections.ArrayList
$script:lastAnalysisId = 0
$script:lastNotificationId = 0
$script:unreadBefore = 0
$script:publisher = $null
$script:published = 0

# ===========================================================================
# Logging
# ===========================================================================
function Section([string]$title) {
    $script:group = $title
    Write-Host ""
    Write-Host ("==== {0} " -f $title).PadRight(90, "=") -ForegroundColor Cyan
}
function SubSection([string]$title) {
    Write-Host ""
    Write-Host ("---- {0}" -f $title) -ForegroundColor DarkCyan
}
function Write-Detail([string]$text) { Write-Host ("        {0}" -f $text) -ForegroundColor DarkGray }
function Begin-Test([string]$name, [string]$what) {
    $script:testNo++
    $script:currentName = $name
    Write-Host ("  [{0:000}] {1}" -f $script:testNo, $name) -ForegroundColor White
    if ($what) { Write-Detail ("> {0}" -f $what) }
}
function Record([string]$result, [string]$detail) {
    $color = @{ PASS = "Green"; FAIL = "Red"; SKIP = "Yellow"; INFO = "Gray" }[$result]
    Write-Host ("        {0}  {1}" -f $result, $detail) -ForegroundColor $color
    [void]$script:results.Add([pscustomobject]@{
        No = $script:testNo; Group = $script:group; Check = $script:currentName; Result = $result; Detail = $detail
    })
}
function Pass([string]$detail) { Record "PASS" $detail }
function Fail([string]$detail) { Record "FAIL" $detail }
function Skip([string]$detail) { Record "SKIP" $detail }
function Info([string]$detail) { Record "INFO" $detail }
function Skip-Test([string]$name, [string]$reason) { Begin-Test $name ""; Skip $reason }

function Hide-Secrets([string]$text) {
    if (-not $text) { return $text }
    $pattern = '"(accessToken|refreshToken|password|newPassword|confirmPassword|token|pairingToken|claimSecret)"\s*:\s*"[^"]*"'
    return [regex]::Replace($text, $pattern, '"$1":"***"')
}
function Shorten([string]$text, [int]$max) {
    if (-not $text) { return "" }
    $text = $text -replace "\s+", " "
    if ($text.Length -le $max) { return $text }
    return $text.Substring(0, $max) + "..."
}

# ===========================================================================
# Settings: parameters > client/.env > server/.env > defaults
# ===========================================================================
function Read-EnvFile([string]$path) {
    $vars = @{}
    if (-not (Test-Path $path)) { return $vars }
    foreach ($line in Get-Content -Path $path) {
        $text = $line.Trim()
        if (-not $text -or $text.StartsWith("#")) { continue }
        $eq = $text.IndexOf("=")
        if ($eq -lt 1) { continue }
        $key = $text.Substring(0, $eq).Trim()
        $value = $text.Substring($eq + 1).Trim()
        $comment = $value.IndexOf(" #")
        if ($comment -ge 0) { $value = $value.Substring(0, $comment).Trim() }
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $vars[$key] = $value
    }
    return $vars
}

$clientEnv = Read-EnvFile $EnvFile
$serverEnv = Read-EnvFile $ServerEnvFile
$script:sources = New-Object System.Collections.ArrayList

# Returns the first non-empty value and remembers where it came from (values of secrets are never printed)
function Setting([string]$name, $paramValue, [string]$clientKey, [string]$serverKey, $default, [switch]$Secret, [string]$DefaultSource = "default") {
    $value = $null; $source = $DefaultSource
    if ($paramValue) { $value = $paramValue; $source = "parameter" }
    elseif ($clientKey -and $clientEnv[$clientKey]) { $value = $clientEnv[$clientKey]; $source = "client/.env $clientKey" }
    elseif ($serverKey -and $serverEnv[$serverKey]) { $value = $serverEnv[$serverKey]; $source = "server/.env $serverKey" }
    else { $value = $default }
    $shown = $value
    if ($Secret) { if ($value) { $shown = "(set)" } else { $shown = "(not set)" } }
    [void]$script:sources.Add([pscustomobject]@{ Setting = $name; Value = $shown; Source = $source })
    return $value
}

$apiUrl = Setting "API URL" $null "EXPO_PUBLIC_API_URL" $null "http://127.0.0.1:8080"
if ($apiUrl -notmatch "^https?://") { $apiUrl = "http://$apiUrl" }
$apiUrl = $apiUrl.TrimEnd("/")
$wsUrl = ($apiUrl -replace "^http", "ws") + "/ws"
$aiUrl = (Setting "AI URL" $null "CATCH_TEST_AI_URL" "AI_BASE_URL" "http://127.0.0.1:8001").TrimEnd("/")
$broker = Setting "MQTT host" $null "CATCH_TEST_MQTT_HOST" $null "127.0.0.1"
$mqttPort = [int](Setting "MQTT port" $null "CATCH_TEST_MQTT_PORT" $null "1883")
$Db = Setting "Database mode" $Db "CATCH_TEST_DB_MODE" $null "auto"
$dbContainer = Setting "DB container" $null "CATCH_TEST_DB_CONTAINER" $null "docker-sql-db-1"

# The server's JDBC URL gives host, port and database name for a local PostgreSQL
$jdbcHost = $null; $jdbcPort = $null; $jdbcName = $null
$jdbcUrl = $serverEnv["SPRING_DATASOURCE_URL"]
if ($jdbcUrl -and $jdbcUrl -match "^jdbc:postgresql://([^:/]+)(?::(\d+))?/([^?]+)") {
    $jdbcHost = $Matches[1]; $jdbcPort = $Matches[2]; $jdbcName = $Matches[3]
}
$jdbcSource = "default"
if ($jdbcHost) { $jdbcSource = "server/.env SPRING_DATASOURCE_URL" }
$dbHost = Setting "DB host" $null "CATCH_TEST_DB_HOST" $null $(if ($jdbcHost) { $jdbcHost } else { "127.0.0.1" }) -DefaultSource $jdbcSource
$dbPort = Setting "DB port" $null "CATCH_TEST_DB_PORT" $null $(if ($jdbcPort) { $jdbcPort } else { "5432" }) -DefaultSource $jdbcSource
$dbName = Setting "DB name" $null "CATCH_TEST_DB_NAME" $null $(if ($jdbcName) { $jdbcName } else { "CaTchDB" }) -DefaultSource $jdbcSource
$dbUser = Setting "DB user" $null "CATCH_TEST_DB_USER" "SPRING_DATASOURCE_USERNAME" "postgres"
$dbPassword = Setting "DB password" $null "CATCH_TEST_DB_PASSWORD" "SPRING_DATASOURCE_PASSWORD" $null -Secret
$psqlPath = Setting "psql" $null "CATCH_TEST_PSQL" $null $null
$mosquittoPub = Setting "mosquitto_pub" $null "CATCH_TEST_MOSQUITTO_PUB" $null "C:\Program Files\Mosquitto\mosquitto_pub.exe"

# The bracelet is chosen after the login (from your devices), or given with -DeviceId
function Set-Device([string]$id) {
    $script:DeviceId = $id
    $script:topic = "devices/$id/measurements"
    $script:encodedDevice = [Uri]::EscapeDataString($id)
}
if ($DeviceId) { Set-Device $DeviceId }
$Phases = @($Phases | ForEach-Object { $_ -split "," } | ForEach-Object { $_.Trim() } | Where-Object { $_ })

$expected = @{
    walking = @{ activities = @("walking", "stairs"); heartRate = 96 }
    still   = @{ activities = @("still"); heartRate = 72 }
    lying   = @{ activities = @("lie_getup_transition"); heartRate = 62 }
    fall    = @{ activities = @("fall"); heartRate = 110 }
}

# ===========================================================================
# HTTP
# ===========================================================================
function Invoke-Api {
    param([string]$Method, [string]$Path, $Body = $null, [switch]$NoAuth, [string]$Token = $null, [switch]$RawBody)
    $headers = @{ Accept = "application/json" }
    $useToken = $Token
    if (-not $useToken -and -not $NoAuth) { $useToken = $script:token }
    if ($useToken) { $headers.Authorization = "Bearer $useToken" }

    $request = @{ Method = $Method; Uri = "$apiUrl$Path"; Headers = $headers; TimeoutSec = 10; UseBasicParsing = $true }
    $bodyText = $null
    if ($null -ne $Body) {
        if ($RawBody) { $bodyText = [string]$Body } else { $bodyText = $Body | ConvertTo-Json -Compress -Depth 5 }
        $request.Body = [Text.Encoding]::UTF8.GetBytes($bodyText)
        $request.ContentType = "application/json; charset=utf-8"
    }
    if ($DebugLog -and $bodyText) { Write-Detail ("  body  {0}" -f (Shorten (Hide-Secrets $bodyText) 300)) }

    $clock = [Diagnostics.Stopwatch]::StartNew()
    $status = 0; $content = $null
    try {
        $response = Invoke-WebRequest @request
        $status = [int]$response.StatusCode
        $content = $response.Content
    } catch {
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        $content = $_.ErrorDetails.Message
        # Windows PowerShell 5.1 leaves ErrorDetails empty for some chunked responses: read the body stream instead
        if (-not $content -and $_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream.CanSeek) { $stream.Position = 0 }
                $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8)
                $content = $reader.ReadToEnd()
                $reader.Dispose()
            } catch { $content = $null }
        }
        if (-not $content -and $status -eq 0) { $content = $_.Exception.Message }
    }
    $ms = $clock.ElapsedMilliseconds

    $data = $null
    if ($content) { try { $data = $content | ConvertFrom-Json } catch { $data = $null } }
    $message = $null
    if ($data -and $data.PSObject.Properties["message"]) { $message = [string]$data.message }
    elseif ($status -eq 0) { $message = [string]$content }

    $summary = ""
    if ($message) { $summary = "message: $message" }
    elseif ($data -and $data.PSObject.Properties["content"] -and $data.PSObject.Properties["totalElements"]) {
        $summary = "page: $(@($data.content).Count) item(s), $($data.totalElements) in total"
    } elseif ($content) { $summary = Shorten (Hide-Secrets ([string]$content)) 110 }
    else { $summary = "(no body)" }
    Write-Detail ("< {0} in {1} ms  {2}" -f $status, $ms, $summary)
    if ($DebugLog -and $content) { Write-Detail ("  body  {0}" -f (Shorten (Hide-Secrets ([string]$content)) 600)) }

    return [pscustomobject]@{ ok = ($status -ge 200 -and $status -lt 300); status = $status; data = $data; message = $message; ms = $ms }
}

# One API check: logs the request, compares the status, then runs an optional extra check on the response.
# $Check gets the response and returns @{ pass = $true/$false; detail = "..." }.
function Test-Request {
    param([string]$Name, [string]$Method, [string]$Path, $Body = $null, [int[]]$Expect = @(200),
          [scriptblock]$Check = $null, [switch]$NoAuth, [string]$Token = $null, [switch]$RawBody, [string]$Why = "")
    $what = "{0} {1}  expect {2}" -f $Method, $Path, ($Expect -join " or ")
    if ($Why) { $what = "$what  ($Why)" }
    Begin-Test $Name $what
    $r = Invoke-Api -Method $Method -Path $Path -Body $Body -NoAuth:$NoAuth -Token $Token -RawBody:$RawBody
    if ($Expect -notcontains $r.status) {
        $got = "got $($r.status)"
        if ($r.message) { $got = "$got ($($r.message))" }
        Fail $got
        return $r
    }
    if ($Check) {
        $c = & $Check $r
        if ($c.pass) { Pass $c.detail } else { Fail $c.detail }
    } else {
        $detail = "$($r.status)"
        if ($r.message) { $detail = "$detail, $($r.message)" }
        Pass $detail
    }
    return $r
}
function Ok([string]$detail) { return @{ pass = $true; detail = $detail } }
function Bad([string]$detail) { return @{ pass = $false; detail = $detail } }

# ===========================================================================
# Database (Docker or a local PostgreSQL)
# ===========================================================================
$script:dbMode = "none"

function Test-DockerRunning {
    # The Docker CLI hangs when Docker Desktop is not running, so check its pipe first
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
    return (Test-Path "\\.\pipe\docker_engine")
}
function Find-Psql {
    if ($psqlPath -and (Test-Path $psqlPath)) { return $psqlPath }
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $installed = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
        Sort-Object { [int]($_.Directory.Parent.Name -replace "\D", "") } -Descending | Select-Object -First 1
    if ($installed) { return $installed.FullName }
    return $null
}
function Db([string]$sql) {
    if ($script:dbMode -eq "none") { return $null }
    if ($DebugLog) { Write-Detail ("  sql ({0})  {1}" -f $script:dbMode, $sql) }
    if ($script:dbMode -eq "docker") {
        $out = docker exec $dbContainer psql -U $dbUser -d $dbName -tAc $sql 2>$null
    } else {
        $env:PGPASSWORD = $dbPassword
        $env:PGCONNECT_TIMEOUT = "3"
        $out = & $script:psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -tAc $sql 2>$null
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
    }
    if ($LASTEXITCODE -ne 0) { return $null }
    return $out
}
function Init-Db {
    Begin-Test "Database" "mode '$Db'"
    if ($Db -eq "none") { Skip "disabled (-Db none / CATCH_TEST_DB_MODE=none)"; return }

    if ($Db -eq "docker" -or $Db -eq "auto") {
        if (Test-DockerRunning) {
            $script:dbMode = "docker"
            if ((Db "select 1") -eq "1") { Pass "Docker container $dbContainer, database $dbName, user $dbUser"; return }
            $script:dbMode = "none"
            $why = (docker exec $dbContainer psql -U $dbUser -d $dbName -tAc "select 1" 2>&1 | Out-String).Trim()
            if ($why -match "too many clients") { $why = "$why (another client, e.g. pgAdmin, holds all connections: restart it)" }
            if ($Db -eq "docker") { Fail "docker exec $dbContainer psql failed: $why"; return }
            Write-Detail "Docker runs, but $dbContainer did not answer: $why"
            Write-Detail "trying a local PostgreSQL"
        } elseif ($Db -eq "docker") { Fail "Docker is not running"; return }
        else { Write-Detail "Docker is not running; trying a local PostgreSQL" }
    }

    $script:psql = Find-Psql
    if (-not $script:psql) { if ($Db -eq "local") { Fail "psql.exe not found (add it to PATH or set CATCH_TEST_PSQL)" } else { Info "no Docker and no psql.exe: database checks are skipped" }; return }
    if (-not $dbPassword -and -not $NoPrompt) {
        $secure = Read-Host "        PostgreSQL password for $dbUser@${dbHost}:$dbPort" -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try { $script:dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    }
    $script:dbMode = "local"
    if ((Db "select 1") -eq "1") { Pass "local PostgreSQL ${dbHost}:$dbPort, database $dbName, user $dbUser ($($script:psql))"; return }
    $script:dbMode = "none"
    if ($Db -eq "local") { Fail "could not connect with psql to ${dbHost}:$dbPort/$dbName as $dbUser" }
    else { Info "could not connect to a local PostgreSQL: database checks are skipped" }
}

# ===========================================================================
# MQTT: one mosquitto_pub process that keeps the connection open (-l = one message per stdin line)
# ===========================================================================
function Start-Publisher {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = $mosquittoPub
    $psi.Arguments = "-h $broker -p $mqttPort -t `"$topic`" -q 0 -l"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $script:publisher = [Diagnostics.Process]::Start($psi)
    Start-Sleep -Milliseconds 700
    if ($script:publisher.HasExited) {
        return "mosquitto_pub exited: " + $script:publisher.StandardError.ReadToEnd().Trim()
    }
    Write-Detail ("MQTT publisher started: {0}:{1}, topic {2}, one open connection" -f $broker, $mqttPort, $topic)
    return $null
}
function Stop-Publisher {
    if (-not $script:publisher) { return }
    try {
        if (-not $script:publisher.HasExited) {
            $script:publisher.StandardInput.Close()
            if (-not $script:publisher.WaitForExit(3000)) { $script:publisher.Kill() }
        }
    } catch {}
    Write-Detail ("MQTT publisher stopped after {0} reading(s)" -f $script:published)
    $script:publisher = $null
}
function Publish($motion, [int]$heartRate, [double]$spo2) {
    $reading = [ordered]@{
        ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); deviceId = $DeviceId
        accelX = $motion[0]; accelY = $motion[1]; accelZ = $motion[2]
        gyroX = $motion[3]; gyroY = $motion[4]; gyroZ = $motion[5]
        heartRate = $heartRate; spo2 = $spo2
    }
    $script:publisher.StandardInput.WriteLine(($reading | ConvertTo-Json -Compress))
    $script:publisher.StandardInput.Flush()
    $script:published++
    [void]$script:sentRates.Add([pscustomobject]@{ t = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() / 1000.0; hr = $heartRate })
}

# ===========================================================================
# STOMP over WebSocket (the same protocol the app uses)
# ===========================================================================
$script:ws = $null
$script:wsTask = $null
$script:wsBuffer = $null
$script:wsText = ""
$script:wsEvents = @{ measurement = 0; analysis = 0; status = 0; notification = 0 }
$script:wsAnalyses = New-Object System.Collections.ArrayList
$script:wsNotifications = New-Object System.Collections.ArrayList
$script:wsStatuses = New-Object System.Collections.ArrayList
$script:wsSubscriptions = @{}

function Ws-Open {
    $socket = New-Object System.Net.WebSockets.ClientWebSocket
    $socket.Options.AddSubProtocol("v12.stomp")
    try {
        if (-not $socket.ConnectAsync([Uri]$wsUrl, [Threading.CancellationToken]::None).Wait(5000)) { return $null }
    } catch { return $null }
    return $socket
}
function Ws-Send($socket, [string]$command, [hashtable]$headers) {
    $frame = $command + "`n"
    foreach ($k in $headers.Keys) { $frame += "${k}:$($headers[$k])`n" }
    $frame += "`n" + [char]0
    $bytes = [Text.Encoding]::UTF8.GetBytes($frame)
    $segment = New-Object "System.ArraySegment[byte]" -ArgumentList (, $bytes)
    [void]$socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait(3000)
}
function Parse-Frame([string]$raw) {
    $raw = $raw.TrimStart("`r", "`n")
    if (-not $raw) { return $null }
    $split = $raw.IndexOf("`n`n")
    $head = $raw; $body = ""
    if ($split -ge 0) { $head = $raw.Substring(0, $split); $body = $raw.Substring($split + 2) }
    $lines = $head -split "`n"
    $headers = @{}
    foreach ($line in $lines[1..($lines.Count)]) {
        if (-not $line) { continue }
        $i = $line.IndexOf(":")
        if ($i -gt 0 -and -not $headers.ContainsKey($line.Substring(0, $i))) { $headers[$line.Substring(0, $i)] = $line.Substring($i + 1) }
    }
    return [pscustomobject]@{ command = $lines[0].Trim(); headers = $headers; body = $body }
}
# Returns the complete frames received so far; waits up to $timeoutMs for the first one
function Ws-Receive($socket, [int]$timeoutMs) {
    $frames = @()
    $deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)
    while ($true) {
        if ($null -eq $script:wsTask) {
            if ($socket.State -ne [System.Net.WebSockets.WebSocketState]::Open) { break }
            $script:wsBuffer = New-Object byte[] 65536
            $segment = New-Object "System.ArraySegment[byte]" -ArgumentList (, $script:wsBuffer)
            $script:wsTask = $socket.ReceiveAsync($segment, [Threading.CancellationToken]::None)
        }
        $left = [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds
        if ($left -lt 0) { $left = 0 }
        $done = $false
        try { $done = $script:wsTask.Wait($left) } catch { $script:wsTask = $null; break }
        if (-not $done) { break }
        $result = $script:wsTask.Result
        $script:wsTask = $null
        if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { break }
        $script:wsText += [Text.Encoding]::UTF8.GetString($script:wsBuffer, 0, $result.Count)
        while ($script:wsText.IndexOf([char]0) -ge 0) {
            $end = $script:wsText.IndexOf([char]0)
            $frame = Parse-Frame $script:wsText.Substring(0, $end)
            $script:wsText = $script:wsText.Substring($end + 1)
            if ($frame) { $frames += $frame }
        }
        if ($frames.Count) { $timeoutMs = 0; $deadline = [DateTime]::UtcNow }
    }
    return $frames
}
function Ws-Close($socket) {
    if (-not $socket) { return }
    try {
        if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
            Ws-Send $socket "DISCONNECT" @{}
            [void]$socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [Threading.CancellationToken]::None).Wait(2000)
        }
    } catch {}
    $socket.Dispose()
}
# Counts and logs the events that arrived on the main connection; call it often (it does not wait)
function Ws-Drain([int]$timeoutMs = 0) {
    if (-not $script:ws) { return }
    foreach ($frame in (Ws-Receive $script:ws $timeoutMs)) {
        if ($frame.command -eq "ERROR") { Write-Detail ("WS < ERROR {0}" -f $frame.headers["message"]); continue }
        if ($frame.command -ne "MESSAGE") { continue }
        $payload = $null
        try { $payload = $frame.body | ConvertFrom-Json } catch {}
        if (-not $payload) { continue }
        $destination = $frame.headers["destination"]
        if ($destination -like "/topic/users/*") {
            $script:wsEvents.notification++
            [void]$script:wsNotifications.Add($payload)
            Write-Detail ("WS < notification id {0}: {1} ({2})" -f $payload.id, $payload.title, $payload.deviceId)
        } elseif ($payload.type -eq "measurement") {
            $script:wsEvents.measurement++
        } elseif ($payload.type -eq "analysis") {
            $script:wsEvents.analysis++
            [void]$script:wsAnalyses.Add($payload.data)
            Write-Detail ("WS < analysis {0} fall={1}" -f $payload.data.activity, $payload.data.fallDetected)
        } elseif ($payload.type -eq "status") {
            $script:wsEvents.status++
            [void]$script:wsStatuses.Add($payload.data)
            Write-Detail ("WS < status online={0}" -f $payload.data.online)
        }
    }
}

# ===========================================================================
# Data used by the bracelet checks (API, with the database as fallback)
# ===========================================================================
$script:useApi = $false

function ToEpoch($value) {
    if ($value -is [DateTime]) { return ([DateTimeOffset]$value).ToUnixTimeMilliseconds() / 1000.0 }
    return [DateTimeOffset]::Parse([string]$value, $culture).ToUnixTimeMilliseconds() / 1000.0
}
function NowEpoch { return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() / 1000.0 }

function Quiet-Api([string]$Method, [string]$Path) {
    # Polling without a log line per request
    $headers = @{ Accept = "application/json"; Authorization = "Bearer $($script:token)" }
    try { return @{ ok = $true; data = (Invoke-RestMethod -Method $Method -Uri "$apiUrl$Path" -Headers $headers -TimeoutSec 10) } }
    catch { return @{ ok = $false } }
}
function Get-NewAnalyses([long]$sinceId) {
    $list = @()
    if ($script:useApi) {
        $page = Quiet-Api GET "/api/v1/devices/$encodedDevice/analyses?page=0&size=10"
        if ($page.ok) {
            $list = @($page.data.content | Where-Object { $_.id -gt $sinceId } | ForEach-Object {
                [pscustomobject]@{ id = [long]$_.id; activity = $_.activity; fall = [bool]$_.fallDetected
                    p = [double]$_.fallProbability; windowStart = ToEpoch $_.windowStartAt }
            })
        }
    } elseif ($script:dbMode -ne "none") {
        $rows = Db "select id, activity, fall_detected, fall_probability, extract(epoch from window_start_at) from ai_analyses where device_id = $script:devicePk and id > $sinceId order by id"
        $list = @($rows | Where-Object { $_ } | ForEach-Object {
            $c = $_ -split "\|"
            [pscustomobject]@{ id = [long]$c[0]; activity = $c[1]; fall = ($c[2] -eq "t")
                p = [double]::Parse($c[3], $culture); windowStart = [double]::Parse($c[4], $culture) }
        })
    }
    return @($list | Sort-Object id)
}
function Get-LatestReading {
    if ($script:useApi) {
        $r = Quiet-Api GET "/api/v1/devices/$encodedDevice/measurements/latest"
        if ($r.ok) { return [pscustomobject]@{ heartRate = [int]$r.data.heartRate; spo2 = [double]$r.data.spo2 } }
        return $null
    }
    $row = Db "select heart_rate, spo2 from device_measurements where device_id = $script:devicePk order by id desc limit 1"
    if (-not $row) { return $null }
    $c = $row -split "\|"
    return [pscustomobject]@{ heartRate = [int]$c[0]; spo2 = [double]::Parse($c[1], $culture) }
}
function Test-Online {
    if ($script:useApi) {
        $d = Quiet-Api GET "/api/v1/devices/$encodedDevice"
        return ($d.ok -and $d.data.online)
    }
    return ((Db "select coalesce(now() - max(received_at) < interval '10 seconds', false) from device_measurements where device_id = $script:devicePk") -eq "t")
}
function Get-UnreadCount {
    if (-not $script:useApi) { return 0 }
    $r = Quiet-Api GET "/api/v1/notifications/unread-count"
    if ($r.ok) { return [int]$r.data.unreadCount }
    return 0
}

# --- emulator --------------------------------------------------------------
function AdbShot([string]$name) {
    if (-not $Adb) { return }
    New-Item -ItemType Directory -Force -Path $ScreenshotDir | Out-Null
    $path = Join-Path $ScreenshotDir "$name.png"
    cmd /c "adb exec-out screencap -p > `"$path`""
    Write-Detail "screenshot $path"
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

# ===========================================================================
# One phase of recorded motion
# ===========================================================================
function Run-Phase([string]$phase, [string]$label, [int]$seconds, [switch]$SkipAi) {
    $samples = $segments[$phase]
    $total = [int][math]::Round($seconds * $Rate)
    $intervalMs = 1000.0 / $Rate
    SubSection ("Phase '{0}': {1} s, {2} readings at {3}/s, heart rate ~{4}, SpO2 97.5" -f $label, $seconds, $total, $Rate, $expected[$phase].heartRate)

    $phaseStart = NowEpoch
    $measurementsBefore = $script:wsEvents.measurement
    $analysesBefore = $script:wsEvents.analysis
    $analyses = @()
    $lastRate = 0
    $clock = [Diagnostics.Stopwatch]::StartNew()
    $nextPoll = 2000; $nextLog = 5000

    for ($i = 0; $i -lt $total; $i++) {
        $lastRate = $expected[$phase].heartRate + (Get-Random -Minimum -2 -Maximum 3)
        Publish $samples[$i % $samples.Count] $lastRate 97.5
        Ws-Drain

        if ($clock.ElapsedMilliseconds -ge $nextPoll) {
            foreach ($a in (Get-NewAnalyses $script:lastAnalysisId)) {
                $analyses += $a
                $script:lastAnalysisId = $a.id
                Write-Detail ("{0,5:N1} s  AI analysis #{1}: {2,-22} fall={3} p={4}" -f ($clock.ElapsedMilliseconds / 1000), $a.id, $a.activity, $a.fall, [math]::Round($a.p, 2))
            }
            $nextPoll += 2000
        }
        if ($clock.ElapsedMilliseconds -ge $nextLog) {
            Write-Detail ("{0,5:N1} s  MQTT sent {1}/{2} readings, last HR {3}  |  WS measurement events this phase: {4}" -f ($clock.ElapsedMilliseconds / 1000), ($i + 1), $total, $lastRate, ($script:wsEvents.measurement - $measurementsBefore))
            $nextLog += 5000
        }
        $wait = [int](($i + 1) * $intervalMs - $clock.ElapsedMilliseconds)
        if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
    }
    Start-Sleep -Seconds 2
    Ws-Drain 500
    foreach ($a in (Get-NewAnalyses $script:lastAnalysisId)) {
        $analyses += $a; $script:lastAnalysisId = $a.id
        Write-Detail ("after   AI analysis #{0}: {1,-22} fall={2} p={3}" -f $a.id, $a.activity, $a.fall, [math]::Round($a.p, 2))
    }

    if (-not $SkipAi) {
        Begin-Test "AI recognises '$label'" "an analysis whose 75-reading window started inside the phase, expect $($expected[$phase].activities -join ' or ')"
        $clean = @($analyses | Where-Object { $_.windowStart -ge $phaseStart - 1 }) | Select-Object -Last 1
        if (-not $clean) { Fail "no analysis with a full window inside the phase ($($analyses.Count) analyses in total)" }
        elseif ($expected[$phase].activities -contains $clean.activity) { Pass "$($clean.activity) (fall=$($clean.fall), p=$([math]::Round($clean.p, 2)))" }
        else { Fail "got $($clean.activity), expected $($expected[$phase].activities -join ' or ')" }
        if ($phase -eq "fall" -and $clean) {
            Begin-Test "Fall detected ($label)" "fallDetected must be true"
            if ($clean.fall) { Pass "fallDetected=true, p=$([math]::Round($clean.p, 2))" } else { Fail "fallDetected=false" }
        }
    }

    Begin-Test "Vitals after '$label'" "latest reading = last heart rate sent ($lastRate)"
    $reading = Get-LatestReading
    if ($reading -and $reading.heartRate -eq $lastRate) { Pass "heart rate $($reading.heartRate), SpO2 $($reading.spo2)" }
    elseif ($reading) { Fail "latest heart rate $($reading.heartRate), last sent $lastRate" }
    else { Fail "no latest reading" }

    Begin-Test "Online during '$label'" "data in the last 10 s => online"
    if (Test-Online) { Pass "bracelet is online" } else { Fail "bracelet is not online" }

    if ($script:ws) {
        Begin-Test "Live events during '$label'" "STOMP /topic/devices/$DeviceId sends a 'measurement' event per reading"
        $got = $script:wsEvents.measurement - $measurementsBefore
        if ($got -ge [math]::Floor($total * 0.9)) { Pass "$got measurement event(s) for $total reading(s), $($script:wsEvents.analysis - $analysesBefore) analysis event(s)" }
        elseif ($got -gt 0) { Fail "only $got measurement event(s) for $total reading(s)" }
        else { Fail "no measurement events" }
    }
}

# ===========================================================================
# The notification after a fall
# $appState: "open" (no system notification, the Alerts badge grows), "background" (system notification), "any"
# ===========================================================================
function Check-Notification([string]$label, [string]$appState, [int]$systemBefore, [int]$badgeBefore) {
    SubSection "Notification after the fall ($label)"
    Begin-Test "Notification created ($label)" "the server creates one when the AI sees a fall with p >= 0.75"
    $ids = @()
    for ($i = 0; $i -lt 10 -and -not $ids.Count; $i++) {
        if ($script:dbMode -ne "none") {
            $ids = @(Db "select id from notifications where device_id = $script:devicePk and id > $script:lastNotificationId order by id" | Where-Object { $_ } | ForEach-Object { [long]$_ })
        } elseif ((Get-UnreadCount) -gt $script:unreadBefore) {
            $ids = @([long](Quiet-Api GET "/api/v1/notifications?page=0&size=1").data.content[0].id)
        }
        if (-not $ids.Count) { Start-Sleep -Seconds 2 }
    }
    if (-not $ids.Count) {
        Fail "none created. A notification for this bracelet in the last 60 s blocks a new one (cooldown)."
        return
    }
    $notification = $ids[-1]
    $script:lastNotificationId = $notification
    Pass "id $notification"

    if ($script:dbMode -ne "none") {
        Begin-Test "Cooldown ($label)" "one notification per fall and recipient"
        if ($ids.Count -eq 1) { Pass "one notification for the whole fall" } else { Info "$($ids.Count) notifications (one per recipient is expected)" }

        Start-Sleep -Seconds 5
        $c = (Db "select realtime_status, email_status, push_status from notifications where id = $notification") -split "\|"
        Begin-Test "Delivery: WebSocket ($label)" "notifications.realtime_status"
        if ($c[0] -eq "SENT") { Pass "SENT" } else { Fail $c[0] }
        Begin-Test "Delivery: email ($label)" "notifications.email_status"
        if ($c[1] -eq "SENT") { Pass "SENT" } else { Fail $c[1] }
        Begin-Test "Delivery: push ($label)" "notifications.push_status"
        switch ($c[2]) {
            "SENT" { Pass "SENT to FCM" }
            "SKIPPED" { Info "SKIPPED: the server has no Firebase key (FIREBASE_CREDENTIALS_PATH)" }
            default { Fail "$($c[2]): see 'Push for notification $notification' in the server log" }
        }
    } else {
        Start-Sleep -Seconds 5
    }

    if ($script:ws) {
        Begin-Test "Live notification ($label)" "STOMP /topic/users/$($script:userId)/notifications delivers it"
        Ws-Drain 3000
        $live = @($script:wsNotifications | Where-Object { [long]$_.id -eq $notification })
        if ($live.Count) { Pass "received '$($live[0].title)' for $($live[0].deviceId)" } else { Fail "not received over STOMP" }
    }

    if ($Adb -and $appState -ne "any") {
        $foreground = Test-AppInForeground
        $shown = (Count-AppNotifications) -gt $systemBefore
        if ($appState -eq "open") {
            Begin-Test "No system notification (app open)" "Android shows nothing while the app is in the foreground"
            if (-not $foreground) { Info "the app was not in the foreground, so this case is not tested" }
            elseif ($shown) { Fail "a system notification appeared although the app is open" }
            else { Pass "nothing in the notification shade" }

            Begin-Test "Alerts badge (app open)" "the unread count on the Alerts tab grows"
            $badgeAfter = Get-AlertsBadge
            if ($badgeBefore -lt 0 -or $badgeAfter -lt 0) { Info "the tab bar is not on screen, so the badge is not checked" }
            elseif ($badgeAfter -gt $badgeBefore) { Pass "$badgeBefore -> $badgeAfter unread" }
            else { Fail "$badgeBefore -> $badgeAfter unread, expected more" }
            AdbShot "fall-app-open"
        } else {
            Begin-Test "System notification (app in background)" "Android shows it in the notification shade"
            if ($foreground) { Info "the app was opened during the test, so Android shows no system notification" }
            elseif ($shown) { Pass "shown in the notification shade" }
            else { Fail "not shown in the notification shade" }
            adb shell cmd statusbar expand-notifications | Out-Null
            Start-Sleep -Seconds 2
            AdbShot "fall-app-background"
            adb shell cmd statusbar collapse | Out-Null
        }
    }

    if ($script:useApi) {
        Test-Request "Notification list ($label)" GET "/api/v1/notifications?page=0&size=1" -Check {
            param($r)
            $first = $r.data.content | Select-Object -First 1
            if ($first.id -eq $notification -and $first.deviceId -eq $DeviceId -and -not $first.readAt) { Ok "$($first.type) | $($first.title) | unread" }
            else { Bad "newest item is not the new unread notification (id $($first.id))" }
        } | Out-Null
        Test-Request "Mark as read ($label)" PATCH "/api/v1/notifications/$notification/read" -Check {
            param($r)
            if ($r.data.readAt) { Ok "readAt $($r.data.readAt)" } else { Bad "readAt is empty" }
        } | Out-Null
        $expectedUnread = $script:unreadBefore + $ids.Count - 1
        Test-Request "Unread count ($label)" GET "/api/v1/notifications/unread-count" -Why "expect $expectedUnread after marking it as read" -Check {
            param($r)
            if ([int]$r.data.unreadCount -eq $expectedUnread) { Ok "$($r.data.unreadCount)" } else { Bad "$($r.data.unreadCount), expected $expectedUnread" }
        } | Out-Null
        $script:unreadBefore = Get-UnreadCount
    }
}

# ===========================================================================
# Run
# ===========================================================================
$runClock = [Diagnostics.Stopwatch]::StartNew()
try {
    Section "Settings"
    if (Test-Path $EnvFile) { Write-Detail ("client env: {0}" -f (Resolve-Path $EnvFile)) } else { Write-Detail "client env: $EnvFile not found, using defaults (copy env_template.txt to .env)" }
    if (Test-Path $ServerEnvFile) { Write-Detail ("server env: {0} (database and AI fallbacks)" -f (Resolve-Path $ServerEnvFile)) }
    $script:sources | Format-Table -AutoSize Setting, Value, Source | Out-String -Width 200 | ForEach-Object { $_.TrimEnd() } | Write-Host -ForegroundColor DarkGray
    Write-Detail ("WebSocket: {0}   phases: {1} x {2} s at {3}/s" -f $wsUrl, ($Phases -join ", "), $PhaseSeconds, $Rate)

    # -----------------------------------------------------------------------
    Section "Services"
    Begin-Test "Spring" "GET $apiUrl/api/v1/auth/me answers (401 without a token is fine)"
    try { Invoke-WebRequest -Uri "$apiUrl/api/v1/auth/me" -UseBasicParsing -TimeoutSec 5 | Out-Null; Pass "$apiUrl is up" }
    catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { Pass "$apiUrl is up" }
        else { Fail "$apiUrl is not reachable: $($_.Exception.Message)"; throw "STOP" }
    }
    Begin-Test "AI server" "GET $aiUrl/docs"
    try { Invoke-WebRequest -Uri "$aiUrl/docs" -UseBasicParsing -TimeoutSec 5 | Out-Null; Pass "$aiUrl is up" }
    catch { Fail "$aiUrl is not reachable (AI checks will fail)" }

    Begin-Test "Mosquitto" "TCP ${broker}:$mqttPort"
    $tcp = New-Object Net.Sockets.TcpClient
    $mqttUp = $false
    try { $mqttUp = $tcp.ConnectAsync($broker, $mqttPort).Wait(2000) } catch {}
    $tcp.Close()
    if ($mqttUp) { Pass "${broker}:$mqttPort accepts connections" } else { Fail "${broker}:$mqttPort is not reachable" }
    Begin-Test "mosquitto_pub" $mosquittoPub
    $pubFound = Test-Path $mosquittoPub
    if ($pubFound) { Pass "found" } else { Fail "not found (set CATCH_TEST_MOSQUITTO_PUB)" }
    $canPublish = $mqttUp -and $pubFound

    Init-Db

    if ($Adb) {
        Begin-Test "Emulator" "adb devices"
        if (@(adb devices 2>$null | Select-String "\tdevice$").Count) { Pass "connected" } else { Fail "no device in 'adb devices'"; throw "STOP" }
    }

    # -----------------------------------------------------------------------
    Section "Auth without an account"
    Test-Request "Profile without a token" GET "/api/v1/auth/me" -NoAuth -Expect 401 -Check {
        param($r); if ($r.message -eq "Authentication required") { Ok "401, $($r.message)" } else { Bad "message '$($r.message)'" }
    } | Out-Null
    Test-Request "Profile with a bad token" GET "/api/v1/auth/me" -Token "not.a.jwt" -Expect 401 | Out-Null
    Test-Request "Login with a malformed body" POST "/api/v1/auth/login" -Body "{not json" -RawBody -NoAuth -Expect 400 | Out-Null
    Test-Request "Login validation" POST "/api/v1/auth/login" -Body @{ email = "not-an-email"; password = "" } -NoAuth -Expect 400 -Check {
        param($r); if ($r.data.fieldErrors.email) { Ok "fieldErrors.email: $($r.data.fieldErrors.email)" } else { Bad "no fieldErrors.email" }
    } | Out-Null
    Test-Request "Register validation" POST "/api/v1/auth/register" -Body @{ username = "x"; email = "bad"; password = "" } -NoAuth -Expect 400 -Check {
        param($r); $fields = @(); if ($r.data.fieldErrors) { $fields = @($r.data.fieldErrors.PSObject.Properties.Name) }
        if ($fields.Count) { Ok "fieldErrors: $($fields -join ', ')" } else { Bad "no fieldErrors" }
    } | Out-Null
    Test-Request "Refresh with an unknown token" POST "/api/v1/auth/refresh" -Body @{ refreshToken = "catch-test-unknown" } -NoAuth -Expect 401 | Out-Null
    Test-Request "Claim validation" POST "/api/v1/device-claims/claim" -Body @{ deviceId = ""; claimSecret = ""; pairingToken = "" } -NoAuth -Expect 400 | Out-Null

    # -----------------------------------------------------------------------
    Section "Account"
    if (-not $Email -and -not $NoPrompt) { $Email = (Read-Host "        Email of the test account (Enter = database-only run)").Trim() }
    if ($Email) {
        if (-not $NoPrompt) {
            $secure = Read-Host "        Password for $Email" -AsSecureString
            $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            try { $script:password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
        }
    }

    if ($Email -and $script:password) {
        Test-Request "Login with a wrong password" POST "/api/v1/auth/login" -Body @{ email = $Email; password = "wrong-" + [guid]::NewGuid() } -NoAuth -Expect 401 | Out-Null
        $login = Test-Request "Login" POST "/api/v1/auth/login" -Body @{ email = $Email; password = $script:password } -NoAuth -Check {
            param($r); if ($r.data.accessToken -and $r.data.refreshToken) { Ok "access + refresh token received" } else { Bad "tokens missing" }
        }
        if ($login.ok) {
            $script:token = $login.data.accessToken
            $script:refreshToken = $login.data.refreshToken
            $script:useApi = $true
        }
    } else {
        Skip-Test "Login" "no email/password (run without -NoPrompt to type them)"
    }

    if ($script:useApi) {
        $me = Test-Request "Profile" GET "/api/v1/auth/me" -Check {
            param($r); if ($r.data.email -eq $Email -and $r.data.active) { Ok "$($r.data.username) (id $($r.data.id)), active" } else { Bad "email $($r.data.email), active $($r.data.active)" }
        }
        $script:userId = $me.data.id
        $username = $me.data.username

        Test-Request "Register with a taken email" POST "/api/v1/auth/register" -Body @{ username = "catchtest" + (Get-Random -Maximum 99999); email = $Email; password = "Test12345!" } -NoAuth -Expect 409 -Why "nothing is created" | Out-Null
        Test-Request "Verify an already verified email" POST "/api/v1/auth/verify-email" -Body @{ email = $Email; code = "000000" } -NoAuth -Expect 400 | Out-Null
        Test-Request "Verify with a bad code format" POST "/api/v1/auth/verify-email" -Body @{ email = $Email; code = "12" } -NoAuth -Expect 400 | Out-Null
        Test-Request "Resend code for a verified email" POST "/api/v1/auth/resend-code" -Body @{ email = $Email } -NoAuth -Expect 400 | Out-Null

        $refreshed = Test-Request "Refresh" POST "/api/v1/auth/refresh" -Body @{ refreshToken = $script:refreshToken } -NoAuth -Check {
            param($r); if ($r.data.accessToken -and $r.data.refreshToken -ne $script:refreshToken) { Ok "new access + refresh token" } else { Bad "the refresh token did not change" }
        }
        Test-Request "Old refresh token after rotation" POST "/api/v1/auth/refresh" -Body @{ refreshToken = $script:refreshToken } -NoAuth -Expect 401 -Why "rotation: the old one stops working" | Out-Null
        if ($refreshed.ok) {
            Test-Request "Logout" POST "/api/v1/auth/logout" -Body @{ refreshToken = $refreshed.data.refreshToken } -NoAuth -Expect 204 | Out-Null
            Test-Request "Refresh after logout" POST "/api/v1/auth/refresh" -Body @{ refreshToken = $refreshed.data.refreshToken } -NoAuth -Expect 401 | Out-Null
        }
        $relogin = Invoke-Api POST "/api/v1/auth/login" @{ email = $Email; password = $script:password } -NoAuth
        if ($relogin.ok) { $script:token = $relogin.data.accessToken; $script:refreshToken = $relogin.data.refreshToken; Write-Detail "logged in again for the rest of the run" }

        $admin = Invoke-Api GET "/api/v1/auth/users?page=0&size=1"
        Begin-Test "Admin: list users" "GET /api/v1/auth/users  403 for USER, 200 for ADMIN"
        if ($admin.status -eq 403) { Pass "403 for a non-admin account" } elseif ($admin.status -eq 200) { Pass "200: this account is ADMIN" } else { Fail "got $($admin.status)" }
        if ($admin.status -eq 403) {
            Test-Request "Admin: deactivate a user" PATCH "/api/v1/auth/users/999999999/deactivate" -Expect 403 | Out-Null
        } else { Skip-Test "Admin: deactivate a user" "not run for an ADMIN account (it would deactivate someone)" }

        # -------------------------------------------------------------------
        Section "Password reset"
        if ($NoPrompt) {
            Skip-Test "Password reset" "-NoPrompt: the flow needs the code from the email"
        } else {
            $forgot = Test-Request "Forgot password" POST "/api/v1/auth/forgot-password" -Body @{ email = $Email } -NoAuth -Expect 204 -Why "sends a code to $Email"
            if ($forgot.ok) {
                Test-Request "Reset with mismatched passwords" POST "/api/v1/auth/reset-password" -Body @{ email = $Email; code = "000000"; newPassword = "a-Password-1"; confirmPassword = "b-Password-1" } -NoAuth -Expect 401 | Out-Null
                Test-Request "Reset with a wrong code" POST "/api/v1/auth/reset-password" -Body @{ email = $Email; code = "000000"; newPassword = $script:password; confirmPassword = $script:password } -NoAuth -Expect 400 | Out-Null
                $code = (Read-Host "        Type the 6-digit code from the email to $Email (Enter = skip)").Trim()
                if ($code) {
                    Test-Request "Reset with the real code" POST "/api/v1/auth/reset-password" -Body @{ email = $Email; code = $code; newPassword = $script:password; confirmPassword = $script:password } -NoAuth -Expect 204 -Why "sets the same password again" | Out-Null
                    $again = Test-Request "Login after the reset" POST "/api/v1/auth/login" -Body @{ email = $Email; password = $script:password } -NoAuth
                    if ($again.ok) { $script:token = $again.data.accessToken; $script:refreshToken = $again.data.refreshToken }
                    Test-Request "The used code again" POST "/api/v1/auth/reset-password" -Body @{ email = $Email; code = $code; newPassword = $script:password; confirmPassword = $script:password } -NoAuth -Expect 400 -Why "a code works once" | Out-Null
                } else { Skip-Test "Reset with the real code" "no code typed" }
            }
        }

        # -------------------------------------------------------------------
        Section "Devices"
        $mine = Test-Request "My devices" GET "/api/v1/devices/my?page=0&size=50" -Check {
            param($r); $list = @($r.data.content)
            if ($list.Count) { Ok ("{0} device(s): {1}" -f $r.data.totalElements, (($list | ForEach-Object { "$($_.deviceId) ($($_.status))" }) -join ", ")) }
            else { Bad "this account has no bracelets (pair one in the app first)" }
        }
        $myDevices = @($mine.data.content | Where-Object { $_ })
        $active = @($myDevices | Where-Object { $_.status -eq "ACTIVE" })
        if ($DeviceId) {
            if (-not @($myDevices | Where-Object { $_.deviceId -eq $DeviceId }).Count) { Fail "-DeviceId $DeviceId is not one of your bracelets"; throw "STOP" }
            Write-Detail "bracelet from -DeviceId: $DeviceId"
        } elseif ($active.Count -eq 0) {
            Fail "no ACTIVE bracelet on this account (pair one in the app first)"; throw "STOP"
        } elseif ($active.Count -eq 1 -or $NoPrompt) {
            Set-Device $active[0].deviceId
            Write-Detail "bracelet: $DeviceId (the only ACTIVE one or the first with -NoPrompt)"
        } else {
            Write-Host "        Your ACTIVE bracelets:"
            for ($i = 0; $i -lt $active.Count; $i++) {
                Write-Host ("          {0}) {1}   online={2}   lastSeen {3}" -f ($i + 1), $active[$i].deviceId, $active[$i].online, $active[$i].lastSeen)
            }
            [int]$pick = 0
            while ($pick -lt 1 -or $pick -gt $active.Count) {
                $answer = (Read-Host "        Bracelet to test (1-$($active.Count), Enter = 1)").Trim()
                if (-not $answer) { $pick = 1 } elseif (-not [int]::TryParse($answer, [ref]$pick)) { $pick = 0 }
            }
            Set-Device $active[$pick - 1].deviceId
            Write-Detail "bracelet: $DeviceId"
        }
        $device = Test-Request "One device" GET "/api/v1/devices/$encodedDevice" -Check {
            param($r); if ($r.data.status -eq "ACTIVE") { Ok "ACTIVE, online=$($r.data.online), lastSeen $($r.data.lastSeen)" } else { Bad "status $($r.data.status)" }
        }
        if (-not $device.ok -or $device.data.status -ne "ACTIVE") { Fail "the bracelet must be ACTIVE and yours"; throw "STOP" }
        Test-Request "Unknown device" GET "/api/v1/devices/Catch-test-unknown-000" -Expect 404 | Out-Null
        Test-Request "Latest reading" GET "/api/v1/devices/$encodedDevice/measurements/latest" -Expect @(200, 404) -Check {
            param($r); if ($r.status -eq 404) { Ok "404: no readings yet" } else { Ok "HR $($r.data.heartRate), SpO2 $($r.data.spo2), measured $($r.data.measuredAt)" }
        } | Out-Null
        Test-Request "Measurements with limit=5" GET "/api/v1/devices/$encodedDevice/measurements?limit=5" -Check {
            param($r); $items = @($r.data.content); $sorted = $true
            for ($i = 1; $i -lt $items.Count; $i++) { if ((ToEpoch $items[$i].measuredAt) -gt (ToEpoch $items[$i - 1].measuredAt)) { $sorted = $false } }
            if ($items.Count -le 5 -and $sorted) { Ok "$($items.Count) item(s), newest first" } else { Bad "$($items.Count) item(s), newest first: $sorted" }
        } | Out-Null
        Test-Request "Measurements limit is clamped" GET "/api/v1/devices/$encodedDevice/measurements?limit=1000" -Why "the server keeps only 120" -Check {
            param($r); $n = @($r.data.content).Count; if ($n -le 120) { Ok "$n item(s)" } else { Bad "$n item(s), more than 120" }
        } | Out-Null

        # -------------------------------------------------------------------
        Section "Pairing, claim, factory"
        Test-Request "Pairing validation" POST "/api/v1/device-pairings" -Body @{ deviceId = "x" } -Expect 400 -Why "deviceId must match ^[A-Za-z0-9_-]{8,64}$" | Out-Null
        Test-Request "Pairing for an unknown bracelet" POST "/api/v1/device-pairings" -Body @{ deviceId = "Catch-test-unknown-000" } -Expect 404 | Out-Null
        Test-Request "Pairing for an already claimed bracelet" POST "/api/v1/device-pairings" -Body @{ deviceId = $DeviceId } -Expect @(404, 409) -Why "$DeviceId is ACTIVE" | Out-Null
        $randomPairing = [guid]::NewGuid()
        Test-Request "Unknown pairing" GET "/api/v1/device-pairings/$randomPairing" -Expect 404 | Out-Null
        Test-Request "Cancel an unknown pairing" DELETE "/api/v1/device-pairings/$randomPairing" -Expect 404 | Out-Null
        Test-Request "Claim an already claimed bracelet" POST "/api/v1/device-claims/claim" -Body @{ deviceId = $DeviceId; claimSecret = "wrong"; pairingToken = "wrong" } -NoAuth -Expect @(400, 404) | Out-Null
        Test-Request "Factory registration without the FACTORY role" POST "/api/v1/factory/devices" -Body @{ deviceId = "Catch-test-factory-0"; claimSecret = "catch-test-claim-secret" } -Expect 403 -Why "a valid body, so the role check decides" | Out-Null

        # -------------------------------------------------------------------
        Section "Relatives"
        Test-Request "My relatives" GET "/api/v1/relatives?page=0&size=20" | Out-Null
        Test-Request "Invitations to me" GET "/api/v1/relatives/invitations?page=0&size=20" | Out-Null
        Test-Request "Invite yourself" POST "/api/v1/relatives/invitations" -Body @{ username = $username } -Expect 400 | Out-Null
        Test-Request "Invite an unknown user" POST "/api/v1/relatives/invitations" -Body @{ username = "catch-test-nobody-" + (Get-Random -Maximum 99999) } -Expect 404 | Out-Null
        Test-Request "Accept an unknown invitation" POST "/api/v1/relatives/invitations/999999999/accept" -Expect 404 | Out-Null
        Test-Request "Decline an unknown invitation" POST "/api/v1/relatives/invitations/999999999/decline" -Expect 404 | Out-Null
        Test-Request "Remove an unknown relative" DELETE "/api/v1/relatives/999999999" -Expect 404 | Out-Null
        $role = Invoke-Api GET "/api/v1/relatives/users?page=0&size=1"
        Begin-Test "RELATIVE-only endpoints" "GET /api/v1/relatives/users and /devices  403 for USER, 200 for RELATIVE"
        if ($role.status -eq 403) {
            $devicesRole = Invoke-Api GET "/api/v1/relatives/devices?page=0&size=1"
            if ($devicesRole.status -eq 403) { Pass "403 for a USER account" } else { Fail "/relatives/devices returned $($devicesRole.status)" }
        } elseif ($role.status -eq 200) { Pass "200: this account is a RELATIVE" }
        else { Fail "got $($role.status)" }

        # -------------------------------------------------------------------
        Section "Notifications"
        Test-Request "Notification list" GET "/api/v1/notifications?page=0&size=5" | Out-Null
        $unread = Test-Request "Unread count" GET "/api/v1/notifications/unread-count" -Check {
            param($r); if ($null -ne $r.data.unreadCount) { Ok "$($r.data.unreadCount) unread" } else { Bad "no unreadCount" }
        }
        Test-Request "Mark an unknown notification as read" PATCH "/api/v1/notifications/999999999/read" -Expect 404 | Out-Null
        $pushToken = "catch-test-" + [guid]::NewGuid()
        Test-Request "Push token validation" POST "/api/v1/notifications/push-tokens" -Body @{ token = $pushToken; platform = "NOKIA" } -Expect 400 | Out-Null
        Test-Request "Register a push token" POST "/api/v1/notifications/push-tokens" -Body @{ token = $pushToken; platform = "WEB"; deviceName = "test-all.ps1" } -Expect 204 -Why "a fake token, removed right after" | Out-Null
        if ($script:dbMode -ne "none") {
            Begin-Test "Push token stored" "user_push_tokens has it, active"
            $row = Db "select active from user_push_tokens where token = '$pushToken'"
            if ($row -eq "t") { Pass "active" } else { Fail "row: '$row'" }
        }
        Test-Request "Remove the push token" DELETE "/api/v1/notifications/push-tokens" -Body @{ token = $pushToken } -Expect 204 | Out-Null
        if ($script:dbMode -ne "none") {
            Begin-Test "Push token removed" "user_push_tokens no longer has it active"
            $row = Db "select coalesce(bool_or(active), false) from user_push_tokens where token = '$pushToken'"
            if ($row -eq "f") { Pass "gone or inactive" } else { Fail "still active" }
        }

        # -------------------------------------------------------------------
        Section "Statistics and AI (before the run)"
        Test-Request "Statistics, 10 min" GET "/api/v1/devices/$encodedDevice/statistics?minutes=10" -Check {
            param($r); if ($r.data.bucketSeconds -eq 10 -and $null -ne $r.data.points) { Ok "$(@($r.data.points).Count) bucket(s) of 10 s, $($r.data.heartRate.samples) HR sample(s)" } else { Bad "unexpected shape" }
        } | Out-Null
        Test-Request "Statistics, minutes=0" GET "/api/v1/devices/$encodedDevice/statistics?minutes=0" -Expect @(400, 500) -Why "out of range 1-60; the server currently answers 500" | Out-Null
        Test-Request "Statistics, minutes=61" GET "/api/v1/devices/$encodedDevice/statistics?minutes=61" -Expect @(400, 500) | Out-Null
        Test-Request "Statistics of an unknown device" GET "/api/v1/devices/Catch-test-unknown-000/statistics" -Expect 404 | Out-Null
        Test-Request "Latest AI analysis" GET "/api/v1/devices/$encodedDevice/analyses/latest" -Expect @(200, 404) -Check {
            param($r); if ($r.status -eq 404) { Ok "404: none yet" } else { Ok "$($r.data.activity), fall=$($r.data.fallDetected)" }
        } | Out-Null
        Test-Request "AI analysis of an unknown device" GET "/api/v1/devices/Catch-test-unknown-000/analyses/latest" -Expect 404 | Out-Null

        # -------------------------------------------------------------------
        Section "Realtime (STOMP over WebSocket)"
        Begin-Test "STOMP with a bad token" "CONNECT to $wsUrl with 'Bearer not.a.jwt', expect an ERROR frame"
        $bad = Ws-Open
        if (-not $bad) { Fail "could not open $wsUrl" }
        else {
            Ws-Send $bad "CONNECT" @{ "accept-version" = "1.2"; host = "catch"; "heart-beat" = "0,0"; Authorization = "Bearer not.a.jwt" }
            $frames = @(Ws-Receive $bad 5000)
            $script:wsTask = $null; $script:wsText = ""
            $first = $frames | Select-Object -First 1
            if ($first -and $first.command -eq "ERROR") { Pass "ERROR: $($first.headers['message'])" }
            elseif ($first -and $first.command -eq "CONNECTED") { Fail "CONNECTED with a bad token" }
            else { Pass "connection refused without CONNECTED" }
            Ws-Close $bad
        }

        Begin-Test "STOMP connect" "CONNECT with the access token, expect CONNECTED"
        $script:ws = Ws-Open
        if (-not $script:ws) { Fail "could not open $wsUrl" }
        else {
            Ws-Send $script:ws "CONNECT" @{ "accept-version" = "1.2"; host = "catch"; "heart-beat" = "0,0"; Authorization = "Bearer $($script:token)" }
            $frames = @(Ws-Receive $script:ws 5000)
            $connected = $frames | Where-Object { $_.command -eq "CONNECTED" } | Select-Object -First 1
            if ($connected) { Pass "CONNECTED (STOMP $($connected.headers['version']))" }
            else { Fail "no CONNECTED frame"; Ws-Close $script:ws; $script:ws = $null }
        }
        if ($script:ws) {
            Begin-Test "Subscribe to the bracelet" "SUBSCRIBE /topic/devices/$DeviceId"
            Ws-Send $script:ws "SUBSCRIBE" @{ id = "device"; destination = "/topic/devices/$DeviceId" }
            Pass "sent; events are checked during the phases"
            Begin-Test "Subscribe to my notifications" "SUBSCRIBE /topic/users/$($script:userId)/notifications"
            Ws-Send $script:ws "SUBSCRIBE" @{ id = "notifications"; destination = "/topic/users/$($script:userId)/notifications" }
            Pass "sent; checked after the fall"
            Begin-Test "Refused subscription keeps the connection" "SUBSCRIBE to another user's notifications is dropped, the socket stays open"
            Ws-Send $script:ws "SUBSCRIBE" @{ id = "foreign"; destination = "/topic/users/$([long]$script:userId + 1)/notifications" }
            Ws-Drain 1500
            if ($script:ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) { Pass "still open" } else { Fail "the connection closed" }
        }
    } else {
        foreach ($s in @("Account checks", "Password reset", "Devices", "Pairing, claim, factory", "Relatives", "Notifications", "Statistics and AI", "Realtime")) {
            Section $s; Skip-Test $s "needs a login"
        }
    }

    # -----------------------------------------------------------------------
    Section "Bracelet run"
    if ($SkipPhases) { Skip-Test "Bracelet run" "-SkipPhases" }
    elseif (-not $canPublish) { Skip-Test "Bracelet run" "Mosquitto or mosquitto_pub is not available" }
    elseif (-not $script:useApi -and $script:dbMode -eq "none") { Skip-Test "Bracelet run" "needs a login or the database to check the results" }
    else {
        if (-not $DeviceId) {
            $typed = ""
            if (-not $NoPrompt) { $typed = (Read-Host "        Bracelet ID for the database-only run (Enter = Catch-001)").Trim() }
            if ($typed) { Set-Device $typed } else { Set-Device "Catch-001" }
        }
        if ($script:dbMode -ne "none") {
            $row = Db "select id, status, coalesce(owner_id, 0) from devices where device_id = '$($DeviceId -replace "'", "''")'"
            if ($row) { $c = $row -split "\|"; $script:devicePk = [long]$c[0]; if (-not $script:userId) { $script:userId = [long]$c[2] } }
            else { Info "$DeviceId is not in the database" }
        }

        $segments = @{}
        (Get-Content -Raw -Path (Join-Path $PSScriptRoot "motion-segments.json") | ConvertFrom-Json).segments |
            ForEach-Object { $segments[$_.name] = $_.samples }
        $unknown = @($Phases | Where-Object { -not $segments.ContainsKey($_) -or -not $expected.ContainsKey($_) })
        if ($unknown.Count) { Fail "unknown phase(s): $($unknown -join ', ')"; throw "STOP" }
        if ($PhaseSeconds * $Rate -lt 113) { Info "PhaseSeconds x Rate = $($PhaseSeconds * $Rate) readings; below 113 a phase may get no clean AI window" }

        $others = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like "*simulate-bracelet*" })
        if ($others.Count) {
            $others | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
            Write-Detail "stopped $($others.Count) running simulate-bracelet.ps1 so it does not mix with the test data"
        }

        $existing = Get-NewAnalyses 0
        if ($existing.Count) { $script:lastAnalysisId = ($existing | Select-Object -Last 1).id }
        if ($script:dbMode -ne "none" -and $script:devicePk) {
            $script:lastNotificationId = [long](Db "select coalesce(max(id), 0) from notifications where device_id = $script:devicePk")
            $tokens = [int](Db "select count(*) from user_push_tokens where user_id = $($script:userId) and active")
            Begin-Test "Push token from the app" "a phone that allowed notifications registered a token"
            if ($tokens -gt 0) { Pass "$tokens active token(s)" } else { Info "none: log in on the phone and allow notifications to test push" }
        }
        $script:unreadBefore = Get-UnreadCount

        Begin-Test "MQTT publisher" "mosquitto_pub -l keeps one connection for the whole run"
        $pubError = Start-Publisher
        if ($pubError) { Fail $pubError; throw "STOP" } else { Pass "connected to ${broker}:$mqttPort" }

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
            # 1) The app is open: no system notification, the app updates the Alerts badge itself
            Open-App
            $systemBefore = Count-AppNotifications
            $badgeBefore = Get-AlertsBadge
            Write-Detail "emulator: app open for the first fall (Alerts badge: $badgeBefore unread)"
            Run-Phase "fall" "fall, app open" $PhaseSeconds
            Check-Notification "app open" "open" $systemBefore $badgeBefore
            # 2) The app is in the background: a system notification must appear
            Send-AppToBackground
            Write-Detail "emulator: app in the background; do not open it until the test ends"
            Run-Phase "still" "recovery" $RecoverySeconds -SkipAi
            $systemBefore = Count-AppNotifications
            Run-Phase "fall" "fall, app in background" $PhaseSeconds
            Check-Notification "app in background" "background" $systemBefore -1
            Open-App
        }

        # -------------------------------------------------------------------
        Section "After the run"
        if ($script:useApi) {
            Test-Request "Latest AI analysis" GET "/api/v1/devices/$encodedDevice/analyses/latest" -Check {
                param($r); if ([long]$r.data.id -eq $script:lastAnalysisId) { Ok "#$($r.data.id) $($r.data.activity), the newest one" } else { Bad "#$($r.data.id), the newest seen is #$($script:lastAnalysisId)" }
            } | Out-Null
            Test-Request "AI analyses, falls only" GET "/api/v1/devices/$encodedDevice/analyses?fallsOnly=true&page=0&size=20" -Check {
                param($r); $items = @($r.data.content); $notFalls = @($items | Where-Object { -not $_.fallDetected })
                if ($notFalls.Count -eq 0) { Ok "$($items.Count) item(s), all with fallDetected=true" } else { Bad "$($notFalls.Count) item(s) without a fall" }
            } | Out-Null
            if ($script:ws) {
                Begin-Test "Live analysis events" "every analysis is also sent over STOMP"
                if ($script:wsEvents.analysis -gt 0) { Pass "$($script:wsEvents.analysis) analysis event(s)" } else { Fail "none received" }
            }
        }

        # Statistics: only what was sent in the last 10 minutes counts
        $since = (NowEpoch) - 600
        $window = @($script:sentRates | Where-Object { $_.t -ge $since })
        $windowMin = ($window | Measure-Object -Property hr -Minimum).Minimum
        $windowMax = ($window | Measure-Object -Property hr -Maximum).Maximum
        $statMin = $null
        if ($script:useApi) {
            $stats = Test-Request "Statistics after the run" GET "/api/v1/devices/$encodedDevice/statistics?minutes=10"
            if ($stats.ok) { $statMin = $stats.data.heartRate.min; $statMax = $stats.data.heartRate.max; $samples = $stats.data.heartRate.samples; $points = @($stats.data.points).Count }
        } elseif ($script:dbMode -ne "none") {
            $c = (Db "select min(heart_rate_min), max(heart_rate_max), sum(heart_rate_sample_count), count(*) from device_statistics where device_id = $script:devicePk and bucket_start > now() - interval '10 minutes'") -split "\|"
            $statMin = $c[0]; $statMax = $c[1]; $samples = $c[2]; $points = $c[3]
        }
        Begin-Test "Statistics range" "covers $windowMin to $windowMax bpm sent in the last 10 min"
        if ($null -eq $statMin -or "$statMin" -eq "") { Fail "no statistics for the last 10 minutes" }
        elseif ([int]$statMin -le $windowMin -and [int]$statMax -ge $windowMax) { Pass "min $statMin, max $statMax" }
        else { Fail "min $statMin, max $statMax" }
        Begin-Test "Statistics samples" "at least 90% of the $($window.Count) readings sent in the last 10 min"
        if ($null -ne $statMin -and [int]$samples -ge $window.Count * 0.9) { Pass "$samples heart rate sample(s) in $points bucket(s)" }
        else { Fail "$samples sample(s)" }

        # Online -> offline. The checks above take more than 10 s, so send a few readings first to be online again.
        Begin-Test "Bracelet back online" "3 s of 'still' readings, then online=true"
        $statusesBefore = $script:wsStatuses.Count
        $still = $segments["still"]
        for ($i = 0; $i -lt [int](3 * $Rate); $i++) {
            Publish $still[$i % $still.Count] 72 97.5
            Ws-Drain
            Start-Sleep -Milliseconds ([int](1000 / $Rate))
        }
        if (Test-Online) { Pass "online" } else { Fail "not online after 3 s of readings" }

        Stop-Publisher
        Begin-Test "Bracelet goes offline" "no readings for 10 s => online=false, expected after ~10 s (polled every 2 s, up to 25 s)"
        $offlineAfter = $null
        $quiet = [Diagnostics.Stopwatch]::StartNew()
        while ($quiet.ElapsedMilliseconds -lt 25000) {
            if ($script:ws) { Ws-Drain 2000 } else { Start-Sleep -Seconds 2 }
            if (-not (Test-Online)) { $offlineAfter = [math]::Round($quiet.ElapsedMilliseconds / 1000, 1); break }
        }
        if ($null -eq $offlineAfter) { Fail "still online after 25 s" }
        elseif ($offlineAfter -lt 6) { Fail "offline already after $offlineAfter s, expected about 10 s" }
        else { Pass "offline after $offlineAfter s" }
        if ($script:ws) {
            Begin-Test "Live status events" "STOMP 'status' events: online=true when data came back, online=false when it stopped"
            Ws-Drain 3000
            $recent = @($script:wsStatuses | Select-Object -Skip $statusesBefore)
            $wentOnline = @($recent | Where-Object { $_.online }).Count
            $wentOffline = @($recent | Where-Object { -not $_.online }).Count
            if ($wentOnline -and $wentOffline) { Pass "online=true, then online=false" }
            elseif ($wentOffline) { Info "only online=false (the bracelet may not have been offline before the 3 s of readings)" }
            else { Fail "no status event with online=false" }
        }
    }
} catch {
    if ("$_" -ne "STOP") { Write-Host ("  ERROR {0}" -f $_) -ForegroundColor Red; Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray }
    else { Write-Host "  Stopped: a required check failed." -ForegroundColor Red }
} finally {
    Stop-Publisher
    if ($script:ws) { Ws-Close $script:ws; $script:ws = $null }
    $script:password = $null
    $script:token = $null
    $script:refreshToken = $null
}

# ===========================================================================
# Summary
# ===========================================================================
Section "Summary"
$script:results | Group-Object Group | ForEach-Object {
    $pass = @($_.Group | Where-Object Result -eq "PASS").Count
    $fail = @($_.Group | Where-Object Result -eq "FAIL").Count
    $skip = @($_.Group | Where-Object Result -eq "SKIP").Count
    $color = "Green"; if ($fail) { $color = "Red" } elseif ($skip) { $color = "Yellow" }
    Write-Host ("  {0,-34} {1,3} pass  {2,3} fail  {3,3} skip" -f $_.Name, $pass, $fail, $skip) -ForegroundColor $color
}
$failed = @($script:results | Where-Object { $_.Result -eq "FAIL" })
if ($failed.Count) {
    Write-Host ""
    Write-Host "  Failed checks:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host ("    [{0:000}] {1}: {2}" -f $_.No, $_.Check, $_.Detail) -ForegroundColor Red }
}
Write-Host ""
$passed = @($script:results | Where-Object { $_.Result -eq "PASS" }).Count
$skipped = @($script:results | Where-Object { $_.Result -eq "SKIP" }).Count
$notes = @($script:results | Where-Object { $_.Result -eq "INFO" }).Count
$minutes = [math]::Round($runClock.Elapsed.TotalMinutes, 1)
$tail = "{0} skipped, {1} note(s), {2} min." -f $skipped, $notes, $minutes
if ($failed.Count -eq 0) { Write-Host ("  All {0} checks passed; {1}" -f $passed, $tail) -ForegroundColor Green }
else { Write-Host ("  {0} check(s) failed, {1} passed; {2}" -f $failed.Count, $passed, $tail) -ForegroundColor Red }
if ($notes) {
    Write-Host "  Notes:" -ForegroundColor Gray
    $script:results | Where-Object { $_.Result -eq "INFO" } | ForEach-Object { Write-Host ("    [{0:000}] {1}: {2}" -f $_.No, $_.Check, $_.Detail) -ForegroundColor Gray }
}
exit $failed.Count

# ---------------------------------------------------------------------------
# Run from the client folder. Needs the server, Mosquitto and the AI server running; the database is optional.
# Settings: client/.env (see env_template.txt), database fallbacks from server/.env.
#
# Everything; asks for the email, the password, the bracelet (if you have several) and the reset code (about 4 minutes):
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
#
# A given account or bracelet (still asks for the password):
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Email you@example.com -DeviceId Catch-002
#
# No questions at all (no login, so only the checks without an account and the database checks):
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -NoPrompt
#
# Database from Docker / a local PostgreSQL / none:
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Db docker
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Db local
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Db none
#
# Only the API and realtime checks (about 30 s):
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -SkipPhases
#
# With the emulator (screenshots, the fall with the app open and in the background):
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Adb
#
# Other phases, length or speed; full request/response bodies and SQL:
#   powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1 -Phases walking,fall -PhaseSeconds 40 -Rate 4 -DebugLog
#
# Stop: Ctrl+C (the MQTT publisher and the WebSocket are closed).
# ---------------------------------------------------------------------------
