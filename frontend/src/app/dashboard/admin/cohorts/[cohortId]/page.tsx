"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, ArrowLeft, Loader2, UserPlus, X, MessageSquare, RefreshCw } from "lucide-react";
import {
  useCohorts,
  useAdminUsers,
  useUpdateUserCohort,
  useCohortMembers,
  useAddCohortFacilitator,
  useRemoveCohortFacilitator,
} from "@/hooks/api/useAdmin";
import { useOpenDM } from "@/hooks/api/useChat";
import { toast } from "sonner";

interface CohortFacilitatorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isFacilitator: boolean;
}

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  state: string;
  facilitators?: Array<{ cohortId: string; userId: string; user: CohortFacilitatorUser }>;
  _count?: { fellows: number; sessions: number };
}

type CohortMember = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  cohortId?: string | null;
};

type AdminUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  cohortId?: string | null;
  isFacilitator?: boolean;
};

export default function AdminCohortMembersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ cohortId: string }>();
  const cohortId = params?.cohortId;

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  const cohorts: Cohort[] = Array.isArray(cohortsData) ? (cohortsData as Cohort[]) : [];

  const cohort = useMemo(
    () => cohorts.find((c) => c.id === cohortId),
    [cohortId, cohorts],
  );

  const updateUserCohort = useUpdateUserCohort();
  const addCohortFacilitator = useAddCohortFacilitator();
  const removeCohortFacilitator = useRemoveCohortFacilitator();
  const openDM = useOpenDM();

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddFacilitatorDialogOpen, setIsAddFacilitatorDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedFacilitatorUserId, setSelectedFacilitatorUserId] = useState<string>("");

  const { data: membersRaw = [], isLoading: membersLoading } = useCohortMembers(cohortId);
  const allCohortMembers = (Array.isArray(membersRaw) ? (membersRaw as unknown[]) : []).filter(Boolean) as unknown as CohortMember[];
  const cohortMembers = allCohortMembers.filter((m) => m.role === "FELLOW");

  // Fetch all fellows for the "Add Member" dialog
  const { data: fellowsResponse } = useAdminUsers(isAddMemberDialogOpen ? { role: "FELLOW" } : undefined);
  const fellowsWithoutCohort = ((fellowsResponse as unknown as { users?: AdminUser[] } | undefined)?.users ?? []).filter(
    (user) => !user.cohortId || user.cohortId !== cohortId,
  );

  // Fetch eligible facilitators for the "Add Facilitator" dialog
  const { data: facilitatorRoleUsersResponse } = useAdminUsers(
    isAddFacilitatorDialogOpen ? { role: "FACILITATOR" } : undefined,
  );
  const { data: adminRoleUsersResponse } = useAdminUsers(
    isAddFacilitatorDialogOpen ? { role: "ADMIN" } : undefined,
  );
  const currentFacilitatorIds = new Set((cohort?.facilitators ?? []).map((f) => f.userId));
  const availableFacilitatorsForAssignment = [
    ...(((facilitatorRoleUsersResponse as unknown as { users?: AdminUser[] } | undefined)?.users ?? [])),
    ...((((adminRoleUsersResponse as unknown as { users?: AdminUser[] } | undefined)?.users ?? [])).filter((u) => u.isFacilitator)),
  ].filter((u) => !!u?.id && !currentFacilitatorIds.has(u.id));

  const handleMessage = async (targetUserId: string) => {
    try {
      const channel = await openDM.mutateAsync(targetUserId);
      router.push(`/dashboard/chats?channelId=${channel.id}`);
    } catch {
      toast.error("Could not open conversation");
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "FACILITATOR") return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Facilitator</Badge>;
    if (role === "FELLOW") return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Fellow</Badge>;
    if (role === "ADMIN") return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Admin</Badge>;
    return null;
  };

  const handleAddMemberToCohort = async () => {
    if (!cohortId || !selectedUserId) return;
    await updateUserCohort.mutateAsync({ userId: selectedUserId, cohortId });
    setSelectedUserId("");
    setIsAddMemberDialogOpen(false);
  };

  const handleRemoveMember = async (userId: string) => {
    await updateUserCohort.mutateAsync({ userId, cohortId: null });
    toast.success("Member removed from cohort");
  };

  const handleAddFacilitator = async () => {
    if (!cohortId || !selectedFacilitatorUserId) return;
    await addCohortFacilitator.mutateAsync({ cohortId, userId: selectedFacilitatorUserId });
    setSelectedFacilitatorUserId("");
    setIsAddFacilitatorDialogOpen(false);
  };

  const handleRemoveFacilitator = async (userId: string) => {
    if (!cohortId) return;
    await removeCohortFacilitator.mutateAsync({ cohortId, userId });
  };

  const isBusy =
    cohortsLoading ||
    membersLoading ||
    updateUserCohort.isPending ||
    addCohortFacilitator.isPending ||
    removeCohortFacilitator.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Button
              type="button"
              variant="ghost"
              className="mb-2 -ml-2 w-fit gap-2 text-slate-700"
              onClick={() => router.push("/dashboard/admin/cohorts")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="truncate text-2xl sm:text-3xl font-bold text-gray-900">
              Cohort Members{cohort?.name ? ` — ${cohort.name}` : ""}
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Manage fellows and facilitators in this cohort.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!cohortId) return;
                queryClient.invalidateQueries({ queryKey: ["cohort-members", cohortId] });
                queryClient.invalidateQueries({ queryKey: ["cohorts"] });
              }}
              className="gap-2"
              disabled={!cohortId}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {cohortsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !cohort ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="py-12 text-center text-gray-500">
              <p className="font-medium">Cohort not found</p>
              <p className="text-sm mt-1">It may have been deleted or you may not have access.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">Facilitators</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddFacilitatorDialogOpen(true)}
                    className="text-purple-700 border-purple-300 hover:bg-purple-50"
                  >
                    <UserPlus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-2">
                {(cohort.facilitators?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-500">No facilitators assigned yet.</p>
                ) : (
                  cohort.facilitators!.map((f) => (
                    <div
                      key={f.userId}
                      className="flex flex-col gap-2 rounded-xl border border-purple-100 bg-purple-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-purple-200 flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-700">
                            {f.user.firstName?.charAt(0)}
                            {f.user.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {f.user.firstName} {f.user.lastName}
                            </p>
                            {getRoleBadge(f.user.role)}
                          </div>
                          <p className="truncate text-xs text-gray-600">{f.user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleMessage(f.userId)}
                          className="h-9 gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFacilitator(f.userId)}
                          className="h-9 w-9 p-0 text-red-600 border-red-200 hover:bg-red-50"
                          title="Remove facilitator"
                          disabled={removeCohortFacilitator.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">Fellows</span>
                  <Button
                    size="sm"
                    onClick={() => setIsAddMemberDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : cohortMembers.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No fellows in this cohort yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cohortMembers.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
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
                              <p className="truncate font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </p>
                              {getRoleBadge(member.role)}
                            </div>
                            <p className="truncate text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            className="h-9 w-9 p-0 text-red-600 border-red-200 hover:bg-red-50"
                            title="Remove from cohort"
                            disabled={updateUserCohort.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Member Dialog */}
        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Add Fellow{cohort?.name ? ` to ${cohort.name}` : ""}</DialogTitle>
              <DialogDescription>Select a fellow to add to this cohort.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Fellow</Label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a fellow...</option>
                  {fellowsWithoutCohort.map((fellow: any) => (
                    <option key={fellow.id} value={fellow.id}>
                      {fellow.firstName} {fellow.lastName} ({fellow.email})
                      {fellow.cohortId ? " – Currently in another cohort" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {fellowsWithoutCohort.length === 0 ? "All fellows are already assigned to cohorts" : `${fellowsWithoutCohort.length} fellows available`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setIsAddMemberDialogOpen(false); setSelectedUserId(""); }}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMemberToCohort}
                disabled={isBusy || !selectedUserId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateUserCohort.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add to Cohort
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Facilitator Dialog */}
        <Dialog open={isAddFacilitatorDialogOpen} onOpenChange={setIsAddFacilitatorDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Add Facilitator{cohort?.name ? ` to ${cohort.name}` : ""}</DialogTitle>
              <DialogDescription>Select a facilitator or admin with facilitator privileges to assign.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Facilitator</Label>
                <select
                  value={selectedFacilitatorUserId}
                  onChange={(e) => setSelectedFacilitatorUserId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a facilitator...</option>
                  {availableFacilitatorsForAssignment.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email}){user.role === "ADMIN" ? " – Admin" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {availableFacilitatorsForAssignment.length === 0
                    ? "No eligible facilitators available"
                    : `${availableFacilitatorsForAssignment.length} facilitator${availableFacilitatorsForAssignment.length === 1 ? "" : "s"} available`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setIsAddFacilitatorDialogOpen(false); setSelectedFacilitatorUserId(""); }}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFacilitator}
                disabled={isBusy || !selectedFacilitatorUserId}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {addCohortFacilitator.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

