import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/lib/store/modal';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

export function useKeyboardShortcuts(workspaceSlug: string, userRole: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { 
    setCreateIssueOpen, 
    toggleShortcutHelp, 
    setCommandPaletteOpen, 
    closeAll,
    setActiveContextMenu,
  } = useModalStore();
  const sequenceBuffer = useRef<string>('');
  const sequenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  const { 
    setActiveTicket, 
    setActiveProject,
  } = useModalStore();

  // Clear active context on route change to prevent "sticky" context in command palette
  useEffect(() => {
    setActiveTicket(null);
    setActiveProject(null);
  }, [pathname, setActiveTicket, setActiveProject]);

  // Helper to get role path
  const getRolePath = (role: string) => {
    switch (role) {
      case 'Admin': return 'admin'
      case 'Project Manager': return 'project-manager'
      case 'Senior Developer': return 'senior-developer'
      case 'Junior Developer': return 'junior-developer'
      default: return 'junior-developer'
    }
  }

  // PREFETCH: Make navigation instant
  useEffect(() => {
    const rolePath = getRolePath(userRole);
    const routes = [
      'inbox', 'my-tasks', 'projects', 'team', 'issues',
      'settings', 'notifications', rolePath,
    ];
    routes.forEach(r => router.prefetch(`/dashboard/${workspaceSlug}/${r}`));
  }, [router, workspaceSlug, userRole]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Always allow Escape and Cmd+K even inside inputs
      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        closeAll();
        return;
      }

      // Cmd/Ctrl + K → Command Palette (works everywhere)
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ignore remaining shortcuts if typing in input/textarea
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle Copy Utilities (Global shortcuts)
      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey && key === ',') {
          e.preventDefault();
          navigator.clipboard.writeText(window.location.href);
          // Optional: trigger a toast here
          return;
        }
        if (e.shiftKey && key === '\'') {
          e.preventDefault();
          // Title copy would require context, we can leave this for the active item logic later
          return;
        }
        // Let normal copy (Cmd+C) pass through, we will handle custom copy later
      }

      // ── Sequence Handling ──
      
      // If we are already in a sequence, append the key
      if (sequenceBuffer.current) {
        e.preventDefault(); // Prevent default while typing a sequence
        sequenceBuffer.current += key;
        
        const seq = sequenceBuffer.current;
        console.log('Current Shortcut Sequence:', seq);
        let matched = false;

        // Navigation sequences (G + ...)
        if (seq.startsWith('g')) {
          let directPath = '';
          switch (seq) {
            case 'gd': directPath = `/dashboard/${workspaceSlug}/${getRolePath(userRole)}`; matched = true; break;
            case 'gi': directPath = `/dashboard/${workspaceSlug}/inbox`; matched = true; break;
            case 'go': directPath = `/dashboard/${workspaceSlug}/issues?filter=all`; matched = true; break;
            case 'ga': directPath = `/dashboard/${workspaceSlug}/issues?filter=active`; matched = true; break;
            case 'gb': directPath = `/dashboard/${workspaceSlug}/issues?filter=backlog`; matched = true; break;
            case 'gu': directPath = `/dashboard/${workspaceSlug}/issues?filter=urgent`; matched = true; break;
            case 'gw': directPath = `/dashboard/${workspaceSlug}/issues?filter=in_progress`; matched = true; break;
            case 'gc': directPath = `/dashboard/${workspaceSlug}/issues?filter=completed`; matched = true; break;
            case 'gm': directPath = `/dashboard/${workspaceSlug}/my-tasks`; matched = true; break;
            case 'gp': directPath = `/dashboard/${workspaceSlug}/projects`; matched = true; break;
            case 'gy': directPath = `/dashboard/${workspaceSlug}/projects?filter=assigned`; matched = true; break;
            case 'gt': directPath = `/dashboard/${workspaceSlug}/team`; matched = true; break;
            case 'gs': directPath = `/dashboard/${workspaceSlug}/settings`; matched = true; break;
            case 'gn': directPath = `/dashboard/${workspaceSlug}/notifications`; matched = true; break;
          }

          if (matched && directPath) {
            if (!workspaceSlug) {
              console.warn('KeyboardShortcut: No workspace slug available for navigation');
              return;
            }
            console.info(`KeyboardShortcut: Navigating to ${directPath}`);
            router.push(directPath);
          }
        }
        
        // Project Context Sequences (P + ...)
        if (seq.startsWith('p')) {
          const state = useModalStore.getState();
          if (state.activeProject) {
            switch (seq) {
              case 'ps': setActiveContextMenu('project-status'); matched = true; break;
              case 'pp': setActiveContextMenu('project-priority'); matched = true; break;
              case 'pl': toast.info("Project Labels coming soon"); matched = true; break;
              case 'pa': setActiveContextMenu('project-lead'); matched = true; break;
              case 'pm': setActiveContextMenu('project-members'); matched = true; break;
            }
          }
        }

        // If matched or length > 1, clear sequence
        if (matched || sequenceBuffer.current.length >= 2) {
           sequenceBuffer.current = '';
           if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
        }
        return;
      }

      // Start a sequence if 'g' or 'p' is pressed
      // (For 'p', only start sequence if no active ticket, because 'p' on a ticket means Priority)
      if (key === 'g' || (key === 'p' && !useModalStore.getState().activeTicket)) {
        e.preventDefault();
        console.log('Shortcut Sequence Started:', key);
        sequenceBuffer.current = key;
        if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
        sequenceTimeout.current = setTimeout(() => {
          console.log('Shortcut Sequence Timed Out');
          sequenceBuffer.current = ''; // Reset after 2s
        }, 2000);
        return;
      }

      // ── Action shortcuts (Single Key & Modifiers) ──
      const state = useModalStore.getState();

      // Project Context (Modifier keys)
      if (state.activeProject && e.ctrlKey && e.altKey) {
        if (key === 'd') {
          e.preventDefault();
          setActiveContextMenu('project-date');
          return;
        }
        if (key === 's') {
          e.preventDefault();
          setActiveContextMenu('project-date-start');
          return;
        }
      }

      if (state.activeProject && e.key === 'R') {
         e.preventDefault();
         setActiveContextMenu('rename-project');
         return;
      }

      // Issue Context Actions
      if (state.activeTicket) {
        // Shift modifiers for Issue (e.key will be uppercase if Shift is held OR Caps Lock is on)
        if (e.key === 'D') {
           e.preventDefault();
           setActiveContextMenu('delete-issue');
           return;
        }
        if (e.key === 'R') {
           e.preventDefault();
           setActiveContextMenu('rename-issue');
           return;
        }

        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          // Single keys
          switch (key) {
            case 's': e.preventDefault(); setActiveContextMenu('status'); return;
            case 'a': e.preventDefault(); setActiveContextMenu('assignee'); return;
            case 'p': e.preventDefault(); setActiveContextMenu('priority'); return;
            case 'r': e.preventDefault(); setActiveContextMenu('reviewer'); return;
            case 'l': e.preventDefault(); toast.info("Labels coming soon"); return;
          }
        }
      }

      switch (key) {
        case 'c':
          e.preventDefault();
          setCreateIssueOpen(true);
          break;
        case '?':
          e.preventDefault();
          toggleShortcutHelp();
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
    }
  }, [workspaceSlug, userRole, router, setCreateIssueOpen, toggleShortcutHelp, setCommandPaletteOpen, closeAll, setActiveContextMenu]);
}
