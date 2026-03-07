"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Video,
  FileText,
  Lock,
  Search,
  Calendar,
  BookOpen,
  Target,
  Globe,
  Lightbulb,
  Clock,
  Edit,
  Unlock,
  CheckCircle2,
  PlayCircle,
  Star,
  ChevronDown,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useResources, useAdminUnlockResource, useResourceProgress } from "@/hooks/api/useResources";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohorts, useSessions, useAdminUsers } from "@/hooks/api/useAdmin";
import { ResourceType, UserRole } from "@/types/api";
import { VideoModal } from "@/components/VideoModal";
import { ArticleModal } from "@/components/ArticleModal";
import { format } from "date-fns";

const MONTH_CONFIG = [
  {
    gradient: "from-blue-900 to-blue-600",
    light: "bg-blue-50",
    lightBorder: "border-blue-200",
    textColor: "text-blue-700",
    ring: "ring-blue-300",
    icon: BookOpen,
  },
  {
    gradient: "from-blue-700 to-indigo-600",
    light: "bg-indigo-50",
    lightBorder: "border-indigo-200",
    textColor: "text-indigo-700",
    ring: "ring-indigo-300",
    icon: Target,
  },
  {
    gradient: "from-indigo-700 to-blue-500",
    light: "bg-blue-50",
    lightBorder: "border-blue-200",
    textColor: "text-blue-600",
    ring: "ring-blue-200",
    icon: Globe,
  },
  {
    gradient: "from-blue-800 to-indigo-500",
    light: "bg-indigo-50",
    lightBorder: "border-indigo-200",
    textColor: "text-indigo-600",
    ring: "ring-indigo-200",
    icon: Lightbulb,
  },
];

