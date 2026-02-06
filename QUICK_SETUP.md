# Quick Setup Reference

## One-Command Setup

### Windows (PowerShell)
```powershell
.\setup.ps1
```

### Mac/Linux (Bash)
```bash
chmod +x setup.sh
./setup.sh
```

## Manual Setup (if scripts fail)

### 1. Install Dependencies

**Backend:**
```bash
cd backend
pnpm install   # or: npm install
```

**Frontend:**
```bash
cd frontend
pnpm install   # or: npm install
```

### 2. Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name add-chat-and-notifications
```

### 3. Enable WebSocket (Frontend)

Edit `frontend/src/hooks/useChatSocket.ts`:
- Line 4: Uncomment `import { io, Socket } from 'socket.io-client';`
- Line 30+: Uncomment the main implementation block
- Bottom: Delete the temporary return statement with console.warn

### 4. Start Servers

**Backend (Terminal 1):**
```bash
cd backend
npm run start:dev
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

## New Packages Added

### Backend
- `@nestjs/websockets@^11.0.1`
- `@nestjs/platform-socket.io@^11.0.1`
- `socket.io@^4.7.2`

### Frontend
- `socket.io-client@^4.7.2`

## New Database Tables

- `channels` - Chat channels
- `chat_messages` - All messages
- `notifications` - User notifications

## Verification

### Check TypeScript Errors
Open these files and verify no red squiggles:
- `backend/src/chat/chat.service.ts`
- `backend/src/notifications/notifications.service.ts`

### Test WebSocket Connection
Open browser console at `http://localhost:3000`:
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { userId: 'test' }
});
socket.on('connect', () => console.log('✓ Connected!'));
```

## Troubleshooting

**"Cannot find module '@nestjs/websockets'"**
→ Delete `node_modules`, run `pnpm install` again

**"Property 'channel' does not exist"**
→ Run `npx prisma generate` and restart VS Code

**"Migration failed"**
→ Check PostgreSQL is running, verify `DATABASE_URL` in `.env`

**"pnpm not found"**
→ Use `npm` instead, or install: `npm install -g pnpm`

## Files Modified

✅ `backend/package.json` - Added WebSocket dependencies  
✅ `frontend/package.json` - Added socket.io-client  
✅ `backend/prisma/schema.prisma` - Added chat & notification models  

## Files Created

📁 `backend/src/chat/` - Complete chat module (8 files)  
📁 `backend/src/notifications/` - Complete notifications module (5 files)  
📁 `frontend/src/components/Chat/` - Chat UI components (5 files)  
📄 `frontend/src/hooks/useChatSocket.ts` - WebSocket hook  
📄 `SETUP.md` - Detailed setup guide  
📄 `setup.ps1` - Automated setup for Windows  
📄 `setup.sh` - Automated setup for Mac/Linux  

## What's Next?

After setup completion:
1. Test chat by creating channels and sending messages
2. Test notifications through backend API
3. Continue with **Todo #4**: Notification frontend components
4. Integrate notifications into existing services

## Need Help?

See `SETUP.md` for detailed instructions and troubleshooting.
