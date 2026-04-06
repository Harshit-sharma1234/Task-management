'use client';

import { useState, useEffect } from 'react';

interface HumanDateProps {
    date: string | Date;
    format?: 'full' | 'time' | 'date';
}

export function HumanDate({ date, format = 'full' }: HumanDateProps) {
    const [formattedDate, setFormattedDate] = useState<string>('');

    useEffect(() => {
        let dateStr = typeof date === 'string' ? date : date.toISOString();
        
        // If the date string from DB doesn't have a timezone indicator (Z or +HH:mm),
        // it's likely a 'timestamp' (without time zone) field that should be treated as UTC.
        if (typeof date === 'string' && !dateStr.includes('Z') && !dateStr.includes('+') && !/[-+]\d{2}:\d{2}$/.test(dateStr)) {
            dateStr += 'Z';
        }

        const d = new Date(dateStr);
        
        if (format === 'time') {
            setFormattedDate(d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
        } else if (format === 'date') {
            setFormattedDate(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        } else {
            // "6 Apr, 09:18 am"
            const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            setFormattedDate(`${dateStr}, ${timeStr}`);
        }
    }, [date, format]);

    // Initial render avoids hydration mismatch by showing nothing or a placeholder
    if (!formattedDate) return <span className="opacity-0">Loading...</span>;

    return <span className="transition-opacity duration-200 opacity-100">{formattedDate}</span>;
}
