'use client';

import { Search, Menu, Trophy, User, LogOut } from 'lucide-react';
import { useLeaderboardRank } from '@/hooks/api/useLeaderboard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/Notifications';

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  // Only show leaderboard trophy for fellows
  const showTrophy = isAuthenticated && user && user.role === 'FELLOW';
  // Get leaderboard score for fellow
  const { data: leaderboardRank } = useLeaderboardRank(user?.cohortId ?? undefined);
  const { toggleSidebar } = useUIStore();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getUserInitials = () => {
    if (!user?.name) return 'G';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo and Menu Toggle */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard/fellow" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-navy">
              {/* Only show trophy in logo for fellows */}
              {showTrophy ? <Trophy className="h-5 w-5 text-white" /> : null}
            </div>
            <span className="hidden text-xl font-bold text-atlas-navy sm:block">
              ATLAS
            </span>
          </Link>
        </div>

        {/* Center: Search (desktop only) */}
        <div className="hidden flex-1 max-w-md mx-8 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search resources, discussions..."
              className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        {/* Right: Actions and User Menu */}
        <div className="flex items-center gap-2">
          {/* Points Display - only for fellows, show leaderboard score */}
          {showTrophy && (
            <div className="hidden items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 sm:flex">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">
                {leaderboardRank?.points ?? 0}
              </span>
            </div>
          )}

          {/* Notifications */}
          {isAuthenticated && user && (
            <NotificationBell userId={user.id} userRole={user.role} />
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-slate-200 hover:ring-slate-300 transition-all">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none text-slate-900">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-slate-500 mt-1">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile &amp; Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer text-red-600 font-semibold hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
