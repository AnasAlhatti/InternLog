import { describe, it, expect, vi } from 'vitest';
import { emptyData } from './domain';
import { STORAGE_KEY, loadData, saveData } from './storage';

describe('browser persistence', () => {
  it('starts empty and persists a profile after reload', () => {
    expect(loadData().data).toEqual(emptyData());
    const data = { ...emptyData(), profile: { name: 'Demo', role: 'Intern', organization: 'Example' } };
    saveData(data);
    expect(loadData().data).toEqual(data);
  });
  it('preserves corrupt data and reports a recoverable error', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadData().error).toMatch(/could not|invalid/i);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
  });
  it('surfaces storage quota errors', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => saveData(emptyData())).toThrow(/could not save/i);
    spy.mockRestore();
  });
});
