'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, ThumbsUp, MessageCircle, Plus } from 'lucide-react';
import { useDiscussions, useCreateDiscussion, useLikeDiscussion } from '@/hooks/api/useDiscussions';
import { useProfile } from '@/hooks/api/useProfile';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const discussionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
});

type DiscussionForm = z.infer<typeof discussionSchema>;

interface ResourceDiscussionsProps {
  resourceId: string;
  resourceTitle: string;
}

export function ResourceDiscussions({ resourceId, resourceTitle }: ResourceDiscussionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: profile } = useProfile();
  
  const { data: discussionsData, refetch } = useDiscussions(undefined, {
    resourceId,
  });
  
  const createMutation = useCreateDiscussion();
  const likeMutation = useLikeDiscussion();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DiscussionForm>({
    resolver: zodResolver(discussionSchema),
  });

  const onSubmit = async (data: DiscussionForm) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        resourceId,
      });
      setIsDialogOpen(false);
      reset();
      refetch();
    } catch (error) {
      console.error('Failed to create discussion:', error);
    }
  };

  const handleLike = async (discussionId: string) => {
    try {
      await likeMutation.mutateAsync(discussionId);
      refetch();
    } catch (error) {
      console.error('Failed to like discussion:', error);
    }
  };

  const discussions = discussionsData?.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <CardTitle>Discussions about this resource</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Start Discussion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a Discussion</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  About: {resourceTitle}
                </p>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input {...register('title')} placeholder="What would you like to discuss?" />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content</label>
                  <Textarea
                    {...register('content')}
                    placeholder="Share your thoughts, questions, or insights..."
                    rows={5}
                  />
                  {errors.content && (
                    <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Post Discussion'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {discussions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No discussions yet</p>
            <p className="text-sm">Be the first to start a conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {discussions.map((discussion: any) => (
              <Link
                key={discussion.id}
                href={`/discussions/${discussion.id}`}
                className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold hover:text-primary">{discussion.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {discussion.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        by {discussion.author?.firstName} {discussion.author?.lastName}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleLike(discussion.id);
                      }}
                      className="flex items-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-sm">{discussion.likes?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">{discussion.comments?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {discussions.length >= 5 && (
              <div className="text-center pt-2">
                <Link href={`/discussions?resourceId=${resourceId}`}>
                  <Button variant="link">View all discussions →</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
