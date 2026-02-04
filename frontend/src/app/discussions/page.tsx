"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare, Plus, Pin, ThumbsUp, MessageCircle, Search } from "lucide-react";
import { useDiscussions, useCreateDiscussion, useLikeDiscussion } from "@/hooks/api/useDiscussions";
import { useProfile } from "@/hooks/api/useProfile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";

const discussionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  content: z.string().min(20, "Content must be at least 20 characters"),
});

type DiscussionForm = z.infer<typeof discussionSchema>;

export default function DiscussionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "my" | "pinned">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: profile } = useProfile();
  const { data: discussionsData, isLoading, error, refetch } = useDiscussions();
  const createMutation = useCreateDiscussion();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DiscussionForm>({
    resolver: zodResolver(discussionSchema),
  });

  const onSubmit = async (data: DiscussionForm) => {
    try {
      await createMutation.mutateAsync(data);
      setIsDialogOpen(false);
      reset();
    } catch (error) {
      console.error("Failed to create discussion:", error);
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load discussions" onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  const discussions = discussionsData?.data || [];
  
  const filteredDiscussions = discussions
    .filter((d: any) => {
      const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        filter === "all" ? true :
        filter === "my" ? d.authorId === profile?.id :
        filter === "pinned" ? d.isPinned : true;
      return matchesSearch && matchesFilter;
    })
    .sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Discussions</h1>
            <p className="text-muted-foreground mt-1">Connect with your cohort and share insights</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Discussion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Discussion</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input {...register("title")} placeholder="What would you like to discuss?" />
                  {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content</label>
                  <textarea
                    {...register("content")}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Share your thoughts, questions, or insights..."
                  />
                  {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>}
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creating..." : "Create Discussion"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Tabs */}
        <Card>
          <div className="flex border-b">
            <button
              className={`px-6 py-4 font-medium ${filter === "all" ? "text-atlas-navy border-b-2 border-atlas-navy" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setFilter("all")}
            >
              All Discussions
            </button>
            <button
              className={`px-6 py-4 font-medium ${filter === "my" ? "text-atlas-navy border-b-2 border-atlas-navy" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setFilter("my")}
            >
              My Posts
            </button>
            <button
              className={`px-6 py-4 font-medium ${filter === "pinned" ? "text-atlas-navy border-b-2 border-atlas-navy" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setFilter("pinned")}
            >
              Pinned
            </button>
          </div>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredDiscussions.length > 0 ? (
          <div className="space-y-4">
            {filteredDiscussions.map((discussion: any) => (
              <Card
                key={discussion.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/discussions/${discussion.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-atlas-navy text-white rounded-full flex items-center justify-center font-semibold">
                      {discussion.author?.name?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        {discussion.isPinned && <Pin className="w-4 h-4 text-orange-500 mt-1" />}
                        <h3 className="text-lg font-bold flex-1">{discussion.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <span className="font-medium">{discussion.author?.name || "Unknown"}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{discussion.commentCount || 0} replies</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{discussion.likeCount || 0} likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No discussions found"
            description="Start a new discussion to connect with your cohort"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
