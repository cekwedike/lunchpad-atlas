import { useState, useEffect, useRef } from 'react';
import { X, Maximize2, ExternalLink, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function VideoPlayer({ url, title, onClose }: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'f' || e.key === 'F') {
      handleFullscreen();
    } else if (e.key === 'm' || e.key === 'M') {
      setIsMuted(!isMuted);
    }
  };

  // Enhance the embed URL with autoplay and all controls
  const enhancedUrl = url.includes('?') 
    ? `${url}&autoplay=1&rel=0&modestbranding=1&fs=1&controls=1${isMuted ? '&mute=1' : ''}`
    : `${url}?autoplay=1&rel=0&modestbranding=1&fs=1&controls=1${isMuted ? '&mute=1' : ''}`;

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div 
        ref={containerRef}
        className="bg-gradient-to-b from-slate-900 to-black rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-800/50 animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-white font-semibold text-sm sm:text-base truncate">{title}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 flex-shrink-0"
            aria-label="Close video player"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Video Container */}
        <div className="relative bg-black aspect-video">
          <iframe
            id="video-iframe"
            src={enhancedUrl}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">All video controls available in player</span>
            <span className="sm:hidden">Player controls enabled</span>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white flex-1 sm:flex-none"
            >
              <Maximize2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Fullscreen</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
            >
              <a
                href={url.split('?')[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">YouTube</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="px-3 sm:px-4 pb-3 text-xs text-slate-500">
          <span className="hidden sm:inline">Shortcuts: F (fullscreen) • M (mute) • ESC (close)</span>
        </div>
      </div>
    </div>
  );
}
