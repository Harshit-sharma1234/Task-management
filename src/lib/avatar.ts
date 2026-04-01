/**
 * Shared avatar utility functions.
 * Single source of truth for initials and badge-color generation
 * used across every component that renders a user profile.
 */

/** Return up to 2-letter uppercase initials from a display name. */
export const getInitials = (name: string): string => {
    if (!name || name === '?' || name === 'Unassigned') return '?'
    return name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
}

/** Deterministic gradient Tailwind class string for a given name. */
export const getBadgeColor = (name: string): string => {
    if (!name || name === '?' || name === 'Unassigned') return 'bg-gray-200 text-gray-500'
    const colors = [
        'bg-gradient-to-br from-orange-400 to-orange-500',
        'bg-gradient-to-br from-indigo-400 to-indigo-500',
        'bg-gradient-to-br from-emerald-400 to-emerald-500',
        'bg-gradient-to-br from-purple-400 to-purple-500',
        'bg-gradient-to-br from-pink-400 to-pink-500',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return `${colors[Math.abs(hash) % colors.length]} text-white`
}
