"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDebounce } from "@/hooks/useDebounce";

interface ArticleViewerProps {
  resourceId: string;
  url: string;
  onTrack: (data: { scrollDepth: number; timeSpent: number }) => void;
}

export function ArticleViewer({ resourceId, url, onTrack }: ArticleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const startTimeRef = useRef(Date.now());
  const debouncedScrollDepth = useDebounce(scrollDepth, 1000);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeSpent(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const element = containerRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      
      if (scrollHeight > 0) {
        const depth = Math.min(Math.round((scrollTop / scrollHeight) * 100), 100);
        setScrollDepth(depth);
      }
    };

    const container = containerRef.current;
    container?.addEventListener("scroll", handleScroll);
    
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  // Track engagement on scroll depth changes
  useEffect(() => {
    if (debouncedScrollDepth > 0) {
      onTrack({
        scrollDepth: debouncedScrollDepth,
        timeSpent,
      });
    }
  }, [debouncedScrollDepth, timeSpent, onTrack]);

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Reading Progress</span>
            <span className="text-sm text-muted-foreground">{scrollDepth}% scrolled</span>
          </div>
          <Progress value={scrollDepth} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Time spent: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
          </p>
        </CardContent>
      </Card>

      {/* Article Content */}
      <Card>
        <div
          ref={containerRef}
          className="overflow-y-auto h-[600px] p-6"
        >
          <iframe
            src={url}
            className="w-full h-full border-0"
            title="Article Content"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </Card>
    </div>
  );
}
