import type { Entry, Profile, getStats } from "@/lib/domain";

export interface WeeklyReportViewProps {
  start: string;
  end: string;
  thisWeek: boolean;
  entries: Entry[];
  stats: ReturnType<typeof getStats>;
  profile: Profile;
  text: string;
  edited: boolean;
  summary: string | null;
  summaryStale: boolean;
  aiPending: boolean;
  aiError: string | null;
  storageBlocked: boolean;
  onPrevious(): void;
  onNext(): void;
  onThisWeek(): void;
  onTextChange(text: string): void;
  onReset(): void;
  onCopy(): void;
  onDownload(): void;
  onGenerateSummary(): void;
  onRemoveSummary(): void;
}
