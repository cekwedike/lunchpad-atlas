import { AlertTriangle, RefreshCw } from 'lucide-react';

interface FallbackErrorProps {
  error: Error;
  resetError: () => void;
}

export function FallbackError({ error, resetError }: FallbackErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2 font-montserrat">
          Oops! Something went wrong
        </h1>
        
        <p className="text-center text-gray-600 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 font-mono break-words">
            {error.message}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={resetError}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0b0b45] text-white rounded-lg font-medium hover:bg-[#0b0b45]/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
