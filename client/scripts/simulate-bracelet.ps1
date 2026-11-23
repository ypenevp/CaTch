# Sends a fake bracelet reading to the local MQTT broker every second, in the same format as the firmware.
# The device must exist in the database, be ACTIVE and belong to the logged-in user.
# Motion is replayed from real recorded windows (motion-segments.json) so the AI model sees walking, still,
# lying and a fall in turn. Each phase lasts PhaseSeconds; the server analyses the last 75 readings,
# so a phase of 150 s gives at least one clean analysis per phase.
param(
    [string]$DeviceId = "Catch-001",
    # 127.0.0.1, not localhost: Mosquitto listens on IPv4 only and localhost tries IPv6 first (2 s delay)
    [string]$Broker = "127.0.0.1",
    [int]$Port = 1883,
    [int]$PhaseSeconds = 150,
    # Order of the phases; names come from motion-segments.json (walking, still, lying, fall)
    [string[]]$Phases = @("walking", "still", "lying", "fall")
)

$mosquittoPub = "C:\Program Files\Mosquitto\mosquitto_pub.exe"
$topic = "devices/$DeviceId/measurements"
$culture = [System.Globalization.CultureInfo]::InvariantCulture

$segments = @{}
(Get-Content -Raw -Path (Join-Path $PSScriptRoot "motion-segments.json") | ConvertFrom-Json).segments |
    ForEach-Object { $segments[$_.name] = $_.samples }
# With -File, "-Phases walking,fall" arrives as one string, so split it here
$Phases = @($Phases | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
foreach ($name in $Phases) {
    if (-not $segments.ContainsKey($name)) { throw "Unknown phase '$name'. Use: $($segments.Keys -join ', ')" }
}

function Noise([double]$amount) {
    return (Get-Random -Minimum -1000 -Maximum 1000) / 1000 * $amount
}

Write-Host "Publishing to $topic on ${Broker}:$Port every second. Phases: $($Phases -join ' > ') ($PhaseSeconds s each). Ctrl+C to stop."

$clock = [System.Diagnostics.Stopwatch]::StartNew()
$second = 0
while ($true) {
    $phase = $Phases[[math]::Floor($second / $PhaseSeconds) % $Phases.Count]
    $samples = $segments[$phase]
    $motion = $samples[($second % $PhaseSeconds) % $samples.Count]

    $reading = [ordered]@{
        ts        = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        deviceId  = $DeviceId
        accelX    = $motion[0]
        accelY    = $motion[1]
        accelZ    = $motion[2]
        gyroX     = $motion[3]
        gyroY     = $motion[4]
        gyroZ     = $motion[5]
        heartRate = [int](72 + 6 * [math]::Sin($second / 10) + (Noise 2))
        spo2      = [math]::Round(97.5 + (Noise 1), 1)
    }

    $reading | ConvertTo-Json -Compress | & $mosquittoPub -h $Broker -p $Port -t $topic -s
    Write-Host ("{0:HH:mm:ss}  {1,-8} HR {2}  SpO2 {3}" -f (Get-Date), $phase, $reading.heartRate, $reading.spo2.ToString($culture))

    $second++
    $wait = $second * 1000 - $clock.ElapsedMilliseconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
}

# ---------------------------------------------------------------------------
# Run (from the client folder; needs the server, the database, Mosquitto and the AI server running):
#   powershell -ExecutionPolicy Bypass -File scripts\simulate-bracelet.ps1 -DeviceId Catch-001
#
# Shorter phases or another order (e.g. only walking and a fall):
#   powershell -ExecutionPolicy Bypass -File scripts\simulate-bracelet.ps1 -PhaseSeconds 120 -Phases walking,fall
#
# Other bracelet or broker:
#   powershell -ExecutionPolicy Bypass -File scripts\simulate-bracelet.ps1 -DeviceId Catch-003 -Broker 192.168.1.15 -Port 1883
#
# Stop:
#   Ctrl+C in the terminal where it runs.
#
# Stop it when it runs in another terminal or in the background:
#   Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*simulate-bracelet*' } | ForEach-Object { Stop-Process -Id $_.ProcessId }
# ---------------------------------------------------------------------------
