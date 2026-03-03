"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle2 } from "lucide-react";
import { useMarkResourceComplete } from "@/hooks/api/useResources";
import { getYouTubeVideoId } from "@/lib/videoUtils";
import { cn } from "@/lib/utils";

// Fellow must watch at least this fraction via real elapsed time (seeking doesn't help)
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
  onClose: () => void;
}

export function VideoModal({ open, resource, onClose }: VideoModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // All tracking state lives in refs — no stale-closure risk in effects/callbacks
  const watchedMsRef = useRef(0);         // Accumulated real milliseconds of play
  const playStartRef = useRef<number | null>(null); // performance.now() when last PLAYING started
  const durationRef = useRef(0);          // Video duration in seconds
  const completedRef = useRef(false);

  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [watchedPct, setWatchedPct] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const markComplete = useMarkResourceComplete(resource?.id ?? "");
  // Keep a ref so closures inside effects always reach the latest mutation object
  const markCompleteRef = useRef(markComplete);
  markCompleteRef.current = markComplete;

  // Add elapsed play time to watchedMs and clear the start timestamp
  function flushPlaytime() {
    if (playStartRef.current !== null) {
      watchedMsRef.current += performance.now() - playStartRef.current;
      playStartRef.current = null;
    }
  }

  // Check whether the fellow has crossed the completion threshold
  function evaluateCompletion() {
    const dur = durationRef.current;
    if (dur <= 0 || completedRef.current) return;
    const pct = Math.min(1, watchedMsRef.current / (dur * 1000));
    setWatchedPct(pct);
    if (pct >= WATCH_THRESHOLD) {
      completedRef.current = true;
      setIsComplete(true);
      markCompleteRef.current.mutate({});
    }
  }

  // Mount / destroy the YouTube IFrame player whenever the modal opens with a new resource
  useEffect(() => {
    if (!open || !resource) return;

    const videoId = getYouTubeVideoId(resource.url);
    if (!videoId) return;

    // Reset tracking for a fresh video session
    watchedMsRef.current = 0;
    playStartRef.current = null;
    durationRef.current = 0;
    completedRef.current = false;
    setActualDuration(null);
    setWatchedPct(0);
    setIsComplete(false);

    let destroyed = false;

    ensureYtApi().then(() => {
      if (destroyed || !containerRef.current) return;

      const player = new window.YT.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,        // Hide all native YouTube controls
          disablekb: 1,       // Prevent keyboard shortcuts (arrow-key seeking)
          rel: 0,
          modestbranding: 1,
          fs: 1,              // Allow fullscreen
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            const dur = e.target.getDuration();
            durationRef.current = dur;
            setActualDuration(dur);
          },
          onStateChange: (e: any) => {
            const { PlayerState } = window.YT;
            if (e.data === PlayerState.PLAYING) {
              // Mark the real-time start of this play segment
              playStartRef.current = performance.now();
            } else {
              // Pause / end / buffer — accumulate what was watched
              flushPlaytime();
              evaluateCompletion();
            }
          },
        },
      });

      // Store so we can destroy on cleanup
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

  // Update the progress bar while the video is actively playing (every 500 ms)
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (playStartRef.current === null) return;
      const tentativeMs = watchedMsRef.current + (performance.now() - playStartRef.current);
      const dur = durationRef.current;
      if (dur > 0) setWatchedPct(Math.min(1, tentativeMs / (dur * 1000)));
    }, 500);
    return () => clearInterval(id);
  }, [open]);

  function handleClose() {
    flushPlaytime();
    evaluateCompletion();
    onClose();
  }

  const displayMinutes =
    actualDuration != null
      ? Math.ceil(actualDuration / 60)
      : (resource?.estimatedMinutes ?? null);

  const isDurationEstimated =
    actualDuration == null && resource?.estimatedMinutes != null;

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

            {/* Player — YouTube IFrame API replaces this div with an iframe */}
            <div
              className="relative w-full rounded-xl overflow-hidden bg-black"
              style={{ paddingBottom: "56.25%" }}
            >
              {/* key forces div remount when a different resource is opened */}
              <div
                key={resource.id}
                ref={containerRef}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Watch-time progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Watch progress</span>
                <span
                  className={cn(
                    "font-medium",
                    isComplete ? "text-emerald-600" : "text-gray-600",
                  )}
                >
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
                <p className="text-xs text-gray-400">
                  Watch at least 80% of the video to earn points
                </p>
              )}
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {displayMinutes != null && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {displayMinutes} min
                    {isDurationEstimated && (
                      <span className="text-xs text-gray-400">est.</span>
                    )}
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
