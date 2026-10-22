export interface Entry {
  id: string;
  date: string;
  title: string;
  tasks: string;
  learning: string;
  blockers: string;
  blockerStatus: 'open' | 'resolved';
  nextSteps: string;
  hours: number;
  skills: string[];
}
export type EntryInput = Omit<Entry, 'id'>;
export interface Profile { name: string; role: string; organization: string }
export interface AppData { version: 1; entries: Entry[]; profile: Profile }
export const emptyData = (): AppData => ({ version: 1, entries: [], profile: { name: '', role: '', organization: '' } });
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dateObject(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(0);
  result.setFullYear(year, month - 1, day);
  result.setHours(12, 0, 0, 0);
  return result;
}
export function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(dateObject(value)) === value;
}
export function formatDate(value: string): string {
  return dateObject(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
export function shiftDate(value: string, days: number): string {
  const date = dateObject(value);
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function weekBounds(value: string): { start: string; end: string } {
  const day = dateObject(value).getDay();
  const start = shiftDate(value, -(day === 0 ? 6 : day - 1));
  return { start, end: shiftDate(start, 6) };
}
export function validateEntry(input: EntryInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isDate(input.date)) errors.date = 'Choose a valid calendar date.';
  if (typeof input.title !== 'string' || !input.title.trim()) errors.title = 'Add a short title.';
  if (typeof input.tasks !== 'string' || !input.tasks.trim()) errors.tasks = 'Describe your completed tasks.';
  if (typeof input.hours !== 'number' || !Number.isFinite(input.hours) || input.hours < 0 || input.hours > 24) errors.hours = 'Hours must be between 0 and 24.';
  return errors;
}
export function parseBackup(text: string): AppData {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose an InternLog backup.'); }
  const invalid = () => { throw new Error('Invalid InternLog backup. No existing data has been changed.'); };
  if (!value || typeof value !== 'object') return invalid();
  const data = value as AppData;
  if (data.version !== 1 || !Array.isArray(data.entries) || !data.profile || ['name', 'role', 'organization'].some(key => typeof data.profile[key as keyof Profile] !== 'string')) return invalid();
  const ids = new Set<string>();
  const entries: Entry[] = data.entries.map(entry => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id) || Object.keys(validateEntry(entry)).length || ['learning', 'blockers', 'nextSteps'].some(key => typeof entry[key as keyof Entry] !== 'string') || !['open', 'resolved'].includes(entry.blockerStatus) || !Array.isArray(entry.skills) || entry.skills.some(skill => typeof skill !== 'string' || !skill.trim())) return invalid();
    ids.add(entry.id);
    return { id: entry.id, date: entry.date, title: entry.title, tasks: entry.tasks, learning: entry.learning, blockers: entry.blockers, blockerStatus: entry.blockerStatus, nextSteps: entry.nextSteps, hours: entry.hours, skills: [...entry.skills] };
  });
  return { version: 1, entries, profile: { name: data.profile.name, role: data.profile.role, organization: data.profile.organization } };
}
export interface EntryFilters { search?: string; from?: string; to?: string; skill?: string; openOnly?: boolean }
export function filterEntries(entries: Entry[], filters: EntryFilters): Entry[] {
  const search = filters.search?.trim().toLowerCase() || '';
  return entries.filter(entry =>
    (!search || [entry.title, entry.tasks, entry.learning].join(' ').toLowerCase().includes(search)) &&
    (!filters.from || entry.date >= filters.from) && (!filters.to || entry.date <= filters.to) &&
    (!filters.skill || entry.skills.some(skill => skill.toLowerCase() === filters.skill!.toLowerCase())) &&
    (!filters.openOnly || Boolean(entry.blockers.trim() && entry.blockerStatus === 'open'))
  ).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
export function getStats(entries: Entry[]) {
  return {
    totalEntries: entries.length,
    totalHours: Math.round(entries.reduce((sum, entry) => sum + entry.hours, 0) * 100) / 100,
    uniqueSkills: new Set(entries.flatMap(entry => entry.skills.map(skill => skill.trim().toLowerCase()))).size,
    openBlockers: entries.filter(entry => entry.blockers.trim() && entry.blockerStatus === 'open').length,
  };
}
export function generateReport(entries: Entry[], date: string, profile: Profile): string {
  const { start, end } = weekBounds(date);
  const week = filterEntries(entries, { from: start, to: end }).reverse();
  const lines = [
    '# Weekly Progress Report',
    `Week: ${start} – ${end}`,
    ...[profile.name, profile.role, profile.organization].filter(Boolean).map(value => `${value}`),
    '', `Total hours: ${getStats(week).totalHours}`, '', '## Completed Work',
  ];
  const dates = [...new Set(week.map(entry => entry.date))];
  for (const day of dates) {
    lines.push('', `### ${day}`);
    for (const entry of week.filter(item => item.date === day)) lines.push(`- ${entry.title} (${entry.hours} hours)`, entry.tasks);
  }
  lines.push('', '## Lessons Learned and Skills Practiced');
  for (const entry of week) if (entry.learning.trim()) lines.push(`- ${entry.date}: ${entry.learning}`);
  const skills = [...new Map(week.flatMap(entry => entry.skills).map(skill => [skill.toLowerCase(), skill])).values()];
  lines.push(`Skills: ${skills.length ? skills.join(', ') : 'None recorded.'}`, '', '## Open Blockers');
  const blockers = week.filter(entry => entry.blockers.trim() && entry.blockerStatus === 'open');
  lines.push(...(blockers.length ? blockers.map(entry => `- ${entry.date}: ${entry.blockers}`) : ['No open blockers recorded.']));
  lines.push('', '## Next Steps');
  const next = week.filter(entry => entry.nextSteps.trim());
  lines.push(...(next.length ? next.map(entry => `- ${entry.nextSteps}`) : ['No next steps recorded.']));
  return lines.join('\n');
}
export function createSampleData(): AppData {
  const start = weekBounds(localDate()).start;
  const examples = [
    { title: 'A good start: onboarding', tasks: 'Set up the development environment, cloned the team repository, and joined the project walkthrough.', learning: 'Learned the branching workflow and how the team runs code reviews.', skills: ['Git', 'Teamwork'], hours: 6 },
    { title: 'Building my first component', tasks: 'Built a reusable status badge and added accessible labels to the entry form.', learning: 'Practiced React props and learned why labels matter for keyboard users.', skills: ['React', 'Accessibility'], hours: 7 },
    { title: 'Connecting the dashboard', tasks: 'Mapped the dashboard data fields and documented the expected API response.', learning: 'Learned to inspect network requests and write a clear integration checklist.', skills: ['TypeScript', 'Documentation'], hours: 6.5, blockers: 'Waiting for access to the staging API documentation.', blockerStatus: 'open' as const },
    { title: 'Testing and fixing edge cases', tasks: 'Added validation tests and fixed an issue where an empty title could be saved.', learning: 'Used the red–green–refactor cycle to reproduce and fix a bug.', skills: ['Testing', 'TypeScript'], hours: 7, blockers: 'Local test setup was missing a DOM environment; configured it with help from a teammate.', blockerStatus: 'resolved' as const },
    { title: 'Review, polish, and wrap-up', tasks: 'Applied code review feedback, checked the mobile layout, and prepared a short team update.', learning: 'Learned to make smaller pull requests and explain decisions in review notes.', skills: ['React', 'Communication'], hours: 5.5 },
  ];
  return { ...emptyData(), entries: examples.map((example, index) => ({
    id: `sample-${index + 1}`, date: shiftDate(start, index), blockers: '', blockerStatus: 'open', nextSteps: 'Discuss progress and the next task with my supervisor.', ...example,
  })) };
}
