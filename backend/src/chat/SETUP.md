# Chat Module Setup Instructions

## 1. Install Required Dependencies

The chat module requires WebSocket support. Run this command in the `backend/` directory:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
# OR if using pnpm:
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## 2. Regenerate Prisma Client

After adding the chat tables to schema.prisma, regenerate the Prisma client:

```bash
cd backend
npx prisma generate
```

## 3. Run Database Migrations

Apply the new schema changes to your database:

```bash
npx prisma migrate dev --name add-chat-system
```

## 4. Initialize Cohort Channels

For existing cohorts, you'll need to initialize default channels. You can do this via the API:

```bash
POST http://localhost:3000/chat/channels/initialize/:cohortId
Authorization: Bearer <admin-token>
```

Or run a script to initialize all cohorts:

```typescript
// In prisma/seed.ts or a separate script
const cohorts = await prisma.cohort.findMany();
for (const cohort of cohorts) {
  await chatService.initializeCohortChannels(cohort.id);
}
```

## 5. Environment Variables

Add these to your `.env` file if needed:

```env
FRONTEND_URL=http://localhost:5173
```

## 6. Testing WebSocket Connection

You can test the WebSocket connection using a tool like Socket.IO client or Postman.

Example client code:
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: {
    userId: 'your-user-id',
    // token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected');
  
  // Join a channel
  socket.emit('join_channel', { channelId: 'channel-id' });
  
  // Send a message
  socket.emit('send_message', {
    channelId: 'channel-id',
    content: 'Hello world!'
  });
});

socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

## API Endpoints

### REST API
- `POST /chat/channels` - Create a new channel (Admin/Facilitator only)
- `GET /chat/channels/cohort/:cohortId` - Get all channels for a cohort
- `GET /chat/channels/:channelId` - Get channel details
- `PATCH /chat/channels/:channelId/archive` - Archive a channel (Admin/Facilitator only)
- `POST /chat/messages` - Send a message
- `GET /chat/messages/:channelId` - Get messages for a channel
- `DELETE /chat/messages/:messageId` - Delete a message
- `PATCH /chat/messages/:messageId/flag` - Flag a message (Admin/Facilitator only)
- `POST /chat/channels/initialize/:cohortId` - Initialize default channels (Admin only)

### WebSocket Events
- `join_channel` - Join a channel room
- `leave_channel` - Leave a channel room
- `send_message` - Send a message
- `delete_message` - Delete a message
- `typing_start` - Broadcast typing indicator
- `typing_stop` - Stop typing indicator
- `new_message` - Receive new messages
- `message_deleted` - Notification when message is deleted
- `user_typing` - Another user is typing
- `user_stopped_typing` - User stopped typing

## Next Steps

After setup is complete, you'll need to:
1. Implement the frontend chat components (Todo #2)
2. Add proper JWT authentication to the WebSocket gateway
3. Set up Redis for session management (optional, for production)
4. Implement rate limiting for messages
5. Add file upload support for images/files in chat (future)
