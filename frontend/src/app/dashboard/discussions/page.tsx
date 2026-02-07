"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDiscussions } from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useDiscussionsSocket } from "@/hooks/useDiscussionsSocket";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function DiscussionsPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState(false);
  
  const { data: discussionsData, refetch } = useDiscussions(profile?.cohortId ?? undefined, {
    pinned: filterPinned || undefined,
  });

  const { socket, isConnected } = useDiscussionsSocket();

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

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              Discussions
            </h1>
            <p className="text-gray-600 mt-1">
              Engage with your cohort and share insights
            </p>
            {isConnected && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Live Updates</span>
              </div>
            )}
          </div>
          <Button
            onClick={() => router.push('/dashboard/discussions/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Discussion
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card className="bg-white border-gray-200 shadow-sm">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-sm text-gray-600">Your Contributions</p>
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
        <div className="space-y-4">
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
                      onClick={() => router.push('/dashboard/discussions/new')}
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
            filteredDiscussions.map((discussion: any) => (
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
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {discussion.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              {discussion.user?.firstName} {discussion.user?.lastName}
                            </span>
                          </div>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(discussion.createdAt), {
                              addSuffix: true,
                            })}
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
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
