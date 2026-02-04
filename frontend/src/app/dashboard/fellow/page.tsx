"use client";

import { RefreshCw, BookOpen, Target, Star, TrendingUp, Award } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorMessage } from "@/components/ui/error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { useProfile, useUserAchievements } from "@/hooks/api/useProfile";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

export default function FellowDashboard() {
  const { user, isGuestMode } = useAuthStore();
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: achievements, isLoading: achievementsLoading } = useUserAchievements();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
  };

  if (profileError) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load dashboard data" onRetry={handleRefresh} />
      </DashboardLayout>
    );
  }

  const completionRate = profile?.resourcesCompleted ? Math.round((profile.resourcesCompleted / 91) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-atlas-navy to-[#1a1a6e] rounded-xl p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {isGuestMode ? 'Guest' : profile?.name || user?.name}!
            </h1>
            <p className="text-white/80">Ready to continue your learning journey?</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={profileLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Resources" value={`${profile?.resourcesCompleted || 0}/91`} icon={BookOpen} isLoading={profileLoading} />
          <StatCard title="Points" value={profile?.totalPoints || 0} icon={Target} isLoading={profileLoading} />
          <StatCard title="Current Streak" value={`${profile?.currentStreak || 0} days`} icon={TrendingUp} isLoading={profileLoading} />
          <StatCard title="Achievements" value={`${achievements?.length || 0}/24`} icon={Star} isLoading={achievementsLoading} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Achievements</span>
                <Link href="/profile#achievements">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : achievements && achievements.length > 0 ? (
                <div className="space-y-4">
                  {achievements.slice(0, 3).map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <Award className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{achievement.achievement?.title}</p>
                        <p className="text-sm text-muted-foreground">Unlocked</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Award} title="No achievements yet" description="Complete resources and participate to earn achievements" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Completion</span>
                  <span className="text-sm font-semibold">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-atlas-navy h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-2xl font-bold">{profile?.resourcesCompleted || 0}</p>
                  <p className="text-sm text-muted-foreground">Resources Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.longestStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/resources">Continue Learning</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
