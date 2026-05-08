'use client';

import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Check, ArrowRight } from 'lucide-react';
import { useModalStore } from '@/lib/store/modal';
import { useGlobalStore } from '@/lib/store/global';
import { toast } from 'sonner';
import { updateIssue, deleteIssue } from '@/app/dashboard/[workspace]/issues/actions';
import { generateIssueId, generateShortId } from '@/lib/utils/id';
import { 
  updateProjectStatus, 
  updateProjectPriority, 
  updateProjectLead,
  updateProjectName,
  updateProjectTargetDate,
  updateProjectDueDate,
  toggleProjectMember
} from '@/app/dashboard/actions';

// We'll hardcode the basic options here to keep the component self-contained,
// similar to how Linear has fixed statuses and priorities.
const PRIORITY_OPTIONS = [
  { value: 'no_priority', label: 'No priority', shortcut: '0', iconClass: 'w-4 h-0.5 bg-gray-300 rounded-full' },
  { value: 'urgent', label: 'Urgent', shortcut: '1', iconClass: 'w-1 h-3 bg-red-500 rounded-sm shadow-[4px_0_0_0_#ef4444,8px_0_0_0_#ef4444]' },
  { value: 'high', label: 'High', shortcut: '2', iconClass: 'w-1 h-2 bg-red-400 rounded-sm shadow-[4px_0_0_0_#f87171,8px_0_0_0_#f87171]' },
  { value: 'medium', label: 'Medium', shortcut: '3', iconClass: 'w-1 h-1.5 bg-yellow-400 rounded-sm shadow-[4px_0_0_0_#facc15,8px_0_0_0_#fef08a]' },
  { value: 'low', label: 'Low', shortcut: '4', iconClass: 'w-1 h-1.5 bg-indigo-400 rounded-sm shadow-[4px_0_0_0_#e0e7ff,8px_0_0_0_#e0e7ff]' },
];

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', dot: 'bg-gray-400' },
  { value: 'to_do', label: 'Todo', dot: 'bg-orange-400' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-indigo-500' },
  { value: 'review', label: 'Review', dot: 'bg-fuchsia-400' },
  { value: 'in_review', label: 'In Review', dot: 'bg-purple-500' },
  { value: 'done', label: 'Done', dot: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', dot: 'bg-red-500' },
];

export function ContextCommandPalette() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { 
    activeContextMenu, 
    setActiveContextMenu, 
    activeTicket, 
    activeProject, 
    setActiveTicket, 
    setActiveProject,
    setOptimisticTicketUpdate,
    clearOptimisticTicketUpdate,
    setOptimisticProjectUpdate,
    clearOptimisticProjectUpdate
  } = useModalStore();
  const { team, updateProject } = useGlobalStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when menu opens/closes
  useEffect(() => {
    if (activeContextMenu) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeContextMenu]);

  // Derived Title & Placeholder
  const titleBadge = useMemo(() => {
    if (activeContextMenu?.startsWith('rename-')) {
       return activeContextMenu === 'rename-issue' ? activeTicket?.title : activeProject?.project_name;
    }
    if (activeContextMenu?.startsWith('project-') && activeProject) {
      return `${generateShortId(activeProject.project_name, activeProject.id)} • ${activeProject.project_name}`;
    }
    if (activeTicket) {
      const id = generateIssueId(activeTicket.projects?.project_name || activeTicket.project_name, activeTicket.id);
      return `${id} • ${activeTicket.title}`;
    }
    return '';
  }, [activeContextMenu, activeTicket, activeProject]);

  const placeholder = useMemo(() => {
    switch (activeContextMenu) {
      case 'status':
      case 'project-status':
        return 'Set status to...';
      case 'priority':
      case 'project-priority':
        return 'Set priority to...';
      case 'assignee':
      case 'reviewer':
      case 'project-lead':
        return 'Assign to...';
      case 'project-date':
      case 'project-date-start':
        return 'Enter date (YYYY-MM-DD)...';
      case 'rename-issue':
        return 'Enter new issue title...';
      case 'rename-project':
        return 'Enter new project name...';
      case 'delete-issue':
        return 'Type "delete" to confirm...';
      case 'project-members':
        return 'Toggle member...';
      default:
        return 'Select option...';
    }
  }, [activeContextMenu]);

  // Determine list items based on active context menu
  const optionsList = useMemo(() => {
    if (activeContextMenu === 'status') return STATUS_OPTIONS;
    if (activeContextMenu === 'priority') return PRIORITY_OPTIONS;
    if (activeContextMenu === 'project-status') return STATUS_OPTIONS;
    if (activeContextMenu === 'project-priority') return PRIORITY_OPTIONS;
    if (activeContextMenu === 'assignee' || activeContextMenu === 'reviewer' || activeContextMenu === 'project-lead' || activeContextMenu === 'project-members') {
       const userOptions = team.map((u, idx) => ({
         value: u.id,
         label: u.name,
         shortcut: idx < 9 ? String(idx + 1) : undefined
       }));
       if (activeContextMenu === 'project-members') return userOptions;
       return [{ value: 'unassigned', label: 'Unassigned', shortcut: '0' }, ...userOptions];
    }
    if (activeContextMenu === 'rename-issue' || activeContextMenu === 'rename-project') {
       const type = activeContextMenu === 'rename-issue' ? 'issue' : 'project';
       const currentTitle = activeContextMenu === 'rename-issue' ? activeTicket?.title : activeProject?.project_name;
       return [
         { value: 'confirm', label: `Rename ${type} to "${query || currentTitle}"`, isRenameConfirm: true },
         { value: 'cancel', label: 'Cancel', isCancel: true }
       ];
    }
    // Delete / Date don't have static options, they use the text input directly
    return [];
  }, [activeContextMenu, team, query, activeTicket, activeProject]);

  const filteredOptions = useMemo(() => {
    if (activeContextMenu?.startsWith('rename-')) return optionsList; // Don't filter rename options
    if (!query) return optionsList;
    const q = query.toLowerCase();
    return optionsList.filter(o => o.label.toLowerCase().includes(q));
  }, [query, optionsList, activeContextMenu]);

  const handleSelect = (value: string) => {
    if (!activeContextMenu) return;

    if (value === 'cancel') {
        setActiveContextMenu(null);
        return;
    }

    const finalValue = value === 'confirm' ? query : value;
    let projectUpdates: any = {};
    let ticketUpdates: any = {};
    
    if (activeContextMenu.startsWith('project-') && activeProject) {
        if (activeContextMenu === 'project-priority') projectUpdates.priority = value;
        else if (activeContextMenu === 'project-status') projectUpdates.status = value;
        else if (activeContextMenu === 'project-lead') projectUpdates.lead_id = value === 'unassigned' ? null : value;
        else if (activeContextMenu === 'project-date') projectUpdates.start_date = value || null;
        else if (activeContextMenu === 'project-date-start') projectUpdates.start_date = value || null;
        else if (activeContextMenu === 'rename-project') projectUpdates.project_name = finalValue;
    } else if (activeTicket) {
        if (activeContextMenu === 'priority') ticketUpdates.priority = finalValue;
        else if (activeContextMenu === 'status') ticketUpdates.status = finalValue;
        else if (activeContextMenu === 'assignee') ticketUpdates.assignee_id = finalValue === 'unassigned' ? null : finalValue;
        else if (activeContextMenu === 'reviewer') ticketUpdates.reviewer_id = finalValue === 'unassigned' ? null : finalValue;
        else if (activeContextMenu === 'rename-issue') ticketUpdates.title = finalValue;
    }

    // 2. Perform optimistic updates
    const previousProjectState = activeProject ? { ...activeProject } : null;
    const previousTicketState = activeTicket ? { ...activeTicket } : null;

    if (Object.keys(projectUpdates).length > 0 && activeProject) {
        setOptimisticProjectUpdate(activeProject.id, projectUpdates);
        updateProject({ id: activeProject.id, ...projectUpdates });
        setActiveProject({ ...activeProject, ...projectUpdates });
    }
    
    if (Object.keys(ticketUpdates).length > 0 && activeTicket) {
        setOptimisticTicketUpdate(activeTicket.id, ticketUpdates);
        setActiveTicket({ ...activeTicket, ...ticketUpdates });
    }

    // Capture the context we need before closing
    const currentActiveProject = activeProject;
    const currentActiveTicket = activeTicket;
    const currentMenu = activeContextMenu;
    
    // Close palette instantly for snappy feel
    setActiveContextMenu(null);

    // 3. Execute backend update
    startTransition(async () => {
      let res;
      if (currentMenu.startsWith('project-') && currentActiveProject) {
         if (currentMenu === 'project-priority') res = await updateProjectPriority(currentActiveProject.id, value);
         else if (currentMenu === 'project-status') res = await updateProjectStatus(currentActiveProject.id, value);
         else if (currentMenu === 'project-lead') res = await updateProjectLead(currentActiveProject.id, projectUpdates.lead_id);
         else if (currentMenu === 'project-members') res = await toggleProjectMember(currentActiveProject.id, value);
         else if (currentMenu === 'project-date') res = await updateProjectDueDate(currentActiveProject.id, projectUpdates.start_date);
         else if (currentMenu === 'project-date-start') res = await updateProjectTargetDate(currentActiveProject.id, projectUpdates.start_date);
         else if (currentMenu === 'rename-project') res = await updateProjectName(currentActiveProject.id, finalValue);
      } else if (currentActiveTicket) {
         if (currentMenu === 'priority') res = await updateIssue(currentActiveTicket.id, ticketUpdates);
         else if (currentMenu === 'status') res = await updateIssue(currentActiveTicket.id, ticketUpdates);
         else if (currentMenu === 'assignee') res = await updateIssue(currentActiveTicket.id, ticketUpdates);
         else if (currentMenu === 'reviewer') res = await updateIssue(currentActiveTicket.id, ticketUpdates);
         else if (currentMenu === 'rename-issue') res = await updateIssue(currentActiveTicket.id, ticketUpdates);
         else if (currentMenu === 'delete-issue') {
           if (value.toLowerCase() === 'delete') {
              res = await deleteIssue(currentActiveTicket.id);
              if (!res?.error) {
                toast.success("Issue deleted");
                router.refresh();
                return;
              }
           } else {
             toast.error("Type 'delete' to confirm");
             setActiveContextMenu('delete-issue'); // Re-open since they typed wrong
             return; 
           }
         }
      }
      
      // 4. Handle result
      if (res?.error) {
        // Rollback optimistic update
        if (currentMenu.startsWith('project-') && previousProjectState) {
            clearOptimisticProjectUpdate(previousProjectState.id);
            updateProject(previousProjectState);
            setActiveProject(previousProjectState);
        } else if (previousTicketState) {
            clearOptimisticTicketUpdate(previousTicketState.id);
            setActiveTicket(previousTicketState);
        }
        toast.error(res.error);
      } else {
        toast.success('Updated successfully');
        router.refresh();
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeContextMenu) return;

    // Direct number shortcut (1-4, 0)
    if (/^[0-9]$/.test(e.key) && !query) {
      const shortcutMatch = filteredOptions.find(o => (o as any).shortcut === e.key);
      if (shortcutMatch) {
        e.preventDefault();
        handleSelect(shortcutMatch.value);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredOptions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredOptions.length) % filteredOptions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (optionsList.length > 0 && filteredOptions[selectedIndex]) {
          handleSelect(filteredOptions[selectedIndex].value);
        } else if (optionsList.length === 0) {
          // It's a text input mode
          if (query.trim()) handleSelect(query.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        setActiveContextMenu(null);
        break;
    }
  };

  if (!activeContextMenu) return null;

  // Determine currently selected value to show checkmark
  let currentValue = '';
  if (activeContextMenu === 'priority' && activeTicket) currentValue = activeTicket.priority;
  if (activeContextMenu === 'status' && activeTicket) currentValue = activeTicket.status;
  if (activeContextMenu === 'assignee' && activeTicket) currentValue = activeTicket.assignee_id || 'unassigned';
  if (activeContextMenu === 'reviewer' && activeTicket) currentValue = activeTicket.reviewer_id || 'unassigned';
  
  if (activeContextMenu === 'project-priority' && activeProject) currentValue = activeProject.priority;
  if (activeContextMenu === 'project-status' && activeProject) currentValue = activeProject.status;
  if (activeContextMenu === 'project-lead' && activeProject) currentValue = activeProject.lead_id || 'unassigned';

  return (
    <div className="fixed inset-0 z-[6000] flex items-start justify-center pt-[20vh] px-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={() => setActiveContextMenu(null)}
        style={{ animation: 'fade-in 0.15s ease-out' }}
      />
      <div
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden"
        style={{ animation: 'scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Top Badge */}
        {titleBadge && (
          <div className="px-5 pt-5 pb-2">
            <span className={`inline-flex items-center text-slate-900 ${activeContextMenu?.startsWith('rename-') ? 'text-sm font-semibold' : 'px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider shadow-sm border border-indigo-100/50'} truncate max-w-full`}>
              {titleBadge}
            </span>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-3 border-b border-slate-50">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-slate-900 text-base font-medium focus:outline-none focus:ring-0 placeholder-slate-300"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* List (Only if options exist) */}
        {optionsList.length > 0 && (
          <div className="py-2 max-h-[350px] overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-5 py-4 text-slate-400 text-sm font-medium">No options found.</div>
            ) : (
              <div className="px-2">
                {filteredOptions.map((opt, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isCurrent = opt.value === currentValue || (opt.value === 'to_do' && !currentValue); // fallback for undefined status
                  return (
                    <button
                      key={opt.value}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                        isSelected ? 'bg-indigo-50/80 translate-x-1' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Icon mapping */}
                        {(opt as any).isRenameConfirm || (opt as any).isCancel ? (
                          <ArrowRight size={14} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300'} shrink-0`} />
                        ) : (opt as any).iconClass ? (
                          <div className="w-4 h-4 flex items-center justify-center shrink-0">
                            <div className={(opt as any).iconClass} />
                          </div>
                        ) : (opt as any).dot ? (
                          <div className="w-4 h-4 flex items-center justify-center shrink-0">
                            <div className={`w-2.5 h-2.5 rounded-full ${(opt as any).dot} shadow-sm`} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 flex items-center justify-center">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                          </div> 
                        )}
                        <span className={`text-[13px] font-semibold ${isCurrent ? 'text-indigo-700' : isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                          {opt.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isCurrent && <Check size={14} className="text-indigo-600" />}
                        {(opt as any).shortcut && (
                          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-400 shadow-sm">
                            {(opt as any).shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
