'use client';

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useModalStore } from '@/lib/store/modal';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import { CommandPalette } from './CommandPalette';
import { ContextCommandPalette } from './ContextCommandPalette';
import dynamic from 'next/dynamic';
import { useGlobalStore } from '@/lib/store/global';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

interface GlobalShortcutManagerProps {
  workspaceSlug: string;
  workspaceId: string;
  userRole: string;
}

export function GlobalShortcutManager({ workspaceSlug, workspaceId, userRole }: GlobalShortcutManagerProps) {
  // Initialize keyboard listeners
  useKeyboardShortcuts(workspaceSlug, userRole);
  
  const { isCreateIssueOpen, setCreateIssueOpen } = useModalStore();
  const { projects, team } = useGlobalStore();

  // AddIssueModal expects simple lists for selection
  const users = team.map(u => ({
    id: u.id,
    name: u.name,
    avatar_url: u.avatar_url,
  }));

  const projectList = projects.map(p => ({
    id: p.id,
    name: p.project_name,
  }));

  return (
    <>
      <ShortcutHelpModal />
      <CommandPalette workspaceSlug={workspaceSlug} userRole={userRole} />
      <ContextCommandPalette />
      {isCreateIssueOpen && (
        <AddIssueModal
          isOpen={isCreateIssueOpen}
          onClose={() => setCreateIssueOpen(false)}
          projects={projectList}
          users={users}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
}
