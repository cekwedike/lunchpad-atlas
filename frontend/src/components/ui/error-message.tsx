import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  title?: string;
  message: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorMessage({ title, message, className, onRetry }: ErrorMessageProps) {
  return (
    <div className={cn('rounded-lg border border-red-200 bg-red-50 p-4', className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && <h3 className="font-semibold text-red-900 mb-1">{title}</h3>}
          <p className="text-sm text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ErrorPage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ErrorMessage
          title="Something went wrong"
          message={message}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}
