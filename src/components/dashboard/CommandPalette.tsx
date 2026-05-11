'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useModalStore } from '@/lib/store/modal';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Layout, 
  CircleDot, 
  Users, 
  Inbox, 
  FolderKanban, 
  Settings, 
  Plus, 
  Keyboard,
  ListTodo,
  CornerDownLeft,
  Bell,
  LogOut,
  Building2,
  FileText,
  Search as SearchIcon,
  Command as CommandIcon,
  Link as LinkIcon,
  Copy as CopyIcon,
  Edit2 as EditIcon,
  UserPlus as UserPlusIcon
} from 'lucide-react';

import { toast } from 'sonner';

interface CommandAction {
  id: string;
  title: string;
  icon: React.ElementType;
  shortcut?: string;
  group: string;
  path?: string;
  action?: string;
}

const COMMANDS: CommandAction[] = [
  // Navigation
  { id: 'nav-dashboard', title: 'Go to Dashboard', icon: Layout, shortcut: 'G D', group: 'Navigation', path: '/dashboard/[ws]/[role]' },
  { id: 'nav-inbox', title: 'Go to Inbox', icon: Inbox, shortcut: 'G I', group: 'Navigation', path: '/dashboard/[ws]/inbox' },
  { id: 'nav-issues', title: 'Overall Issues (All)', icon: CircleDot, shortcut: 'G O', group: 'Navigation', path: '/dashboard/[ws]/issues' },
  { id: 'nav-my-tasks', title: 'My Tasks', icon: ListTodo, shortcut: 'G M', group: 'Navigation', path: '/dashboard/[ws]/my-tasks' },
  { id: 'nav-projects', title: 'Overall Projects (All)', icon: FolderKanban, shortcut: 'G P', group: 'Navigation', path: '/dashboard/[ws]/projects' },
  { id: 'nav-team', title: 'Team', icon: Users, shortcut: 'G T', group: 'Navigation', path: '/dashboard/[ws]/team' },
  { id: 'nav-settings', title: 'Settings', icon: Settings, shortcut: 'G S', group: 'Navigation', path: '/dashboard/[ws]/settings' },
  { id: 'nav-notifications', title: 'Notifications', icon: Bell, shortcut: 'G N', group: 'Navigation', path: '/dashboard/[ws]/notifications' },
  
  // Views
  { id: 'view-active-issues', title: 'Active Issues', icon: CircleDot, shortcut: 'G A', group: 'Views', path: '/dashboard/[ws]/issues?filter=active' },
  { id: 'view-backlog-issues', title: 'Backlog Issues', icon: CircleDot, shortcut: 'G B', group: 'Views', path: '/dashboard/[ws]/issues?filter=backlog' },
  { id: 'view-urgent-issues', title: 'My Urgent Issues', icon: CircleDot, shortcut: 'G U', group: 'Views', path: '/dashboard/[ws]/issues?filter=urgent' },
  { id: 'view-in-progress-issues', title: 'My Working Issues (In Progress)', icon: CircleDot, shortcut: 'G W', group: 'Views', path: '/dashboard/[ws]/issues?filter=in_progress' },
  { id: 'view-completed-issues', title: 'My Completed Issues', icon: CircleDot, shortcut: 'G C', group: 'Views', path: '/dashboard/[ws]/issues?filter=completed' },
  { id: 'view-my-projects', title: 'My Projects (Assigned to You)', icon: FolderKanban, shortcut: 'G Y', group: 'Views', path: '/dashboard/[ws]/projects?filter=assigned' },
  // Actions
  { id: 'action-create', title: 'Create New Issue', icon: Plus, shortcut: 'C', group: 'Actions', action: 'create-issue' },
  { id: 'action-search', title: 'Focus Search Bar', icon: SearchIcon, shortcut: '/', group: 'Actions', action: 'focus-search' },
  { id: 'action-shortcuts', title: 'View Keyboard Shortcuts', icon: Keyboard, shortcut: '?', group: 'Actions', action: 'show-help' },
  { id: 'action-palette', title: 'Open Command Palette', icon: CommandIcon, shortcut: '⌘K', group: 'Actions', action: 'palette' },
  { id: 'account-workspace', title: 'Switch Workspace', icon: Building2, group: 'Account', path: '/workspace' },
  { id: 'account-logout', title: 'Sign Out', icon: LogOut, group: 'Account', action: 'logout' },
];