export default function ResourcesPage() {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [videoDialog, setVideoDialog] = useState<{ open: boolean; resource?: any }>({ open: false });
  const [articleDialog, setArticleDialog] = useState<{ open: boolean; resource?: any }>({ open: false });
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; resource?: any }>({ open: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "article" | "video">("all");

  const { data: profile } = useProfile();
  const { data: resourceProgress } = useResourceProgress();
  const { data: usersData } = useAdminUsers({ role: "FELLOW,FACILITATOR" });
  const adminUnlock = useAdminUnlockResource();
  const users = usersData as any;

  const isAdmin = profile?.role === UserRole.ADMIN;
  const isFacilitator = profile?.role === UserRole.FACILITATOR;
  const isFellow = profile?.role === UserRole.FELLOW;

  const { data: cohortsData } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  const [adminSelectedCohortId, setAdminSelectedCohortId] = useState<string>("");

  const userCohortId = useMemo(() => {
    if (isAdmin) return adminSelectedCohortId;
    if (isFacilitator) {
      const facilitated = (profile as any)?.facilitatedCohorts;
      if (facilitated && facilitated.length > 0) return facilitated[0].id;
      return (profile as any)?.cohortId || "";
    }
    return (profile as any)?.cohortId || "";
  }, [isAdmin, isFacilitator, profile, adminSelectedCohortId]);

  const { data: sessionsData } = useSessions(userCohortId || undefined);
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  const { data: resources } = useResources(userCohortId ? { cohortId: userCohortId } : undefined);

  const months = useMemo(() => {
    if (sessions.length === 0) return [];
    const monthMap: { [key: number]: any[] } = {};
    sessions.forEach((session: any) => {
      const monthNum = Math.ceil(session.sessionNumber / 4);
      if (!monthMap[monthNum]) monthMap[monthNum] = [];
      monthMap[monthNum].push(session);
    });
    return Object.entries(monthMap)
      .map(([num, monthSessions]) => {
        const monthNum = parseInt(num);
        const firstSession = monthSessions[0];
        return {
          id: monthNum,
          number: `Month ${monthNum}`,
          title: firstSession?.monthTheme || `Month ${monthNum}`,
          config: MONTH_CONFIG[(monthNum - 1) % MONTH_CONFIG.length],
          sessions: monthSessions.sort((a: any, b: any) => a.sessionNumber - b.sessionNumber),
        };
      })
      .sort((a, b) => a.id - b.id);
  }, [sessions]);

  const isResourceUnlocked = (resource: any, session: any) => {
    if (isAdmin || isFacilitator) return true;
    if (resource.state === "UNLOCKED" || resource.state === "IN_PROGRESS" || resource.state === "COMPLETED") return true;
    if (resourceProgress && Array.isArray(resourceProgress)) {
      const progress = resourceProgress.find((p: any) => p.resourceId === resource.id);
      if (progress && (progress.state === "UNLOCKED" || progress.state === "COMPLETED")) return true;
    }
    return new Date() >= new Date(session.unlockDate);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getSessionResources = (sessionId: string) => {
    if (!resources) return [];
    return (resources as any[])
      .filter((r) => r.sessionId === sessionId || r.session?.id === sessionId)
      .filter((r) => {
        const matchesSearch =
          searchQuery === "" ||
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || r.type.toLowerCase() === filterType;
        return matchesSearch && matchesType;
      });
  };

  const getTotalResources = () => (resources as any[])?.length || 0;
  const getCompletedCount = () =>
    (resources as any[])?.filter((r) => r.isCompleted || r.state === "COMPLETED").length || 0;
  const getArticleCount = () => (resources as any[])?.filter((r) => r.type === ResourceType.ARTICLE).length || 0;
  const getVideoCount = () => (resources as any[])?.filter((r) => r.type === ResourceType.VIDEO).length || 0;

  const completionRate =
    getTotalResources() > 0 ? Math.round((getCompletedCount() / getTotalResources()) * 100) : 0;

  const selectedMonthData = months.find((m) => m.id === selectedMonth);

  const handleResourceClick = (resource: any, session: any) => {
    if (!isResourceUnlocked(resource, session)) return;
    if (resource.type === ResourceType.VIDEO) {
      setVideoDialog({ open: true, resource });
    } else if (resource.type === ResourceType.ARTICLE) {
      setArticleDialog({ open: true, resource });
    }
  };

  const fellowGreeting =
    completionRate === 0
      ? "Ready to dive in? Your journey starts now!"
      : completionRate < 40
      ? "Great start — keep the momentum going!"
      : completionRate < 75
      ? "You're on fire! More than halfway there."
      : completionRate < 100
      ? "Almost there — you're absolutely crushing it!"
      : "You've completed everything! You're a legend.";

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ── Fellow Hero Banner ─────────────────────────────────── */}
        {isFellow && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-700 px-4 sm:px-8 py-8 sm:py-10 text-white shadow-xl">
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
            <div className="pointer-events-none absolute top-4 right-1/3 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                    Career Development Curriculum
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold leading-tight md:text-4xl text-white">
                  Hey, {(profile as any)?.firstName || "Fellow"}!
                </h1>
                <p className="mt-2 text-blue-200">{fellowGreeting}</p>

                {userCohortId && (
                  <div className="mt-5 max-w-sm">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-blue-200">Overall Progress</span>
                      <span className="font-extrabold text-yellow-400 text-base">{completionRate}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-700"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-blue-300">
                      {getCompletedCount()} of {getTotalResources()} resources completed
                    </p>
                  </div>
                )}
              </div>

              {/* Stat bubbles */}
              {userCohortId && (
                <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                  {[
                    { label: "Sessions", value: sessions.length, icon: Calendar },
                    { label: "Articles", value: getArticleCount(), icon: FileText },
                    { label: "Videos", value: getVideoCount(), icon: Video },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-3 py-3 sm:px-4 sm:py-4 text-center backdrop-blur-sm min-w-[60px] sm:min-w-[68px]"
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/50 mb-1" />
                      <p className="text-xl sm:text-2xl font-extrabold leading-none">{value}</p>
                      <p className="mt-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-blue-200">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Admin / Facilitator Header ────────────────────────── */}
        {!isFellow && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Career Development Curriculum</h1>
              <p className="text-gray-500 mt-1">A comprehensive program covering foundations to global readiness.</p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Link href="/dashboard/admin/resources">
                  <Button className="gap-2">
                    <Edit className="h-4 w-4" /> Manage Resources
                  </Button>
                </Link>
              )}
              {isFacilitator && (
                <Link href="/dashboard/facilitator/resources">
                  <Button className="gap-2">
                    <Edit className="h-4 w-4" /> Manage Resources
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Admin Cohort Selector ──────────────────────────────── */}
        {isAdmin && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Label htmlFor="cohort-select" className="text-sm font-semibold text-gray-700 mb-2 block">
              Select Cohort to Preview
            </Label>
            <select
              id="cohort-select"
              className="w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={adminSelectedCohortId}
              onChange={(e) => {
                setAdminSelectedCohortId(e.target.value);
                setSelectedMonth(1);
                setSelectedSession(null);
              }}
            >
              <option value="">-- Select a cohort --</option>
              {cohorts.map((cohort: any) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name} ({cohort.startDate ? format(new Date(cohort.startDate), "MMM yyyy") : ""})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Empty States ───────────────────────────────────────── */}
        {!userCohortId && !isAdmin && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <BookOpen className="h-10 w-10 text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-gray-700">No cohort assigned yet</p>
            <p className="mt-2 text-sm text-gray-500">Contact your administrator to be assigned to a cohort.</p>
          </div>
        )}

        {isAdmin && !adminSelectedCohortId && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <BookOpen className="h-10 w-10 text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-gray-700">Select a cohort above to view resources</p>
          </div>
        )}

        {userCohortId && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <BookOpen className="h-10 w-10 text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-gray-700">No sessions found for this cohort</p>
            <p className="mt-2 text-sm text-gray-500">Sessions need to be created first.</p>
          </div>
        )}

        {/* ── Main Curriculum ────────────────────────────────────── */}
        {userCohortId && months.length > 0 && (
          <div className="space-y-6">
            {/* Month Tabs — segmented control */}
            <div className="flex rounded-2xl bg-gray-100 p-1">
              {months.map((month) => {
                const isActive = selectedMonth === month.id;
                const TabIcon = month.config.icon;
                return (
                  <button
                    key={month.id}
                    onClick={() => {
                      setSelectedMonth(month.id);
                      setSelectedSession(null);
                    }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${month.config.gradient} text-white shadow-sm`
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <TabIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{month.number}</span>
                    <span className="sm:hidden font-bold">{month.id}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Month Content */}
            {selectedMonthData && (
              <div className="space-y-5">
                {/* Month Banner */}
                <div
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${selectedMonthData.config.gradient} p-6 text-white shadow-lg`}
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-4 right-24 h-24 w-24 rounded-full bg-white/5" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                        {(() => {
                          const Icon = selectedMonthData.config.icon;
                          return <Icon className="h-7 w-7 text-white" />;
                        })()}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                          {selectedMonthData.number}
                        </p>
                        <h2 className="text-2xl font-extrabold text-white">{selectedMonthData.title}</h2>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-4xl font-extrabold text-white">{selectedMonthData.sessions.length}</span>
                      <span className="text-sm text-white/60">Sessions</span>
                    </div>
                  </div>
                </div>

                {/* Session Cards — accordion, resources inline */}
                <div className="space-y-3">
                  {selectedMonthData.sessions.map((session: any) => {
                    const sessionResources = getSessionResources(session.id);
                    const allSessionResources = (resources as any[] | undefined)?.filter(
                      (r) => r.sessionId === session.id || r.session?.id === session.id
                    ) ?? [];
                    const isUnlocked =
                      isAdmin || isFacilitator || new Date() >= new Date(session.unlockDate);
                    const isExpanded = selectedSession === session.id;
                    const completedInSession = allSessionResources.filter(
                      (r: any) => r.isCompleted || r.state === "COMPLETED"
                    ).length;
                    const cfg = selectedMonthData.config;

                    return (
                      <div
                        key={session.id}
                        className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                          isExpanded
                            ? `border-transparent ring-2 ${cfg.ring} shadow-lg bg-white`
                            : isUnlocked
                            ? "border-gray-200 bg-white"
                            : "border-gray-200 bg-gray-50/80 opacity-75"
                        }`}
                      >
                        {/* Color accent bar */}
                        <div
                          className={`absolute left-0 top-0 h-full ${isExpanded ? "w-2" : "w-1.5"} bg-gradient-to-b ${cfg.gradient} transition-all duration-200`}
                        />

                        {/* Clickable session header */}
                        <div
                          className="p-5 pl-6 cursor-pointer select-none"
                          onClick={() => setSelectedSession(isExpanded ? null : session.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                                  isExpanded
                                    ? `bg-gradient-to-br ${cfg.gradient} text-white shadow-sm`
                                    : isUnlocked
                                    ? `${cfg.light} ${cfg.textColor}`
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {isUnlocked ? session.sessionNumber : <Lock className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${cfg.textColor}`}>
                                  Session {session.sessionNumber}
                                </p>
                                <h3 className="font-semibold text-blue-950 leading-snug">{session.title}</h3>
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                                isExpanded ? `rotate-180 ${cfg.textColor}` : "text-gray-300"
                              }`}
                            />
                          </div>

                          {/* Meta row */}
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(session.scheduledDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {allSessionResources.length} resources
                            </span>
                            {isFellow && completedInSession > 0 && (
                              <span className={`flex items-center gap-1 font-semibold ${cfg.textColor}`}>
                                <CheckCircle2 className="h-3 w-3" />
                                {completedInSession}/{allSessionResources.length} done
                              </span>
                            )}
                            {!isUnlocked && !isAdmin && !isFacilitator && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                                <Lock className="h-3 w-3" />
                                Unlocks {formatDate(session.unlockDate)}
                              </span>
                            )}
                          </div>

                          {/* Per-session progress bar (fellows) */}
                          {isFellow && allSessionResources.length > 0 && (
                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-500`}
                                style={{ width: `${(completedInSession / allSessionResources.length) * 100}%` }}
                              />
                            </div>
                          )}

                          {/* Admin/facilitator edit link */}
                          {(isAdmin || isFacilitator) && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <Link
                                href={
                                  isAdmin
                                    ? `/dashboard/admin/resources?editSession=${session.sessionNumber}`
                                    : `/dashboard/facilitator/resources?editSession=${session.sessionNumber}`
                                }
                                className={`flex items-center gap-1.5 text-xs font-medium ${cfg.textColor} hover:underline`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Edit className="h-3 w-3" />
                                Edit Session Date
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* ── Inline Resources ─────────────────────────── */}
                        {isExpanded && (
                          <div className="border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            {/* Search & Filter */}
                            <div className="flex flex-col sm:flex-row gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Search resources..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="pl-9 rounded-xl border-gray-200"
                                />
                              </div>
                              <div className="flex gap-2">
                                {(["all", "article", "video"] as const).map((f) => (
                                  <button
                                    key={f}
                                    onClick={() => setFilterType(f)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                                      filterType === f
                                        ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-sm`
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                  >
                                    {f}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Resource list */}
                            <div className="divide-y divide-gray-50 p-2">
                              {sessionResources.map((resource: any) => {
                                const unlocked = isResourceUnlocked(resource, session);
                                const isCompleted = resource.isCompleted || resource.state === "COMPLETED";
                                const isVideo = resource.type === ResourceType.VIDEO;

                                return (
                                  <div
                                    key={resource.id}
                                    onClick={() => handleResourceClick(resource, session)}
                                    className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all group ${
                                      unlocked
                                        ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                                        : "opacity-50 cursor-not-allowed"
                                    }`}
                                  >
                                    {/* Icon */}
                                    <div
                                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                                        !unlocked
                                          ? "bg-gray-100"
                                          : isCompleted
                                          ? "bg-green-100"
                                          : isVideo
                                          ? "bg-rose-100 group-hover:bg-rose-200"
                                          : "bg-blue-100 group-hover:bg-blue-200"
                                      }`}
                                    >
                                      {!unlocked ? (
                                        <Lock className="h-5 w-5 text-gray-400" />
                                      ) : isCompleted ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                      ) : isVideo ? (
                                        <PlayCircle className="h-5 w-5 text-rose-600" />
                                      ) : (
                                        <FileText className="h-5 w-5 text-blue-600" />
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                        <span
                                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                            resource.isCore
                                              ? `bg-gradient-to-r ${cfg.gradient} text-white`
                                              : "bg-gray-100 text-gray-500"
                                          }`}
                                        >
                                          {resource.isCore ? "Core" : "Optional"} · {isVideo ? "Video" : "Article"}
                                        </span>
                                        {isCompleted && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                            <Star className="h-2.5 w-2.5" /> Completed
                                          </span>
                                        )}
                                      </div>
                                      <p className={`font-semibold text-sm leading-snug ${unlocked ? "text-gray-900" : "text-gray-400"}`}>
                                        {resource.title}
                                      </p>
                                      {resource.description && (
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{resource.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                        {/* Videos show actual duration in the modal; articles show estimated read time here */}
                                        {!isVideo && resource.estimatedMinutes && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {resource.estimatedMinutes} min
                                          </span>
                                        )}
                                        {resource.pointValue && (
                                          <span className={`flex items-center gap-1 font-bold ${cfg.textColor}`}>
                                            <Zap className="h-3 w-3" />
                                            {resource.pointValue} pts
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {(isAdmin || isFacilitator) && (
                                        <>
                                          {!unlocked && (
                                            <button
                                              className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setUnlockDialog({ open: true, resource });
                                              }}
                                            >
                                              <Unlock className="h-3 w-3" /> Unlock
                                            </button>
                                          )}
                                          <Link
                                            href={
                                              isAdmin
                                                ? `/dashboard/admin/resources?edit=${resource.id}`
                                                : `/dashboard/facilitator/resources?edit=${resource.id}`
                                            }
                                            className={`flex items-center gap-1 rounded-lg border ${cfg.lightBorder} ${cfg.light} px-2.5 py-1.5 text-xs font-semibold ${cfg.textColor} hover:opacity-80 transition-colors`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Edit className="h-3 w-3" /> Edit
                                          </Link>
                                        </>
                                      )}
                                      {unlocked && !isAdmin && !isFacilitator && (
                                        isVideo ? (
                                          <PlayCircle className="h-5 w-5 text-gray-300 group-hover:text-rose-400 transition-colors" />
                                        ) : (
                                          <BookOpen className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                        )
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {sessionResources.length === 0 && (
                                <div className="flex flex-col items-center py-12 text-gray-400">
                                  <FileText className="h-10 w-10 mb-2 text-gray-200" />
                                  <p className="text-sm font-medium">No resources found</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Video Modal ─────────────────────────────────────────── */}
        {(() => {
          const r = videoDialog.resource;
          const prog = r ? (resourceProgress as any[])?.find((p: any) => p.resourceId === r.id) : null;
          return (
            <VideoModal
              open={videoDialog.open}
              resource={r ?? null}
              savedProgress={prog?.watchPercentage ?? 0}
              alreadyCompleted={prog?.state === "COMPLETED"}
              onClose={() => setVideoDialog({ open: false })}
            />
          );
        })()}

        {/* ── Article Modal ────────────────────────────────────────── */}
        {(() => {
          const r = articleDialog.resource;
          const prog = r ? (resourceProgress as any[])?.find((p: any) => p.resourceId === r.id) : null;
          return (
            <ArticleModal
              open={articleDialog.open}
              resource={r ?? null}
              savedProgress={(prog as any)?.scrollDepth ?? 0}
              alreadyCompleted={prog?.state === "COMPLETED"}
              onClose={() => setArticleDialog({ open: false })}
            />
          );
        })()}

        {/* ── Admin Unlock Dialog ────────────────────────────────── */}
        <Dialog open={unlockDialog.open} onOpenChange={(open) => setUnlockDialog({ open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manually Unlock Resource</DialogTitle>
            </DialogHeader>
            {unlockDialog.resource && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="font-semibold text-gray-900 text-sm mb-1">{unlockDialog.resource.title}</p>
                  <p className="text-xs text-gray-500">
                    Select a user to manually unlock this resource for them, bypassing the 5-day rule.
                  </p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-semibold text-gray-700">Select User:</p>
                  {users?.users?.map((user: any) => (
                    <Button
                      key={user.id}
                      variant="outline"
                      className="w-full justify-start text-left"
                      onClick={() => {
                        adminUnlock.mutate({ userId: user.id, resourceId: unlockDialog.resource.id });
                        setUnlockDialog({ open: false });
                      }}
                      disabled={adminUnlock.isPending}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user.email} - {user.role}
                        </span>
                      </div>
                    </Button>
                  ))}
                  {(!users?.users || users.users.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">No fellows or facilitators found</p>
                  )}
                </div>
                <Button variant="outline" onClick={() => setUnlockDialog({ open: false })} className="w-full">
                  Cancel
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
