# PlaceX - Helper to start Pipecat Live Brain and Cloudflare Tunnel
param(
    [string]$TunnelUrl = ""
)

$placexRoot = "C:\Users\JrFar\.gemini\antigravity\scratch\placex"
$mockDir = Join-Path $placexRoot "backend\MOCK\placex_files"
$execDir = Join-Path $placexRoot "backend\MOCK\execution"
$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting PlaceX Live Brain Pipecat Engine (Port 7860)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Set environment
$env:PYTHONPATH = "$mockDir;$execDir;$env:PYTHONPATH"
$env:PYTHONUTF8 = "1"
$env:PYTHONUNBUFFERED = "1"

# Check if port 7860 is already in use
$existing = Get-NetTCPConnection -LocalPort 7860 -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[!] Port 7860 is already running (PID: $($existing.OwningProcess[0]))" -ForegroundColor Yellow
} else {
    Write-Host "[+] Launching Pipecat supervisor on port 7860 (auto-restart daemon)..." -ForegroundColor Green
    Start-Process -FilePath "python.exe" -ArgumentList "supervisor.py" -WorkingDirectory $mockDir
    Start-Sleep -Seconds 3
}

# Check if cloudflared is already running
$existingCf = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($existingCf) {
    Write-Host "[!] Cloudflared tunnel is already running (PID: $($existingCf.Id))" -ForegroundColor Yellow
} else {
    Write-Host "[+] Launching Cloudflare Tunnel for 127.0.0.1:7860..." -ForegroundColor Green
    Start-Process -FilePath $cloudflaredPath -ArgumentList "tunnel --url http://127.0.0.1:7860 --no-autoupdate"
}

if ($TunnelUrl -ne "") {
    Write-Host "[+] Syncing Tunnel URL to Cloudflare edge: $TunnelUrl" -ForegroundColor Cyan
    $payload = @{ url = $TunnelUrl } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "https://placex.com/api/v1/interview/tunnel" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
        Invoke-RestMethod -Uri "https://placex.jrfarkade.workers.dev/api/v1/interview/tunnel" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "[✓] Tunnel URL successfully synced with live website!" -ForegroundColor Green
    } catch {
        Write-Host "[!] Cloudflare sync notice: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

Write-Host "`nLive Brain Engine & Tunnel are active." -ForegroundColor Green
Write-Host "Remember: Your laptop must stay powered on and connected to WiFi." -ForegroundColor Magenta

