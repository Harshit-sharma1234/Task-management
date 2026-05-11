import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter, useParams } from 'next/navigation';

import { useModalStore } from '@/lib/store/modal';

// Mock dependencies
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useTransition: () => [false, (cb: any) => cb()],
  };
});

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  usePathname: () => '/',
}));

vi.mock('@/lib/store/modal', () => {
  const mockStore = vi.fn();
  (mockStore as any).getState = vi.fn();
  return { useModalStore: mockStore };
});

describe('Navigation Shortcuts', () => {
  const pushMock = vi.fn();
  const modalState = {
    activeTicket: null,
    activeProject: null,
    setCreateIssueOpen: vi.fn(),
    toggleShortcutHelp: vi.fn(),
    setCommandPaletteOpen: vi.fn(),
    closeAll: vi.fn(),
    setActiveContextMenu: vi.fn(),
    setActiveTicket: vi.fn(),
    setActiveProject: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: pushMock, prefetch: vi.fn() });
    (useParams as any).mockReturnValue({ workspace: 'test-ws' });
    (useModalStore as any).mockReturnValue(modalState);
    (useModalStore.getState as any).mockReturnValue(modalState);
  });

  const fireKey = (key: string, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true });
    window.dispatchEvent(event);
  };

  it.each([
    ['go', '/dashboard/test-ws/issues?filter=all'],
    ['ga', '/dashboard/test-ws/issues?filter=active'],
    ['gb', '/dashboard/test-ws/issues?filter=backlog'],
    ['gu', '/dashboard/test-ws/issues?filter=urgent'],
    ['gw', '/dashboard/test-ws/issues?filter=in_progress'],
    ['gc', '/dashboard/test-ws/issues?filter=completed'],
    ['gp', '/dashboard/test-ws/projects'],
    ['gy', '/dashboard/test-ws/projects?filter=assigned'],
    ['gi', '/dashboard/test-ws/inbox'],
    ['gs', '/dashboard/test-ws/settings'],
    ['gn', '/dashboard/test-ws/notifications'],
    ['gt', '/dashboard/test-ws/team'],
    ['gm', '/dashboard/test-ws/my-tasks'],
  ])('should navigate correctly for shortcut "%s"', (keys, expectedPath) => {
    renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
    for (const char of keys) {
      fireKey(char);
    }
    expect(pushMock).toHaveBeenCalledWith(expectedPath);
  });

  describe('Action Shortcuts', () => {
    it('should open create issue modal on "c"', () => {
      renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
      fireKey('c');
      expect(modalState.setCreateIssueOpen).toHaveBeenCalledWith(true);
    });

    it('should toggle help modal on "?"', () => {
      renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
      fireKey('?');
      expect(modalState.toggleShortcutHelp).toHaveBeenCalled();
    });

    it('should close all modals on "Escape"', () => {
      renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
      fireKey('Escape');
      expect(modalState.closeAll).toHaveBeenCalled();
    });
  });

  describe('Context-Aware Shortcuts', () => {
    it('should open delete modal on Shift+D when ticket is active', () => {
      (useModalStore as any).mockReturnValue({ ...modalState, activeTicket: { id: '1' } });
      (useModalStore.getState as any).mockReturnValue({ ...modalState, activeTicket: { id: '1' } });
      
      renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
      fireKey('D'); // Simulated Shift+D or Caps Lock D
      
      expect(modalState.setActiveContextMenu).toHaveBeenCalledWith('delete-issue');
    });

    it('should open rename modal on Shift+R when ticket is active', () => {
      (useModalStore as any).mockReturnValue({ ...modalState, activeTicket: { id: '1' } });
      (useModalStore.getState as any).mockReturnValue({ ...modalState, activeTicket: { id: '1' } });
      
      renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
      fireKey('R');
      
      expect(modalState.setActiveContextMenu).toHaveBeenCalledWith('rename-issue');
    });

    it('should change status on "s" when ticket is active', () => {
      (useModalStore as any).mockReturnValue({ ...modalState, activeTicket: { id: '1' } });
      (useModalStore.getState as any).mockReturnValue({ ...modalState, activeTicket: { id: '1' } });
      
      renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
      fireKey('s');
      
      expect(modalState.setActiveContextMenu).toHaveBeenCalledWith('status');
    });
  });

  it('should reset sequence after timeout', async () => {
    vi.useFakeTimers();
    renderHook(() => useKeyboardShortcuts('test-ws', 'Admin'));
    
    fireKey('g');
    act(() => {
      vi.advanceTimersByTime(2500); // Exceeds 2000ms timeout
    });
    fireKey('a');
    
    expect(pushMock).not.toHaveBeenCalledWith('/dashboard/test-ws/issues?filter=active');
    vi.useRealTimers();
  });
});
