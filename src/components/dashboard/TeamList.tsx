'use client'

import { useState, useMemo, memo } from 'react'
import { Search, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTeamStore } from '@/lib/store/team'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { deleteMember, updateUserRole } from '@/app/dashboard/[workspace]/team/actions'
import { toast } from 'sonner'
import { DeleteMemberModal } from './DeleteMemberModal'

/**
 * Memoized row component to prevent unnecessary re-renders when 
 * searching or switching filters if the user data hasn't changed.
 */
const TeamMemberRow = memo(({ user, isAdmin, currentUserRole }: { user: any, isAdmin: boolean, currentUserRole: string | null }) => {
    const { refresh } = useTeamStore();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const rawRole = user.roles?.role_name || 'User'
    const displayRole = rawRole === 'Admin' ? 'Workspace admin' : rawRole

    const canDelete = isAdmin || (currentUserRole === 'Project Manager' && (rawRole === 'Junior Developer' || rawRole === 'Senior Developer' || rawRole === 'Project Manager'));
    const canChangeRole = isAdmin || (currentUserRole === 'Project Manager' && (rawRole === 'Junior Developer' || rawRole === 'Senior Developer' || rawRole === 'Project Manager'));

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRole = e.target.value;
        const selectId = `role-select-${user.id}`;
        
        toast.custom((t) => (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl max-w-sm w-full animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-start gap-4">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                        <ShieldCheck size={20} className="text-emerald-300" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold tracking-tight mb-1">Confirm Role Change</h3>
                        <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                            Change <span className="font-bold text-white underline decoration-emerald-400/50 underline-offset-2">{user.name || user.email}'s</span> role to <span className="font-bold text-white">{newRole}</span>?
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    toast.dismiss(t);
                                    setIsUpdatingRole(true);
                                    try {
                                        const store = useTeamStore.getState();
                                        store.updateRole(user.id, newRole);
                                        const result = await updateUserRole(user.id, newRole, store.workspaceId!);
                                        if (result.error) {
                                            toast.error(result.error);
                                            refresh();
                                        } else {
                                            toast.success('Role updated successfully');
                                        }
                                    } catch (err) {
                                        console.error('Update role error:', err);
                                        toast.error('Failed to update member role');
                                        refresh();
                                    } finally {
                                        setIsUpdatingRole(false);
                                    }
                                }}
                                className="flex-1 bg-white text-indigo-700 py-2 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-all active:scale-95 shadow-lg shadow-black/10"
                            >
                                Confirm Change
                            </button>
                            <button
                                onClick={() => {
                                    toast.dismiss(t);
                                    const select = document.getElementById(selectId) as HTMLSelectElement;
                                    if (select) select.value = rawRole;
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all border border-white/10"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: 10000, position: 'top-center' });
    };

    const confirmDelete = async (message: string) => {
        setIsDeleting(true);
        // Optimistic update
        const store = useTeamStore.getState();
        store.removeUser(user.id);

        try {
            const result = await deleteMember(user.id, store.workspaceId!, message);
            if (result.error) {
                toast.error(result.error);
                // Rollback on error
                refresh();
            } else {
                toast.success('Member removed successfully');
                // Force Next.js to clear its router cache and sync with server
                router.refresh();
                // Sync the Zustand store
                refresh(); 
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Failed to remove member');
            refresh();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    return (
        <tr className="group hover:bg-gray-50/40 transition-all border-b border-gray-50/10">
            <td className="px-2 py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <UserAvatar
                        name={user.name || 'User'}
                        avatarUrl={user.avatar_url}
                        size="md"
                    />
                    <div className="flex flex-col">
                        <div className="text-[13px] font-medium text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
                            {user.email}
                        </div>
                        <div className="text-[11px] text-gray-400 font-medium tracking-tight">
                            {user.name}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-2 py-3 whitespace-nowrap">
                <div className="text-[13px] text-gray-500 font-medium tabular-nums">{user.email}</div>
            </td>
            <td className="px-2 py-3 whitespace-nowrap">
                {canChangeRole ? (
                    <div className="relative inline-block w-full max-w-[140px]">
                        <select
                            id={`role-select-${user.id}`}
                            value={rawRole}
                            onChange={handleRoleChange}
                            disabled={isUpdatingRole}
                            className={`appearance-none w-full bg-indigo-50/50 border border-indigo-100/50 rounded px-2 py-0.5 text-[10px] font-bold text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all ${isUpdatingRole ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-100/30'} pr-6`}
                        >
                            {isAdmin && <option value="Admin">Admin</option>}
                            {(isAdmin || currentUserRole === 'Project Manager') && (
                                <option value="Project Manager">Project Manager</option>
                            )}
                            <option value="Senior Developer">Senior Developer</option>
                            <option value="Junior Developer">Junior Developer</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-1 pointer-events-none text-indigo-400">
                            {isUpdatingRole ? <Loader2 size={10} className="animate-spin" /> : <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>}
                        </div>
                    </div>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50/50 text-indigo-600 ring-1 ring-indigo-100/50 transition-all group-hover:bg-indigo-100/30">
                        {displayRole}
                    </span>
                )}
            </td>
            <td className="px-2 py-3 whitespace-nowrap text-right">
                {canDelete && (
                    <>
                        <button
                            onClick={handleDeleteClick}
                            disabled={isDeleting}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Delete member"
                        >
                            {isDeleting ? (
                                <Loader2 size={13} className="animate-spin text-red-500" />
                            ) : (
                                <Trash2 size={13} />
                            )}
                        </button>

                        <DeleteMemberModal
                            isOpen={isDeleteModalOpen}
                            onClose={() => setIsDeleteModalOpen(false)}
                            onConfirm={confirmDelete}
                            userName={user.name}
                            userEmail={user.email}
                            avatarUrl={user.avatar_url}
                        />
                    </>
                )}
            </td>
        </tr>
    )
})

TeamMemberRow.displayName = 'TeamMemberRow'

export function TeamList({ isAdmin, currentUserRole }: { isAdmin: boolean, currentUserRole: string | null }) {
    const { users: initialUsers, refresh } = useTeamStore();
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('All')

    // Memoize the filtered users calculation
    const filteredUsers = useMemo(() => {
        return initialUsers.filter(u => {
            const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesRole = roleFilter === 'All' ||
                u.roles?.role_name?.toLowerCase() === roleFilter.toLowerCase()

            return matchesSearch && matchesRole
        })
    }, [initialUsers, searchTerm, roleFilter])

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Search and Filter Bar */}
            <div className="flex items-center gap-2 max-w-2xl w-full mb-1">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3 w-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-8 pr-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-lg text-[13px] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/30 focus:bg-white transition-all"
                        placeholder="Search by name or email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="appearance-none bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:bg-white transition-all cursor-pointer pr-7"
                    >
                        <option>All</option>
                        <option value="Admin">Admin</option>
                        <option value="Project Manager">Project Manager</option>
                        <option value="Senior Developer">Senior Developer</option>
                        <option value="Junior Developer">Junior Developer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            {/* User Data Table */}
            <div className="w-full">
                <table className="min-w-full">
                    <thead>
                        <tr className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-100/50">
                            <th scope="col" className="px-2 py-2.5 text-left">Name <span className="ml-1 text-[10px]">↓</span></th>
                            <th scope="col" className="px-2 py-2.5 text-left">Email</th>
                            <th scope="col" className="px-2 py-2.5 text-left">Role</th>
                            <th scope="col" className="px-2 py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/80">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-2 py-12 text-center text-sm text-gray-400 italic font-medium">
                                    No team members found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <TeamMemberRow key={user.id} user={user} isAdmin={isAdmin} currentUserRole={currentUserRole} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
