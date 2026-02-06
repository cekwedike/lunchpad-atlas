"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, BookOpen, Award, Calendar, 
  Download, Filter, RefreshCw, Activity, MessageSquare, CheckCircle
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const analyticsData = {
    overview: {
      totalUsers: 156,
      activeUsers: 124,
      completionRate: 78,
      avgEngagement: 85,
    },
    userActivity: {
      daily: 45,
      weekly: 98,
      monthly: 142,
      growth: 12.5,
    },
    contentStats: {
      totalResources: 91,
      completedResources: 1247,
      avgTimeSpent: "24m",
      discussionPosts: 342,
    },
    performance: {
      quizAvgScore: 82,
      sessionAttendance: 89,
      achievementsUnlocked: 456,
      pointsAwarded: 12450,
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-600 mt-1">Comprehensive insights into platform usage and engagement</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline"
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalUsers}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.overview.activeUsers} active this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.completionRate}%</div>
              <p className="text-xs text-emerald-600 mt-1">
                +5% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.avgEngagement}%</div>
              <p className="text-xs text-gray-500 mt-1">
                Across all resources
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Points Awarded</CardTitle>
                <Award className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.performance.pointsAwarded.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Activity */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">User Activity Trends</CardTitle>
            <CardDescription className="text-gray-600">Active user engagement across different time periods</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Daily Active</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {analyticsData.userActivity.daily}
                  </Badge>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${(analyticsData.userActivity.daily / analyticsData.overview.totalUsers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Weekly Active</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {analyticsData.userActivity.weekly}
                  </Badge>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${(analyticsData.userActivity.weekly / analyticsData.overview.totalUsers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Monthly Active</span>
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                    {analyticsData.userActivity.monthly}
                  </Badge>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div 
                    className="bg-violet-500 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${(analyticsData.userActivity.monthly / analyticsData.overview.totalUsers) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">User Growth Rate</span>
                <span className="text-lg font-bold text-emerald-600">
                  +{analyticsData.userActivity.growth}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Stats */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Content Statistics</CardTitle>
              <CardDescription className="text-gray-600">Resource usage and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Total Resources</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{analyticsData.contentStats.totalResources}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <Activity className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Completed Resources</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{analyticsData.contentStats.completedResources}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-100">
                      <Calendar className="h-5 w-5 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Avg Time Spent</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{analyticsData.contentStats.avgTimeSpent}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <MessageSquare className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Discussion Posts</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{analyticsData.contentStats.discussionPosts}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Performance Metrics</CardTitle>
              <CardDescription className="text-gray-600">Assessment and achievement tracking</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Quiz Avg Score</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{analyticsData.performance.quizAvgScore}%</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Session Attendance</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{analyticsData.performance.sessionAttendance}%</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Award className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Achievements Unlocked</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{analyticsData.performance.achievementsUnlocked}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-100">
                      <TrendingUp className="h-5 w-5 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Points Awarded</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {analyticsData.performance.pointsAwarded.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for future charts */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Engagement Trends</CardTitle>
            <CardDescription className="text-gray-600">Detailed engagement analytics coming soon</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium">Chart visualization will be added here</p>
                <p className="text-gray-500 text-sm mt-1">Interactive charts and graphs for detailed analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
