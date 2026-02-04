export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b45] via-[#1a1a6e] to-[#0b0b45] flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#0b0b45] font-bold text-xl">A</span>
          </div>
          <span className="text-white font-bold text-xl">ATLAS</span>
        </div>
        <div className="text-white/80 text-sm">
          THRiVE Hub LaunchPad Fellowship
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl w-full text-center space-y-8 mt-12">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            ATLAS
          </h1>
          <p className="text-2xl md:text-3xl text-white/90 font-semibold">
            Accelerating Talent for Leadership & Success
          </p>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mt-6">
            Empowering African Youth For Global Opportunities
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-white font-semibold mb-2">Gamified Learning</h3>
            <p className="text-white/70 text-sm">
              Earn points, unlock achievements, and compete on leaderboards
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="text-white font-semibold mb-2">Social Learning</h3>
            <p className="text-white/70 text-sm">
              Engage in discussions, chat with peers, and learn together
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-white font-semibold mb-2">Track Progress</h3>
            <p className="text-white/70 text-sm">
              Monitor your learning journey with detailed analytics
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
          <a
            href="/login"
            className="px-8 py-4 bg-white text-[#0b0b45] rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-lg"
          >
            Sign In
          </a>
          <a
            href="/about"
            className="px-8 py-4 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/30"
          >
            Learn More
          </a>
        </div>

        {/* Status Badge */}
        <div className="mt-12 inline-flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-full border border-green-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Platform Development - Coming April 2026</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center text-white/60 text-sm">
        <p>© 2026 THRiVE Hub. Built with ❤️ for the next generation of African talent.</p>
      </div>
    </div>
  );
}
