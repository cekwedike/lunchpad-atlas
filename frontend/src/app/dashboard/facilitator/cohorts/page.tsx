"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  Users, Calendar, Loader2
} from "lucide-react";
import { useCohorts, useAdminUsers } from "@/hooks/api/useAdmin";
import { useProfile } from "@/hooks/api/useProfile";
import { format } from "date-fns";

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  state: string;
  facilitatorId?: string;
  facilitator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    fellows: number;
    sessions: number;
  };
}

export default function FacilitatorCohortsPage() {
  const { data: profile } = useProfile();
  const { data: cohortsData, isLoading } = useCohorts();
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  
  const cohorts: Cohort[] = Array.isArray(cohortsData) ? cohortsData : [];
  
  // Filter cohorts managed by this facilitator
  const myCohorts = cohorts.filter((cohort) => cohort.facilitatorId === profile?.id);
  
  // Fetch cohort members when viewing a specific cohort
  const { data: membersResponse, isLoading: membersLoading } = useAdminUsers(
    selectedCohort && isMembersDialogOpen
      ? { cohortId: selectedCohort.id, role: 'FELLOW' }
      : undefined
  );
  const cohortMembers = membersResponse?.users || [];

  const getStateColor = (state: string) => {
    switch (state) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const openMembersDialog = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setIsMembersDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cohort Management</h1>
          <p className="text-gray-600 mt-1">
            View and manage your assigned cohorts
          </p>
        </div>

        {/* Cohorts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : myCohorts.length === 0 ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center mb-2">
                You are not currently assigned to facilitate any cohorts.
              </p>
              <p className="text-sm text-gray-500">
                Contact an administrator to be assigned to a cohort.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCohorts.map((cohort) => (
              <Card key={cohort.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
               <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {cohort.name}
                      </CardTitle>
                      <Badge 
                        variant="outline"
                        className={`mt-2 ${getStateColor(cohort.state)}`}
                      >
                        {cohort.state}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(cohort.startDate), "MMM d, yyyy")} - {format(new Date(cohort.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>
                      {cohort._count?.fellows || 0} {cohort._count?.fellows === 1 ? "Fellow" : "Fellows"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openMembersDialog(cohort)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Members
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Members Dialog (Read-only) */}
        <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cohort Members - {selectedCohort?.name}</DialogTitle>
              <DialogDescription>
                View fellows in this cohort. Contact an administrator to manage members.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                {cohortMembers.length} {cohortMembers.length === 1 ? "member" : "members"}
              </p>

              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : cohortMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No fellows in this cohort yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cohortMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">
                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      {member.currentMonthPoints > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {member.currentMonthPoints} pts
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsMembersDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
