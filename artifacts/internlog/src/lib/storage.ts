import { emptyData, parseBackup, type AppData } from './domain';

export const STORAGE_KEY = 'internlog.data.v1';
export function loadData(): { data: AppData; error: string | null; raw: string | null } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw === null ? emptyData() : parseBackup(raw), error: null, raw };
  } catch {
    return { data: emptyData(), raw, error: 'Could not read saved data. Your original browser data has not been overwritten. Restore a valid JSON backup in Settings, or explicitly replace/clear the data to start again.' };
  }
}
export function saveData(data: AppData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { throw new Error('Could not save your data in this browser. Storage may be full or disabled. Export a backup and try again.'); }
}
