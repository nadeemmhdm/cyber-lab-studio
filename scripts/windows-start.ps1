$ErrorActionPreference = "Stop"
Write-Host "Building CyberLab Studio Pro..." -ForegroundColor Cyan
npm run build
Write-Host "Starting production server on http://localhost:3000" -ForegroundColor Green
Write-Host "Keep this process running while Cloudflare Tunnel is connected." -ForegroundColor Yellow
npm start
