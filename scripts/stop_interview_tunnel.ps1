# PlaceX - Helper to stop Pipecat Live Brain and Cloudflare Tunnel

Write-Host "Stopping Pipecat Live Brain and Cloudflare Tunnel..." -ForegroundColor Yellow

# Stop port 7860 listeners
$conns = Get-NetTCPConnection -LocalPort 7860 -ErrorAction SilentlyContinue
if ($conns) {
    foreach ($c in $conns) {
        Write-Host "Terminating process on port 7860 (PID: $($c.OwningProcess))..." -ForegroundColor Red
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Stop cloudflared
$cf = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cf) {
    Write-Host "Terminating cloudflared process..." -ForegroundColor Red
    Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
}

Write-Host "Stopped successfully." -ForegroundColor Green
