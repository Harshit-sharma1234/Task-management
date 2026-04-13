import { format } from 'date-fns';

export type GroupBy = 'status' | 'project' | 'priority' | 'assignee' | 'none';
export type SortBy = 'created_at' | 'priority' | 'status' | 'due_date';

export interface DisplaySettings {
  viewMode: 'list' | 'board';
  groupBy: GroupBy;
  sortBy: SortBy;
  showProperties: string[];
}

export const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low', 'no_priority'];
export const STATUS_ORDER = ['backlog', 'to_do', 'in_progress', 'review', 'in_review', 'done', 'cancelled'];

export function groupAndSortTickets(tickets: any[], settings: DisplaySettings) {
  const { groupBy, sortBy } = settings;

  // 1. Grouping
  const groups: Record<string, { name: string; tickets: any[]; id: string }> = {};

  tickets.forEach(ticket => {
    let groupKey = 'none';
    let groupName = 'All Issues';
    let groupId = 'all';

    if (groupBy === 'status') {
      groupKey = ticket.status || 'to_do';
      groupName = groupKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      groupId = groupKey;
    } else if (groupBy === 'priority') {
      groupKey = ticket.priority || 'no_priority';
      groupName = groupKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      groupId = groupKey;
    } else if (groupBy === 'project') {
      groupKey = ticket.projects?.id || 'none';
      groupName = ticket.projects?.project_name || 'No Project';
      groupId = groupKey;
    } else if (groupBy === 'assignee') {
      groupKey = ticket.assignee_id || 'unassigned';
      groupName = ticket.assignees?.name || 'Unassigned';
      groupId = groupKey;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = { name: groupName, tickets: [], id: groupId };
    }
    groups[groupKey].tickets.push(ticket);
  });

  // 2. Sorting within groups
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    if (groupBy === 'status') {
      return STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b);
    }
    if (groupBy === 'priority') {
      return PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b);
    }
    if (groupBy === 'none') return 0;
    return a.localeCompare(b);
  });

  sortedGroupKeys.forEach(key => {
    groups[key].tickets.sort((a, b) => {
      if (sortBy === 'priority') {
        return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
      }
      if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      // Status sorting within non-status groups
      if (sortBy === 'status') {
          return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      }
      return 0;
    });
  });

  return sortedGroupKeys.map(key => groups[key]);
}
