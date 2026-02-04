"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Calendar, Award, Settings, LogOut } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");

  const user = {
    firstName: "Guest",
    lastName: "User",
    email: "guest@example.com",
    role: "Fellow",
    cohort: "April 2026 Cohort A",
    joinedDate: "April 4, 2026",
    totalPoints: 2450,
    resourcesCompleted: 12,
    achievements: 8,
    streak: 3,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-[#0b0b45] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/fellow")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <User className="w-6 h-6" />
              <span className="font-bold text-xl">My Profile</span>
            </div>
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#0b0b45] to-[#1a1a6e] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-3xl">GU</span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex items-center gap-4 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {user.joinedDate}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {user.role}
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  {user.cohort}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <p className="text-3xl font-bold text-[#0b0b45] mb-1">{user.totalPoints}</p>
            <p className="text-sm text-gray-600">Total Points</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <p className="text-3xl font-bold text-[#0b0b45] mb-1">{user.resourcesCompleted}</p>
            <p className="text-sm text-gray-600">Resources Done</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <p className="text-3xl font-bold text-[#0b0b45] mb-1">{user.achievements}</p>
            <p className="text-sm text-gray-600">Achievements</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
            <p className="text-3xl font-bold text-[#0b0b45] mb-1">{user.streak}</p>
            <p className="text-sm text-gray-600">Day Streak</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "profile"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
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
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
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
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
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
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={user.firstName}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b0b45]"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={user.lastName}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b0b45]"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={user.email}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b0b45] bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Fellowship Details</h3>
                  <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="font-semibold text-gray-900">{user.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cohort:</span>
                      <span className="font-semibold text-gray-900">{user.cohort}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Joined:</span>
                      <span className="font-semibold text-gray-900">{user.joinedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "achievements" && (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Achievements</h3>
                <p className="text-gray-600">Unlocked badges and milestones will appear here</p>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                      <span className="text-gray-700">Email notifications for new resources</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                      <span className="text-gray-700">Email notifications for discussion replies</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                      <span className="text-gray-700">Weekly progress summary</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Privacy</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                      <span className="text-gray-700">Show on leaderboard</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                      <span className="text-gray-700">Allow others to see my achievements</span>
                    </label>
                  </div>
                </div>

                <button className="w-full px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors">
                  Save Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
