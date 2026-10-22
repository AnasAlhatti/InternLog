import { expect, it } from 'vitest';
import { emptyData, parseBackup, type Entry } from './domain';
import { includeSummary, summaryInput, summarySource } from './weekly-summary';

const entry: Entry = { id: 'private-id', date: '2026-10-19', title: 'Shipped a form', tasks: 'Added validation', learning: 'Learned accessibility', blockers: '', blockerStatus: 'open', nextSteps: 'Write tests', hours: 6, skills: ['React'] };
it('sends only the chosen week and omits private IDs and profile data', () => {
  const input = summaryInput([entry, { ...entry, id: 'other', date: '2026-10-26' }], '2026-10-22');
  expect(input.weekStart).toBe('2026-10-19');
  expect(input.entries).toHaveLength(1);
  expect(input.entries[0]).not.toHaveProperty('id');
  expect(input).not.toHaveProperty('profile');
  expect(summarySource([entry], '2026-10-22')).not.toBe(summarySource([{ ...entry, tasks: 'Different task' }], '2026-10-22'));
});
it('includes the AI draft in shared reports without replacing manual edits', () => {
  const report = '# My report\n\n## Completed Work\nMy carefully edited notes.';
  expect(includeSummary(report, 'Built a form.')).toContain('My carefully edited notes.');
  expect(includeSummary(report, 'Built a form.')).toContain('## AI Summary\n');
  expect(includeSummary(report, null)).toBe(report);
});
it('round-trips summaries in backups and rejects malformed or non-Monday keys', () => {
  const data = { ...emptyData(), weeklySummaries: { '2026-10-19': { text: 'A productive week.', source: '{}' } } };
  expect(parseBackup(JSON.stringify(data))).toEqual(data);
  expect(() => parseBackup(JSON.stringify({ ...data, weeklySummaries: { '2026-10-20': { text: 'No', source: '{}' } } }))).toThrow();
  expect(() => parseBackup(JSON.stringify({ ...data, weeklySummaries: { '2026-10-19': { text: '', source: 123 } } }))).toThrow();
});
