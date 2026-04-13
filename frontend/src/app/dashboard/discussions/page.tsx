"use client";

import { Suspense, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
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
import { useRouter, useSearchParams } from "next/navigation";
import {
  useApproveDiscussion,
  useDiscussions,
  usePendingApprovalCount,
} from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useDiscussionsSocket } from "@/hooks/useDiscussionsSocket";
import { useResource } from "@/hooks/api/useResources";
import { formatLocalTimestamp, getRoleBadgeColor, getRoleDisplayName } from "@/lib/date-utils";
import { toast } from "sonner";

export default function DiscussionsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <p className="text-gray-500">Loading discussions...</p>
          </div>
        </DashboardLayout>
      }
    >
      <DiscussionsContent />
    </Suspense>
  );
}

function DiscussionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterPendingApproval, setFilterPendingApproval] = useState(false);

  const resourceId = searchParams.get("resourceId") || undefined;
  const { data: resource } = useResource(resourceId || "");

  const isAdmin = profile?.role === "ADMIN";
  const canManageDiscussions = isAdmin || profile?.role === "FACILITATOR";

  const { data: discussionsData, refetch } = useDiscussions(profile?.cohortId ?? undefined, {
    pinned: filterPinned || undefined,
    resourceId,
    isApproved: filterPendingApproval ? false : undefined,
  });
  const approveDiscussion = useApproveDiscussion();
  const { data: pendingCountData, refetch: refetchPendingCount } = usePendingApprovalCount(
    isAdmin ? undefined : (profile?.cohortId ?? undefined),
    canManageDiscussions,
  );

  const { socket, isConnected } = useDiscussionsSocket();

  useEffect(() => {
    if (!socket) return;

    const refreshAll = () => {
      refetch();
      if (canManageDiscussions) {
        refetchPendingCount();
      }
    };

    socket.on("discussion:new", refreshAll);
    socket.on("discussion:updated", refreshAll);
    socket.on("discussion:new_comment", refreshAll);
    socket.on("discussion:deleted", refreshAll);

    return () => {
      socket.off("discussion:new", refreshAll);
      socket.off("discussion:updated", refreshAll);
      socket.off("discussion:new_comment", refreshAll);
      socket.off("discussion:deleted", refreshAll);
    };
  }, [socket, refetch, refetchPendingCount, canManageDiscussions]);

  useEffect(() => {
    if (!canManageDiscussions) return;
    const interval = setInterval(() => refetchPendingCount(), 30000);
    return () => clearInterval(interval);
  }, [canManageDiscussions, refetchPendingCount]);

  const discussions = discussionsData?.data || [];
  const pendingApprovalCount = pendingCountData?.count ?? 0;
  const filteredDiscussions = discussions.filter((discussion: any) =>
    searchQuery
      ? discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        discussion.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  const canCreateDiscussion = !!profile?.role;

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="p-2 sm:p-4 lg:p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
              <div className="flex gap-2">
                {canCreateDiscussion && (
                  <Button
                    onClick={() =>
                      router.push(
                        resourceId
                          ? `/dashboard/discussions/new?resourceId=${resourceId}`
                          : "/dashboard/discussions/new",
                      )
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start Discussion
                  </Button>
                )}
              </div>
            </div>

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
                  {canManageDiscussions && (
                    <Button
                      variant={filterPendingApproval ? "default" : "outline"}
                      onClick={() => setFilterPendingApproval(!filterPendingApproval)}
                      className="gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      {filterPendingApproval ? "Show All" : "Pending Approval"}
                      {pendingApprovalCount > 0 && (
                        <Badge className="ml-1 bg-amber-100 text-amber-700 border border-amber-200">
                          {pendingApprovalCount}
                        </Badge>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {resourceId && (
              <Card className="bg-blue-50 border-blue-200 shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm text-blue-700">Filtered by resource</div>
                    <div className="text-base font-semibold text-blue-900">
                      {resource?.title || "Resource discussion"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push(`/resources/${resourceId}`)}>
                      View Resource
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/dashboard/discussions")}>
                      Clear Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {filteredDiscussions.length === 0 ? (
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchQuery ? "No discussions found" : "No discussions yet"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery ? "Try a different search term" : "Be the first to start a discussion!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredDiscussions.map((discussion: any) => {
                  const topicLabel = discussion.resource?.title
                    ? `Resource: ${discussion.resource.title}`
                    : discussion.session?.title
                      ? `Session ${discussion.session.sessionNumber}: ${discussion.session.title}`
                      : "General";

                  const isPendingApproval = discussion.isApproved === false;

                  return (
                    <Card
                      key={discussion.id}
                      className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/dashboard/discussions/${discussion.id}`)}
                    >
                      <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                  {discussion.title}
                                </h3>
                                {discussion.isPinned && <Pin className="h-4 w-4 text-amber-600" />}
                                {discussion.isLocked && <Lock className="h-4 w-4 text-red-600" />}
                                {isPendingApproval && (
                                  <Badge className="text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending approval
                                  </Badge>
                                )}
                                <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                  {topicLabel}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{discussion.content}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-700">{discussion.user?.firstName}</span>
                                  <Badge className={`text-xs ${getRoleBadgeColor(discussion.user?.role)}`}>
                                    {getRoleDisplayName(discussion.user?.role)}
                                  </Badge>
                                </div>
                                {isPendingApproval && canManageDiscussions && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      approveDiscussion
                                        .mutateAsync(discussion.id)
                                        .then(() => refetchPendingCount())
                                        .catch(() => toast.error("Failed to approve discussion"));
                                    }}
                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                                  >
                                    Approve
                                  </button>
                                )}
                                <span>•</span>
                                <span>{formatLocalTimestamp(discussion.createdAt)}</span>
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
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
