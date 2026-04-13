'use client';

import {
    X,
    ArrowUpRight,
    Trash2,
    MoreHorizontal,
    CheckCircle2,
    CircleDot,
    SignalHigh,
    User,
    Loader2
} from 'lucide-react';
import { useState } from 'react';
import { bulkUpdateIssues, bulkDeleteIssues } from '@/app/dashboard/issues/actions';
import { toast } from 'sonner';

interface BulkActionToolbarProps {
    selectedIds: string[];
    onClear: () => void;
    totalTickets: number;
    currentUser?: any;
    onOptimisticDelete?: (ids: string[]) => void;
}

export function BulkActionToolbar({ selectedIds, onClear, totalTickets, currentUser, onOptimisticDelete }: BulkActionToolbarProps) {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [showMoreActions, setShowMoreActions] = useState(false);

    const role = currentUser?.roles?.role_name;
    const canBulkAction = role === 'Admin' || role === 'Project Manager';

    if (selectedIds.length === 0) return null;

    const handleBulkStatusUpdate = async (status: string, actionKey: string = 'status') => {
        setLoadingAction(actionKey);
        const result = await bulkUpdateIssues(selectedIds, { status });

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Updated ${result.updatedCount || selectedIds.length} issues`);
        }

        setLoadingAction(null);
        onClear();
    };

    const handleBulkPriorityUpdate = async (priority: string) => {
        setLoadingAction('priority');
        const result = await bulkUpdateIssues(selectedIds, { priority });

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Priority updated for ${result.updatedCount || selectedIds.length} issues`);
        }

        setLoadingAction(null);
        onClear();
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} issues? This action cannot be undone.`)) {
            return;
        }

        setLoadingAction('delete');
        // Optimistically remove from UI
        if (onOptimisticDelete) {
            onOptimisticDelete(selectedIds);
        }
        
        const result = await bulkDeleteIssues(selectedIds);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Deleted ${result.deletedCount || selectedIds.length} issues`);
        }

        setLoadingAction(null);
        onClear();
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gray-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 border border-gray-800 backdrop-blur-md bg-opacity-90">
                <div className="flex items-center gap-2 border-r border-gray-700 pr-4 mr-2">
                    <span className="bg-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-center min-w-[18px]">
                        {selectedIds.length}
                    </span>
                    <span className="text-xs font-medium text-gray-300">selected</span>
                    <button
                        onClick={onClear}
                        className="p-1 hover:bg-gray-800 rounded-full transition-colors ml-1"
                    >
                        <X size={12} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        disabled={!!loadingAction}
                        onClick={() => handleBulkStatusUpdate('backlog', 'backlog')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-800 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                        {loadingAction === 'backlog' ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : <CircleDot size={13} />}
                        Move to Backlog
                    </button>


                    <button
                        disabled={!!loadingAction}
                        onClick={() => handleBulkStatusUpdate('done', 'done')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-800 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                        {loadingAction === 'done' ? <Loader2 size={13} className="animate-spin text-green-400" /> : <CheckCircle2 size={13} className="text-green-400" />}
                        Mark as Done
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowMoreActions(!showMoreActions)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold hover:bg-gray-800 ${showMoreActions ? 'bg-gray-800' : ''}`}
                        >
                            <MoreHorizontal size={13} />
                            Actions
                        </button>

                        {showMoreActions && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                                <div className="absolute bottom-full mb-3 right-0 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 p-2 w-52 overflow-hidden transform origin-bottom animate-in zoom-in-95 duration-150">
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Update Status</div>
                                    <button onClick={() => handleBulkStatusUpdate('review')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                        <CircleDot size={12} className="text-fuchsia-400" /> Move to Review
                                    </button>
                                    <button onClick={() => handleBulkStatusUpdate('in_review')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                        <CircleDot size={12} className="text-purple-400" /> Move to In Review
                                    </button>

                                    <div className="h-px bg-gray-800 my-2" />

                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Update Priority</div>
                                    <button onClick={() => handleBulkPriorityUpdate('urgent')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                        <SignalHigh size={12} className="text-red-500" /> Urgent
                                    </button>
                                    <button onClick={() => handleBulkPriorityUpdate('high')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                        <SignalHigh size={12} className="text-red-400" /> High
                                    </button>
                                    <button onClick={() => handleBulkPriorityUpdate('medium')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                        <SignalHigh size={12} className="text-yellow-400" /> Medium
                                    </button>
                                    <button onClick={() => handleBulkPriorityUpdate('low')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 rounded-md flex items-center gap-2 transition-colors">
                                        <SignalHigh size={12} className="text-indigo-400" /> Low
                                    </button>

                                    <div className="h-px bg-gray-800 my-2" />

                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={!!loadingAction}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-red-900/40 text-red-400 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {loadingAction === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        Delete Issues
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
