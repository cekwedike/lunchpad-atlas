"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Pin, ThumbsUp, MessageCircle, MoreVertical } from "lucide-react";
import { useState } from "react";

export default function DiscussionThreadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [reply, setReply] = useState("");

  const discussion = {
    id: 1,
    title: "How do you demonstrate leadership without a title?",
    author: "Sarah Johnson",
    authorAvatar: "SJ",
    resource: "360° Leadership: The Art of Influence Without Authority",
    content: "I've been reading about 360° leadership and I'm curious how others apply this in their workplaces. Specifically, how do you demonstrate leadership qualities when you don't have a formal management position? What are some practical examples that have worked for you?",
    createdAt: "2 hours ago",
    likes: 8,
    isPinned: true,
  };

  const comments = [
    {
      id: 1,
      author: "Michael Chen",
      authorAvatar: "MC",
      content: "Great question! I've found that taking initiative on projects, even small ones, shows leadership. For example, I volunteered to organize our team's knowledge-sharing sessions. It wasn't part of my job description, but it helped everyone and positioned me as someone who takes ownership.",
      createdAt: "1 hour ago",
      likes: 5,
    },
    {
      id: 2,
      author: "Emily Rodriguez",
      authorAvatar: "ER",
      content: "I think being reliable and consistent is key. When people know they can count on you to deliver quality work on time, they naturally start to see you as a leader. Also, helping others without being asked builds credibility.",
      createdAt: "1 hour ago",
      likes: 4,
    },
    {
      id: 3,
      author: "David Kim",
      authorAvatar: "DK",
      content: "One thing that's worked for me is bringing solutions, not just problems. When I identify an issue, I also suggest potential fixes. This shows proactive thinking and leadership mindset. Also, I try to mentor newer team members informally.",
      createdAt: "45 minutes ago",
      likes: 6,
    },
    {
      id: 4,
      author: "Jessica Brown",
      authorAvatar: "JB",
      content: "Communication is huge! I make sure to keep everyone informed about project progress, ask good questions in meetings, and facilitate discussions when the team gets stuck. You don't need a title to help move things forward.",
      createdAt: "30 minutes ago",
      likes: 3,
    },
  ];

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    // In real implementation, this would call an API
    setReply("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-[#0b0b45] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/discussions")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <MessageCircle className="w-6 h-6" />
              <span className="font-bold text-xl">Discussion</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Original Post */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0b0b45] to-[#1a1a6e] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">{discussion.authorAvatar}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{discussion.author}</h3>
                  <p className="text-sm text-gray-600">{discussion.createdAt}</p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              {discussion.isPinned && (
                <div className="flex items-center gap-1 text-orange-600 text-sm mb-2">
                  <Pin className="w-4 h-4" />
                  <span className="font-medium">Pinned by facilitator</span>
                </div>
              )}
              <div className="text-sm text-blue-600 mb-3">
                Related to: {discussion.resource}
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{discussion.title}</h1>
          <p className="text-gray-700 mb-4 leading-relaxed">{discussion.content}</p>

          <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
            <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ThumbsUp className="w-5 h-5" />
              <span className="text-sm font-medium">{discussion.likes} likes</span>
            </button>
            <div className="flex items-center gap-2 text-gray-600">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{comments.length} replies</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">{comments.length} Replies</h2>
          
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0b0b45] to-[#1a1a6e] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{comment.authorAvatar}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{comment.author}</h3>
                      <p className="text-sm text-gray-600">{comment.createdAt}</p>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-700 mb-3 leading-relaxed">{comment.content}</p>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{comment.likes} likes</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add Your Reply</h3>
          <form onSubmit={handleSubmitReply}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Share your thoughts and experiences..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b0b45] min-h-[120px] resize-y"
              required
            />
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">
                Earn 10 points for helpful replies!
              </p>
              <button
                type="submit"
                className="px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors"
              >
                Post Reply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
