'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import { useLiveQuiz } from '@/hooks/api/useLiveQuiz';
import { useLiveQuizSocket } from '@/hooks/useLiveQuizSocket';
import { LiveQuizParticipant, ParticipantJoinedEvent, QuizStartedEvent } from '@/types/live-quiz';

interface LiveQuizLobbyProps {
  quizId: string;
  userId: string;
  onQuizStarted: (event: QuizStartedEvent) => void;
}

export function LiveQuizLobby({ quizId, userId, onQuizStarted }: LiveQuizLobbyProps) {
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [participants, setParticipants] = useState<LiveQuizParticipant[]>([]);

  const { data: quiz, isLoading } = useLiveQuiz(quizId);

  const { joinQuiz } = useLiveQuizSocket({
    quizId,
    userId,
    onParticipantJoined: (event: ParticipantJoinedEvent) => {
      // Add participant to list
      setParticipants(prev => {
        const exists = prev.some(p => p.userId === event.participant.userId);
        if (exists) return prev;
        return [...prev, event.participant];
      });
    },
    onQuizStarted,
  });

  useEffect(() => {
    if (quiz?.participants) {
      setParticipants(quiz.participants);
    }
  }, [quiz?.participants]);

  const handleJoin = () => {
    if (!displayName.trim()) return;
    setIsJoining(true);
    joinQuiz(displayName.trim());
    setHasJoined(true);
    setIsJoining(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Quiz not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Quiz Info */}
      <Card className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{quiz.title}</CardTitle>
          {quiz.description && (
            <CardDescription className="text-white/90 text-lg">
              {quiz.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30">
              {quiz.totalQuestions} Questions
            </Badge>
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30">
              {quiz.timePerQuestion}s per question
            </Badge>
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30">
              <Users className="w-3 h-3 mr-1" />
              {participants.length} Players
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Join Form or Waiting Screen */}
      {!hasJoined ? (
        <Card>
          <CardHeader>
            <CardTitle>Join the Quiz</CardTitle>
            <CardDescription>Enter your display name to participate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Enter your name..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  maxLength={30}
                  disabled={isJoining}
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={!displayName.trim() || isJoining}
                className="w-full"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Quiz'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Waiting for host to start...
            </CardTitle>
            <CardDescription>
              Get ready! The quiz will begin shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No participants yet. Be the first to join!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {participant.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium text-center truncate w-full">
                    {participant.displayName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
