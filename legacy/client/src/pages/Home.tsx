import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Play,
  Search,
  ChevronRight,
  Zap,
  Target,
  Brain,
  Globe,
  ArrowRight,
  Menu,
  X,
  TrendingUp,
  Award,
  Filter,
  Sparkles,
  FileText,
} from 'lucide-react';
import resourcesData from '@/data/resources.json';
import VideoPlayer from '@/components/VideoPlayer';
import ArticleViewer from '@/components/ArticleViewer';
import { getVideoInfo, getYouTubeSearchUrl, getTEDTalkUrl } from '@/lib/mediaUtils';

interface Resource {
  type: string;
  title: string;
  url: string;
}

interface Session {
  id: number;
  title: string;
  resources: Resource[];
}

interface Month {
  month: number;
  theme: string;
  sessions: Session[];
}

type MediaType = 'video' | 'article' | null;

interface OpenMedia {
  type: MediaType;
  url: string;
  title: string;
}

export default function Home() {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMedia, setOpenMedia] = useState<OpenMedia | null>(null);
  const [resourceFilter, setResourceFilter] = useState<'all' | 'articles' | 'videos'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const data: Month[] = resourcesData;

  const currentMonth = useMemo(
    () => data.find((m) => m.month === selectedMonth),
    [selectedMonth, data]
  );

  const currentSession = useMemo(
    () => currentMonth?.sessions.find((s) => s.id === selectedSession),
    [selectedSession, currentMonth]
  );

  const stats = useMemo(() => {
    const totalSessions = data.reduce((acc, m) => acc + m.sessions.length, 0);
    const totalResources = data.reduce(
      (acc, m) =>
        acc +
        m.sessions.reduce((sessionAcc, s) => sessionAcc + s.resources.length, 0),
      0
    );
    const totalArticles = data.reduce(
      (acc, m) =>
        acc +
        m.sessions.reduce(
          (sessionAcc, s) =>
            sessionAcc +
            s.resources.filter((r) => r.type.includes('Article')).length,
          0
        ),
      0
    );
    const totalVideos = data.reduce(
      (acc, m) =>
        acc +
        m.sessions.reduce(
          (sessionAcc, s) =>
            sessionAcc +
            s.resources.filter((r) => r.type.includes('Video')).length,
          0
        ),
      0
    );

    return { totalSessions, totalResources, totalArticles, totalVideos };
  }, [data]);

  const filteredResources = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.resources.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase());

      if (resourceFilter === 'articles') {
        return matchesSearch && r.type.includes('Article');
      }
      if (resourceFilter === 'videos') {
        return matchesSearch && r.type.includes('Video');
      }
      return matchesSearch;
    });
  }, [currentSession, searchQuery, resourceFilter]);

  const handleResourceClick = (resource: Resource) => {
    if (resource.type.includes('Video')) {
      // Try to extract video ID
      const videoInfo = getVideoInfo(resource.url);
      if (videoInfo) {
        setOpenMedia({
          type: 'video',
          url: videoInfo.url,
          title: resource.title,
        });
      } else {
        // Fallback: search for the video
        const searchUrl = resource.title.includes('TED')
          ? getTEDTalkUrl(resource.title)
          : getYouTubeSearchUrl(resource.title);
        window.open(searchUrl, '_blank');
      }
    } else {
      // Articles: open directly in new tab since most sites block iframes
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const monthIcons = [
    <Zap key="1" className="w-5 h-5" />,
    <Target key="2" className="w-5 h-5" />,
    <Brain key="3" className="w-5 h-5" />,
    <Globe key="4" className="w-5 h-5" />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0b0b45]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0f0f5a]/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl shadow-lg shadow-black/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 animate-in slide-in-from-left duration-500">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b45] to-[#0f0f5a] rounded-xl blur-md group-hover:blur-lg transition-all opacity-75"></div>
                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#0b0b45] to-[#0f0f5a] flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Career Hub
                </h1>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium">
                  Professional Development
                </p>
              </div>
            </div>

            {/* Desktop Stats */}
            <div className="hidden lg:flex items-center gap-6 animate-in slide-in-from-right duration-500">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-slate-400">{stats.totalSessions} Sessions</span>
              </div>
              <div className="w-px h-4 bg-slate-700"></div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-[#8b8bf5]" />
                <span className="text-slate-400">{stats.totalResources} Resources</span>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800/50 bg-slate-950/95 backdrop-blur-xl animate-in slide-in-from-top duration-300">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <Target className="w-4 h-4 text-[#8b8bf5]" />
                  <div>
                    <p className="text-xs text-slate-500">Sessions</p>
                    <p className="text-sm font-bold text-white">{stats.totalSessions}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-slate-500">Resources</p>
                    <p className="text-sm font-bold text-white">{stats.totalResources}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-8 md:py-16 lg:py-20">
        <div className="max-w-5xl mx-auto text-center animate-in fade-in zoom-in-95 duration-700">
          <Badge className="mb-4 md:mb-6 bg-gradient-to-r from-[#0b0b45]/40 to-[#0f0f5a]/40 text-[#b5b5ff] border-[#0b0b45]/50 shadow-lg shadow-[#0b0b45]/30 text-xs md:text-sm px-4 md:px-5 py-1.5">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
            THRiVE Hub LaunchPad Fellowship
          </Badge>
          
          <div className="mb-4 md:mb-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8b8bf5] via-[#b5b5ff] to-white mb-3 tracking-tight">
              ATLAS
            </h1>
            <p className="text-sm md:text-base text-[#8b8bf5] font-semibold tracking-wider uppercase">
              Accelerating Talent for Leadership & Success
            </p>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 mb-4 md:mb-6 leading-tight">
            Empowering African Youth<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b8bf5] to-[#b5b5ff]">For Global Opportunities</span>
          </h2>
          
          <p className="text-base md:text-lg lg:text-xl text-slate-300 mb-3 md:mb-4 max-w-3xl mx-auto leading-relaxed font-medium">
            Breaking barriers to upward economic mobility through structured career development
          </p>
          
          <p className="text-sm md:text-base text-slate-400 mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
            A 4-month intensive fellowship designed to equip young African professionals with the skills, mindset, 
            and networks needed to thrive in the global marketplace.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            <Badge variant="outline" className="bg-[#0b0b45]/20 text-[#b5b5ff] border-[#0b0b45]/40 backdrop-blur-sm text-xs md:text-sm px-3 md:px-4 py-1.5">
              <Globe className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              Global Market Ready
            </Badge>
            <Badge variant="outline" className="bg-[#0b0b45]/20 text-[#b5b5ff] border-[#0b0b45]/40 backdrop-blur-sm text-xs md:text-sm px-3 md:px-4 py-1.5">
              <Award className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              Fellowship Program
            </Badge>
            <Badge variant="outline" className="bg-[#0b0b45]/20 text-[#b5b5ff] border-[#0b0b45]/40 backdrop-blur-sm text-xs md:text-sm px-3 md:px-4 py-1.5">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
              Career Accelerator
            </Badge>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="container mx-auto px-4 mb-8 md:mb-12 lg:mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {[
            { label: 'Learning Sessions', value: stats.totalSessions, icon: Target, gradient: 'from-[#0b0b45] to-[#0f0f5a]', bg: 'bg-[#0b0b45]/20' },
            { label: 'Curated Resources', value: stats.totalResources, icon: BookOpen, gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
            { label: 'Expert Articles', value: stats.totalArticles, icon: FileText, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-500/10' },
            { label: 'Video Lessons', value: stats.totalVideos, icon: Play, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-500/10' },
          ].map((stat, idx) => (
            <Card
              key={idx}
              className="group relative overflow-hidden bg-slate-900/50 border-slate-800/50 backdrop-blur-sm hover:border-slate-700/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-in fade-in-50 zoom-in-95"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`absolute inset-0 ${stat.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <CardContent className="relative p-4 md:p-6">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm text-slate-400 mb-1 md:mb-2 font-medium">{stat.label}</p>
                    <p className="text-2xl md:text-3xl lg:text-4xl font-black text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`}}></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mission Statement Banner */}
        <div className="mt-12 md:mt-16 max-w-4xl mx-auto">
          <Card className="relative overflow-hidden bg-gradient-to-br from-[#0b0b45]/50 to-slate-900/50 border-[#0b0b45]/40 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b45]/10 via-transparent to-[#0f0f5a]/10"></div>
            <CardContent className="relative p-6 md:p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0b0b45] to-[#0f0f5a] flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">Our Mission</h3>
              </div>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                "Nothing is out of reach if you put in the work in your pursuit." We're dedicated to lowering barriers 
                and opening doors for young Africans to access global career opportunities through practical skills, 
                strategic thinking, and professional networks.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                <Badge className="bg-[#0b0b45]/40 text-[#b5b5ff] border-[#0b0b45]/50">
                  <TrendingUp className="w-3 h-3 mr-1.5" />
                  Upward Mobility
                </Badge>
                <Badge className="bg-[#0b0b45]/40 text-[#b5b5ff] border-[#0b0b45]/50">
                  <Award className="w-3 h-3 mr-1.5" />
                  Skills Development
                </Badge>
                <Badge className="bg-[#0b0b45]/40 text-[#b5b5ff] border-[#0b0b45]/50">
                  <Globe className="w-3 h-3 mr-1.5" />
                  Global Access
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 pb-16 md:pb-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Sidebar - Month Selector */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Curriculum
                </h3>
                <Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-700/50 text-xs">
                  {data.length} Months
                </Badge>
              </div>
              
              <div className="space-y-2">
                {data.map((month, idx) => {
                  const Icon = [Zap, Target, Brain, Globe][month.month - 1];
                  return (
                    <button
                      key={month.month}
                      onClick={() => {
                        setSelectedMonth(month.month);
                        setSelectedSession(null);
                        setSearchQuery('');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-300 group relative overflow-hidden animate-in slide-in-from-left ${
                        selectedMonth === month.month
                          ? 'bg-gradient-to-br from-[#0b0b45] to-[#0f0f5a] text-white shadow-xl shadow-[#0b0b45]/40 scale-105'
                          : 'bg-slate-900/50 text-slate-300 hover:bg-slate-800/70 border border-slate-800/50 hover:border-slate-700/50'
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {selectedMonth === month.month && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b45]/30 to-[#0f0f5a]/30 animate-pulse"></div>
                      )}
                      <div className="relative flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                          selectedMonth === month.month
                            ? 'bg-white/20 shadow-lg'
                            : 'bg-slate-800/50'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">Month {month.month}</span>
                            {selectedMonth === month.month && (
                              <Badge className="bg-white/20 text-white border-white/30 text-[10px] px-1.5 py-0">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className={`text-xs line-clamp-2 leading-relaxed ${
                            selectedMonth === month.month
                              ? 'text-[#e0e0ff]'
                              : 'text-slate-500 group-hover:text-slate-400'
                          }`}>
                            {month.theme}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {currentMonth && (
              <>
                {/* Month Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800/50 p-6 md:p-8 shadow-2xl animate-in fade-in-50 slide-in-from-bottom duration-500">
                  <div className="absolute inset-0 bg-grid-slate-700/25 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
                  <div className="relative">
                    <Badge className="mb-4 bg-[#0b0b45]/30 text-[#b5b5ff] border-[#0b0b45]/40 backdrop-blur-sm">
                      Current Month
                    </Badge>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3">
                          Month {currentMonth.month}
                        </h2>
                        <p className="text-slate-300 text-base md:text-lg font-medium max-w-2xl">
                          {currentMonth.theme}
                        </p>
                      </div>
                      <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2">
                        <div className="text-center md:text-right">
                          <p className="text-4xl md:text-5xl font-black bg-gradient-to-br from-[#1515aa] to-[#1a1aaf] bg-clip-text text-transparent">
                            {currentMonth.sessions.length}
                          </p>
                          <p className="text-xs text-slate-500 font-medium mt-1">Sessions</p>
                        </div>
                        <div className="h-8 w-px md:w-20 md:h-px bg-gradient-to-b md:bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                        <div className="text-center md:text-right">
                          <p className="text-2xl md:text-3xl font-bold text-slate-400">
                            {currentMonth.sessions.reduce((acc, s) => acc + s.resources.length, 0)}
                          </p>
                          <p className="text-xs text-slate-500 font-medium mt-1">Resources</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sessions Grid */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#8b8bf5]" />
                    Choose a Session
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentMonth.sessions.map((session, idx) => (
                      <Card
                        key={session.id}
                        onClick={() => setSelectedSession(session.id)}
                        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom ${
                          selectedSession === session.id
                            ? 'border-2 border-[#0b0b45] bg-gradient-to-br from-blue-950/50 to-slate-900/50 shadow-2xl shadow-[#0b0b45]/30 scale-105'
                            : 'border border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700/50 hover:scale-102'
                        }`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {selectedSession === session.id && (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b45]/10 to-[#0f0f5a]/10"></div>
                        )}
                        <CardHeader className="relative pb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
                              selectedSession === session.id
                                ? 'bg-gradient-to-br from-[#0b0b45] to-[#0f0f5a] text-white shadow-lg'
                                : 'bg-slate-800/50 text-slate-400 group-hover:bg-slate-700/50'
                            }`}>
                              {session.id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className={`text-base md:text-lg transition-colors mb-1 ${
                                selectedSession === session.id
                                  ? 'text-[#b5b5ff]'
                                  : 'text-white group-hover:text-[#8b8bf5]'
                              }`}>
                                Session {session.id}
                              </CardTitle>
                              <CardDescription className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                                {session.title}
                              </CardDescription>
                            </div>
                            <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all ${
                              selectedSession === session.id
                                ? 'text-[#8b8bf5] rotate-90'
                                : 'text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1'
                            }`} />
                          </div>
                        </CardHeader>
                        <CardContent className="relative">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${
                                selectedSession === session.id
                                  ? 'bg-[#0b0b45]/30 text-[#b5b5ff] border-[#0b0b45]/40'
                                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                              }`}>
                                {session.resources.length} resources
                              </Badge>
                            </div>
                            <div className="flex gap-1.5">
                              {session.resources.slice(0, 3).map((r, idx) => (
                                <div
                                  key={idx}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    r.type.includes('Video')
                                      ? 'bg-orange-500 shadow-sm shadow-orange-500/50'
                                      : 'bg-[#0b0b45] shadow-sm shadow-[#0b0b45]/50'
                                  }`}
                                  title={r.type}
                                />
                              ))}
                              {session.resources.length > 3 && (
                                <div className="w-2 h-2 rounded-full bg-slate-600" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Resources Detail */}
                {currentSession && (
                  <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm shadow-2xl animate-in fade-in-50 slide-in-from-bottom duration-700">
                    <CardHeader className="border-b border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-900/50 backdrop-blur-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-[#0b0b45]/30 text-[#b5b5ff] border-[#0b0b45]/40">
                              Session {currentSession.id}
                            </Badge>
                            <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700/50">
                              {currentSession.resources.length} items
                            </Badge>
                          </div>
                          <CardTitle className="text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                            {currentSession.title}
                          </CardTitle>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSession(null)}
                          className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full md:w-auto"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Close
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 md:p-6">
                      {/* Search Bar */}
                      <div className="mb-6">
                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#8b8bf5] transition-colors" />
                          <Input
                            placeholder="Search by title or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-[#0b0b45]/50 focus:ring-[#0b0b45]/20 transition-all"
                          />
                          {searchQuery && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white h-8 w-8"
                              onClick={() => setSearchQuery('')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Filter Tabs */}
                      <Tabs
                        value={resourceFilter}
                        onValueChange={(v) =>
                          setResourceFilter(v as 'all' | 'articles' | 'videos')
                        }
                        className="mb-6"
                      >
                        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700/50 h-auto p-1">
                          <TabsTrigger
                            value="all"
                            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 py-2.5 text-sm"
                          >
                            <span className="hidden sm:inline">All Resources</span>
                            <span className="sm:hidden">All</span>
                            <Badge variant="outline" className="ml-2 bg-slate-900/50 text-slate-300 border-slate-700/50 text-xs px-1.5">
                              {currentSession.resources.length}
                            </Badge>
                          </TabsTrigger>
                          <TabsTrigger
                            value="articles"
                            className="data-[state=active]:bg-[#0b0b45] data-[state=active]:text-white text-slate-400 py-2.5 text-sm"
                          >
                            <BookOpen className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline">Articles</span>
                            <span className="sm:hidden">Art.</span>
                            <Badge variant="outline" className="ml-2 bg-slate-900/50 text-slate-300 border-slate-700/50 text-xs px-1.5">
                              {
                                currentSession.resources.filter((r) =>
                                  r.type.includes('Article')
                                ).length
                              }
                            </Badge>
                          </TabsTrigger>
                          <TabsTrigger
                            value="videos"
                            className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-400 py-2.5 text-sm"
                          >
                            <Play className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline">Videos</span>
                            <span className="sm:hidden">Vid.</span>
                            <Badge variant="outline" className="ml-2 bg-slate-900/50 text-slate-300 border-slate-700/50 text-xs px-1.5">
                              {
                                currentSession.resources.filter((r) =>
                                  r.type.includes('Video')
                                ).length
                              }
                            </Badge>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {/* Resources List */}
                      <div className="space-y-3">
                        {filteredResources.length > 0 ? (
                          filteredResources.map((resource, idx) => (
                            <div
                              key={idx}
                              className="animate-in fade-in-50 slide-in-from-bottom"
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <ResourceCard
                                resource={resource}
                                onClick={() => handleResourceClick(resource)}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                              <Search className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400 text-lg font-medium mb-2">No resources found</p>
                            <p className="text-slate-500 text-sm">Try adjusting your search or filter</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0b0b45] to-[#0f0f5a] flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#b5b5ff]">ATLAS</h4>
                  <p className="text-xs text-slate-500">THRiVE Hub LaunchPad</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                <span className="font-semibold text-slate-300">Accelerating Talent for Leadership & Success.</span> Lowering barriers to upward economic mobility for young Africans through structured career development, 
                mentorship, and access to global opportunities.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Globe className="w-3 h-3" />
                <span>Ibadan, Nigeria</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-[#8b8bf5]" />
                Curriculum
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex items-center gap-2 group">
                  <Zap className="w-3.5 h-3.5 text-[#8b8bf5] group-hover:text-[#b5b5ff] transition-colors" />
                  <span className="group-hover:text-slate-300 transition-colors">Month 1: Foundations</span>
                </li>
                <li className="flex items-center gap-2 group">
                  <Target className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  <span className="group-hover:text-slate-300 transition-colors">Month 2: Positioning</span>
                </li>
                <li className="flex items-center gap-2 group">
                  <Brain className="w-3.5 h-3.5 text-green-400 group-hover:text-green-300 transition-colors" />
                  <span className="group-hover:text-slate-300 transition-colors">Month 3: Excellence</span>
                </li>
                <li className="flex items-center gap-2 group">
                  <Globe className="w-3.5 h-3.5 text-orange-400 group-hover:text-orange-300 transition-colors" />
                  <span className="group-hover:text-slate-300 transition-colors">Month 4: Global Readiness</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-[#8b8bf5]" />
                Resources
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <p className="text-2xl font-bold text-white">{stats.totalArticles}</p>
                  <p className="text-xs text-slate-500 mt-1">Articles</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <p className="text-2xl font-bold text-white">{stats.totalVideos}</p>
                  <p className="text-xs text-slate-500 mt-1">Videos</p>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Curated resources from industry experts and thought leaders
              </p>
            </div>
          </div>
          
          <div className="border-t border-slate-800/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm text-center md:text-left">
              © 2026 ATLAS • THRiVE Hub LaunchPad Fellowship
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Breaking barriers</span>
              <span className="text-[#8b8bf5] animate-pulse">•</span>
              <span>Building futures</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Media Players */}
      {openMedia && openMedia.type === 'video' && (
        <VideoPlayer
          url={openMedia.url}
          title={openMedia.title}
          onClose={() => setOpenMedia(null)}
        />
      )}

      {openMedia && openMedia.type === 'article' && (
        <ArticleViewer
          url={openMedia.url}
          title={openMedia.title}
          onClose={() => setOpenMedia(null)}
        />
      )}
    </div>
  );
}

interface ResourceCardProps {
  resource: Resource;
  onClick: () => void;
}

function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const isArticle = resource.type.includes('Article');
  const isCore = resource.type.includes('Core');

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 md:p-5 rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-800/70 hover:to-slate-900/50 hover:border-slate-700/50 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      
      <div className="relative flex items-start gap-3 md:gap-4">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 group-hover:scale-110 ${
          isArticle
            ? 'bg-[#0b0b45]/30 group-hover:bg-[#0b0b45]/40 shadow-lg shadow-[#0b0b45]/30'
            : 'bg-orange-500/20 group-hover:bg-orange-500/30 shadow-lg shadow-orange-500/20'
        }`}>
          {isArticle ? (
            <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-[#8b8bf5]" />
          ) : (
            <Play className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs ${
                isCore
                  ? 'bg-[#0b0b45]/30 text-[#b5b5ff] border-[#0b0b45]/50'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
              }`}
            >
              {resource.type}
            </Badge>
            {isCore && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                ⭐ Core
              </Badge>
            )}
          </div>
          <p className="text-sm md:text-base font-medium text-white group-hover:text-[#b5b5ff] transition-colors line-clamp-2 leading-relaxed">
            {resource.title}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-[#8b8bf5] group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </button>
  );
}
