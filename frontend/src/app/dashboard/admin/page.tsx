"use client";

import { 
  RefreshCw, Users, Calendar, BookOpen, Activity, Database, Plus, Shield, CheckCircle, 
  UserPlus, FileText, MessageSquare, Mail
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const platformStats = {
    totalUsers: 156,
    fellowCount: 125,
    facilitatorCount: 28,
    adminCount: 3,
    cohortCount: 5,
    resourceCount: 91,
    activeUsers: 34,
    storageUsed: "2.4GB",
    storageCapacity: "10GB",
    weeklyGrowth: 12,
    engagementRate: 78,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Administration</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {profile?.name || 'Admin User'}! Here's your platform overview.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || profileLoading}
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || profileLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{platformStats.totalUsers}</div>
              <p className="text-xs text-emerald-600 mt-1">
                ↑ {platformStats.weeklyGrowth}% vs last week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Active Now</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{platformStats.activeUsers}</div>
              <p className="text-xs text-gray-500 mt-1">
                {platformStats.engagementRate}% engagement rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Resources</CardTitle>
                <BookOpen className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{platformStats.resourceCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                Across {platformStats.cohortCount} cohorts
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Storage Used</CardTitle>
                <Database className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{platformStats.storageUsed}</div>
              <p className="text-xs text-gray-500 mt-1">
                of {platformStats.storageCapacity} capacity
              </p>
            </CardContent>
          </Card>
        </div>

        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Distribution */}
          <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">User Distribution</CardTitle>
              <CardDescription className="text-gray-600">Breakdown by role across the platform</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-gray-900">Fellows</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{platformStats.fellowCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(platformStats.fellowCount / platformStats.totalUsers) * 100}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-gray-900">Facilitators</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{platformStats.facilitatorCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(platformStats.facilitatorCount / platformStats.totalUsers) * 100}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-sm font-medium text-gray-900">Administrators</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{platformStats.adminCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-violet-500 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(platformStats.adminCount / platformStats.totalUsers) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">System Health</CardTitle>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <CardDescription className="text-gray-600">All systems running smoothly</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {[
                  { name: 'API Server', status: 'Healthy', color: 'emerald' },
                  { name: 'Database', status: 'Connected', color: 'emerald' },
                  { name: 'Storage', status: '24% Used', color: 'blue' },
                  { name: 'Cache', status: 'Active', color: 'emerald' },
                ].map((system, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full bg-${system.color}-500 animate-pulse`} />
                      <span className="text-sm font-medium text-gray-900">{system.name}</span>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{system.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Admin Actions */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Actions</CardTitle>
              <CardDescription className="text-gray-600">Latest administrative activities</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { action: 'Created new user', user: 'john.doe@example.com', time: '1 hour ago', icon: UserPlus, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
                  { action: 'Updated cohort settings', user: 'April 2026 Cohort A', time: '3 hours ago', icon: Calendar, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
                  { action: 'Added new resource', user: 'Advanced Python Module', time: '5 hours ago', icon: BookOpen, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
                  { action: 'Moderated discussion', user: 'React Best Practices', time: '1 day ago', icon: MessageSquare, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg ${item.iconBg}`}>
                      <item.icon className={`h-4 w-4 ${item.iconColor}`} />
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
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">Frequently used admin tools</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2 bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                >
                  <UserPlus className="h-6 w-6" />
                  <span className="text-sm font-medium">Add User</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2 bg-white border-gray-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
                >
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm font-medium">New Cohort</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2 bg-white border-gray-300 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600"
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm font-medium">Add Resource</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2 bg-white border-gray-300 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600"
                >
                  <Database className="h-6 w-6" />
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
