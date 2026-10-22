import { Router } from "express";
import { SummarizeWeekBody, SummarizeWeekResponse, type WeeklySummaryInput } from "@workspace/api-zod";
import { generateWeeklySummary, SummaryUnavailableError } from "../lib/weekly-summary";

interface Options {
  generate?: (input: WeeklySummaryInput, signal: AbortSignal) => Promise<string>;
  maxPerHour?: number;
  maxConcurrent?: number;
}
function validDate(day: string): boolean {
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export function createWeeklySummaryRouter({ generate = generateWeeklySummary, maxPerHour = 40, maxConcurrent = 2 }: Options = {}) {
  const router = Router();
  let requests: number[] = [];
  let active = 0;
  router.post("/openai/weekly-summary", async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    // Prevent drive-by browser requests. This public, account-free endpoint is
    // also bounded globally per process, including callers without Origin.
    const origin = req.get("origin");
    const host = req.get("x-forwarded-host")?.split(",")[0].trim() ?? req.get("host");
    if (origin) {
      try {
        if (new URL(origin).host !== host) throw new Error("Cross-origin");
      } catch { res.status(403).json({ error: "AI requests must come from this app." }); return; }
    }
    if (Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8") > 40_000) {
      res.status(413).json({ error: "This week is too large to summarize. Shorten its notes and try again." }); return;
    }
    const parsed = SummarizeWeekBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Choose a week containing valid entries (maximum 100)." }); return; }
    const input = parsed.data;
    if (!validDate(input.weekStart)) { res.status(400).json({ error: "Choose a valid Monday." }); return; }
    const monday = new Date(`${input.weekStart}T12:00:00Z`);
    const end = new Date(monday.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
    if (!validDate(input.weekStart) || monday.getUTCDay() !== 1 || input.entries.some(entry =>
      !validDate(entry.date) || entry.date < input.weekStart || entry.date > end || !entry.title.trim() || !entry.tasks.trim()
    )) { res.status(400).json({ error: "Entries must be valid dates inside the selected Monday–Sunday week." }); return; }
    const now = Date.now();
    requests = requests.filter(time => now - time < 3_600_000);
    if (requests.length >= maxPerHour || active >= maxConcurrent) {
      res.setHeader("Retry-After", String(requests.length >= maxPerHour ? Math.max(1, Math.ceil((requests[0] + 3_600_000 - now) / 1000)) : 30));
      res.status(429).json({ error: "The AI generation limit has been reached. Please try again later." }); return;
    }
    requests.push(now);
    active++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const onClose = () => { if (!res.writableEnded) controller.abort(); };
    res.on("close", onClose);
    try {
      const summary = await generate(input, controller.signal);
      const result = SummarizeWeekResponse.safeParse({ summary: summary.trim() });
      if (!result.success) throw new Error("Invalid AI response.");
      if (!controller.signal.aborted) res.json(result.data);
      else if (!res.destroyed) res.status(504).json({ error: "AI generation timed out. Your report is unchanged; try again." });
    } catch (cause) {
      // Never log entry bodies, raw SDK errors, prompts, or generated text.
      req.log?.warn("Weekly summary generation failed");
      if (!res.destroyed) {
        res.status(cause instanceof SummaryUnavailableError ? 503 : controller.signal.aborted ? 504 : 502)
          .json({ error: "AI summary is unavailable right now. Your report is unchanged; please try again." });
      }
    } finally { clearTimeout(timer); res.off("close", onClose); active--; }
  });
  return router;
}
