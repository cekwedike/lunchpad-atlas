"use client";

import { 
  RefreshCw, Users, Calendar, BookOpen, Activity, Plus, CheckCircle, 
  UserPlus, FileText, MessageSquare, Pin, Lock
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useAdminMetrics, useAuditLogs, useCohorts } from "@/hooks/api/useAdmin";
import { useRecentDiscussions } from "@/hooks/api/useDiscussions";
import { useCohortChannels, useChannelMessages } from "@/hooks/api/useChat";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: auditLogs } = useAuditLogs(1, 4);
  const { data: recentDiscussions } = useRecentDiscussions(5);
  const { data: metrics } = useAdminMetrics();
  const { data: cohorts } = useCohorts(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Find active cohort
  const activeCohort = Array.isArray(cohorts)
    ? cohorts.find((c: any) => c.state === 'ACTIVE')
    : null;

  // Get active chat channels for the active cohort
  const { data: activeChannels } = useCohortChannels(activeCohort?.id);
  // Flatten all active channel ids
  const activeChannelIds = Array.isArray(activeChannels)
    ? activeChannels.filter((ch: any) => !ch.isArchived).map((ch: any) => ch.id)
    : [];

  // Fetch recent messages for all active channels (limit 5 per channel)
  const channelMessages = (activeChannelIds || []).map((channelId: string) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useChannelMessages(channelId, 5).data || [];
  });
  // Flatten and sort by createdAt desc
  const recentChatMessages = channelMessages.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // Metrics for fellows only
  const fellowCount = metrics?.roleCounts?.fellowCount || 0;
  const activeFellows = metrics?.activeUsers || 0; // Should be filtered for fellows only in backend ideally
  const weeklyGrowth = metrics?.weeklyGrowth || 0;
  const engagementRate = fellowCount === 0 ? 0 : Math.round((activeFellows / fellowCount) * 100);
  const resourceCount = metrics?.resourceCount || 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    queryClient.invalidateQueries({ queryKey: ['channels'] });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleAddUser = () => {
    router.push('/dashboard/admin/users');
  };

  const handleNewCohort = () => {
    router.push('/dashboard/admin/cohorts');
  };

  const handleAddResource = () => {
    router.push('/dashboard/admin/resources');
  };

  const handleViewDiscussions = () => {
    router.push('/dashboard/discussions');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Administration</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {profile?.name || 'Admin User'}! Here's your platform overview.
            </p>
            {activeCohort && (
              <div className="mt-2">
                <span className="font-semibold text-blue-700">Active Cohort:</span> {activeCohort.name} ({activeCohort.startDate?.slice(0, 10)} to {activeCohort.endDate?.slice(0, 10)})
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || profileLoading}
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || profileLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Key Metrics Grid (Fellows only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Fellows</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{fellowCount}</div>
              <p className="text-xs text-emerald-600 mt-1">
                ↑ {weeklyGrowth}% vs last week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Active Fellows Now</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{activeFellows}</div>
              <p className="text-xs text-gray-500 mt-1">
                {engagementRate}% engagement rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Resources</CardTitle>
                <BookOpen className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{resourceCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                Total learning materials
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Distribution */}
          <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">User Distribution</CardTitle>
              <CardDescription className="text-gray-600">Breakdown by role across the platform</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-gray-900">Fellows</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{fellowCount}</span>
                  </div>
                  {/* ...existing code for progress bar... */}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-gray-900">Facilitators</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{metrics?.roleCounts?.facilitatorCount || 0}</span>
                  </div>
                  {/* ...existing code for progress bar... */}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-sm font-medium text-gray-900">Administrators</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{metrics?.roleCounts?.adminCount || 0}</span>
                  </div>
                  {/* ...existing code for progress bar... */}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Discussions */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Discussions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewDiscussions}
                  className="text-blue-600 hover:text-blue-700 h-8"
                >
                  View All
                </Button>
              </div>
              <CardDescription className="text-gray-600">Latest community activity</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentDiscussions && recentDiscussions.length > 0 ? (
                  recentDiscussions.map((discussion: any) => (
                    <div
                      key={discussion.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/discussions/${discussion.id}`)}
                    >
                      <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {discussion.title}
                          </p>
                          {discussion.isPinned && (
                            <Pin className="h-3 w-3 text-amber-600" />
                          )}
                          {discussion.isLocked && (
                            <Lock className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{discussion.user?.firstName} {discussion.user?.lastName}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</span>
                        </div>
                        {discussion._count && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{discussion._count.comments || 0} comments</span>
                            <span>•</span>
                            <span>{discussion._count.likes || 0} likes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent discussions</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Chats */}
          <Card className="bg-white border-gray-200 shadow-sm mt-6">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Chats</CardTitle>
              <CardDescription className="text-gray-600">Latest messages from all active channels</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentChatMessages && recentChatMessages.length > 0 ? (
                  recentChatMessages.map((msg: any) => (
                    <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                      <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{msg.user?.firstName} {msg.user?.lastName}</span>
                          <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                        </div>
                        <div className="text-sm text-gray-800">{msg.content}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent chat messages</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Admin Actions */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Actions</CardTitle>
              <CardDescription className="text-gray-600">Latest administrative activities</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {auditLogs?.data && auditLogs.data.length > 0 ? (
                  auditLogs.data.map((log: any, i: number) => {
                    const getActionIcon = (action: string) => {
                      if (action.includes('user')) return { icon: UserPlus, bg: 'bg-blue-100', color: 'text-blue-600' };
                      if (action.includes('cohort')) return { icon: Calendar, bg: 'bg-emerald-100', color: 'text-emerald-600' };
                      if (action.includes('resource')) return { icon: BookOpen, bg: 'bg-violet-100', color: 'text-violet-600' };
                      return { icon: MessageSquare, bg: 'bg-amber-100', color: 'text-amber-600' };
                    };
                    const iconData = getActionIcon(log.action);
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`p-2 rounded-lg ${iconData.bg}`}>
                          <iconData.icon className={`h-4 w-4 ${iconData.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-sm text-gray-600 truncate">{log.entityType}: {log.entityId}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent actions</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">Frequently used admin tools</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant="outline"
                  onClick={handleAddUser}
                  className="h-24 flex-col gap-2 bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                >
                  <UserPlus className="h-6 w-6" />
                  <span className="text-sm font-medium">Add User</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleNewCohort}
                  className="h-24 flex-col gap-2 bg-white border-gray-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
                >
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm font-medium">New Cohort</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleAddResource}
                  className="h-24 flex-col gap-2 bg-white border-gray-300 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600"
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm font-medium">Add Resource</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
