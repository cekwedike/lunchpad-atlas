"use client";

import { useEffect, useState } from "react";
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
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts(isAdmin);
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  useEffect(() => {
    if (!isAdmin && profile?.cohortId) {
      setSelectedCohortId(profile.cohortId);
    }
  }, [isAdmin, profile?.cohortId]);

  useEffect(() => {
    if (!isAdmin || selectedCohortId || cohorts.length !== 1) return;
    setSelectedCohortId(cohorts[0].id);
  }, [isAdmin, selectedCohortId, cohorts]);

  useEffect(() => {
    setSelectedTopic("general");
  }, [selectedCohortId]);

  const cohortIdForTopics = isAdmin ? selectedCohortId : profile?.cohortId;
  const { data: topicOptions } = useDiscussionTopics(cohortIdForTopics || undefined);
  const topics = topicOptions || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const cohortId = isAdmin ? selectedCohortId : profile?.cohortId;
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
        title: title.trim(),
        content: content.trim(),
        cohortId,
        topicType,
        sessionId: topicType === 'SESSION' ? selectedOption?.value : undefined,
        resourceId: topicType === 'RESOURCE' ? selectedOption?.value : resourceId,
      });
      
      toast.success("Discussion created!");
      router.push(`/dashboard/discussions/${result.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create discussion");
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
                <select
                  id="cohort"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  value={isAdmin ? selectedCohortId : profile?.cohortId || ""}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  disabled={!isAdmin || cohortsLoading}
                >
                  <option value="">-- Select a cohort --</option>
                  {cohorts.map((cohort: any) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
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
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={
                    createDiscussion.isPending
                    || !title.trim()
                    || !content.trim()
                    || !(isAdmin ? selectedCohortId : profile?.cohortId)
                  }
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {createDiscussion.isPending ? "Posting..." : "Post Discussion"}
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
