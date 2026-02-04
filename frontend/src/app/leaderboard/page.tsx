"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy, Medal, Award, Crown, Search, TrendingUp, TrendingDown } from "lucide-react";
import { useLeaderboard, useLeaderboardRank } from "@/hooks/api/useLeaderboard";
import { useProfile } from "@/hooks/api/useProfile";
import { useState } from "react";

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const { data: profile } = useProfile();
  const { data: leaderboard, isLoading, error, refetch } = useLeaderboard(undefined, selectedMonth);
  const { data: userRank } = useLeaderboardRank(profile?.id || "");

  if (error) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load leaderboard" onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  const filteredEntries = leaderboard?.entries?.filter((entry) =>
    entry.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = filteredEntries?.slice(0, 3) || [];
  const remaining = filteredEntries?.slice(3) || [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date);
    }
    return months;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground mt-1">See how you rank among your cohort</p>
          </div>
        </div>

        {/* User's Current Rank */}
        {userRank && (
          <Card>
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-lg font-bold mb-3">Your Rank</h2>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-atlas-navy">#{userRank.rank}</div>
                <div className="flex-1">
                  <p className="font-semibold">{userRank.user?.name || "You"}</p>
                  <p className="text-sm text-muted-foreground">{userRank.points} points • {userRank.streak} day streak</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Month Selector */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Select Month</h2>
            <div className="flex gap-3 overflow-x-auto">
              {getMonthOptions().map((month) => (
                <Button
                  key={month.toISOString()}
                  variant={month.getMonth() === selectedMonth.getMonth() ? "default" : "outline"}
                  onClick={() => setSelectedMonth(month)}
                >
                  {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredEntries && filteredEntries.length > 0 ? (
          <>
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 2nd Place */}
                <div className="order-1 pt-12">
                  <Card className="bg-gradient-to-br from-gray-300 to-gray-400">
                    <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl font-bold text-gray-700">{topThree[1]?.user?.name?.slice(0, 2).toUpperCase() || "?"}</span>
                      </div>
                      <Medal className="w-8 h-8 mx-auto mb-2 text-white" />
                      <p className="font-bold text-white">{topThree[1]?.user?.name || "Unknown"}</p>
                      <p className="text-sm text-white/90">{topThree[1]?.points} points</p>
                    </div>
                  </Card>
                </div>

                {/* 1st Place */}
                <div className="order-2">
                  <Card className="bg-gradient-to-br from-yellow-400 to-yellow-600">
                    <div className="p-6 text-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl font-bold text-yellow-600">{topThree[0]?.user?.name?.slice(0, 2).toUpperCase() || "?"}</span>
                      </div>
                      <Crown className="w-10 h-10 mx-auto mb-2 text-white" />
                      <p className="font-bold text-white text-lg">{topThree[0]?.user?.name || "Unknown"}</p>
                      <p className="text-white/90">{topThree[0]?.points} points</p>
                    </div>
                  </Card>
                </div>

                {/* 3rd Place */}
                <div className="order-3 pt-20">
                  <Card className="bg-gradient-to-br from-orange-400 to-orange-600">
                    <div className="p-6 text-center">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-orange-600">{topThree[2]?.user?.name?.slice(0, 2).toUpperCase() || "?"}</span>
                      </div>
                      <Award className="w-7 h-7 mx-auto mb-2 text-white" />
                      <p className="font-bold text-white">{topThree[2]?.user?.name || "Unknown"}</p>
                      <p className="text-sm text-white/90">{topThree[2]?.points} points</p>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Remaining Rankings */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fellow</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Streak</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {remaining.map((entry) => {
                      const isCurrentUser = entry.userId === profile?.id;
                      return (
                        <tr key={entry.userId} className={isCurrentUser ? "bg-blue-50" : "hover:bg-gray-50"}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getRankIcon(entry.rank)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-atlas-navy text-white rounded-full flex items-center justify-center font-semibold">
                                {entry.user?.name?.slice(0, 2).toUpperCase() || "?"}
                              </div>
                              <span className="font-medium">{entry.user?.name || "Unknown"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold">{entry.points}</td>
                          <td className="px-6 py-4">{entry.streak} days</td>
                          <td className="px-6 py-4">
                            {/* Rank change tracking not yet implemented */}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No leaderboard data"
            description="Check back later to see rankings"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
