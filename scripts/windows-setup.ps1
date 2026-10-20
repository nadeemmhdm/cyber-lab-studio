$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
Write-Host "Legacy setup entrypoint detected. Starting the unified CyberLab setup..." -ForegroundColor Cyan
& (Join-Path $Root "cyberlab.ps1") setup @args
exit $LASTEXITCODE
