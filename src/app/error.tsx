'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Root App Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfbfb] p-8 text-center animate-in fade-in duration-500 font-sans">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50">
        <AlertCircle size={40} className="text-red-500" />
      </div>
      
      <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
        Something went wrong
      </h2>
      <p className="text-slate-500 max-w-md mb-8 leading-relaxed font-medium">
        We encountered a critical error while loading this page. Our team has been notified.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <RotateCcw size={18} />
          Try again
        </button>
      </div>

      {error.digest && (
        <div className="mt-12 pt-8 border-t border-slate-200 w-full max-w-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Error ID: {error.digest}
          </p>
        </div>
      )}
    </div>
  );
}
