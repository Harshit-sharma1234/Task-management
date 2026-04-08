import { twMerge, type ClassNameValue } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassNameValue[]) {
  return twMerge(...inputs);
}

export function formatTime(date: string | Date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    
    try {
        const distance = formatDistanceToNow(d, { addSuffix: false });
        // Personalize short format (e.g., '2m', '1d')
        return distance
            .replace('about ', '')
            .replace('less than a minute', 'just now')
            .replace(' minutes', 'm')
            .replace(' minute', 'm')
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' days', 'd')
            .replace(' day', 'd')
            .replace(' months', 'mo')
            .replace(' month', 'mo')
            .replace(' years', 'y')
            .replace(' year', 'y');
    } catch (e) {
        return '';
    }
}
