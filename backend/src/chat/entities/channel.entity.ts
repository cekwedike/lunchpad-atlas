import { Channel, ChannelType } from '@prisma/client';

export class ChannelEntity implements Channel {
  id: string;
  cohortId: string;
  type: ChannelType;
  name: string;
  description: string | null;
  sessionId: string | null;
  isLocked: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
