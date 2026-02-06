"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ErrorMessage } from "@/components/ui/error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { Video, FileText, CheckCircle, Lock, Clock, Search, Calendar, Edit } from "lucide-react";
import { useResources } from "@/hooks/api/useResources";
import { useProfile } from "@/hooks/api/useProfile";
import { useAuthStore } from "@/stores/authStore";
import { ResourceType, UserRole } from "@/types/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResourcesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const { isAuthenticated, isGuestMode, _hasHydrated } = useAuthStore();

  const { data: resources, isLoading, error, refetch } = useResources();
  const { data: profile } = useProfile();

  // Wait for Zustand to hydrate from localStorage
  if (!_hasHydrated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Loading resources...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !isLoading) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load resources" onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  // Ensure resources is always an array
  const resourcesArray = Array.isArray(resources) ? resources : [];

  const filteredResources = resourcesArray.filter((resource) => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || resource.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const completedCount = profile?.resourcesCompleted || 0;
  const totalCount = resourcesArray.length || 91;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.VIDEO: return <Video className="w-5 h-5 text-purple-600" />;
      case ResourceType.ARTICLE: return <FileText className="w-5 h-5 text-blue-600" />;
      case ResourceType.EXERCISE: return <FileText className="w-5 h-5 text-green-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const isResourceUnlocked = (unlockDate?: Date | null) => {
    if (!unlockDate) return true;
    return new Date() >= new Date(unlockDate);
  };

  // Check if user is Admin - admins see all resources
  const isAdmin = profile?.role === UserRole.ADMIN;
  const isFellow = profile?.role === UserRole.FELLOW;

  const formatDate = (date?: Date | null) => {
    if (!date) return "No date";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Learning Resources</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? `${totalCount} total resources` 
                : `${completedCount}/${totalCount} completed`
              }
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button onClick={() => router.push("/dashboard/admin/resources")} variant="default">
                <Edit className="h-4 w-4 mr-2" />
                Manage Resources
              </Button>
            )}
            <Button onClick={() => refetch()} variant="outline">Refresh</Button>
          </div>
        </div>

        {/* Only show progress bar for Fellows */}
        {isFellow && (
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-2xl font-bold text-atlas-navy">{completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-gradient-to-r from-atlas-navy to-[#1a1a6e] h-4 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Keep going! Complete more resources to earn points!</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search resources..." 
              value={searchQuery} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} 
              // Admin can see and access all resources
              const unlocked = isAdmin || isResourceUnlocked(resource.session?.unlockDate);
              const isLocked = !unlocked;
              
              return (
                <Card 
                  key={resource.id} 
                  className={`bg-white hover:shadow-lg transition-shadow ${unlocked ? "cursor-pointer" : "opacity-60"}`}
                >
                  <CardContent className="p-6" onClick={() => unlocked && router.push(`/resources/${resource.id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-blue-50 rounded-lg">{getResourceIcon(resource.type)}</div>
                      <div className="flex flex-col items-end gap-1">
                        {isLocked && <Lock className="h-4 w-4 text-gray-400" />}
                        {resource.isCore && (
                          <Badge variant="default" className="text-xs">Core</Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900">{resource.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
                    
                    {/* Show dates for Admin */}
                    {isAdmin && resource.session && (
                      <div className="mb-3 p-2 bg-blue-50 rounded text-xs space-y-1">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Calendar className="h-3 w-3" />
                          <span className="font-medium">Session:</span>
                          <span>{formatDate(resource.session.date)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">Unlocks:</span>
                          <span>{formatDate(resource.session.unlockDate)}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {resource.estimatedDuration && (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>{resource.estimatedDuration} min</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{resource.pointsValue || 0} pts</span>
                      </div>
                      
                      {/* Admin edit link */}
                      {isAdmin && (
                        <Link
                          href={`/dashboard/admin/resources?edit=${resource.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Link>
                      )}
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResources && filteredResources.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => {
              const unlocked = isResourceUnlocked(resource.session?.unlockDate);
              return (
                <Card key={resource.id} className={unlocked ? "cursor-pointer hover:shadow-lg transition-shadow" : "opacity-60"}>
                  <CardContent className="p-6" onClick={() => unlocked && router.push(`/resources/${resource.id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gray-100 rounded-lg">{getResourceIcon(resource.type)}</div>
                      {!unlocked && <Lock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{resource.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {resource.estimatedDuration && (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>{resource.estimatedDuration} min</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{resource.pointsValue || 0} pts</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No resources found" description="Try adjusting your search or filters" />
        )}
      </div>
    </DashboardLayout>
  );
}
