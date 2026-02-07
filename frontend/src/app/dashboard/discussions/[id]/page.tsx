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
  Edit,
  MoreVertical,
} from "lucide-react";
import {
  useDiscussion,
  useDiscussionComments,
  useCreateComment,
  useLikeDiscussion,
  useTogglePin,
  useToggleLock,
} from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useDiscussionsSocket } from "@/hooks/useDiscussionsSocket";
import { formatToWAT, formatRelativeTimeWAT, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import { toast } from "sonner";
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
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data: discussion, refetch } = useDiscussion(discussionId);
  const { data: commentsData, refetch: refetchComments } = useDiscussionComments(discussionId);
  const createComment = useCreateComment(discussionId);
  const likeDiscussion = useLikeDiscussion(discussionId);
  const togglePin = useTogglePin();
  const toggleLock = useToggleLock();
  
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
    socket.on('discussion:user_typing', handleUserTyping);

    return () => {
      socket.off('discussion:updated', handleDiscussionUpdated);
      socket.off('discussion:new_comment', handleNewComment);
      socket.off('discussion:user_typing', handleUserTyping);
    };
  }, [socket, discussionId, profile?.id, refetch, refetchComments]);

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
      });
      setCommentText("");
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

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/discussions/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      toast.success("Comment deleted");
      refetchComments();
      refetch(); // Update comment count
    } catch (error: any) {
      toast.error("Failed to delete comment");
    }
  };

  const comments = commentsData || [];
  const isAdmin = profile?.role === "ADMIN";
  const isFacilitator = profile?.role === "FACILITATOR";
  const isOwner = discussion?.userId === profile?.id;
  const isLocked = discussion?.isLocked;
  const isLiked = discussion?.likes?.some((like: any) => like.userId === profile?.id);
  const canModerateDiscussion = isAdmin || isFacilitator;

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
                    {discussion.isPinned && (
                      <Pin className="h-5 w-5 text-amber-600" />
                    )}
                    {discussion.isLocked && (
                      <Lock className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
                {isAdmin && (
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <p className="text-gray-700 whitespace-pre-wrap">{discussion.content}</p>

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
                  <Badge className={`text-xs ${getRoleBadgeColor(discussion.user?.role)}`}>
                    {getRoleDisplayName(discussion.user?.role)}
                  </Badge>
                </div>
                <span>•</span>
                <span title={formatToWAT(discussion.createdAt)}>
                  {formatRelativeTimeWAT(discussion.createdAt)}
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
            {!isLocked ? (
              <div className="space-y-3">
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
                <p className="text-red-700 font-medium">This discussion is locked</p>
                <p className="text-red-600 text-sm">No new comments can be added</p>
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
                {comments.map((comment: any) => {
                  const isOwnComment = comment.userId === profile?.id;
                  const canDelete = isOwnComment || isAdmin;
                  
                  return (
                    <div
                      key={comment.id}
                      className="border-l-2 border-gray-200 pl-4 py-2 hover:bg-gray-50 rounded-r transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                          <div className="h-full w-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
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
                            <span className="text-sm text-gray-500" title={formatToWAT(comment.createdAt)}>
                              {formatRelativeTimeWAT(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 break-words">{comment.content}</p>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
