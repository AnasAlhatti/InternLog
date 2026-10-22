import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import WeeklyReportView from './weekly-report-view';
import type { WeeklyReportViewProps } from './weekly-report-view.types';
import { createSampleData, generateReport, getStats } from '@/lib/domain';
const data = createSampleData('2026-10-22');
const props: WeeklyReportViewProps = {
  start: '2026-10-19', end: '2026-10-25', thisWeek: true, entries: data.entries, stats: getStats(data.entries), profile: data.profile,
  text: generateReport(data.entries, '2026-10-22', data.profile), edited: false, summary: null, summaryStale: false,
  aiPending: false, aiError: null, storageBlocked: false, onPrevious: vi.fn(), onNext: vi.fn(), onThisWeek: vi.fn(), onTextChange: vi.fn(), onReset: vi.fn(), onCopy: vi.fn(), onDownload: vi.fn(), onGenerateSummary: vi.fn(), onRemoveSummary: vi.fn(),
};
it('defaults to a readable document instead of raw markdown, while retaining an editor', async () => {
  render(<WeeklyReportView {...props} />);
  expect(screen.getByRole('heading', { name: 'Completed Work' })).toBeInTheDocument();
  expect(screen.getByText(/^Week:/)).toHaveClass('whitespace-pre-line');
  expect(screen.queryByTestId('textarea-report')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /edit report/i }));
  expect(screen.getByTestId('textarea-report')).toHaveValue(props.text);
});
it('requires explicit consent before sending this week to AI', async () => {
  render(<WeeklyReportView {...props} />);
  await userEvent.click(screen.getByTestId('button-ai-summary'));
  expect(props.onGenerateSummary).not.toHaveBeenCalled();
  const dialog = screen.getByRole('alertdialog');
  expect(dialog).toHaveTextContent(/selected week/i);
  expect(dialog).toHaveTextContent(/OpenAI/i);
  await userEvent.click(screen.getByTestId('button-confirm-action'));
  expect(props.onGenerateSummary).toHaveBeenCalledOnce();
});
it('does not load remote images or run HTML from entry notes', () => {
  render(<WeeklyReportView {...props} text={'# Report\n![tracker](https://example.org/tracker.png)\n<script>alert(1)</script>\nSafe text'} />);
  expect(document.querySelector('img')).toBeNull();
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByText('Safe text')).toBeInTheDocument();
});
