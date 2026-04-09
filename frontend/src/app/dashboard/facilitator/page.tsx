"use client";

import {
  RefreshCw, Users, MessageSquare, TrendingUp, Clock, AlertCircle, CheckCircle,
  Calendar, BarChart3, Target, Award, UserCheck, Bell, ChevronRight,
  BookOpen, ClipboardList, Send, Loader2
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohortStats, useFellowEngagement } from "@/hooks/api/useFacilitator";
import { useSessions } from "@/hooks/api/useAdmin";
import { useOpenDM, useSendMessage } from "@/hooks/api/useChat";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useMemo, useState } from "react";

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function FacilitatorDashboard() {
  const queryClient = useQueryClient();
  const openDM = useOpenDM();
  const sendMessage = useSendMessage();
  const [msgDialog, setMsgDialog] = useState<{ open: boolean; fellow: any; message: string }>({
    open: false, fellow: null, message: "",
  });

  const { data: profile, isLoading: profileLoading } = useProfile();

  // Facilitators are linked to cohorts via facilitatedCohorts (many-to-many)
  const facilitatedCohorts = (profile as any)?.facilitatedCohorts ?? [];
  const activeCohort = facilitatedCohorts[0]?.cohort ?? null;
  const cohortId = activeCohort?.id ?? null;

  const { data: stats, isLoading: statsLoading } = useCohortStats(cohortId ?? undefined);
  const { data: fellows, isLoading: fellowsLoading } = useFellowEngagement(cohortId ?? undefined);
  const { data: sessions } = useSessions(cohortId ?? undefined);

  const nextSession = useMemo(() => {
    if (!sessions?.length) return null;
    const now = new Date();
    return sessions
      .filter((s: any) => new Date(s.scheduledDate) >= now)
      .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] ?? null;
  }, [sessions]);

  const attentionFellows = useMemo(
    () => fellows?.filter((f) => f.needsAttention) ?? [],
    [fellows],
  );

  // Recent activity: fellows sorted by lastActive descending
  const recentActivity = useMemo(() => {
    if (!fellows?.length) return [];
    return [...fellows]
      .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
      .slice(0, 5);
  }, [fellows]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["cohort-stats", cohortId] });
    queryClient.invalidateQueries({ queryKey: ["fellow-engagement", cohortId] });
    queryClient.invalidateQueries({ queryKey: ["sessions", cohortId] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  function buildTemplate(fellow: any): string {
    if (fellow.attentionReason?.startsWith("No activity")) {
      return `Hi ${fellow.name},\n\nI noticed you haven't been active on LaunchPad recently. Just checking in — if there's anything I can help with or any questions you have, feel free to reach out!\n\nLooking forward to seeing you back.`;
    }
    const pct = fellow.sessionProgress ?? fellow.progress;
    return `Hi ${fellow.name},\n\nI wanted to check in on your progress before the next session. You're currently at ${pct}% of the resources due so far — keep going, you're making progress! Feel free to reach out if you have any questions or need support.`;
  }

  async function handleSendMessage() {
    if (!msgDialog.fellow || !msgDialog.message.trim()) return;
    try {
      const channel = await openDM.mutateAsync(msgDialog.fellow.userId);
      await sendMessage.mutateAsync({ channelId: channel.id, content: msgDialog.message.trim() });
      toast.success(`Message sent to ${msgDialog.fellow.name}`);
      setMsgDialog({ open: false, fellow: null, message: "" });
    } catch {
      toast.error("Failed to send message");
    }
  }

  const cohortName = activeCohort?.name ?? "No cohort assigned";

  const nextSessionLabel = nextSession
    ? `Session ${nextSession.sessionNumber}: ${nextSession.title} (${new Date(nextSession.scheduledDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})`
    : "No upcoming sessions";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Cohort Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-atlas-navy via-indigo-900 to-purple-900 p-4 sm:p-6 lg:p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-48 -mb-48" />

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    Facilitator
                  </Badge>
                  {activeCohort && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      Active
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{cohortName}</h1>
                <p className="text-blue-100 text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  {nextSessionLabel}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={profileLoading || statsLoading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${profileLoading || statsLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Fellows",
                  value: statsLoading ? "—" : (stats?.fellowCount ?? 0),
                  icon: Users,
                  color: "from-blue-400 to-blue-600",
                },
                {
                  label: "Avg Progress",
                  value: statsLoading ? "—" : `${stats?.avgProgress ?? 0}%`,
                  icon: TrendingUp,
                  color: "from-green-400 to-emerald-600",
                },
                {
                  label: "Discussions",
                  value: statsLoading ? "—" : (stats?.totalDiscussions ?? 0),
                  icon: MessageSquare,
                  color: "from-purple-400 to-pink-500",
                },
                {
                  label: "Attendance",
                  value: statsLoading ? "—" : `${stats?.attendanceRate ?? 0}%`,
                  icon: Clock,
                  color: "from-orange-400 to-red-500",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm text-blue-100">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 shadow-lg border-2 border-blue-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    Fellow Activity
                  </CardTitle>
                  <CardDescription>Recently active fellows in your cohort</CardDescription>
                </div>
                <Link href="/dashboard/facilitator/cohorts">
                  <Button variant="outline" size="sm" className="gap-1">
                    View All <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {fellowsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No fellows in this cohort yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((fellow) => (
                    <div
                      key={fellow.userId}
                      className="flex items-start gap-4 p-4 rounded-xl border bg-blue-50 border-blue-200 text-blue-700 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/50 flex-shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{fellow.name}</p>
                        <p className="text-sm">
                          {fellow.resourcesCompleted} resources · {fellow.discussionCount} discussions
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          Last active {formatRelativeTime(fellow.lastActive)} · {fellow.progress}% progress
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-blue-300 text-blue-600 shrink-0"
                      >
                        {fellow.totalPoints} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attention Required */}
          <Card className="shadow-lg border-2 border-yellow-100">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-600" />
                  Attention Needed
                </span>
                {attentionFellows.length > 0 && (
                  <Badge className="bg-red-500 text-white hover:bg-red-600">
                    {attentionFellows.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Fellows who may need support</CardDescription>
            </CardHeader>
            <CardContent>
              {fellowsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : attentionFellows.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">All fellows are on track!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {attentionFellows.map((fellow) => {
                    const isHighSeverity = fellow.attentionReason?.startsWith("No activity");
                    return (
                      <div
                        key={fellow.userId}
                        className={`flex items-start gap-3 rounded-xl p-4 border-2 ${
                          isHighSeverity
                            ? "border-red-200 bg-red-50"
                            : "border-yellow-200 bg-yellow-50"
                        } transition-all`}
                      >
                        <AlertCircle
                          className={`h-5 w-5 mt-0.5 shrink-0 ${
                            isHighSeverity ? "text-red-600" : "text-yellow-600"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{fellow.name}</p>
                          <p className="text-xs text-gray-600">{fellow.attentionReason}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 h-7 text-xs gap-1 pl-0"
                            onClick={() => setMsgDialog({ open: true, fellow, message: buildTemplate(fellow) })}
                          >
                            <MessageSquare className="h-3 w-3" />
                            Message Fellow
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Cohort Progress */}
          <Card className="shadow-lg border-2 border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Cohort Progress
              </CardTitle>
              <CardDescription>Overall completion status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700">Resources Completed</span>
                  <span className="text-2xl font-bold text-green-700">
                    {statsLoading ? "—" : `${stats?.avgProgress ?? 0}%`}
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-1000"
                    style={{ width: `${stats?.avgProgress ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <Users className="h-5 w-5 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">
                    {stats?.fellowCount ?? "—"}
                  </p>
                  <p className="text-xs text-blue-600">Total Fellows</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <UserCheck className="h-5 w-5 text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-700">
                    {stats?.activeFellows ?? "—"}
                  </p>
                  <p className="text-xs text-green-600">Active This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg border-2 border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common facilitator tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/facilitator/cohorts" className="w-full">
                  <Button className="w-full h-24 flex-col gap-2 bg-green-600 hover:bg-green-700">
                    <Users className="h-6 w-6" />
                    <span className="text-xs">View Fellows</span>
                  </Button>
                </Link>
                <Link href="/dashboard/facilitator/sessions" className="w-full">
                  <Button className="w-full h-24 flex-col gap-2 bg-purple-600 hover:bg-purple-700">
                    <ClipboardList className="h-6 w-6" />
                    <span className="text-xs">Mark Attendance</span>
                  </Button>
                </Link>
                <Link href="/dashboard/facilitator/resources" className="w-full">
                  <Button className="w-full h-24 flex-col gap-2 bg-blue-600 hover:bg-blue-700">
                    <BookOpen className="h-6 w-6" />
                    <span className="text-xs">Manage Resources</span>
                  </Button>
                </Link>
                <Link href="/dashboard/facilitator/quizzes" className="w-full">
                  <Button className="w-full h-24 flex-col gap-2 bg-orange-600 hover:bg-orange-700">
                    <Award className="h-6 w-6" />
                    <span className="text-xs">Manage Quizzes</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Fellow Dialog */}
      <Dialog open={msgDialog.open} onOpenChange={(v) => { if (!v) setMsgDialog((s) => ({ ...s, open: false })); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {msgDialog.fellow?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {msgDialog.fellow?.attentionReason && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Reason: {msgDialog.fellow.attentionReason}
              </p>
            )}
            <Textarea
              value={msgDialog.message}
              onChange={(e) => setMsgDialog((s) => ({ ...s, message: e.target.value }))}
              rows={8}
              className="resize-none text-sm"
              placeholder="Write your message..."
            />
            <p className="text-xs text-gray-400">You can edit the template before sending.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMsgDialog((s) => ({ ...s, open: false }))}
              disabled={openDM.isPending || sendMessage.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSendMessage()}
              disabled={openDM.isPending || sendMessage.isPending || !msgDialog.message.trim()}
              className="gap-2"
            >
              {(openDM.isPending || sendMessage.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <Send className="h-3.5 w-3.5" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
