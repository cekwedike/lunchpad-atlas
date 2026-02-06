import { Channel, ChannelType } from '@prisma/client';

export class ChannelEntity implements Channel {
  id: string;
  cohortId: string;
  type: ChannelType;
  name: string;
  description: string | null;
  sessionId: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
