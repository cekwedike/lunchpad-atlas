'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Bug,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Inbox,
} from 'lucide-react';
import {
  useAdminFeedback,
  useRespondToFeedback,
  FeedbackType,
  FeedbackStatus,
  Feedback,
} from '@/hooks/api/useFeedback';
import { useProfile } from '@/hooks/api/useProfile';
import { formatLocalTimestamp } from '@/lib/date-utils';

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  SUGGESTION: { label: 'Suggestion', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  BUG_REPORT: { label: 'Bug Report', icon: Bug, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  CONCERN: { label: 'Concern', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  GENERAL: { label: 'General', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

const STATUS_OPTIONS: { value: FeedbackStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_BADGE: Record<FeedbackStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  REVIEWED: { label: 'Reviewed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DECLINED: { label: 'Declined', className: 'bg-red-50 text-red-700 border-red-200' },
  CLOSED: { label: 'Closed', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function AdminFeedbackPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [selectedItem, setSelectedItem] = useState<Feedback | null>(null);
  const [responseStatus, setResponseStatus] = useState<FeedbackStatus>('REVIEWED');
  const [adminNote, setAdminNote] = useState('');

  const { data: feedbackList = [], isLoading, isError, error } = useAdminFeedback(
    statusFilter || undefined,
    undefined,
  );
  const respondMutation = useRespondToFeedback();

  const pendingCount = feedbackList.filter((f) => f.status === 'PENDING').length;

  const openRespond = (item: Feedback) => {
    setSelectedItem(item);
    setResponseStatus(item.status === 'PENDING' ? 'REVIEWED' : item.status);
    setAdminNote(item.adminNote ?? '');
  };

  const handleRespond = async () => {
    if (!selectedItem) return;
    try {
      await respondMutation.mutateAsync({
        feedbackId: selectedItem.id,
        status: responseStatus,
        adminNote: adminNote.trim() || undefined,
      });
      setSelectedItem(null);
    } catch {
      // Keep dialog open and note intact so admins can retry.
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-red-800">Not authorized</p>
            <p className="text-sm text-red-700 mt-1">
              Only admins can access the feedback inbox.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Feedback Inbox</h1>
            {pendingCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 border">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">Review and respond to feedback from fellows and facilitators.</p>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="py-10 text-center">
              <p className="text-sm font-semibold text-red-800">Could not load feedback inbox</p>
              <p className="text-xs text-red-700 mt-1">{(error as any)?.message || 'Please try again.'}</p>
            </CardContent>
          </Card>
        ) : feedbackList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <Inbox className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No feedback found</p>
              <p className="text-gray-400 text-sm mt-1">
                {statusFilter ? `No ${STATUS_BADGE[statusFilter as FeedbackStatus]?.label.toLowerCase()} feedback.` : 'No feedback has been submitted yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((item) => {
              const typeCfg = TYPE_CONFIG[item.type];
              const statusCfg = STATUS_BADGE[item.status];
              const TypeIcon = typeCfg.icon;

              return (
                <Card key={item.id} className={`bg-white border-gray-200 ${item.status === 'PENDING' ? 'ring-1 ring-orange-200' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border ${typeCfg.bg} shrink-0`}>
                          <TypeIcon className={`h-4 w-4 ${typeCfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-semibold text-gray-900">{item.subject}</CardTitle>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-600 font-medium">
                              {item.user?.firstName} {item.user?.lastName}
                            </span>
                            <span className="text-xs text-gray-400">{item.user?.role}</span>
                            <span className="text-xs text-gray-400">{formatLocalTimestamp(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                          {statusCfg.label}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRespond(item)}
                          className="h-7 text-xs"
                        >
                          Respond
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-sm text-gray-600">{item.message}</p>
                    {item.adminNote && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Your response</p>
                        <p className="text-sm text-blue-900">{item.adminNote}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Respond Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Respond to Feedback</DialogTitle>
              <DialogDescription>
                <strong>{selectedItem?.user?.firstName} {selectedItem?.user?.lastName}</strong> — {selectedItem?.subject}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-700">{selectedItem?.message}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Update status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['REVIEWED', 'ACCEPTED', 'DECLINED', 'CLOSED'] as FeedbackStatus[]).map((s) => {
                    const cfg = STATUS_BADGE[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setResponseStatus(s)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          responseStatus === s
                            ? `${cfg.className} ring-1 ring-current/30`
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-note" className="text-sm font-medium">
                  Response note <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="admin-note"
                  placeholder="Write a message to the submitter..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-400">The submitter will receive an email with your response note.</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSelectedItem(null)} disabled={respondMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleRespond}
                disabled={respondMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {respondMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Response'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
