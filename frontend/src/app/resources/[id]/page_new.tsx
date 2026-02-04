"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Video, FileText, CheckCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { useResource, useMarkResourceComplete } from "@/hooks/api/useResources";
import Link from "next/link";
import { ResourceType } from "@/types/api";

export default function ResourceViewPage({ params }: { params: { id: string } }) {
  const resourceId = params.id;
  
  const { data: resource, isLoading, error, refetch } = useResource(resourceId);
  const markCompleteMutation = useMarkResourceComplete(resourceId);

  if (error) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load resource" onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  if (isLoading || !resource) {
    return (
      <DashboardLayout>
        <Card className="animate-pulse">
          <div className="p-6">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const handleMarkComplete = async () => {
    try {
      await markCompleteMutation.mutateAsync({});
    } catch (error) {
      console.error("Failed to mark resource as complete:", error);
    }
  };

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.VIDEO: return <Video className="w-8 h-8 text-purple-600" />;
      case ResourceType.ARTICLE: return <FileText className="w-8 h-8 text-blue-600" />;
      case ResourceType.EXERCISE: return <FileText className="w-8 h-8 text-green-600" />;
      default: return <FileText className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Resource Info Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                {getResourceIcon(resource.type)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{resource.title}</h1>
                <p className="text-gray-600 mb-3">{resource.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {resource.estimatedDuration && (
                    <>
                      <span>{resource.estimatedDuration} min</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{resource.pointsValue || 0} points</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button asChild>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Resource
                </a>
              </Button>
              {/* Mark Complete button always shown for now */}
              <Button
                variant="default"
                onClick={handleMarkComplete}
                disabled={markCompleteMutation.isPending}
              >
                  {markCompleteMutation.isPending ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </Button>
            </div>
          </div>
        </Card>

        {/* About Section */}
        <Card>
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-lg font-bold text-gray-900 mb-2">About this Resource</h2>
            <p className="text-gray-600 mb-4">
              This resource is part of your learning journey in the ATLAS Leadership Development Program.
              Complete it to earn points and track your progress.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/resources">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Resources
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
