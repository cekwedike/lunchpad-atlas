# Frontend Chat Setup Instructions

## 1. Install Socket.IO Client

The chat components require socket.io-client for real-time WebSocket communication:

```bash
cd frontend
npm install socket.io-client
# OR
pnpm add socket.io-client
```

## 2. Enable WebSocket in useChatSocket.ts

After installing socket.io-client, edit `frontend/src/hooks/useChatSocket.ts`:

1. **Uncomment the import** at the top:
   ```typescript
   import { io, Socket } from 'socket.io-client';
   ```

2. **Uncomment the main implementation** (large commented block starting with `useEffect`)

3. **Remove the temporary implementation** at the bottom (the return statement with console.warn messages)

## 3. Add ChatPanel to Your Layout

To make chat available across the app, add the ChatPanel to your main layout:

```typescript
// frontend/src/app/layout.tsx or dashboard layout
import { ChatPanel } from '@/components/Chat';

export default function DashboardLayout({ children }) {
  const user = useUser(); // Get current user from your auth context
  
  return (
    <div>
      {children}
      
      {/* Add chat panel */}
      {user.cohortId && (
        <ChatPanel
          cohortId={user.cohortId}
          userId={user.id}
          userRole={user.role}
        />
      )}
    </div>
  );
}
```

## 4. Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 5. Usage

The chat panel will appear as a floating button in the bottom-right corner of the screen. Users can:

- Click the button to open the chat panel
- View all available channels for their cohort
- Select a channel to view messages
- Send messages with Enter (Shift+Enter for new line)
- Delete their own messages
- Admins/Facilitators can flag and delete any message

## Features Implemented

✅ **Channel List**
- Displays channels grouped by type (General, Monthly Themes, Sessions)
- Shows channel names with # icon
- Click to enter a channel

✅ **Message List**
- Displays all messages in chronological order
- Shows sender name and timestamp
- Auto-scrolls to bottom on new messages
- Message actions menu (delete, flag) for moderators
- Shows "[Message deleted]" for deleted messages

✅ **Message Input**
- Textarea with auto-resize
- Send button (disabled when empty)
- Enter to send, Shift+Enter for new line
- Typing indicators (ready for WebSocket)

✅ **Real-time Support (Pending)**
- WebSocket connection ready
- Join/leave channel events
- New message broadcasts
- Message deletion notifications
- Typing indicators
- **Requires socket.io-client installation to activate**

## API Endpoints Used

- `GET /chat/channels/cohort/:cohortId` - Fetch channels
- `GET /chat/messages/:channelId` - Fetch messages
- `POST /chat/messages` - Send message
- `DELETE /chat/messages/:messageId` - Delete message
- `PATCH /chat/messages/:messageId/flag` - Flag message

## Next Steps

1. Install socket.io-client and enable WebSocket
2. Add JWT token authentication to WebSocket connection
3. Implement file/image upload in messages
4. Add emoji picker
5. Add message reactions (👍, ❤️, etc.)
6. Add user presence indicators (online/offline)
7. Add unread message counts per channel
8. Add push notifications for new messages
