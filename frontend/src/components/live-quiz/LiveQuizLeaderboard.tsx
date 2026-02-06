'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Flame } from 'lucide-react';
import { LiveQuizParticipant } from '@/types/live-quiz';
import { cn } from '@/lib/utils';

interface LiveQuizLeaderboardProps {
  participants: LiveQuizParticipant[];
  currentUserId?: string;
  showTopOnly?: number;
}

const MEDAL_ICONS: Record<number, React.ReactElement> = {
  1: <Trophy className="w-8 h-8 text-yellow-500" />,
  2: <Medal className="w-7 h-7 text-gray-400" />,
  3: <Award className="w-6 h-6 text-amber-700" />,
};

export function LiveQuizLeaderboard({
  participants,
  currentUserId,
  showTopOnly = 10,
}: LiveQuizLeaderboardProps) {
  const [sortedParticipants, setSortedParticipants] = useState<LiveQuizParticipant[]>([]);
  const [prevPositions, setPrevPositions] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    // Sort by score, then by joinedAt for tiebreaker
    const sorted = [...participants].sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    // Update previous positions
    const newPositions = new Map<string, number>();
    sortedParticipants.forEach((p, index) => {
      newPositions.set(p.id, index);
    });
    setPrevPositions(newPositions);

    setSortedParticipants(sorted.slice(0, showTopOnly));
  }, [participants, showTopOnly]);

  const getPositionChange = (participantId: string, currentIndex: number) => {
    const prevPosition = prevPositions.get(participantId);
    if (prevPosition === undefined) return 0;
    return prevPosition - currentIndex;
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="w-6 h-6" />
          Live Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {sortedParticipants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No participants yet
          </p>
        ) : (
          <div className="space-y-3">
            {sortedParticipants.map((participant, index) => {
              const position = index + 1;
              const isCurrentUser = participant.userId === currentUserId;
              const positionChange = getPositionChange(participant.id, index);
              const isTop3 = position <= 3;

              return (
                <div
                  key={participant.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-all animate-in slide-in-from-right",
                    isCurrentUser && "bg-primary/10 border-primary",
                    isTop3 && !isCurrentUser && "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200",
                    !isTop3 && !isCurrentUser && "bg-secondary/30 border-transparent"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12 h-12 shrink-0">
                    {MEDAL_ICONS[position] || (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-lg font-bold">
                        {position}
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className={cn(
                      "text-lg font-bold",
                      isTop3 ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white" : "bg-primary text-primary-foreground"
                    )}>
                      {participant.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name and Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg truncate">
                        {participant.displayName}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="default" className="text-xs">You</Badge>
                      )}
                      {participant.streak >= 3 && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                          <Flame className="w-3 h-3 mr-1" />
                          {participant.streak}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {participant.correctCount} correct
                    </p>
                  </div>

                  {/* Score and Position Change */}
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <p className="text-2xl font-bold text-primary">
                        {participant.totalScore.toLocaleString()}
                      </p>
                      {positionChange > 0 && (
                        <div className="flex items-center text-green-600 animate-in slide-in-from-bottom">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs font-bold">+{positionChange}</span>
                        </div>
                      )}
                      {positionChange < 0 && (
                        <div className="flex items-center text-red-600 animate-in slide-in-from-top">
                          <TrendingUp className="w-4 h-4 rotate-180" />
                          <span className="text-xs font-bold">{positionChange}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {participants.length > showTopOnly && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Showing top {showTopOnly} of {participants.length} participants
          </p>
        )}
      </CardContent>
    </Card>
  );
}
