"use client";

import { 
  RefreshCw, BookOpen, Target, Award, ArrowRight, 
  Trophy, Flame, TrendingUp, Sparkles, Zap, Calendar, Rocket
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
  const { user, _hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: achievements, isLoading: achievementsLoading } = useUserAchievements();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
  };

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
      <div className="space-y-6 max-w-[1600px] mx-auto px-6" suppressHydrationWarning>
        {/* Dynamic Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 p-1" suppressHydrationWarning>
          <div className="bg-slate-950 rounded-[22px] p-8 relative overflow-hidden" suppressHydrationWarning>
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" suppressHydrationWarning />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} suppressHydrationWarning />
            
            <div className="relative z-10 flex items-center justify-between" suppressHydrationWarning>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Rocket className="w-10 h-10 text-white" strokeWidth={2} />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">
                    Welcome back, {profile?.name?.split(' ')[0] || user?.name}!
                  </h1>
                  <p className="text-cyan-200 text-lg">
                    {streak > 0 ? `${streak} day streak! You're on fire!` : "Let's start your learning journey today"}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={profileLoading}
                className="text-white hover:bg-white/10"
              >
                <RefreshCw className={`h-4 w-4 ${profileLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mt-8" suppressHydrationWarning>
              <div className="relative group" suppressHydrationWarning>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent rounded-xl blur group-hover:blur-md transition-all" suppressHydrationWarning></div>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all" suppressHydrationWarning>
                  <div className="flex items-center justify-between mb-2">
                    <BookOpen className="w-5 h-5 text-cyan-400" strokeWidth={2.5} />
                    <span className="text-3xl font-black text-white">{profile?.resourcesCompleted || 0}</span>
                  </div>
                  <p className="text-sm font-semibold text-white/90">Resources</p>
                  <p className="text-xs text-cyan-300">of 91 completed</p>
                </div>
              </div>

              <div className="relative group" suppressHydrationWarning>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-xl blur group-hover:blur-md transition-all" suppressHydrationWarning></div>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all" suppressHydrationWarning>
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" strokeWidth={2.5} />
                    <span className="text-3xl font-black text-white">{profile?.totalPoints || 0}</span>
                  </div>
                  <p className="text-sm font-semibold text-white/90">Points</p>
                  <p className="text-xs text-yellow-300">total earned</p>
                </div>
              </div>

              <div className="relative group" suppressHydrationWarning>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent rounded-xl blur group-hover:blur-md transition-all" suppressHydrationWarning></div>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all" suppressHydrationWarning>
                  <div className="flex items-center justify-between mb-2">
                    <Flame className="w-5 h-5 text-orange-400" strokeWidth={2.5} />
                    <span className="text-3xl font-black text-white">{streak}</span>
                  </div>
                  <p className="text-sm font-semibold text-white/90">Streak</p>
                  <p className="text-xs text-orange-300">days active</p>
                </div>
              </div>

              <div className="relative group" suppressHydrationWarning>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-xl blur group-hover:blur-md transition-all" suppressHydrationWarning></div>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all" suppressHydrationWarning>
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
                    <span className="text-3xl font-black text-white">{achievements?.length || 0}</span>
                  </div>
                  <p className="text-sm font-semibold text-white/90">Badges</p>
                  <p className="text-xs text-emerald-300">achievements</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Progress Section - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Overview */}
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-3 text-slate-900">
                      <div className="p-2 bg-blue-500 rounded-xl">
                        <Target className="h-5 w-5 text-white" strokeWidth={2.5} />
                      </div>
                      Learning Progress
                    </CardTitle>
                    <CardDescription className="text-slate-600 mt-1">Your journey to mastery</CardDescription>
                  </div>
                  <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600 text-white shadow-md">
                    <Link href="/resources">
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {/* Main Progress Ring/Bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Overall Completion</h3>
                      <p className="text-sm text-slate-600">Track your complete learning path</p>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        {completionRate}%
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{profile?.resourcesCompleted || 0}/91 resources</p>
                    </div>
                  </div>
                  
                  <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-400 rounded-full shadow-lg transition-all duration-1000 ease-out"
                      style={{ width: `${completionRate}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-500 rounded-xl shadow-md">
                          <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Completed</span>
                      </div>
                      <p className="text-4xl font-black text-green-600">{profile?.resourcesCompleted || 0}</p>
                      <p className="text-xs text-green-700 mt-1">resources finished</p>
                    </div>
                  </div>

                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <div className="relative bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-5 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-orange-500 rounded-xl shadow-md">
                          <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Best Streak</span>
                      </div>
                      <p className="text-4xl font-black text-orange-600">{profile?.longestStreak || 0}</p>
                      <p className="text-xs text-orange-700 mt-1">consecutive days</p>
                    </div>
                  </div>

                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-5 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-500 rounded-xl shadow-md">
                          <Calendar className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">This Week</span>
                      </div>
                      <p className="text-4xl font-black text-purple-600">3</p>
                      <p className="text-xs text-purple-700 mt-1">new completions</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Streak Card */}
            {streak > 0 && (
              <Card className="border-0 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white shadow-2xl overflow-hidden">
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <Flame className="w-10 h-10 text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black mb-1">{streak} Day Streak!</h3>
                        <p className="text-white/90 text-sm">You're crushing it! Keep the momentum going</p>
                      </div>
                    </div>
                    <Button asChild className="bg-white text-orange-600 hover:bg-white/90 font-bold shadow-lg">
                      <Link href="/resources">
                        Continue
                        <Zap className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Achievements Sidebar */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <CardTitle className="text-xl flex items-center gap-3 text-slate-900">
                  <div className="p-2 bg-emerald-500 rounded-xl">
                    <Trophy className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  Achievements
                </CardTitle>
                <CardDescription className="text-slate-600">Your latest unlocks</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {achievementsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="h-14 w-14 rounded-xl bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-3/4" />
                          <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : achievements && achievements.length > 0 ? (
                  <div className="space-y-3">
                    {achievements.slice(0, 5).map((achievement) => (
                      <div 
                        key={achievement.id} 
                        className="group relative cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-sm"></div>
                        <div className="relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 hover:shadow-lg transition-all">
                          <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                            <Award className="h-6 w-6 text-white" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate text-sm">
                              {achievement.achievement?.title || 'Achievement'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button asChild variant="outline" className="w-full mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold">
                      <Link href="/profile#achievements">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                      <Trophy className="h-10 w-10 text-emerald-400" strokeWidth={2} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">No achievements yet</h3>
                    <p className="text-sm text-slate-600 mb-4 px-4">
                      Start learning to unlock your first badge!
                    </p>
                    <Button asChild size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg">
                      <Link href="/resources">
                        <Rocket className="h-4 w-4 mr-2" />
                        Get Started
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
