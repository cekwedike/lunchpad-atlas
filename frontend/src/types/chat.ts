export interface Channel {
  id: string;
  cohortId: string;
  type: 'COHORT_WIDE' | 'MONTHLY_THEME' | 'SESSION_SPECIFIC' | 'DIRECT_MESSAGE';
  name: string;
  description?: string;
  sessionId?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  isDeleted: boolean;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface CreateChannelDto {
  cohortId: string;
  type: Channel['type'];
  name: string;
  description?: string;
  sessionId?: string;
}

export interface SendMessageDto {
  channelId: string;
  content: string;
}
