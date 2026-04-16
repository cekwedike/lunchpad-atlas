"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, BookOpen, MessageSquare, Zap } from "lucide-react";
import { useCompleteArticleOpen } from "@/hooks/api/useResources";
import { getArticleCompletionPoints } from "@/lib/resourcePoints";

export interface ArticleResource {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  estimatedMinutes?: number | null;
  pointValue?: number | null;
  isCore?: boolean;
}

interface ArticleModalProps {
  open: boolean;
  resource: ArticleResource | null;
  /** Legacy prop from list progress — ignored (completion is server-driven). */
  savedProgress?: number;
  alreadyCompleted?: boolean;
  onClose: () => void;
}

/**
 * Articles complete when the fellow opens the external link and switches away from this tab
 * (visibility hidden). Server awards fixed points once (30 core / 15 optional).
 */
export function ArticleModal({
  open,
  resource,
  alreadyCompleted = false,
  onClose,
}: ArticleModalProps) {
  const router = useRouter();
  const openedRef = useRef(false);
  const [isComplete, setIsComplete] = useState(false);

  const completeArticle = useCompleteArticleOpen(resource?.id ?? "");

  const pts = getArticleCompletionPoints(resource?.isCore);

  useEffect(() => {
    if (open) {
      openedRef.current = false;
      setIsComplete(!!alreadyCompleted);
    }
  }, [open, resource?.id, alreadyCompleted]);

  useEffect(() => {
    if (!open || !resource) return;

    const onVis = () => {
      if (document.visibilityState !== "hidden") return;
      if (!openedRef.current || alreadyCompleted || isComplete) return;
      void completeArticle.mutateAsync().then(
        (res: { alreadyCompleted?: boolean; pointsAwarded?: number }) => {
          if (res?.alreadyCompleted || res?.pointsAwarded !== undefined) {
            setIsComplete(true);
          }
        },
      );
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // completeArticle.mutateAsync is stable enough; omit to avoid re-binding every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource?.id, alreadyCompleted, isComplete]);

  function handleOpenArticle() {
    if (!resource) return;
    window.open(resource.url, "_blank", "noopener,noreferrer");
    openedRef.current = true;
  }

  function handleClose() {
    onClose();
  }

  const showComplete = alreadyCompleted || isComplete;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-8">{resource?.title}</DialogTitle>
        </DialogHeader>

        {resource && (
          <div className="space-y-4">
            {!showComplete ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 shrink-0">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    {resource.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{resource.description}</p>
                    )}
                    {!resource.description && (
                      <p className="text-sm text-gray-500">
                        Open the article in a new tab. When you switch away from LaunchPad to read (another tab or app),
                        we mark it complete automatically — no need to keep this window open.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleOpenArticle}
                    disabled={completeArticle.isPending}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open article
                  </Button>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    After you open it, switch to the article tab or another app to complete — {pts} pts
                    {resource.isCore === false ? " (optional)" : " (core)"}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">Article completed!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Points have been added to your account.</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                <Zap className="h-4 w-4" />
                {pts} pts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleClose();
                    router.push(`/dashboard/discussions?resourceId=${resource.id}`);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Discuss
                </Button>
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
