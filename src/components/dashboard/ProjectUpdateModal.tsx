'use client';

import { X, Trash2, Paperclip, Send, Activity, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ProjectUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPost: (content: string, status: string) => void;
    projectName: string;
}

export function ProjectUpdateModal({ isOpen, onClose, onPost, projectName }: ProjectUpdateModalProps) {
    const [content, setContent] = useState('');
    const [status, setStatus] = useState('on_track');
    const modalRef = useRef<HTMLDivElement>(null);

    // Click outside logic
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all p-4">
            <div 
                ref={modalRef}
                className="w-full max-w-2xl bg-[#1c1c1f] rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-[#2e2e32] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 pb-0">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#1c2b21] border border-[#223d2a] text-[#4ade80] hover:bg-[#223d2a] transition-colors group">
                            <Activity size={14} className="stroke-[3px]" />
                            <span className="text-[11px] font-bold tracking-tight uppercase">On track</span>
                            <ChevronDown size={12} className="text-[#4ade80]/50 group-hover:text-[#4ade80]" />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 p-6 pt-2">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write a project update..."
                        className="w-full h-48 bg-transparent border-none outline-none text-gray-200 placeholder:text-gray-600 resize-none text-[17px] leading-relaxed font-sans"
                        autoFocus
                    />
                </div>

                {/* Footer */}
                <div className="p-4 pt-2 border-t border-[#2e2e32]/30 flex items-center justify-between">
                    <button className="p-2 rounded-lg hover:bg-[#2e2e32] text-gray-500 hover:text-gray-300 transition-all">
                        <Paperclip size={18} />
                    </button>
                    
                    <button 
                        onClick={() => {
                            onPost(content, status);
                            onClose();
                        }}
                        disabled={!content.trim()}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                            content.trim() 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20 active:scale-[0.98]' 
                            : 'bg-[#2e2e32] text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Post update
                    </button>
                </div>
            </div>
        </div>
    );
}
