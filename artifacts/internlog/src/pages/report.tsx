import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Copy, Download, RotateCcw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJournalContext } from "@/components/journal-context";
import { filterEntries, formatDate, generateReport, localDate, shiftDate, weekBounds } from "@/lib/domain";
import { useToast } from "@/hooks/use-toast";

export default function ReportPage({ initialDate }: { initialDate?: string }) {
  const { data } = useJournalContext();
  const { toast } = useToast();
  const [anchor, setAnchor] = useState(initialDate ?? localDate());
  const { start, end } = weekBounds(anchor);
  const weekEntries = useMemo(() => filterEntries(data.entries, { from: start, to: end }), [data.entries, start, end]);
  const generated = useMemo(() => generateReport(data.entries, anchor, data.profile), [data.entries, anchor, data.profile]);
  const [text, setText] = useState(generated);
  useEffect(() => setText(generated), [generated]);
  const edited = text !== generated;
  const thisWeek = weekBounds(localDate()).start === start;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Report copied", description: "Paste it wherever your team does updates." });
    } catch {
      toast({ title: "Could not copy", description: "Your browser blocked clipboard access. Select the text and copy manually.", variant: "destructive" });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `internlog-week-${start}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast({ title: "Report downloaded", description: a.download });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold md:text-4xl">Weekly report</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Built only from what you logged, Monday to Sunday. Nothing is added or embellished. Edit freely before sharing.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-card-border bg-card p-2 shadow-sm">
        <Button variant="ghost" size="icon" aria-label="Previous week" onClick={() => setAnchor(shiftDate(start, -7))} data-testid="button-prev-week"><ChevronLeft className="h-4 w-4" /></Button>
        <p className="flex-1 text-center font-mono text-sm" data-testid="text-week-range">
          {formatDate(start)} <span className="text-muted-foreground">to</span> {formatDate(end)}
        </p>
        <Button variant="ghost" size="icon" aria-label="Next week" onClick={() => setAnchor(shiftDate(start, 7))} data-testid="button-next-week"><ChevronRight className="h-4 w-4" /></Button>
        {!thisWeek && <Button variant="outline" size="sm" onClick={() => setAnchor(localDate())} data-testid="button-this-week">This week</Button>}
      </div>

      {weekEntries.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/60 p-10 text-center" data-testid="empty-report">
          <CalendarDays className="mx-auto h-7 w-7 text-primary" aria-hidden />
          <h2 className="mt-3 text-xl font-semibold">Nothing logged this week</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">There is nothing to summarize, and we will not make anything up. Add an entry dated inside this week, or browse another week.</p>
          <Link href="/entries?new=1" className="mt-5 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="button-report-add">Add an entry</Link>
        </div>
      ) : (
        <div className="rounded-3xl border border-card-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{weekEntries.length}</span> {weekEntries.length === 1 ? "entry" : "entries"} this week
              {edited && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">Edited</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setText(generated)} disabled={!edited} data-testid="button-regenerate"><RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />Reset to entries</Button>
              <Button variant="outline" size="sm" onClick={copy} data-testid="button-copy-report"><Copy className="mr-1.5 h-4 w-4" aria-hidden />Copy</Button>
              <Button size="sm" onClick={download} data-testid="button-download-report"><Download className="mr-1.5 h-4 w-4" aria-hidden />Download .md</Button>
            </div>
          </div>
          <label htmlFor="report-md" className="sr-only">Report markdown</label>
          <textarea
            id="report-md"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck
            className="block min-h-[60vh] w-full resize-y rounded-b-3xl bg-transparent px-5 py-5 font-mono text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            data-testid="textarea-report"
          />
        </div>
      )}
    </div>
  );
}
