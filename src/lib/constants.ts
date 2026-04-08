import { 
    Circle, 
    CircleEllipsis, 
    CheckCircle2, 
    X, 
    CircleDot,
    SignalHigh,
    SignalMedium,
    SignalLow,
    MoreHorizontal
} from 'lucide-react';

export const STATUS_ICONS: Record<string, any> = {
    'to_do': { label: 'Todo', icon: Circle, color: 'text-gray-400' },
    'to do': { label: 'Todo', icon: Circle, color: 'text-gray-400' },
    'in_progress': { label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
    'in progress': { label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
    'done': { label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
    'backlog': { label: 'Backlog', icon: CircleDot, color: 'text-gray-300' },
    'review': { label: 'Review', icon: CircleEllipsis, color: 'text-orange-500' },
    'in_review': { label: 'In Review', icon: CircleEllipsis, color: 'text-orange-600' },
    'cancelled': { label: 'Cancelled', icon: X, color: 'text-red-400' },
};

export const PRIORITY_ICONS: Record<string, any> = {
    'urgent': { label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
    'high': { label: 'High', icon: SignalHigh, color: 'text-red-500' },
    'medium': { label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
    'low': { label: 'Low', icon: SignalLow, color: 'text-indigo-500' },
    'no_priority': { label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
};
