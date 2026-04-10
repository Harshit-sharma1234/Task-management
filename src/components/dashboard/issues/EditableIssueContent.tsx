'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { updateIssueContent } from '@/app/dashboard/issues/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface EditableIssueContentProps {
    ticketId: string;
    initialTitle: string;
    initialDescription: string | null;
    canEdit: boolean;
}

export function EditableIssueContent({
    ticketId,
    initialTitle,
    initialDescription,
    canEdit,
}: EditableIssueContentProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription || '');
    const [isSaving, setIsSaving] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);

    // Sync state with props when server data changes (e.g. after revalidation)
    useEffect(() => {
        if (!isEditing && !isSaving) {
            setTitle(initialTitle);
            setDescription(initialDescription || '');
        }
    }, [initialTitle, initialDescription, isEditing, isSaving]);

    // Auto-focus title when entering edit mode
    useEffect(() => {
        if (isEditing && titleRef.current) {
            titleRef.current.focus();
            titleRef.current.select();
        }
    }, [isEditing]);

    // Auto-resize textarea
    useEffect(() => {
        if (isEditing && descRef.current) {
            descRef.current.style.height = 'auto';
            descRef.current.style.height = descRef.current.scrollHeight + 'px';
        }
    }, [isEditing, description]);

    const handleSave = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            toast.error('Title is required');
            return;
        }

        // Save original values for rollback if needed
        const previousTitle = initialTitle;
        const previousDescription = initialDescription || '';

        // OPTIMISTIC UPDATE: Exit edit mode immediately
        setIsSaving(true);
        setIsEditing(false);

        const result = await updateIssueContent(ticketId, {
            title: trimmedTitle,
            description: description.trim() || null,
        });

        if (result.error) {
            toast.error(result.error);
            // ROLLBACK
            setTitle(previousTitle);
            setDescription(previousDescription);
            setIsEditing(true); // Return to edit mode so they can fix it
            setIsSaving(false);
            return;
        }

        toast.success('Issue updated successfully');
        setIsSaving(false);
        router.refresh();
    };

    const handleCancel = () => {
        setTitle(initialTitle);
        setDescription(initialDescription || '');
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
        // Ctrl/Cmd + Enter to save
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
        }
    };

    // Read-only mode
    if (!isEditing) {
        return (
            <div className={`mb-12 group/content transition-opacity duration-300 ${isSaving ? 'opacity-70' : 'opacity-100'}`}>
                <div className="flex items-start justify-between gap-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6 flex-1">
                        {title}
                        {isSaving && <Loader2 size={16} className="inline-block ml-3 animate-spin text-indigo-400" />}
                    </h1>
                    {canEdit && !isSaving && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="mt-1 p-2 rounded-lg text-gray-300 opacity-0 group-hover/content:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 shrink-0"
                            title="Edit issue"
                        >
                            <Pencil size={16} />
                        </button>
                    )}
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-6">
                    <p className="whitespace-pre-wrap">
                        {description || "No description provided."}
                    </p>
                </div>
            </div>
        );
    }

    // Edit mode
    return (
        <div className="mb-12" onKeyDown={handleKeyDown}>
            {/* Edit Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Editing Issue</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium mr-2 hidden sm:inline">
                        Ctrl+Enter to save · Esc to cancel
                    </span>
                    <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                    >
                        <X size={14} />
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !title.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check size={14} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Title Input */}
            <div className="mb-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">
                    Title
                </label>
                <input
                    ref={titleRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Issue title..."
                    className="w-full text-2xl font-bold text-gray-900 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-gray-300"
                />
            </div>

            {/* Description Textarea */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">
                    Description
                </label>
                <textarea
                    ref={descRef}
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        // Auto-resize
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    placeholder="Add a description..."
                    rows={4}
                    className="w-full text-sm text-gray-700 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all resize-none leading-relaxed placeholder:text-gray-300"
                />
            </div>
        </div>
    );
}
