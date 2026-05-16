import { describe, it, expect } from 'vitest';
import { groupAndSortTickets, DisplaySettings } from '@/lib/utils/issue-display-utils';

const mockTickets = [
  { id: '1', status: 'backlog', priority: 'urgent', created_at: '2024-01-01' },
  { id: '2', status: 'in_progress', priority: 'high', created_at: '2024-01-02' },
  { id: '3', status: 'done', priority: 'low', created_at: '2024-01-03' },
];

const defaultSettings: DisplaySettings = {
  viewMode: 'list',
  groupBy: 'status',
  sortBy: 'created_at',
  showProperties: ['status', 'priority'],
};

describe('Issue Filters and Display Utils', () => {
  it('should group tickets by status correctly', () => {
    const result = groupAndSortTickets(mockTickets, defaultSettings);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Backlog');
    expect(result[1].name).toBe('In Progress');
    expect(result[2].name).toBe('Done');
  });

  it('should group tickets by priority correctly', () => {
    const settings: DisplaySettings = { ...defaultSettings, groupBy: 'priority' };
    const result = groupAndSortTickets(mockTickets, settings);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Urgent');
    expect(result[1].name).toBe('High');
    expect(result[2].name).toBe('Low');
  });

  it('should sort tickets within groups by created_at descending', () => {
    const result = groupAndSortTickets(mockTickets, { ...defaultSettings, groupBy: 'none' });
    expect(result[0].tickets[0].id).toBe('3'); // Latest date first
    expect(result[0].tickets[1].id).toBe('2');
    expect(result[0].tickets[2].id).toBe('1');
  });
});
