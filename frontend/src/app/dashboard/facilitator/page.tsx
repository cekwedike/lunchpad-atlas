"use client";

import { useState } from "react";
import { 
  Home, 
  Users, 
  BookOpen, 
  MessageSquare, 
  BarChart3, 
  Settings,
  LogOut,
  TrendingUp,
  Clock
} from "lucide-react";

export default function FacilitatorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

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
              <div>
                <span className="font-bold text-xl">ATLAS</span>
                <span className="text-white/60 text-sm ml-3">Facilitator Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
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
        {/* Cohort Info Banner */}
        <div className="bg-gradient-to-r from-[#0b0b45] to-[#1a1a6e] rounded-xl p-6 text-white mb-8">
          <h1 className="text-2xl font-bold mb-1">April 2026 Cohort A</h1>
          <p className="text-white/80">Next session: Week 4 - Leading Early (April 25, 2026)</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Fellows</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">28</p>
            <p className="text-sm text-green-600 mt-1">↑ 96% active</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Avg Progress</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">67%</p>
            <p className="text-sm text-gray-500 mt-1">Resources completed</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Discussions</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">142</p>
            <p className="text-sm text-gray-500 mt-1">Total posts</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Attendance</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">89%</p>
            <p className="text-sm text-gray-500 mt-1">Avg session rate</p>
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
              onClick={() => setActiveTab("fellows")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "fellows"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-5 h-5" />
              Fellows
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "sessions"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Sessions
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "analytics"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">John Doe completed "Setting SMART Goals"</p>
                        <p className="text-sm text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Sarah posted in "Ownership Mindset" discussion</p>
                        <p className="text-sm text-gray-500">4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">5 fellows attended live session</p>
                        <p className="text-sm text-gray-500">Yesterday</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Fellows Needing Attention</h3>
                  <div className="space-y-2">
                    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">Jane Smith</p>
                      <p className="text-sm text-gray-600">No activity in 5 days</p>
                    </div>
                    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">Mike Johnson</p>
                      <p className="text-sm text-gray-600">Only 23% resources completed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "fellows" && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Fellow Management</h3>
                <p className="text-gray-600">View individual progress, send messages, and track engagement</p>
              </div>
            )}

            {activeTab === "sessions" && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Management</h3>
                <p className="text-gray-600">Plan sessions, review materials, and track attendance</p>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Cohort Analytics</h3>
                <p className="text-gray-600">Deep insights into cohort performance and engagement</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
