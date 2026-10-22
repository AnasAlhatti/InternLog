import { useState } from "react";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Copy, Download, Eye, Loader2,
  PencilLine, RefreshCw, RotateCcw, Sparkles, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/domain";
import type { WeeklyReportViewProps } from "./weekly-report-view.types";

// Links and images from imported notes render as inert text: no fetches, no navigation.
const safeComponents: Components = {
  p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
  li: ({ children }) => <li className="whitespace-pre-line">{children}</li>,
  a: ({ children }) => <span className="underline decoration-dotted underline-offset-2">{children}</span>,
  img: ({ alt }) => (alt ? <span className="text-muted-foreground">[image: {alt}]</span> : null),
};

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown skipHtml components={safeComponents}>
      {text}
    </ReactMarkdown>
  );
}

const proseClass =
  "prose prose-sm max-w-none text-foreground md:prose-base prose-headings:font-serif prose-headings:text-foreground prose-h1:text-3xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:text-xl prose-h3:font-mono prose-h3:text-xs prose-h3:uppercase prose-h3:tracking-widest prose-h3:text-primary prose-strong:text-foreground prose-li:marker:text-primary prose-p:text-foreground/85";

export default function WeeklyReportView(p: WeeklyReportViewProps) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const empty = p.entries.length === 0 && !p.hasDraft;
  const canGenerate = !p.aiPending && !p.storageBlocked && p.entries.length > 0;

  return (
    <div className="space-y-6">
      <header className="rise">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Weekly report</p>
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">Your week, ready to share</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Your Monday-to-Sunday entries, ready to read and edit. Add an optional AI draft, then review before sharing.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-card-border bg-card p-2 shadow-sm">
        <Button variant="ghost" size="icon" aria-label="Previous week" onClick={p.onPrevious} data-testid="button-prev-week"><ChevronLeft className="h-4 w-4" /></Button>
        <p className="flex-1 text-center font-mono text-sm" data-testid="text-week-range">
          {formatDate(p.start)} <span className="text-muted-foreground">to</span> {formatDate(p.end)}
        </p>
        <Button variant="ghost" size="icon" aria-label="Next week" onClick={p.onNext} data-testid="button-next-week"><ChevronRight className="h-4 w-4" /></Button>
        {!p.thisWeek && <Button variant="outline" size="sm" onClick={p.onThisWeek} data-testid="button-this-week">This week</Button>}
      </div>

      {empty ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/60 p-10 text-center" data-testid="empty-report">
          <CalendarDays className="mx-auto h-7 w-7 text-primary" aria-hidden />
          <h2 className="mt-3 text-xl font-semibold">Nothing logged this week</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">There is nothing to summarize, and we will not make anything up. Add an entry dated inside this week, or browse another week.</p>
          <Link href="/entries?new=1" className="mt-5 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="button-report-add">Add an entry</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            {/* AI summary */}
            <section aria-labelledby="ai-summary-title" className="rounded-3xl border border-card-border bg-accent/40 p-5 shadow-sm" data-testid="section-ai-summary">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="ai-summary-title" className="flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-4 w-4 text-accent-foreground" aria-hidden /> Summary for your supervisor
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Optional. Only runs when you ask.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.summary && (
                    <Button variant="ghost" size="sm" onClick={p.onRemoveSummary} disabled={p.aiPending} data-testid="button-remove-summary">
                      <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />Remove
                    </Button>
                  )}
                  <Button size="sm" variant={p.summary ? "outline" : "default"} onClick={() => setConfirmOpen(true)} disabled={!canGenerate} data-testid="button-ai-summary">
                    {p.aiPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : p.summary ? <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden /> : <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />}
                    {p.aiPending ? "Summarizing" : p.summary ? "Regenerate summary" : "Draft AI summary"}
                  </Button>
                </div>
              </div>

              {p.storageBlocked && <p className="mt-3 text-xs text-muted-foreground" data-testid="text-ai-storage-blocked">AI summaries are unavailable while browser storage is blocked.</p>}

              {p.aiPending && (
                <div className="mt-4 space-y-2" aria-live="polite" data-testid="status-ai-pending">
                  <span className="sr-only">Generating summary</span>
                  <div className="h-3 w-11/12 animate-pulse rounded bg-accent" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-accent" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-accent" />
                </div>
              )}

              {p.aiError && !p.aiPending && (
                <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" data-testid="text-ai-error">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{p.aiError}</span>
                  <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)} disabled={!canGenerate} data-testid="button-ai-retry">Try again</Button>
                </div>
              )}

              {p.summary && !p.aiPending && (
                <div className="mt-4 rounded-2xl border border-card-border bg-card p-4" data-testid="text-ai-summary">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-secondary-foreground">AI draft</span>
                    {p.summaryStale && <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-foreground" data-testid="badge-summary-stale">Out of date: entries changed</span>}
                  </div>
                  <div className={proseClass}><Markdown text={p.summary} /></div>
                  <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                    {p.summaryStale ? "This draft is out of date and excluded from Copy and Download. Regenerate it from the latest entries." : "Review for accuracy before sharing. This summary is included in Copy and Download."}
                  </p>
                </div>
              )}

              {!p.summary && !p.aiPending && !p.aiError && (
                <p className="mt-3 text-sm text-foreground/75">Turn this week's entries into a short paragraph your supervisor can skim in thirty seconds.</p>
              )}
            </section>

            {/* Document */}
            <section className="rounded-3xl border border-card-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{p.entries.length}</span> {p.entries.length === 1 ? "entry" : "entries"} this week
                  {p.edited && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground" data-testid="badge-edited">Edited</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)} aria-pressed={editing} data-testid="button-toggle-edit">
                    {editing ? <><Eye className="mr-1.5 h-4 w-4" aria-hidden />Preview</> : <><PencilLine className="mr-1.5 h-4 w-4" aria-hidden />Edit report</>}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={p.onReset} disabled={!p.edited && !p.hasDraft} data-testid="button-regenerate"><RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />Reset to entries</Button>
                  <Button variant="outline" size="sm" onClick={p.onCopy} data-testid="button-copy-report"><Copy className="mr-1.5 h-4 w-4" aria-hidden />Copy</Button>
                  <Button size="sm" onClick={p.onDownload} data-testid="button-download-report"><Download className="mr-1.5 h-4 w-4" aria-hidden />Download .md</Button>
                </div>
              </div>
              {editing ? (
                <>
                  <label htmlFor="report-md" className="sr-only">Report markdown</label>
                  <textarea
                    id="report-md"
                    value={p.text}
                    onChange={(e) => p.onTextChange(e.target.value)}
                    spellCheck
                    autoFocus
                    className="block min-h-[60vh] w-full resize-y rounded-b-3xl bg-transparent px-5 py-5 font-mono text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    data-testid="textarea-report"
                  />
                </>
              ) : (
                <article className={`${proseClass} paper-dots rounded-b-3xl px-6 py-8 md:px-10`} data-testid="report-preview">
                  <Markdown text={p.text} />
                </article>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-card-border bg-card p-5 shadow-sm">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">At a glance</p>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {[
                  ["Hours", p.stats.totalHours, "stat-hours"],
                  ["Entries", p.stats.totalEntries, "stat-entries"],
                  ["Skills", p.stats.uniqueSkills, "stat-skills"],
                  ["Open blockers", p.stats.openBlockers, "stat-blockers"],
                ].map(([label, value, id]) => (
                  <div key={id} className="rounded-2xl bg-secondary/60 px-3 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className="font-serif text-2xl font-semibold" data-testid={String(id)}>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {(p.profile.name || p.profile.role || p.profile.organization) && (
              <div className="rounded-3xl border border-card-border bg-card p-5 text-sm shadow-sm" data-testid="card-report-profile">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Prepared by</p>
                <p className="mt-2 font-semibold">{p.profile.name || "Unnamed intern"}</p>
                <p className="text-muted-foreground">{[p.profile.role, p.profile.organization].filter(Boolean).join(", ")}</p>
              </div>
            )}
            <p className="px-2 text-xs text-muted-foreground">Copy and Download include {p.summary && !p.summaryStale ? "the summary plus " : ""}your current edits.</p>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive={false}
        title="Send this week to AI?"
        description="Only the selected week's entries are sent through Replit AI Integrations to OpenAI to draft a summary. Your profile and other weeks are excluded. Processing uses credits, and the draft can be wrong, so review it for accuracy before sharing."
        confirmLabel="Draft summary"
        onConfirm={() => { setConfirmOpen(false); p.onGenerateSummary(); }}
      />
    </div>
  );
}
