'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGlobalStore } from '@/lib/store/global';

/**
 * A Premium Linear-style top progress bar.
 * Handles both navigation changes and the initial global data sync.
 */
export function LoadingProgress() {
  const pathname = usePathname();
  const isInitialLoadComplete = useGlobalStore((state) => state.isInitialLoadComplete);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Handle Initial Data Sync
  useEffect(() => {
    if (!isInitialLoadComplete) {
      setLoading(true);
      // Simulate a gradual start for initial load
      const startTimer = setTimeout(() => setProgress(20), 50);
      const intermediateTimer = setTimeout(() => setProgress(60), 400);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(intermediateTimer);
      };
    } else {
      // Snap to finish when initial load is complete
      setProgress(100);
      const finishTimer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 400);
      return () => clearTimeout(finishTimer);
    }
  }, [isInitialLoadComplete]);

  // Handle Navigation Changes
  useEffect(() => {
    // Only trigger navigation loader if we aren't already in initial load
    if (isInitialLoadComplete) {
      setLoading(true);
      setProgress(10);
      
      const timer = setTimeout(() => {
        setProgress(100);
        const finishTimer = setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 400);
        return () => clearTimeout(finishTimer);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [pathname, isInitialLoadComplete]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div 
        className="h-full bg-linear-accent transition-all duration-500 ease-out relative overflow-hidden"
        style={{ 
          width: `${progress}%`,
          boxShadow: '0 0 12px var(--color-linear-accent)',
        }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-[shimmer_1.5s_infinite]" />
      </div>
    </div>
  );
}
