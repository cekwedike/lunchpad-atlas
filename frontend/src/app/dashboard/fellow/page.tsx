"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Home, 
  BookOpen, 
  MessageSquare, 
  Trophy, 
  User, 
  LogOut,
  Target,
  Clock,
  Star
} from "lucide-react";

export default function FellowDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-[#0b0b45] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#0b0b45] font-bold text-xl">A</span>
              </div>
              <span className="font-bold text-xl">ATLAS</span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/leaderboard")}
                className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
              >
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">2,450 pts</span>
              </button>
              <button
                onClick={() => router.push("/profile")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <User className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#0b0b45] to-[#1a1a6e] rounded-xl p-6 text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, Guest!</h1>
          <p className="text-white/80">Ready to continue your learning journey?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Resources</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">12/91</p>
            <p className="text-sm text-gray-500 mt-1">Completed</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Points</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">2,450</p>
            <p className="text-sm text-gray-500 mt-1">Total earned</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Achievements</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">8/24</p>
            <p className="text-sm text-gray-500 mt-1">Unlocked</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Sessions</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">3/16</p>
            <p className="text-sm text-gray-500 mt-1">Attended</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "overview"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Home className="w-5 h-5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "resources"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Resources
            </button>
            <button
              onClick={() => setActiveTab("discussions")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "discussions"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              Discussions
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "leaderboard"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Trophy className="w-5 h-5" />
              Leaderboard
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Current Progress</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                      <span className="text-sm font-semibold text-gray-900">13%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-[#0b0b45] h-3 rounded-full" style={{ width: "13%" }}></div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-900">Recent Resources</h3>
                    <button
                      onClick={() => router.push("/resources")}
                      className="text-sm text-[#0b0b45] hover:underline font-medium"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push("/resources/1")}
                      className="w-full border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <h4 className="font-semibold text-gray-900">360° Leadership</h4>
                      <p className="text-sm text-gray-600 mt-1">Session 1 - Ownership Mindset</p>
                    </button>
                    <button
                      onClick={() => router.push("/resources/2")}
                      className="w-full border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <h4 className="font-semibold text-gray-900">Ownership Mindset</h4>
                      <p className="text-sm text-gray-600 mt-1">Session 1 - Ownership Mindset</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "resources" && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse All Resources</h3>
                <p className="text-gray-600 mb-4">91 curated resources across 16 sessions</p>
                <button
                  onClick={() => router.push("/resources")}
                  className="px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors"
                >
                  Go to Resources
                </button>
              </div>
            )}

            {activeTab === "discussions" && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Join the Conversation</h3>
                <p className="text-gray-600 mb-4">Engage with your cohort and share insights</p>
                <button
                  onClick={() => router.push("/discussions")}
                  className="px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors"
                >
                  Go to Discussions
                </button>
              </div>
            )}

            {activeTab === "leaderboard" && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Rankings</h3>
                <p className="text-gray-600 mb-4">See how you rank against your peers</p>
                <button
                  onClick={() => router.push("/leaderboard")}
                  className="px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors"
                >
                  View Leaderboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
