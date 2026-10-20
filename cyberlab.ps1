$ErrorActionPreference = "Stop"

$RequiredVersion = [Version]"24.12.0"
$NodeRelease = "24.12.0"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Test-NodeRuntime([string]$Executable) {
  try {
    $raw = & $Executable -p "process.versions.node" 2>$null
    if (-not $raw) { return $false }
    return ([Version]$raw.Trim()) -ge $RequiredVersion
  } catch { return $false }
}

$nodeExe = $null
if (Get-Command node -ErrorAction SilentlyContinue) {
  if (Test-NodeRuntime "node") { $nodeExe = (Get-Command node).Source }
}

if (-not $nodeExe) {
  $cpu = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
  $asset = "node-v$NodeRelease-win-$cpu.zip"
  $runtimeRoot = Join-Path $Root ".cyberlab\runtime"
  $runtimeDir = Join-Path $runtimeRoot "node-v$NodeRelease-win-$cpu"
  $candidate = Join-Path $runtimeDir "node.exe"

  if (-not (Test-Path $candidate)) {
    Write-Host "CyberLab: Node.js 24.12+ not found. Installing a verified repo-local Node runtime..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    $zip = Join-Path $runtimeRoot $asset
    $checksums = Join-Path $runtimeRoot "SHASUMS256.txt"
    Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$NodeRelease/$asset" -OutFile $zip
    Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$NodeRelease/SHASUMS256.txt" -OutFile $checksums
    $expectedLine = Get-Content $checksums | Where-Object { $_ -match "\s+$([Regex]::Escape($asset))$" } | Select-Object -First 1
    if (-not $expectedLine) { throw "Could not find $asset in Node.js SHASUMS256.txt" }
    $expected = ($expectedLine -split "\s+")[0].ToLowerInvariant()
    $actual = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
    if ($expected -ne $actual) { Remove-Item $zip -Force; throw "Node.js download checksum verification failed." }
    Expand-Archive -Path $zip -DestinationPath $runtimeRoot -Force
    Remove-Item $zip -Force
  }

  if (-not (Test-NodeRuntime $candidate)) { throw "Unable to bootstrap Node.js $NodeRelease." }
  $nodeExe = $candidate
  $env:PATH = "$runtimeDir;$env:PATH"
}

& $nodeExe (Join-Path $Root "scripts\cyberlab.mjs") @args
exit $LASTEXITCODE
