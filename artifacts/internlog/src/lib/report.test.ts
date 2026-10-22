import { describe, it, expect } from 'vitest';
import { generateReport, createSampleData, emptyData, type Entry } from './domain';

const entry: Entry = { id: '1', date: '2026-10-19', title: 'Onboarding', tasks: 'Configured repository', learning: 'Git branching', blockers: 'Waiting for access', blockerStatus: 'open', nextSteps: 'Review components', hours: 7.5, skills: ['Git'] };
describe('weekly reports and sample data', () => {
  it('includes Monday and Sunday but excludes surrounding dates and resolved blockers', () => {
    const report = generateReport([entry, { ...entry, id: '2', date: '2026-10-25', hours: 1, blockers: 'Resolved access', blockerStatus: 'resolved' }, { ...entry, id: '3', date: '2026-10-26', tasks: 'OUTSIDE', hours: 24 }, { ...entry, id: '4', date: '2026-10-18', tasks: 'BEFORE', hours: 24 }], '2026-10-21', emptyData().profile);
    expect(report).toContain('8.5');
    expect(report).toContain('2026-10-19');
    expect(report).toContain('2026-10-25');
    for (const text of ['Configured repository', 'Git branching', 'Git', 'Waiting for access', 'Review components']) expect(report).toContain(text);
    for (const text of ['OUTSIDE', 'BEFORE', 'Resolved access', 'AI-powered']) expect(report).not.toContain(text);
  });
  it('provides exactly five valid entries with open and resolved blockers', () => {
    const sample = createSampleData();
    expect(sample.entries).toHaveLength(5);
    expect(sample.entries.filter(e => e.blockers && e.blockerStatus === 'open')).toHaveLength(1);
    expect(sample.entries.filter(e => e.blockers && e.blockerStatus === 'resolved')).toHaveLength(1);
  });
});
