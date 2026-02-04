"use client";

import { useState } from "react";
import { 
  Home, 
  Users, 
  Calendar, 
  BookOpen, 
  Shield, 
  Settings,
  LogOut,
  Plus,
  Database,
  Activity
} from "lucide-react";

export default function AdminDashboard() {
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
                <span className="text-white/60 text-sm ml-3">Admin Portal</span>
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
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#0b0b45] to-[#1a1a6e] rounded-xl p-6 text-white mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">Platform Administration</h1>
            <p className="text-white/80">Manage users, cohorts, and platform configuration</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-[#0b0b45] rounded-lg font-semibold hover:bg-white/90 transition-colors">
            <Plus className="w-5 h-5" />
            Create User
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">156</p>
            <p className="text-sm text-gray-500 mt-1">125 Fellows, 28 Facilitators, 3 Admins</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Cohorts</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">5</p>
            <p className="text-sm text-gray-500 mt-1">3 Active, 2 Completed</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Resources</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">91</p>
            <p className="text-sm text-gray-500 mt-1">Across 16 sessions</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Active Now</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">34</p>
            <p className="text-sm text-gray-500 mt-1">Users online</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Database className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Storage</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">2.4GB</p>
            <p className="text-sm text-gray-500 mt-1">Database size</p>
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
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "users"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-5 h-5" />
              Users
            </button>
            <button
              onClick={() => setActiveTab("cohorts")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "cohorts"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-5 h-5" />
              Cohorts
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
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "audit"
                  ? "text-[#0b0b45] border-b-2 border-[#0b0b45]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Shield className="w-5 h-5" />
              Audit Log
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Admin Actions</h2>
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Created new user: john.doe@example.com</p>
                        <p className="text-sm text-gray-500">By Admin User - 1 hour ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Updated April 2026 Cohort A settings</p>
                        <p className="text-sm text-gray-500">By Admin User - 3 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Added new resource to Session 5</p>
                        <p className="text-sm text-gray-500">By Admin User - Yesterday</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">System Health</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">API Status</p>
                      <p className="text-sm text-green-600">Operational</p>
                    </div>
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">Database</p>
                      <p className="text-sm text-green-600">Connected</p>
                    </div>
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">Redis Cache</p>
                      <p className="text-sm text-green-600">Online</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600">Create, edit, and manage all platform users</p>
              </div>
            )}

            {activeTab === "cohorts" && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Cohort Management</h3>
                <p className="text-gray-600">Create and manage fellowship cohorts</p>
              </div>
            )}

            {activeTab === "resources" && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Resource Management</h3>
                <p className="text-gray-600">Add, edit, and organize learning resources</p>
              </div>
            )}

            {activeTab === "audit" && (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Log</h3>
                <p className="text-gray-600">Track all administrative actions and changes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
