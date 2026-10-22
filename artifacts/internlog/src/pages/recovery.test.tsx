import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { JournalProvider } from '@/components/journal-context';
import { AppShell } from '@/components/app-shell';
import { STORAGE_KEY } from '@/lib/storage';
import SettingsPage from './settings';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function renderRecovery() {
  localStorage.setItem(STORAGE_KEY, '{recoverable damaged JSON');
  render(<Router><JournalProvider><AppShell><SettingsPage /></AppShell></JournalProvider></Router>);
}
it('still requires sample replacement confirmation after the error is dismissed', async () => {
  renderRecovery();
  await userEvent.click(screen.getByLabelText('Dismiss storage error'));
  await userEvent.click(screen.getByTestId('button-load-samples'));
  const dialog = screen.getByRole('alertdialog');
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{recoverable damaged JSON');
  await userEvent.click(within(dialog).getByRole('button', { name: /keep things as they are/i }));
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{recoverable damaged JSON');
});
it('exports the original damaged bytes as a clearly labeled rescue file, never an empty backup', async () => {
  const blobs: Blob[] = [];
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob: Blob) { blobs.push(blob); return 'blob:rescue'; }
    static revokeObjectURL() {}
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  renderRecovery();
  expect(screen.queryByTestId('button-export')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /download recovery file/i }));
  expect((click.mock.instances[0] as HTMLAnchorElement).download).toMatch(/recovery.*\.txt$/);
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blobs[0]);
  });
  expect(text).toBe('{recoverable damaged JSON');
});
it('keeps a reload action visible after dismissing a cross-tab conflict warning', async () => {
  renderRecovery();
  act(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  });
  await userEvent.click(screen.getByLabelText('Dismiss storage error'));
  expect(screen.getByRole('button', { name: /reload latest journal/i })).toBeInTheDocument();
  expect(screen.getByTestId('status-storage-conflict')).toHaveTextContent(/copy.*unsaved/i);
});
