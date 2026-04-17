import { MoreHorizontal, Filter, Settings2, BellOff, MessageSquare } from 'lucide-react';

export default function InboxLoading() {
    return (
        <div className="flex h-full bg-white animate-in fade-in duration-500">
            {/* ── LEFT PANEL SKELETON ── */}
            <div className="w-[380px] shrink-0 border-r border-gray-200 flex flex-col h-full bg-white">
                <header className="h-12 border-b border-gray-100 px-4 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-[14px] font-bold text-gray-900">Inbox</h1>
                        <MoreHorizontal size={14} className="text-gray-200" />
                    </div>
                    <div className="flex items-center gap-3">
                        <Filter size={14} className="text-gray-200" />
                        <Settings2 size={14} className="text-gray-200" />
                    </div>
                </header>

                <div className="flex-1 overflow-hidden p-4 space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-full animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2 mt-1">
                                <div className="h-3 bg-gray-50 rounded animate-pulse w-3/4" />
                                <div className="h-2 bg-gray-50 rounded animate-pulse w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT PANEL SKELETON ── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                <div className="h-12 flex items-center px-6 border-b border-gray-100 bg-white shrink-0">
                    <div className="h-4 bg-gray-50 rounded animate-pulse w-32" />
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-100">
                    <div className="text-center">
                        <MessageSquare size={40} className="mx-auto mb-3 text-gray-50" />
                        <div className="h-4 bg-gray-50 rounded animate-pulse w-32 mx-auto mb-2" />
                        <div className="h-3 bg-gray-50 rounded animate-pulse w-48 mx-auto" />
                    </div>
                </div>
            </div>
        </div>
    );
}
