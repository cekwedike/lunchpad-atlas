'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Trophy,
  FileQuestion,
  User,
  Users,
  Settings,
  Calendar,
  BarChart3,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types/api';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/fellow',
    icon: LayoutDashboard,
  },
  {
    title: 'Resources',
    href: '/resources',
    icon: BookOpen,
  },
  {
    title: 'Discussions',
    href: '/discussions',
    icon: MessageSquare,
  },
  {
    title: 'Leaderboard',
    href: '/leaderboard',
    icon: Trophy,
  },
  {
    title: 'Quizzes',
    href: '/quiz',
    icon: FileQuestion,
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: User,
  },
];

const facilitatorItems: NavItem[] = [
  {
    title: 'Cohort Management',
    href: '/dashboard/facilitator',
    icon: Users,
    roles: [UserRole.FACILITATOR, UserRole.ADMIN],
  },
  {
    title: 'Sessions',
    href: '/dashboard/facilitator/sessions',
    icon: Calendar,
    roles: [UserRole.FACILITATOR, UserRole.ADMIN],
  },
];

const adminItems: NavItem[] = [
  {
    title: 'Admin Dashboard',
    href: '/dashboard/admin',
    icon: BarChart3,
    roles: [UserRole.ADMIN],
  },
  {
    title: 'User Management',
    href: '/dashboard/admin/users',
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    title: 'Settings',
    href: '/dashboard/admin/settings',
    icon: Settings,
    roles: [UserRole.ADMIN],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, isGuestMode } = useAuthStore();

  const canAccessItem = (item: NavItem) => {
    if (isGuestMode) return true;
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  };

  const allItems = [
    ...navItems,
    ...(user?.role === UserRole.FACILITATOR || user?.role === UserRole.ADMIN ? facilitatorItems : []),
    ...(user?.role === UserRole.ADMIN ? adminItems : []),
  ].filter(canAccessItem);

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-white transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Close button (mobile) */}
          <div className="flex items-center justify-between border-b p-4 lg:hidden">
            <span className="text-lg font-semibold">Menu</span>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {allItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-atlas-navy text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-atlas-navy'
                  )}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      toggleSidebar();
                    }
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            {isGuestMode && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-900">Guest Mode</p>
                <p className="mt-1 text-xs text-amber-700">
                  Limited features available
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden lg:block lg:w-64" />
    </>
  );
}
