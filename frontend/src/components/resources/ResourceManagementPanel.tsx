"use client";

import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Video, FileText, Edit, Trash2, RefreshCw, Save, X,
  Lock, Unlock, ChevronDown, ChevronRight, Clock, Star, Search,
  BookOpen, Calendar, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useProfile } from "@/hooks/api/useProfile";
import { apiClient } from "@/lib/api-client";
import {
  useCohorts, useSessions, useAdminResources,
  useCreateResource, useUpdateResource, useDeleteResource,
} from "@/hooks/api/useAdmin";
import { ResourceType } from "@/types/api";
import { format, differenceInDays, isPast } from "date-fns";

interface ResourceManagementPanelProps {
  role: "ADMIN" | "FACILITATOR";
}

function getLockStatus(session: any, resource: any) {
  const now = new Date();
  const unlockDate = session?.unlockDate ? new Date(session.unlockDate) : null;
  const scheduledDate = session?.scheduledDate ? new Date(session.scheduledDate) : null;
  const autoUnlocked = unlockDate ? now >= unlockDate : false;
  const daysUntilUnlock = unlockDate && !autoUnlocked ? differenceInDays(unlockDate, now) : null;

  // Manual unlock overrides everything
  if (resource?.state === "UNLOCKED") {
    return {
      locked: false,
      label: "Unlocked",
      reason: autoUnlocked ? "Auto + manual" : "Manually unlocked",
      color: "text-emerald-600",
    };
  }

  // resource.state === "LOCKED" (default or manual re-lock)
  if (autoUnlocked) {
    // Session date window passed - fellows see this as unlocked via auto-rule
    return {
      locked: false,
      label: "Auto-unlocked",
      reason: scheduledDate && isPast(scheduledDate) ? "Session passed" : "5-day window",
      color: "text-emerald-600",
    };
  }

  return {
    locked: true,
    label: "Locked",
    reason: daysUntilUnlock !== null
      ? daysUntilUnlock > 0 ? `Auto-unlocks in ${daysUntilUnlock}d` : "Unlocking soon"
      : "No unlock date set",
    color: daysUntilUnlock !== null ? "text-amber-600" : "text-gray-500",
  };
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  VIDEO: <Video className="h-3.5 w-3.5" />,
  ARTICLE: <FileText className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  VIDEO: "bg-purple-50 text-purple-700 border-purple-200",
  ARTICLE: "bg-blue-50 text-blue-700 border-blue-200",
};

