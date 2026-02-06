'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { SessionAnalyticsDashboard } from '@/components/SessionAnalyticsDashboard';
import { SessionTranscriptUploader } from '@/components/SessionTranscriptUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Upload } from 'lucide-react';

export default function SessionAnalyticsPage() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohortId');
  const sessionId = searchParams.get('sessionId');
  const sessionTitle = searchParams.get('sessionTitle');

  // In a real app, you'd get this from auth context
  const [selectedCohortId, setSelectedCohortId] = React.useState(
    cohortId || 'default-cohort-id'
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Session Analytics</h1>
        <p className="text-muted-foreground">
          AI-powered insights from live session transcripts
        </p>
      </div>

      <Tabs defaultValue={sessionId ? 'upload' : 'dashboard'} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Transcript
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <SessionAnalyticsDashboard cohortId={selectedCohortId} />
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          {sessionId && sessionTitle ? (
            <SessionTranscriptUploader
              sessionId={sessionId}
              sessionTitle={sessionTitle}
              onSuccess={() => {
                // Switch to dashboard tab after successful upload
                const dashboardTab = document.querySelector('[value="dashboard"]') as HTMLElement;
                dashboardTab?.click();
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a Session</CardTitle>
                <CardDescription>
                  Choose a session from the sessions list to upload its transcript
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Navigate to a specific session page and use the "Upload Transcript" button to
                  get started with AI analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
