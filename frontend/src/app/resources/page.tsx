"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Video,
  FileText,
  Lock,
  Search,
  Calendar,
  ChevronRight,
  ExternalLink,
  Award,
  BookOpen,
  Target,
  Globe,
  Lightbulb,
  Clock,
  Edit,
  Unlock
} from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useResources, useAdminUnlockResource, useResourceProgress } from "@/hooks/api/useResources";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohorts, useSessions, useAdminUsers } from "@/hooks/api/useAdmin";
import { ResourceType, UserRole } from "@/types/api";
import { getVideoEmbedUrl } from "@/lib/videoUtils";
import { format } from "date-fns";

// Month icons by index
const MONTH_ICONS = [BookOpen, Target, Globe, Lightbulb];

export default function ResourcesPage() {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [videoDialog, setVideoDialog] = useState<{ open: boolean; resource?: any }>({ open: false });
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; resource?: any }>({ open: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "article" | "video">("all");

  const { data: profile } = useProfile();
  const { data: resourceProgress } = useResourceProgress();
  const { data: usersData } = useAdminUsers({ role: 'FELLOW,FACILITATOR' });
  const adminUnlock = useAdminUnlockResource();

  const users = usersData as any;

  const isAdmin = profile?.role === UserRole.ADMIN;
  const isFacilitator = profile?.role === UserRole.FACILITATOR;
  const isFellow = profile?.role === UserRole.FELLOW;

  // Determine the user's cohort ID
  const { data: cohortsData } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  // For fellows: use their cohortId directly
  // For facilitators: use their facilitated cohort or cohortId
  // For admins: use a cohort selector
  const [adminSelectedCohortId, setAdminSelectedCohortId] = useState<string>("");

  const userCohortId = useMemo(() => {
    if (isAdmin) return adminSelectedCohortId;
    if (isFacilitator) {
      // Use facilitatedCohorts first, then fallback to cohortId
      const facilitated = (profile as any)?.facilitatedCohorts;
      if (facilitated && facilitated.length > 0) return facilitated[0].id;
      return (profile as any)?.cohortId || "";
    }
    return (profile as any)?.cohortId || "";
  }, [isAdmin, isFacilitator, profile, adminSelectedCohortId]);

  // Fetch sessions for the user's cohort
  const { data: sessionsData } = useSessions(userCohortId || undefined);
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  // Fetch resources filtered by cohort
  const { data: resources } = useResources(userCohortId ? { cohortId: userCohortId } : undefined);

  // Group sessions into months (sessions 1-4 = month 1, 5-8 = month 2, etc.)
  const months = useMemo(() => {
    if (sessions.length === 0) return [];
    const monthMap: { [key: number]: any[] } = {};
    sessions.forEach((session: any) => {
      const monthNum = Math.ceil(session.sessionNumber / 4);
      if (!monthMap[monthNum]) monthMap[monthNum] = [];
      monthMap[monthNum].push(session);
    });
    return Object.entries(monthMap).map(([num, monthSessions]) => {
      const monthNum = parseInt(num);
      const firstSession = monthSessions[0];
      return {
        id: monthNum,
        number: `Month ${monthNum}`,
        title: firstSession?.monthTheme || `Month ${monthNum}`,
        icon: MONTH_ICONS[(monthNum - 1) % MONTH_ICONS.length],
        sessions: monthSessions.sort((a: any, b: any) => a.sessionNumber - b.sessionNumber),
      };
    }).sort((a, b) => a.id - b.id);
  }, [sessions]);

  // Returns true if resource is unlocked for the current user
  const isResourceUnlocked = (resource: any, session: any) => {
    if (isAdmin || isFacilitator) return true;
    if (resourceProgress && Array.isArray(resourceProgress)) {
      const progress = resourceProgress.find((p: any) => p.resourceId === resource.id);
      if (progress && (progress.state === 'UNLOCKED' || progress.state === 'COMPLETED')) {
        return true;
      }
    }
    return new Date() >= new Date(session.unlockDate);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get resources for a specific session
  const getSessionResources = (sessionId: string) => {
    if (!resources) return [];
    const filtered = (resources as any[]).filter(r => {
      return r.sessionId === sessionId || r.session?.id === sessionId;
    });

    // Apply search and type filters
    return filtered.filter(r => {
      const matchesSearch = searchQuery === "" ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || r.type.toLowerCase() === filterType;
      return matchesSearch && matchesType;
    });
  };

  const getTotalResources = () => {
    return (resources as any[])?.length || 0;
  };

  const getCompletedCount = () => {
    return (resources as any[])?.filter(r => r.isCompleted || r.state === 'COMPLETED').length || 0;
  };

  const getArticleCount = () => {
    return (resources as any[])?.filter(r => r.type === ResourceType.ARTICLE).length || 0;
  };

  const getVideoCount = () => {
    return (resources as any[])?.filter(r => r.type === ResourceType.VIDEO).length || 0;
  };

  const completionRate = getTotalResources() > 0
    ? Math.round((getCompletedCount() / getTotalResources()) * 100)
    : 0;

  const selectedMonthData = months.find(m => m.id === selectedMonth);

  const handleResourceClick = (resource: any, session: any) => {
    const unlocked = isResourceUnlocked(resource, session);
    if (!unlocked) return;
    if (resource.type === ResourceType.VIDEO) {
      setVideoDialog({ open: true, resource });
    } else if (resource.type === ResourceType.ARTICLE) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Your Career Development Curriculum</h1>
              <p className="text-lg text-gray-600 max-w-4xl mt-2">
                A comprehensive program covering foundations, positioning, excellence, and global readiness.
              </p>
            </div>
            {isAdmin && (
              <Link href="/dashboard/admin/resources">
                <Button>Manage Resources</Button>
              </Link>
            )}
            {isFacilitator && (
              <Link href="/dashboard/facilitator/resources">
                <Button>Manage Resources</Button>
              </Link>
            )}
          </div>

          {/* Admin Cohort Selector */}
          {isAdmin && (
            <div>
              <Label htmlFor="cohort-select" className="text-sm font-medium text-gray-900 mb-2 block">Select Cohort</Label>
              <select
                id="cohort-select"
                className="w-full max-w-md p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                value={adminSelectedCohortId}
                onChange={e => {
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

          {/* Stats */}
          {userCohortId && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                      <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
                    </div>
                    <Calendar className="h-10 w-10 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Resources</p>
                      <p className="text-3xl font-bold text-gray-900">{getTotalResources()}</p>
                    </div>
                    <FileText className="h-10 w-10 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Articles</p>
                      <p className="text-3xl font-bold text-gray-900">{getArticleCount()}</p>
                    </div>
                    <FileText className="h-10 w-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Videos</p>
                      <p className="text-3xl font-bold text-gray-900">{getVideoCount()}</p>
                    </div>
                    <Video className="h-10 w-10 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Fellow Progress Bar */}
          {isFellow && userCohortId && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">Your Progress</span>
                    <span className="font-semibold text-blue-700">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2 bg-gray-200" />
                  <p className="text-xs text-gray-600">
                    {getCompletedCount()} of {getTotalResources()} resources completed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* No cohort message */}
        {!userCohortId && !isAdmin && (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No cohort assigned</p>
            <p className="text-sm mt-1">Please contact your administrator to be assigned to a cohort.</p>
          </div>
        )}

        {/* No cohort selected message for admin */}
        {isAdmin && !adminSelectedCohortId && (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Select a cohort to view resources</p>
          </div>
        )}

        {userCohortId && months.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Months */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">CURRICULUM</h2>
              {months.map((month) => {
                const Icon = month.icon;
                return (
                  <Card
                    key={month.id}
                    className={`cursor-pointer transition-all ${
                      selectedMonth === month.id
                        ? "bg-blue-100 border-blue-300 shadow-md"
                        : "bg-white hover:shadow-md"
                    }`}
                    onClick={() => {
                      setSelectedMonth(month.id);
                      setSelectedSession(null);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${selectedMonth === month.id ? "text-blue-700" : "text-gray-600"}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${selectedMonth === month.id ? "text-blue-900" : "text-gray-900"}`}>
                            {month.number}
                          </p>
                          <p className={`text-xs ${selectedMonth === month.id ? "text-blue-700" : "text-gray-500"}`}>
                            {month.sessions.length} Sessions
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Main Content - Sessions and Resources */}
            <div className="lg:col-span-3 space-y-6">
              {selectedMonthData && (
                <>
                  {/* Month Header */}
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold mb-2 text-gray-900">{selectedMonthData.number}</h2>
                          <p className="text-blue-700 text-sm uppercase tracking-wide mb-1 font-semibold">
                            {selectedMonthData.title}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-lg px-4 py-2">
                          {selectedMonthData.sessions.length} Sessions
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sessions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedMonthData.sessions.map((session: any) => {
                      const sessionResources = getSessionResources(session.id);
                      const isUnlocked = isAdmin || isFacilitator || new Date() >= new Date(session.unlockDate);
                      const isExpanded = selectedSession === session.id;

                      return (
                        <Card
                          key={session.id}
                          className={`cursor-pointer transition-all ${
                            isExpanded ? "ring-2 ring-blue-600" : ""
                          } ${!isUnlocked && !isAdmin && !isFacilitator ? "opacity-60" : ""}`}
                          onClick={() => setSelectedSession(isExpanded ? null : session.id)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">Session {session.sessionNumber}</Badge>
                                  {!isUnlocked && !isAdmin && !isFacilitator && <Lock className="h-4 w-4 text-gray-400" />}
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-2 leading-tight">{session.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(session.scheduledDate)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span>{sessionResources.length} resources</span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </div>

                            {/* Resource dots indicator */}
                            <div className="flex gap-1 mt-3">
                              {sessionResources.slice(0, 3).map((_, i) => (
                                <div key={i} className="h-2 w-2 rounded-full bg-blue-600"></div>
                              ))}
                              {sessionResources.length > 3 && (
                                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                              )}
                            </div>

                            {/* Admin/Facilitator: Edit Session */}
                            {(isAdmin || isFacilitator) && (
                              <div className="mt-4 pt-4 border-t">
                                <Link
                                  href={isAdmin ? `/dashboard/admin/resources?editSession=${session.sessionNumber}` : `/dashboard/facilitator/resources?editSession=${session.sessionNumber}`}
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit Session Date
                                </Link>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Selected Session Resources */}
                  {selectedSession && (
                    <Card className="mt-6">
                      <CardContent className="p-6">
                        {(() => {
                          const currentSession = sessions.find((s: any) => s.id === selectedSession);
                          const sessionResources = getSessionResources(selectedSession);
                          return (
                            <>
                              <div className="flex items-center justify-between mb-6">
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                                    Session {currentSession?.sessionNumber} Resources
                                  </h3>
                                  <p className="text-gray-600">{currentSession?.title}</p>
                                </div>
                                <Badge variant="outline">
                                  {sessionResources.length} Items
                                </Badge>
                              </div>

                              {/* Search and Filter */}
                              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input
                                    placeholder="Search resources..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant={filterType === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilterType("all")}
                                  >
                                    All
                                  </Button>
                                  <Button
                                    variant={filterType === "article" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilterType("article")}
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Articles
                                  </Button>
                                  <Button
                                    variant={filterType === "video" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilterType("video")}
                                  >
                                    <Video className="h-4 w-4 mr-1" />
                                    Videos
                                  </Button>
                                </div>
                              </div>

                              {/* Resources List */}
                              <div className="space-y-3">
                                {sessionResources.map((resource: any) => {
                                  const isUnlocked = currentSession && isResourceUnlocked(resource, currentSession);

                                  return (
                                    <div
                                      key={resource.id}
                                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                                        isUnlocked
                                          ? "bg-white hover:bg-gray-50 cursor-pointer"
                                          : "bg-gray-50 opacity-60"
                                      }`}
                                      onClick={() => currentSession && handleResourceClick(resource, currentSession)}
                                    >
                                      <div className={`p-3 rounded-lg ${
                                        resource.type === ResourceType.VIDEO ? "bg-red-50" : "bg-blue-50"
                                      }`}>
                                        {isUnlocked ? (
                                          resource.type === ResourceType.VIDEO ? (
                                            <Video className="h-5 w-5 text-red-600" />
                                          ) : (
                                            <FileText className="h-5 w-5 text-blue-600" />
                                          )
                                        ) : (
                                          <Lock className="h-5 w-5 text-gray-400" />
                                        )}
                                      </div>

                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          {resource.isCore && (
                                            <Badge variant="default" className="text-xs">Core {resource.type === ResourceType.VIDEO ? "Video" : "Article"}</Badge>
                                          )}
                                          {!resource.isCore && (
                                            <Badge variant="outline" className="text-xs">Optional {resource.type === ResourceType.VIDEO ? "Video" : "Article"}</Badge>
                                          )}
                                          {(resource.isCompleted || resource.state === 'COMPLETED') && (
                                            <Badge variant="secondary" className="text-xs">Completed</Badge>
                                          )}
                                        </div>
                                        <h4 className="font-semibold text-gray-900">{resource.title}</h4>
                                        {resource.description && (
                                          <p className="text-sm text-gray-600 line-clamp-1 mt-1">{resource.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                          {resource.estimatedMinutes && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              <span>{resource.estimatedMinutes} min</span>
                                            </div>
                                          )}
                                          {resource.pointValue && (
                                            <div className="flex items-center gap-1">
                                              <Award className="h-3 w-3" />
                                              <span>{resource.pointValue} points</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {(isAdmin || isFacilitator) && (
                                        <div className="flex items-center gap-2">
                                          {!isUnlocked && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setUnlockDialog({ open: true, resource });
                                              }}
                                              className="flex items-center gap-1 text-green-600 hover:text-green-700 border-green-200"
                                            >
                                              <Unlock className="h-3 w-3" />
                                              Unlock
                                            </Button>
                                          )}
                                          <Link
                                            href={isAdmin ? `/dashboard/admin/resources?edit=${resource.id}` : `/dashboard/facilitator/resources?edit=${resource.id}`}
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Edit className="h-3 w-3" />
                                            Edit
                                          </Link>
                                        </div>
                                      )}

                                      {isUnlocked && !isAdmin && !isFacilitator && (
                                        resource.type === ResourceType.VIDEO ? (
                                          <Video className="h-5 w-5 text-gray-400" />
                                        ) : (
                                          <ExternalLink className="h-5 w-5 text-gray-400" />
                                        )
                                      )}
                                    </div>
                                  );
                                })}

                                {sessionResources.length === 0 && (
                                  <div className="text-center py-8 text-gray-500">
                                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p>No resources found</p>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {userCohortId && sessions.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No sessions found for this cohort</p>
            <p className="text-sm mt-1">Sessions need to be created first.</p>
          </div>
        )}

        {/* Video Dialog */}
        <Dialog open={videoDialog.open} onOpenChange={(open) => setVideoDialog({ open })}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{videoDialog.resource?.title}</DialogTitle>
            </DialogHeader>
            {videoDialog.resource && (
              <div className="space-y-4">
                {videoDialog.resource.description && (
                  <p className="text-sm text-gray-600">{videoDialog.resource.description}</p>
                )}
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={getVideoEmbedUrl(videoDialog.resource.url) || ""}
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    {videoDialog.resource.estimatedMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{videoDialog.resource.estimatedMinutes} min</span>
                      </div>
                    )}
                    {videoDialog.resource.pointValue && (
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        <span>{videoDialog.resource.pointValue} points</span>
                      </div>
                    )}
                  </div>
                  <Button onClick={() => setVideoDialog({ open: false })}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Admin Unlock Dialog */}
        <Dialog open={unlockDialog.open} onOpenChange={(open) => setUnlockDialog({ open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manually Unlock Resource</DialogTitle>
            </DialogHeader>
            {unlockDialog.resource && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{unlockDialog.resource.title}</p>
                  <p className="text-xs text-gray-600">
                    Select a user to manually unlock this resource for them, bypassing the 5-day rule.
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700">Select User:</p>
                  {users?.users?.map((user: any) => (
                    <Button
                      key={user.id}
                      variant="outline"
                      className="w-full justify-start text-left"
                      onClick={() => {
                        adminUnlock.mutate({
                          userId: user.id,
                          resourceId: unlockDialog.resource.id
                        });
                        setUnlockDialog({ open: false });
                      }}
                      disabled={adminUnlock.isPending}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{user.firstName} {user.lastName}</span>
                        <span className="text-xs text-gray-500">{user.email} - {user.role}</span>
                      </div>
                    </Button>
                  ))}
                  {(!users?.users || users.users.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">No fellows or facilitators found</p>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setUnlockDialog({ open: false })}
                  className="w-full"
                >
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
