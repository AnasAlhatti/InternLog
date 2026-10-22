import { Clock, CircleDot, CheckCircle2 } from "lucide-react";
import { formatDate, type Entry } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function BlockerBadge({ entry }: { entry: Entry }) {
  if (!entry.blockers.trim()) return null;
  const open = entry.blockerStatus === "open";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", open ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground")} data-testid={`status-blocker-${entry.id}`}>
      {open ? <CircleDot className="h-3 w-3" aria-hidden /> : <CheckCircle2 className="h-3 w-3" aria-hidden />}
      {open ? "Open blocker" : "Blocker resolved"}
    </span>
  );
}

export function EntryCard({ entry, selected, onSelect }: { entry: Entry; selected?: boolean; onSelect(): void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={`card-entry-${entry.id}`}
      className={cn(
        "group w-full text-left rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-primary/50 ring-2 ring-primary/20" : "border-card-border",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <time dateTime={entry.date} className="font-mono">{formatDate(entry.date)}</time>
        <span className="inline-flex items-center gap-1 font-mono"><Clock className="h-3 w-3" aria-hidden />{entry.hours}h</span>
      </div>
      <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug" data-testid={`text-entry-title-${entry.id}`}>{entry.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{entry.tasks}</p>
      {(entry.skills.length > 0 || entry.blockers.trim()) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <BlockerBadge entry={entry} />
          {entry.skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-foreground/75">{s}</span>
          ))}
          {entry.skills.length > 4 && <span className="text-[11px] text-muted-foreground">+{entry.skills.length - 4}</span>}
        </div>
      )}
    </button>
  );
}
