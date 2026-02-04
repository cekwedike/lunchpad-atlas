"use client";

import { useState } from "react";
import { User, Award, Settings, FileText, MessageSquare, ClipboardCheck, Calendar, Lock, Trophy, Edit2, Save, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { useProfile, useUserAchievements, useUserStats } from "@/hooks/api/useProfile";
import { UserRole } from "@/types/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: profile, isLoading: isLoadingProfile, error: profileError, refetch: refetchProfile } = useProfile();
  const { data: achievements, isLoading: isLoadingAchievements } = useUserAchievements();
  const { data: stats, isLoading: isLoadingStats } = useUserStats();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    values: profile ? {
      name: profile.name || '',
      email: profile.email || '',
    } : undefined,
  });

  const onSubmit = async (data: ProfileUpdateData) => {
    // TODO: Implement update profile mutation when available
    console.log('Update profile:', data);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    reset();
    setIsEditing(false);
  };

  if (isLoadingProfile) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card className="p-8 animate-pulse">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded"></div></Card>
            <Card className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded"></div></Card>
            <Card className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded"></div></Card>
            <Card className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded"></div></Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (profileError) {
    return (
      <DashboardLayout>
        <ErrorMessage
          title="Failed to load profile"
          message={profileError instanceof Error ? profileError.message : 'An error occurred'}
        />
        <Button onClick={() => refetchProfile()} className="mt-4">
          Try Again
        </Button>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={User}
          title="Profile not found"
          description="Unable to load profile information."
        />
      </DashboardLayout>
    );
  }

  const userInitials = profile.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const roleColor = profile.role === UserRole.FELLOW ? 'blue' : profile.role === UserRole.FACILITATOR ? 'green' : 'red';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="p-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-atlas-navy to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-3xl">{userInitials}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
                  <p className="text-gray-600 mb-3">{profile.email}</p>
                  <div className="flex gap-3">
                    <Badge className={`bg-${roleColor}-100 text-${roleColor}-800`}>
                      {profile.role}
                    </Badge>
                    {profile.cohortId && (
                      <Badge variant="outline">Cohort Member</Badge>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Trophy}
            label="Total Points"
            value={profile.points || 0}
            isLoading={isLoadingStats}
          />
          <StatCard
            icon={FileText}
            label="Resources Completed"
            value={(stats as any)?.resourcesCompleted || 0}
            isLoading={isLoadingStats}
          />
          <StatCard
            icon={MessageSquare}
            label="Discussions Posted"
            value={(stats as any)?.discussionsPosted || 0}
            isLoading={isLoadingStats}
          />
          <StatCard
            icon={ClipboardCheck}
            label="Quizzes Taken"
            value={(stats as any)?.quizzesTaken || 0}
            isLoading={isLoadingStats}
          />
        </div>

        {/* Tab Navigation */}
        <Card>
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "profile"
                  ? "text-atlas-navy border-b-2 border-atlas-navy"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <User className="w-5 h-5" />
              Profile Info
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "achievements"
                  ? "text-atlas-navy border-b-2 border-atlas-navy"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Award className="w-5 h-5" />
              Achievements
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "settings"
                  ? "text-atlas-navy border-b-2 border-atlas-navy"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "profile" && (
              <div className="space-y-6">
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Personal Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <Input
                            {...register('name')}
                            placeholder="Your name"
                          />
                          {errors.name && (
                            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <Input
                            {...register('email')}
                            type="email"
                            placeholder="your.email@example.com"
                          />
                          {errors.email && (
                            <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" className="bg-atlas-navy hover:bg-atlas-navy/90">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button type="button" onClick={handleCancelEdit} variant="outline">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                      <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-semibold text-gray-900">{profile.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-semibold text-gray-900">{profile.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Role:</span>
                          <span className="font-semibold text-gray-900">{profile.role}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "achievements" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Your Achievements</h3>
                {isLoadingAchievements ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="p-4 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </Card>
                    ))}
                  </div>
                ) : achievements && achievements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement: any) => (
                      <Card key={achievement.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <Award className="w-6 h-6 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {achievement.achievement?.title || 'Achievement'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {achievement.achievement?.description || 'Unlocked achievement'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Unlocked {formatDistanceToNow(new Date(achievement.unlockedAt))} ago
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Award}
                    title="No achievements yet"
                    description="Complete resources and participate in activities to unlock achievements."
                  />
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Notification settings will be available soon.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Privacy Settings</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Privacy settings will be available soon.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
