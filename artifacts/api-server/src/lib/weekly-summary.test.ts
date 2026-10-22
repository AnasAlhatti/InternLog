import { expect, it } from "vitest";
import { summaryEvidence } from "./weekly-summary";

it("never presents an empty resolved status as evidence of a resolved blocker", () => {
  const base = { date: "2026-10-19", title: "Built a form", tasks: "Added labels", learning: "", nextSteps: "Review feedback", hours: 6, skills: [] };
  const evidence = JSON.parse(summaryEvidence({ weekStart: "2026-10-19", entries: [
    { ...base, blockers: "", blockerStatus: "resolved" },
    { ...base, blockers: "Waiting for documentation", blockerStatus: "open" },
  ] }));
  expect(evidence.entries[0]).not.toHaveProperty("blockerStatus");
  expect(evidence.entries[0]).not.toHaveProperty("blockers");
  expect(evidence.entries[1].blockerStatus).toBe("open");
  expect(evidence.entries[1].blockers).toBe("Waiting for documentation");
});
