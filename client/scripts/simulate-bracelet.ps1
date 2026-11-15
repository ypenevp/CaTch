# Sends a fake bracelet reading to the local MQTT broker every second, in the same format as the firmware.
# The device must exist in the database, be ACTIVE and belong to the logged-in user.
param(
    [string]$DeviceId = "Catch-001",
    # 127.0.0.1, not localhost: Mosquitto listens on IPv4 only and localhost tries IPv6 first (2 s delay)
    [string]$Broker = "127.0.0.1",
    [int]$Port = 1883
)

$mosquittoPub = "C:\Program Files\Mosquitto\mosquitto_pub.exe"
$topic = "devices/$DeviceId/measurements"
$culture = [System.Globalization.CultureInfo]::InvariantCulture

function Noise([double]$amount) {
    return (Get-Random -Minimum -1000 -Maximum 1000) / 1000 * $amount
}

Write-Host "Publishing to $topic on ${Broker}:$Port every second. Ctrl+C to stop."

$clock = [System.Diagnostics.Stopwatch]::StartNew()
$second = 0
while ($true) {
    $reading = [ordered]@{
        ts        = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        deviceId  = $DeviceId
        accelX    = [math]::Round((Noise 0.02), 3)
        accelY    = [math]::Round((Noise 0.02), 3)
        accelZ    = [math]::Round(1 + (Noise 0.02), 3)
        gyroX     = [math]::Round((Noise 0.5), 2)
        gyroY     = [math]::Round((Noise 0.5), 2)
        gyroZ     = [math]::Round((Noise 0.5), 2)
        heartRate = [int](72 + 6 * [math]::Sin($second / 10) + (Noise 2))
        spo2      = [math]::Round(97.5 + (Noise 1), 1)
    }

    $reading | ConvertTo-Json -Compress | & $mosquittoPub -h $Broker -p $Port -t $topic -s
    Write-Host ("{0:HH:mm:ss}  HR {1}  SpO2 {2}" -f (Get-Date), $reading.heartRate, $reading.spo2.ToString($culture))

    $second++
    $wait = $second * 1000 - $clock.ElapsedMilliseconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
}

# ---------------------------------------------------------------------------
# Run (from the client folder; needs the server, the database and Mosquitto running):
#   powershell -ExecutionPolicy Bypass -File scripts\simulate-bracelet.ps1 -DeviceId Catch-001
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
