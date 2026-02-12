"use client";

import {
  RefreshCw, Users, BookOpen, Activity, UserPlus, FileText,
  MessageSquare, Calendar, ChevronRight, Clock, TrendingUp,
  LayoutDashboard, Settings, Zap, ArrowUpRight, LockOpen, Lock,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useAdminMetrics, useCohorts, useSessions } from "@/hooks/api/useAdmin";
import { useCohortChannels, useChannelMessages } from "@/hooks/api/useChat";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format, differenceInDays, isPast, isFuture } from "date-fns";

// Determine cohort status from dates, ignoring the DB state field
function getCohortStatus(cohort: any): { label: string; color: string; bg: string; dot: string } {
  const start = cohort?.startDate ? new Date(cohort.startDate) : null;
  const end = cohort?.endDate ? new Date(cohort.endDate) : null;

  if (!start) return { label: "Unknown", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };
  if (isFuture(start)) return { label: "Upcoming", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-400" };
  if (end && isPast(end)) return { label: "Completed", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };
  return { label: "In Progress", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" };
}


export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: metrics } = useAdminMetrics();
  const { data: cohorts } = useCohorts(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Find most relevant cohort: prefer in-progress, then upcoming, then most recent
  const displayCohort = useMemo(() => {
    if (!Array.isArray(cohorts)) return null;
    const inProgress = cohorts.find((c: any) => {
      const s = c.startDate ? new Date(c.startDate) : null;
      const e = c.endDate ? new Date(c.endDate) : null;
      return s && e && !isFuture(s) && !isPast(e);
    });
    if (inProgress) return inProgress;
    const upcoming = cohorts
      .filter((c: any) => c.startDate && isFuture(new Date(c.startDate)))
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
    return upcoming || cohorts[0] || null;
  }, [cohorts]);

  const { data: allSessions } = useSessions(displayCohort?.id);

  const cohortStatus = displayCohort ? getCohortStatus(displayCohort) : null;
  const daysUntilStart = displayCohort?.startDate && isFuture(new Date(displayCohort.startDate))
    ? differenceInDays(new Date(displayCohort.startDate), new Date())
    : null;

  // Upcoming sessions: not yet past their scheduled date, sorted ascending
  const upcomingSessions = useMemo(() => {
    if (!Array.isArray(allSessions)) return [];
    return allSessions
      .filter((s: any) => s.scheduledDate && !isPast(new Date(s.scheduledDate)))
      .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5);
  }, [allSessions]);

  // Chat messages
  const { data: activeChannels } = useCohortChannels(displayCohort?.id);
  const channelIds = Array.isArray(activeChannels)
    ? activeChannels.filter((ch: any) => !ch.isArchived).map((ch: any) => ch.id).slice(0, 5)
    : [];
  const msgs1 = useChannelMessages(channelIds[0], 3).data || [];
  const msgs2 = useChannelMessages(channelIds[1], 3).data || [];
  const msgs3 = useChannelMessages(channelIds[2], 3).data || [];
  const recentChats = [...msgs1, ...msgs2, ...msgs3]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const fellowCount = metrics?.roleCounts?.fellowCount || 0;
  const facilitatorCount = metrics?.roleCounts?.facilitatorCount || 0;
  const engagedFellows = metrics?.activeUsers || 0;
  const resourceCount = metrics?.resourceCount || 0;
  const weeklyGrowth = metrics?.weeklyGrowth || 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    ["profile", "audit-logs", "admin-metrics", "cohorts", "channels"].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })
    );
    await new Promise((r) => setTimeout(r, 800));
    setIsRefreshing(false);
  };

  const quickActions = [
    { label: "Add User", icon: UserPlus, href: "/dashboard/admin/users", color: "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700" },
    { label: "New Cohort", icon: Calendar, href: "/dashboard/admin/cohorts", color: "hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700" },
    { label: "Add Resource", icon: FileText, href: "/dashboard/admin/resources", color: "hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700" },
    { label: "Sessions", icon: LayoutDashboard, href: "/dashboard/admin/sessions", color: "hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700" },
    { label: "Analytics", icon: TrendingUp, href: "/dashboard/admin/analytics", color: "hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700" },
    { label: "Settings", icon: Settings, href: "/dashboard/admin/settings", color: "hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700" },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ATLAS Admin</h1>
                <p className="text-xs text-gray-500">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome back, <span className="font-medium text-gray-900">{profile?.firstName || "Admin"}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || profileLoading}
                className="border-gray-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Cohort Banner */}
          {displayCohort && cohortStatus && (
            <div className={`rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cohortStatus.bg} border-opacity-50`}>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${cohortStatus.dot} shrink-0 ${cohortStatus.label === "In Progress" ? "animate-pulse" : ""}`} />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Current Cohort</p>
                  <p className={`text-sm font-semibold ${cohortStatus.color}`}>{displayCohort.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {displayCohort.startDate ? format(new Date(displayCohort.startDate), "MMM d, yyyy") : "–"}
                    {" → "}
                    {displayCohort.endDate ? format(new Date(displayCohort.endDate), "MMM d, yyyy") : "–"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${cohortStatus.bg} ${cohortStatus.color} border-0 font-medium`}>
                  {cohortStatus.label}
                </Badge>
                {daysUntilStart !== null && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Starts in {daysUntilStart} day{daysUntilStart !== 1 ? "s" : ""}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-600 h-7"
                  onClick={() => router.push("/dashboard/admin/cohorts")}
                >
                  Manage <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Fellows</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{fellowCount}</p>
                    {weeklyGrowth !== 0 && (
                      <p className={`text-xs mt-1 flex items-center gap-0.5 ${weeklyGrowth > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        <TrendingUp className="h-3 w-3" />
                        {weeklyGrowth > 0 ? "+" : ""}{weeklyGrowth}% this week
                      </p>
                    )}
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Facilitators</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{facilitatorCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Active on platform</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Activity className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resources</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{resourceCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Learning materials</p>
                  </div>
                  <div className="p-2 bg-violet-50 rounded-lg">
                    <BookOpen className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Engaged (7d)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{engagedFellows}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {fellowCount > 0 ? Math.round((engagedFellows / fellowCount) * 100) : 0}% of fellows
                    </p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <ArrowUpRight className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Upcoming Sessions — 2/3 width */}
            <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-900">Upcoming Sessions</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 h-7"
                    onClick={() => router.push("/dashboard/admin/sessions")}
                  >
                    View all <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {upcomingSessions.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {upcomingSessions.map((session: any) => {
                      const scheduledDate = new Date(session.scheduledDate);
                      const unlockDate = session.unlockDate ? new Date(session.unlockDate) : null;
                      const daysToSession = differenceInDays(scheduledDate, new Date());
                      const unlockPast = unlockDate ? isPast(unlockDate) : false;
                      return (
                        <div
                          key={session.id}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
                          onClick={() => router.push("/dashboard/admin/sessions")}
                        >
                          {/* Session number badge */}
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-indigo-600">{session.sessionNumber ?? "–"}</span>
                          </div>
                          {/* Title + date */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{session.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {format(scheduledDate, "EEE, MMM d, yyyy")}
                            </p>
                          </div>
                          {/* Unlock status */}
                          <div className="flex items-center gap-2 shrink-0">
                            {unlockPast ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <LockOpen className="h-3 w-3" /> Unlocked
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                <Lock className="h-3 w-3" /> Locked
                              </span>
                            )}
                            <span className="text-xs text-gray-400 hidden sm:block">
                              {daysToSession === 0 ? "Today" : daysToSession === 1 ? "Tomorrow" : `In ${daysToSession}d`}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                    <div className="p-3 bg-gray-100 rounded-full mb-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No upcoming sessions</p>
                    <p className="text-xs text-gray-400 mt-1">All sessions have been completed or no cohort is active</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Chats — 1/3 width */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-900">Recent Chats</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 h-7"
                    onClick={() => router.push("/dashboard/chat")}
                  >
                    Open <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentChats.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {recentChats.map((msg: any) => (
                      <div key={msg.id} className="flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700">
                          {msg.user?.firstName?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {msg.user?.firstName} {msg.user?.lastName}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: false })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate mt-0.5">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <MessageSquare className="h-5 w-5 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400">No recent messages</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick Actions — 2/3 width */}
            <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {quickActions.map(({ label, icon: Icon, href, color }) => (
                    <button
                      key={label}
                      onClick={() => router.push(href)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white transition-all cursor-pointer ${color}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Distribution — 1/3 width */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900">User Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {[
                  { label: "Fellows", count: fellowCount, total: fellowCount + facilitatorCount + (metrics?.roleCounts?.adminCount || 0), color: "bg-blue-500" },
                  { label: "Facilitators", count: facilitatorCount, total: fellowCount + facilitatorCount + (metrics?.roleCounts?.adminCount || 0), color: "bg-emerald-500" },
                  { label: "Admins", count: metrics?.roleCounts?.adminCount || 0, total: fellowCount + facilitatorCount + (metrics?.roleCounts?.adminCount || 0), color: "bg-violet-500" },
                ].map(({ label, count, total, color }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-700">{label}</span>
                      <span className="text-xs font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
