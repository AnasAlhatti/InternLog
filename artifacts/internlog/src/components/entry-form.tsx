import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localDate, validateEntry, type Entry, type EntryInput } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useDrafts, type EntryFields } from "@/components/draft-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Props {
  initial?: Entry;
  draftKey?: string;
  onSubmit(input: EntryInput): boolean | Promise<boolean>;
  onCancel(): void;
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function EntryForm({ initial, draftKey, onSubmit, onCancel }: Props) {
  const { drafts, put, remove } = useDrafts();
  const key = draftKey ?? (initial ? `entry:edit:${initial.id}` : "entry:new");
  const saved = drafts.find(item => item.key === key && item.kind === "entry");
  const draft = saved?.kind === "entry" ? saved : undefined;
  const source = JSON.stringify(initial ?? null);
  const defaults: EntryFields = {
    date: initial?.date ?? localDate(), title: initial?.title ?? "", tasks: initial?.tasks ?? "",
    learning: initial?.learning ?? "", blockers: initial?.blockers ?? "", blockerStatus: initial?.blockerStatus ?? "open",
    nextSteps: initial?.nextSteps ?? "", hours: initial ? String(initial.hours) : "0", skills: initial?.skills ?? [], skillDraft: "",
  };
  const [fields, setFields] = useState(draft?.fields ?? defaults);
  const [recovered] = useState(Boolean(draft));
  const [discard, setDiscard] = useState(false);
  const stale = Boolean(draft && draft.source !== source);
  const { date, title, tasks, learning, blockers, blockerStatus, nextSteps, hours, skills, skillDraft } = fields;
  function updateFields(next: EntryFields) {
    setFields(next);
    if (JSON.stringify(next) === JSON.stringify(defaults)) remove(key);
    else put({ kind: "entry", key, entryId: initial?.id ?? draft?.entryId, source: draft?.source ?? source, fields: next });
  }
  function change<K extends keyof EntryFields>(field: K, value: EntryFields[K] | ((old: EntryFields[K]) => EntryFields[K])) {
    updateFields({ ...fields, [field]: typeof value === "function" ? value(fields[field]) : value });
  }
  const setDate = (v: string) => change("date", v);
  const setTitle = (v: string) => change("title", v);
  const setTasks = (v: string) => change("tasks", v);
  const setLearning = (v: string) => change("learning", v);
  const setBlockers = (v: string) => change("blockers", v);
  const setBlockerStatus = (v: "open" | "resolved") => change("blockerStatus", v);
  const setNextSteps = (v: string) => change("nextSteps", v);
  const setHours = (v: string) => change("hours", v);
  const setSkills = (v: string[] | ((old: string[]) => string[])) => change("skills", v);
  const setSkillDraft = (v: string) => change("skillDraft", v);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const addSkills = (list: string[], parts: string[]) => {
    const next = [...list];
    for (const raw of parts) {
      const s = raw.trim();
      if (s && !next.some((x) => x.toLowerCase() === s.toLowerCase())) next.push(s);
    }
    return next;
  };

  const onSkillChange = (value: string) => {
    if (value.includes(",")) {
      const parts = value.split(",");
      const rest = parts.pop() ?? "";
      updateFields({ ...fields, skills: addSkills(skills, parts), skillDraft: rest.trimStart() });
    } else setSkillDraft(value);
  };

  const onSkillKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateFields({ ...fields, skills: addSkills(skills, [skillDraft]), skillDraft: "" });
    } else if (e.key === "Backspace" && !skillDraft && skills.length) {
      setSkills((cur) => cur.slice(0, -1));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || stale) return;
    const finalSkills = addSkills(skills, [skillDraft]);
    const h = hours.trim() === "" ? NaN : Number(hours);
    const input: EntryInput = {
      date,
      title: title.trim(),
      tasks: tasks.trim(),
      learning: learning.trim(),
      blockers: blockers.trim(),
      blockerStatus,
      nextSteps: nextSteps.trim(),
      hours: h,
      skills: finalSkills,
    };
    const errs: Record<string, string> = { ...validateEntry(input) };
    if (!date && !errs.date) errs.date = "Pick the day this entry is for.";
    if (!input.title && !errs.title) errs.title = "Give the day a short title.";
    if (!input.tasks && !errs.tasks) errs.tasks = "Note at least one thing you worked on.";
    if ((!Number.isFinite(h) || h < 0 || h > 24) && !errs.hours) errs.hours = "Hours must be a number from 0 to 24.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try { if (await onSubmit(input)) remove(key); } finally { setSaving(false); }
  };

  const inv = (k: string) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `f-${k}-error` : undefined,
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5" data-testid="form-entry">
      <p role="status" className="text-xs text-muted-foreground">
        {recovered && draft ? "Draft recovered. " : ""}
        Drafts stay in this tab when you switch pages or refresh. Closing this tab removes them. Cancel keeps your draft; only Save entry updates your journal.
      </p>
      {stale && (
        <div role="alert" className="rounded-xl border border-destructive p-3 text-sm space-y-2">
          <p>The saved entry changed or was removed since this draft began. Review the latest saved values before using this draft. It will not be saved automatically.</p>
          <details><summary>Latest saved entry</summary><pre className="whitespace-pre-wrap break-words">{initial ? JSON.stringify(initial, null, 2) : "This entry no longer exists. Saving will create a new entry."}</pre></details>
          <Button type="button" variant="outline" onClick={() => draft && put({ ...draft, source })}>I reviewed the latest entry — use this draft</Button>
        </div>
      )}
      <fieldset disabled={saving} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field id="f-date" label="Date" error={errors.date}>
          <Input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-date" {...inv("date")} />
        </Field>
        <Field id="f-hours" label="Hours" error={errors.hours}>
          <Input id="f-hours" type="number" inputMode="decimal" min={0} max={24} step={0.25} value={hours} placeholder="0–24" onChange={(e) => setHours(e.target.value)} data-testid="input-hours" {...inv("hours")} />
        </Field>
      </div>
      <Field id="f-title" label="Title" error={errors.title}>
        <Input id="f-title" value={title} placeholder="e.g. Shipped my first pull request" onChange={(e) => setTitle(e.target.value)} data-testid="input-title" {...inv("title")} />
      </Field>
      <Field id="f-tasks" label="What did you work on?" error={errors.tasks}>
        <Textarea id="f-tasks" rows={3} value={tasks} onChange={(e) => setTasks(e.target.value)} data-testid="input-tasks" {...inv("tasks")} />
      </Field>
      <Field id="f-learning" label="What did you learn?" hint="Optional. Small things count.">
        <Textarea id="f-learning" rows={2} value={learning} onChange={(e) => setLearning(e.target.value)} data-testid="input-learning" />
      </Field>
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 space-y-3">
        <Field id="f-blockers" label="Blockers" hint="Optional. Anything slowing you down?">
          <Textarea id="f-blockers" rows={2} value={blockers} onChange={(e) => setBlockers(e.target.value)} data-testid="input-blockers" />
        </Field>
        <fieldset>
          <legend className="text-sm font-semibold mb-2">Blocker status</legend>
          <div className="flex gap-2">
            {(["open", "resolved"] as const).map((s) => (
              <label
                key={s}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-ring",
                  blockerStatus === s
                    ? s === "open"
                      ? "border-accent-foreground/30 bg-accent text-accent-foreground"
                      : "border-primary/30 bg-secondary text-secondary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                <input type="radio" name="blockerStatus" value={s} checked={blockerStatus === s} onChange={() => setBlockerStatus(s)} className="sr-only" data-testid={`radio-status-${s}`} />
                {s === "open" ? "Open" : "Resolved"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <Field id="f-next" label="Next steps" hint="Optional. What will you pick up next?">
        <Textarea id="f-next" rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} data-testid="input-next-steps" />
      </Field>
      <div className="space-y-1.5">
        <label htmlFor="f-skills" className="block text-sm font-semibold">Skills</label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
          {skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary pl-2.5 pr-1 py-0.5 text-xs font-medium text-secondary-foreground">
              {s}
              <button type="button" aria-label={`Remove skill ${s}`} onClick={() => setSkills((cur) => cur.filter((x) => x !== s))} className="rounded-full p-0.5 hover:bg-primary/15" data-testid={`button-remove-skill-${s}`}>
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
          <input
            id="f-skills"
            value={skillDraft}
            onChange={(e) => onSkillChange(e.target.value)}
            onKeyDown={onSkillKey}
            placeholder={skills.length ? "" : "Type a tag, press Enter or comma"}
            className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
            data-testid="input-skills"
          />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {draft && <Button type="button" variant="outline" disabled={saving} onClick={() => setDiscard(true)}>Discard draft</Button>}
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel} data-testid="button-cancel-entry">Cancel</Button>
        <Button type="submit" disabled={saving || stale} data-testid="button-save-entry">{saving ? 'Saving…' : 'Save entry'}</Button>
      </div>
      </fieldset>
      <ConfirmDialog open={discard} onOpenChange={setDiscard} title="Discard this draft?" description="Your unfinished edits will be removed from this tab. Saved journal entries will not change." confirmLabel="Discard draft" onConfirm={() => { remove(key); setFields(defaults); setErrors({}); }} />
    </form>
  );
}
