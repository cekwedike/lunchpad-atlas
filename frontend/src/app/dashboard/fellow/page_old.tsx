"use client";

import { 
  RefreshCw, BookOpen, Target, Award, ArrowRight, 
  Trophy, Flame, CheckCircle2, TrendingUp, Sparkles, Users
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { useProfile, useUserAchievements } from "@/hooks/api/useProfile";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

export default function FellowDashboard() {
  const { user, isGuestMode, isAuthenticated, _hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: achievements, isLoading: achievementsLoading } = useUserAchievements();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
  };

  // Wait for Zustand to hydrate from localStorage
  if (!_hasHydrated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-700 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (profileError && !profileLoading) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load dashboard data" onRetry={handleRefresh} />
      </DashboardLayout>
    );
  }

  const completionRate = profile?.resourcesCompleted ? Math.round((profile.resourcesCompleted / 91) * 100) : 0;
  const streak = profile?.currentStreak || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header with Welcome */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back, {isGuestMode ? 'Guest' : profile?.name?.split(' ')[0] || user?.name}! 👋
            </h1>
            <p className="text-slate-600 mt-1">
              Here's what's happening with your learning journey today
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={profileLoading}
            className="border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-500 rounded-xl shadow-sm">
                  <BookOpen className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-3xl font-bold text-slate-900">{profile?.resourcesCompleted || 0}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Resources Completed</p>
                <p className="text-xs text-slate-500 mt-0.5">Out of 91 total</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-cyan-500 rounded-xl shadow-sm">
                  <Sparkles className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-3xl font-bold text-slate-900">{profile?.totalPoints || 0}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Total Points</p>
                <p className="text-xs text-slate-500 mt-0.5">Earned from learning</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-orange-500 rounded-xl shadow-sm">
                  <Flame className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-3xl font-bold text-slate-900">{streak}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Day Streak</p>
                <p className="text-xs text-slate-500 mt-0.5">Keep the momentum!</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-emerald-500 rounded-xl shadow-sm">
                  <Trophy className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-3xl font-bold text-slate-900">{achievements?.length || 0}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Achievements</p>
                <p className="text-xs text-slate-500 mt-0.5">Badges earned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Learning Progress - Takes 2 columns */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                    <Target className="h-5 w-5 text-blue-500" />
                    Learning Progress
                  </CardTitle>
                  <CardDescription className="text-slate-600">Track your journey to mastery</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                  <Link href="/resources">
                    View All
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Overall Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700">Overall Completion</span>
                  <span className="text-2xl font-bold text-atlas-navy">{completionRate}%</span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 transition-all duration-1000 ease-out"
                    style={{ width: `${completionRate}%` }} 
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white drop-shadow">
                      {profile?.resourcesCompleted || 0} of 91 completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{profile?.resourcesCompleted || 0}</p>
                  <p className="text-xs text-blue-600 mt-1">Resources finished</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Best Streak</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">{profile?.longestStreak || 0}</p>
                  <p className="text-xs text-orange-600 mt-1">Days in a row</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">This Week</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">3</p>
                  <p className="text-xs text-green-600 mt-1">Resources completed</p>
                </div>
              </div>

              {/* Quick Action Button */}
              <Button asChild className="w-full bg-gradient-to-r from-atlas-navy to-blue-600 hover:from-atlas-navy/90 hover:to-blue-600/90 h-12 text-base">
                <Link href="/resources">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Continue Learning
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card className="shadow-lg border-2 border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-600" />
                Achievements
              </CardTitle>
              <CardDescription>Your latest unlocks</CardDescription>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse p-3">
                      <div className="h-14 w-14 rounded-xl bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : achievements && achievements.length > 0 ? (
                <div className="space-y-3">
                  {achievements.slice(0, 4).map((achievement, i) => (
                    <div 
                      key={achievement.id} 
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg">
                        <Award className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {achievement.achievement?.title || 'Achievement'}
                        </p>
                        <p className="text-xs text-purple-600">
                          Unlocked • {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button asChild variant="outline" className="w-full mt-2 border-purple-300 text-purple-700 hover:bg-purple-50">
                    <Link href="/profile#achievements">
                      View All Achievements
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                    <Trophy className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">No achievements yet</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Complete resources and participate to earn your first achievement!
                  </p>
                  <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Link href="/resources">Start Learning</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Streak Motivation Section */}
        {streak > 0 && (
          <Card className="shadow-lg bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg">
                    <Flame className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {streak} Day Streak! 🔥
                    </h3>
                    <p className="text-gray-600">
                      Keep it up! Learn something new today to maintain your streak.
                    </p>
                  </div>
                </div>
                <Button asChild className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg">
                  <Link href="/resources">
                    Keep Going
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
