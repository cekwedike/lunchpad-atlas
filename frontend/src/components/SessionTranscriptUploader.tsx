'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { useProcessSessionTranscript } from '@/hooks/api/useSessionAnalytics';

interface SessionTranscriptUploaderProps {
  sessionId: string;
  sessionTitle: string;
  onSuccess?: () => void;
}

export function SessionTranscriptUploader({
  sessionId,
  sessionTitle,
  onSuccess,
}: SessionTranscriptUploaderProps) {
  const [transcript, setTranscript] = useState('');
  const { mutate: processTranscript, isPending, isSuccess, isError, error } = useProcessSessionTranscript();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    processTranscript(
      { sessionId, transcript },
      {
        onSuccess: () => {
          setTranscript('');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Session Transcript</CardTitle>
        <CardDescription>
          Process transcript for {sessionTitle} with AI analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              placeholder="Paste the session transcript here...&#10;&#10;Example:&#10;Facilitator: Welcome everyone to today's session on Career Foundations...&#10;Fellow 1: Thank you! I have a question about networking...&#10;Facilitator: Great question! Let's dive into that..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              disabled={isPending}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Include speaker names and dialogue. The AI will analyze engagement, participation, topics, and insights.
            </p>
          </div>

          {isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to process transcript: {error?.message || 'Unknown error'}
              </AlertDescription>
            </Alert>
          )}

          {isSuccess && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Transcript processed successfully! Analytics are now available.
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isPending || !transcript.trim()} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing with AI...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Process Transcript
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
