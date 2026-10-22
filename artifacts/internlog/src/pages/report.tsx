import { useEffect, useMemo, useRef, useState } from "react";
import { summarizeWeek } from "@workspace/api-client-react";
import WeeklyReportView from "@/components/weekly-report-view";
import { useJournalContext } from "@/components/journal-context";
import { filterEntries, formatDate, generateReport, getStats, localDate, shiftDate, weekBounds, type WeeklySummary } from "@/lib/domain";
import { includeSummary, summaryInput, summarySource } from "@/lib/weekly-summary";
import { useToast } from "@/hooks/use-toast";
import { useDrafts } from "@/components/draft-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export default function ReportPage({ initialDate }: { initialDate?: string }) {
  const { data, saveWeeklySummary, conflict, recoveryRequired } = useJournalContext();
  const { toast } = useToast();
  const { drafts, put, remove } = useDrafts();
  const [reset, setReset] = useState(false);
  const [anchor, setAnchor] = useState(initialDate ?? localDate());
  const { start, end } = weekBounds(anchor);
  const weekEntries = useMemo(() => filterEntries(data.entries, { from: start, to: end }), [data.entries, start, end]);
  const generated = useMemo(() => generateReport(data.entries, anchor, data.profile), [data.entries, anchor, data.profile]);
  const key = `report:${start}`;
  const storedDraft = drafts.find(item => item.kind === "report" && item.key === key);
  const reportDraft = storedDraft?.kind === "report" ? storedDraft : undefined;
  const text = reportDraft?.text ?? generated;
  const setText = (value: string) => {
    if (value === generated) remove(key);
    else put({ kind: "report", key, week: start, source: reportDraft?.source ?? generated, text: value });
  };
  const edited = text !== generated;
  const thisWeek = weekBounds(localDate()).start === start;
  const source = useMemo(() => summarySource(data.entries, start), [data.entries, start]);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [localDraft, setLocalDraft] = useState<(WeeklySummary & { week: string }) | null>(null);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    sequence.current++;
    controller.current?.abort();
    controller.current = null;
    setAiPending(false);
    setAiError(null);
    setLocalDraft(null);
    return () => { sequence.current++; controller.current?.abort(); };
  }, [start, source]);
  const draft = localDraft?.week === start ? localDraft : data.weeklySummaries?.[start];
  const summary = draft?.text ?? null;
  const summaryStale = Boolean(draft && draft.source !== source);
  const storageBlocked = conflict || recoveryRequired;
  const sharedText = includeSummary(text, summaryStale ? null : summary);

  const generateSummary = async () => {
    if (aiPending || storageBlocked || !weekEntries.length) return;
    const input = summaryInput(data.entries, start);
    if (input.entries.length > 100 || new TextEncoder().encode(JSON.stringify(input)).byteLength > 40_000) {
      setAiError("This week is too large for AI. Use at most 100 entries and shorten lengthy notes."); return;
    }
    const id = ++sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    setAiPending(true);
    setAiError(null);
    try {
      const result = await summarizeWeek(input, { signal: abort.signal });
      if (id !== sequence.current || abort.signal.aborted) return;
      if (typeof result.summary !== "string" || !result.summary.trim() || result.summary.length > 6000) throw new Error("Invalid summary");
      const next = { text: result.summary.trim(), source };
      // Retain the result even if browser storage is full; never claim a failed
      // write succeeded, and never replace the manually edited report text.
      setLocalDraft({ ...next, week: start });
      const saved = await saveWeeklySummary(start, next);
      if (id === sequence.current && !saved) setAiError("The AI draft could not be saved. Copy or download it before leaving this page. Check the storage warning before retrying.");
    } catch (cause) {
      if (id !== sequence.current || abort.signal.aborted) return;
      const limited = cause && typeof cause === "object" && "status" in cause && cause.status === 429;
      setAiError(limited ? "The AI generation limit has been reached. Please try again later." : "AI could not generate a summary right now. Your report is unchanged. Please try again.");
    } finally {
      if (id === sequence.current) { setAiPending(false); controller.current = null; }
    }
  };
  const removeSummary = async () => {
    if (aiPending || storageBlocked) return;
    if (await saveWeeklySummary(start, null)) { setLocalDraft(null); setAiError(null); }
    else setAiError("Could not remove the saved summary. Your draft has been kept; check the storage warning.");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sharedText);
      toast({ title: "Report copied", description: "Paste it wherever your team does updates." });
    } catch {
      toast({ title: "Could not copy", description: "Your browser blocked clipboard access. Select the text and copy manually.", variant: "destructive" });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([sharedText], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `internlog-week-${start}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast({ title: "Report downloaded", description: a.download });
  };

  return <>
    <div className="mb-6 space-y-3">
      <p role="status" className="text-xs text-muted-foreground">
        {reportDraft ? "Edited report draft kept. " : ""}
        Edits stay in this tab across pages, weeks, and refreshes. Closing the tab removes drafts. Copy or download to keep a report permanently.
      </p>
      {reportDraft && reportDraft.source !== generated && <p role="alert" className="text-sm text-accent-foreground">Journal entries or profile details changed since this report was edited. Your draft is unchanged. Review it or reset to the latest entries.</p>}
      {drafts.some(item => item.kind === "report") && (
        <section aria-label="Report drafts" className="flex flex-wrap gap-2">
          {drafts.map(item => item.kind === "report" && <Button key={item.key} variant="outline" size="sm" onClick={() => setAnchor(item.week)}>Resume report: {formatDate(item.week)}</Button>)}
        </section>
      )}
    </div>
    <WeeklyReportView
    start={start} end={end} thisWeek={thisWeek} entries={weekEntries} stats={getStats(weekEntries)} profile={data.profile}
    text={text} edited={edited} hasDraft={Boolean(reportDraft)} summary={summary} summaryStale={summaryStale} aiPending={aiPending} aiError={aiError} storageBlocked={storageBlocked}
    onPrevious={() => setAnchor(shiftDate(start, -7))} onNext={() => setAnchor(shiftDate(start, 7))} onThisWeek={() => setAnchor(localDate())}
    onTextChange={setText} onReset={() => setReset(true)} onCopy={copy} onDownload={download}
    onGenerateSummary={generateSummary} onRemoveSummary={removeSummary}
    />
    <ConfirmDialog open={reset} onOpenChange={setReset} title="Discard report edits?" description="This removes the edited draft for this week and regenerates the report from the latest saved entries. Other weeks and your journal are not changed." confirmLabel="Discard edits and reset" onConfirm={() => remove(key)} />
  </>;
}
