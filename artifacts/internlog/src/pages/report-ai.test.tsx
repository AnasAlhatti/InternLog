import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { summarizeWeek } from '@workspace/api-client-react';
import { JournalProvider } from '@/components/journal-context';
import { createSampleData } from '@/lib/domain';
import { summaryInput } from '@/lib/weekly-summary';
import { STORAGE_KEY } from '@/lib/storage';
import ReportPage from './report';

vi.mock('@workspace/api-client-react', async original => ({ ...await original<object>(), summarizeWeek: vi.fn() }));
const request = vi.mocked(summarizeWeek);
const data = { ...createSampleData('2026-10-22'), profile: { name: 'Private name', role: 'Intern', organization: 'Private company' } };
beforeEach(() => {
  request.mockReset().mockResolvedValue({ summary: 'I built accessible components and improved my testing skills.' });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
});
const mount = () => render(<Router><JournalProvider><ReportPage initialDate="2026-10-22" /></JournalProvider></Router>);
async function generate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('button-ai-summary'));
  await user.click(screen.getByTestId('button-confirm-action'));
}
it('requests only the selected week after consent, preserves manual edits, persists and restores the result', async () => {
  const user = userEvent.setup();
  const view = mount();
  expect(request).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: /edit report/i }));
  await user.type(screen.getByTestId('textarea-report'), '\nHuman edit.');
  await user.click(screen.getByTestId('button-ai-summary'));
  expect(request).not.toHaveBeenCalled();
  await user.click(screen.getByTestId('button-confirm-action'));
  await screen.findByTestId('text-ai-summary');
  expect(request.mock.calls[0][0]).toEqual(summaryInput(data.entries, '2026-10-22'));
  expect((screen.getByTestId('textarea-report') as HTMLTextAreaElement).value).toContain('Human edit.');
  await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).weeklySummaries['2026-10-19'].text).toContain('accessible components'));
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  await user.click(screen.getByTestId('button-copy-report'));
  expect(copy).toHaveBeenCalledWith(expect.stringContaining('AI Summary'));
  expect(copy).toHaveBeenCalledWith(expect.stringContaining('Human edit.'));
  view.unmount();
  mount();
  expect(screen.getByTestId('text-ai-summary')).toHaveTextContent('accessible components');
});
it('preserves the journal and shows a recoverable error when AI fails', async () => {
  request.mockRejectedValueOnce(new Error('offline'));
  const raw = localStorage.getItem(STORAGE_KEY);
  mount();
  await generate(userEvent.setup());
  expect(await screen.findByTestId('text-ai-error')).toBeInTheDocument();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  expect(screen.getByTestId('report-preview')).toHaveTextContent('Completed Work');
});
it('discards a late AI response after switching to another week', async () => {
  let complete!: (value: { summary: string }) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  mount();
  const user = userEvent.setup();
  await generate(user);
  await user.click(screen.getByTestId('button-next-week'));
  await act(async () => { complete({ summary: 'Late response for the old week.' }); });
  expect(screen.getByTestId('empty-report')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).weeklySummaries).toBeUndefined();
});
it('retains a generated draft on a storage failure and never pretends it was saved', async () => {
  mount();
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  try {
    await generate(userEvent.setup());
    expect(await screen.findByTestId('text-ai-summary')).toHaveTextContent('accessible components');
    expect(screen.getByTestId('text-ai-error')).toHaveTextContent(/not.*saved|could not save/i);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).weeklySummaries).toBeUndefined();
  } finally { fail.mockRestore(); }
});
it('removes a saved AI draft without deleting any entries', async () => {
  mount();
  const user = userEvent.setup();
  await generate(user);
  await screen.findByTestId('text-ai-summary');
  await user.click(screen.getByTestId('button-remove-summary'));
  await waitFor(() => expect(screen.queryByTestId('text-ai-summary')).not.toBeInTheDocument());
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  expect(saved.weeklySummaries['2026-10-19']).toBeUndefined();
  expect(saved.entries).toHaveLength(data.entries.length);
});
it('flags stale AI drafts and excludes them from sharing until regenerated', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, weeklySummaries: { '2026-10-19': { text: 'An outdated draft.', source: 'old source' } } }));
  mount();
  expect(screen.getByTestId('badge-summary-stale')).toBeInTheDocument();
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  await user.click(screen.getByTestId('button-copy-report'));
  expect(copy).toHaveBeenCalledWith(expect.not.stringContaining('An outdated draft.'));
});