export function ResourceManagementPanel({ role }: ResourceManagementPanelProps) {
  const createResourceMutation = useCreateResource();
  const deleteResourceMutation = useDeleteResource();
  const updateResourceMutation = useUpdateResource();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set([1]));

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(selectedCohortId || undefined);
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useAdminResources({
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: searchQuery || undefined,
    cohortId: selectedCohortId || undefined,
    limit: 200,
  });
  const resources: any[] = (resourcesData as any)?.data || [];

  // Group resources by session ID
  const resourcesBySession: Record<string, any[]> = {};
  resources.forEach((r: any) => {
    const sid = r.sessionId || r.session?.id;
    if (sid) {
      if (!resourcesBySession[sid]) resourcesBySession[sid] = [];
      resourcesBySession[sid].push(r);
    }
  });

  // Group sessions by month (4 per month)
  const sessionsByMonth: Record<number, any[]> = {};
  sessions.forEach((s: any) => {
    const month = Math.ceil(s.sessionNumber / 4);
    if (!sessionsByMonth[month]) sessionsByMonth[month] = [];
    sessionsByMonth[month].push(s);
  });
  const months = Object.keys(sessionsByMonth).map(Number).sort((a, b) => a - b);

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleMonth = (m: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  };

  const handleToggleLock = async (resource: any, isCurrentlyLocked: boolean) => {
    const newState = isCurrentlyLocked ? "UNLOCKED" : "LOCKED";
    try {
      await apiClient.patch(`/admin/resources/${resource.id}/lock`, { state: newState });
      refetchResources();
    } catch (err) {
      console.error("Failed to toggle lock:", err);
    }
  };

  const { data: profile, isLoading: profileLoading } = useProfile();

  // Form state
  const [formData, setFormData] = useState({
    type: ResourceType.VIDEO,
    title: "",
    description: "",
    url: "",
    duration: 0,
    estimatedMinutes: 10,
    isCore: true,
    pointValue: 100,
    order: 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      type: ResourceType.VIDEO,
      title: "",
      description: "",
      url: "",
      duration: 0,
      estimatedMinutes: 10,
      isCore: true,
      pointValue: 100,
      order: 1,
    });
    setFile(null);
  };

  const handleEditResource = (resource: any) => {
    setFormData({
      type: resource.type,
      title: resource.title,
      description: resource.description || "",
      url: resource.url,
      duration: resource.duration || 0,
      estimatedMinutes: resource.estimatedMinutes || 10,
      isCore: resource.isCore,
      pointValue: resource.pointValue,
      order: resource.order,
    });
    setEditingResource(resource);
    setIsFormOpen(true);
  };

  const handleSaveResource = async () => {
    try {
      let urlToUse = formData.url;
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          alert("File size exceeds 50MB limit.");
          return;
        }
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!uploadRes.ok) throw new Error("File upload failed");
        const { url } = await uploadRes.json();
        urlToUse = url;
      }

      if (editingResource) {
        await updateResourceMutation.mutateAsync({
          resourceId: editingResource.id,
          data: { ...formData, url: urlToUse },
        });
      } else {
        if (!selectedSessionId) {
          alert("Please select a session first by clicking 'Add Resource' on a session card.");
          return;
        }
        await createResourceMutation.mutateAsync({ ...formData, url: urlToUse, sessionId: selectedSessionId });
      }
      setIsFormOpen(false);
      setEditingResource(null);
      resetForm();
      refetchResources();
    } catch (error) {
      console.error("Failed to save resource:", error);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      try {
        await deleteResourceMutation.mutateAsync(resourceId);
        refetchResources();
      } catch (error) {
        console.error("Failed to delete resource:", error);
      }
    }
  };

  if (profileLoading || !profile) return null;
  if (profile.role !== role) return null;

  const isLoading = sessionsLoading || resourcesLoading;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resource Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {role === "ADMIN" ? "Manage all cohort learning resources" : "Manage resources for your cohort"}
              </p>
            </div>
            <Button onClick={() => refetchResources()} variant="outline" size="sm" className="self-start sm:self-auto">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          {/* Cohort + Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="cohort-select" className="text-xs font-medium text-gray-700 mb-1.5 block">
                Cohort
              </Label>
              <select
                id="cohort-select"
                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCohortId}
                onChange={e => { setSelectedCohortId(e.target.value); setSelectedSessionId(""); }}
                disabled={cohortsLoading}
              >
                <option value="">-- Select a cohort --</option>
                {cohorts.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.startDate ? ` (${format(new Date(c.startDate), "MMM yyyy")})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 sm:mt-5">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none sm:w-48">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              {/* Type filter */}
              <select
                className="h-9 px-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="VIDEO">Video</option>
                <option value="ARTICLE">Article</option>
              </select>
            </div>
          </div>

          {/* Lock rule info banner */}
          {selectedCohortId && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span>
                Resources are <strong>locked by default</strong>. They auto-unlock 5 days before each session's scheduled date.
                Admins and facilitators can manually lock or unlock any resource at any time.
              </span>
            </div>
          )}

          {/* Sessions content */}
          {!selectedCohortId && (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a cohort to view and manage resources</p>
            </div>
          )}

          {selectedCohortId && isLoading && (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading sessions and resources...</p>
            </div>
          )}

          {selectedCohortId && !isLoading && sessions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No sessions found for this cohort.</p>
            </div>
          )}

          {selectedCohortId && !isLoading && months.map(month => {
            const monthSessions = sessionsByMonth[month] || [];
            const isMonthOpen = expandedMonths.has(month);
            const monthResourceCount = monthSessions.reduce((acc, s) => acc + (resourcesBySession[s.id]?.length || 0), 0);

            return (
              <div key={month} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shrink-0">
                      {month}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Month {month}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {monthSessions.length} sessions · {monthResourceCount} resources
                      </span>
                    </div>
                  </div>
                  {isMonthOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                </button>

                {isMonthOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {monthSessions.map((session: any) => {
                      const sessionResources = resourcesBySession[session.id] || [];
                      const isSessionOpen = expandedSessions.has(session.id);
                      const unlockDate = session.unlockDate ? new Date(session.unlockDate) : null;
                      const scheduledDate = session.scheduledDate ? new Date(session.scheduledDate) : null;
                      const now = new Date();
                      const autoUnlocked = unlockDate ? now >= unlockDate : false;
                      const sessionPassed = scheduledDate ? isPast(scheduledDate) : false;
                      const daysUntilUnlock = unlockDate && !autoUnlocked ? differenceInDays(unlockDate, now) : null;

                      return (
                        <div key={session.id}>
                          {/* Session row */}
                          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <button
                              onClick={() => toggleSession(session.id)}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                              {isSessionOpen ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              )}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-800 truncate">
                                  Session {session.sessionNumber}: {session.title}
                                </span>
                                <Badge variant="outline" className="text-xs shrink-0 hidden sm:flex">
                                  {sessionResources.length} resources
                                </Badge>
                              </div>
                            </button>

                            {/* Session meta */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                              {scheduledDate && (
                                <span className="hidden md:inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(scheduledDate, "MMM d")}
                                </span>
                              )}
                              {autoUnlocked ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {sessionPassed ? "Passed" : "Unlocked"}
                                </span>
                              ) : daysUntilUnlock !== null ? (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <Clock className="h-3.5 w-3.5" />
                                  {daysUntilUnlock}d
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400">
                                  <Lock className="h-3.5 w-3.5" />
                                  Locked
                                </span>
                              )}
                            </div>

                            <Button
                              size="sm"
                              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                              onClick={() => {
                                setSelectedSessionId(session.id);
                                resetForm();
                                setEditingResource(null);
                                setIsFormOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Add</span>
                            </Button>
                          </div>

                          {/* Resources list */}
                          {isSessionOpen && (
                            <div className="px-5 py-3 space-y-2">
                              {sessionResources.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-xs border border-dashed border-gray-200 rounded-lg">
                                  No resources yet. Click <strong>Add</strong> to add one.
                                </div>
                              ) : (
                                sessionResources.map((resource: any) => {
                                  const lockStatus = getLockStatus(session, resource);
                                  return (
                                    <div
                                      key={resource.id}
                                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
                                    >
                                      {/* Resource info */}
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <div className={`mt-0.5 p-1 rounded border ${TYPE_COLORS[resource.type] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                          {TYPE_ICONS[resource.type] || <FileText className="h-3.5 w-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium text-gray-900 text-sm truncate max-w-[200px] sm:max-w-none">
                                              {resource.title}
                                            </span>
                                            {resource.isCore && (
                                              <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 border h-5">
                                                <Star className="h-2.5 w-2.5 mr-0.5" />Core
                                              </Badge>
                                            )}
                                            <Badge className={`text-xs border h-5 ${lockStatus.locked ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                                              {lockStatus.locked ? <Lock className="h-2.5 w-2.5 mr-0.5" /> : <Unlock className="h-2.5 w-2.5 mr-0.5" />}
                                              {lockStatus.label}
                                            </Badge>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-gray-400">
                                            <span>{resource.estimatedMinutes} min</span>
                                            <span>{resource.pointValue} pts</span>
                                            <span className={lockStatus.color}>{lockStatus.reason}</span>
                                            {resource.url && (
                                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                View
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className={`h-7 text-xs ${lockStatus.locked ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-red-500 border-red-200 hover:bg-red-50"}`}
                                          onClick={() => handleToggleLock(resource, lockStatus.locked)}
                                          disabled={updateResourceMutation.isPending}
                                        >
                                          {lockStatus.locked ? (
                                            <><Unlock className="h-3 w-3 mr-1" />Unlock</>
                                          ) : (
                                            <><Lock className="h-3 w-3 mr-1" />Lock</>
                                          )}
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleEditResource(resource)}>
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 border-red-200" onClick={() => handleDeleteResource(resource.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <Card className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-xl rounded-t-2xl rounded-b-none">
            <CardHeader className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">
                  {editingResource ? "Edit Resource" : "Add Resource"}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setIsFormOpen(false); setEditingResource(null); resetForm(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {!editingResource && selectedSessionId && sessions.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Adding to: <strong>{sessions.find((s: any) => s.id === selectedSessionId)?.title || "Selected session"}</strong>
                </p>
              )}
            </CardHeader>

            <CardContent className="px-5 py-4 space-y-4">
              {/* Type */}
              <div className="grid grid-cols-2 gap-2">
                {(["VIDEO", "ARTICLE"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFormData(d => ({ ...d, type: t as ResourceType }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${formData.type === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    {t === "VIDEO" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    {t === "VIDEO" ? "Video" : "Article"}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Title *</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
                  placeholder="Resource title"
                  className="h-9 text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Description</Label>
                <textarea
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[72px]"
                  value={formData.description}
                  onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Brief description of this resource"
                />
              </div>

              {/* URL */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1.5 block">URL</Label>
                <Input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData(d => ({ ...d, url: e.target.value }))}
                  placeholder={formData.type === "VIDEO" ? "https://youtube.com/..." : "https://example.com/article"}
                  className="h-9 text-sm"
                />
              </div>

              {/* File upload */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Or upload file (max 50MB)</Label>
                <Input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.mp3,.wav"
                  className="text-xs h-9"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f) setFormData(d => ({ ...d, url: f.name }));
                  }}
                />
                {file && (
                  <p className="text-xs text-gray-500 mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
                )}
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Est. Minutes</Label>
                  <Input
                    type="number" min="1"
                    value={formData.estimatedMinutes}
                    onChange={e => setFormData(d => ({ ...d, estimatedMinutes: parseInt(e.target.value) || 10 }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Points</Label>
                  <Input
                    type="number" min="0"
                    value={formData.pointValue}
                    onChange={e => setFormData(d => ({ ...d, pointValue: parseInt(e.target.value) || 0 }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Order</Label>
                  <Input
                    type="number" min="1"
                    value={formData.order}
                    onChange={e => setFormData(d => ({ ...d, order: parseInt(e.target.value) || 1 }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Core toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-800">Core Resource</p>
                  <p className="text-xs text-gray-500">Required for fellows to complete</p>
                </div>
                <button
                  onClick={() => setFormData(d => ({ ...d, isCore: !d.isCore }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${formData.isCore ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.isCore ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <Lock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>New resources are <strong>locked by default</strong>. They auto-unlock 5 days before the session date or can be manually unlocked.</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-sm"
                  onClick={() => { setIsFormOpen(false); setEditingResource(null); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSaveResource}
                  disabled={!formData.title || !formData.url || createResourceMutation.isPending || updateResourceMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {editingResource ? "Save Changes" : "Create Resource"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
