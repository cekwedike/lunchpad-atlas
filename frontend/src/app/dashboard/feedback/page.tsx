'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
} from 'lucide-react';
import { useMyFeedback, useSubmitFeedback, useDeleteFeedback, FeedbackType, FeedbackStatus } from '@/hooks/api/useFeedback';
import { formatLocalTimestamp } from '@/lib/date-utils';

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  SUGGESTION: { label: 'Suggestion', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  BUG_REPORT: { label: 'Bug Report', icon: Bug, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  CONCERN: { label: 'Concern', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  GENERAL: { label: 'General', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; icon: React.ElementType; color: string }> = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-gray-500' },
  REVIEWED: { label: 'Reviewed', icon: Clock, color: 'text-blue-600' },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle2, color: 'text-emerald-600' },
  DECLINED: { label: 'Declined', icon: XCircle, color: 'text-red-600' },
  CLOSED: { label: 'Closed', icon: CheckCircle2, color: 'text-gray-400' },
};

export default function FeedbackPage() {
  const { data: feedbackList = [], isLoading } = useMyFeedback();
  const submitFeedback = useSubmitFeedback();
  const deleteFeedback = useDeleteFeedback();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'GENERAL' as FeedbackType, subject: '', message: '' });

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    await submitFeedback.mutateAsync(form);
    setIsDialogOpen(false);
    setForm({ type: 'GENERAL', subject: '', message: '' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteFeedback.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
            <p className="text-gray-500 text-sm mt-1">Submit suggestions, report issues, or share concerns with the admin team.</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : feedbackList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No feedback submitted yet</p>
              <p className="text-gray-400 text-sm mt-1">Your submissions will appear here once you submit them.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((item) => {
              const typeCfg = TYPE_CONFIG[item.type];
              const statusCfg = STATUS_CONFIG[item.status];
              const TypeIcon = typeCfg.icon;
              const StatusIcon = statusCfg.icon;

              return (
                <Card key={item.id} className="bg-white border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border ${typeCfg.bg} shrink-0`}>
                          <TypeIcon className={`h-4 w-4 ${typeCfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-semibold text-gray-900 leading-tight">{item.subject}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${typeCfg.bg} ${typeCfg.color} border-current/20`}>
                              {typeCfg.label}
                            </Badge>
                            <span className="text-xs text-gray-400">{formatLocalTimestamp(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-1 text-xs font-medium ${statusCfg.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusCfg.label}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(item.id)}
                          disabled={deleteFeedback.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-sm text-gray-600">{item.message}</p>
                    {item.adminNote && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Admin response</p>
                        <p className="text-sm text-blue-900">{item.adminNote}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Submit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Submit Feedback</DialogTitle>
              <DialogDescription>
                Share a suggestion, report an issue, or raise a concern. The admin team will review and respond.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_CONFIG) as FeedbackType[]).map((type) => {
                    const cfg = TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, type })}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                          form.type === type
                            ? `${cfg.bg} ${cfg.color} border-current/30 ring-1 ring-current/20`
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary..."
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">Details</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your feedback in detail..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="resize-none"
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitFeedback.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.subject.trim() || !form.message.trim() || submitFeedback.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitFeedback.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete feedback?</DialogTitle>
              <DialogDescription>This will permanently remove your submission. This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteFeedback.isPending}>Cancel</Button>
              <Button onClick={handleDelete} disabled={deleteFeedback.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                {deleteFeedback.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
