"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Target, Users, Calendar, Award, BookOpen, Zap } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-[#0b0b45] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#0b0b45] font-bold text-xl">A</span>
              </div>
              <span className="font-bold text-xl">ATLAS</span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            About ATLAS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Accelerating Talent for Leadership & Success - A gamified learning management system for the THRiVE Hub LaunchPad Fellowship
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-[#0b0b45] to-[#1a1a6e] rounded-xl p-8 text-white mb-12">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-white/90">
            ATLAS empowers African youth with the skills, knowledge, and connections needed to thrive in the global economy. Through gamified learning experiences, we make career development engaging, measurable, and impactful.
          </p>
        </div>

        {/* Program Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Program Timeline</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li>• 4-month intensive program</li>
              <li>• April - July 2026</li>
              <li>• 16 Saturday sessions</li>
              <li>• Weekly cohort meetings</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Curriculum</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li>• 91 curated resources</li>
              <li>• 4 monthly themes</li>
              <li>• Videos, articles, and exercises</li>
              <li>• Practical skill-building</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cohort Learning</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li>• Small cohort groups</li>
              <li>• Peer-to-peer learning</li>
              <li>• Facilitator guidance</li>
              <li>• Discussion forums</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Gamification</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li>• Earn points for learning</li>
              <li>• Unlock achievements</li>
              <li>• Monthly leaderboards</li>
              <li>• Track your progress</li>
            </ul>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Features</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Resource Locking</h4>
                <p className="text-gray-600 text-sm">
                  Resources unlock 8 days before each session, creating structured learning paths
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Anti-Skimming Validation</h4>
                <p className="text-gray-600 text-sm">
                  AI-powered checks ensure genuine engagement before awarding points
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-200">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Social Learning</h4>
                <p className="text-gray-600 text-sm">
                  Discussion forums and real-time chat foster collaborative learning
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-200">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Analytics & Insights</h4>
                <p className="text-gray-600 text-sm">
                  Track progress, identify learning patterns, and optimize your journey
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-gray-600 mb-6">
            Join the THRiVE Hub LaunchPad Fellowship and transform your career
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 bg-[#0b0b45] text-white rounded-lg font-semibold hover:bg-[#0b0b45]/90 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/dashboard/fellow")}
              className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            Built with care for the next generation of African talent.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            THRiVE Hub LaunchPad Fellowship 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
