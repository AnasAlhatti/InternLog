import type { WeeklySummaryInput } from "@workspace/api-client-react";
import { filterEntries, weekBounds, type Entry } from "./domain";

export function summaryInput(entries: Entry[], date: string): WeeklySummaryInput {
  const { start, end } = weekBounds(date);
  return {
    weekStart: start,
    entries: filterEntries(entries, { from: start, to: end }).reverse().map(entry => ({
      date: entry.date, title: entry.title, tasks: entry.tasks, learning: entry.learning,
      blockers: entry.blockers, blockerStatus: entry.blockerStatus, nextSteps: entry.nextSteps,
      hours: entry.hours, skills: [...entry.skills],
    })),
  };
}
export const summarySource = (entries: Entry[], date: string) => JSON.stringify(summaryInput(entries, date));

export function includeSummary(report: string, summary: string | null): string {
  if (!summary) return report;
  const section = `## AI Summary\n\n${summary}\n\n*AI-generated draft; review for accuracy before sharing.*\n\n`;
  const index = report.indexOf("## Completed Work");
  return index >= 0 ? `${report.slice(0, index)}${section}${report.slice(index)}` : `${report}\n\n${section}`;
}
