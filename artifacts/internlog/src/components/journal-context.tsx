import { createContext, useContext, type ReactNode } from "react";
import type { AppData, EntryInput, Profile, WeeklySummary } from "@/lib/domain";
import { useJournal } from "@/hooks/use-journal";

export interface Journal {
  data: AppData;
  error: string | null;
  recoveryRequired: boolean;
  recoveryRaw: string | null;
  conflict: boolean;
  saveEntry(input: EntryInput, id?: string): boolean | Promise<boolean>;
  deleteEntry(id: string): boolean | Promise<boolean>;
  saveProfile(profile: Profile): boolean | Promise<boolean>;
  saveWeeklySummary(week: string, summary: WeeklySummary | null): boolean | Promise<boolean>;
  replaceData(data: AppData): boolean | Promise<boolean>;
  clearData(): boolean | Promise<boolean>;
  loadSamples(): boolean | Promise<boolean>;
  clearError(): void;
}

export const JournalContext = createContext<Journal | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const journal = useJournal();
  return <JournalContext.Provider value={journal}>{children}</JournalContext.Provider>;
}

export function useJournalContext(): Journal {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error("useJournalContext must be used inside JournalProvider");
  return ctx;
}
