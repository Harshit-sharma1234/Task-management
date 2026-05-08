'use client';

import { useModalStore } from '@/lib/store/modal';
import { Keyboard, X } from 'lucide-react';

export function ShortcutHelpModal() {
  const { isShortcutHelpOpen, setShortcutHelpOpen } = useModalStore();

  if (!isShortcutHelpOpen) return null;

  const sections = [
    {
      title: 'Global Actions',
      shortcuts: [
        { key: 'C', label: 'Create new issue' },
        { key: '/', label: 'Focus search' },
        { key: '⌘ K', label: 'Open command palette' },
        { key: '?', label: 'Toggle shortcut help' },
        { key: 'Esc', label: 'Close modals' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { key: 'G D', label: 'Go to Dashboard' },
        { key: 'G I', label: 'Go to Inbox' },
        { key: 'G O', label: 'Overall Issues (All)' },
        { key: 'G A', label: 'Active Issues' },
        { key: 'G B', label: 'Backlog Issues' },
        { key: 'G P', label: 'Overall Projects (All)' },
        { key: 'G Y', label: 'My Projects (Assigned to You)' },
        { key: 'G M', label: 'My Tasks' },
      ],
    },
    {
      title: 'Issue/Project Actions',
      shortcuts: [
        { key: 'S', label: 'Change Status (when selected)' },
        { key: 'A', label: 'Assign To (when selected)' },
      ],
    },
    {
      title: 'Copy Utilities',
      shortcuts: [
        { key: '⌘ ⇧ ,', label: 'Copy URL' },
        { key: '⌘ ⇧ \'', label: 'Copy Title' },
        { key: '⌘ C', label: 'Copy as Markdown/Link' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={() => setShortcutHelpOpen(false)}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Keyboard Shortcuts</h2>
          </div>
          <button 
            onClick={() => setShortcutHelpOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 gap-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {section.shortcuts.map((s) => (
                  <div key={s.label} className="flex items-center justify-between group">
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                      {s.label}
                    </span>
                    <div className="flex gap-1">
                      {s.key.split(' ').map((k) => (
                        <kbd 
                          key={k}
                          className="min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-slate-500 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-center">
          <p className="text-[11px] font-medium text-slate-400 italic">
            Tip: Shortcuts are active as long as you aren't typing in an input field.
          </p>
        </div>
      </div>
    </div>
  );
}
