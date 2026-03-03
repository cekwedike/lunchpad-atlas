"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Clock, Award, ExternalLink, Lock,
  CheckCircle, CheckCircle2, Zap, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useResource, useMarkResourceComplete, useTrackEngagement } from "@/hooks/api/useResources";
import { ResourceType } from "@/types/api";
import {
  getYouTubeVideoId,
  isYouTubeUrl,
  isVimeoUrl,
  getVimeoEmbedUrl,
} from "@/lib/videoUtils";
import { cn } from "@/lib/utils";

// ── YouTube IFrame API singleton ─────────────────────────────────────────────
const YT_PLAYING = 1;

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

// ── Tracking thresholds ───────────────────────────────────────────────────────
const WATCH_THRESHOLD = 0.85;
const READ_THRESHOLD = 0.8;

function getRequiredReadMs(estimatedMinutes?: number | null): number {
  if (estimatedMinutes && estimatedMinutes > 0) {
    return Math.round(estimatedMinutes * 60 * READ_THRESHOLD) * 1000;
  }
  return 180_000; // 3 min fallback
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ResourceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const resourceId = params.id;

  const { data: resource, isLoading, error, refetch } = useResource(resourceId);
  const markCompleteMutation = useMarkResourceComplete(resourceId);
  const trackEngagement = useTrackEngagement(resourceId);

  // ── YouTube / video tracking refs ────────────────────────────────────────
  const watchedMsRef = useRef(0);
  const playStartRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const videoCompletedRef = useRef(false);
  const playerRef = useRef<any>(null);

  // ── Article / Vimeo time-based tracking refs ─────────────────────────────
  const timerStartRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const articleCompletedRef = useRef(false);
  const requiredMsRef = useRef(180_000);

  // ── Display state ─────────────────────────────────────────────────────────
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [watchedPct, setWatchedPct] = useState(0);
  const [isVideoComplete, setIsVideoComplete] = useState(false);

  const [articleStarted, setArticleStarted] = useState(false);
  const [readPct, setReadPct] = useState(0);
  const [isArticleComplete, setIsArticleComplete] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Stable refs so async callbacks always read latest hook instances
  const trackRef = useRef(trackEngagement);
  const markRef = useRef(markCompleteMutation);
  trackRef.current = trackEngagement;
  markRef.current = markCompleteMutation;

  // ── YouTube helpers ───────────────────────────────────────────────────────
  function flushPlaytime() {
    if (playStartRef.current !== null) {
      watchedMsRef.current += performance.now() - playStartRef.current;
      playStartRef.current = null;
    }
  }

  async function finishVideo() {
    if (videoCompletedRef.current) return;
    videoCompletedRef.current = true;
    setIsVideoComplete(true);
    try {
      await trackRef.current.mutateAsync({
        watchPercentage: 100,
        timeSpent: Math.round(watchedMsRef.current / 1000),
        eventType: "video_progress",
      });
    } catch { /* silent — hook handles toast */ }
    try { await markRef.current.mutateAsync({}); } catch { /* silent */ }
  }

  function evaluateVideoCompletion() {
    const dur = durationRef.current;
    if (dur <= 0 || videoCompletedRef.current) return;
    const pct = Math.min(1, watchedMsRef.current / (dur * 1000));
    setWatchedPct(pct);
    if (pct >= WATCH_THRESHOLD) void finishVideo();
  }

  // ── Article / Vimeo helpers ───────────────────────────────────────────────
  function flushArticleTime() {
    if (timerStartRef.current !== null) {
      accumulatedMsRef.current += performance.now() - timerStartRef.current;
      timerStartRef.current = null;
    }
  }

  async function finishArticle() {
    if (articleCompletedRef.current) return;
    articleCompletedRef.current = true;
    setIsArticleComplete(true);
    try {
      await trackRef.current.mutateAsync({
        scrollDepth: 100,
        timeSpent: Math.round(requiredMsRef.current / 1000),
        eventType: "time_update",
      });
    } catch { /* silent */ }
    try { await markRef.current.mutateAsync({}); } catch { /* silent */ }
  }

  function evaluateArticleCompletion(currentMs: number) {
    if (articleCompletedRef.current) return;
    const pct = Math.min(1, currentMs / requiredMsRef.current);
    setReadPct(pct);
    setElapsedSecs(Math.round(currentMs / 1000));
    if (pct >= READ_THRESHOLD) void finishArticle();
  }

  // ── Initialize tracking state when resource loads ─────────────────────────
  useEffect(() => {
    if (!resource) return;
    const alreadyDone = resource.state === "COMPLETED";

    if (resource.type === ResourceType.VIDEO) {
      videoCompletedRef.current = alreadyDone;
      watchedMsRef.current = 0;
      playStartRef.current = null;
      durationRef.current = 0;
      setWatchedPct(alreadyDone ? 1 : 0);
      setIsVideoComplete(alreadyDone);
      setActualDuration(null);

      // Vimeo: use time-based tracking; auto-start timer since player is embedded
      if (isVimeoUrl(resource.url ?? "")) {
        const required = getRequiredReadMs(resource.estimatedDuration);
        requiredMsRef.current = required;
        articleCompletedRef.current = alreadyDone;
        accumulatedMsRef.current = alreadyDone ? required : 0;
        setIsArticleComplete(alreadyDone);
        setReadPct(alreadyDone ? 1 : 0);
        setElapsedSecs(alreadyDone ? Math.round(required / 1000) : 0);
        if (!alreadyDone) {
          timerStartRef.current = performance.now();
          setArticleStarted(true);
        }
      }
    } else if (resource.type === ResourceType.ARTICLE) {
      const required = getRequiredReadMs(resource.estimatedDuration);
      requiredMsRef.current = required;
      articleCompletedRef.current = alreadyDone;
      accumulatedMsRef.current = alreadyDone ? required : 0;
      timerStartRef.current = null;
      setIsArticleComplete(alreadyDone);
      setArticleStarted(alreadyDone);
      setReadPct(alreadyDone ? 1 : 0);
      setElapsedSecs(alreadyDone ? Math.round(required / 1000) : 0);
    }

    return () => { flushArticleTime(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  // ── YouTube IFrame player setup / teardown ────────────────────────────────
  useEffect(() => {
    if (!resource || resource.type !== ResourceType.VIDEO) return;
    const videoId = getYouTubeVideoId(resource.url ?? "");
    if (!videoId) return;

    let destroyed = false;
    ensureYtApi().then(() => {
      if (destroyed || !document.getElementById(`yt-player-${resourceId}`)) return;

      const player = new window.YT.Player(`yt-player-${resourceId}`, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,   // No native controls — prevents scrubbing/skipping
          disablekb: 1,  // Disable arrow-key seeking
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
          },
          onStateChange: (e: any) => {
            if (e.data === YT_PLAYING) {
              playStartRef.current = performance.now();
            } else {
              flushPlaytime();
              evaluateVideoCompletion();
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
  }, [resource?.id, resourceId]);

  // ── YouTube: update display + check completion every 500ms ────────────────
  useEffect(() => {
    if (!resource || resource.type !== ResourceType.VIDEO || !isYouTubeUrl(resource.url ?? "")) return;
    const id = setInterval(() => {
      if (playStartRef.current === null) return;
      const tentativeMs = watchedMsRef.current + (performance.now() - playStartRef.current);
      const dur = durationRef.current;
      if (dur <= 0) return;
      const pct = Math.min(1, tentativeMs / (dur * 1000));
      setWatchedPct(pct);
      if (pct >= WATCH_THRESHOLD && !videoCompletedRef.current) {
        flushPlaytime();
        evaluateVideoCompletion();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  // ── YouTube: save progress to backend every 10s ───────────────────────────
  useEffect(() => {
    if (!resource || resource.type !== ResourceType.VIDEO || !isYouTubeUrl(resource.url ?? "")) return;
    const id = setInterval(() => {
      if (playStartRef.current === null || videoCompletedRef.current) return;
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
    }, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  // ── Article / Vimeo: update display every 500ms ───────────────────────────
  useEffect(() => {
    if (!resource) return;
    const isArticle = resource.type === ResourceType.ARTICLE;
    const isVimeo = resource.type === ResourceType.VIDEO && isVimeoUrl(resource.url ?? "");
    if (!isArticle && !isVimeo) return;
    const id = setInterval(() => {
      if (timerStartRef.current === null) return;
      const total = accumulatedMsRef.current + (performance.now() - timerStartRef.current);
      evaluateArticleCompletion(total);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  // ── Article / Vimeo: save progress every 15s ─────────────────────────────
  useEffect(() => {
    if (!resource) return;
    const isArticle = resource.type === ResourceType.ARTICLE;
    const isVimeo = resource.type === ResourceType.VIDEO && isVimeoUrl(resource.url ?? "");
    if (!isArticle && !isVimeo) return;
    const id = setInterval(() => {
      if (articleCompletedRef.current || timerStartRef.current === null) return;
      const total = accumulatedMsRef.current + (performance.now() - timerStartRef.current);
      const pctInt = Math.round(Math.min(1, total / requiredMsRef.current) * 100);
      if (pctInt > 0) {
        trackRef.current.mutate({
          ...(isArticle ? { scrollDepth: pctInt } : { watchPercentage: pctInt }),
          timeSpent: Math.round(Math.min(total, requiredMsRef.current) / 1000),
          eventType: isArticle ? "time_update" : "video_progress",
        });
      }
    }, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>Failed to load resource</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading || !resource) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (resource.state === "LOCKED") {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This resource will be available closer to the session date.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.push("/resources")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────
  const pctDisplay = Math.round(watchedPct * 100);
  const readPctDisplay = Math.round(readPct * 100);
  const requiredSecs = requiredMsRef.current / 1000;
  const remainingSecs = Math.max(0, Math.round(requiredSecs - elapsedSecs));
  const displayMinutes =
    actualDuration != null ? Math.ceil(actualDuration / 60) : (resource.estimatedDuration ?? null);

  // ── ARTICLE ───────────────────────────────────────────────────────────────
  if (resource.type === ResourceType.ARTICLE) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Button variant="ghost" onClick={() => router.push("/resources")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Button>

          <Card>
            <CardHeader>
              <div className="space-y-2">
                <CardTitle className="text-2xl">{resource.title}</CardTitle>
                {resource.isCore && (
                  <Badge variant="default" className="w-fit">Core Resource</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {resource.description && (
                <p className="text-muted-foreground">{resource.description}</p>
              )}

              <div className="flex gap-4 text-sm text-muted-foreground">
                {displayMinutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{displayMinutes} min read</span>
                  </div>
                )}
                {resource.pointsValue !== undefined && (
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    <span>{resource.pointsValue} points</span>
                  </div>
                )}
              </div>

              {/* Reading CTA / completed state */}
              {!isArticleComplete ? (
                <div className="rounded-xl border bg-gray-50 p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-100 shrink-0">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Click below to open the article in a new tab. Keep this page open while
                      you read — your progress is tracked here.
                    </p>
                  </div>

                  {!articleStarted ? (
                    <div>
                      <Button
                        className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          window.open(resource.url, "_blank", "noopener,noreferrer");
                          timerStartRef.current = performance.now();
                          setArticleStarted(true);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Start Reading
                      </Button>
                      <p className="text-xs text-center text-gray-400 mt-2">
                        Opens the article in a new tab. Come back here when done.
                      </p>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={() => {
                        window.open(resource.url, "_blank", "noopener,noreferrer");
                        if (timerStartRef.current === null) {
                          timerStartRef.current = performance.now();
                        }
                      }}
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

              {/* Reading progress bar */}
              {articleStarted && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {isArticleComplete
                        ? "Read progress"
                        : remainingSecs > 0
                        ? `Keep reading — ${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s remaining`
                        : "Almost done..."}
                    </span>
                    <span className={cn("font-medium", isArticleComplete ? "text-emerald-600" : "text-gray-600")}>
                      {readPctDisplay}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isArticleComplete ? "bg-emerald-500" : "bg-blue-500",
                      )}
                      style={{ width: `${readPctDisplay}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => router.push(`/dashboard/discussions?resourceId=${resource.id}`)}
                  variant="outline"
                  className="flex-1"
                >
                  Discuss Resource
                </Button>
                {isArticleComplete ? (
                  <Button disabled className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Completed
                  </Button>
                ) : readPctDisplay >= 80 ? (
                  <Button
                    onClick={() => void finishArticle()}
                    className="flex-1"
                    disabled={markCompleteMutation.isPending}
                  >
                    {markCompleteMutation.isPending ? "Marking..." : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── VIDEO ─────────────────────────────────────────────────────────────────
  const isYT = isYouTubeUrl(resource.url ?? "");
  const isVimeo = isVimeoUrl(resource.url ?? "");
  const vimeoEmbedUrl = isVimeo ? getVimeoEmbedUrl(resource.url ?? "") : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => router.push("/resources")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Resources
        </Button>

        <Card>
          <CardHeader>
            <div className="space-y-2">
              <CardTitle className="text-2xl">{resource.title}</CardTitle>
              {resource.isCore && (
                <Badge variant="default" className="w-fit">Core Resource</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {resource.description && (
              <p className="text-muted-foreground">{resource.description}</p>
            )}

            <div className="flex gap-4 text-sm text-muted-foreground">
              {displayMinutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{displayMinutes} min</span>
                </div>
              )}
              {resource.pointsValue !== undefined && (
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span>{resource.pointsValue} points</span>
                </div>
              )}
            </div>

            {/* Video embed */}
            {isYT ? (
              <div
                className="relative w-full rounded-xl overflow-hidden bg-black"
                style={{ paddingBottom: "56.25%" }}
              >
                {/* YT.Player targets this div by ID — do NOT use ref, player replaces element */}
                <div
                  id={`yt-player-${resourceId}`}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : isVimeo && vimeoEmbedUrl ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={vimeoEmbedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                />
              </div>
            ) : (
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  This video format is not supported for embedding.{" "}
                  <button
                    className="text-blue-600 underline"
                    onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
                  >
                    Open video
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {/* YouTube watch progress bar */}
            {isYT && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Watch progress</span>
                  <span className={cn("font-medium", isVideoComplete ? "text-emerald-600" : "text-gray-600")}>
                    {isVideoComplete ? "Completed" : `${pctDisplay}% watched`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isVideoComplete ? "bg-emerald-500" : "bg-blue-500",
                    )}
                    style={{ width: `${isVideoComplete ? 100 : pctDisplay}%` }}
                  />
                </div>
                {!isVideoComplete && (
                  <p className="text-xs text-gray-400">Watch at least 85% to earn points</p>
                )}
              </div>
            )}

            {/* Vimeo time-based progress bar */}
            {isVimeo && articleStarted && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {isArticleComplete
                      ? "Watch progress"
                      : remainingSecs > 0
                      ? `Keep watching — ${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s remaining`
                      : "Almost done..."}
                  </span>
                  <span className={cn("font-medium", isArticleComplete ? "text-emerald-600" : "text-gray-600")}>
                    {readPctDisplay}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isArticleComplete ? "bg-emerald-500" : "bg-blue-500",
                    )}
                    style={{ width: `${readPctDisplay}%` }}
                  />
                </div>
              </div>
            )}

            {/* Completed banner */}
            {(isYT && isVideoComplete) || (isVimeo && isArticleComplete) ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">Video completed!</p>
                  {resource.pointsValue && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                      <Zap className="h-3 w-3" />
                      {resource.pointsValue} points earned
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!isYT && !isVimeo && (
                <Button
                  onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Video
                </Button>
              )}

              <Button
                onClick={() => router.push(`/dashboard/discussions?resourceId=${resource.id}`)}
                variant="outline"
                className="flex-1"
              >
                Discuss Resource
              </Button>

              {/* YouTube: fallback complete button once ≥80% watched */}
              {isYT && !isVideoComplete && pctDisplay >= 80 && (
                <Button
                  onClick={() => void finishVideo()}
                  className="flex-1"
                  disabled={markCompleteMutation.isPending}
                >
                  {markCompleteMutation.isPending ? "Marking..." : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </Button>
              )}

              {/* Vimeo: complete button once ≥80% time elapsed */}
              {isVimeo && !isArticleComplete && readPctDisplay >= 80 && (
                <Button
                  onClick={() => void finishArticle()}
                  className="flex-1"
                  disabled={markCompleteMutation.isPending}
                >
                  {markCompleteMutation.isPending ? "Marking..." : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </Button>
              )}

              {/* Non-embeddable: plain mark-complete (no threshold enforcement) */}
              {!isYT && !isVimeo && (
                <Button
                  onClick={async () => {
                    try {
                      await markRef.current.mutateAsync({});
                      router.push("/resources");
                    } catch { /* hook handles toast */ }
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={markCompleteMutation.isPending}
                >
                  {markCompleteMutation.isPending ? "Marking..." : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
