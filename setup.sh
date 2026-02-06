#!/bin/bash
# Setup Script for Chat & Notifications
# Run this script from the project root directory

echo "🚀 Starting setup for Chat & Notifications..."
echo ""

# Check if pnpm is available, fallback to npm
PACKAGE_MANAGER="npm"
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    echo "✓ Using pnpm"
else
    echo "! pnpm not found, using npm"
fi

echo ""
echo "📦 Step 1: Installing Backend Dependencies..."
cd backend || exit 1

if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install
else
    npm install
fi

if [ $? -ne 0 ]; then
    echo "✗ Error installing backend dependencies"
    exit 1
fi
echo "✓ Backend dependencies installed successfully"

echo ""
echo "📦 Step 2: Installing Frontend Dependencies..."
cd ../frontend || exit 1

if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install
else
    npm install
fi

if [ $? -ne 0 ]; then
    echo "✗ Error installing frontend dependencies"
    exit 1
fi
echo "✓ Frontend dependencies installed successfully"

echo ""
echo "🔧 Step 3: Generating Prisma Client..."
cd ../backend || exit 1

npx prisma generate
if [ $? -ne 0 ]; then
    echo "✗ Error generating Prisma client"
    echo "   Make sure PostgreSQL is running and DATABASE_URL is set in .env"
    exit 1
fi
echo "✓ Prisma client generated successfully"

echo ""
echo "🗄️  Step 4: Running Database Migrations..."

npx prisma migrate dev --name add-chat-and-notifications
if [ $? -ne 0 ]; then
    echo "✗ Error running migrations"
    echo "   Check your database connection and try again"
    exit 1
fi
echo "✓ Database migrations applied successfully"

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next Steps:"
echo "  1. Uncomment WebSocket code in frontend/src/hooks/useChatSocket.ts"
echo "  2. Start backend: cd backend && npm run start:dev"
echo "  3. Start frontend: cd frontend && npm run dev"
echo ""
echo "📚 For detailed instructions, see SETUP.md in the project root"

cd ..
