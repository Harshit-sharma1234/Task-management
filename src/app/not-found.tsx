import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfbfb] p-8 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 rotate-12 ring-12 ring-indigo-50/30">
        <Search size={48} className="text-indigo-600 -rotate-12" />
      </div>
      
      <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tighter sm:text-5xl">
        Lost in space?
      </h1>
      <p className="text-lg text-gray-500 max-w-sm mb-12 font-medium">
        The page you are looking for doesn't exist or has been moved to another quadrant.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
        >
          Go to Dashboard
        </Link>
        
        <Link
          href="/"
          className="flex items-center gap-2 px-8 py-4 bg-white text-gray-700 font-bold border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
          Back Home
        </Link>
      </div>

      <div className="mt-24">
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
          Error Code: 404
        </div>
      </div>
    </div>
  );
}
