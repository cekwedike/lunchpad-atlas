"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle2, ExternalLink, BookOpen } from "lucide-react";
import { useMarkResourceComplete } from "@/hooks/api/useResources";
import { cn } from "@/lib/utils";

// Must have the modal open for 80% of estimated reading time to earn points
const READ_THRESHOLD = 0.8;
// Default required time when no estimatedMinutes is set (seconds)
const DEFAULT_REQUIRED_SECS = 120;

export interface ArticleResource {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  estimatedMinutes?: number | null;
  pointValue?: number | null;
}

interface ArticleModalProps {
  open: boolean;
  resource: ArticleResource | null;
  onClose: () => void;
}

export function ArticleModal({ open, resource, onClose }: ArticleModalProps) {
  // Wall-clock time the modal has been open (proxy for time spent reading)
  const openedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const completedRef = useRef(false);
  const requiredSecsRef = useRef(DEFAULT_REQUIRED_SECS);

  const [readPct, setReadPct] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const markComplete = useMarkResourceComplete(resource?.id ?? "");
  const markCompleteRef = useRef(markComplete);
  markCompleteRef.current = markComplete;

  function flushTime() {
    if (openedAtRef.current !== null) {
      accumulatedMsRef.current += performance.now() - openedAtRef.current;
      openedAtRef.current = null;
    }
  }

  function evaluateCompletion(currentMs: number) {
    if (completedRef.current) return;
    const requiredMs = requiredSecsRef.current * 1000;
    const pct = Math.min(1, currentMs / requiredMs);
    setReadPct(pct);
    if (pct >= READ_THRESHOLD) {
      completedRef.current = true;
      setIsComplete(true);
      markCompleteRef.current.mutate({});
    }
  }

  // Reset and start timer when modal opens
  useEffect(() => {
    if (!open || !resource) return;

    accumulatedMsRef.current = 0;
    completedRef.current = false;
    openedAtRef.current = performance.now();
    requiredSecsRef.current = resource.estimatedMinutes
      ? resource.estimatedMinutes * 60 * READ_THRESHOLD
      : DEFAULT_REQUIRED_SECS;
    setReadPct(0);
    setIsComplete(false);

    return () => {
      flushTime();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource?.id]);

  // Update progress bar every 500ms
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (openedAtRef.current === null) return;
      const total = accumulatedMsRef.current + (performance.now() - openedAtRef.current);
      evaluateCompletion(total);
    }, 500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    flushTime();
    const total = accumulatedMsRef.current;
    evaluateCompletion(total);
    onClose();
  }

  const pctDisplay = Math.round(readPct * 100);
  const requiredMinutes = resource?.estimatedMinutes
    ? Math.round(resource.estimatedMinutes * READ_THRESHOLD)
    : Math.round(DEFAULT_REQUIRED_SECS / 60);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <DialogTitle className="leading-snug">{resource?.title}</DialogTitle>
            {resource?.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in tab
              </a>
            )}
          </div>
        </DialogHeader>

        {resource && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {resource.description && (
              <p className="text-sm text-gray-500 shrink-0">{resource.description}</p>
            )}

            {/* Article embed — many sites block iframes; fallback message is shown */}
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {/* Fallback shown behind the iframe for sites that block embedding */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 p-6">
                <BookOpen className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-center text-gray-500 max-w-xs">
                  This article can't be embedded here. Open it in a new tab using the button above, then come back — the timer will continue running while this window is open.
                </p>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open article
                </a>
              </div>
              <iframe
                key={resource.id}
                src={resource.url}
                className="relative z-10 w-full h-full min-h-[55vh]"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                title={resource.title}
              />
            </div>

            {/* Read-time progress bar */}
            <div className="space-y-1 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Read progress</span>
                <span
                  className={cn(
                    "font-medium",
                    isComplete ? "text-emerald-600" : "text-gray-600",
                  )}
                >
                  {isComplete ? "Completed" : `${pctDisplay}% read`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isComplete ? "bg-emerald-500" : "bg-blue-500",
                  )}
                  style={{ width: `${pctDisplay}%` }}
                />
              </div>
              {!isComplete && (
                <p className="text-xs text-gray-400">
                  Keep this open for at least {requiredMinutes} min to earn points
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {resource.estimatedMinutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {resource.estimatedMinutes} min read
                  </span>
                )}
                {resource.pointValue && (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-semibold",
                      isComplete ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {resource.pointValue} pts{isComplete ? " earned!" : ""}
                  </span>
                )}
              </div>
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
