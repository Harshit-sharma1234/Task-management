'use client';

import { createContext, useContext, useState, useTransition, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectTransitionContextType {
  isPending: boolean;
  startTabTransition: (url: string) => void;
  pendingTab: string | null;
}

const ProjectTransitionContext = createContext<ProjectTransitionContextType | undefined>(undefined);

export function ProjectTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const startTabTransition = (url: string) => {
    const urlObj = new URL(url, window.location.origin);
    const tabId = urlObj.searchParams.get('tab') || 'overview';
    setPendingTab(tabId);
    
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <ProjectTransitionContext.Provider value={{ isPending, startTabTransition, pendingTab }}>
      {children}
    </ProjectTransitionContext.Provider>
  );
}

export function useProjectTransition() {
  const context = useContext(ProjectTransitionContext);
  if (context === undefined) {
    throw new Error('useProjectTransition must be used within a ProjectTransitionProvider');
  }
  return context;
}
