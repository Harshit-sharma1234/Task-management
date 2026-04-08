'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getInitials, getBadgeColor } from '@/lib/avatar'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface UserAvatarProps {
    name: string
    avatarUrl?: string | null
    size?: AvatarSize
    className?: string
}

const sizeMap: Record<AvatarSize, { px: number; text: string }> = {
    xs: { px: 20, text: 'text-[8px]' },
    sm: { px: 24, text: 'text-[9px]' },
    md: { px: 32, text: 'text-[11px]' },
    lg: { px: 40, text: 'text-[13px]' },
    xl: { px: 64, text: 'text-2xl' },
}

/**
 * Unified avatar component used across the entire dashboard.
 * Renders a Next.js <Image> when an avatar URL is available,
 * otherwise renders gradient-backed initials.
 */
export function UserAvatar({ name, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
    const [imageError, setImageError] = useState(false)
    const { px, text } = sizeMap[size]
    const initials = getInitials(name)
    const badgeColor = getBadgeColor(name)

    const baseClasses = `rounded-full flex items-center justify-center shrink-0 font-bold shadow-sm ring-1 ring-black/5 ${className}`

    if (avatarUrl && !imageError) {
        return (
            <div
                className={`relative overflow-hidden border border-gray-100 ${baseClasses}`}
                style={{ width: px, height: px }}
            >
                <Image
                    src={avatarUrl}
                    alt={name || 'User'}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                />
            </div>
        )
    }

    return (
        <div
            className={`${badgeColor} ${text} ${baseClasses}`}
            style={{ width: px, height: px }}
        >
            {initials}
        </div>
    )
}
