"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Video, FileText, CheckCircle, Lock, Clock } from "lucide-react";

export default function ResourcesPage() {
  const router = useRouter();

  const sessions = [
    {
      id: 1,
      title: "Session 1: Ownership Mindset & Leadership at Work",
      date: "April 4, 2026",
      unlocked: true,
      resources: [
        { id: 1, type: "article", title: "360° Leadership: The Art of Influence Without Authority", duration: 10, completed: true, points: 100 },
        { id: 2, type: "article", title: "Developing an ownership mindset early in your career", duration: 8, completed: true, points: 100 },
        { id: 3, type: "article", title: "Ownership Mindset", duration: 12, completed: false, points: 100 },
        { id: 4, type: "video", title: "Leadership Vs. Authority - Simon Sinek", duration: 15, completed: false, points: 150 },
        { id: 5, type: "video", title: "Develop an Ownership Mindset at Work", duration: 20, completed: false, points: 150 },
      ],
    },
    {
      id: 2,
      title: "Session 2: Goal Setting & Time Management",
      date: "April 11, 2026",
      unlocked: true,
      resources: [
        { id: 6, type: "article", title: "SMART goal setting for professionals", duration: 12, completed: false, points: 100 },
        { id: 7, type: "article", title: "Time management strategies for high-performing employees", duration: 15, completed: false, points: 100 },
        { id: 8, type: "video", title: "SMART Goals Explained", duration: 10, completed: false, points: 150 },
        { id: 9, type: "video", title: "Brian Tracy on Time Management", duration: 18, completed: false, points: 150 },
      ],
    },
    {
      id: 3,
      title: "Session 3: Effective Communication Skills",
      date: "April 18, 2026",
      unlocked: false,
      resources: [],
    },
    {
      id: 4,
      title: "Session 4: Storytelling - Leading Early",
      date: "April 25, 2026",
      unlocked: false,
      resources: [],
    },
  ];

  const getResourceIcon = (type: string) => {
    if (type === "video") return <Video className="w-5 h-5 text-purple-600" />;
    if (type === "article") return <FileText className="w-5 h-5 text-blue-600" />;
    return null;
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
              <FileText className="w-6 h-6" />
              <span className="font-bold text-xl">Learning Resources</span>
            </div>
            <div className="text-white/80 text-sm">
              12/91 Completed
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Progress</h2>
            <span className="text-2xl font-bold text-[#0b0b45]">13%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div className="bg-gradient-to-r from-[#0b0b45] to-[#1a1a6e] h-4 rounded-full" style={{ width: "13%" }}></div>
          </div>
          <p className="text-sm text-gray-600">Keep going! Complete more resources to unlock achievements.</p>
        </div>

        {/* Sessions List */}
        <div className="space-y-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Session Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-[#0b0b45] to-[#1a1a6e] text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold mb-1">{session.title}</h3>
                    <p className="text-white/80 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {session.date}
                      {session.unlocked ? (
                        <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Unlocked</span>
                      ) : (
                        <span className="ml-2 px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full">Locked</span>
                      )}
                    </p>
                  </div>
                  {!session.unlocked && <Lock className="w-6 h-6 text-white/60" />}
                </div>
              </div>

              {/* Resources List */}
              {session.unlocked && session.resources.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {session.resources.map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => router.push(`/resources/${resource.id}`)}
                      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getResourceIcon(resource.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{resource.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {resource.duration} min • {resource.points} points
                        </p>
                      </div>
                      {resource.completed ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      ) : (
                        <div className="px-4 py-2 bg-[#0b0b45] text-white rounded-lg text-sm font-medium">
                          Start
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm">
                    {session.unlocked
                      ? "No resources available yet"
                      : "This session will unlock 8 days before the scheduled date"}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Resource Unlocking:</span> Resources unlock 8 days before each Saturday session. 
            Complete resources to earn points, achievements, and climb the leaderboard!
          </p>
        </div>
      </div>
    </div>
  );
}
