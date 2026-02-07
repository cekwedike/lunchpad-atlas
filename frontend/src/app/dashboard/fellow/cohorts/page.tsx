"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Calendar, Loader2
} from "lucide-react";
import { useCohorts, useAdminUsers } from "@/hooks/api/useAdmin";
import { useProfile } from "@/hooks/api/useProfile";
import { format } from "date-fns";

export default function FellowCohortsPage() {
  const { data: profile } = useProfile();
  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts();
  
  const cohorts: any[] = Array.isArray(cohortsData) ? cohortsData : [];
  
  // Find fellow's cohort
  const myCohort = cohorts.find((cohort) => cohort.id === profile?.cohortId);
  
  // Fetch cohort members if user has a cohort
  const { data: membersResponse, isLoading: membersLoading } = useAdminUsers(
    myCohort ? { cohortId: myCohort.id, role: 'FELLOW' } : undefined
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

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Cohort</h1>
          <p className="text-gray-600 mt-1">
            View your cohort details and connect with fellow participants
          </p>
        </div>

        {cohortsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !myCohort ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center">
                You are not currently assigned to any cohort.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Please contact an administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Cohort Details Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {myCohort.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Your fellowship cohort details
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="outline"
                    className={`${getStateColor(myCohort.state)} font-medium`}
                  >
                    {myCohort.state}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Duration</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(myCohort.startDate), "MMM d, yyyy")} - {format(new Date(myCohort.endDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cohort Size</p>
                      <p className="text-sm text-gray-600">
                        {myCohort._count?.fellows || 0} {myCohort._count?.fellows === 1 ? "Fellow" : "Fellows"}
                      </p>
                    </div>
                  </div>
                </div>

                {myCohort.facilitator && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-900 mb-2">Facilitator</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600">
                          {myCohort.facilitator.firstName?.charAt(0)}{myCohort.facilitator.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {myCohort.facilitator.firstName} {myCohort.facilitator.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{myCohort.facilitator.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cohort Members Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Cohort Members</CardTitle>
                <CardDescription>
                  Connect and collaborate with your fellow participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : cohortMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No members found in this cohort.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cohortMembers.map((member: any) => (
                      <div
                        key={member.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          member.id === profile?.id 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold shadow-sm">
                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 truncate">
                                {member.firstName} {member.lastName}
                              </p>
                              {member.id === profile?.id && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{member.email}</p>
                            {member.currentMonthPoints > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {member.currentMonthPoints} points
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
