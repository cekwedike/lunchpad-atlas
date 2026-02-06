# Setup script with Node.js path included
$nodePath = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs"
$env:Path = "$nodePath;$env:Path"

Write-Host "🚀 Starting Setup..." -ForegroundColor Cyan
Write-Host ""

# Test Node.js
$nodeVersion = & node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not available" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Step 1: Installing Backend Dependencies..." -ForegroundColor Cyan
Set-Location "c:\Users\cheed\OneDrive\Desktop\LaunchPad\career-resources-hub\backend"

& node .\node_modules\.bin\npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
    Write-Host "Trying with npx..." -ForegroundColor Yellow
    & npx npm install
}

Write-Host ""
Write-Host "📦 Step 2: Installing Frontend Dependencies..." -ForegroundColor Cyan
Set-Location "..\frontend"

& node ..\backend\node_modules\.bin\npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Warning: Frontend install may have issues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Step 3: Generating Prisma Client..." -ForegroundColor Cyan
Set-Location "..\backend"

& node .\node_modules\.bin\prisma.CMD generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "✗ Prisma generation failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🗄️  Step 4: Running Database Migrations..." -ForegroundColor Cyan

& node .\node_modules\.bin\prisma.CMD migrate dev --name add-chat-and-notifications
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations applied" -ForegroundColor Green
} else {
    Write-Host "✗ Migration failed - check database connection" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Setup process completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Uncomment WebSocket code in frontend/src/hooks/useChatSocket.ts" -ForegroundColor White
Write-Host "2. Start backend: cd backend && npm run start:dev" -ForegroundColor White
Write-Host "3. Start frontend: cd frontend && npm run dev" -ForegroundColor White

Set-Location ".."
