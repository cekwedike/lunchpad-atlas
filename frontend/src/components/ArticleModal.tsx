"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, ExternalLink, BookOpen, Clock } from "lucide-react";
import { useMarkResourceComplete, useTrackEngagement } from "@/hooks/api/useResources";
import { cn } from "@/lib/utils";

const READ_THRESHOLD = 0.8;

// Required open time in seconds (while they read in the external tab)
function getRequiredSecs(estimatedMinutes?: number | null) {
  if (estimatedMinutes && estimatedMinutes > 0) {
    return Math.round(estimatedMinutes * 60 * READ_THRESHOLD);
  }
  return 180; // 3 min fallback
}

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
  savedProgress?: number; // 0–100 from backend (maps to scrollDepth)
  alreadyCompleted?: boolean;
  onClose: () => void;
}

export function ArticleModal({
  open,
  resource,
  savedProgress = 0,
  alreadyCompleted = false,
  onClose,
}: ArticleModalProps) {
  const timerStartRef = useRef<number | null>(null); // performance.now() when reading started
  const accumulatedMsRef = useRef(0);
  const completedRef = useRef(false);
  const requiredMsRef = useRef(180000);

  const [hasStarted, setHasStarted] = useState(false);
  const [readPct, setReadPct] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  const markComplete = useMarkResourceComplete(resource?.id ?? "");
  const trackEngagement = useTrackEngagement(resource?.id ?? "");

  const markCompleteRef = useRef(markComplete);
  const trackRef = useRef(trackEngagement);
  markCompleteRef.current = markComplete;
  trackRef.current = trackEngagement;

  function flushTime() {
    if (timerStartRef.current !== null) {
      accumulatedMsRef.current += performance.now() - timerStartRef.current;
      timerStartRef.current = null;
    }
  }

  // Track THEN complete — backend checks scrollDepth >= 80 AND minimumThresholdMet.
  // Separate try/catch so a track failure doesn't block the complete call.
  async function finishResource() {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsComplete(true);
    const elapsedMs = Math.min(accumulatedMsRef.current, requiredMsRef.current);
    try {
      await trackRef.current.mutateAsync({
        scrollDepth: 100,                               // backend checks scrollDepth >= 80 for articles
        timeSpent: Math.round(elapsedMs / 1000),        // required for minimumThresholdMet
        eventType: "time_update",
      });
    } catch {
      // silent — error toast handled in hook; still attempt complete below
    }
    try {
      await markCompleteRef.current.mutateAsync({});
    } catch {
      // error toast handled in hook
    }
  }

  function evaluateCompletion(currentMs: number) {
    if (completedRef.current) return;
    const pct = Math.min(1, currentMs / requiredMsRef.current);
    setReadPct(pct);
    setElapsedSecs(Math.round(currentMs / 1000));
    if (pct >= READ_THRESHOLD) {
      void finishResource();
    }
  }

  // Reset on open
  useEffect(() => {
    if (!open || !resource) return;

    const required = getRequiredSecs(resource.estimatedMinutes) * 1000;
    requiredMsRef.current = required;

    const initialMs = (savedProgress / 100) * required;
    accumulatedMsRef.current = alreadyCompleted ? required : initialMs;
    completedRef.current = alreadyCompleted;
    timerStartRef.current = null;

    const startedAlready = alreadyCompleted || savedProgress > 0;
    setHasStarted(startedAlready);
    setReadPct(alreadyCompleted ? 1 : savedProgress / 100);
    setIsComplete(alreadyCompleted);
    setElapsedSecs(Math.round(initialMs / 1000));

    return () => { flushTime(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource?.id]);

  // Update progress every 500ms (only while reading)
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (timerStartRef.current === null) return;
      const total = accumulatedMsRef.current + (performance.now() - timerStartRef.current);
      evaluateCompletion(total);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Save progress every 15s while reading
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (completedRef.current || timerStartRef.current === null) return;
      const total = accumulatedMsRef.current + (performance.now() - timerStartRef.current);
      const pctInt = Math.round(Math.min(1, total / requiredMsRef.current) * 100);
      if (pctInt > 0) {
        trackRef.current.mutate({
          scrollDepth: pctInt,                               // backend field for articles
          timeSpent: Math.round(Math.min(total, requiredMsRef.current) / 1000),
          eventType: "time_update",
        });
      }
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleStartReading() {
    if (!resource) return;
    window.open(resource.url, "_blank", "noopener,noreferrer");
    // Start timer only now — they are actively reading
    timerStartRef.current = performance.now();
    setHasStarted(true);
  }

  function handleClose() {
    flushTime();
    evaluateCompletion(accumulatedMsRef.current);
    if (!completedRef.current) {
      const pctInt = Math.round(Math.min(1, accumulatedMsRef.current / requiredMsRef.current) * 100);
      if (pctInt > 0) {
        trackRef.current.mutate({
          scrollDepth: pctInt,
          timeSpent: Math.round(accumulatedMsRef.current / 1000),
          eventType: "time_update",
        });
      }
    }
    onClose();
  }

  const requiredSecs = requiredMsRef.current / 1000;
  const remainingSecs = Math.max(0, Math.round(requiredSecs - elapsedSecs));
  const pctDisplay = Math.round(readPct * 100);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="w-[90vw] max-w-lg">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-8">{resource?.title}</DialogTitle>
        </DialogHeader>

        {resource && (
          <div className="space-y-4">
            {/* Article info card */}
            {!isComplete ? (
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
                      <p className="text-sm text-gray-500">Click below to open the article in a new tab and start reading. Keep this window open while you read — your progress is tracked here.</p>
                    )}
                  </div>
                </div>

                {/* Instruction when not started */}
                {!hasStarted && (
                  <div className="pt-1">
                    <Button
                      className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleStartReading}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Start Reading
                    </Button>
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Opens the article in a new tab. Come back here when you're done.
                    </p>
                  </div>
                )}

                {/* Re-open button when already started */}
                {hasStarted && !isComplete && (
                  <button
                    onClick={handleStartReading}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open article again
                  </button>
                )}
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

            {/* Progress — only shown after reading started */}
            {hasStarted && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {isComplete ? "Read progress" : (
                      remainingSecs > 0
                        ? `Keep reading — ${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s remaining`
                        : "Almost done…"
                    )}
                  </span>
                  <span className={cn("font-medium", isComplete ? "text-emerald-600" : "text-gray-600")}>
                    {pctDisplay}%
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
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                {resource.pointValue && (
                  <span className={cn(
                    "flex items-center gap-1.5 font-semibold",
                    isComplete ? "text-emerald-600" : "text-amber-600",
                  )}>
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    {resource.pointValue} pts{isComplete ? " earned!" : ""}
                  </span>
                )}
                {!isComplete && hasStarted && resource.estimatedMinutes && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    ~{resource.estimatedMinutes} min read
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Fallback button: visible at ≥80% in case auto-trigger fails */}
                {pctDisplay >= 80 && !isComplete && (
                  <Button variant="outline" size="sm" onClick={() => void finishResource()}>
                    Mark as Complete
                  </Button>
                )}
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
