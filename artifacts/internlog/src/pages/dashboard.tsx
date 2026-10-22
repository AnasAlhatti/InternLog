import { Link } from "wouter";
import { Plus, ArrowRight, Clock, Layers, Tag, CircleDot, Sparkles } from "lucide-react";
import { useJournalContext } from "@/components/journal-context";
import { EntryCard } from "@/components/entry-card";
import { getStats, formatDate, localDate } from "@/lib/domain";
import { useLocation } from "wouter";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { data } = useJournalContext();
  const [, navigate] = useLocation();
  const stats = getStats(data.entries);
  const recent = [...data.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const name = data.profile.name.trim();
  const today = localDate();
  const loggedToday = data.entries.some((e) => e.date === today);

  const tiles = [
    { id: "entries", label: "Entries", value: stats.totalEntries, icon: Layers },
    { id: "hours", label: "Hours logged", value: Math.round(stats.totalHours * 100) / 100, icon: Clock },
    { id: "skills", label: "Unique skills", value: stats.uniqueSkills, icon: Tag },
    { id: "blockers", label: "Open blockers", value: stats.openBlockers, icon: CircleDot },
  ];

  return (
    <div className="space-y-10">
      <section className="rise relative overflow-hidden rounded-3xl border border-card-border bg-card p-6 shadow-sm md:p-10">
        <div aria-hidden className="absolute inset-0 paper-dots opacity-60" />
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{formatDate(today)}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl" data-testid="text-greeting">
            {greeting()}{name ? `, ${name}` : ""}.
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            {loggedToday ? "Today is already on the page. Add another note if something else happened." : "A few honest lines a day add up to a week you can actually explain."}
          </p>
          <Link href="/entries?new=1" data-testid="button-add-entry" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5">
            <Plus className="h-4 w-4" aria-hidden /> Add today's entry
          </Link>
        </div>
      </section>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ id, label, value, icon: Icon }, i) => (
          <div key={id} className="rise rounded-2xl border border-card-border bg-card p-5 shadow-sm" style={{ animationDelay: `${80 + i * 60}ms` }}>
            <Icon className={id === "blockers" && value > 0 ? "h-4 w-4 text-accent-foreground" : "h-4 w-4 text-primary"} aria-hidden />
            <p className="mt-3 font-mono text-3xl font-medium tabular-nums" data-testid={`stat-${id}`}>{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Recent entries</h2>
          {recent.length > 0 && (
            <Link href="/entries" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" data-testid="link-all-entries">
              All entries <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-card/60 p-8 text-center md:p-12" data-testid="empty-dashboard">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary rotate-3">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-4 text-xl font-semibold">No entries yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Start with today: what you touched, one thing you learned, and anything in your way. It takes two minutes.
              Want to look around first? Load sample data from Settings.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/entries?new=1" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="button-empty-add">Write first entry</Link>
              <Link href="/settings" className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold" data-testid="link-empty-settings">Go to Settings</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recent.map((e) => (
              <EntryCard key={e.id} entry={e} onSelect={() => navigate(`/entries?entry=${encodeURIComponent(e.id)}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
