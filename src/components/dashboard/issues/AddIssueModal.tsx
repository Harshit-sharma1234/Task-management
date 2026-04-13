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
  Trash2
} from 'lucide-react';
import { createIssue } from '@/app/dashboard/issues/actions';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
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

export function AddIssueModal({ isOpen, onClose, projects, users }: AddIssueModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    project_id: '',
    assignee_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    
    // Append files
    selectedFiles.forEach((file) => data.append('attachments', file));

    try {
      const result = await createIssue(data);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        onClose();
        
        // Use transition for revalidation to ensure other parts of the UI update smoothly
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <FolderKanban size={14} className="text-indigo-600" />
            <span>New Issue</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <Maximize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 flex flex-col gap-4">
            <input
              autoFocus
              type="text"
              placeholder="Issue title"
              required
              className="bg-transparent border-none text-xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none w-full"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <textarea
              placeholder="Add description... *"
              required
              className="bg-transparent border-none text-sm text-gray-600 placeholder-gray-300 focus:outline-none w-full min-h-[120px] resize-none leading-relaxed"
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
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center gap-3 bg-gray-50/30">
            {/* Status Selector */}
            <div className="relative group">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer shadow-sm"
                value={formData.status}
                required
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="" disabled className="text-gray-400">Select status</option>
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
            <div className="relative group">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer shadow-sm"
                value={formData.priority}
                required
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="" disabled className="text-gray-400">Select priority</option>
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
            <div className="relative group min-w-[120px]">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer w-full shadow-sm"
                value={formData.assignee_id}
                required
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              >
                <option value="" disabled className="text-gray-400">Select assignee</option>
                <option value="" className="text-gray-900">Unassigned</option>
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

            {/* Project Selector */}
            <div className="relative group min-w-[150px]">
              <select
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer w-full shadow-sm"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                required
              >
                <option value="" disabled className="text-gray-400">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="text-gray-900">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
              </div>
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
