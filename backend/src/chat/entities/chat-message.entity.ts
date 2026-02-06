import { ChatMessage } from '@prisma/client';

export class ChatMessageEntity implements ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  isDeleted: boolean;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageWithUser extends ChatMessageEntity {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}
