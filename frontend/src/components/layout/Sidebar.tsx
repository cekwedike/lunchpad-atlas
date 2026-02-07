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
  ChevronRight,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types/api';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, isGuestMode } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Role-based navigation items
  const getFellowItems = (): NavItem[] => [
    {
      title: 'Dashboard',
      href: '/dashboard/fellow',
      icon: LayoutDashboard,
    },
    {
      title: 'My Cohort',
      href: '/dashboard/fellow/cohorts',
      icon: Users,
    },
    {
      title: 'Resources',
      href: '/resources',
      icon: BookOpen,
    },
    {
      title: 'Discussions',
      href: '/dashboard/discussions',
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

  const getFacilitatorItems = (): NavItem[] => [
    {
      title: 'Dashboard',
      href: '/dashboard/facilitator',
      icon: LayoutDashboard,
    },
    {
      title: 'Cohort Management',
      href: '/dashboard/facilitator/cohorts',
      icon: Users,
    },
    {
      title: 'Sessions',
      href: '/dashboard/facilitator/sessions',
      icon: Calendar,
    },
    {
      title: 'Resource Management',
      href: '/dashboard/admin/resources',
      icon: BookOpen,
    },
    {
      title: 'Resources (View)',
      href: '/resources',
      icon: GraduationCap,
    },
    {
      title: 'Discussions',
      href: '/dashboard/discussions',
      icon: MessageSquare,
    },
    {
      title: 'Profile',
      href: '/profile',
      icon: User,
    },
  ];

  const getAdminItems = (): NavItem[] => [
    {
      title: 'Dashboard',
      href: '/dashboard/admin',
      icon: LayoutDashboard,
    },
    {
      title: 'User Management',
      href: '/dashboard/admin/users',
      icon: Users,
    },
    {
      title: 'Cohort Management',
      href: '/dashboard/admin/cohorts',
      icon: GraduationCap,
    },
    {
      title: 'Sessions Management',
      href: '/dashboard/admin/sessions',
      icon: Calendar,
    },
    {
      title: 'Resource Management',
      href: '/dashboard/admin/resources',
      icon: BookOpen,
    },
    {
      title: 'Analytics',
      href: '/dashboard/admin/analytics',
      icon: BarChart3,
    },
    {
      title: 'Discussions',
      href: '/dashboard/discussions',
      icon: MessageSquare,
    },
    {
      title: 'Resources (View)',
      href: '/resources',
      icon: GraduationCap,
    },
    {
      title: 'Settings',
      href: '/dashboard/admin/settings',
      icon: Settings,
    },
    {
      title: 'Profile',
      href: '/profile',
      icon: User,
    },
  ];

  // Determine which items to show based on user role
  const getNavItems = (): NavItem[] => {
    if (isGuestMode || !user?.role) {
      return getFellowItems();
    }

    switch (user.role) {
      case UserRole.ADMIN:
        return getAdminItems();
      case UserRole.FACILITATOR:
        return getFacilitatorItems();
      case UserRole.FELLOW:
      default:
        return getFellowItems();
    }
  };

  const navItems = getNavItems();

  // Role badge config
  const getRoleBadge = () => {
    if (isGuestMode) {
      return { label: 'Guest', icon: User, color: 'from-slate-500 to-slate-600' };
    }
    
    switch (user?.role) {
      case UserRole.ADMIN:
        return { label: 'Admin', icon: Shield, color: 'from-emerald-500 to-teal-500' };
      case UserRole.FACILITATOR:
        return { label: 'Facilitator', icon: GraduationCap, color: 'from-cyan-500 to-blue-500' };
      case UserRole.FELLOW:
      default:
        return { label: 'Fellow', icon: User, color: 'from-blue-500 to-cyan-500' };
    }
  };

  const roleBadge = getRoleBadge();
  const RoleBadgeIcon = roleBadge.icon;

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-slate-200 bg-white shadow-lg transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-72',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Role Badge Header */}
          <div className={cn(
            "border-b border-slate-200 p-4",
            isCollapsed ? "px-2" : "px-4"
          )}>
            <div className={cn(
              "relative overflow-hidden rounded-xl p-1",
              `bg-gradient-to-br ${roleBadge.color}`
            )}>
              <div className="bg-white rounded-[10px] p-3">
                <div className={cn(
                  "flex items-center gap-3",
                  isCollapsed && "justify-center"
                )}>
                  <div className={cn(
                    "p-2 rounded-lg",
                    `bg-gradient-to-br ${roleBadge.color}`
                  )}>
                    <RoleBadgeIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500">Role</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{roleBadge.label}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Exact match or starts with href followed by a slash (but not for /dashboard paths to avoid overlap)
              const isActive = pathname === item.href || 
                (pathname?.startsWith(`${item.href}/`) && !item.href.match(/\/dashboard\/[^/]+$/));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? item.title : undefined}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      toggleSidebar();
                    }
                  }}
                >
                  <Icon className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900"
                  )} />
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle Button (Desktop only) */}
          <div className="hidden lg:block border-t border-slate-200 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "w-full hover:bg-slate-100 text-slate-700",
                isCollapsed && "px-2"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span className="text-xs font-medium">Collapse</span>
                </>
              )}
            </Button>
          </div>

          {/* Guest Mode Notice */}
          {isGuestMode && !isCollapsed && (
            <div className="border-t border-slate-200 p-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-bold text-amber-900">Guest Mode</p>
                <p className="mt-1 text-xs text-amber-700">
                  Limited features available
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className={cn(
        "hidden lg:block transition-all duration-300",
        isCollapsed ? "lg:w-20" : "lg:w-72"
      )} />
    </>
  );
}
