"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send } from "lucide-react";
import { useCreateDiscussion, useDiscussionTopics } from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useResource } from "@/hooks/api/useResources";
import { useCohorts } from "@/hooks/api/useAdmin";
import { toast } from "sonner";

export default function NewDiscussionPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="flex items-center justify-center h-[calc(100vh-4rem)]"><p className="text-gray-500">Loading...</p></div></DashboardLayout>}>
      <NewDiscussionContent />
    </Suspense>
  );
}

function NewDiscussionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile } = useProfile();
  const createDiscussion = useCreateDiscussion();

  const resourceId = searchParams.get('resourceId') || undefined;
  const { data: resource } = useResource(resourceId || "");
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("general");

  const isAdmin = profile?.role === 'ADMIN';
  const isFacilitator = profile?.role === 'FACILITATOR';
  const isFellow = profile?.role === 'FELLOW';
  const canCreateDiscussion = !!profile?.role;
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts(isAdmin);
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  const availableCohorts = isAdmin
    ? cohorts
    : isFacilitator
      ? (profile?.facilitatedCohorts || [])
      : [];

  useEffect(() => {
    if (!canCreateDiscussion || selectedCohortId) return;

    if (isAdmin && cohorts.length === 1) {
      setSelectedCohortId(cohorts[0].id);
    }

    if (isFacilitator && availableCohorts.length === 1) {
      setSelectedCohortId(availableCohorts[0].id);
    }
  }, [canCreateDiscussion, isAdmin, isFacilitator, cohorts, availableCohorts, selectedCohortId]);

  useEffect(() => {
    setSelectedTopic("general");
  }, [selectedCohortId]);

  const cohortIdForTopics = isFellow ? profile?.cohortId : selectedCohortId;
  const cohortIdForSubmit = isFellow ? profile?.cohortId : selectedCohortId;
  const { data: topicOptions } = useDiscussionTopics(cohortIdForTopics || undefined);
  const topics = topicOptions || [];

  if (!profile?.role) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-2xl">Loading profile...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast.error("Please fill in all fields");
      return;
    }

    if (trimmedTitle.length < 5) {
      toast.error("Title is too short", { description: "Use at least 5 characters." });
      return;
    }

    if (trimmedContent.length < 20) {
      toast.error("Content is too short", { description: "Use at least 20 characters." });
      return;
    }

    const cohortId = canCreateDiscussion ? (isFellow ? profile?.cohortId : selectedCohortId) : profile?.cohortId;
    if (!cohortId) {
      toast.error("Select a cohort to create discussions");
      return;
    }

    try {
      const isResourceDiscussion = !!resourceId;
      const selectedOption = topics.find((topic) => topic.value === selectedTopic) || null;
      const topicType = isResourceDiscussion
        ? 'RESOURCE'
        : selectedOption?.type || 'GENERAL';

      const result = await createDiscussion.mutateAsync({
        title: trimmedTitle,
        content: trimmedContent,
        cohortId,
        topicType,
        sessionId: topicType === 'SESSION' ? selectedOption?.value : undefined,
        resourceId: topicType === 'RESOURCE' ? selectedOption?.value : resourceId,
      });
      
      toast.success(result?.isApproved === false ? "Discussion submitted for approval" : "Discussion created!");
      router.push(`/dashboard/discussions/${result.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create discussion");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(resourceId ? `/dashboard/discussions?resourceId=${resourceId}` : '/dashboard/discussions')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Discussions
          </Button>
        </div>

        {/* Create Discussion Form */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-2xl">Start a New Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            {isFellow && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Fellow discussions require facilitator approval before they appear to others.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {resourceId && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="text-sm text-blue-700">Resource discussion</div>
                  <div className="text-base font-semibold text-blue-900">
                    {resource?.title || "Selected resource"}
                  </div>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/resources/${resourceId}`)}
                    >
                      View Resource
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cohort">Cohort</Label>
                {isFellow ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {profile?.cohort?.name || "Your cohort"}
                  </div>
                ) : (
                  <select
                    id="cohort"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    disabled={(!isAdmin && !isFacilitator) || cohortsLoading}
                  >
                    <option value="">-- Select a cohort --</option>
                    {availableCohorts.map((cohort: any) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </option>
                    ))}
                  </select>
                )}
                {isFacilitator && availableCohorts.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No cohorts assigned to your facilitator account yet.
                  </p>
                )}
              </div>

              {!resourceId && (
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <select
                    id="topic"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    disabled={!cohortIdForTopics}
                  >
                    <option value="general">General</option>
                    {topics
                      .filter((topic) => topic.type !== 'GENERAL')
                      .map((topic) => (
                        <option key={topic.value} value={topic.value}>
                          {topic.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="What's your discussion about?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-500">
                  {title.length}/200 characters
                </p>
                {title.trim().length > 0 && title.trim().length < 5 && (
                  <p className="text-xs text-amber-600">Title should be at least 5 characters.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Share your thoughts, questions, or insights..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Be clear and constructive. This is a space for learning and collaboration.
                </p>
                {content.trim().length > 0 && content.trim().length < 20 && (
                  <p className="text-xs text-amber-600">Content should be at least 20 characters.</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={
                    createDiscussion.isPending
                    || !title.trim()
                    || !content.trim()
                    || title.trim().length < 5
                    || content.trim().length < 20
                    || !cohortIdForSubmit
                  }
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {createDiscussion.isPending
                    ? "Posting..."
                    : (isFellow ? "Submit for Approval" : "Post Discussion")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/discussions')}
                  disabled={createDiscussion.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
