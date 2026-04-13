'use client';

import { Inter } from 'next/font/google';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import '../app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfbfb] p-8 text-center font-sans tracking-tight">
          <div className="w-24 h-24 bg-red-100 rounded-2xl flex items-center justify-center mb-8 rotate-3 shadow-sm border border-red-200">
            <AlertTriangle size={48} className="text-red-600" />
          </div>
          
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tighter">
            Critical System Error
          </h1>
          <p className="text-slate-500 max-w-lg mb-10 text-lg leading-relaxed">
            A fatal error occurred within the application core. 
            The system could not recover the current view.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
            >
              <RotateCcw size={18} />
              Reboot App
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-8 py-3.5 bg-white text-slate-700 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Home size={18} />
              Return Home
            </a>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-200 w-full max-w-2xl px-6">
             <div className="bg-slate-50 p-4 rounded-lg font-mono text-left overflow-x-auto border border-slate-200 shadow-inner">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest flex items-center justify-between">
                    <span>Stack Trace</span>
                    {error.digest && <span className="text-slate-400">ID: {error.digest}</span>}
                </p>
                <p className="text-[11px] text-red-500 whitespace-pre-wrap break-all leading-relaxed">
                    {error.message || 'Unknown catastrophic failure.'}
                </p>
             </div>
          </div>
        </div>
      </body>
    </html>
  );
}
