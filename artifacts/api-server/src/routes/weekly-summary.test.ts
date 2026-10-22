import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { createWeeklySummaryRouter } from './weekly-summary';

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))); });
const input = { weekStart: '2026-10-19', entries: [{ date: '2026-10-19', title: 'A form', tasks: 'Built validation', learning: 'Accessibility', blockers: '', blockerStatus: 'open', nextSteps: 'Tests', hours: 6, skills: ['React'] }] };
async function start(generate = vi.fn(async (_input: unknown) => 'Built a form and practiced accessibility.'), options = {}) {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use(createWeeklySummaryRouter({ generate, ...options }));
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No test port');
  const post = (body: unknown, headers = {}) => fetch(`http://127.0.0.1:${address.port}/openai/weekly-summary`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { post, generate };
}
it('returns a real generator result and strips unrequested profile/ID fields', async () => {
  const { post, generate } = await start();
  const res = await post({ ...input, profile: { name: 'Never send me' }, entries: input.entries.map(e => ({ ...e, id: 'private' })) });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ summary: 'Built a form and practiced accessibility.' });
  expect(generate.mock.calls[0]?.[0]).toEqual(input);
  expect(res.headers.get('cache-control')).toContain('no-store');
});
it('rejects empty, impossible-date, non-Monday and out-of-week input without AI calls', async () => {
  const { post, generate } = await start();
  for (const body of [
    { ...input, entries: [] },
    { ...input, weekStart: '2026-99-99' },
    { ...input, weekStart: '2026-10-20' },
    { ...input, entries: [{ ...input.entries[0], date: '2026-02-30' }] },
    { ...input, entries: [{ ...input.entries[0], date: '2026-10-26' }] },
  ]) expect((await post(body)).status).toBe(400);
  expect(generate).not.toHaveBeenCalled();
});
it('blocks cross-origin generation and bounds input size', async () => {
  const { post, generate } = await start();
  expect((await post(input, { Origin: 'https://attacker.test' })).status).toBe(403);
  const entries = Array.from({ length: 5 }, () => ({ ...input.entries[0], tasks: 'x'.repeat(10000) }));
  expect((await post({ ...input, entries })).status).toBe(413);
  expect(generate).not.toHaveBeenCalled();
});
it('limits paid generations and returns a retry time', async () => {
  const { post, generate } = await start(undefined, { maxPerHour: 2 });
  expect((await post(input)).status).toBe(200);
  expect((await post(input)).status).toBe(200);
  const res = await post(input);
  expect(res.status).toBe(429);
  expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
  expect(generate).toHaveBeenCalledTimes(2);
});
it('does not expose provider details or fabricate a summary on failure', async () => {
  const { post } = await start(vi.fn(async () => { throw new Error('private upstream detail'); }));
  const res = await post(input);
  expect(res.status).toBe(502);
  expect(await res.text()).not.toContain('private upstream detail');
});
