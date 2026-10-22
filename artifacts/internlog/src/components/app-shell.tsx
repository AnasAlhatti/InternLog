import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, FileText, LayoutDashboard, Settings, AlertTriangle, X, HardDrive } from "lucide-react";
import { useJournalContext } from "@/components/journal-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { href: "/entries", label: "Entries", icon: BookOpen, id: "entries" },
  { href: "/report", label: "Weekly report", icon: FileText, id: "report" },
  { href: "/settings", label: "Settings", icon: Settings, id: "settings" },
];

function isActive(loc: string, href: string) {
  return href === "/" ? loc === "/" : loc.startsWith(href);
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg font-bold shadow-sm rotate-[-4deg]">
        i
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">InternLog</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { data, error, conflict, clearError } = useJournalContext();
  const name = data.profile.name.trim();

  return (
    <div className="min-h-[100dvh] bg-background md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar paper-dots sticky top-0 h-[100dvh] px-4 py-6">
        <Link href="/" className="px-2 rounded-lg" data-testid="link-home"><Logo /></Link>
        <nav aria-label="Main" className="mt-10 space-y-1">
          {NAV.map(({ href, label, icon: Icon, id }) => {
            const active = isActive(loc, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                data-testid={`link-nav-${id}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-card text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-card/80 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="flex items-center gap-1.5 font-semibold text-foreground"><HardDrive className="h-3.5 w-3.5 text-primary" aria-hidden />Stored in this browser</p>
          <p className="mt-1">Saved in this browser. AI sharing is optional. Export a backup from Settings now and then.</p>
          {name && <p className="mt-3 border-t border-border pt-3 text-foreground/80" data-testid="text-sidebar-name">Logged in your own words, {name}.</p>}
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 backdrop-blur px-4 py-3">
        <Link href="/" className="rounded-lg" data-testid="link-home-mobile"><Logo /></Link>
      </header>

      <div className="flex-1 min-w-0">
        {conflict && (
          <div role="status" className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-card p-4 text-sm md:mx-10" data-testid="status-storage-conflict">
            <p>Another tab changed this journal. Entry and report drafts are kept in this tab across reloads unless a draft-storage warning is shown. Copy any unsaved notes if storage is unavailable. Saves and replacements are blocked to protect the latest data.</p>
            <button className="mt-2 rounded-md border border-border px-3 py-2 font-semibold" onClick={() => {
              if (window.confirm("Reload the latest journal? Entry and report drafts will recover in this tab unless draft storage is unavailable. Copy any other unsaved notes or profile changes first.")) window.location.reload();
            }}>Reload latest journal</button>
          </div>
        )}
        {error && (
          <div role="alert" className="mx-4 mt-4 md:mx-10 md:mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" data-testid="status-storage-error">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Your browser could not save that change.</p>
              <p className="mt-0.5 text-foreground/80">{error}</p>
            </div>
            <button onClick={clearError} aria-label="Dismiss storage error" className="rounded-md p-1 hover:bg-destructive/10" data-testid="button-dismiss-error">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">{children}</main>
      </div>

      <nav aria-label="Main mobile" className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {NAV.map(({ href, label, icon: Icon, id }) => {
            const active = isActive(loc, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} data-testid={`link-mobile-${id}`} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  <Icon className="h-5 w-5" aria-hidden />
                  {label.replace("Weekly report", "Report")}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
