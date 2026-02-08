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
import { useDiscussions } from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useDiscussionsSocket } from "@/hooks/useDiscussionsSocket";
import { useAllChannels, useCohortChannels, useChannelMessages, useInitializeCohortChannels } from "@/hooks/api/useChat";
import { useCohorts } from "@/hooks/api/useAdmin";
import { useResource } from "@/hooks/api/useResources";
import { formatRelativeTimeWAT, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import Link from "next/link";
import { toast } from "sonner";

export default function DiscussionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  const resourceId = searchParams.get('resourceId') || undefined;
  const { data: resource } = useResource(resourceId || "");
  
  const { data: discussionsData, refetch } = useDiscussions(profile?.cohortId ?? undefined, {
    pinned: filterPinned || undefined,
    resourceId,
  });

  const { socket, isConnected } = useDiscussionsSocket();

  // Chat functionality
  const isAdmin = profile?.role === 'ADMIN';
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts(isAdmin);
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  const { data: cohortChannels } = useCohortChannels(profile?.cohortId ?? undefined);
  const { data: allChannels } = useAllChannels(isAdmin);
  const initializeCohortChannels = useInitializeCohortChannels();
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

  const canCreateDiscussion = profile?.role === 'ADMIN' || profile?.role === 'FACILITATOR';
  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;

  const handleStartChat = async () => {
    if (!selectedCohortId) return;

    try {
      const createdChannels = await initializeCohortChannels.mutateAsync(selectedCohortId);
      const firstChannel = Array.isArray(createdChannels) ? createdChannels[0] : null;

      if (firstChannel?.id) {
        router.push(`/dashboard/chat?channelId=${firstChannel.id}`);
      } else {
        toast.error("Chat created, but no channel was returned");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to start chat");
    }
  };

  useEffect(() => {
    if (!isAdmin || selectedCohortId) return;
    if (profile?.cohortId) {
      setSelectedCohortId(profile.cohortId);
    }
  }, [isAdmin, profile?.cohortId, selectedCohortId]);

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
              <Button
                onClick={() => router.push(resourceId ? `/dashboard/discussions/new?resourceId=${resourceId}` : '/dashboard/discussions/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                disabled={!canCreateDiscussion}
                title={!canCreateDiscussion ? "Only Admins and Facilitators can create discussions" : ""}
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Discussion
              </Button>
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
                        {!searchQuery && (
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
                                <span>•</span>
                                <span>
                                  {formatRelativeTimeWAT(discussion.createdAt)}
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
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                  Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {channels && channels.length > 0 ? (
                  <div className="space-y-3">
                    {channels.map((channel) => {
                      const channelTitle = channel.cohort?.name || channel.name.replace(/ - General Chat$/, '');
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
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <Users className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-sm text-gray-600 truncate max-w-[70%]">
                                {isActive && lastMessage ? lastMessage.content : "Open to view messages"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {isActive && lastMessage ? formatRelativeTimeWAT(lastMessage.createdAt) : ""}
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
                    {isAdmin ? (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm">Create a cohort chat to get started</p>
                        <div className="mx-auto max-w-xs text-left">
                          <label htmlFor="cohort-chat-select" className="text-xs font-medium text-gray-700">
                            Cohort
                          </label>
                          <select
                            id="cohort-chat-select"
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                            value={selectedCohortId}
                            onChange={(e) => setSelectedCohortId(e.target.value)}
                            disabled={cohortsLoading}
                          >
                            <option value="">-- Select a cohort --</option>
                            {cohorts.map((cohort: any) => (
                              <option key={cohort.id} value={cohort.id}>
                                {cohort.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          onClick={handleStartChat}
                          disabled={!selectedCohortId || initializeCohortChannels.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {initializeCohortChannels.isPending ? "Creating..." : "Start Chat"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm mt-2">Ask an admin to create a cohort</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
