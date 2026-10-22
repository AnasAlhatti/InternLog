import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { isDate, weekBounds } from "@/lib/domain";

export const DRAFT_KEY = "internlog.drafts.v1";
const fieldsSchema = z.object({
  date: z.string(), title: z.string(), tasks: z.string(), learning: z.string(),
  blockers: z.string(), blockerStatus: z.enum(["open", "resolved"]), nextSteps: z.string(),
  hours: z.string(), skills: z.array(z.string()), skillDraft: z.string(),
});
export type EntryFields = z.infer<typeof fieldsSchema>;
const draftSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("entry"), key: z.string(), entryId: z.string().optional(), source: z.string(), fields: fieldsSchema }),
  z.object({ kind: z.literal("report"), key: z.string(), week: z.string(), source: z.string(), text: z.string() }),
]);
export type Draft = z.infer<typeof draftSchema>;
const schema = z.object({ version: z.literal(1), drafts: z.array(draftSchema) }).refine(value => {
  const keys = new Set<string>();
  return value.drafts.every(draft => {
    if (keys.has(draft.key)) return false;
    keys.add(draft.key);
    return draft.kind === "entry"
      ? draft.key === (draft.entryId ? `entry:edit:${draft.entryId}` : "entry:new")
      : isDate(draft.week) && weekBounds(draft.week).start === draft.week && draft.key === `report:${draft.week}`;
  });
});
const warning = "Draft storage is unavailable. Your edits are kept in memory while this tab stays open, but may be lost on refresh or close. Copy your notes before leaving.";

function load() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return { drafts: raw === null ? [] : schema.parse(JSON.parse(raw)).drafts, error: null, blocked: false };
  } catch {
    // Do not overwrite unreadable drafts with an empty store.
    return { drafts: [] as Draft[], error: warning, blocked: true };
  }
}

type DraftStore = {
  drafts: Draft[];
  put(draft: Draft): void;
  remove(key: string): void;
};
const Context = createContext<DraftStore | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(load);
  const [drafts, setDrafts] = useState(initial.drafts);
  const [error, setError] = useState(initial.error);
  const current = useRef(drafts);
  const unsafe = useRef(Boolean(error));
  const update = (next: Draft[]) => {
    current.current = next;
    setDrafts(next);
    try {
      if (initial.blocked) throw new Error("Unreadable drafts");
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, drafts: next }));
      unsafe.current = false;
      setError(null);
    } catch {
      unsafe.current = true;
      setError(warning);
    }
  };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!unsafe.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  return (
    <Context.Provider value={{
      drafts,
      put: draft => update([...current.current.filter(item => item.key !== draft.key), draft]),
      remove: key => update(current.current.filter(item => item.key !== key)),
    }}>
      {error && <p role="alert" className="m-4 rounded-xl border border-destructive p-4 text-sm">{error}</p>}
      {children}
    </Context.Provider>
  );
}

export function useDrafts() {
  const store = useContext(Context);
  if (!store) throw new Error("Drafts must be used inside DraftProvider");
  return store;
}
