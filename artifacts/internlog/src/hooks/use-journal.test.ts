import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useJournal } from './use-journal';
import { STORAGE_KEY } from '../lib/storage';
import { summarySource } from '../lib/weekly-summary';

const input = { date: '2026-10-19', title: 'Build', tasks: 'Added tests', learning: '', blockers: '', blockerStatus: 'open' as const, nextSteps: '', hours: 2, skills: ['Git'] };
it('persists AI drafts in backups and rejects responses based on entries edited during generation', async () => {
  const { result, unmount } = renderHook(() => useJournal());
  await act(async () => { await result.current.saveEntry(input); });
  const draft = { text: 'I built and tested a feature.', source: summarySource(result.current.data.entries, input.date) };
  await act(async () => { expect(await result.current.saveWeeklySummary(input.date, draft)).toBe(true); });
  unmount();
  const reload = renderHook(() => useJournal());
  expect(reload.result.current.data.weeklySummaries?.[input.date]).toEqual(draft);
  const id = reload.result.current.data.entries[0].id;
  await act(async () => { await reload.result.current.saveEntry({ ...input, tasks: 'New work' }, id); });
  await act(async () => { expect(await reload.result.current.saveWeeklySummary(input.date, draft)).toBe(false); });
  await act(async () => { await reload.result.current.clearData(); });
  expect(reload.result.current.data.weeklySummaries).toBeUndefined();
});
it('creates, edits, deletes and reloads persisted entries', async () => {
  const { result, unmount } = renderHook(() => useJournal());
  await act(async () => { expect(await result.current.saveEntry(input)).toBe(true); });
  const id = result.current.data.entries[0].id;
  await act(async () => { await result.current.saveEntry({ ...input, title: 'Updated' }, id); });
  expect(result.current.data.entries[0].title).toBe('Updated');
  unmount();
  const reload = renderHook(() => useJournal());
  expect(reload.result.current.data.entries[0].title).toBe('Updated');
  await act(async () => { await reload.result.current.deleteEntry(id); });
  expect(reload.result.current.data.entries).toHaveLength(0);
});
it('does not update visible state when storage saving fails', async () => {
  const { result } = renderHook(() => useJournal());
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  await act(async () => { expect(await result.current.saveEntry(input)).toBe(false); });
  expect(result.current.data.entries).toHaveLength(0);
  expect(result.current.error).toMatch(/could not save/i);
  spy.mockRestore();
});
it('protects corrupt saved data until explicit replacement', async () => {
  localStorage.setItem(STORAGE_KEY, '{broken');
  const { result } = renderHook(() => useJournal());
  act(() => { result.current.clearError(); });
  expect(result.current.recoveryRequired).toBe(true);
  await act(async () => { expect(await result.current.saveEntry(input)).toBe(false); });
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
  await act(async () => { expect(await result.current.clearData()).toBe(true); });
  await act(async () => { expect(await result.current.saveEntry(input)).toBe(true); });
});
it('serializes simultaneous writers and rejects the stale tab without deleting either draft', async () => {
  const first = renderHook(() => useJournal());
  const second = renderHook(() => useJournal());
  let results: boolean[] = [];
  await act(async () => {
    results = await Promise.all([
      first.result.current.saveEntry({ ...input, title: 'First tab' }),
      second.result.current.saveEntry({ ...input, title: 'Second tab' }),
    ]);
  });
  expect(results).toEqual([true, false]);
  expect(second.result.current.conflict).toBe(true);
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).entries[0].title).toBe('First tab');
  first.unmount();
  second.unmount();
  const reload = renderHook(() => useJournal());
  await act(async () => { expect(await reload.result.current.saveEntry({ ...input, title: 'Retried draft' })).toBe(true); });
  expect(reload.result.current.data.entries).toHaveLength(2);
});
it('detects external deletion even after its warning is dismissed, including destructive actions', async () => {
  const { result } = renderHook(() => useJournal());
  await act(async () => { await result.current.saveEntry(input); });
  act(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
  });
  expect(result.current.conflict).toBe(true);
  act(() => { result.current.clearError(); });
  await act(async () => {
    expect(await result.current.loadSamples()).toBe(false);
    expect(await result.current.clearData()).toBe(false);
    expect(await result.current.replaceData(result.current.data)).toBe(false);
    expect(await result.current.saveProfile({ name: 'New', role: '', organization: '' })).toBe(false);
  });
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});
it('does not save without cross-tab locking support', async () => {
  const { result } = renderHook(() => useJournal());
  const locks = navigator.locks;
  Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
  try {
    await act(async () => { expect(await result.current.saveEntry(input)).toBe(false); });
    expect(result.current.error).toMatch(/browser.*support|supported browser/i);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  } finally { Object.defineProperty(navigator, 'locks', { configurable: true, value: locks }); }
});
