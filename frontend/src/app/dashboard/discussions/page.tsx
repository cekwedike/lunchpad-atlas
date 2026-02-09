"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Plus,
  Search,
  Pin,
  Lock,
  Heart,
  MessageCircle,
  TrendingUp,
  Filter,
  Users,
  ArrowRight,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApproveDiscussion, useDiscussions } from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useDiscussionsSocket } from "@/hooks/useDiscussionsSocket";
import { useAllChannels, useCohortChannels, useChannelMessages, useCreateChannel, useDeleteChannel } from "@/hooks/api/useChat";
import { useCohorts } from "@/hooks/api/useAdmin";
import { useResource } from "@/hooks/api/useResources";
import { formatLocalTimestamp, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import Link from "next/link";
import { toast } from "sonner";

export default function DiscussionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [chatRoomName, setChatRoomName] = useState("");
  const [deleteChatModal, setDeleteChatModal] = useState<{ id: string; name: string } | null>(null);
  const [showChatCreate, setShowChatCreate] = useState(false);

  const resourceId = searchParams.get('resourceId') || undefined;
  const { data: resource } = useResource(resourceId || "");
  
  const { data: discussionsData, refetch } = useDiscussions(profile?.cohortId ?? undefined, {
    pinned: filterPinned || undefined,
    resourceId,
  });
  const approveDiscussion = useApproveDiscussion();

  const { socket, isConnected } = useDiscussionsSocket();

  // Chat functionality
  const isAdmin = profile?.role === 'ADMIN';
  const isFacilitator = profile?.role === 'FACILITATOR';
  const canManageChats = isAdmin || isFacilitator;
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts(isAdmin);
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  const facilitatorCohorts = profile?.facilitatedCohorts || [];
  const availableChatCohorts = isAdmin
    ? cohorts
    : isFacilitator
      ? facilitatorCohorts
      : [];
  const chatCohortId = isAdmin
    ? undefined
    : (profile?.cohortId ?? selectedCohortId ?? undefined);
  const { data: cohortChannels } = useCohortChannels(chatCohortId);
  const { data: allChannels } = useAllChannels(isAdmin);
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const channels = isAdmin ? allChannels : cohortChannels;
  const mainChannel = channels?.[0];
  const { data: messages } = useChannelMessages(mainChannel?.id);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewDiscussion = (discussion: any) => {
      console.log('[Discussions] New discussion:', discussion);
      refetch();
    };

    const handleDiscussionUpdated = (discussion: any) => {
      console.log('[Discussions] Discussion updated:', discussion);
      refetch();
    };

    const handleNewComment = (data: any) => {
      console.log('[Discussions] New comment:', data);
      refetch();
    };

    const handleDiscussionDeleted = (data: any) => {
      console.log('[Discussions] Discussion deleted:', data);
      refetch();
    };

    socket.on('discussion:new', handleNewDiscussion);
    socket.on('discussion:updated', handleDiscussionUpdated);
    socket.on('discussion:new_comment', handleNewComment);
    socket.on('discussion:deleted', handleDiscussionDeleted);

    return () => {
      socket.off('discussion:new', handleNewDiscussion);
      socket.off('discussion:updated', handleDiscussionUpdated);
      socket.off('discussion:new_comment', handleNewComment);
      socket.off('discussion:deleted', handleDiscussionDeleted);
    };
  }, [socket, refetch]);

  const discussions = discussionsData?.data || [];
  const filteredDiscussions = discussions.filter((discussion: any) =>
    searchQuery
      ? discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        discussion.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const canCreateDiscussion = !!profile?.role;
  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;

  const handleStartChat = async () => {
    if (!selectedCohortId || !chatRoomName.trim()) return;

    try {
      const createdChannel = await createChannel.mutateAsync({
        cohortId: selectedCohortId,
        type: 'COHORT_WIDE',
        name: chatRoomName.trim(),
      });

      if (createdChannel?.id) {
        setChatRoomName("");
        setShowChatCreate(false);
        router.push(`/dashboard/chat?channelId=${createdChannel.id}`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to create chat room");
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteChannel.mutateAsync(channelId);
      toast.success("Chat room deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete chat room");
    }
  };

  useEffect(() => {
    if (!canManageChats || selectedCohortId) return;

    if (isAdmin && profile?.cohortId) {
      setSelectedCohortId(profile.cohortId);
      return;
    }

    if (isFacilitator && facilitatorCohorts.length === 1) {
      setSelectedCohortId(facilitatorCohorts[0].id);
      return;
    }
  }, [canManageChats, isAdmin, isFacilitator, facilitatorCohorts, profile?.cohortId, selectedCohortId]);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-5 h-full gap-4 p-6">
          {/* LEFT: Discussions Panel (60%) */}
          <div className="lg:col-span-3 flex flex-col space-y-4 overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-shrink-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                  Discussions
                </h1>
                {isConnected && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-600 font-medium">Live Updates</span>
                  </div>
                )}
              </div>
              {canCreateDiscussion && (
                <Button
                  onClick={() => router.push(resourceId ? `/dashboard/discussions/new?resourceId=${resourceId}` : '/dashboard/discussions/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start Discussion
                </Button>
              )}
            </div>

            {/* Search and Filter Bar */}
            <Card className="bg-white border-gray-200 shadow-sm flex-shrink-0">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search discussions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant={filterPinned ? "default" : "outline"}
                    onClick={() => setFilterPinned(!filterPinned)}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    {filterPinned ? "Show All" : "Pinned Only"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {resourceId && (
              <Card className="bg-blue-50 border-blue-200 shadow-sm flex-shrink-0">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm text-blue-700">Filtered by resource</div>
                    <div className="text-base font-semibold text-blue-900">
                      {resource?.title || "Resource discussion"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/resources/${resourceId}`)}
                    >
                      View Resource
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/discussions')}
                    >
                      Clear Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Discussions</p>
                      <p className="text-2xl font-bold text-gray-900">{discussions.length}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Your Posts</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {discussions.filter((d: any) => d.userId === profile?.id).length}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Comments</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {discussions.reduce((sum: number, d: any) => sum + (d._count?.comments || 0), 0)}
                      </p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Discussions List */}
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {filteredDiscussions.length === 0 ? (
                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="py-12">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {searchQuery ? "No discussions found" : "No discussions yet"}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {searchQuery
                            ? "Try a different search term"
                            : "Be the first to start a discussion!"}
                        </p>
                        {!searchQuery && canCreateDiscussion && (
                          <Button
                            onClick={() => router.push(resourceId ? `/dashboard/discussions/new?resourceId=${resourceId}` : '/dashboard/discussions/new')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Start Discussion
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  filteredDiscussions.map((discussion: any) => {
                    const topicLabel = discussion.resource?.title
                      ? `Resource: ${discussion.resource.title}`
                      : discussion.session?.title
                        ? `Session ${discussion.session.sessionNumber}: ${discussion.session.title}`
                        : 'General';

                    const isPendingApproval = discussion.isApproved === false;

                    return (
                    <Link key={discussion.id} href={`/dashboard/discussions/${discussion.id}`}>
                      <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                  {discussion.title}
                                </h3>
                                {discussion.isPinned && (
                                  <Pin className="h-4 w-4 text-amber-600" />
                                )}
                                {discussion.isLocked && (
                                  <Lock className="h-4 w-4 text-red-600" />
                                )}
                                {isPendingApproval && (
                                  <Badge className="text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending approval
                                  </Badge>
                                )}
                                <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                  {topicLabel}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                {discussion.content}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-700">
                                    {discussion.user?.firstName}
                                  </span>
                                  <Badge className={`text-xs ${getRoleBadgeColor(discussion.user?.role)}`}>
                                    {getRoleDisplayName(discussion.user?.role)}
                                  </Badge>
                                </div>
                                {isPendingApproval && (isAdmin || isFacilitator) && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      approveDiscussion.mutateAsync(discussion.id).catch(() => {
                                        toast.error("Failed to approve discussion");
                                      });
                                    }}
                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                                  >
                                    Approve
                                  </button>
                                )}
                                <span>•</span>
                                <span>
                                  {formatLocalTimestamp(discussion.createdAt)}
                                </span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-4 w-4" />
                                  <span>{discussion._count?.comments || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-4 w-4" />
                                  <span>{discussion._count?.likes || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Chat Panel (40%) */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center justify-between">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                  <span>Chats</span>
                </CardTitle>
                {canManageChats && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowChatCreate((prev) => !prev)}
                    className="mt-2 w-full"
                  >
                    {showChatCreate ? "Hide chat form" : "Create chat room"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4">
                {channels && channels.length > 0 ? (
                  <div className="space-y-3">
                    {channels.map((channel) => {
                      const channelTitle = channel.name || channel.cohort?.name || 'Chat Room';
                      const isActive = channel.id === mainChannel?.id;
                      return (
                        <Link
                          key={channel.id}
                          href={`/dashboard/chat?channelId=${channel.id}`}
                          className="block"
                        >
                          <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${isActive ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm text-gray-500">Chat Room</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {channelTitle}
                                </div>
                                {channel.isLocked && (
                                  <Badge className="mt-1 bg-amber-100 text-amber-700 border border-amber-200">
                                    Locked
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <Users className="h-4 w-4" />
                                {canManageChats && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      setDeleteChatModal({ id: channel.id, name: channelTitle });
                                    }}
                                    className="ml-2 text-xs text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-sm text-gray-600 truncate max-w-[70%]">
                                {isActive && lastMessage ? lastMessage.content : "Open to view messages"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {isActive && lastMessage ? formatLocalTimestamp(lastMessage.createdAt) : ""}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-medium">
                              Open chat room
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No chat room yet</p>
                    {!canManageChats && (
                      <p className="text-sm mt-2">Ask an admin to create a cohort</p>
                    )}
                  </div>
                )}
                {canManageChats && showChatCreate && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <p className="text-sm text-gray-600">Create a cohort chat room</p>
                    <div className="text-left">
                      <label htmlFor="cohort-chat-select" className="text-xs font-medium text-gray-700">
                        Cohort
                      </label>
                      <select
                        id="cohort-chat-select"
                        className="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                        value={selectedCohortId}
                        onChange={(e) => setSelectedCohortId(e.target.value)}
                        disabled={cohortsLoading && isAdmin}
                      >
                        <option value="">-- Select a cohort --</option>
                        {availableChatCohorts.map((cohort: any) => (
                          <option key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-left">
                      <label htmlFor="chat-room-name" className="text-xs font-medium text-gray-700">
                        Chat room name
                      </label>
                      <Input
                        id="chat-room-name"
                        value={chatRoomName}
                        onChange={(event) => setChatRoomName(event.target.value)}
                        placeholder="e.g., General, Help Desk"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={handleStartChat}
                      disabled={!selectedCohortId || !chatRoomName.trim() || createChannel.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {createChannel.isPending ? "Creating..." : "Start Chat"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {deleteChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Delete chat room</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete "{deleteChatModal.name}"? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteChatModal(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  await handleDeleteChannel(deleteChatModal.id);
                  setDeleteChatModal(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
