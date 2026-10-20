$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
Write-Host "CyberLab Studio Pro - unified Windows setup" -ForegroundColor Cyan
Write-Host "This compatibility entrypoint delegates to the maintained terminal installer." -ForegroundColor DarkGray
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "cyberlab.ps1") install
exit $LASTEXITCODE
