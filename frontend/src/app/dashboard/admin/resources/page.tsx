"use client";

import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Video, FileText, Edit, Trash2, Search, RefreshCw, 
  ExternalLink, Save, X 
} from "lucide-react";
import { useProfile } from "@/hooks/api/useProfile";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCohorts, useAdminResources, useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/api/useAdmin";
import { ResourceType } from "@/types/api";
import { BookOpen, Target, Globe, Lightbulb } from "lucide-react";
import { format } from "date-fns";

export default function ResourceManagementPage() {
    const createResourceMutation = useCreateResource();
    const deleteResourceMutation = useDeleteResource();
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Fetch cohorts
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];


  // Curriculum structure (copied from Resources (View) page)
  const CURRICULUM = {
    months: [
      {
        id: 1,
        number: "Month 1",
        title: "FOUNDATIONS: SELF, OWNERSHIP & COMMUNICATION",
        theme: "Mindset, professionalism, and how work really gets done",
        icon: BookOpen,
        color: "blue",
        sessions: [
          { sessionNumber: 1, title: "Ownership Mindset & Leadership at Work", date: "2026-04-11", unlockDate: "2026-04-06" },
          { sessionNumber: 2, title: "Goal Setting & Time Management", date: "2026-04-18", unlockDate: "2026-04-13" },
          { sessionNumber: 3, title: "Effective Communication Skills", date: "2026-04-25", unlockDate: "2026-04-20" },
          { sessionNumber: 4, title: "Storytelling: Leading Early - Growth Without a Title", date: "2026-05-02", unlockDate: "2026-04-27" },
        ],
      },
      {
        id: 2,
        number: "Month 2",
        title: "CAREER POSITIONING & PROFESSIONAL IDENTITY",
        theme: "Direction, collaboration, and execution in today's workplace",
        icon: Target,
        color: "purple",
        sessions: [
          { sessionNumber: 5, title: "Career Exploration, Goal Setting & Path Design", date: "2026-05-09", unlockDate: "2026-05-04" },
          { sessionNumber: 6, title: "Remote, Hybrid & Cross-Cultural Collaboration", date: "2026-05-16", unlockDate: "2026-05-11" },
          { sessionNumber: 7, title: "Execution at Work: From Tasks to Impact", date: "2026-05-23", unlockDate: "2026-05-18" },
          { sessionNumber: 8, title: "Storytelling: Rejection, Redirection & Career Pivots", date: "2026-05-30", unlockDate: "2026-05-25" },
        ],
      },
      {
        id: 3,
        number: "Month 3",
        title: "VISIBILITY, OPPORTUNITY & CAREER GROWTH",
        theme: "Positioning, opportunity access, and long-term relevance",
        icon: Globe,
        color: "green",
        sessions: [
          { sessionNumber: 9, title: "Digital Personal Branding & Strategic Networking", date: "2026-06-06", unlockDate: "2026-06-01" },
          { sessionNumber: 10, title: "Resume Writing & Interview Preparation", date: "2026-06-13", unlockDate: "2026-06-08" },
          { sessionNumber: 11, title: "Modern Job Search & Opportunity Discovery", date: "2026-06-20", unlockDate: "2026-06-15" },
          { sessionNumber: 12, title: "Storytelling: Building a Global Career from Africa", date: "2026-06-27", unlockDate: "2026-06-22" },
        ],
      },
      {
        id: 4,
        number: "Month 4",
        title: "SUSTAINABILITY, INNOVATION & FUTURE READINESS",
        theme: "Staying relevant, resilient, and prepared for long-term growth",
        icon: Lightbulb,
        color: "orange",
        sessions: [
          { sessionNumber: 13, title: "AI for the Workplace", date: "2026-07-04", unlockDate: "2026-06-29" },
          { sessionNumber: 14, title: "Critical Thinking & Problem-Solving", date: "2026-07-11", unlockDate: "2026-07-06" },
          { sessionNumber: 15, title: "Design Thinking for Career & Workplace Innovation", date: "2026-07-18", unlockDate: "2026-07-13" },
          { sessionNumber: 16, title: "Storytelling: Sustaining Growth: Learning, Money & Career Longevity", date: "2026-07-25", unlockDate: "2026-07-20" },
        ],
      },
    ],
  };

  // Helper: get resources for a session number
  const getSessionResources = (sessionNumber: number) => {
    if (!resources) return [];
    return (resources as any[]).filter(r => r.session?.sessionNumber === sessionNumber);
  };

  // Fetch all resources for selected cohort
  // Fetch all resources (filter by cohort in display logic)
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useAdminResources({
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: searchQuery || undefined,
  });
  const resources = Array.isArray(resourcesData) ? resourcesData : [] as any[];

  // Lock/unlock handler for resources
  const updateResourceMutation = useUpdateResource();
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
    if (!profileLoading && profile && profile.role !== 'ADMIN' && profile.role !== 'FACILITATOR') {
      router.replace('/dashboard');
    }
  }, [profile, profileLoading, router]);
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
  // File upload state
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

  const handleAddResource = () => {
    resetForm();
    setEditingResource(null);
    setIsAddDialogOpen(true);
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
        // Upload file to backend (assume /api/upload returns a URL)
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
        // Update existing resource
        await updateResourceMutation.mutateAsync({
          resourceId: editingResource.id,
          data: formData,
        });
      } else {
        // Create new resource
        // Prompt admin to select a session, or default to sessionNumber 1
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

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.VIDEO:
        return <Video className="h-5 w-5 text-orange-600" />;
      case ResourceType.ARTICLE:
        return <FileText className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  // No selectedSession in new UI

  if (profileLoading || !profile) return null;
  if (profile.role !== 'ADMIN' && profile.role !== 'FACILITATOR') return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
            <p className="text-gray-600 mt-1">Manage all learning resources by cohort, session, and resource. Add, edit, or delete resources easily.</p>
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
        {/* Session Cards with resources listed under each */}
        {selectedCohortId && (
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-900 mb-2 block">Sessions</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CURRICULUM.months.flatMap(month => month.sessions).map((session) => {
                const sessionResources = getSessionResources(session.sessionNumber);
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
                      {resourcesLoading ? (
                        <div className="p-4 text-center text-gray-600">Loading resources...</div>
                      ) : sessionResources.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-xs">No resources for this session.</div>
                      ) : (
                        <div className="space-y-2">
                          {sessionResources.map((resource: any) => (
                            <Card key={resource.id} className="shadow border border-gray-200 flex flex-col">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2 mb-2">
                                  {getResourceIcon(resource.type)}
                                  <span className="text-base font-semibold text-gray-900 capitalize">{resource.title}</span>
                                </div>
                                <CardDescription className="mb-1 text-xs text-gray-500">
                                  {resource.description || 'No description'}
                                </CardDescription>
                                <div className="flex flex-wrap gap-2 text-xs mt-2">
                                  <Badge className={resource.isCore ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                                    {resource.isCore ? 'Core' : 'Optional'}
                                  </Badge>
                                  <span className="text-gray-500">{resource.type}</span>
                                  <span className="text-gray-500">{resource.estimatedMinutes || resource.duration || 0} min</span>
                                  <span className="text-gray-500">{resource.pointValue} pts</span>
                                  <Button size="sm" variant="outline" onClick={() => handleToggleLock(resource)}>
                                    {resource.state === 'LOCKED' ? 'Unlock' : 'Lock'}
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="flex-1 flex flex-col justify-between">
                                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs break-all">
                                  {resource.url}
                                </a>
                              </CardContent>
                              <CardFooter className="flex gap-2 justify-end border-t pt-3">
                                <Button size="sm" variant="outline" onClick={() => handleEditResource(resource)}>
                                  <Edit className="h-4 w-4" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteResource(resource.id)}>
                                  <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-end mt-2">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => {
                          setSelectedSessionId(String(session.sessionNumber));
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
                    <strong>Note:</strong> This resource will be available to Fellows <strong>5 days before</strong> the session's scheduled date. Admins and facilitators can always access it.
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
