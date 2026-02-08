import { z } from 'zod';

export const discussionSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must be less than 5000 characters'),
  cohortId: z.string().optional(),
  topicType: z.enum(['GENERAL', 'SESSION', 'RESOURCE']).optional(),
  sessionId: z.string().optional(),
  resourceId: z.string().optional(),
});

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment is required')
    .min(2, 'Comment must be at least 2 characters')
    .max(2000, 'Comment must be less than 2000 characters'),
  parentId: z.string().optional(),
});

export type DiscussionInput = z.infer<typeof discussionSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
