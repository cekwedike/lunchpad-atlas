'use client';

import { useAuthStore } from '@/stores/authStore';
import { NotificationDropdown } from '@/components/Notifications/NotificationDropdown';
import { Card } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    redirect('/login');
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">All Notifications</h1>
      <Card>
        <NotificationDropdown userId={user.id} onClose={() => {}} />
      </Card>
    </div>
  );
}
