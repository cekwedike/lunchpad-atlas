"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Calendar, Plus, Edit, Trash2, Loader2, AlertTriangle, X, UserPlus,
} from "lucide-react";
import {
  useCohorts,
  useCreateCohort,
  useUpdateCohort,
  useDeleteCohort,
  useAdminUsers,
  useUpdateUserCohort,
  useCohortMembers,
  useAddCohortFacilitator,
  useRemoveCohortFacilitator,
} from "@/hooks/api/useAdmin";
import { useOpenDM } from "@/hooks/api/useChat";
import { toast } from "sonner";
import { format } from "date-fns";

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
  _count?: {
    fellows: number;
    sessions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AdminCohortsPage() {
  const router = useRouter();
  const { data: cohortsData, isLoading } = useCohorts();
  const createCohort = useCreateCohort();
  const updateCohort = useUpdateCohort();
  const deleteCohort = useDeleteCohort();
  const updateUserCohort = useUpdateUserCohort();
  const openDM = useOpenDM();
  const addCohortFacilitator = useAddCohortFacilitator();
  const removeCohortFacilitator = useRemoveCohortFacilitator();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddFacilitatorDialogOpen, setIsAddFacilitatorDialogOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedFacilitatorUserId, setSelectedFacilitatorUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cohorts: Cohort[] = Array.isArray(cohortsData) ? cohortsData : [];

  // Fetch ALL members (fellows + facilitators) for the selected cohort
  const { data: cohortMembers = [], isLoading: membersLoading } = useCohortMembers(
    selectedCohort && isMembersDialogOpen ? selectedCohort.id : undefined
  );

  // Fetch all fellows for the "Add Member" dialog
  const { data: fellowsWithoutCohortResponse } = useAdminUsers(
    isAddMemberDialogOpen ? { role: "FELLOW" } : undefined
  );
  const fellowsWithoutCohort = (
    fellowsWithoutCohortResponse?.users || []
  ).filter(
    (user: any) => !user.cohortId || user.cohortId !== selectedCohort?.id
  );

  // Fetch eligible facilitators for the "Add Facilitator" dialog
  const { data: facilitatorRoleUsersResponse } = useAdminUsers(
    isAddFacilitatorDialogOpen ? { role: "FACILITATOR" } : undefined
  );
  const { data: adminRoleUsersResponse } = useAdminUsers(
    isAddFacilitatorDialogOpen ? { role: "ADMIN" } : undefined
  );
  const currentFacilitatorIds = new Set(
    (selectedCohort?.facilitators ?? []).map((f) => f.userId)
  );
  const availableFacilitatorsForAssignment = [
    ...(facilitatorRoleUsersResponse?.users || []),
    ...(adminRoleUsersResponse?.users || []).filter((u: any) => u.isFacilitator),
  ].filter((u: any) => !currentFacilitatorIds.has(u.id));

  const [formData, setFormData] = useState({ name: "", startDate: "", endDate: "" });

  const resetForm = () => setFormData({ name: "", startDate: "", endDate: "" });

  const handleCreateCohort = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error("End date must be after start date");
      return;
    }
    setIsSubmitting(true);
    try {
      await createCohort.mutateAsync({
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
      });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Cohort created successfully");
    } catch {
      // error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCohort = async () => {
    if (!selectedCohort) return;
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error("End date must be after start date");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateCohort.mutateAsync({
        cohortId: selectedCohort.id,
        data: {
          name: formData.name.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
        },
      });
      setIsEditDialogOpen(false);
      setSelectedCohort(null);
      resetForm();
      toast.success("Cohort updated successfully");
    } catch {
      // error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCohort = async () => {
    if (!selectedCohort) return;
    setIsSubmitting(true);
    try {
      await deleteCohort.mutateAsync(selectedCohort.id);
      setIsDeleteDialogOpen(false);
      setSelectedCohort(null);
    } catch {
      // error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMemberToCohort = async () => {
    if (!selectedCohort || !selectedUserId) return;
    setIsSubmitting(true);
    try {
      await updateUserCohort.mutateAsync({ userId: selectedUserId, cohortId: selectedCohort.id });
      setIsAddMemberDialogOpen(false);
      setSelectedUserId("");
    } catch {
      // error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedCohort) return;
    try {
      await updateUserCohort.mutateAsync({ userId, cohortId: null });
      toast.success("Member removed from cohort");
    } catch {
      // error handled by hook
    }
  };

  const handleAddFacilitator = async () => {
    if (!selectedCohort || !selectedFacilitatorUserId) return;
    setIsSubmitting(true);
    try {
      await addCohortFacilitator.mutateAsync({ cohortId: selectedCohort.id, userId: selectedFacilitatorUserId });
      setIsAddFacilitatorDialogOpen(false);
      setSelectedFacilitatorUserId("");
    } catch {
      // error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFacilitator = async (userId: string) => {
    if (!selectedCohort) return;
    try {
      await removeCohortFacilitator.mutateAsync({ cohortId: selectedCohort.id, userId });
    } catch {
      // error handled by hook
    }
  };

  const handleMessage = async (targetUserId: string) => {
    try {
      const channel = await openDM.mutateAsync(targetUserId);
      router.push(`/dashboard/chat?channelId=${channel.id}`);
    } catch {
      toast.error("Could not open conversation");
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "ACTIVE": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "PENDING": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "COMPLETED": return "bg-blue-100 text-blue-800 border-blue-200";
      case "ARCHIVED": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "FACILITATOR") return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Facilitator</Badge>;
    if (role === "FELLOW") return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Fellow</Badge>;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cohort Management</h1>
            <p className="text-gray-600 mt-1">Manage fellowship cohorts and their members</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Cohort
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : cohorts.length === 0 ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center mb-4">No cohorts found. Create your first cohort to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Create Cohort
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cohorts.map((cohort) => (
              <Card key={cohort.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">{cohort.name}</CardTitle>
                      <Badge variant="outline" className={`mt-2 ${getStateColor(cohort.state)}`}>
                        {cohort.state}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedCohort(cohort);
                        setFormData({ name: cohort.name, startDate: format(new Date(cohort.startDate), "yyyy-MM-dd"), endDate: format(new Date(cohort.endDate), "yyyy-MM-dd") });
                        setIsEditDialogOpen(true);
                      }} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedCohort(cohort); setIsDeleteDialogOpen(true); }} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(cohort.startDate), "MMM d, yyyy")} – {format(new Date(cohort.endDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{cohort._count?.fellows ?? 0} {cohort._count?.fellows === 1 ? "Fellow" : "Fellows"}</span>
                  </div>
                  {(cohort.facilitators?.length ?? 0) > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Facilitator{cohort.facilitators!.length > 1 ? "s" : ""}</p>
                      {cohort.facilitators!.map((f) => (
                        <p key={f.userId} className="text-sm font-medium text-gray-900">{f.user.firstName} {f.user.lastName}</p>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedCohort(cohort); setIsMembersDialogOpen(true); }}>
                      <Users className="h-4 w-4 mr-2" /> View Members
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Cohort Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Cohort</DialogTitle>
              <DialogDescription>Add a new fellowship cohort.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cohort Name *</Label>
                <Input placeholder="e.g., LaunchPad Fellowship April 2027" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
              <p className="text-xs text-gray-500">Facilitators can be assigned after creating the cohort via the Members panel.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleCreateCohort} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Cohort
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Cohort Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Cohort</DialogTitle>
              <DialogDescription>Update cohort details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cohort Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedCohort(null); resetForm(); }} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleEditCohort} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Cohort Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" /> Delete Cohort?
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <p>Are you sure you want to delete <strong>{selectedCohort?.name}</strong>?</p>
                <p className="text-red-600 font-semibold">
                  This will permanently delete {selectedCohort?._count?.fellows ?? 0} {selectedCohort?._count?.fellows === 1 ? "user" : "users"} in this cohort.
                </p>
                <p>This action cannot be undone.</p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleDeleteCohort} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete Cohort
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Members Dialog */}
        <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cohort Members – {selectedCohort?.name}</DialogTitle>
              <DialogDescription>Manage fellows and facilitators in this cohort.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Facilitators section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Facilitators ({selectedCohort?.facilitators?.length ?? 0})</p>
                  <Button size="sm" variant="outline" onClick={() => setIsAddFacilitatorDialogOpen(true)} className="text-purple-700 border-purple-300 hover:bg-purple-50">
                    <UserPlus className="h-4 w-4 mr-1" /> Add Facilitator
                  </Button>
                </div>
                {(selectedCohort?.facilitators?.length ?? 0) === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No facilitators assigned to this cohort yet.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedCohort!.facilitators!.map((f) => (
                      <div key={f.userId} className="flex items-center justify-between p-2 rounded-lg border border-purple-100 bg-purple-50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-purple-700">
                              {f.user.firstName?.charAt(0)}{f.user.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{f.user.firstName} {f.user.lastName}</p>
                            <p className="text-xs text-gray-500">{f.user.email}{f.user.role === "ADMIN" ? " · Admin/Facilitator" : ""}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFacilitator(f.userId)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0" title="Remove facilitator">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Fellows ({cohortMembers.length})</p>
                <Button size="sm" onClick={() => setIsAddMemberDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Fellow
                </Button>
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : cohortMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No fellows in this cohort yet.</p>
                  <p className="text-sm mt-1">Click "Add Fellow" to assign fellows to this cohort.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cohortMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-blue-600">
                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                            {getRoleBadge(member.role)}
                          </div>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleMessage(member.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-2 h-8">
                          Private Message
                        </Button>
                        {member.role === "FELLOW" && (
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0" title="Remove from cohort">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Fellow to {selectedCohort?.name}</DialogTitle>
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
              <Button variant="outline" onClick={() => { setIsAddMemberDialogOpen(false); setSelectedUserId(""); }} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleAddMemberToCohort} disabled={isSubmitting || !selectedUserId} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add to Cohort
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Facilitator Dialog */}
        <Dialog open={isAddFacilitatorDialogOpen} onOpenChange={setIsAddFacilitatorDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Facilitator to {selectedCohort?.name}</DialogTitle>
              <DialogDescription>Select a facilitator or admin with facilitator privileges to assign to this cohort.</DialogDescription>
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
                  {availableFacilitatorsForAssignment.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email}){user.role === "ADMIN" ? " – Admin" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {availableFacilitatorsForAssignment.length === 0
                    ? "No eligible facilitators available (all are already assigned or none exist)"
                    : `${availableFacilitatorsForAssignment.length} facilitator${availableFacilitatorsForAssignment.length === 1 ? "" : "s"} available`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddFacilitatorDialogOpen(false); setSelectedFacilitatorUserId(""); }} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleAddFacilitator} disabled={isSubmitting || !selectedFacilitatorUserId} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign Facilitator
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
