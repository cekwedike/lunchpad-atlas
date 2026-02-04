"use client";

import { RefreshCw, Users, Calendar, BookOpen, Activity, Database, Plus, Shield, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const platformStats = {
    totalUsers: 156,
    fellowCount: 125,
    facilitatorCount: 28,
    adminCount: 3,
    cohortCount: 5,
    resourceCount: 91,
    activeUsers: 34,
    storageUsed: "2.4GB",
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
                <CardTitle className="text-2xl">Platform Administration</CardTitle>
                <CardDescription className="text-white/80 mt-1">
                  Manage users, cohorts, and platform configuration
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={profileLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="secondary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Total Users" value={platformStats.totalUsers} icon={Users} isLoading={profileLoading} />
          <StatCard title="Cohorts" value={platformStats.cohortCount} icon={Calendar} isLoading={profileLoading} />
          <StatCard title="Resources" value={platformStats.resourceCount} icon={BookOpen} isLoading={profileLoading} />
          <StatCard title="Active Now" value={platformStats.activeUsers} icon={Activity} isLoading={profileLoading} />
          <StatCard title="Storage" value={platformStats.storageUsed} icon={Database} isLoading={profileLoading} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Admin Actions</CardTitle>
              <CardDescription>Latest administrative changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-2 w-2 translate-y-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Created new user: john.doe@example.com</p>
                    <p className="text-xs text-muted-foreground">By Admin User - 1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-2 w-2 translate-y-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Updated April 2026 Cohort A settings</p>
                    <p className="text-xs text-muted-foreground">By Admin User - 3 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>System Health</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">All Systems Operational</Badge>
              </CardTitle>
              <CardDescription>Platform status and monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">API Status</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Database</p>
                    <p className="text-xs text-muted-foreground">Connected</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
              <CardDescription>Breakdown by role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fellows</span>
                  <span className="font-semibold">{platformStats.fellowCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(platformStats.fellowCount / platformStats.totalUsers) * 100}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Facilitators</span>
                  <span className="font-semibold">{platformStats.facilitatorCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(platformStats.facilitatorCount / platformStats.totalUsers) * 100}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create New User
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Create New Cohort
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                View Audit Log
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
