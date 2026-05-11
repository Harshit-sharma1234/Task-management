'use client';

import Link from 'next/link';
import { useModalStore } from '@/lib/store/modal';
import { ReactNode } from 'react';

interface ContextAwareLinkProps {
  href: string;
  className?: string;
  ticket?: any;
  project?: any;
  children: ReactNode;
}

export function ContextAwareLink({ href, className, ticket, project, children }: ContextAwareLinkProps) {
  const { setActiveTicket, setActiveProject } = useModalStore();

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={() => {
        if (ticket) {
          setActiveTicket(ticket);
          const projectData = Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects;
          setActiveProject(projectData || null);
        } else if (project) {
          setActiveProject(project);
          setActiveTicket(null);
        }
      }}
      onMouseLeave={() => {
        const state = useModalStore.getState();
        if (state.isCommandPaletteOpen || state.activeContextMenu) return;
        setActiveTicket(null);
        setActiveProject(null);
      }}
    >
      {children}
    </Link>
  );
}
