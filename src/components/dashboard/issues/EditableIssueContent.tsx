'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Pencil, Check, X, Loader2, Paperclip, FileIcon, Trash2, Download, PlusCircle } from 'lucide-react';
import { updateIssueContent } from '@/app/dashboard/[workspace]/issues/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Attachment {
    name: string;
    url: string;
    type: string;
    size: number;
    isOptimistic?: boolean;
}

interface EditableIssueContentProps {
    ticketId: string;
    initialTitle: string;
    initialDescription: string | null;
    initialAttachments: Attachment[];
    canEdit: boolean;
}

export function EditableIssueContent({
    ticketId,
    initialTitle,
    initialDescription,
    initialAttachments = [],
    canEdit,
}: EditableIssueContentProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription || '');
    const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const titleRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state with props when server data changes (e.g. after revalidation)
    useEffect(() => {
        if (!isEditing && !isSaving && !isPending) {
            setTitle(initialTitle);
            setDescription(initialDescription || '');
            setAttachments(initialAttachments);
            setNewFiles([]);
        }
    }, [initialTitle, initialDescription, initialAttachments, isEditing, isSaving, isPending]);

    // Auto-focus title when entering edit mode
    useEffect(() => {
        if (isEditing && titleRef.current) {
            titleRef.current.focus();
            titleRef.current.select();
        }
    }, [isEditing]);

    // Listen for header-triggered edit
    useEffect(() => {
        const handler = () => {
            setIsEditing(true);
            // Scroll to top if needed
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        window.addEventListener('trigger-issue-edit', handler);
        return () => window.removeEventListener('trigger-issue-edit', handler);
    }, []);

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
        const previousAttachments = initialAttachments;

        // HYPER-FAST OPTIMISTIC UI: 
        // 1. Create temporary previews for new files
        const optimisticNewAttachments = newFiles.map(file => ({
            name: file.name,
            url: URL.createObjectURL(file), // Local blob URL
            type: file.type,
            size: file.size,
            isOptimistic: true
        }));

        // 2. Combine with filtered existing attachments
        const optimisticTotalAttachments = [...attachments, ...optimisticNewAttachments];

        // 3. Update state and exit edit mode INSTANTLY
        setAttachments(optimisticTotalAttachments);
        setIsSaving(true);
        setIsEditing(false);

        const formData = new FormData();
        formData.append('id', ticketId);
        formData.append('title', trimmedTitle);
        formData.append('description', description.trim() || '');
        formData.append('existingAttachments', JSON.stringify(attachments)); // What we chose to keep
        newFiles.forEach(file => formData.append('attachments', file));

        // Start server action
        const result = await updateIssueContent(formData);

        if (result.error) {
            toast.error(result.error);
            // ROLLBACK
            setTitle(previousTitle);
            setDescription(previousDescription);
            setAttachments(previousAttachments);
            setIsEditing(true);
            setIsSaving(false);
            return;
        }

        // Update with actual server records (replaces blob URLs with real URLs)
        if (result.data) {
            setTitle(result.data.title);
            setDescription(result.data.description || '');
            setAttachments(result.data.attachments || []);
        }

        toast.success('Issue updated successfully');
        setIsSaving(false);
        setNewFiles([]);

        // Clean up blob URLs
        optimisticNewAttachments.forEach(a => URL.revokeObjectURL(a.url));

        startTransition(() => {
            router.refresh();
        });
    };

    const handleCancel = () => {
        setTitle(initialTitle);
        setDescription(initialDescription || '');
        setAttachments(initialAttachments);
        setNewFiles([]);
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

    const removeExistingAttachment = (url: string) => {
        setAttachments(prev => prev.filter(a => a.url !== url));
    };

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
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
                            className="mt-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all duration-200 shrink-0 font-bold text-xs shadow-sm shadow-indigo-100/50"
                            title="Edit issue"
                        >
                            <Pencil size={14} />
                            <span>Edit</span>
                        </button>
                    )}
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-6">
                    <p className="whitespace-pre-wrap">
                        {description || "No description provided."}
                    </p>
                </div>

                {/* Attachments Section (Integrated for Optimistic UI) */}
                {attachments.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-100/60">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Paperclip size={14} className={isSaving ? "text-indigo-400 animate-pulse" : "text-gray-400"} />
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                                Attachments ({attachments.length})
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {attachments.map((file, idx) => (
                                <div key={file.url} className="group/attach-item relative bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all active:scale-[0.98]">
                                    <a
                                        href={file.isOptimistic ? undefined : file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => file.isOptimistic && e.preventDefault()}
                                        className={`flex items-center gap-3 p-3 w-full ${file.isOptimistic ? 'cursor-wait opacity-70' : ''
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-sm border ${file.isOptimistic
                                                ? 'bg-white border-indigo-200 text-indigo-400'
                                                : 'bg-white border-gray-100 text-indigo-500 group-hover/attachment:bg-indigo-50 group-hover/attachment:border-indigo-100'
                                            }`}>
                                            {file.isOptimistic ? <Loader2 size={18} className="animate-spin" /> : <FileIcon size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold truncate transition-colors ${file.isOptimistic ? 'text-indigo-400' : 'text-gray-900 group-hover/attachment:text-indigo-600'
                                                }`}>
                                                {file.name}
                                            </div>
                                            <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                                {file.isOptimistic ? (
                                                    <span className="text-indigo-500 animate-pulse">Uploading...</span>
                                                ) : (
                                                    <>
                                                        <span className="bg-gray-100 px-1 rounded text-gray-500">
                                                            {file.type ? file.type.split('/')[1]?.toUpperCase() : 'FILE'}
                                                        </span>
                                                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </a>

                                    {/* Download Button */}
                                    {!file.isOptimistic && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                // Open with download hint
                                                window.open(file.url + '?download=true', '_blank');
                                                // Force download attempt
                                                const link = document.createElement('a');
                                                link.href = file.url;
                                                link.download = file.name;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover/attach-item:opacity-100 transition-all z-10"
                                            title="Download file"
                                        >
                                            <Download size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
            <div className="mb-6">
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

            {/* Attachments Management */}
            <div className="space-y-4 pt-6 border-t border-gray-100 bg-gray-50/30 -mx-4 px-4 py-6 rounded-b-xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Paperclip size={14} className="text-gray-400" />
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] pl-0.5">
                            Attachments
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 rounded-lg transition-all shadow-sm active:scale-95"
                    >
                        <PlusCircle size={14} />
                        Add Files
                    </button>
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setNewFiles(prev => [...prev, ...files]);
                            e.target.value = '';
                        }}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Existing Attachments */}
                    {attachments.map((file, idx) => (
                        <div key={file.url} className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-100 rounded-lg group/file">
                            <div className="w-8 h-8 bg-white border border-gray-100 rounded-md flex items-center justify-center text-indigo-500">
                                <FileIcon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-gray-900 truncate">{file.name}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase">Existing</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeExistingAttachment(file.url)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}

                    {/* New Files */}
                    {newFiles.map((file, idx) => (
                        <div key={`new-${idx}`} className="flex items-center gap-3 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg group/file animate-in zoom-in-95 duration-200">
                            <div className="w-8 h-8 bg-white border border-indigo-100 rounded-md flex items-center justify-center text-indigo-500">
                                <FileIcon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-indigo-900 truncate">{file.name}</div>
                                <div className="text-[9px] text-indigo-400 font-bold uppercase">New</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeNewFile(idx)}
                                className="p-1.5 text-indigo-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}

                    {attachments.length === 0 && newFiles.length === 0 && (
                        <div className="col-span-full py-4 text-center border-2 border-dashed border-gray-100 rounded-xl">
                            <span className="text-[11px] text-gray-400 font-medium">No attachments yet</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
