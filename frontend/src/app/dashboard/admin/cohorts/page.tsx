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
  Users, Calendar, Plus, Edit, Trash2, Loader2, AlertTriangle, Copy,
} from "lucide-react";
import {
  useCohorts,
  useCreateCohort,
  useUpdateCohort,
  useDeleteCohort,
  useDuplicateCohort,
} from "@/hooks/api/useAdmin";
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
  const duplicateCohort = useDuplicateCohort();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cohorts: Cohort[] = Array.isArray(cohortsData) ? cohortsData : [];

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

  const handleDuplicateCohort = async () => {
    if (!selectedCohort) return;
    setIsSubmitting(true);
    try {
      await duplicateCohort.mutateAsync({
        cohortId: selectedCohort.id,
        name: duplicateName.trim() || undefined,
      });
      setIsDuplicateDialogOpen(false);
      setDuplicateName("");
      setSelectedCohort(null);
    } catch {
      // error handled by hook
    } finally {
      setIsSubmitting(false);
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
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Duplicate cohort"
                        onClick={() => {
                          setSelectedCohort(cohort);
                          setDuplicateName(`${cohort.name} (Copy)`);
                          setIsDuplicateDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Copy className="h-4 w-4" />
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/dashboard/admin/cohorts/${cohort.id}`)}
                    >
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
                <Input
                  type="date"
                  value={formData.startDate ? formData.startDate.slice(0, 10) : ""}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.endDate ? formData.endDate.slice(0, 10) : ""}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
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

        {/* Duplicate Cohort Dialog */}
        <Dialog open={isDuplicateDialogOpen} onOpenChange={(open) => { setIsDuplicateDialogOpen(open); if (!open) { setDuplicateName(""); setSelectedCohort(null); } }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-blue-600" /> Duplicate Cohort
              </DialogTitle>
              <DialogDescription>
                Creates a new cohort with all sessions and resources copied from <strong>{selectedCohort?.name}</strong>. No members are copied.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>New Cohort Name *</Label>
                <Input
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  placeholder={`${selectedCohort?.name} (Copy)`}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleDuplicateCohort} disabled={isSubmitting || !duplicateName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Duplicate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
