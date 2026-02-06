# Setup Instructions for Chat & Notifications

This guide will help you complete the setup for the newly implemented chat and notification systems.

## Prerequisites

Ensure you have the following installed:
- Node.js (v18 or higher)
- pnpm (recommended) or npm
- PostgreSQL database running

## Step 1: Install Dependencies

### Backend Dependencies

Open a terminal in the backend directory and run:

```bash
cd backend

# Using pnpm (recommended)
pnpm install

# OR using npm
npm install
```

This will install the newly added dependencies:
- `@nestjs/websockets@^11.0.1`
- `@nestjs/platform-socket.io@^11.0.1`
- `socket.io@^4.7.2`

### Frontend Dependencies

Open a terminal in the frontend directory and run:

```bash
cd frontend

# Using pnpm (recommended)
pnpm install

# OR using npm
npm install
```

This will install:
- `socket.io-client@^4.7.2`

## Step 2: Generate Prisma Client & Run Migrations

The Prisma schema has been updated with new models:
- **Chat System**: `Channel`, `ChatMessage`, `ChannelType` enum
- **Notifications**: `Notification`, `NotificationType` enum

Run the following commands in the backend directory:

```bash
cd backend

# Generate Prisma client with new types
npx prisma generate

# Create and apply database migration
npx prisma migrate dev --name add-chat-and-notifications
```

**What this does:**
1. Generates TypeScript types for the new models
2. Creates migration files
3. Applies the migration to your database
4. Creates the following tables:
   - `channels` - Chat channels (cohort-wide, monthly themes, session-specific)
   - `chat_messages` - All chat messages with moderation flags
   - `notifications` - User notifications with read status

## Step 3: Enable WebSocket in Frontend

After installing `socket.io-client`, you need to enable the WebSocket code:

### For Chat WebSocket

Edit `frontend/src/hooks/useChatSocket.ts`:

1. **Uncomment the import** at line 4:
   ```typescript
   import { io, Socket } from 'socket.io-client';
   ```

2. **Uncomment the main implementation** (the large commented block starting around line 30)

3. **Delete the temporary implementation** at the bottom (the return statement with console.warn messages)

### For Notifications WebSocket

You'll need to create the frontend notification components in the next todo, which will use similar WebSocket patterns.

## Step 4: Verify Installation

### Check Prisma Types

Open `backend/src/chat/chat.service.ts` or `backend/src/notifications/notifications.service.ts` and verify there are no TypeScript errors related to:
- `this.prisma.channel`
- `this.prisma.chatMessage`
- `this.prisma.notification`
- `NotificationType` enum
- `ChannelType` enum

If you see red squiggles, try:
1. Reloading VS Code window (Ctrl+Shift+P → "Reload Window")
2. Restarting TypeScript server (Ctrl+Shift+P → "TypeScript: Restart TS Server")

### Check Package Installation

Run these commands to verify packages are installed:

```bash
# Backend - check for @nestjs/websockets
cd backend
npm list @nestjs/websockets

# Frontend - check for socket.io-client
cd ../frontend
npm list socket.io-client
```

## Step 5: Update Environment Variables

### Backend `.env`

Ensure your backend `.env` file has:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/atlas_db"
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://localhost:3000"  # For CORS
```

### Frontend `.env.local`

Ensure your frontend `.env.local` file has:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Step 6: Test the Setup

### Start the Backend

```bash
cd backend
npm run start:dev
```

You should see:
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] ChatModule dependencies initialized
[Nest] LOG [InstanceLoader] NotificationsModule dependencies initialized
...
```

### Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend should start at `http://localhost:3000`

### Test WebSocket Connection

Open browser console and test:

```javascript
// Test chat WebSocket
const chatSocket = io('http://localhost:3000/chat', {
  auth: { userId: 'test-user-id' }
});

chatSocket.on('connect', () => {
  console.log('✅ Chat WebSocket connected!');
});

// Test notifications WebSocket
const notifSocket = io('http://localhost:3000/notifications', {
  auth: { userId: 'test-user-id' }
});

notifSocket.on('connect', () => {
  console.log('✅ Notifications WebSocket connected!');
});
```

## Troubleshooting

### Issue: "Cannot find module '@nestjs/websockets'"

**Solution:** 
1. Delete `node_modules` and `package-lock.json` / `pnpm-lock.yaml`
2. Run `npm install` or `pnpm install` again
3. Restart your IDE

### Issue: "Property 'channel' does not exist on type 'PrismaService'"

**Solution:**
1. Run `npx prisma generate` in the backend directory
2. Restart TypeScript server in VS Code
3. If still showing errors, reload VS Code window

### Issue: WebSocket connection fails with CORS error

**Solution:**
1. Check `FRONTEND_URL` in backend `.env`
2. Verify CORS configuration in `chat.gateway.ts` and `notifications.gateway.ts`
3. Make sure frontend is running on the expected port

### Issue: Migration fails

**Solution:**
1. Check if PostgreSQL is running: `pg_isready`
2. Verify `DATABASE_URL` in `.env`
3. Check if tables already exist: `psql -d atlas_db -c "\dt"`
4. If needed, reset database: `npx prisma migrate reset` (⚠️ **This will delete all data!**)

### Issue: pnpm/npm not recognized

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart your terminal
3. Verify installation: `node --version` and `npm --version`
4. For pnpm: `npm install -g pnpm`

## What's Next?

After completing setup, you can:

1. ✅ Test chat functionality by creating channels and sending messages
2. ✅ Test notifications by triggering events (resource unlocks, achievements, etc.)
3. 📝 Continue with **Todo #4**: Build notification frontend components
4. 📝 Integrate notifications into existing services (resources, achievements, discussions)

## Quick Test Commands

### Create a Test Channel (Using REST API)

```bash
curl -X POST http://localhost:3000/chat/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "cohortId": "YOUR_COHORT_ID",
    "type": "COHORT_WIDE",
    "name": "General",
    "description": "General discussion"
  }'
```

### Send a Test Message

```bash
curl -X POST http://localhost:3000/chat/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "channelId": "CHANNEL_ID",
    "content": "Hello, world!"
  }'
```

### Create a Test Notification (Internal Use)

```typescript
// In any backend service
await this.notificationsService.notifyResourceUnlock(
  userId,
  'Setting SMART Goals',
  resourceId
);
```

## Need Help?

- Review setup documentation in `backend/src/chat/SETUP.md`
- Review notification integration in `backend/src/notifications/SETUP.md`
- Check frontend chat setup in `frontend/src/components/Chat/SETUP.md`

## Summary Checklist

- [ ] Install backend dependencies (`pnpm install` in backend/)
- [ ] Install frontend dependencies (`pnpm install` in frontend/)
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma migrate dev --name add-chat-and-notifications`
- [ ] Uncomment WebSocket code in `useChatSocket.ts`
- [ ] Update environment variables
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Test WebSocket connections
- [ ] Verify no TypeScript errors
- [ ] Test basic chat and notification functionality

Once all items are checked, you're ready to continue with the remaining todos! 🚀
