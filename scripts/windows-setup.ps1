$ErrorActionPreference = "Stop"

Write-Host "CyberLab Studio Pro v1.0.0 - Windows setup" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 24.12+ is required. Install it first, then run this script again."
}

$nodeVersion = (node -p "process.versions.node")
$major = [int]($nodeVersion.Split('.')[0])
if ($major -lt 24) { throw "Node.js 24.12+ is required. Current version: $nodeVersion" }

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example." -ForegroundColor Yellow
  Write-Host "Fill Firebase Web/Admin values, SESSION_SECRET, and INITIAL_ADMIN_EMAIL before signing in." -ForegroundColor Yellow
}

npm ci
npx prisma generate
npx prisma db push
npm run db:seed

Write-Host "" 
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "1. Configure .env and Firebase Authentication providers/domains."
Write-Host "2. Start with: npm run dev"
Write-Host "3. Register and verify the account matching INITIAL_ADMIN_EMAIL."
Write-Host "4. Open http://localhost:3000/setup and claim the first administrator role."
Write-Host "5. Confirm /admin access, remove INITIAL_ADMIN_EMAIL from .env, then restart CyberLab."
