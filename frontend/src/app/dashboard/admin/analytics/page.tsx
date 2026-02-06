"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, BookOpen, Award, Calendar, 
  Download, Filter, RefreshCw, Activity, MessageSquare 
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Platform Analytics</h1>
            <p className="text-gray-600">Comprehensive insights into platform usage and engagement</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.overview.activeUsers} active this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                +5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.avgEngagement}%</div>
              <p className="text-xs text-muted-foreground">
                Across all resources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Awarded</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.performance.pointsAwarded.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity Trends</CardTitle>
            <CardDescription>Active user engagement across different time periods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily Active</span>
                  <Badge variant="secondary">{analyticsData.userActivity.daily}</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(analyticsData.userActivity.daily / analyticsData.overview.totalUsers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Weekly Active</span>
                  <Badge variant="secondary">{analyticsData.userActivity.weekly}</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(analyticsData.userActivity.weekly / analyticsData.overview.totalUsers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monthly Active</span>
                  <Badge variant="secondary">{analyticsData.userActivity.monthly}</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${(analyticsData.userActivity.monthly / analyticsData.overview.totalUsers) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">User Growth Rate</span>
                <span className="text-lg font-semibold text-green-600">
                  +{analyticsData.userActivity.growth}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Content Statistics</CardTitle>
              <CardDescription>Resource usage and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Total Resources</span>
                </div>
                <span className="text-xl font-bold">{analyticsData.contentStats.totalResources}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Completed Resources</span>
                </div>
                <span className="text-xl font-bold">{analyticsData.contentStats.completedResources}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Avg Time Spent</span>
                </div>
                <span className="text-xl font-bold">{analyticsData.contentStats.avgTimeSpent}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium">Discussion Posts</span>
                </div>
                <span className="text-xl font-bold">{analyticsData.contentStats.discussionPosts}</span>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Assessment and achievement tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Quiz Avg Score</span>
                </div>
                <span className="text-xl font-bold">{analyticsData.performance.quizAvgScore}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Session Attendance</span>
                </div>
                <span className="text-xl font-bold">{analyticsData.performance.sessionAttendance}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium">Achievements Unlocked</span>
                </div>
                <span className="text-xl font-bold">{analyticsData.performance.achievementsUnlocked}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Points Awarded</span>
                </div>
                <span className="text-xl font-bold">
                  {analyticsData.performance.pointsAwarded.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for future charts */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>Detailed engagement analytics coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Chart visualization will be added here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
