"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Video, FileText, CheckCircle, ThumbsUp, MessageSquare, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function ResourceViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [completed, setCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  // Mock resource data
  const resource = {
    id: 1,
    type: "article",
    title: "360° Leadership: The Art of Influence Without Authority",
    description: "Learn how to lead effectively without formal authority. This article explores practical strategies for building influence in any workplace.",
    url: "https://medium.com/@contact.jitendra07/360-leadership-the-art-of-influence-without-authority-3ace7b3e1a9b",
    duration: 10,
    points: 100,
    session: "Session 1: Ownership Mindset & Leadership at Work",
  };

  const handleComplete = () => {
    setCompleted(true);
    // In real implementation, this would call an API to mark as completed
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-[#0b0b45] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/resources")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {resource.type === "video" ? (
                <Video className="w-6 h-6" />
              ) : (
                <FileText className="w-6 h-6" />
              )}
              <span className="font-bold text-xl">Resource Viewer</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80 text-sm">{resource.points} points</span>
              {completed && (
                <div className="flex items-center gap-2 bg-green-500 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resource Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              {resource.type === "video" ? (
                <Video className="w-8 h-8 text-blue-600" />
              ) : (
                <FileText className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{resource.title}</h1>
              <p className="text-gray-600 mb-3">{resource.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{resource.session}</span>
                <span>•</span>
                <span>{resource.duration} min read</span>
                <span>•</span>
                <span>{resource.points} points</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Open Resource
            </a>
            {!completed && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                Mark as Complete
              </button>
            )}
          </div>
        </div>

        {/* Engagement Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Engage with this Resource</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/discussions")}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-6 h-6 text-purple-600" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Start Discussion</p>
                <p className="text-sm text-gray-600">Share your thoughts</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <ThumbsUp className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Rate Resource</p>
                <p className="text-sm text-gray-600">Help others learn</p>
              </div>
            </button>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Key Takeaways</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#0b0b45] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <p className="text-gray-700">Leadership is about influence, not authority - you can lead from any position</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#0b0b45] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <p className="text-gray-700">Build credibility through consistent delivery and integrity</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#0b0b45] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <p className="text-gray-700">Focus on adding value to others and building strong relationships</p>
            </li>
          </ul>
        </div>

        {/* Related Discussions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Related Discussions</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/discussions/1")}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">How do you demonstrate leadership without a title?</h3>
              <p className="text-sm text-gray-600">12 replies • Started by Sarah Johnson</p>
            </button>
            <button
              onClick={() => router.push("/discussions/2")}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Real examples of 360° leadership in action</h3>
              <p className="text-sm text-gray-600">8 replies • Started by Michael Chen</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
