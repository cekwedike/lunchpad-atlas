"use client";

import { 
  RefreshCw, Users, MessageSquare, TrendingUp, Clock, AlertCircle, CheckCircle,
  Calendar, BarChart3, Target, Award, ArrowRight, UserCheck, Bell, ChevronRight 
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

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
      <div className="space-y-8">
        {/* Hero Cohort Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-atlas-navy via-indigo-900 to-purple-900 p-4 sm:p-6 lg:p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-48 -mb-48" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">Cohort A</Badge>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Active</Badge>
                </div>
                <h1 className="text-4xl font-bold mb-2">April 2026 Cohort</h1>
                <p className="text-blue-100 text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Next session: Week 4 - Leading Early (April 25, 2026)
                </p>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={profileLoading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: 'Active Fellows', 
                  value: cohortStats.fellowCount, 
                  icon: Users,
                  color: 'from-blue-400 to-blue-600'
                },
                { 
                  label: 'Avg Progress', 
                  value: `${cohortStats.avgProgress}%`, 
                  icon: TrendingUp,
                  color: 'from-green-400 to-emerald-600'
                },
                { 
                  label: 'Discussions', 
                  value: cohortStats.totalDiscussions, 
                  icon: MessageSquare,
                  color: 'from-purple-400 to-pink-500'
                },
                { 
                  label: 'Attendance', 
                  value: `${cohortStats.avgAttendance}%`, 
                  icon: Clock,
                  color: 'from-orange-400 to-red-500'
                },
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm text-blue-100">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity - Takes 2 columns */}
          <Card className="lg:col-span-2 shadow-lg border-2 border-blue-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest fellow actions and milestones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'John Doe', action: 'completed "Setting SMART Goals"', time: '2 hours ago', type: 'success', icon: CheckCircle },
                  { name: 'Sarah Parker', action: 'posted in "Ownership Mindset" discussion', time: '4 hours ago', type: 'info', icon: MessageSquare },
                  { name: 'Michael Chen', action: 'unlocked "Early Bird" achievement', time: '6 hours ago', type: 'achievement', icon: Award },
                  { name: 'Emily Rodriguez', action: 'completed Week 3 resources', time: '8 hours ago', type: 'success', icon: CheckCircle },
                  { name: 'David Kim', action: 'started "Leading with Vision" module', time: '1 day ago', type: 'info', icon: Target },
                ].map((activity, i) => {
                  const colors: Record<string, string> = {
                    success: 'bg-green-100 text-green-700 border-green-200',
                    info: 'bg-blue-100 text-blue-700 border-blue-200',
                    achievement: 'bg-purple-100 text-purple-700 border-purple-200'
                  };
                  return (
                    <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${colors[activity.type] || colors.info} hover:shadow-md transition-all`}>
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/50">
                        <activity.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{activity.name}</p>
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs opacity-70 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Attention Required */}
          <Card className="shadow-lg border-2 border-yellow-100">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-600" />
                  Attention Needed
                </span>
                <Badge className="bg-red-500 text-white hover:bg-red-600">2</Badge>
              </CardTitle>
              <CardDescription>Fellows who may need support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Jane Smith', issue: 'No activity in 5 days', severity: 'high' },
                  { name: 'Robert Johnson', issue: 'Below 50% progress', severity: 'medium' },
                ].map((fellow, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-3 rounded-xl p-4 border-2 ${
                      fellow.severity === 'high' 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-yellow-200 bg-yellow-50'
                    } hover:shadow-md transition-all cursor-pointer`}
                  >
                    <AlertCircle className={`h-5 w-5 ${fellow.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{fellow.name}</p>
                      <p className="text-xs text-gray-600">{fellow.issue}</p>
                      <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs">
                        Contact Fellow
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Cohort Progress */}
          <Card className="shadow-lg border-2 border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Cohort Progress
              </CardTitle>
              <CardDescription>Overall completion status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700">Resources Completed</span>
                  <span className="text-2xl font-bold text-green-700">{cohortStats.avgProgress}%</span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-1000"
                    style={{ width: `${cohortStats.avgProgress}%` }} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <Users className="h-5 w-5 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{cohortStats.fellowCount}</p>
                  <p className="text-xs text-blue-600">Total Fellows</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <UserCheck className="h-5 w-5 text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-700">{cohortStats.activeRate}%</p>
                  <p className="text-xs text-green-600">Active This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg border-2 border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common facilitator tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Post Announcement', icon: MessageSquare, color: 'blue' },
                  { label: 'View Fellows', icon: Users, color: 'green' },
                  { label: 'Mark Attendance', icon: CheckCircle, color: 'purple' },
                  { label: 'View Analytics', icon: BarChart3, color: 'orange' },
                ].map((action, i) => (
                  <Button 
                    key={i}
                    className={`h-24 flex-col gap-2 ${
                      action.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                      action.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                      action.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                      'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    <action.icon className="h-6 w-6" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
