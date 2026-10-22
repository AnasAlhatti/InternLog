import { useState } from "react";
import { Copy, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./_group.css";

// Extracted from the existing ReportPage document panel. Journal/toast/export
// side effects are replaced at the boundary; the original markup is retained.
const generated = `# Weekly Progress Report
Week: 2026-10-19 – 2026-10-25

Total hours: 32

## Completed Work

### 2026-10-19
- A good start: onboarding (6 hours)
Set up the development environment, cloned the team repository, and joined the project walkthrough.

### 2026-10-20
- Building my first component (7 hours)
Built a reusable status badge and added accessible labels to the entry form.

## Lessons Learned and Skills Practiced
- Practiced React, TypeScript, and accessible forms.`;

export default function Current() {
  const [text, setText] = useState(generated);
  const edited = text !== generated;
  const weekEntries = Array.from({ length: 5 });
  const copy = () => navigator.clipboard.writeText(text);
  const download = () => {};
  return <div className="min-h-screen bg-background p-6 text-foreground">
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
  </div>;
}
