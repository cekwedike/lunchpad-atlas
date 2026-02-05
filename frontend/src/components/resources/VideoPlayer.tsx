"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  resourceId: string;
  url: string;
  onTrack: (data: { watchPercentage: number; timeSpent: number }) => void;
}

export function VideoPlayer({ resourceId, url, onTrack }: VideoPlayerProps) {
  const videoRef = useRef<HTMLIFrameElement>(null);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const startTimeRef = useRef(Date.now());
  const lastTrackRef = useRef(0);

  // Extract video ID from YouTube URL
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeVideoId(url);
  const embedUrl = videoId 
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`
    : url;

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeSpent(elapsed);

        // Track every 10 seconds
        if (elapsed - lastTrackRef.current >= 10) {
          onTrack({
            watchPercentage,
            timeSpent: elapsed,
          });
          lastTrackRef.current = elapsed;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, watchPercentage, onTrack]);

  // Listen for YouTube player events (if using YouTube)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // YouTube iframe API messages
      if (event.origin === "https://www.youtube.com") {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === "onStateChange") {
            setIsPlaying(data.info === 1); // 1 = playing
          }
          
          if (data.event === "onProgress") {
            const percentage = Math.round(data.info.currentTime / data.info.duration * 100);
            setWatchPercentage(Math.min(percentage, 100));
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Simulate progress for non-YouTube videos (fallback)
  useEffect(() => {
    if (!videoId && isPlaying) {
      const progressInterval = setInterval(() => {
        setWatchPercentage(prev => Math.min(prev + 1, 100));
      }, 3000); // Increment every 3 seconds

      return () => clearInterval(progressInterval);
    }
  }, [isPlaying, videoId]);

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Watch Progress</span>
            <span className="text-sm text-muted-foreground">{watchPercentage}% watched</span>
          </div>
          <Progress value={watchPercentage} className="h-2" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Time spent: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
            </p>
            {isPlaying && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                Playing
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Player */}
      <Card>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            ref={videoRef}
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            title="Video Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Card>

      {/* Manual Progress Controls (fallback) */}
      {!videoId && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Click play when watching to track your progress
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
