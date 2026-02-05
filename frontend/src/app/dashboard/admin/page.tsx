"use client";

import { 
  RefreshCw, Users, Calendar, BookOpen, Activity, Database, Plus, Shield, CheckCircle, 
  TrendingUp, AlertCircle, UserPlus, FileText, MessageSquare, Award, ArrowUp, ArrowDown 
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    weeklyGrowth: 12,
    engagementRate: 78,
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Platform Administration
            </h1>
            <p className="text-gray-600">
              Welcome back, {profile?.name || 'Admin'}! Here's your platform overview.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRefresh} disabled={profileLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="bg-atlas-navy hover:bg-atlas-navy/90">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-100">Total Users</p>
                  <p className="text-3xl font-bold mt-2">{platformStats.totalUsers}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span className="font-semibold">{platformStats.weeklyGrowth}%</span>
                <span className="ml-1 text-blue-100">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-green-100">Active Now</p>
                  <p className="text-3xl font-bold mt-2">{platformStats.activeUsers}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <span className="font-semibold">{platformStats.engagementRate}%</span>
                <span className="ml-1 text-green-100">engagement rate</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-purple-100">Resources</p>
                  <p className="text-3xl font-bold mt-2">{platformStats.resourceCount}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <span className="text-purple-100">Across {platformStats.cohortCount} cohorts</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-orange-100">Storage Used</p>
                  <p className="text-3xl font-bold mt-2">{platformStats.storageUsed}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Database className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm">
                <span className="text-orange-100">of 10GB capacity</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Distribution */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-atlas-navy" />
                User Distribution
              </CardTitle>
              <CardDescription>Breakdown by role across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">Fellows</span>
                    </div>
                    <span className="text-sm font-semibold">{platformStats.fellowCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(platformStats.fellowCount / platformStats.totalUsers) * 100}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Facilitators</span>
                    </div>
                    <span className="text-sm font-semibold">{platformStats.facilitatorCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(platformStats.facilitatorCount / platformStats.totalUsers) * 100}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium">Administrators</span>
                    </div>
                    <span className="text-sm font-semibold">{platformStats.adminCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(platformStats.adminCount / platformStats.totalUsers) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">System Health</CardTitle>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <CardDescription>All systems running smoothly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'API Server', status: 'Healthy', color: 'green' },
                { name: 'Database', status: 'Connected', color: 'green' },
                { name: 'Storage', status: '24% Used', color: 'blue' },
                { name: 'Cache', status: 'Active', color: 'green' },
              ].map((system, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full bg-${system.color}-500 animate-pulse`} />
                    <span className="text-sm font-medium">{system.name}</span>
                  </div>
                  <span className="text-xs text-gray-600">{system.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Admin Actions */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-atlas-navy" />
                Recent Actions
              </CardTitle>
              <CardDescription>Latest administrative activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Created new user', user: 'john.doe@example.com', time: '1 hour ago', icon: UserPlus, color: 'blue' },
                  { action: 'Updated cohort settings', user: 'April 2026 Cohort A', time: '3 hours ago', icon: Calendar, color: 'green' },
                  { action: 'Added new resource', user: 'Advanced Python Module', time: '5 hours ago', icon: BookOpen, color: 'purple' },
                  { action: 'Moderated discussion', user: 'React Best Practices', time: '1 day ago', icon: MessageSquare, color: 'orange' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                      <item.icon className={`h-4 w-4 text-${item.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.action}</p>
                      <p className="text-sm text-gray-600 truncate">{item.user}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-atlas-navy" />
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used admin tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-blue-50 hover:border-blue-300">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                  <span className="text-sm font-medium">Add User</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-green-50 hover:border-green-300">
                  <Calendar className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium">New Cohort</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-purple-50 hover:border-purple-300">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <span className="text-sm font-medium">Add Resource</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-orange-50 hover:border-orange-300">
                  <Database className="h-6 w-6 text-orange-600" />
                  <span className="text-sm font-medium">Backup Data</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
