"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle2, MessageSquare } from "lucide-react";
import { useMarkResourceComplete, useTrackEngagement } from "@/hooks/api/useResources";
import { getYouTubeVideoId } from "@/lib/videoUtils";
import { cn } from "@/lib/utils";

// Numeric constants — never reference window.YT.PlayerState (can be undefined, will silently break handler)
const YT_PLAYING = 1;

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
  const router = useRouter();

  // Wall-clock tracking — all mutable, no re-render needed
  const watchedMsRef = useRef(0);
  const playStartRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const completedRef = useRef(false);
  const playerRef = useRef<any>(null);

  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [watchedPct, setWatchedPct] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const markComplete = useMarkResourceComplete(resource?.id ?? "");
  const trackEngagement = useTrackEngagement(resource?.id ?? "");

  // Refs so async callbacks always see the latest mutation objects
  const markCompleteRef = useRef(markComplete);
  const trackRef = useRef(trackEngagement);
  markCompleteRef.current = markComplete;
  trackRef.current = trackEngagement;

  // Stable element ID: YT.Player targets this div by ID string (more reliable than passing a DOM element)
  const playerId = resource ? `yt-player-${resource.id}` : "yt-player";

  function flushPlaytime() {
    if (playStartRef.current !== null) {
      watchedMsRef.current += performance.now() - playStartRef.current;
      playStartRef.current = null;
    }
  }

  // Track THEN complete — backend requires watchPercentage >= 85 AND minimumThresholdMet before accepting /complete.
  // Separate try/catch so a track failure doesn't block the complete call.
  async function finishResource() {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsComplete(true);
    try {
      await trackRef.current.mutateAsync({
        watchPercentage: 100,
        timeSpent: Math.round(watchedMsRef.current / 1000), // required for minimumThresholdMet
        eventType: "video_progress",
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

    // Reset tracking state
    watchedMsRef.current = 0;
    playStartRef.current = null;
    durationRef.current = 0;
    completedRef.current = alreadyCompleted;
    setActualDuration(null);
    setWatchedPct(alreadyCompleted ? 1 : savedProgress / 100);
    setIsComplete(alreadyCompleted);

    let destroyed = false;

    ensureYtApi().then(() => {
      if (destroyed || !document.getElementById(playerId)) return;

      const player = new window.YT.Player(playerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,       // No native controls — anti-skimming
          disablekb: 1,      // Disable keyboard shortcuts (arrow-key seeking)
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

            // Restore wall-clock credit AND seek player to saved position
            if (!alreadyCompleted && savedProgress > 0) {
              watchedMsRef.current = (savedProgress / 100) * dur * 1000;
              e.target.seekTo((savedProgress / 100) * dur, true);
            }
          },
          onStateChange: (e: any) => {
            // Use numeric constants — window.YT.PlayerState can be undefined, silently breaking this
            if (e.data === YT_PLAYING) {
              playStartRef.current = performance.now();
            } else {
              flushPlaytime();
              evaluateCompletion();
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      destroyed = true;
      flushPlaytime();
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
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
      const pctInt = Math.round(Math.min(1, tentativeMs / (dur * 1000)) * 100);
      if (pctInt > 0) {
        trackRef.current.mutate({
          watchPercentage: pctInt,
          timeSpent: Math.round(tentativeMs / 1000),
          eventType: "video_progress",
        });
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
        trackRef.current.mutate({
          watchPercentage: pctInt,
          timeSpent: Math.round(watchedMsRef.current / 1000),
          eventType: "video_progress",
        });
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
              {/* YT.Player targets this div by ID — do NOT use ref, the player replaces the element */}
              <div
                id={playerId}
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
