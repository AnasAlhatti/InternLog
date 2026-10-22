import { describe, expect, it } from 'vitest';
import { emptyData, validateEntry, parseBackup, localDate, weekBounds, filterEntries, getStats, type Entry } from './domain';

const entry: Entry = { id: 'a', date: '2026-10-19', title: 'Build forms', tasks: 'Added labels', learning: 'Keyboard access', blockers: 'Need API docs', blockerStatus: 'open', nextSteps: 'Review docs', hours: 6.5, skills: ['React', 'Git'] };

describe('entry validation and backups', () => {
  it('requires date, title, tasks and limits hours', () => {
    expect(validateEntry({ ...entry, date: '', title: ' ', tasks: '', hours: 25 })).toEqual(expect.objectContaining({ date: expect.any(String), title: expect.any(String), tasks: expect.any(String), hours: expect.any(String) }));
    expect(validateEntry({ ...entry, hours: 0 })).toEqual({});
    expect(validateEntry({ ...entry, hours: 24 })).toEqual({});
    expect(validateEntry({ ...entry, date: '2026-02-30' })).toHaveProperty('date');
  });
  it('round trips valid data and rejects invalid imports before use', () => {
    const data = { ...emptyData(), entries: [entry] };
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
    for (const bad of ['null', '{}', '{', JSON.stringify({ ...data, version: 2 }), JSON.stringify({ ...data, entries: [{ ...entry, hours: '6' }] }), JSON.stringify({ ...data, entries: [entry, entry] })]) {
      expect(() => parseBackup(bad)).toThrow();
    }
  });
});

describe('local dates, filters, and dashboard', () => {
  it('uses local calendar values and Monday-Sunday weeks across years', () => {
    expect(localDate(new Date(2026, 0, 2, 23, 30))).toBe('2026-01-02');
    expect(weekBounds('2027-01-03')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
    expect(weekBounds('2026-10-19')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
  });
  it('combines text, date, skill and blocker filters and sorts newest first', () => {
    const later = { ...entry, id: 'b', date: '2026-10-20', blockerStatus: 'resolved' as const };
    expect(filterEntries([entry, later], {}).map(e => e.id)).toEqual(['b', 'a']);
    expect(filterEntries([entry, later], { search: 'KEYBOARD', skill: 'React', from: '2026-10-19', to: '2026-10-20', openOnly: true })).toEqual([entry]);
    expect(filterEntries([entry], { from: '2026-10-20' })).toEqual([]);
  });
  it('counts unique skills case-insensitively and only existing open blockers', () => {
    expect(getStats([entry, { ...entry, id: 'b', hours: 1.5, skills: ['react', 'Python'], blockers: '' }])).toEqual({ totalEntries: 2, totalHours: 8, uniqueSkills: 3, openBlockers: 1 });
  });
});
