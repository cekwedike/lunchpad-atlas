"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {  MessageSquare,
  Plus,
  Search,
  Send,
  Pin,
  Lock,
  Heart,
  MessageCircle,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/api/useProfile";

export default function DiscussionsAndChatPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-5 h-full gap-4 p-6">
          {/* LEFT: Discussions Panel (60%) */}
          <div className="lg:col-span-3 flex flex-col space-y-4">
            <Card className="bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    Discussions
                  </CardTitle>
                  <Button
                    onClick={() => router.push('/dashboard/discussions/new')}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Discussion
                  </Button>
                </div>
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Discussions will load here</p>
                  <p className="text-sm mt-2">Click "New Discussion" to get started</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Chat Panel (40%) */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <Card className="bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b bg-blue-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-6 w-6 text-blue-600" />
                    <span>Cohort Chat</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{profile?.cohort?.name || "No cohort"}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Chat will load here</p>
                  <p className="text-sm mt-2">Real-time messaging with your cohort</p>
                </div>
              </CardContent>

              <div className="border-t p-4 bg-white">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button size="icon" className="bg-blue-600 hover:bg-blue-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
