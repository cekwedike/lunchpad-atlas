"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Pin, ThumbsUp, MessageCircle, ArrowLeft } from "lucide-react";
import { useDiscussion, useDiscussionComments, useCreateComment, useLikeDiscussion } from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const commentSchema = z.object({
  content: z.string().min(10, "Comment must be at least 10 characters"),
});

type CommentForm = z.infer<typeof commentSchema>;

export default function DiscussionThreadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const discussionId = params.id;

  const { data: profile } = useProfile();
  const { data: discussion, isLoading: discussionLoading, error: discussionError, refetch: refetchDiscussion } = useDiscussion(discussionId);
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useDiscussionComments(discussionId);
  const createCommentMutation = useCreateComment(discussionId);
  const likeMutation = useLikeDiscussion(discussionId);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
  });

  const onSubmit = async (data: CommentForm) => {
    try {
      await createCommentMutation.mutateAsync(data);
      reset();
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  };

  const handleLike = async () => {
    try {
      await likeMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to like discussion:", error);
    }
  };

  if (discussionError) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load discussion" onRetry={() => refetchDiscussion()} />
      </DashboardLayout>
    );
  }

  const isLoading = discussionLoading || commentsLoading;

  return (
    <DashboardLayout>
      {isLoading || !discussion ? (
        <Card className="animate-pulse">
          <div className="p-6">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </Card>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Button variant="ghost" asChild>
            <Link href="/discussions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discussions
            </Link>
          </Button>

          {/* Original Post */}
          <Card>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-atlas-navy text-white rounded-full flex items-center justify-center font-semibold">
                  {discussion.author?.name?.slice(0, 2).toUpperCase() || "??"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-bold">{discussion.author?.name || "Unknown"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {discussion.isPinned && (
                    <div className="flex items-center gap-1 text-orange-600 text-sm mb-2">
                      <Pin className="w-4 h-4" />
                      <span className="font-medium">Pinned by facilitator</span>
                    </div>
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-bold mb-4">{discussion.title}</h1>
              <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">{discussion.content}</p>

              <div className="flex items-center gap-6 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={handleLike} disabled={likeMutation.isPending}>
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {discussion.likeCount || 0} likes
                </Button>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{discussion.commentCount || 0} replies</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Comments Section */}
          {comments && comments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{comments.length} Replies</h2>
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-atlas-navy text-white rounded-full flex items-center justify-center font-semibold">
                        {comment.author?.name?.slice(0, 2).toUpperCase() || "??"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{comment.author?.name || "Unknown"}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Reply Form */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Add Your Reply</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <textarea
                    {...register("content")}
                    placeholder="Share your thoughts and experiences..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-y"
                  />
                  {errors.content && (
                    <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Earn 10 points for helpful replies!</p>
                  <Button type="submit" disabled={createCommentMutation.isPending}>
                    {createCommentMutation.isPending ? "Posting..." : "Post Reply"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
