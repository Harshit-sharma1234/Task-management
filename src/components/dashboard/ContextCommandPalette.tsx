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
      case 'rename-project':
        return 'Enter new name...';
      case 'delete-issue':
        return 'Confirm deletion? (Type "delete")';
      default:
        return 'Search...';
    }
  }, [activeContextMenu]);

  // Options filtering
  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase();
    
    if (activeContextMenu === 'status' || activeContextMenu === 'project-status') {
      return STATUS_OPTIONS.filter(s => s.label.toLowerCase().includes(q));
    }
    if (activeContextMenu === 'priority' || activeContextMenu === 'project-priority') {
      return PRIORITY_OPTIONS.filter(p => p.label.toLowerCase().includes(q));
    }
    if (activeContextMenu === 'assignee' || activeContextMenu === 'reviewer' || activeContextMenu === 'project-lead' || activeContextMenu === 'project-members') {
      return team.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    
    return [];
  }, [activeContextMenu, query, team]);

  const handleAction = async (value: any) => {
    if (isPending) return;

    startTransition(async () => {
      try {
        let res: any;
        const type = activeContextMenu;

        // TICKET ACTIONS
        if (activeTicket) {
          if (type === 'status') {
            setOptimisticTicketUpdate(activeTicket.id, { status: value });
            res = await updateIssue(activeTicket.id, { status: value });
          } else if (type === 'priority') {
            setOptimisticTicketUpdate(activeTicket.id, { priority: value });
            res = await updateIssue(activeTicket.id, { priority: value });
          } else if (type === 'assignee') {
            setOptimisticTicketUpdate(activeTicket.id, { assignee_id: value });
            res = await updateIssue(activeTicket.id, { assignee_id: value });
          } else if (type === 'reviewer') {
            setOptimisticTicketUpdate(activeTicket.id, { reviewer_id: value });
            res = await updateIssue(activeTicket.id, { reviewer_id: value });
          } else if (type === 'rename-issue') {
            setOptimisticTicketUpdate(activeTicket.id, { title: query });
            res = await updateIssue(activeTicket.id, { title: query });
          } else if (type === 'delete-issue') {
            if (query.toLowerCase() === 'delete') {
               res = await deleteIssue(activeTicket.id);
            } else {
               toast.error('Please type "delete" to confirm');
               return;
            }
          }
        }

        // PROJECT ACTIONS
        if (activeProject) {
          if (type === 'project-status') {
            setOptimisticProjectUpdate(activeProject.id, { status: value });
            res = await updateProjectStatus(activeProject.id, value);
          } else if (type === 'project-priority') {
            setOptimisticProjectUpdate(activeProject.id, { priority: value });
            res = await updateProjectPriority(activeProject.id, value);
          } else if (type === 'project-lead') {
            setOptimisticProjectUpdate(activeProject.id, { lead_id: value });
            res = await updateProjectLead(activeProject.id, value);
          } else if (type === 'project-members') {
            res = await toggleProjectMember(activeProject.id, value);
          } else if (type === 'rename-project') {
            setOptimisticProjectUpdate(activeProject.id, { project_name: query });
            res = await updateProjectName(activeProject.id, query);
          } else if (type === 'project-date' || type === 'project-date-start') {
            // Validate date format YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(query)) {
              toast.error('Invalid date format. Use YYYY-MM-DD');
              return;
            }
            if (type === 'project-date') {
              setOptimisticProjectUpdate(activeProject.id, { target_date: query });
              res = await updateProjectTargetDate(activeProject.id, query);
            } else {
              setOptimisticProjectUpdate(activeProject.id, { start_date: query });
              res = await updateProjectDueDate(activeProject.id, query);
            }
          }
        }

        if (res?.error) {
           toast.error(res.error);
           // Rollback
           if (activeTicket) clearOptimisticTicketUpdate(activeTicket.id);
           if (activeProject) clearOptimisticProjectUpdate(activeProject.id);
        } else {
           toast.success('Action applied');
           setActiveContextMenu(null);
        }
      } catch (err) {
        console.error('Command Palette Error:', err);
        toast.error('Something went wrong');
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setActiveContextMenu(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filteredOptions.length || 1)) % (filteredOptions.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeContextMenu?.startsWith('rename-') || activeContextMenu?.startsWith('project-date') || activeContextMenu === 'delete-issue') {
        handleAction(query);
      } else if (filteredOptions[selectedIndex]) {
        const opt = filteredOptions[selectedIndex];
        handleAction(opt.id || opt.value);
      }
    }
  };

  if (!activeContextMenu) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-32 bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Header / Context Badge */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="px-2 py-0.5 rounded bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
            {activeContextMenu.replace('-', ' ')}
          </div>
          {titleBadge && (
            <div className="text-[11px] font-medium text-slate-500 truncate">
              {titleBadge}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="relative flex items-center px-4 py-4">
          <Search className="absolute left-5 text-slate-400" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-1 text-base font-medium text-slate-800 placeholder:text-slate-400 border-none focus:ring-0 focus:outline-none"
          />
          {isPending && (
            <div className="flex items-center gap-2 text-indigo-600">
              <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[350px] overflow-y-auto border-t border-slate-50 p-2">
          {filteredOptions.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {filteredOptions.map((opt, idx) => {
                const isSelected = idx === selectedIndex;
                const value = opt.id || opt.value;
                
                return (
                  <button
                    key={value}
                    onClick={() => handleAction(value)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={twMerge(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                      isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {opt.dot && <div className={twMerge("w-2 h-2 rounded-full", opt.dot, isSelected && "ring-2 ring-white/50")} />}
                      {opt.avatar_url !== undefined && (
                        <div className={twMerge("w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200", isSelected && "border-white/30")}>
                          {opt.avatar_url ? (
                            <img src={opt.avatar_url} alt={opt.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className={twMerge("text-[10px] font-bold", isSelected ? "text-white" : "text-slate-500")}>
                              {opt.name.substring(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-sm font-semibold tracking-tight">{opt.name || opt.label}</span>
                      {opt.email && <span className={twMerge("text-[10px] font-medium opacity-60", isSelected ? "text-white" : "text-slate-400")}>{opt.email}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && <ArrowRight size={14} className="animate-in slide-in-from-left-2 duration-300" />}
                      {opt.shortcut && (
                        <kbd className={twMerge(
                          "px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest uppercase",
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {opt.shortcut}
                        </kbd>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            !activeContextMenu?.startsWith('rename-') && !activeContextMenu?.startsWith('project-date') && activeContextMenu !== 'delete-issue' && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Search size={32} strokeWidth={1} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">No matches found</p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm text-slate-500">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm text-slate-500">↑↓</kbd>
              <span>Navigate</span>
            </div>
          </div>
          <button 
            onClick={() => setActiveContextMenu(null)}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
          >
            Cancel [esc]
          </button>
        </div>
      </div>
    </div>
  );
}
