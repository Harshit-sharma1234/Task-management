'use client'

import { useState, useMemo, memo } from 'react'
import { Search } from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'

/**
 * Memoized row component to prevent unnecessary re-renders when 
 * searching or switching filters if the user data hasn't changed.
 */
const TeamMemberRow = memo(({ user }: { user: any }) => {
    const rawRole = user.roles?.role_name || 'User'
    const displayRole = rawRole === 'Admin' ? 'Workspace admin' : rawRole
    
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
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50/50 text-indigo-600 ring-1 ring-indigo-100/50 transition-all group-hover:bg-indigo-100/30">
                    {displayRole}
                </span>
            </td>
        </tr>
    )
})

TeamMemberRow.displayName = 'TeamMemberRow'

export function TeamList({ initialUsers }: { initialUsers: any[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('All')

    // Memoize the filtered users calculation to avoid expensive re-computation on every minor state change
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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/80">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-2 py-12 text-center text-sm text-gray-400 italic font-medium">
                                    No team members found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <TeamMemberRow key={user.id} user={user} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
