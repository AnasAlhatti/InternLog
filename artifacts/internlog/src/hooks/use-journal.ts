import { useEffect, useRef, useState } from 'react';
import { createSampleData, emptyData, isDate, weekBounds, parseBackup, validateEntry, type AppData, type EntryInput, type Profile, type WeeklySummary } from '../lib/domain';
import { loadData, saveData, STORAGE_KEY } from '../lib/storage';
import { summarySource } from '../lib/weekly-summary';

export function useJournal() {
  const [initial] = useState(loadData);
  const [data, setData] = useState<AppData>(initial.data);
  const [error, setError] = useState<string | null>(initial.error);
  const current = useRef(data);
  const recoveryRequired = useRef(Boolean(initial.error));
  const expectedRaw = useRef(initial.raw);
  const conflictDetected = useRef(false);
  const [conflict, setConflict] = useState(false);
  const flagConflict = () => {
    conflictDetected.current = true;
    setConflict(true);
    setError('Another tab changed this journal. Your visible edits have not been replaced. Entry and report drafts recover in this tab after reload unless a draft-storage warning is shown. Copy any unsaved notes if storage is unavailable, then reload before saving or replacing data.');
  };
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      try {
        if (event.storageArea && event.storageArea !== localStorage) return;
        if (localStorage.getItem(STORAGE_KEY) !== expectedRaw.current) flagConflict();
      } catch { setError('Could not check browser storage. Copy your unsaved notes before reloading.'); }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  async function persist(build: (latest: AppData) => AppData, explicitReplace = false): Promise<boolean> {
    if (recoveryRequired.current && !explicitReplace) {
      setError('Saved data could not be read. To protect it, restore a valid backup or explicitly clear/replace data in Settings before saving.');
      return false;
    }
    try {
      // A lock makes compare-and-write atomic relative to every app tab.
      // Never fall back to an unsafe read/write race in unsupported browsers.
      if (!navigator.locks?.request) throw new Error('This browser does not support safe cross-tab saving. Use a current supported browser over HTTPS or localhost. Export your data before switching browsers.');
      return await navigator.locks.request(STORAGE_KEY, () => {
        if (conflictDetected.current || localStorage.getItem(STORAGE_KEY) !== expectedRaw.current) {
          flagConflict();
          return false;
        }
        const validated = parseBackup(JSON.stringify(build(current.current)));
        saveData(validated);
        expectedRaw.current = JSON.stringify(validated);
        current.current = validated;
        recoveryRequired.current = false;
        setData(validated);
        setError(null);
        return true;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your changes.');
      return false;
    }
  }
  return {
    data, error, conflict, recoveryRequired: recoveryRequired.current, recoveryRaw: recoveryRequired.current ? initial.raw : null,
    saveEntry(input: EntryInput, id?: string) {
      const errors = validateEntry(input);
      if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return false; }
      if (id && !current.current.entries.some(entry => entry.id === id)) { setError('This entry no longer exists.'); return false; }
      const entry = {
        ...input, title: input.title.trim(), tasks: input.tasks.trim(),
        skills: [...new Map(input.skills.map(skill => skill.trim()).filter(Boolean).map(skill => [skill.toLowerCase(), skill])).values()],
        id: id || crypto.randomUUID(),
      };
      return persist(latest => {
        if (id && !latest.entries.some(item => item.id === id)) throw new Error('This entry no longer exists.');
        return { ...latest, entries: id ? latest.entries.map(item => item.id === id ? entry : item) : [...latest.entries, entry] };
      });
    },
    deleteEntry(id: string) { return persist(latest => ({ ...latest, entries: latest.entries.filter(entry => entry.id !== id) })); },
    saveProfile(profile: Profile) { return persist(latest => ({ ...latest, profile })); },
    saveWeeklySummary(week: string, summary: WeeklySummary | null) {
      return persist(latest => {
        if (!isDate(week) || weekBounds(week).start !== week) throw new Error('Choose a valid report week.');
        if (summary && summary.source !== summarySource(latest.entries, week)) throw new Error('Entries changed while AI was working. Regenerate the summary from the latest week.');
        const weeklySummaries = { ...latest.weeklySummaries };
        if (summary) weeklySummaries[week] = summary;
        else delete weeklySummaries[week];
        return { ...latest, weeklySummaries };
      });
    },
    replaceData(next: AppData) { return persist(() => next, true); },
    clearData() { return persist(emptyData, true); },
    loadSamples() { return persist(latest => ({ ...createSampleData(), profile: latest.profile }), true); },
    clearError() { setError(null); },
  };
}
