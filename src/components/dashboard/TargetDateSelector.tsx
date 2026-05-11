'use client';

import { useState, useRef, useEffect, useTransition, memo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, ChevronLeft, ChevronRight, CornerDownLeft } from 'lucide-react';
import { useGlobalStore } from '@/lib/store/global';
import { useModalStore } from '@/lib/store/modal';
import { SelectorHandle } from './StatusSelector';
import { generateShortId } from '@/lib/utils/id';

interface TargetDateSelectorProps {
    projectId: string;
    currentTargetDate: string | null;
    align?: 'left' | 'right';
    onUpdate?: (projectId: string, dateStr: string | null) => Promise<{ error?: string }>;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const TargetDateSelector = memo(forwardRef<SelectorHandle, TargetDateSelectorProps>(({
    projectId, 
    currentTargetDate,
    align = 'left',
    onUpdate
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchValue, setSearchValue] = useState('');

    useImperativeHandle(ref, () => ({
        toggle: () => setIsOpen(prev => !prev),
    }));

    // Calendar state
    const [optimisticTargetDate, setOptimisticTargetDate] = useState(currentTargetDate);
    const [viewDate, setViewDate] = useState(() => {
        return optimisticTargetDate ? new Date(optimisticTargetDate) : new Date();
    });

    const globalProject = useGlobalStore(state => state.projects.find(p => p.id === projectId));

    const { optimisticProjectUpdates } = useModalStore();
    const optimisticUpdate = optimisticProjectUpdates[projectId];

    useEffect(() => { 
        if (optimisticUpdate?.start_date !== undefined) {
            setOptimisticTargetDate(optimisticUpdate.start_date);
        } else if (globalProject && globalProject.start_date !== undefined) {
            setOptimisticTargetDate(globalProject.start_date);
        } else {
            setOptimisticTargetDate(currentTargetDate); 
        }
    }, [currentTargetDate, globalProject, optimisticUpdate]);

    // Reset view date whenever opened
    useEffect(() => {
        if (isOpen) {
            setViewDate(optimisticTargetDate ? new Date(optimisticTargetDate) : new Date());
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, optimisticTargetDate]);

    // Click outside logic
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Handle selection
    const handleSelect = useCallback((dateStr: string | null) => {
        if (dateStr === optimisticTargetDate) {
            setIsOpen(false);
            return;
        }

        const previousDate = optimisticTargetDate;
        setOptimisticTargetDate(dateStr);
        
        // Update global optimistic store
        const { setOptimisticProjectUpdate } = useModalStore.getState();
        setOptimisticProjectUpdate(projectId, { start_date: dateStr });

        setIsOpen(false);
        if (!onUpdate) {
             toast.error("Not implemented yet");
             return;
        }
        startTransition(async () => {
            const res = await onUpdate(projectId, dateStr);
            if (res && res.error) {
                setOptimisticTargetDate(previousDate);
                useModalStore.getState().clearOptimisticProjectUpdate(projectId);
                toast.error(res.error);
            }
        });
    }, [projectId, optimisticTargetDate, onUpdate]);

    // Calendar grid calculations
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // Adjust to Monday=0 instead of Sunday=0
    const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanksList = Array.from({ length: startingEmptyCells }, (_, i) => i);
    
    // Previous month filler days
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Format display string
    const formatDisplayDate = (isoString: string | null) => {
        if (!isoString) return '---';
        const d = new Date(isoString);
        return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    };

    const isSelected = (day: number) => {
        if (!optimisticTargetDate) return false;
        const target = new Date(optimisticTargetDate);
        return target.getFullYear() === year && target.getMonth() === month && target.getDate() === day;
    };

    const toggleMonth = (direction: number) => {
        setViewDate(new Date(year, month + direction, 1));
    };

    return (
        <div className="relative flex items-center" ref={dropdownRef}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`flex items-center gap-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors text-gray-500 hover:text-gray-900 ${isPending ? 'opacity-50' : ''}`}
            >
                <CalendarPlus size={14} className={currentTargetDate ? "text-indigo-600" : "text-gray-400"} />
                <span className={`text-[11px] font-bold transition-colors bg-gray-50 px-2 py-0.5 rounded border border-gray-100/80 group-hover:bg-gray-100/50 ${currentTargetDate ? "text-gray-700 group-hover:text-indigo-600" : "text-gray-400"}`}>
                    {formatDisplayDate(currentTargetDate)}
                </span>
            </button>

            {isOpen && (
                <div className={`
                    absolute left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0
                    ${align === 'left' ? 'sm:left-0' : 'sm:right-0'}
                    top-full mt-2
                    w-72 sm:w-64
                    bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200
                `}>
                    <div className="px-3 mb-4 mt-3">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Target date</div>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="try: May 2027, Q4, 20/05/2027"
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-[13px] rounded-md py-1.5 px-3 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-gray-400"
                            />
                            {searchValue && (
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 bg-white rounded-sm p-0.5 border border-gray-200">
                                    <CornerDownLeft size={10} />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar scroll-smooth">
                            {['Day', 'Month', 'Quarter', 'Half-year', 'Year'].map((filter) => (
                                <button key={filter} className={`text-[11px] px-2.5 py-1 rounded-full border border-gray-200 whitespace-nowrap transition-colors ${filter === 'Day' ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 px-3">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-900">{MONTHS[month]} {year}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => toggleMonth(-1)} className="p-1 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={() => toggleMonth(1)} className="p-1 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {WEEKDAYS.map(day => (
                                <div key={day} className="text-[11px] text-gray-500 text-center font-medium py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-[2px]">
                            {/* Previous month blanks */}
                            {blanksList.map((_, i) => {
                                const dayNum = prevMonthDays - startingEmptyCells + i + 1;
                                return (
                                    <div key={`blank-${i}`} className="w-8 h-8 flex items-center justify-center text-[12px] text-gray-200">
                                        {dayNum}
                                    </div>
                                );
                            })}
                            
                            {/* Current month days */}
                            {daysList.map((day) => {
                                const dateIso = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
                                const isCurrentDate = isToday(day);
                                const isSelectedDate = isSelected(day);
                                
                                let cellStyle = "text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer";
                                if (isSelectedDate) cellStyle = "bg-gray-900 text-white font-semibold";
                                else if (isCurrentDate) cellStyle = "text-indigo-600 font-bold border-b border-indigo-600 hover:bg-gray-50";
                                else if (isToday(day)) cellStyle = "text-indigo-600 font-bold hover:bg-gray-50";

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleSelect(dateIso)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] transition-all ${cellStyle}`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                            
                            {/* Next month blanks to fill grid */}
                            {Array.from({ length: 42 - (blanksList.length + daysList.length) }, (_, i) => (
                                <div key={`next-blank-${i}`} className="w-8 h-8 flex items-center justify-center text-[12px] text-gray-200">
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}));

TargetDateSelector.displayName = 'TargetDateSelector';
