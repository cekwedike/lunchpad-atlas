export interface Channel {
  id: string;
  cohortId: string;
  type: 'COHORT_WIDE' | 'MONTHLY_THEME' | 'SESSION_SPECIFIC' | 'DIRECT_MESSAGE';
  name: string;
  description?: string;
  sessionId?: string;
  isArchived: boolean;
  isLocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
  cohort?: {
    id: string;
    name: string;
  };
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  parentMessageId?: string | null;
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

  parentMessage?: {
    id: string;
    channelId: string;
    content: string;
    createdAt: Date;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    };
  } | null;

  reactions?: Array<{
    emoji: string;
    count: number;
    reactedByMe: boolean;
  }>;

  mentionUserIds?: string[];
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
  parentMessageId?: string;
  content: string;
}

export interface ChatMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}
