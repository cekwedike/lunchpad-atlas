"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pin,
  Lock,
  Heart,
  MessageCircle,
  Send,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  useDiscussion,
  useDiscussionComments,
  useCreateComment,
  useReactToComment,
  useToggleCommentPin,
  useLikeDiscussion,
  useTogglePin,
  useToggleLock,
  useScoreDiscussionQuality,
  useScoreCommentQuality,
  useToggleDiscussionQualityVisibility,
  useToggleCommentQualityVisibility,
  useApproveDiscussion,
} from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useDiscussionsSocket } from "@/hooks/useDiscussionsSocket";
import { formatLocalTimestamp, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import { toast } from "sonner";
import type { CommentReactionType } from "@/types/api";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DiscussionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const discussionId = params.id as string;
  const { data: profile } = useProfile();
  
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author?: string } | null>(null);
  const [deleteDiscussionModalOpen, setDeleteDiscussionModalOpen] = useState(false);
  const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; content?: string } | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  
  const { data: discussion, refetch } = useDiscussion(discussionId);
  const { data: commentsData, refetch: refetchComments } = useDiscussionComments(discussionId);
  const createComment = useCreateComment(discussionId);
  const reactToComment = useReactToComment();
  const toggleCommentPin = useToggleCommentPin();
  const likeDiscussion = useLikeDiscussion(discussionId);
  const togglePin = useTogglePin();
  const toggleLock = useToggleLock();
  const scoreDiscussionQuality = useScoreDiscussionQuality(discussionId);
  const toggleDiscussionQualityVisibility = useToggleDiscussionQualityVisibility(discussionId);
  const scoreCommentQuality = useScoreCommentQuality(discussionId);
  const toggleCommentQualityVisibility = useToggleCommentQualityVisibility(discussionId);
  const approveDiscussion = useApproveDiscussion();
  
  const { socket, isConnected, subscribeToDiscussion, unsubscribeFromDiscussion, emitTyping } = useDiscussionsSocket();

  // Subscribe to this discussion
  useEffect(() => {
    if (isConnected && discussionId) {
      subscribeToDiscussion(discussionId);
      return () => {
        unsubscribeFromDiscussion(discussionId);
      };
    }
  }, [isConnected, discussionId, subscribeToDiscussion, unsubscribeFromDiscussion]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleDiscussionUpdated = (updated: any) => {
      if (updated.id === discussionId) {
        refetch();
      }
    };

    const handleNewComment = (data: any) => {
      if (data.discussionId === discussionId) {
        refetchComments();
        refetch(); // Update comment count
      }
    };

    const handleCommentDeleted = (data: any) => {
      if (data.discussionId !== discussionId) return;

      queryClient.setQueryData(['discussion-comments', discussionId], (current: any) => {
        if (!Array.isArray(current)) return current;
        return current.filter(
          (comment: any) => comment.id !== data.commentId && comment.parentId !== data.commentId,
        );
      });
      refetch();
    };

    const handleCommentUpdated = (data: any) => {
      if (data.discussionId !== discussionId) return;
      refetchComments();
      refetch();
    };

    const handleCommentReacted = (data: any) => {
      if (data.discussionId !== discussionId) return;
      refetchComments();
    };

    const handleDiscussionLiked = (data: any) => {
      if (data.discussionId !== discussionId) return;
      refetch();
    };

    const handleUserTyping = (data: any) => {
      if (data.discussionId === discussionId && data.userId !== profile?.id) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    };

    socket.on('discussion:updated', handleDiscussionUpdated);
    socket.on('discussion:new_comment', handleNewComment);
    socket.on('discussion:comment_deleted', handleCommentDeleted);
    socket.on('discussion:comment_updated', handleCommentUpdated);
    socket.on('discussion:comment_reacted', handleCommentReacted);
    socket.on('discussion:liked', handleDiscussionLiked);
    socket.on('discussion:user_typing', handleUserTyping);

    return () => {
      socket.off('discussion:updated', handleDiscussionUpdated);
      socket.off('discussion:new_comment', handleNewComment);
      socket.off('discussion:comment_deleted', handleCommentDeleted);
      socket.off('discussion:comment_updated', handleCommentUpdated);
      socket.off('discussion:comment_reacted', handleCommentReacted);
      socket.off('discussion:liked', handleDiscussionLiked);
      socket.off('discussion:user_typing', handleUserTyping);
    };
  }, [socket, discussionId, profile?.id, queryClient, refetch, refetchComments]);

  // Handle typing indicator
  const handleTyping = () => {
    emitTyping(discussionId, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(discussionId, false);
    }, 2000);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      const result = await createComment.mutateAsync({
        content: commentText,
        parentId: replyTo?.id,
      });
      setCommentText("");
      setReplyTo(null);
      emitTyping(discussionId, false);
      // Manually refetch to ensure fresh data
      await refetchComments();
      await refetch();
      toast.success("Comment posted successfully!");
    } catch (error: any) {
      console.error('Comment error:', error);
      toast.error(error.response?.data?.message || error.message || "Failed to post comment");
    }
  };

  const handleLike = async () => {
    try {
      await likeDiscussion.mutateAsync();
    } catch (error) {
      toast.error("Failed to like discussion");
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePin.mutateAsync(discussionId);
      toast.success(discussion?.isPinned ? "Discussion unpinned" : "Discussion pinned");
    } catch (error) {
      toast.error("Failed to update pin status");
    }
  };

  const handleToggleLock = async () => {
    try {
      await toggleLock.mutateAsync(discussionId);
      toast.success(discussion?.isLocked ? "Discussion unlocked" : "Discussion locked");
    } catch (error) {
      toast.error("Failed to update lock status");
    }
  };

  const handleScoreQuality = async () => {
    try {
      await scoreDiscussionQuality.mutateAsync();
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to score discussion");
    }
  };

  const handleToggleQualityVisibility = async () => {
    try {
      await toggleDiscussionQualityVisibility.mutateAsync();
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update quality visibility");
    }
  };

  const handleApproveDiscussion = async () => {
    try {
      await approveDiscussion.mutateAsync(discussionId);
      await refetch();
      toast.success("Discussion approved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve discussion");
    }
  };

  const handleScoreCommentQuality = async (commentId: string) => {
    try {
      await scoreCommentQuality.mutateAsync(commentId);
    } catch (error: any) {
      toast.error(error?.message || "Failed to score comment");
    }
  };

  const handleToggleCommentQualityVisibility = async (commentId: string) => {
    try {
      await toggleCommentQualityVisibility.mutateAsync(commentId);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update comment visibility");
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      setIsDeletingComment(true);
      await apiClient.delete(`/discussions/comments/${commentToDelete.id}`);

      queryClient.setQueryData(['discussion-comments', discussionId], (current: any) => {
        if (!Array.isArray(current)) return current;
        return current.filter(
          (comment: any) => comment.id !== commentToDelete.id && comment.parentId !== commentToDelete.id,
        );
      });

      toast.success("Comment deleted");
      setDeleteCommentModalOpen(false);
      setCommentToDelete(null);
      refetchComments();
      refetch();
    } catch (error: any) {
      toast.error("Failed to delete comment");
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleReactToComment = async (commentId: string, type: CommentReactionType) => {
    try {
      await reactToComment.mutateAsync({ commentId, type });
    } catch (error) {
      toast.error("Failed to react to comment");
    }
  };

  const handleToggleCommentPin = async (commentId: string) => {
    try {
      await toggleCommentPin.mutateAsync(commentId);
    } catch (error) {
      toast.error("Failed to pin comment");
    }
  };

  const handleDeleteDiscussion = async () => {
    try {
      await apiClient.delete(`/discussions/${discussionId}`);

      toast.success("Discussion deleted");
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      router.push('/dashboard/discussions');
    } catch (error: any) {
      toast.error("Failed to delete discussion");
    }
  };

  const comments = Array.isArray(commentsData) ? commentsData : [];
  const isAdmin = profile?.role === "ADMIN";
  const isFacilitator = profile?.role === "FACILITATOR";
  const isOwner = discussion?.userId === profile?.id;
  const isLocked = discussion?.isLocked;
  const isLiked = discussion?.likes?.some((like: any) => like.userId === profile?.id);
  const canModerateDiscussion = isAdmin || isFacilitator;
  const isFellowDiscussion = discussion?.user?.role === "FELLOW";
  const canScoreQuality = canModerateDiscussion && discussion?.isApproved && isFellowDiscussion;
  const canApproveDiscussion = canModerateDiscussion && discussion?.isApproved === false;
  const canViewDiscussionQuality = canModerateDiscussion || discussion?.isQualityVisible;
  const qualityAnalysis = (discussion?.qualityAnalysis || {}) as any;
  const reactionOptions: Array<{ type: CommentReactionType; label: string; emoji: string }> = [
    { type: 'LIKE', label: 'Like', emoji: '👍' },
    { type: 'CELEBRATE', label: 'Celebrate', emoji: '🎉' },
    { type: 'SUPPORT', label: 'Support', emoji: '🤝' },
    { type: 'INSIGHTFUL', label: 'Insightful', emoji: '💡' },
    { type: 'LOVE', label: 'Love', emoji: '❤️' },
  ];

  const commentsByParent = comments.reduce<Record<string, any[]>>((acc, comment: any) => {
    const key = comment.parentId || 'root';
    if (!acc[key]) acc[key] = [];
    acc[key].push(comment);
    return acc;
  }, {});

  const renderComment = (comment: any, depth: number = 0) => {
    const isOwnComment = comment.userId === profile?.id;
    const canDelete = isOwnComment || canModerateDiscussion;
    const isEligibleCommentScore =
      comment.user?.role === "FELLOW" &&
      (discussion?.user?.role === "ADMIN" || discussion?.user?.role === "FACILITATOR") &&
      discussion?.isApproved;
    const showCommentQuality =
      canModerateDiscussion ||
      (comment.isQualityVisible && comment.qualityScore !== null && comment.qualityScore !== undefined);
    const reactionCounts = comment.reactionCounts || {};
    const userReactions = new Set(comment.userReactions || []);
    const replies = commentsByParent[comment.id] || [];
    const isReply = depth > 0;

    return (
      <div key={comment.id} className={isReply ? "mt-3 border-l border-gray-200 pl-4" : "border-l-2 border-gray-200 pl-4 py-2 hover:bg-gray-50 rounded-r transition-colors"}>
        <div className="flex items-start gap-3">
          <Avatar className={isReply ? "h-7 w-7 mt-1 flex-shrink-0" : "h-8 w-8 mt-1 flex-shrink-0"}>
            <div className={`${isReply ? 'bg-indigo-600 text-xs' : 'bg-purple-600 text-sm'} h-full w-full flex items-center justify-center text-white font-medium`}>
              {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
            </div>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-gray-900">
                {comment.user?.firstName}
              </span>
              <Badge className={`text-xs ${getRoleBadgeColor(comment.user?.role)}`}>
                {getRoleDisplayName(comment.user?.role)}
              </Badge>
              {comment.isPinned && (
                <Badge className="text-xs bg-amber-50 text-amber-700 border border-amber-200">
                  Pinned
                </Badge>
              )}
              <span className="text-sm text-gray-500">
                {formatLocalTimestamp(comment.createdAt)}
              </span>
            </div>
            <p className="text-gray-700 break-words">{comment.content}</p>

            {showCommentQuality && (
              <div className="mt-2 space-y-2 text-xs text-gray-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-700">Quality</span>
                  <span className="font-semibold text-gray-900">
                    {comment.qualityScore ?? "--"}
                  </span>
                  {comment.qualityAnalysis?.badge && (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                      {comment.qualityAnalysis.badge}
                    </Badge>
                  )}
                  {canModerateDiscussion && isEligibleCommentScore && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleScoreCommentQuality(comment.id)}
                        className="text-xs text-slate-600 hover:text-slate-800"
                      >
                        {comment.qualityScore ? "Rescore" : "Score"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCommentQualityVisibility(comment.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        {comment.isQualityVisible ? "Hide score" : "Share score"}
                      </button>
                    </>
                  )}
                </div>

                {(comment.qualityAnalysis?.depth || comment.qualityAnalysis?.relevance || comment.qualityAnalysis?.constructiveness) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-md bg-white border p-2">
                      <div className="text-[10px] text-gray-500">Depth</div>
                      <div className="font-semibold text-gray-900">{comment.qualityAnalysis.depth ?? "--"}/10</div>
                    </div>
                    <div className="rounded-md bg-white border p-2">
                      <div className="text-[10px] text-gray-500">Relevance</div>
                      <div className="font-semibold text-gray-900">{comment.qualityAnalysis.relevance ?? "--"}/10</div>
                    </div>
                    <div className="rounded-md bg-white border p-2">
                      <div className="text-[10px] text-gray-500">Constructiveness</div>
                      <div className="font-semibold text-gray-900">{comment.qualityAnalysis.constructiveness ?? "--"}/10</div>
                    </div>
                  </div>
                )}

                {Array.isArray(comment.qualityAnalysis?.insights) && comment.qualityAnalysis.insights.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-900">Insights</div>
                    <ul className="list-disc pl-5 text-gray-700">
                      {comment.qualityAnalysis.insights.map((insight: string, index: number) => (
                        <li key={`comment-insight-${comment.id}-${index}`}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(comment.qualityAnalysis?.suggestions) && comment.qualityAnalysis.suggestions.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-900">Suggestions</div>
                    <ul className="list-disc pl-5 text-gray-700">
                      {comment.qualityAnalysis.suggestions.map((suggestion: string, index: number) => (
                        <li key={`comment-suggestion-${comment.id}-${index}`}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {reactionOptions.map((reaction) => (
                <button
                  key={`${comment.id}-${reaction.type}`}
                  type="button"
                  onClick={() => handleReactToComment(comment.id, reaction.type)}
                  className={`rounded-full border px-2 py-1 text-xs transition ${
                    userReactions.has(reaction.type)
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1">{reaction.emoji}</span>
                  {reactionCounts[reaction.type] || 0}
                </button>
              ))}
              {replies.length > 0 && (
                <span className="text-xs text-gray-500">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setReplyTo({ id: comment.id, author: comment.user?.firstName })}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Reply
              </button>
              {canModerateDiscussion && (
                <button
                  type="button"
                  onClick={() => handleToggleCommentPin(comment.id)}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  {comment.isPinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    setCommentToDelete({ id: comment.id, content: comment.content });
                    setDeleteCommentModalOpen(true);
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>

            {replies.length > 0 && (
              <div className="mt-4">
                {replies
                  .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!discussion) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/discussions')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Discussions
          </Button>
          {isConnected && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>

        {discussion.isApproved === false && (
          <Card className="bg-amber-50 border border-amber-200">
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-900">Pending approval</div>
                <div className="text-sm text-amber-700">
                  {canApproveDiscussion
                    ? "Approve this discussion to publish it to the cohort."
                    : "This discussion will be visible once a facilitator approves it."}
                </div>
              </div>
              {canApproveDiscussion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApproveDiscussion}
                  disabled={approveDiscussion.isPending}
                >
                  Approve discussion
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Discussion Card */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {discussion.title}
                    </h1>
                    {discussion.isApproved === false && (
                      <Badge className="text-xs bg-amber-50 text-amber-700 border border-amber-200">
                        Pending approval
                      </Badge>
                    )}
                    {discussion.isPinned && (
                      <Pin className="h-5 w-5 text-amber-600" />
                    )}
                    {discussion.isLocked && (
                      <Lock className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
                {canModerateDiscussion && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleTogglePin}>
                        <Pin className="h-4 w-4 mr-2" />
                        {discussion.isPinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleToggleLock}>
                        <Lock className="h-4 w-4 mr-2" />
                        {discussion.isLocked ? "Unlock" : "Lock"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteDiscussionModalOpen(true)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete discussion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <p className="text-gray-700 whitespace-pre-wrap">{discussion.content}</p>

              {canViewDiscussionQuality && (
                <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Quality Score</div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-900">
                          {discussion.qualityScore ?? "--"}
                        </span>
                        {qualityAnalysis?.badge && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                            {qualityAnalysis.badge}
                          </Badge>
                        )}
                      </div>
                      {discussion.scoredAt ? (
                        <div className="text-xs text-gray-500">
                          Scored {formatLocalTimestamp(discussion.scoredAt)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Not scored yet</div>
                      )}
                    </div>
                    {(canScoreQuality || canApproveDiscussion) && (
                      <div className="flex flex-col gap-2">
                        {canScoreQuality && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleScoreQuality}
                            disabled={scoreDiscussionQuality.isPending}
                            className="shrink-0"
                          >
                            {discussion.qualityScore ? "Rescore" : "Score now"}
                          </Button>
                        )}
                        {canScoreQuality && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleQualityVisibility}
                            disabled={toggleDiscussionQualityVisibility.isPending}
                            className="shrink-0"
                          >
                            {discussion.isQualityVisible ? "Hide score" : "Share score"}
                          </Button>
                        )}
                        {canApproveDiscussion && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApproveDiscussion}
                            disabled={approveDiscussion.isPending}
                            className="shrink-0"
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {(qualityAnalysis?.depth || qualityAnalysis?.relevance || qualityAnalysis?.constructiveness) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-md bg-white border p-3">
                        <div className="text-xs text-gray-500">Depth</div>
                        <div className="font-semibold text-gray-900">{qualityAnalysis.depth ?? "--"}/10</div>
                      </div>
                      <div className="rounded-md bg-white border p-3">
                        <div className="text-xs text-gray-500">Relevance</div>
                        <div className="font-semibold text-gray-900">{qualityAnalysis.relevance ?? "--"}/10</div>
                      </div>
                      <div className="rounded-md bg-white border p-3">
                        <div className="text-xs text-gray-500">Constructiveness</div>
                        <div className="font-semibold text-gray-900">{qualityAnalysis.constructiveness ?? "--"}/10</div>
                      </div>
                    </div>
                  )}

                  {Array.isArray(qualityAnalysis?.insights) && qualityAnalysis.insights.length > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900 mb-1">Insights</div>
                      <ul className="list-disc pl-5 text-gray-700">
                        {qualityAnalysis.insights.map((insight: string, index: number) => (
                          <li key={`insight-${index}`}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(qualityAnalysis?.suggestions) && qualityAnalysis.suggestions.length > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900 mb-1">Suggestions</div>
                      <ul className="list-disc pl-5 text-gray-700">
                        {qualityAnalysis.suggestions.map((suggestion: string, index: number) => (
                          <li key={`suggestion-${index}`}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <div className="h-full w-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                      {discussion.user?.firstName?.[0]}{discussion.user?.lastName?.[0]}
                    </div>
                  </Avatar>
                  <span className="font-medium text-gray-700">
                    {discussion.user?.firstName}
                  </span>
                  {discussion.user?.role && (
                    <Badge className={`text-xs ${getRoleBadgeColor(discussion.user.role)}`}>
                      {getRoleDisplayName(discussion.user.role)}
                    </Badge>
                  )}
                </div>
                <span>•</span>
                <span>
                  {formatLocalTimestamp(discussion.createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={handleLike}
                  className="gap-2"
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {discussion._count?.likes || 0}
                </Button>
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageCircle className="h-4 w-4" />
                  <span>{discussion._count?.comments || 0} comments</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="bg-white">
          <CardContent className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Comments</h2>

            {/* Comment Input */}
            {!isLocked && discussion?.isApproved ? (
              <div className="space-y-3">
                {replyTo && (
                  <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    <span>Replying to {replyTo.author || 'comment'}</span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <Textarea
                  placeholder="Share your thoughts..."
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    handleTyping();
                  }}
                  rows={3}
                  className="resize-none"
                />
                {typingUsers.size > 0 && (
                  <p className="text-sm text-gray-500 italic">
                    Someone is typing...
                  </p>
                )}
                <Button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || createComment.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Post Comment
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <Lock className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <p className="text-red-700 font-medium">
                  {discussion?.isApproved === false
                    ? "This discussion is pending approval"
                    : "This discussion is locked"}
                </p>
                <p className="text-red-600 text-sm">
                  {discussion?.isApproved === false
                    ? "Comments are disabled until approval"
                    : "No new comments can be added"}
                </p>
              </div>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {((commentsByParent.root && commentsByParent.root.length > 0)
                  ? commentsByParent.root
                  : comments)
                  .sort((a: any, b: any) => {
                    if (a.isPinned === b.isPinned) {
                      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    }
                    return a.isPinned ? -1 : 1;
                  })
                  .map((comment: any) => renderComment(comment))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {deleteDiscussionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Delete discussion</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this discussion? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDiscussionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  await handleDeleteDiscussion();
                  setDeleteDiscussionModalOpen(false);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {deleteCommentModalOpen && commentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Delete comment</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this comment? This cannot be undone.
            </p>
            {commentToDelete.content && (
              <p className="mt-3 text-sm text-gray-500 line-clamp-3">
                “{commentToDelete.content}”
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteCommentModalOpen(false);
                  setCommentToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteComment}
                disabled={isDeletingComment}
              >
                {isDeletingComment ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
