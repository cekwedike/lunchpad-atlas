import { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ArticleViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function ArticleViewer({ url, title, onClose }: ArticleViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(true);

  useEffect(() => {
    // Reset states when URL changes
    setIsLoading(true);
    setError(null);
    setShowIframe(true);

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [url]);

  const handleIframeError = () => {
    setError('This article cannot be embedded due to website restrictions.');
    setShowIframe(false);
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'the source';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-black rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800/50 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-slate-900 dark:text-white font-bold text-sm sm:text-base truncate">{title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                {getDomain(url)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 flex-shrink-0"
            aria-label="Close article viewer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-950 z-10">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">Loading article...</p>
              </div>
            </div>
          )}

          {error || !showIframe ? (
            <div className="h-full flex items-center justify-center p-6 bg-white dark:bg-slate-950">
              <div className="max-w-md text-center space-y-4">
                <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    {error || 'This article cannot be displayed inline'}
                  </AlertDescription>
                </Alert>
                
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  The article is available on {getDomain(url)}. Click the button below to read it in a new tab.
                </p>
                
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Read Article on {getDomain(url)}
                  </a>
                </Button>

                <p className="text-xs text-slate-500 dark:text-slate-600">
                  Some websites don't allow embedding for security reasons
                </p>
              </div>
            </div>
          ) : (
            <iframe
              src={url}
              title={title}
              className="w-full h-full bg-white dark:bg-slate-950"
              onError={handleIframeError}
              onLoad={handleIframeLoad}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              loading="lazy"
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800/50 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="hidden sm:inline">Some articles may require authentication or have display restrictions</span>
            <span className="sm:hidden">May require authentication</span>
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 w-full sm:w-auto"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open Original</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
