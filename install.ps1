param(
  [string]$InstallDir = (Join-Path $HOME "CyberLab-Studio"),
  [string]$RepoUrl = "https://github.com/nadeemmhdm/cyber-lab-studio.git",
  [string]$Branch = "main",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "[OK] $Text" -ForegroundColor Green }
function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = @($machine, $user, $env:Path) -join ";"
}
function Ensure-Git {
  if (Get-Command git -ErrorAction SilentlyContinue) { Write-Ok "Git available"; return }
  Write-Step "Git not found - installing Git"
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    & winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) { throw "winget could not install Git." }
    Refresh-Path
  }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is required and could not be installed automatically. Install Git for Windows, then run the same command again."
  }
  Write-Ok "Git installed"
}

Write-Host "CyberLab Studio Pro - one-line installer" -ForegroundColor Cyan
Write-Host "Target: $InstallDir"

if ($DryRun) {
  Write-Host "Dry-run OK: installer parsed successfully."
  exit 0
}

Ensure-Git
$fresh = -not (Test-Path (Join-Path $InstallDir ".git"))

if ($fresh) {
  if ((Test-Path $InstallDir) -and (Get-ChildItem -LiteralPath $InstallDir -Force -ErrorAction SilentlyContinue | Select-Object -First 1)) {
    throw "Install directory already exists and is not a CyberLab Git checkout: $InstallDir"
  }
  Write-Step "Cloning CyberLab Studio Pro"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $InstallDir) | Out-Null
  & git clone --branch $Branch --single-branch $RepoUrl $InstallDir
  if ($LASTEXITCODE -ne 0) { throw "Git clone failed." }
  Write-Ok "Repository cloned"
} else {
  Write-Step "Updating existing CyberLab checkout"
  $dirty = (& git -C $InstallDir status --porcelain) -join "`n"
  if ($dirty.Trim()) {
    throw "Local changes detected in $InstallDir. Commit/stash them before running the installer again."
  }
  & git -C $InstallDir fetch origin $Branch
  if ($LASTEXITCODE -ne 0) { throw "Git fetch failed." }
  & git -C $InstallDir checkout $Branch
  if ($LASTEXITCODE -ne 0) { throw "Could not checkout $Branch." }
  & git -C $InstallDir pull --ff-only origin $Branch
  if ($LASTEXITCODE -ne 0) { throw "Fast-forward update failed." }
  Write-Ok "Repository updated"
}

Set-Location $InstallDir
if (-not (Test-Path ".\cyberlab.ps1")) { throw "cyberlab.ps1 is missing after clone/update." }

if ($fresh -or -not (Test-Path ".env")) {
  Write-Step "Starting complete first-time setup"
  & powershell -NoProfile -ExecutionPolicy Bypass -File ".\cyberlab.ps1" install
} else {
  Write-Step "Checking packages, security audit, database and updates"
  & powershell -NoProfile -ExecutionPolicy Bypass -File ".\cyberlab.ps1" install --maintenance
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Step "Opening CyberLab management menu"
  & powershell -NoProfile -ExecutionPolicy Bypass -File ".\cyberlab.ps1"
}
exit $LASTEXITCODE
