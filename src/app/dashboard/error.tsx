'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50">
        <AlertCircle size={40} className="text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
        Something went wrong
      </h2>
      <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
        We encountered an error while loading this part of your dashboard. Our team has been notified.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <RotateCcw size={18} />
          Try again
        </button>
        
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95"
        >
          <Home size={18} />
          Back to Dashboard
        </Link>
      </div>

      {error.digest && (
        <div className="mt-12 pt-8 border-t border-gray-100 w-full max-w-xs">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Error ID: {error.digest}
          </p>
        </div>
      )}
    </div>
  );
}
