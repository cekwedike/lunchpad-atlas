"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "@/hooks/api/useProfile";
import { LiveQuizContainer } from "@/components/live-quiz";

export default function LiveQuizPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const quizId = params.id;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-700">You must be signed in to join a live quiz.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <LiveQuizContainer
          quizId={quizId}
          userId={profile.id}
          userRole={profile.role}
          onExit={() => router.push("/dashboard")}
        />
      </div>
    </DashboardLayout>
  );
}