export function CommandPalette({ workspaceSlug, userRole }: { workspaceSlug: string; userRole?: string }) {
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    setCreateIssueOpen, 
    toggleShortcutHelp,
    activeTicket,
    activeProject,
    setActiveContextMenu,
  } = useModalStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const getRolePath = (role: string) => {
    switch (role) {
      case 'Admin': return 'admin';
      case 'Project Manager': return 'project-manager';
      case 'Senior Developer': return 'senior-developer';
      case 'Junior Developer': return 'junior-developer';
      default: return 'junior-developer';
    }
  };

  const dynamicCommands = useMemo(() => {
    const cmds = [...COMMANDS];
    
    if (activeTicket) {
      cmds.unshift(
        { id: 'context-status', title: 'Change issue status...', icon: CircleDot, shortcut: 'S', group: 'Issue Actions', action: 'change-status' },
        { id: 'context-assignee', title: 'Assign issue to...', icon: UserPlusIcon, shortcut: 'A', group: 'Issue Actions', action: 'change-assignee' },
        { id: 'context-priority', title: 'Change issue priority...', icon: EditIcon, shortcut: 'P', group: 'Issue Actions', action: 'change-priority' },
        { id: 'context-reviewer', title: 'Request review from...', icon: UserPlusIcon, shortcut: 'R', group: 'Issue Actions', action: 'change-reviewer' },
        { id: 'context-copy-url', title: 'Copy issue URL', icon: LinkIcon, shortcut: '⌘ ⇧ ,', group: 'Issue Actions', action: 'copy-url' },
        { id: 'context-copy-title', title: 'Copy issue title', icon: CopyIcon, shortcut: '⌘ ⇧ \'', group: 'Issue Actions', action: 'copy-title' },
        { id: 'context-copy-md', title: 'Copy as Markdown', icon: FileText, shortcut: '⌘ C', group: 'Issue Actions', action: 'copy-md' },
        { id: 'context-rename', title: 'Rename issue...', icon: EditIcon, shortcut: '⇧ R', group: 'Issue Actions', action: 'rename-issue' },
        { id: 'context-delete', title: 'Delete issue...', icon: EditIcon, shortcut: '⇧ D', group: 'Issue Actions', action: 'delete-issue' }
      );
    } else if (activeProject) {
      cmds.unshift(
        { id: 'proj-status', title: 'Change project status...', icon: CircleDot, shortcut: 'P S', group: 'Project Actions', action: 'project-status' },
        { id: 'proj-priority', title: 'Change project priority...', icon: EditIcon, shortcut: 'P P', group: 'Project Actions', action: 'project-priority' },
        { id: 'proj-lead', title: 'Set project lead...', icon: UserPlusIcon, shortcut: 'P A', group: 'Project Actions', action: 'project-lead' },
        { id: 'proj-members', title: 'Change project members...', icon: Users, shortcut: 'P M', group: 'Project Actions', action: 'project-members' },
        { id: 'proj-date-start', title: 'Set start date...', icon: EditIcon, shortcut: '⌃ ⌥ S', group: 'Project Actions', action: 'project-date-start' },
        { id: 'proj-date', title: 'Set target date...', icon: EditIcon, shortcut: '⌃ ⌥ D', group: 'Project Actions', action: 'project-date' },
        { id: 'proj-rename', title: 'Rename project...', icon: EditIcon, shortcut: '⇧ R', group: 'Project Actions', action: 'rename-project' }
      );
    }

    return cmds;
  }, [activeTicket, activeProject]);

  const filtered = useMemo(() => {
    if (!query.trim()) return dynamicCommands;
    const q = query.toLowerCase();
    return dynamicCommands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q)
    );
  }, [query, dynamicCommands]);

  // Group the filtered commands
  const grouped = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    filtered.forEach(cmd => {
      const existing = map.get(cmd.group) || [];
      existing.push(cmd);
      map.set(cmd.group, existing);
    });
    return map;
  }, [filtered]);

  // Flat list for keyboard nav
  const flatList = useMemo(() => {
    const items: CommandAction[] = [];
    grouped.forEach(cmds => items.push(...cmds));
    return items;
  }, [grouped]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = (action: CommandAction) => {
    // The actions are now conditional, so we don't strictly need the toast here, but we can keep the helper
    const requireTicket = () => {
      if (!activeTicket) return false;
      return true;
    };
    
    const requireProject = () => {
      if (!activeProject) return false;
      return true;
    };

    if (action.path) {
      const resolvedPath = action.path
        .replace('[ws]', workspaceSlug)
        .replace('[role]', getRolePath(userRole || ''));
      router.push(resolvedPath);
    } else if (action.action === 'create-issue') {
      setCreateIssueOpen(true);
    } else if (action.action === 'show-help') {
      toggleShortcutHelp();
    } else if (action.action === 'focus-search') {
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    } else if (action.action === 'logout') {
      router.push('/auth/logout');
    } else if (action.action === 'change-status') {
      if (requireTicket()) setActiveContextMenu('status');
    } else if (action.action === 'change-assignee') {
      if (requireTicket()) setActiveContextMenu('assignee');
    } else if (action.action === 'change-priority') {
      if (requireTicket()) setActiveContextMenu('priority');
    } else if (action.action === 'change-reviewer') {
      if (requireTicket()) setActiveContextMenu('reviewer');
    } else if (action.action === 'project-status') {
      if (requireProject()) setActiveContextMenu('project-status');
    } else if (action.action === 'project-priority') {
      if (requireProject()) setActiveContextMenu('project-priority');
    } else if (action.action === 'project-lead') {
      if (requireProject()) setActiveContextMenu('project-lead');
    } else if (action.action === 'project-date') {
      if (requireProject()) setActiveContextMenu('project-date');
    } else if (action.action === 'project-date-start') {
      if (requireProject()) setActiveContextMenu('project-date-start');
    } else if (action.action === 'rename-issue') {
      if (requireTicket()) setActiveContextMenu('rename-issue');
    } else if (action.action === 'rename-project') {
      if (requireProject()) setActiveContextMenu('rename-project');
    } else if (action.action === 'delete-issue') {
      if (requireTicket()) setActiveContextMenu('delete-issue');
    } else if (action.action === 'project-members') {
      if (requireProject()) setActiveContextMenu('project-members');
    } else if (action.action === 'copy-url') {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Copied to clipboard");
    } else if (action.action === 'copy-title') {
      if (requireTicket()) {
        navigator.clipboard.writeText(`Issue ${activeTicket?.id}`);
        toast.success("Copied to clipboard");
      }
    } else if (action.action === 'copy-md') {
      if (requireTicket()) {
        navigator.clipboard.writeText(`[Issue ${activeTicket?.id}](${window.location.href})`);
        toast.success("Copied to clipboard");
      }
    } else if (action.action === 'palette') {
      // Already open, do nothing
    }
    
    // Auto-close on selection unless it triggers another menu
    if (!action.action?.startsWith('change-') && !action.action?.startsWith('project-') && !action.action?.startsWith('rename-') && !action.action?.startsWith('delete-')) {
      setCommandPaletteOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % flatList.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + flatList.length) % flatList.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (flatList[selectedIndex]) handleSelect(flatList[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setCommandPaletteOpen(false);
        break;
    }
  };

  if (!isCommandPaletteOpen) return null;

  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-[5000] flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
        onClick={() => setCommandPaletteOpen(false)}
        style={{ animation: 'fade-in 0.15s ease-out' }}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-[0_16px_70px_-12px_rgba(0,0,0,0.35)] border border-linear-border overflow-hidden"
        style={{ animation: 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 border-b border-linear-border">
          <Search className="w-[18px] h-[18px] text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            className="w-full py-3.5 bg-transparent border-none focus:outline-none text-[14px] text-linear-text font-medium placeholder-slate-400"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto custom-scrollbar py-1.5">
          {/* Context Indicator */}
          {(activeTicket || activeProject) && !query && (
            <div className="px-5 pt-2 pb-1 text-[12px] font-semibold text-slate-400 flex items-center gap-1.5">
              {activeTicket ? (
                <>Issue <span className="text-slate-300">•</span> <span className="text-slate-500 font-medium">{activeTicket.title || `Issue ${activeTicket.id}`}</span></>
              ) : activeProject ? (
                <>Project <span className="text-slate-300">•</span> <span className="text-slate-500 font-medium">{activeProject.project_name}</span></>
              ) : null}
            </div>
          )}

          {flatList.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px] font-medium text-slate-400">No results found.</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, commands]) => (
              <div key={group}>
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{group}</span>
                </div>
                {commands.map((cmd) => {
                  globalIdx++;
                  const isSelected = globalIdx === selectedIndex;
                  const Icon = cmd.icon;
                  const idx = globalIdx;

                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 mx-1.5 rounded-lg text-left transition-colors duration-100 ${
                        isSelected
                          ? 'bg-linear-accent text-white'
                          : 'text-linear-text hover:bg-slate-50'
                      }`}
                      style={{ width: 'calc(100% - 12px)' }}
                      onClick={() => handleSelect(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white/80' : 'text-slate-400'}`} />
                        <span className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : ''}`}>
                          {cmd.title}
                        </span>
                      </div>
                      {cmd.shortcut && (
                        <kbd className={`shrink-0 min-w-[22px] h-[22px] flex items-center justify-center rounded-md px-1.5 text-[11px] font-semibold leading-none ${
                          isSelected
                            ? 'bg-white/20 text-white/90 border border-white/10'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-linear-border flex items-center gap-5 text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold">↑</kbd>
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold">↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="w-3 h-3" />
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
