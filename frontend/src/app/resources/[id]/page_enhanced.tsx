"use client";

import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Video, FileText, CheckCircle, Lock, ArrowLeft, 
  TrendingUp, Clock, Award 
} from "lucide-react";
import { useResource, useMarkResourceComplete, useTrackEngagement } from "@/hooks/api/useResources";
import { ArticleViewer } from "@/components/resources/ArticleViewer";
import { VideoPlayer } from "@/components/resources/VideoPlayer";
import Link from "next/link";
import { ResourceType } from "@/types/api";
import { toast } from "sonner";

export default function ResourceViewPage({ params }: { params: { id: string } }) {
  const resourceId = params.id;
  const [canComplete, setCanComplete] = useState(false);
  
  const { data: resource, isLoading, error, refetch } = useResource(resourceId);
  const markCompleteMutation = useMarkResourceComplete(resourceId);
  const trackEngagementMutation = useTrackEngagement(resourceId);

  const handleTrackEngagement = useCallback(async (data: {
    scrollDepth?: number;
    watchPercentage?: number;
    timeSpent: number;
  }) => {
    try {
      const result = await trackEngagementMutation.mutateAsync({
        scrollDepth: data.scrollDepth,
        watchPercentage: data.watchPercentage,
        timeSpent: data.timeSpent,
        eventType: data.scrollDepth ? "scroll" : "video_progress",
      });

      // Update canComplete based on backend response
      if (result?.canComplete !== undefined) {
        setCanComplete(result.canComplete);
      }
    } catch (error) {
      console.error("Failed to track engagement:", error);
    }
  }, [trackEngagementMutation]);

  const handleMarkComplete = async () => {
    if (!canComplete) {
      toast.error("Please engage with the content more thoroughly before completing");
      return;
    }

    try {
      const result = await markCompleteMutation.mutateAsync({});
      
      if (result?.newAchievements && result.newAchievements.length > 0) {
        result.newAchievements.forEach((achievement: any) => {
          toast.success(`Achievement Unlocked: ${achievement.name}! 🎉`, {
            description: `+${achievement.pointValue} points`,
          });
        });
      }

      if (result?.cappedMessage) {
        toast.warning(result.cappedMessage);
      } else if (result?.pointsAwarded) {
        toast.success(`Resource completed! +${result.pointsAwarded} points`, {
          description: "Great job! Keep learning!",
        });
      }

      refetch();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || "Failed to mark resource as complete";
      const errors = error?.response?.data?.errors;
      
      if (errors && Array.isArray(errors)) {
        toast.error("Insufficient Engagement", {
          description: errors.join(" • "),
        });
      } else {
        toast.error(errorMsg);
      }
    }
  };

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
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Loading resource...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isLocked = resource.state === "LOCKED";
  const isCompleted = resource.state === "COMPLETED";
  const isVideo = resource.type === ResourceType.VIDEO;
  const isArticle = resource.type === ResourceType.ARTICLE;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link href="/resources">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Link>
        </Button>

        {/* Resource Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  isVideo ? "bg-purple-100" : "bg-blue-100"
                }`}>
                  {isVideo ? (
                    <Video className="w-8 h-8 text-purple-600" />
                  ) : (
                    <FileText className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-2xl">{resource.title}</CardTitle>
                    {isCompleted && (
                      <Badge className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </Badge>
                    )}
                    {isLocked && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-3">{resource.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{resource.estimatedMinutes || resource.duration || 10} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span>{resource.pointValue || 0} points</span>
                    </div>
                    {resource.isCore && (
                      <Badge variant="outline">Core Resource</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Locked State */}
        {isLocked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This resource will unlock on {new Date(resource.unlockDate!).toLocaleDateString()}.
              Complete other resources while you wait!
            </AlertDescription>
          </Alert>
        )}

        {/* Content Viewer */}
        {!isLocked && (
          <>
            {isVideo && (
              <VideoPlayer
                resourceId={resourceId}
                url={resource.url}
                onTrack={handleTrackEngagement}
              />
            )}

            {isArticle && (
              <ArticleViewer
                resourceId={resourceId}
                url={resource.url}
                onTrack={handleTrackEngagement}
              />
            )}

            {!isVideo && !isArticle && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center py-8">
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Open resource in new tab →
                    </a>
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Completion Section */}
        {!isLocked && !isCompleted && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Ready to complete this resource?</h3>
                  <p className="text-sm text-muted-foreground">
                    {canComplete ? (
                      "Great job! You've met the engagement requirements. Click below to mark as complete."
                    ) : (
                      <>
                        {isArticle && "Scroll through at least 80% of the content and spend adequate time reading."}
                        {isVideo && "Watch at least 85% of the video and spend adequate time learning."}
                        {!isArticle && !isVideo && "Engage with the content and spend adequate time learning."}
                      </>
                    )}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleMarkComplete}
                  disabled={markCompleteMutation.isPending}
                  className={canComplete ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {markCompleteMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Stats */}
        {isCompleted && resource.completedAt && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-700">Resource Completed!</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed on {new Date(resource.completedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
