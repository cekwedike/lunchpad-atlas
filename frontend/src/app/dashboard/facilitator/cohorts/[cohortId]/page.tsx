"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, ArrowLeft, Loader2, RefreshCw, Ban, ShieldCheck, MessageSquare, Crown } from "lucide-react";
import { useCohorts, useCohortMembers } from "@/hooks/api/useAdmin";
import {
  useFacilitatorSuspendFellow,
  useFacilitatorUnsuspendFellow,
  useSetCohortLeadership,
} from "@/hooks/api/useFacilitator";
import { useOpenDM } from "@/hooks/api/useChat";
import { useProfile } from "@/hooks/api/useProfile";
import { toast } from "sonner";

export default function FacilitatorCohortMembersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ cohortId: string }>();
  const cohortId = params?.cohortId;

  const { data: profile } = useProfile();
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  const cohort = useMemo(
    () => cohorts.find((c: any) => c.id === cohortId),
    [cohortId, cohorts],
  );

  const { data: cohortMembers = [], isLoading: membersLoading } = useCohortMembers(cohortId);
  const openDM = useOpenDM();

  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isUnsuspendDialogOpen, setIsUnsuspendDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [suspendPreset, setSuspendPreset] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const suspendFellow = useFacilitatorSuspendFellow(cohortId ?? "");
  const unsuspendFellow = useFacilitatorUnsuspendFellow(cohortId ?? "");
  const setLeadership = useSetCohortLeadership(cohortId ?? "");

  const NONE = "__none__";
  const fellowsOnly = useMemo(
    () => (Array.isArray(cohortMembers) ? cohortMembers : []).filter((m: any) => m.role === "FELLOW"),
    [cohortMembers],
  );
  const currentCaptain = useMemo(
    () => fellowsOnly.find((m: any) => m.cohortLeadershipRole === "COHORT_CAPTAIN"),
    [fellowsOnly],
  );
  const currentAssistant = useMemo(
    () => fellowsOnly.find((m: any) => m.cohortLeadershipRole === "ASSISTANT_COHORT_CAPTAIN"),
    [fellowsOnly],
  );

  const [captainPick, setCaptainPick] = useState(NONE);
  const [assistantPick, setAssistantPick] = useState(NONE);

  useEffect(() => {
    if (membersLoading) return;
    setCaptainPick(currentCaptain?.id ?? NONE);
    setAssistantPick(currentAssistant?.id ?? NONE);
  }, [membersLoading, currentCaptain?.id, currentAssistant?.id]);

  const getRoleBadge = (role: string) => {
    if (role === "FACILITATOR") return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Facilitator</Badge>;
    if (role === "FELLOW") return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Fellow</Badge>;
    if (role === "ADMIN") return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Admin</Badge>;
    return null;
  };

  const handleMessage = async (targetUserId: string) => {
    try {
      const channel = await openDM.mutateAsync(targetUserId);
      router.push(`/dashboard/chats?channelId=${channel.id}`);
    } catch {
      toast.error("Could not open conversation");
    }
  };

  const canManageMembers = profile?.role === "FACILITATOR" || profile?.role === "ADMIN";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Button
              type="button"
              variant="ghost"
              className="mb-2 -ml-2 w-fit gap-2 text-slate-700"
              onClick={() => router.push("/dashboard/facilitator/cohorts")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="truncate text-2xl sm:text-3xl font-bold text-gray-900">
              Cohort Members{cohort?.name ? ` — ${cohort.name}` : ""}
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              View fellows and co-facilitators in this cohort.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["cohort-members", cohortId] })}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {canManageMembers && cohort && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Crown className="h-5 w-5 text-violet-600 shrink-0" />
                Cohort captain & assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Fellows in this role get a read-only &quot;Cohort Pulse&quot; page (masked emails). At most one captain and one assistant per cohort.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Captain</Label>
                  <select
                    value={captainPick}
                    onChange={(e) => setCaptainPick(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={NONE}>None</option>
                    {fellowsOnly.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.firstName} {f.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assistant captain</Label>
                  <select
                    value={assistantPick}
                    onChange={(e) => setAssistantPick(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={NONE}>None</option>
                    {fellowsOnly.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.firstName} {f.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                disabled={setLeadership.isPending || !cohortId}
                onClick={() =>
                  setLeadership.mutate({
                    captainUserId: captainPick === NONE ? null : captainPick,
                    assistantUserId: assistantPick === NONE ? null : assistantPick,
                  })
                }
              >
                {setLeadership.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Save leadership
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-5 w-5 text-blue-600 shrink-0" />
                <span className="truncate">Members</span>
              </div>
              <Badge variant="outline" className="shrink-0">
                {Array.isArray(cohortMembers) ? cohortMembers.length : 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {cohortsLoading || membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !cohort ? (
              <div className="text-center py-12 text-gray-500">
                <p className="font-medium">Cohort not found</p>
                <p className="text-sm mt-1">It may have been removed or you may not have access.</p>
              </div>
            ) : cohortMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No members found in this cohort.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {cohortMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">
                          {member.firstName?.charAt(0)}
                          {member.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 truncate font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          {getRoleBadge(member.role)}
                          {member.isSuspended && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                              Suspended
                            </Badge>
                          )}
                          {member.role === "FELLOW" && member.cohortLeadershipRole === "COHORT_CAPTAIN" && (
                            <Badge variant="outline" className="text-xs bg-violet-50 text-violet-800 border-violet-200 gap-1">
                              <Crown className="h-3 w-3" />
                              Captain
                            </Badge>
                          )}
                          {member.role === "FELLOW" && member.cohortLeadershipRole === "ASSISTANT_COHORT_CAPTAIN" && (
                            <Badge variant="outline" className="text-xs bg-sky-50 text-sky-800 border-sky-200">
                              Assistant captain
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {member.currentMonthPoints > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          {member.currentMonthPoints} pts this month
                        </Badge>
                      )}

                      {member.id !== profile?.id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleMessage(member.id)}
                          className="h-9 gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                      )}

                      {canManageMembers && member.role === "FELLOW" && member.id !== profile?.id && (
                        member.isSuspended ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedMember(member); setIsUnsuspendDialogOpen(true); }}
                            className="h-9 gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedMember(member); setSuspendPreset(""); setSuspendReason(""); setIsSuspendDialogOpen(true); }}
                            className="h-9 gap-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                          >
                            <Ban className="h-4 w-4" />
                            Suspend
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suspend Fellow Dialog */}
        <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Suspend Fellow</DialogTitle>
              <DialogDescription>
                Suspend <strong>{selectedMember?.firstName} {selectedMember?.lastName}</strong>. They will lose access until unsuspended.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reason (select or type)</Label>
                <select
                  value={suspendPreset}
                  onChange={(e) => { setSuspendPreset(e.target.value); setSuspendReason(""); }}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select a preset reason...</option>
                  <option value="Violation of community guidelines">Violation of community guidelines</option>
                  <option value="Academic dishonesty">Academic dishonesty</option>
                  <option value="Inappropriate behavior">Inappropriate behavior</option>
                  <option value="Repeated policy violations">Repeated policy violations</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom reason (optional)</Label>
                <Textarea
                  placeholder="Additional details..."
                  value={suspendReason}
                  onChange={(e) => { setSuspendReason(e.target.value); setSuspendPreset(""); }}
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)} disabled={suspendFellow.isPending}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedMember) return;
                  const reason = suspendReason.trim() || suspendPreset || undefined;
                  await suspendFellow.mutateAsync({ fellowId: selectedMember.id, reason });
                  setIsSuspendDialogOpen(false);
                }}
                disabled={suspendFellow.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {suspendFellow.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Suspending...</> : <><Ban className="h-4 w-4 mr-2" />Suspend</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsuspend Fellow Dialog */}
        <Dialog open={isUnsuspendDialogOpen} onOpenChange={setIsUnsuspendDialogOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Unsuspend Fellow</DialogTitle>
              <DialogDescription>
                Restore access for <strong>{selectedMember?.firstName} {selectedMember?.lastName}</strong>. They will be able to log in immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsUnsuspendDialogOpen(false)} disabled={unsuspendFellow.isPending}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedMember) return;
                  await unsuspendFellow.mutateAsync(selectedMember.id);
                  setIsUnsuspendDialogOpen(false);
                }}
                disabled={unsuspendFellow.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {unsuspendFellow.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Unsuspending...</> : <><ShieldCheck className="h-4 w-4 mr-2" />Unsuspend</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

