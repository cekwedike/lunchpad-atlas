"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Medal, Award, Crown } from "lucide-react";

export default function LeaderboardPage() {
  const router = useRouter();

  const leaderboardData = [
    { rank: 1, name: "Sarah Johnson", points: 4250, avatar: "SJ", streak: 12, achievements: 8 },
    { rank: 2, name: "Michael Chen", points: 3890, avatar: "MC", streak: 10, achievements: 7 },
    { rank: 3, name: "Emily Rodriguez", points: 3675, avatar: "ER", streak: 8, achievements: 6 },
    { rank: 4, name: "David Kim", points: 3420, avatar: "DK", streak: 7, achievements: 6 },
    { rank: 5, name: "Jessica Brown", points: 3180, avatar: "JB", streak: 9, achievements: 5 },
    { rank: 6, name: "James Wilson", points: 2950, avatar: "JW", streak: 6, achievements: 5 },
    { rank: 7, name: "Lisa Anderson", points: 2780, avatar: "LA", streak: 5, achievements: 4 },
    { rank: 8, name: "Robert Taylor", points: 2650, avatar: "RT", streak: 4, achievements: 4 },
    { rank: 9, name: "Maria Garcia", points: 2420, avatar: "MG", streak: 7, achievements: 3 },
    { rank: 10, name: "Guest User", points: 2450, avatar: "GU", streak: 3, achievements: 3, highlight: true },
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-[#0b0b45] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/fellow")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Trophy className="w-6 h-6" />
              <span className="font-bold text-xl">Leaderboard</span>
            </div>
            <div className="text-white/80 text-sm">
              April 2026 Cohort A
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Selector */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Select Month</h2>
          <div className="flex gap-3 overflow-x-auto">
            <button className="px-4 py-2 bg-[#0b0b45] text-white rounded-lg font-medium whitespace-nowrap">
              April 2026
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors whitespace-nowrap">
              May 2026
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors whitespace-nowrap">
              June 2026
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors whitespace-nowrap">
              July 2026
            </button>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="order-1 pt-12">
            <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl p-6 text-center shadow-lg">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-700">{leaderboardData[1].avatar}</span>
              </div>
              <Medal className="w-8 h-8 text-white mx-auto mb-2" />
              <h3 className="font-bold text-white text-lg mb-1">{leaderboardData[1].name}</h3>
              <p className="text-2xl font-bold text-white">{leaderboardData[1].points}</p>
              <p className="text-sm text-white/80">points</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="order-2">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-6 text-center shadow-xl transform scale-105">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-yellow-600">{leaderboardData[0].avatar}</span>
              </div>
              <Crown className="w-10 h-10 text-white mx-auto mb-2" />
              <h3 className="font-bold text-white text-xl mb-1">{leaderboardData[0].name}</h3>
              <p className="text-3xl font-bold text-white">{leaderboardData[0].points}</p>
              <p className="text-sm text-white/90">points</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="order-3 pt-12">
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl p-6 text-center shadow-lg">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-orange-700">{leaderboardData[2].avatar}</span>
              </div>
              <Award className="w-8 h-8 text-white mx-auto mb-2" />
              <h3 className="font-bold text-white text-lg mb-1">{leaderboardData[2].name}</h3>
              <p className="text-2xl font-bold text-white">{leaderboardData[2].points}</p>
              <p className="text-sm text-white/80">points</p>
            </div>
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Full Rankings</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {leaderboardData.map((user) => (
              <div
                key={user.rank}
                className={`px-6 py-4 flex items-center gap-4 ${
                  user.highlight ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"
                } transition-colors`}
              >
                <div className="w-12 flex justify-center">
                  {getRankIcon(user.rank)}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#0b0b45] to-[#1a1a6e] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{user.avatar}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{user.streak} day streak</span>
                    <span>•</span>
                    <span>{user.achievements} achievements</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#0b0b45]">{user.points}</p>
                  <p className="text-sm text-gray-500">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Monthly Leaderboard:</span> Rankings reset at the start of each month. 
            Top 3 finishers earn special achievement badges and bonus points!
          </p>
        </div>
      </div>
    </div>
  );
}
