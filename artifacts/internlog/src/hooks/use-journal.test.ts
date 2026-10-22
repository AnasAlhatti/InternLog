import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useJournal } from './use-journal';

const input = { date: '2026-10-19', title: 'Build', tasks: 'Added tests', learning: '', blockers: '', blockerStatus: 'open' as const, nextSteps: '', hours: 2, skills: ['Git'] };
it('creates, edits, deletes and reloads persisted entries', () => {
  const { result, unmount } = renderHook(() => useJournal());
  act(() => { expect(result.current.saveEntry(input)).toBe(true); });
  const id = result.current.data.entries[0].id;
  act(() => { result.current.saveEntry({ ...input, title: 'Updated' }, id); });
  expect(result.current.data.entries[0].title).toBe('Updated');
  unmount();
  const reload = renderHook(() => useJournal());
  expect(reload.result.current.data.entries[0].title).toBe('Updated');
  act(() => { reload.result.current.deleteEntry(id); });
  expect(reload.result.current.data.entries).toHaveLength(0);
});
it('does not update visible state when storage saving fails', () => {
  const { result } = renderHook(() => useJournal());
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  act(() => { expect(result.current.saveEntry(input)).toBe(false); });
  expect(result.current.data.entries).toHaveLength(0);
  expect(result.current.error).toMatch(/could not save/i);
  spy.mockRestore();
});
