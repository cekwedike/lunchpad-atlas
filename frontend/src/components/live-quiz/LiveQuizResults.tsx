'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Award, Flame, TrendingUp, Home } from 'lucide-react';
import { LiveQuiz, LiveQuizParticipant } from '@/types/live-quiz';
import { cn } from '@/lib/utils';

interface LiveQuizResultsProps {
  quiz: LiveQuiz;
  currentUserId: string;
  onGoHome?: () => void;
}

export function LiveQuizResults({ quiz, currentUserId, onGoHome }: LiveQuizResultsProps) {
  const sortedParticipants = [...(quiz.participants || [])].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });

  const currentUser = sortedParticipants.find(p => p.userId === currentUserId);
  const userPosition = currentUser ? sortedParticipants.indexOf(currentUser) + 1 : null;
  const topThree = sortedParticipants.slice(0, 3);

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 1: return 'h-48';
      case 2: return 'h-36';
      case 3: return 'h-28';
      default: return 'h-24';
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-amber-600 to-amber-800';
      default: return 'from-gray-200 to-gray-400';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-600 to-blue-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="w-20 h-20 text-yellow-300" />
          </div>
          <CardTitle className="text-4xl font-bold">Quiz Complete!</CardTitle>
          <p className="text-white/90 text-xl mt-2">{quiz.title}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-center gap-6 text-lg">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white text-base px-4 py-2">
              {quiz.totalQuestions} Questions
            </Badge>
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white text-base px-4 py-2">
              {sortedParticipants.length} Players
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* User's Performance */}
      {currentUser && userPosition && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              Your Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{userPosition}</p>
                <p className="text-sm text-muted-foreground">Position</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-3xl font-bold">{currentUser.totalScore.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Points</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <Award className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-3xl font-bold">{currentUser.correctCount}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <Flame className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <p className="text-3xl font-bold">{currentUser.streak}</p>
                <p className="text-sm text-muted-foreground">Best Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Podium for Top 3 */}
      {topThree.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-4 h-64">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-3xl font-bold">
                      {topThree[1].displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="font-bold text-sm truncate w-24">{topThree[1].displayName}</p>
                    <p className="text-xs text-muted-foreground">{topThree[1].totalScore.toLocaleString()}</p>
                  </div>
                  <div className={cn(
                    "w-32 rounded-t-lg bg-gradient-to-br flex items-center justify-center",
                    getPodiumHeight(2),
                    getPodiumColor(2)
                  )}>
                    <span className="text-white text-6xl font-bold">2</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center">
                  <Trophy className="w-12 h-12 text-yellow-500 mb-2 animate-bounce" />
                  <div className="mb-2 text-center">
                    <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-yellow-300">
                      {topThree[0].displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="font-bold truncate w-28">{topThree[0].displayName}</p>
                    <p className="text-sm text-muted-foreground">{topThree[0].totalScore.toLocaleString()}</p>
                  </div>
                  <div className={cn(
                    "w-36 rounded-t-lg bg-gradient-to-br flex items-center justify-center",
                    getPodiumHeight(1),
                    getPodiumColor(1)
                  )}>
                    <span className="text-white text-7xl font-bold">1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white text-2xl font-bold">
                      {topThree[2].displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="font-bold text-xs truncate w-20">{topThree[2].displayName}</p>
                    <p className="text-xs text-muted-foreground">{topThree[2].totalScore.toLocaleString()}</p>
                  </div>
                  <div className={cn(
                    "w-28 rounded-t-lg bg-gradient-to-br flex items-center justify-center",
                    getPodiumHeight(3),
                    getPodiumColor(3)
                  )}>
                    <span className="text-white text-5xl font-bold">3</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Final Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedParticipants.map((participant, index) => {
              const position = index + 1;
              const isCurrentUser = participant.userId === currentUserId;
              const isTop3 = position <= 3;

              return (
                <div
                  key={participant.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    isCurrentUser && "bg-primary/10 border-primary",
                    isTop3 && !isCurrentUser && "bg-yellow-50 border-yellow-200",
                    !isTop3 && !isCurrentUser && "bg-secondary/30"
                  )}
                >
                  <div className="w-8 text-center font-bold text-lg">
                    {position}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{participant.displayName}</p>
                      {isCurrentUser && <Badge variant="default" className="text-xs">You</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {participant.correctCount}/{quiz.totalQuestions} correct
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{participant.totalScore.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center">
        <Button onClick={onGoHome} size="lg" className="gap-2">
          <Home className="w-5 h-5" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
