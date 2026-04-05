'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * A wrapper component that triggers a fade-in and slide-up animation 
 * whenever the pathname changes.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const [animationKey, setAnimationKey] = useState(pathname);

  useEffect(() => {
    setAnimationKey(pathname);
  }, [pathname]);

  return (
    <div
      key={animationKey}
      className={cn("animate-slide-up h-full w-full", className)}
    >
      {children}
    </div>
  );
}
