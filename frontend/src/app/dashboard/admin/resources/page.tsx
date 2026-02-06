"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Video, FileText, Edit, Trash2, Search, RefreshCw, 
  ExternalLink, Save, X, Calendar 
} from "lucide-react";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohorts, useSessions, useAdminResources, useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/api/useAdmin";
import { ResourceType } from "@/types/api";
import { format } from "date-fns";

export default function ResourceManagementPage() {
  const { data: profile } = useProfile();
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(selectedCohortId);
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useAdminResources({
    sessionId: selectedSessionId || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: searchQuery || undefined,
  });
  
  const resources = Array.isArray(resourcesData) ? resourcesData : [] as any[];

  const createResourceMutation = useCreateResource();
  const updateResourceMutation = useUpdateResource();
  const deleteResourceMutation = useDeleteResource();

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    sessionId: "",
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

  const resetForm = () => {
    setFormData({
      sessionId: selectedSessionId || "",
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
    if (!selectedSessionId) {
      alert("Please select a session first");
      return;
    }
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditResource = (resource: any) => {
    setFormData({
      sessionId: resource.sessionId,
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
      if (editingResource) {
        // Update existing resource
        await updateResourceMutation.mutateAsync({
          resourceId: editingResource.id,
          data: formData,
        });
      } else {
        // Create new resource
        await createResourceMutation.mutateAsync(formData);
      }
      setIsAddDialogOpen(false);
      setEditingResource(null);
      resetForm();
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

  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
            <p className="text-gray-600 mt-1">
              Add and manage learning resources for each session
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refetchResources()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleAddResource}
              disabled={!selectedSessionId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cohort Selector */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <Label htmlFor="cohort-select" className="text-sm font-medium text-gray-900 mb-2 block">
                Select Cohort
              </Label>
              <select
                id="cohort-select"
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                value={selectedCohortId}
                onChange={(e) => {
                  setSelectedCohortId(e.target.value);
                  setSelectedSessionId("");
                }}
                disabled={cohortsLoading}
              >
                <option value="">-- Select a cohort --</option>
                {cohorts?.map((cohort: any) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name} ({format(new Date(cohort.startDate), "MMM yyyy")})
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Session Selector */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <Label htmlFor="session-select" className="text-sm font-medium text-gray-900 mb-2 block">
                Select Session
              </Label>
              <select
                id="session-select"
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={!selectedCohortId || sessionsLoading}
              >
                <option value="">-- Select a session --</option>
                {sessions?.map((session: any) => (
                  <option key={session.id} value={session.id}>
                    Session {session.sessionNumber}: {session.title}
                  </option>
                ))}
              </select>
              {selectedSession && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-900">
                  <p>
                    <strong>Unlock Date:</strong>{" "}
                    {selectedSession.unlockDate 
                      ? format(new Date(selectedSession.unlockDate), "MMM dd, yyyy")
                      : "Not set"}{" "}
                    (5 days before session)
                  </p>
                  <p className="mt-1">
                    <strong>Session Date:</strong>{" "}
                    {selectedSession.scheduledDate
                      ? format(new Date(selectedSession.scheduledDate), "MMM dd, yyyy")
                      : "Not set"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {selectedSessionId && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-50 border-gray-300"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={typeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={typeFilter === ResourceType.VIDEO ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(ResourceType.VIDEO)}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    Videos
                  </Button>
                  <Button
                    variant={typeFilter === ResourceType.ARTICLE ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(ResourceType.ARTICLE)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Articles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resources Table */}
        {selectedSessionId && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Resources for {selectedSession?.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {resourcesLoading ? (
                <div className="p-8 text-center text-gray-600">Loading resources...</div>
              ) : resources.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          URL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {resources.map((resource: any) => (
                        <tr key={resource.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getResourceIcon(resource.type)}
                              <span className="text-sm font-medium text-gray-900">
                                {resource.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {resource.title}
                              </p>
                              {resource.description && (
                                <p className="text-xs text-gray-600 truncate">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <span className="max-w-[150px] truncate">{resource.url}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {resource.estimatedMinutes || resource.duration || 0} min
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {resource.pointValue}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={
                                resource.isCore
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }
                            >
                              {resource.isCore ? "Core" : "Optional"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditResource(resource)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteResource(resource.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-600">
                  No resources found for this session. Click "Add Resource" to create one.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Resource Dialog */}
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
                    <option value={ResourceType.EXERCISE}>Exercise</option>
                    <option value={ResourceType.QUIZ}>Quiz</option>
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

                {/* URL */}
                <div>
                  <Label htmlFor="url" className="text-sm font-medium text-gray-900 mb-2 block">
                    URL *
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={
                      formData.type === ResourceType.VIDEO
                        ? "https://www.youtube.com/watch?v=..."
                        : "https://example.com/article"
                    }
                    className="bg-gray-50 border-gray-300"
                  />
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
                    <strong>Note:</strong> This resource will be available to Fellows{" "}
                    <strong>5 days before</strong> the session's scheduled date (
                    {selectedSession?.unlockDate
                      ? format(new Date(selectedSession.unlockDate), "MMM dd, yyyy")
                      : "unlock date not set"}
                    ). Admins and facilitators can always access it.
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
