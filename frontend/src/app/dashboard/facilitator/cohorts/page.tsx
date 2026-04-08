"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  // dialogs moved to cohort details page
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Calendar, Loader2, RefreshCw, Ban, ShieldCheck } from "lucide-react";
import { useCohorts } from "@/hooks/api/useAdmin";
import { useFacilitatorSuspendFellow, useFacilitatorUnsuspendFellow } from "@/hooks/api/useFacilitator";
import { useOpenDM } from "@/hooks/api/useChat";
import { useProfile } from "@/hooks/api/useProfile";
import { toast } from "sonner";
import { format } from "date-fns";

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  state: string;
  facilitatorId?: string;
  facilitator?: { id: string; firstName: string; lastName: string; email: string };
  _count?: { fellows: number; sessions: number };
}

export default function FacilitatorCohortsPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: cohortsData, isLoading } = useCohorts();

  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  const cohorts: Cohort[] = Array.isArray(cohortsData) ? cohortsData : [];

  // Show cohorts where this facilitator is the assigned facilitator OR is a cohort member
  const myCohorts = cohorts.filter(
    (cohort) =>
      cohort.facilitatorId === profile?.id ||
      cohort.id === profile?.cohortId
  );

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cohort Management</h1>
          <p className="text-gray-600 mt-1">View and manage your assigned cohorts</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : myCohorts.length === 0 ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center mb-2">You are not currently assigned to facilitate any cohorts.</p>
              <p className="text-sm text-gray-500">Contact an administrator to be assigned to a cohort.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCohorts.map((cohort) => (
              <Card key={cohort.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900">{cohort.name}</CardTitle>
                  <Badge variant="outline" className={`w-fit mt-1 ${getStateColor(cohort.state)}`}>
                    {cohort.state}
                  </Badge>
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
                  <div className="pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/dashboard/facilitator/cohorts/${cohort.id}`)}
                    >
                      <Users className="h-4 w-4 mr-2" /> View Members
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
