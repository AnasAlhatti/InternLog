import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Plus, Search, Pencil, Trash2, ArrowLeft, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJournalContext } from "@/components/journal-context";
import { EntryCard, BlockerBadge } from "@/components/entry-card";
import { EntryForm } from "@/components/entry-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { filterEntries, formatDate, type Entry, type EntryInput } from "@/lib/domain";
import { useToast } from "@/hooks/use-toast";

type Mode = { kind: "none" } | { kind: "view"; id: string } | { kind: "new" } | { kind: "edit"; id: string };

function Section({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div>
      <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</h3>
      <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed">{text}</p>
    </div>
  );
}

function Detail({ entry, onEdit, onDelete, onBack }: { entry: Entry; onEdit(): void; onDelete(): void; onBack(): void }) {
  return (
    <article className="space-y-6" data-testid={`detail-entry-${entry.id}`}>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground lg:hidden" data-testid="button-back">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to list
      </button>
      <header>
        <p className="font-mono text-xs text-primary">{formatDate(entry.date)} <span className="text-muted-foreground">·</span> <Clock className="inline h-3 w-3" aria-hidden /> {entry.hours}h</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight">{entry.title}</h2>
      </header>
      <Section label="Worked on" text={entry.tasks} />
      <Section label="Learned" text={entry.learning} />
      {entry.blockers.trim() && (
        <div className="rounded-xl bg-muted/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Blocker</h3>
            <BlockerBadge entry={entry} />
          </div>
          <p className="mt-1.5 whitespace-pre-wrap">{entry.blockers}</p>
        </div>
      )}
      <Section label="Next steps" text={entry.nextSteps} />
      {entry.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.skills.map((s) => <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{s}</span>)}
        </div>
      )}
      <div className="flex gap-2 border-t border-border pt-5">
        <Button onClick={onEdit} data-testid="button-edit-entry"><Pencil className="mr-1.5 h-4 w-4" aria-hidden />Edit</Button>
        <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive" data-testid="button-delete-entry"><Trash2 className="mr-1.5 h-4 w-4" aria-hidden />Delete</Button>
      </div>
    </article>
  );
}

export default function EntriesPage() {
  const { data, saveEntry, deleteEntry } = useJournalContext();
  const { toast } = useToast();
  const params = new URLSearchParams(useSearch());
  const [mode, setMode] = useState<Mode>(() =>
    params.get("new") ? { kind: "new" } : params.get("entry") ? { kind: "view", id: params.get("entry")! } : { kind: "none" },
  );
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [skill, setSkill] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const allSkills = useMemo(() => [...new Set(data.entries.flatMap((e) => e.skills))].sort((a, b) => a.localeCompare(b)), [data.entries]);
  const list = useMemo(
    () => [...filterEntries(data.entries, { search, from: from || undefined, to: to || undefined, skill: skill || undefined, openOnly })].sort((a, b) => b.date.localeCompare(a.date)),
    [data.entries, search, from, to, skill, openOnly],
  );
  const filtering = !!(search || from || to || skill || openOnly);
  const current = mode.kind === "view" || mode.kind === "edit" ? data.entries.find((e) => e.id === mode.id) : undefined;

  const onSave = async (input: EntryInput) => {
    const id = mode.kind === "edit" ? mode.id : undefined;
    const ok = await saveEntry(input, id);
    if (ok) {
      toast({ title: id ? "Entry updated" : "Entry saved", description: input.title });
      if (id) setMode({ kind: "view", id });
      else setMode({ kind: "none" });
    }
    return ok;
  };

  const doDelete = async () => {
    if (!confirmId) return;
    if (await deleteEntry(confirmId)) {
      toast({ title: "Entry deleted" });
      setMode({ kind: "none" });
    }
    setConfirmId(null);
  };

  const panelOpen = mode.kind !== "none" && (mode.kind === "new" || !!current);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Entries</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.entries.length} {data.entries.length === 1 ? "day" : "days"} on record, newest first.</p>
        </div>
        <Button onClick={() => setMode({ kind: "new" })} className="rounded-xl" data-testid="button-new-entry"><Plus className="mr-1.5 h-4 w-4" aria-hidden />New entry</Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={panelOpen ? "hidden lg:block space-y-4" : "space-y-4"}>
          <div className="rounded-2xl border border-card-border bg-card p-3 shadow-sm space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" aria-label="Search entries" placeholder="Search titles, tasks, learnings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="space-y-1"><span className="font-semibold">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="input-filter-from" /></label>
              <label className="space-y-1"><span className="font-semibold">To</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="input-filter-to" /></label>
              <label className="space-y-1"><span className="font-semibold">Skill</span>
                <select value={skill} onChange={(e) => setSkill(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" data-testid="select-filter-skill">
                  <option value="">Any skill</option>
                  {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium">
                <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" data-testid="checkbox-open-only" />
                Open blockers only
              </label>
            </div>
            {filtering && (
              <button onClick={() => { setSearch(""); setFrom(""); setTo(""); setSkill(""); setOpenOnly(false); }} className="text-xs font-semibold text-primary hover:underline" data-testid="button-clear-filters">Clear filters</button>
            )}
          </div>

          {list.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center" data-testid="empty-entries">
              <BookOpen className="mx-auto h-6 w-6 text-primary" aria-hidden />
              <p className="mt-3 font-display text-lg font-semibold">{filtering ? "Nothing matches those filters" : "Your journal is a blank page"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{filtering ? "Try a wider date range or a different word." : "Write one entry. Future you will be glad you did."}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((e) => (
                <li key={e.id}><EntryCard entry={e} selected={current?.id === e.id} onSelect={() => setMode({ kind: "view", id: e.id })} /></li>
              ))}
            </ul>
          )}
        </div>

        <div className={panelOpen ? "" : "hidden lg:block"}>
          <div className="lg:sticky lg:top-8 rounded-3xl border border-card-border bg-card p-5 shadow-sm md:p-7">
            {mode.kind === "new" && (
              <>
                <h2 className="mb-5 text-2xl font-semibold">New entry</h2>
                <EntryForm onSubmit={onSave} onCancel={() => setMode({ kind: "none" })} />
              </>
            )}
            {mode.kind === "edit" && current && (
              <>
                <h2 className="mb-5 text-2xl font-semibold">Edit entry</h2>
                <EntryForm key={current.id} initial={current} onSubmit={onSave} onCancel={() => setMode({ kind: "view", id: current.id })} />
              </>
            )}
            {mode.kind === "view" && current && (
              <Detail entry={current} onBack={() => setMode({ kind: "none" })} onEdit={() => setMode({ kind: "edit", id: current.id })} onDelete={() => setConfirmId(current.id)} />
            )}
            {!panelOpen && (
              <div className="py-16 text-center text-muted-foreground">
                <p className="font-display text-xl text-foreground">Pick a day to reread it.</p>
                <p className="mt-1 text-sm">Or start a new one with the button above.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Delete this entry?"
        description="It will be removed from this browser for good. If you have a backup file, it is not affected."
        confirmLabel="Delete entry"
        onConfirm={doDelete}
      />
    </div>
  );
}
