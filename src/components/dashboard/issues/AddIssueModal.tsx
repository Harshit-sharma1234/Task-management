'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import {
  X,
  Maximize2,
  CircleDot,
  Circle,
  CircleEllipsis,
  CheckCircle2,
  SignalHigh,
  SignalMedium,
  SignalLow,
  MoreHorizontal,
  User,
  FolderKanban,
  Paperclip,
  Loader2,
  FileIcon,
  Trash2,
  ChevronDown,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { createIssue } from '@/app/dashboard/[workspace]/issues/actions';
import { useRouter } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { useGlobalStore } from '@/lib/store/global';

interface Project {
  id: string;
  project_name?: string;
  name?: string;
}

interface User {
  id: string;
  name: string;
}

interface AddIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  users: User[];
  workspaceId: string;
}

const statusOptions = [
  { value: 'backlog', label: 'Backlog', icon: CircleDot, color: 'text-gray-400' },
  { value: 'to_do', label: 'Todo', icon: Circle, color: 'text-gray-400' },
  { value: 'in_progress', label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
  { value: 'review', label: 'Review', icon: CircleDot, color: 'text-fuchsia-400' },
  { value: 'in_review', label: 'In Review', icon: CircleDot, color: 'text-purple-500' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
  { value: 'cancelled', label: 'Cancelled', icon: X, color: 'text-red-400' },
];

const priorityOptions = [
  { value: 'no_priority', label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
  { value: 'low', label: 'Low', icon: SignalLow, color: 'text-indigo-500' },
  { value: 'medium', label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
  { value: 'high', label: 'High', icon: SignalHigh, color: 'text-red-500' },
  { value: 'urgent', label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
];

export function AddIssueModal({ isOpen, onClose, projects, users, workspaceId }: AddIssueModalProps) {
  console.log('[AddIssueModal] Rendering - Version 1.1 (Optimistic Fix)');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addIssue, removeIssue } = useGlobalStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    project_id: '',
    assignee_id: '',
    reviewer_id: '',
  });

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    console.log('[AddIssueModal] Submitting form data:', formData);

    if (!formData.title.trim()) { setError('Title is required'); setIsSubmitting(false); return; }
    if (!formData.description.trim()) { setError('Description is required'); setIsSubmitting(false); return; }
    if (!formData.status) { setError('Status is required'); setIsSubmitting(false); return; }
    if (!formData.priority) { setError('Priority is required'); setIsSubmitting(false); return; }
    if (!formData.project_id) { setError('Project is required'); setIsSubmitting(false); return; }
    if (!formData.assignee_id) { setError('Assignee is required'); setIsSubmitting(false); return; }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    data.append('workspace_id', workspaceId);

    // Append files
    selectedFiles.forEach((file) => data.append('attachments', file));

    // Instant Close & Background Process
    onClose();

    const selectedProject = projects.find((p) => p.id === formData.project_id);

    // Optimistic update: add temp issue to show instantly with project display info
    const tempId = `temp-${Date.now()}`;
    const tempIssue = {
      id: tempId,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      project_id: formData.project_id,
      projects: selectedProject ? { id: selectedProject.id, project_name: selectedProject.project_name } : undefined,
      assignee_id: formData.assignee_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: '', // Will be filled by server
      attachments: [],
      // Add other fields if needed
    };
    console.log('[AddIssueModal] Adding optimistic issue:', tempIssue);
    addIssue(tempIssue);

    startTransition(async () => {
      const promise = createIssue(data);

      toast.promise(promise, {
        loading: 'Creating your issue...',
        success: (result: any) => {
          if (result.error) throw new Error(result.error);
          // Remove temp issue and add the real one (real-time might have added it already)
          removeIssue(tempId);
          addIssue(result.data);
          console.log('[AddIssueModal] Issue created successfully:', result.data);
          return 'Issue created successfully!';
        },
        error: (err: any) => {
          // On error, remove the temp issue
          removeIssue(tempId);
          setIsSubmitting(false); // Allow retry on error
          return `Failed to create issue: ${err.message}`;
        }
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-50 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
              <FolderKanban size={16} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
              New Issue
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
            <input
              autoFocus
              type="text"
              placeholder="Issue title *"
              required
              className="bg-transparent border-none text-xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none w-full"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <textarea
              placeholder="Add description... *"
              required
              className="bg-transparent border-none text-sm text-gray-600 placeholder-gray-300 focus:outline-none w-full min-h-[100px] sm:min-h-[120px] resize-none leading-relaxed flex-1"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
              <div className="pt-4 border-t border-gray-100 mt-2">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Paperclip size={14} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Attachments</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50/50 border border-gray-100 rounded-xl p-2.5 animate-in zoom-in-95 duration-200 group/file hover:border-indigo-200 hover:bg-white transition-all">
                      <div className="w-9 h-9 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-indigo-500 group-hover/file:bg-indigo-50 group-hover/file:border-indigo-100 transition-all shadow-sm">
                        <FileIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-gray-900 truncate block">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-tight">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-wrap items-center gap-2 sm:gap-3 bg-gray-50/30 overflow-x-hidden">
            {/* Status Selector */}
            <div className="relative group flex-1 sm:flex-none min-w-[90px] sm:min-w-[100px]">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer shadow-sm w-full"
                value={formData.status}
                required
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="" disabled className="text-gray-400">Status *</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-gray-900">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                {(() => {
                  const Icon = statusOptions.find(o => o.value === formData.status)?.icon || Circle;
                  return <Icon size={14} className={statusOptions.find(o => o.value === formData.status)?.color} />;
                })()}
              </div>
            </div>

            {/* Priority Selector */}
            <div className="relative group flex-1 sm:flex-none min-w-[90px] sm:min-w-[100px]">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer shadow-sm w-full"
                value={formData.priority}
                required
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="" disabled className="text-gray-400">Priority *</option>
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-gray-900">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                {(() => {
                  const Icon = priorityOptions.find(o => o.value === formData.priority)?.icon || MoreHorizontal;
                  return <Icon size={14} className={priorityOptions.find(o => o.value === formData.priority)?.color} />;
                })()}
              </div>
            </div>

            {/* Assignee Selector */}
            <div className="relative group flex-1 sm:flex-none min-w-[110px] sm:min-w-[120px]">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer w-full shadow-sm"
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              >
                <option value="" disabled className="text-gray-400">Assignee *</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="text-gray-900">
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <User size={14} />
              </div>
            </div>

            {/* Reviewer Selector */}
            <div className="relative group flex-1 sm:flex-none min-w-[110px] sm:min-w-[120px]">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer w-full shadow-sm"
                value={formData.reviewer_id}
                onChange={(e) => setFormData({ ...formData, reviewer_id: e.target.value })}
              >
                <option value="">Reviewer (opt)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="text-gray-900" disabled={u.id === formData.assignee_id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <User size={14} className="text-fuchsia-400" />
              </div>
            </div>

            {/* Project Selector (Custom Dropdown) */}
            <div className="relative group w-full sm:w-auto sm:min-w-[180px]" ref={projectDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="flex items-center justify-between w-full bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="truncate">
                    {projects.find(p => p.id === formData.project_id)?.project_name ||
                      (projects.find(p => p.id === formData.project_id) as any)?.name ||
                      'Select project *'}
                  </span>
                </div>
                <ChevronDown size={14} className={twMerge("text-gray-400 transition-transform duration-200", isProjectDropdownOpen && "rotate-180")} />
              </button>


              {isProjectDropdownOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                    {projects.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-[11px] text-gray-400">No projects available</p>
                      </div>
                    ) : (
                      projects.map((p) => {
                        const isSelected = p.id === formData.project_id;
                        const label = p.project_name || (p as any).name || (p as any).title || 'Project';

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, project_id: p.id });
                              setIsProjectDropdownOpen(false);
                            }}
                            className={twMerge(
                              "w-full text-left px-3 py-2 text-[11px] font-bold transition-all flex items-center justify-between group",
                              isSelected
                                ? "bg-indigo-50 text-indigo-600"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                          >
                            <span className="truncate mr-2">{label}</span>
                            {isSelected && <Check size={12} className="shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedFiles(prev => [...prev, ...files]);
                  e.target.value = ''; // Reset to allow re-selecting same file
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all group/paperclip relative"
              >
                <Paperclip size={18} />
                {selectedFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {selectedFiles.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-4">
              {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <span>Create issue</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
