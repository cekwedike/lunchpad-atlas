# PowerShell Setup Script for Chat & Notifications
# Run this script from the project root directory

Write-Host "🚀 Starting setup for Chat & Notifications..." -ForegroundColor Cyan
Write-Host ""

# Check if pnpm is available, fallback to npm
$packageManager = "npm"
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $packageManager = "pnpm"
    Write-Host "✓ Using pnpm" -ForegroundColor Green
} else {
    Write-Host "! pnpm not found, using npm" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Step 1: Installing Backend Dependencies..." -ForegroundColor Cyan
Set-Location backend

try {
    if ($packageManager -eq "pnpm") {
        pnpm install
    } else {
        npm install
    }
    Write-Host "✓ Backend dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Error installing backend dependencies: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Step 2: Installing Frontend Dependencies..." -ForegroundColor Cyan
Set-Location ../frontend

try {
    if ($packageManager -eq "pnpm") {
        pnpm install
    } else {
        npm install
    }
    Write-Host "✓ Frontend dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Error installing frontend dependencies: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Step 3: Generating Prisma Client..." -ForegroundColor Cyan
Set-Location ../backend

try {
    npx prisma generate
    Write-Host "✓ Prisma client generated successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Error generating Prisma client: $_" -ForegroundColor Red
    Write-Host "   Make sure PostgreSQL is running and DATABASE_URL is set in .env" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🗄️  Step 4: Running Database Migrations..." -ForegroundColor Cyan

try {
    npx prisma migrate dev --name add-chat-and-notifications
    Write-Host "✓ Database migrations applied successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Error running migrations: $_" -ForegroundColor Red
    Write-Host "   Check your database connection and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Uncomment WebSocket code in frontend/src/hooks/useChatSocket.ts" -ForegroundColor White
Write-Host "  2. Start backend: cd backend && npm run start:dev" -ForegroundColor White
Write-Host "  3. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📚 For detailed instructions, see SETUP.md in the project root" -ForegroundColor Yellow

Set-Location ..
