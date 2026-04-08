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
}

export function UserDropdown({ profile, onSignOut }: UserDropdownProps) {
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
                className={`flex items-center gap-2.5 p-1.5 rounded-xl transition-all border group ${
                    isOpen 
                    ? 'bg-gray-100 border-gray-200 ring-4 ring-gray-50' 
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
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
                    <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[100px]">
                        {profile.name}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider leading-tight">
                        {profile.role || 'Member'}
                    </span>
                </div>
                <ChevronDown 
                    size={14} 
                    className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-gray-600' : 'group-hover:text-gray-600'}`} 
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {/* User Info Header */}
                    <div className="p-4 bg-gray-50/50 border-b border-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                            <UserAvatar
                                name={profile.name}
                                avatarUrl={profile.avatar_url}
                                size="lg"
                                className="ring-4 ring-white"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900 truncate">{profile.name}</h3>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                                    <ShieldCheck size={11} className="text-indigo-500" />
                                    {profile.role || 'Team Member'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100/50 shadow-sm">
                            <Mail size={12} className="text-gray-400 shrink-0" />
                            <span className="text-[11px] font-medium text-gray-600 truncate">{profile.email}</span>
                        </div>
                    </div>

                    {/* Actions Group */}
                    <div className="p-2">
                        <Link 
                            href="/dashboard/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all group/item"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-gray-100 rounded-lg group-hover/item:bg-indigo-100 transition-colors">
                                    <Settings size={14} className="text-gray-500 group-hover/item:text-indigo-600" />
                                </div>
                                Account Settings
                            </div>
                            <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all text-indigo-400" />
                        </Link>
                    </div>

                    {/* Logout Footer */}
                    <div className="p-2 border-t border-gray-50 bg-gray-50/30">
                        <button 
                            onClick={onSignOut}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all group/logout"
                        >
                            <div className="p-1.5 bg-red-100/50 rounded-lg group-hover/logout:bg-red-100 transition-colors">
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
