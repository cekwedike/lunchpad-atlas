"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle2 } from "lucide-react";
import { useMarkResourceComplete, useTrackEngagement } from "@/hooks/api/useResources";
import { getYouTubeVideoId } from "@/lib/videoUtils";
import { cn } from "@/lib/utils";

// Numeric constants — never reference window.YT.PlayerState (can be undefined, will silently break handler)
const YT_PLAYING = 1;
// const YT_PAUSED = 2; // not needed explicitly
// const YT_ENDED  = 0; // caught by else branch

// Must accumulate 80% of video duration via real wall-clock play time
const WATCH_THRESHOLD = 0.8;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiReady: Promise<void> | null = null;

function ensureYtApi(): Promise<void> {
  if (ytApiReady) return ytApiReady;
  ytApiReady = new Promise<void>((resolve) => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.getElementById("yt-iframe-api-script")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api-script";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return ytApiReady;
}

export interface VideoResource {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  estimatedMinutes?: number | null;
  pointValue?: number | null;
}

interface VideoModalProps {
  open: boolean;
  resource: VideoResource | null;
  /** 0–100, loaded from backend ResourceProgress.watchPercentage */
  savedProgress?: number;
  alreadyCompleted?: boolean;
  onClose: () => void;
}

export function VideoModal({
  open,
  resource,
  savedProgress = 0,
  alreadyCompleted = false,
  onClose,
}: VideoModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Wall-clock tracking
  const watchedMsRef = useRef(0);
  const playStartRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const completedRef = useRef(false);
  const initialProgressAppliedRef = useRef(false);

  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [watchedPct, setWatchedPct] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const markComplete = useMarkResourceComplete(resource?.id ?? "");
  const trackEngagement = useTrackEngagement(resource?.id ?? "");

  // Always access latest mutation objects via refs to avoid stale closures
  const markCompleteRef = useRef(markComplete);
  const trackRef = useRef(trackEngagement);
  markCompleteRef.current = markComplete;
  trackRef.current = trackEngagement;

  function flushPlaytime() {
    if (playStartRef.current !== null) {
      watchedMsRef.current += performance.now() - playStartRef.current;
      playStartRef.current = null;
    }
  }

  // Track on backend THEN complete — backend requires watchPercentage >= 85 before accepting /complete
  async function finishResource() {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsComplete(true);
    try {
      await trackRef.current.mutateAsync({
        watchPercentage: 100,
        eventType: "video_progress",
      });
      await markCompleteRef.current.mutateAsync({});
    } catch {
      // error toast already handled inside the hooks
    }
  }

  function evaluateCompletion() {
    const dur = durationRef.current;
    if (dur <= 0 || completedRef.current) return;
    const pct = Math.min(1, watchedMsRef.current / (dur * 1000));
    setWatchedPct(pct);
    if (pct >= WATCH_THRESHOLD) {
      void finishResource();
    }
  }

  // Mount / destroy YouTube IFrame player
  useEffect(() => {
    if (!open || !resource) return;

    const videoId = getYouTubeVideoId(resource.url);
    if (!videoId) return;

    // Reset tracking
    watchedMsRef.current = 0;
    playStartRef.current = null;
    durationRef.current = 0;
    completedRef.current = alreadyCompleted;
    initialProgressAppliedRef.current = false;
    setActualDuration(null);
    setWatchedPct(alreadyCompleted ? 1 : savedProgress / 100);
    setIsComplete(alreadyCompleted);

    let destroyed = false;

    ensureYtApi().then(() => {
      if (destroyed || !containerRef.current) return;

      const player = new window.YT.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 1,        // Show controls — UX is better; anti-skimming via wall-clock timer
          rel: 0,
          modestbranding: 1,
          fs: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            const dur = e.target.getDuration();
            durationRef.current = dur;
            setActualDuration(dur);

            // Apply saved progress so wall-clock correctly continues from where they left off
            if (!alreadyCompleted && savedProgress > 0 && !initialProgressAppliedRef.current) {
              initialProgressAppliedRef.current = true;
              watchedMsRef.current = (savedProgress / 100) * dur * 1000;
            }
          },
          onStateChange: (e: any) => {
            // Use numeric constants — never reference window.YT.PlayerState here
            if (e.data === YT_PLAYING) {
              playStartRef.current = performance.now();
            } else {
              flushPlaytime();
              evaluateCompletion();
            }
          },
        },
      });

      (containerRef as any)._ytPlayer = player;
    });

    return () => {
      destroyed = true;
      flushPlaytime();
      try { (containerRef as any)._ytPlayer?.destroy(); } catch { /* ignore */ }
      (containerRef as any)._ytPlayer = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource?.id]);

  // Update display AND check completion every 500ms while playing
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (playStartRef.current === null) return;
      const tentativeMs = watchedMsRef.current + (performance.now() - playStartRef.current);
      const dur = durationRef.current;
      if (dur <= 0) return;
      const pct = Math.min(1, tentativeMs / (dur * 1000));
      setWatchedPct(pct);
      // Check completion mid-playback (don't rely solely on onStateChange ENDED)
      if (pct >= WATCH_THRESHOLD && !completedRef.current) {
        flushPlaytime();
        evaluateCompletion();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Save progress to backend every 10s while playing
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (playStartRef.current === null || completedRef.current) return;
      const tentativeMs = watchedMsRef.current + (performance.now() - playStartRef.current);
      const dur = durationRef.current;
      if (dur <= 0) return;
      const pct = Math.min(1, tentativeMs / (dur * 1000));
      const pctInt = Math.round(pct * 100);
      if (pctInt > 0) {
        trackRef.current.mutate({ watchPercentage: pctInt, eventType: "video_progress" });
      }
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    flushPlaytime();
    evaluateCompletion();
    // Persist current progress on close
    const dur = durationRef.current;
    if (dur > 0 && !completedRef.current) {
      const pctInt = Math.round(Math.min(1, watchedMsRef.current / (dur * 1000)) * 100);
      if (pctInt > 0) {
        trackRef.current.mutate({ watchPercentage: pctInt, eventType: "video_progress" });
      }
    }
    onClose();
  }

  const displayMinutes =
    actualDuration != null ? Math.ceil(actualDuration / 60) : (resource?.estimatedMinutes ?? null);
  const pctDisplay = Math.round(watchedPct * 100);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="w-[90vw] max-w-4xl">
        <DialogHeader>
          <DialogTitle>{resource?.title}</DialogTitle>
        </DialogHeader>

        {resource && (
          <div className="space-y-3">
            {resource.description && (
              <p className="text-sm text-gray-500">{resource.description}</p>
            )}

            <div
              className="relative w-full rounded-xl overflow-hidden bg-black"
              style={{ paddingBottom: "56.25%" }}
            >
              <div
                key={resource.id}
                ref={containerRef}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Watch progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Watch progress</span>
                <span className={cn("font-medium", isComplete ? "text-emerald-600" : "text-gray-600")}>
                  {isComplete ? "Completed" : `${pctDisplay}% watched`}
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
                <p className="text-xs text-gray-400">Watch at least 80% of the video to earn points</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {displayMinutes != null && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {displayMinutes} min
                  </span>
                )}
                {resource.pointValue && (
                  <span className={cn(
                    "flex items-center gap-1.5 font-semibold",
                    isComplete ? "text-emerald-600" : "text-amber-600",
                  )}>
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
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
