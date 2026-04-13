"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/api/useProfile";
import { useAdminDirectChannels, useAllChannels, useCohortChannels, useCreateChannel } from "@/hooks/api/useChat";
import { useCohorts } from "@/hooks/api/useAdmin";
import { MessageCircle, Users, Lock, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ChatsPage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const createChannel = useCreateChannel();
  const isAdmin = profile?.role === "ADMIN";
  const canCreateChatRooms = isAdmin || profile?.role === "FACILITATOR";
  const cohortId = profile?.cohortId || undefined;
  const { data: cohorts = [] } = useCohorts(isAdmin);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelType, setNewChannelType] = useState<"COHORT_WIDE" | "MONTHLY_THEME" | "SESSION_SPECIFIC">(
    "COHORT_WIDE",
  );
  const [newChannelCohortId, setNewChannelCohortId] = useState("");

  const { data: cohortChannels = [], isLoading: cohortChannelsLoading } = useCohortChannels(cohortId);
  const { data: allChannels = [], isLoading: allChannelsLoading } = useAllChannels(isAdmin);
  const { data: directChannels = [], isLoading: directChannelsLoading } = useAdminDirectChannels(!!profile?.id);

  const groupChats = (isAdmin ? allChannels : cohortChannels).filter(
    (channel) => channel.type !== "DIRECT_MESSAGE" && !channel.isArchived,
  );
  const privateChats = directChannels.filter((channel) => !channel.isArchived);
  const loading = profileLoading || cohortChannelsLoading || allChannelsLoading || directChannelsLoading;
  const activeCohortId = useMemo(
    () => (isAdmin ? newChannelCohortId : cohortId || ""),
    [isAdmin, newChannelCohortId, cohortId],
  );

  const handleCreateChatRoom = async () => {
    const trimmedName = newChannelName.trim();
    if (!trimmedName) {
      toast.error("Chat room name is required");
      return;
    }
    if (!activeCohortId) {
      toast.error("Please select a cohort");
      return;
    }
    try {
      await createChannel.mutateAsync({
        cohortId: activeCohortId,
        type: newChannelType,
        name: trimmedName,
        description: newChannelDescription.trim() || undefined,
      });
      toast.success("Chat room created");
      setNewChannelName("");
      setNewChannelDescription("");
      setNewChannelType("COHORT_WIDE");
      if (!isAdmin) setShowCreateForm(false);
    } catch (error: any) {
      toast.error("Failed to create chat room", {
        description: typeof error?.message === "string" ? error.message : "Please try again.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] overflow-x-hidden bg-gray-50 p-3 sm:p-5">
        <div className="mx-auto w-full max-w-6xl space-y-4 overflow-x-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Chats</h1>
              <p className="text-sm text-slate-500">
                View all chats relevant to your role and open any room.
              </p>
            </div>
            {canCreateChatRooms && (
              <Button
                onClick={() => setShowCreateForm((s) => !s)}
                className="w-full sm:w-auto"
                variant={showCreateForm ? "outline" : "default"}
              >
                <Plus className="mr-1 h-4 w-4" />
                {showCreateForm ? "Close Create Form" : "Create Chat Room"}
              </Button>
            )}
          </div>

          {showCreateForm && canCreateChatRooms && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">New Chat Room</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAdmin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cohortId">Cohort</Label>
                    <select
                      id="cohortId"
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={newChannelCohortId}
                      onChange={(e) => setNewChannelCohortId(e.target.value)}
                    >
                      <option value="">Select cohort</option>
                      {(cohorts as any[]).map((cohort: any) => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="chatName">Chat Name</Label>
                  <Input
                    id="chatName"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. Cohort Q&A"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chatType">Chat Type</Label>
                  <select
                    id="chatType"
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={newChannelType}
                    onChange={(e) =>
                      setNewChannelType(e.target.value as "COHORT_WIDE" | "MONTHLY_THEME" | "SESSION_SPECIFIC")
                    }
                  >
                    <option value="COHORT_WIDE">Cohort-wide</option>
                    <option value="MONTHLY_THEME">Monthly theme</option>
                    <option value="SESSION_SPECIFIC">Session-specific</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chatDescription">Description (optional)</Label>
                  <Input
                    id="chatDescription"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="What should this room be used for?"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => void handleCreateChatRoom()} disabled={createChannel.isPending}>
                    {createChannel.isPending ? "Creating..." : "Create Room"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="min-w-0 border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-blue-600" />
                  Group Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading chats...</p>
                ) : groupChats.length === 0 ? (
                  <p className="text-sm text-slate-500">No group chats available.</p>
                ) : (
                  groupChats.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => router.push(`/dashboard/chat?channelId=${channel.id}`)}
                      className="flex w-full min-w-0 items-center justify-between overflow-hidden rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {channel.name || channel.cohort?.name || "Cohort chat"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {channel.description || "Open chat room"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4 text-purple-600" />
                  Private Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading chats...</p>
                ) : privateChats.length === 0 ? (
                  <p className="text-sm text-slate-500">No private chats available.</p>
                ) : (
                  privateChats.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => router.push(`/dashboard/chat?channelId=${channel.id}`)}
                      className="flex w-full min-w-0 items-center justify-between overflow-hidden rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                            {channel.description || "Private conversation"}
                          </p>
                          <Badge className="shrink-0 border-purple-200 bg-purple-50 text-purple-700">
                            <Lock className="mr-1 h-3 w-3" />
                            Private
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {channel.cohort?.name || "Direct message"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => router.push("/dashboard/discussions")}>
              Go to Discussions
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
