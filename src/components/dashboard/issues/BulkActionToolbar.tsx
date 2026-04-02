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
import { updateIssue } from '@/app/dashboard/issues/actions';
import { useRouter } from 'next/navigation';

interface BulkActionToolbarProps {
    selectedIds: string[];
    onClear: () => void;
    totalTickets: number;
}

export function BulkActionToolbar({ selectedIds, onClear, totalTickets }: BulkActionToolbarProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [showMoreActions, setShowMoreActions] = useState(false);
    const router = useRouter();

    if (selectedIds.length === 0) return null;

    const handleBulkStatusUpdate = async (status: string) => {
        setIsUpdating(true);
        const promises = selectedIds.map(id => updateIssue(id, { status }));
        await Promise.all(promises);
        setIsUpdating(false);
        onClear();
        router.refresh();
    };

    const handleBulkPriorityUpdate = async (priority: string) => {
        setIsUpdating(true);
        const promises = selectedIds.map(id => updateIssue(id, { priority }));
        await Promise.all(promises);
        setIsUpdating(false);
        onClear();
        router.refresh();
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
                        disabled={isUpdating}
                        onClick={() => handleBulkStatusUpdate('backlog')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-800 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                        {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <CircleDot size={13} />}
                        Move to Backlog
                    </button>


                    <button 
                        disabled={isUpdating}
                        onClick={() => handleBulkStatusUpdate('done')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-800 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                        <CheckCircle2 size={13} className="text-green-400" />
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
                                    
                                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-red-900/40 text-red-400 rounded-md flex items-center gap-2 transition-colors">
                                        <Trash2 size={12} /> Delete Issues
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
