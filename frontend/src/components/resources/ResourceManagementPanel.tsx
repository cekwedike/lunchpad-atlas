"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, FileText, Edit, Trash2, RefreshCw, Save, X } from "lucide-react";
import { useProfile } from "@/hooks/api/useProfile";
import { useRouter } from "next/navigation";
import { useCohorts, useAdminResources, useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/api/useAdmin";
import { ResourceType } from "@/types/api";
import { format } from "date-fns";

interface ResourceManagementPanelProps {
  role: 'ADMIN' | 'FACILITATOR';
}

const ROLE_CONFIG = {
  ADMIN: {
    title: "Resource Management",
    description: "Manage all learning resources by cohort, session, and resource. Add, edit, or delete resources easily.",
    note: "This resource will be available to Fellows 5 days before the session's scheduled date. Admins and facilitators can always access it.",
  },
  FACILITATOR: {
    title: "Resource Management (Facilitator)",
    description: "Manage learning resources for your assigned cohort. Add, edit, or delete resources easily.",
    note: "This resource will be available to Fellows 5 days before the session's scheduled date. Facilitators can always access it.",
  },
};

export function ResourceManagementPanel({ role }: ResourceManagementPanelProps) {
  const config = ROLE_CONFIG[role];
  const createResourceMutation = useCreateResource();
  const deleteResourceMutation = useDeleteResource();
  const updateResourceMutation = useUpdateResource();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  // Fetch curriculum from backend for selected cohort
  const [curriculum, setCurriculum] = useState<any>(null);
  useEffect(() => {
    async function fetchCurriculum() {
      if (!selectedCohortId) {
        setCurriculum(null);
        return;
      }
      const res = await fetch(`/api/curricula/${selectedCohortId}`);
      if (res.ok) {
        const data = await res.json();
        setCurriculum(data);
      } else {
        setCurriculum(null);
      }
    }
    fetchCurriculum();
  }, [selectedCohortId]);

  // Fetch resources for selected cohort
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useAdminResources({
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: searchQuery || undefined,
    cohortId: selectedCohortId || undefined,
  });
  const resources = Array.isArray(resourcesData) ? resourcesData : [] as any[];

  // Group resources by sessionNumber
  const resourcesBySession: { [sessionNumber: string]: any[] } = {};
  resources.forEach((resource: any) => {
    const sessionNumber = resource.session?.sessionNumber || resource.sessionNumber || resource.sessionId;
    if (!resourcesBySession[sessionNumber]) resourcesBySession[sessionNumber] = [];
    resourcesBySession[sessionNumber].push(resource);
  });

  const handleToggleLock = async (resource: any) => {
    try {
      await updateResourceMutation.mutateAsync({
        resourceId: resource.id,
        data: { state: resource.state === 'LOCKED' ? 'UNLOCKED' : 'LOCKED' },
      });
      refetchResources();
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
  };

  const { data: profile, isLoading: profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!profileLoading && profile && profile.role !== role) {
      router.replace('/dashboard');
    }
  }, [profile, profileLoading, router, role]);

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
    setIsAddDialogOpen(true);
  };

  const handleSaveResource = async () => {
    try {
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          alert("File size exceeds 50MB limit.");
          return;
        }
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        if (!uploadRes.ok) throw new Error("File upload failed");
        const { url } = await uploadRes.json();
        formData.url = url;
      }
      if (editingResource) {
        await updateResourceMutation.mutateAsync({
          resourceId: editingResource.id,
          data: formData,
        });
      } else {
        const sessionNumber = selectedSessionId ? selectedSessionId : "1";
        await createResourceMutation.mutateAsync({ ...formData, sessionId: sessionNumber });
      }
      setIsAddDialogOpen(false);
      setEditingResource(null);
      resetForm();
      setFile(null);
      refetchResources();
    } catch (error) {
      console.error("Failed to save resource:", error);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (confirm("Are you sure you want to delete this resource? This action cannot be undone if no users have started it.")) {
      try {
        await deleteResourceMutation.mutateAsync(resourceId);
        refetchResources();
      } catch (error) {
        console.error("Failed to delete resource:", error);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingResource(null);
    resetForm();
  };

  if (profileLoading || !profile) return null;
  if (profile.role !== role) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
            <p className="text-gray-600 mt-1">{config.description}</p>
          </div>
          <Button onClick={() => refetchResources()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Cohort Selector */}
        <div className="mb-6">
          <Label htmlFor="cohort-select" className="text-sm font-medium text-gray-900 mb-2 block">Select Cohort</Label>
          <select
            id="cohort-select"
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            value={selectedCohortId}
            onChange={e => {
              setSelectedCohortId(e.target.value);
              setSelectedSessionId("");
            }}
            disabled={cohortsLoading}
          >
            <option value="">-- Select a cohort --</option>
            {cohorts.map((cohort: any) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} ({cohort.startDate ? format(new Date(cohort.startDate), "MMM yyyy") : ""})
              </option>
            ))}
          </select>
        </div>

        {/* Session Cards with resources */}
        {selectedCohortId && curriculum && (
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-900 mb-2 block">Sessions</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {curriculum.months.flatMap((month: any) => month.sessions).map((session: any) => {
                const sessionResources = resourcesBySession[session.sessionNumber] || [];
                return (
                  <Card key={session.sessionNumber} className="border-2 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-atlas-navy">Session {session.sessionNumber}: {session.title}</CardTitle>
                      <CardDescription className="text-xs text-gray-500">
                        {session.date ? format(new Date(session.date), "MMM dd, yyyy") : "No date"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-700 min-h-[24px] mb-2">
                        {sessionResources.length} resources
                      </div>
                      {sessionResources.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-xs">No resources for this session.</div>
                      ) : (
                        <div className="space-y-2">
                          {sessionResources.map((resource: any) => (
                            <div key={resource.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-all">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm mb-1 truncate">{resource.title}</div>
                                <div className="flex flex-wrap gap-2 items-center text-xs">
                                  <Badge className={resource.isCore ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                                    {resource.isCore ? 'Core' : 'Optional'}
                                  </Badge>
                                  <span className="text-gray-500">{resource.type}</span>
                                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open</a>
                                </div>
                              </div>
                              <Button size="sm" variant={resource.state === 'LOCKED' ? 'secondary' : 'outline'} className={resource.state === 'LOCKED' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700 border-green-300'} onClick={() => handleToggleLock(resource)}>
                                {resource.state === 'LOCKED' ? 'Unlock' : 'Lock'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleEditResource(resource)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteResource(resource.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-end mt-2">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => {
                          setSelectedSessionId(String(session.sessionNumber));
                          resetForm();
                          setEditingResource(null);
                          setIsAddDialogOpen(true);
                        }}>
                          <Plus className="h-4 w-4 mr-2" /> Add Resource
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        {isAddDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {editingResource ? "Edit Resource" : "Add New Resource"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Resource Type */}
                <div>
                  <Label htmlFor="resource-type" className="text-sm font-medium text-gray-900 mb-2 block">
                    Resource Type *
                  </Label>
                  <select
                    id="resource-type"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ResourceType })}
                  >
                    <option value={ResourceType.VIDEO}>Video</option>
                    <option value={ResourceType.ARTICLE}>Article</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.type === ResourceType.VIDEO
                      ? "Videos will be embedded on the platform via iframe"
                      : "Articles will open in a new tab"}
                  </p>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-900 mb-2 block">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter resource title"
                    className="bg-gray-50 border-gray-300"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-900 mb-2 block">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 min-h-[80px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter resource description"
                  />
                </div>

                {/* URL or File Upload */}
                <div>
                  <Label htmlFor="url" className="text-sm font-medium text-gray-900 mb-2 block">
                    URL (optional) or File Upload (optional, max 50MB)
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={formData.type === ResourceType.VIDEO ? "https://www.youtube.com/watch?v=..." : "https://example.com/article"}
                    className="bg-gray-50 border-gray-300"
                  />
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.csv,.jpg,.jpeg,.png,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.ogg"
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                      setFormData({ ...formData, url: f ? f.name : formData.url });
                    }}
                  />
                  {file && (
                    <div className="text-xs text-gray-700 mt-1">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                {/* Duration & Estimated Minutes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimatedMinutes" className="text-sm font-medium text-gray-900 mb-2 block">
                      Estimated Minutes *
                    </Label>
                    <Input
                      id="estimatedMinutes"
                      type="number"
                      min="1"
                      value={formData.estimatedMinutes}
                      onChange={(e) => setFormData({ ...formData, estimatedMinutes: parseInt(e.target.value) || 10 })}
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pointValue" className="text-sm font-medium text-gray-900 mb-2 block">
                      Point Value *
                    </Label>
                    <Input
                      id="pointValue"
                      type="number"
                      min="0"
                      value={formData.pointValue}
                      onChange={(e) => setFormData({ ...formData, pointValue: parseInt(e.target.value) || 0 })}
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>
                </div>

                {/* Order & Core Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order" className="text-sm font-medium text-gray-900 mb-2 block">
                      Display Order *
                    </Label>
                    <Input
                      id="order"
                      type="number"
                      min="1"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                      className="bg-gray-50 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="isCore" className="text-sm font-medium text-gray-900 mb-2 block">
                      Resource Status *
                    </Label>
                    <select
                      id="isCore"
                      className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                      value={formData.isCore ? "true" : "false"}
                      onChange={(e) => setFormData({ ...formData, isCore: e.target.value === "true" })}
                    >
                      <option value="true">Core (Required)</option>
                      <option value="false">Optional</option>
                    </select>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>Note:</strong> {config.note}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveResource}
                    disabled={
                      !formData.title ||
                      !formData.url ||
                      createResourceMutation.isPending ||
                      updateResourceMutation.isPending
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingResource ? "Update" : "Create"} Resource
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
