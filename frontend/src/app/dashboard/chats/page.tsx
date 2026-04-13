"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/api/useProfile";
import { useAdminDirectChannels, useAllChannels, useCohortChannels } from "@/hooks/api/useChat";
import { MessageCircle, Users, Lock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChatsPage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const isAdmin = profile?.role === "ADMIN";
  const cohortId = profile?.cohortId || undefined;

  const { data: cohortChannels = [], isLoading: cohortChannelsLoading } = useCohortChannels(cohortId);
  const { data: allChannels = [], isLoading: allChannelsLoading } = useAllChannels(isAdmin);
  const { data: directChannels = [], isLoading: directChannelsLoading } = useAdminDirectChannels(!!profile?.id);

  const groupChats = (isAdmin ? allChannels : cohortChannels).filter(
    (channel) => channel.type !== "DIRECT_MESSAGE" && !channel.isArchived,
  );
  const privateChats = directChannels.filter((channel) => !channel.isArchived);
  const loading = profileLoading || cohortChannelsLoading || allChannelsLoading || directChannelsLoading;

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 p-3 sm:p-5">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Chats</h1>
              <p className="text-sm text-slate-500">
                View all chats relevant to your role and open any room.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-blue-600" />
                  Group Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50"
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

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4 text-purple-600" />
                  Private Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {channel.description || "Private conversation"}
                          </p>
                          <Badge className="border-purple-200 bg-purple-50 text-purple-700">
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
