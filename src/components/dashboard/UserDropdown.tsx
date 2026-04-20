'use client';

import { 
    Settings, 
    LogOut, 
    User, 
    ChevronDown, 
    Mail, 
    ShieldCheck,
    ArrowRight
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import Link from 'next/link';

interface UserDropdownProps {
    profile: {
        name: string;
        email: string;
        avatar_url: string | null;
        role?: string;
    };
    onSignOut: () => void;
    workspaceSlug?: string;
}

export function UserDropdown({ profile, onSignOut, workspaceSlug }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 p-1.5 rounded-xl transition-all border group ${
                    isOpen 
                    ? 'bg-indigo-50/50 border-indigo-100 ring-4 ring-indigo-50/30' 
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 shadow-sm'
                }`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <UserAvatar
                    name={profile.name}
                    avatarUrl={profile.avatar_url}
                    size="md"
                    className="shadow-sm ring-2 ring-white"
                    priority={true}
                />
                <div className="hidden sm:flex flex-col items-start mr-1">
                    <span className="text-xs font-extrabold text-slate-800 leading-tight tracking-tight truncate max-w-[100px]">
                        {profile.name}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-tight mt-0.5">
                        {profile.role || 'Member'}
                    </span>
                </div>
                <ChevronDown 
                    size={14} 
                    className={`text-slate-400 transition-transform duration-500 ${isOpen ? 'rotate-180 text-indigo-600' : 'group-hover:text-indigo-600'}`} 
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-3 right-0 w-72 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 origin-top-right">
                    {/* User Info Header */}
                    <div className="p-5 border-b border-slate-100/50 bg-gradient-to-br from-slate-50/50 to-white/50">
                        <div className="flex items-center gap-4 mb-4">
                            <UserAvatar
                                name={profile.name}
                                avatarUrl={profile.avatar_url}
                                size="lg"
                                className="ring-4 ring-white shadow-md shadow-slate-200/50"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-extrabold text-slate-900 truncate tracking-tight">{profile.name}</h3>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                    <ShieldCheck size={12} className="text-indigo-600" />
                                    {profile.role || 'Team Member'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 bg-white/50 rounded-xl border border-slate-100 shadow-inner group/mail">
                            <Mail size={12} className="text-slate-400 shrink-0 group-hover/mail:text-indigo-500 transition-colors" />
                            <span className="text-[11px] font-bold text-slate-500 truncate">{profile.email}</span>
                        </div>
                    </div>

                    {/* Actions Group */}
                    <div className="p-2.5">
                        <Link 
                            href={workspaceSlug ? `/dashboard/${workspaceSlug}/settings` : "/dashboard/settings"}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all group/item"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-2 bg-slate-50 rounded-lg group-hover/item:bg-white group-hover/item:shadow-sm ring-1 ring-slate-100 transition-all">
                                    <Settings size={14} className="text-slate-500 group-hover/item:text-indigo-600" />
                                </div>
                                Account Settings
                            </div>
                            <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all text-indigo-400 stroke-[3]" />
                        </Link>
                    </div>

                    {/* Logout Footer */}
                    <div className="p-2.5 border-t border-slate-100/50 bg-slate-50/20">
                        <button 
                            onClick={onSignOut}
                            className="flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all group/logout"
                        >
                            <div className="p-2 bg-red-50 rounded-lg group-hover/logout:bg-white group-hover/logout:shadow-sm ring-1 ring-red-100/50 transition-all">
                                <LogOut size={14} className="text-red-500" />
                            </div>
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
