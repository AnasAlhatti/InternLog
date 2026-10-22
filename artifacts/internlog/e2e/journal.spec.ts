import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type { AppData } from '../src/lib/domain';
import { STORAGE_KEY } from '../src/lib/storage';

const importedId = 'imported&new=1#part /?+%';
const journal: AppData = {
  version: 1,
  profile: { name: 'Test intern', role: 'Intern', organization: 'Test lab' },
  entries: [
    {
      id: importedId, date: '2026-10-19', title: 'Imported entry', tasks: 'Original work',
      learning: '', blockers: '', blockerStatus: 'resolved', nextSteps: '', hours: 2, skills: [],
    },
    {
      id: 'second', date: '2026-10-20', title: 'Second entry', tasks: 'More work',
      learning: '', blockers: '', blockerStatus: 'resolved', nextSteps: '', hours: 3, skills: [],
    },
  ],
};

async function rawStorage(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

async function seed(page: Page, raw: string, route: string) {
  await page.goto('/');
  expect(await rawStorage(page)).toBeNull();
  // Seed only this test's fresh context, once. An init script would overwrite
  // the very changes that reload and navigation assertions need to verify.
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: STORAGE_KEY, raw });
  await page.goto(route);
}

test('recovery downloads the original bytes and requires explicit replacement after dismissing the warning', async ({ page }) => {
  const damaged = '{damaged journal\r\n"notes": "Keep my café notes — 原文"\r\n';
  await seed(page, damaged, '/settings');
  await expect(page.getByTestId('button-export')).toHaveCount(0);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download recovery file' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^internlog-recovery-.*\.txt$/);
  expect(await download.failure()).toBeNull();
  const file = await download.path();
  expect(file).not.toBeNull();
  expect(await readFile(file!)).toEqual(Buffer.from(damaged, 'utf8'));
  expect(await rawStorage(page)).toBe(damaged);

  await page.getByLabel('Dismiss storage error').click();
  await page.getByTestId('input-profile-name').fill('Must not overwrite recovery');
  await page.getByTestId('button-save-profile').click();
  await expect(page.getByTestId('status-storage-error')).toContainText('Saved data could not be read');
  expect(await rawStorage(page)).toBe(damaged);
  await page.getByLabel('Dismiss storage error').click();

  await page.getByTestId('button-load-samples').click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  expect(await rawStorage(page)).toBe(damaged);
  await dialog.getByRole('button', { name: 'Keep things as they are' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await rawStorage(page)).toBe(damaged);

  await page.getByTestId('button-load-samples').click();
  await dialog.getByRole('button', { name: 'Replace with samples' }).click();
  await expect(page.getByTestId('button-export')).toBeVisible();
  await expect(page.getByTestId('button-export-recovery')).toHaveCount(0);
  const replacement = await rawStorage(page);
  expect(JSON.parse(replacement!).entries).toHaveLength(5);
  await page.reload();
  await expect(page.getByTestId('button-export')).toBeVisible();
  await expect(page.getByTestId('status-storage-error')).toHaveCount(0);
  expect(await rawStorage(page)).toBe(replacement);
});

test('native Web Locks serialize two same-context tabs without losing the stale tab draft', async ({ page, context }) => {
  const original = JSON.stringify(journal);
  await seed(page, original, '/entries?new=1');
  const other = await context.newPage();
  await other.goto('/entries?new=1');
  for (const [tab, title] of [[page, 'First tab work'], [other, 'Second tab draft']] as const) {
    await tab.getByTestId('input-title').fill(title);
    await tab.getByTestId('input-tasks').fill(`${title} tasks`);
  }

  // Hold the real origin-scoped lock so both app saves must queue behind it.
  // No mocked locks or synthetic storage events: query() proves contention.
  await page.evaluate((key) => new Promise<void>((ready) => {
    void navigator.locks.request(key, async () => {
      await new Promise<void>((release) => {
        (window as Window & { releaseJournalLock?: () => void }).releaseJournalLock = release;
        ready();
      });
    });
  }), STORAGE_KEY);
  const lockState = () => page.evaluate(async (key) => {
    const state = await navigator.locks.query();
    return {
      held: state.held?.filter(lock => lock.name === key).length,
      pending: state.pending?.filter(lock => lock.name === key).length,
    };
  }, STORAGE_KEY);

  try {
    await page.getByTestId('button-save-entry').click();
    await expect.poll(lockState).toEqual({ held: 1, pending: 1 });
    await other.getByTestId('button-save-entry').click();
    await expect.poll(lockState).toEqual({ held: 1, pending: 2 });
    expect(await rawStorage(page)).toBe(original);
  } finally {
    await page.evaluate(() => {
      (window as Window & { releaseJournalLock?: () => void }).releaseJournalLock?.();
    });
  }

  await expect(page.getByTestId('form-entry')).toHaveCount(0);
  await expect(other.getByTestId('status-storage-conflict')).toBeVisible();
  await expect(other.getByTestId('input-title')).toHaveValue('Second tab draft');
  await expect(other.getByTestId('input-tasks')).toHaveValue('Second tab draft tasks');
  const winnerRaw = await rawStorage(page);
  const saved: AppData = JSON.parse(winnerRaw!);
  expect(saved.entries).toHaveLength(journal.entries.length + 1);
  expect(saved.entries.slice(0, journal.entries.length)).toEqual(journal.entries);
  expect(saved.entries.at(-1)?.title).toBe('First tab work');
  expect(await rawStorage(other)).toBe(winnerRaw);
  await expect(page.getByTestId('status-storage-conflict')).toHaveCount(0);

  await other.getByLabel('Dismiss storage error').click();
  await expect(other.getByRole('button', { name: 'Reload latest journal' })).toBeVisible();
  await other.getByTestId('button-save-entry').click();
  await expect(other.getByTestId('status-storage-error')).toContainText('Another tab changed');
  expect(await rawStorage(other)).toBe(winnerRaw);
  await expect(other.getByTestId('input-title')).toHaveValue('Second tab draft');
});

test('browser Back and Forward keep entry detail and new-entry panels in sync with the query string', async ({ page }) => {
  const original = JSON.stringify(journal);
  await seed(page, original, '/');
  await page.getByTestId(`card-entry-${importedId}`).click();
  const importedRoute = `/entries?entry=${encodeURIComponent(importedId)}`;
  const expectDetail = async (id: string, route: string) => {
    await expect(page).toHaveURL(`http://127.0.0.1:4173${route}`);
    await expect(page.getByTestId(`detail-entry-${id}`)).toBeVisible();
    await expect(page.getByTestId('form-entry')).toHaveCount(0);
  };
  const expectNew = async () => {
    await expect(page).toHaveURL('http://127.0.0.1:4173/entries?new=1');
    await expect(page.getByRole('heading', { name: 'New entry', exact: true })).toBeVisible();
    await expect(page.getByTestId('form-entry')).toBeVisible();
    await expect(page.getByTestId(/^detail-entry-/)).toHaveCount(0);
  };
  await expectDetail(importedId, importedRoute);
  await page.getByTestId('button-new-entry').click();
  await expectNew();
  await page.getByTestId('card-entry-second').click();
  await expectDetail('second', '/entries?entry=second');

  await page.goBack();
  await expectNew();
  await page.goBack();
  await expectDetail(importedId, importedRoute);
  await page.goForward();
  await expectNew();
  await page.goForward();
  await expectDetail('second', '/entries?entry=second');
  expect(await rawStorage(page)).toBe(original);
});
