"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Award, ExternalLink, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useResource, useMarkResourceComplete } from "@/hooks/api/useResources";
import { ResourceType } from "@/types/api";
import { getVideoEmbedUrl, isYouTubeUrl, isVimeoUrl } from "@/lib/videoUtils";

export default function ResourceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const resourceId = params.id;

  const { data: resource, isLoading, error, refetch } = useResource(resourceId);
  const markCompleteMutation = useMarkResourceComplete(resourceId);

  const [startTime, setStartTime] = useState<number>(Date.now());
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Track time spent
  useEffect(() => {
    setStartTime(Date.now());
  }, [resource?.id]);

  const handleMarkComplete = async () => {
    if (!resource) return;

    try {
      await markCompleteMutation.mutateAsync({});
      router.push("/resources");
    } catch (error) {
      console.error("Failed to mark complete:", error);
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>Failed to load resource</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading || !resource) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Check if resource is locked (in production, this would check against unlock date)
  const isLocked = false; // For now, all resources are unlocked

  if (isLocked) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This resource will be available closer to the session date.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.push("/resources")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // If it's an article, show card with external link
  if (resource.type === ResourceType.ARTICLE) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Button variant="ghost" onClick={() => router.push("/resources")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{resource.title}</CardTitle>
                  {resource.isCore && (
                    <Badge variant="default" className="w-fit">
                      Core Resource
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{resource.description}</p>

              <div className="flex gap-4 text-sm text-muted-foreground">
                {resource.estimatedDuration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{resource.estimatedDuration} min read</span>
                  </div>
                )}
                {resource.pointsValue !== undefined && (
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    <span>{resource.pointsValue} points</span>
                  </div>
                )}
              </div>

              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  This article will open in a new tab. Please read the full article and return here to mark it complete.
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Article
                </Button>
                <Button
                  onClick={() => router.push(`/dashboard/discussions?resourceId=${resource.id}`)}
                  variant="outline"
                  className="flex-1"
                >
                  Discuss Resource
                </Button>
                <Button 
                  onClick={handleMarkComplete} 
                  variant="outline" 
                  className="flex-1"
                  disabled={markCompleteMutation.isPending}
                >
                  {markCompleteMutation.isPending ? (
                    "Marking..."
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // If it's a video, embed it
  const embedUrl = getVideoEmbedUrl(resource.url);
  const isVideoSupported = isYouTubeUrl(resource.url) || isVimeoUrl(resource.url);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => router.push("/resources")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Resources
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{resource.title}</CardTitle>
                {resource.isCore && (
                  <Badge variant="default" className="w-fit">
                    Core Resource
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{resource.description}</p>

            <div className="flex gap-4 text-sm text-muted-foreground">
              {resource.estimatedDuration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{resource.estimatedDuration} min</span>
                </div>
              )}
              {resource.pointsValue !== undefined && (
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span>{resource.pointsValue} points</span>
                </div>
              )}
            </div>

            {isVideoSupported && embedUrl ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                {!videoLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                )}
                <iframe
                  src={embedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  onLoad={() => setVideoLoaded(true)}
                />
              </div>
            ) : (
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  This video format is not supported for embedding. Please open the link below to watch.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-3">
              {!isVideoSupported && (
                <Button
                  onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Video
                </Button>
              )}
              <Button
                onClick={() => router.push(`/dashboard/discussions?resourceId=${resource.id}`)}
                variant="outline"
                className="flex-1"
              >
                Discuss Resource
              </Button>
              <Button 
                onClick={handleMarkComplete} 
                variant={isVideoSupported ? "default" : "outline"}
                className="flex-1"
                disabled={markCompleteMutation.isPending}
              >
                {markCompleteMutation.isPending ? (
                  "Marking..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

