"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Plus, Pin, ThumbsUp, MessageCircle } from "lucide-react";

export default function DiscussionsPage() {
  const router = useRouter();

  const discussions = [
    {
      id: 1,
      title: "How do you demonstrate leadership without a title?",
      author: "Sarah Johnson",
      authorAvatar: "SJ",
      resource: "360° Leadership",
      replies: 12,
      likes: 8,
      lastActivity: "2 hours ago",
      isPinned: true,
    },
    {
      id: 2,
      title: "Real examples of 360° leadership in action",
      author: "Michael Chen",
      authorAvatar: "MC",
      resource: "360° Leadership",
      replies: 8,
      likes: 5,
      lastActivity: "5 hours ago",
      isPinned: false,
    },
    {
      id: 3,
      title: "Struggling with ownership mindset - any tips?",
      author: "Emily Rodriguez",
      authorAvatar: "ER",
      resource: "Ownership Mindset",
      replies: 15,
      likes: 12,
      lastActivity: "1 day ago",
      isPinned: false,
    },
    {
      id: 4,
      title: "How to influence colleagues who resist change?",
      author: "David Kim",
      authorAvatar: "DK",
      resource: "Influence Without Authority",
      replies: 10,
      likes: 7,
      lastActivity: "1 day ago",
      isPinned: false,
    },
    {
      id: 5,
      title: "Best practices for taking ownership in remote work",
      author: "Jessica Brown",
      authorAvatar: "JB",
      resource: "Ownership Mindset",
      replies: 6,
      likes: 4,
      lastActivity: "2 days ago",
      isPinned: false,
    },
  ];

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
              <MessageSquare className="w-6 h-6" />
              <span className="font-bold text-xl">Discussions</span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-[#0b0b45] rounded-lg font-semibold hover:bg-white/90 transition-colors">
              <Plus className="w-5 h-5" />
              New Discussion
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button className="px-6 py-4 font-medium text-[#0b0b45] border-b-2 border-[#0b0b45]">
              All Discussions
            </button>
            <button className="px-6 py-4 font-medium text-gray-500 hover:text-gray-700 transition-colors">
              My Posts
            </button>
            <button className="px-6 py-4 font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Pinned
            </button>
            <button className="px-6 py-4 font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Unanswered
            </button>
          </div>
        </div>

        {/* Discussions List */}
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <button
              key={discussion.id}
              onClick={() => router.push(`/discussions/${discussion.id}`)}
              className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-[#0b0b45] to-[#1a1a6e] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{discussion.authorAvatar}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    {discussion.isPinned && (
                      <Pin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-1" />
                    )}
                    <h3 className="text-lg font-bold text-gray-900 flex-1">{discussion.title}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="font-medium">{discussion.author}</span>
                    <span>•</span>
                    <span className="text-blue-600">{discussion.resource}</span>
                    <span>•</span>
                    <span>{discussion.lastActivity}</span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{discussion.replies} replies</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{discussion.likes} likes</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Discussion Guidelines:</span> Be respectful, stay on topic, and help your fellow learners. 
            Quality contributions earn you points and social learning achievements!
          </p>
        </div>
      </div>
    </div>
  );
}
