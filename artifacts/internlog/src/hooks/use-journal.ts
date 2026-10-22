import { useRef, useState } from 'react';
import { createSampleData, emptyData, parseBackup, validateEntry, type AppData, type EntryInput, type Profile } from '../lib/domain';
import { loadData, saveData } from '../lib/storage';

export function useJournal() {
  const [initial] = useState(loadData);
  const [data, setData] = useState<AppData>(initial.data);
  const [error, setError] = useState<string | null>(initial.error);
  const current = useRef(data);
  const recoveryRequired = useRef(Boolean(initial.error));
  function persist(next: AppData, explicitReplace = false): boolean {
    if (recoveryRequired.current && !explicitReplace) {
      setError('Saved data could not be read. To protect it, restore a valid backup or explicitly clear/replace data in Settings before saving.');
      return false;
    }
    try {
      const validated = parseBackup(JSON.stringify(next));
      saveData(validated);
      current.current = validated;
      recoveryRequired.current = false;
      setData(validated);
      setError(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your changes.');
      return false;
    }
  }
  return {
    data, error,
    saveEntry(input: EntryInput, id?: string) {
      const errors = validateEntry(input);
      if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return false; }
      if (id && !current.current.entries.some(entry => entry.id === id)) { setError('This entry no longer exists.'); return false; }
      const entry = {
        ...input, title: input.title.trim(), tasks: input.tasks.trim(),
        skills: [...new Map(input.skills.map(skill => skill.trim()).filter(Boolean).map(skill => [skill.toLowerCase(), skill])).values()],
        id: id || crypto.randomUUID(),
      };
      return persist({ ...current.current, entries: id ? current.current.entries.map(item => item.id === id ? entry : item) : [...current.current.entries, entry] });
    },
    deleteEntry(id: string) { return persist({ ...current.current, entries: current.current.entries.filter(entry => entry.id !== id) }); },
    saveProfile(profile: Profile) { return persist({ ...current.current, profile }); },
    replaceData(next: AppData) { return persist(next, true); },
    clearData() { return persist(emptyData(), true); },
    loadSamples() { return persist({ ...createSampleData(), profile: current.current.profile }, true); },
    clearError() { setError(null); },
  };
}
