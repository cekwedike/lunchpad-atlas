"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings, Shield, Globe, Users, Calendar, BarChart3, BookOpen,
} from "lucide-react";
import Link from "next/link";

const quickLinks = [
  { title: "User Management", description: "Manage fellows, facilitators and admins", href: "/dashboard/admin/users", icon: Users, color: "bg-blue-50 text-blue-600 border-blue-100" },
  { title: "Cohort Management", description: "Create and configure cohorts", href: "/dashboard/admin/cohorts", icon: Shield, color: "bg-violet-50 text-violet-600 border-violet-100" },
  { title: "Sessions Management", description: "Schedule and manage sessions", href: "/dashboard/admin/sessions", icon: Calendar, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { title: "Resource Management", description: "Upload and organise resources", href: "/dashboard/admin/resources", icon: BookOpen, color: "bg-amber-50 text-amber-600 border-amber-100" },
  { title: "Analytics", description: "View platform and cohort analytics", href: "/dashboard/admin/analytics", icon: BarChart3, color: "bg-pink-50 text-pink-600 border-pink-100" },
];

export default function AdminSettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1 text-sm">Platform configuration and quick access</p>
        </div>

        {/* Platform Info */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Platform Info</CardTitle>
            </div>
            <CardDescription className="text-gray-500 text-sm">Current platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Platform Name", value: "LaunchPad ATLAS" },
                { label: "Version", value: "1.0.0" },
                { label: "Environment", value: process.env.NODE_ENV ?? "production" },
                { label: "AI Model", value: "Gemini 1.5 Flash (ATLAS)" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <dt className="text-xs font-medium text-gray-500 mb-1">{label}</dt>
                  <dd className="text-sm font-semibold text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Admin Areas</CardTitle>
            </div>
            <CardDescription className="text-gray-500 text-sm">Quick access to management sections</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map(({ title, description, href, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors group"
                >
                  <div className={`p-2 rounded-lg border ${color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
