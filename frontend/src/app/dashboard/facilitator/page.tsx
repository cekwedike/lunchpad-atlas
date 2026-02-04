"use client";

import { RefreshCw, Users, MessageSquare, TrendingUp, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useQueryClient } from "@tanstack/react-query";

export default function FacilitatorDashboard() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const cohortStats = {
    fellowCount: 28,
    activeRate: 96,
    avgProgress: 67,
    totalDiscussions: 142,
    avgAttendance: 89,
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-atlas-navy to-[#1a1a6e] text-white border-none">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">April 2026 Cohort A</CardTitle>
                <CardDescription className="text-white/80 mt-1">
                  Next session: Week 4 - Leading Early (April 25, 2026)
                </CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={profileLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Fellows" value={cohortStats.fellowCount} icon={Users} isLoading={profileLoading} />
          <StatCard title="Avg Progress" value={`${cohortStats.avgProgress}%`} icon={TrendingUp} isLoading={profileLoading} />
          <StatCard title="Discussions" value={cohortStats.totalDiscussions} icon={MessageSquare} isLoading={profileLoading} />
          <StatCard title="Attendance" value={`${cohortStats.avgAttendance}%`} icon={Clock} isLoading={profileLoading} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest fellow actions and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-2 w-2 translate-y-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">John Doe completed "Setting SMART Goals"</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-2 w-2 translate-y-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sarah posted in "Ownership Mindset" discussion</p>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Attention Required</span>
                <Badge variant="destructive">2</Badge>
              </CardTitle>
              <CardDescription>Fellows who may need support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Jane Smith</p>
                    <p className="text-xs text-muted-foreground">No activity in 5 days</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cohort Progress</CardTitle>
              <CardDescription>Overall completion status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Resources Completed</span>
                  <span className="text-sm font-semibold">{cohortStats.avgProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-atlas-navy h-2 rounded-full transition-all" style={{ width: `${cohortStats.avgProgress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-2xl font-bold">{cohortStats.fellowCount}</p>
                  <p className="text-sm text-muted-foreground">Total Fellows</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{cohortStats.activeRate}%</p>
                  <p className="text-sm text-muted-foreground">Active This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common facilitator tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Post Announcement
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                View Fellow List
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Attendance
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
