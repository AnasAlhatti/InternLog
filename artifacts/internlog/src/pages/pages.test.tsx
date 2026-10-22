import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Router, Switch } from "wouter";
import { DraftProvider } from "@/components/draft-context";
import { memoryLocation } from "wouter/memory-location";
import type { ReactNode } from "react";
import { JournalContext, type Journal } from "@/components/journal-context";
import type { AppData, Entry } from "@/lib/domain";
import EntriesPage from "./entries";
import SettingsPage from "./settings";
import ReportPage from "./report";
import DashboardPage from "./dashboard";

const entry = (over: Partial<Entry>): Entry => ({
  id: "x",
  date: "2025-03-04",
  title: "T",
  tasks: "tasks",
  learning: "",
  blockers: "",
  blockerStatus: "resolved",
  nextSteps: "",
  hours: 2,
  skills: [],
  ...over,
});

function makeJournal(data: AppData, over: Partial<Journal> = {}): Journal {
  return {
    data,
    error: null,
    recoveryRequired: false,
    recoveryRaw: null,
    conflict: false,
    saveEntry: vi.fn(() => true),
    deleteEntry: vi.fn(() => true),
    saveProfile: vi.fn(() => true),
    saveWeeklySummary: vi.fn(() => true),
    replaceData: vi.fn(() => true),
    clearData: vi.fn(() => true),
    loadSamples: vi.fn(() => true),
    clearError: vi.fn(),
    ...over,
  };
}

function wrap(ui: ReactNode, journal: Journal, path = "/") {
  const memory = memoryLocation({ path, record: true });
  const rendered = render(
    <Router hook={memory.hook}>
      <JournalContext.Provider value={journal}><DraftProvider>{ui}</DraftProvider></JournalContext.Provider>
    </Router>,
  );
  return { ...rendered, memory };
}

const profile = { name: "Priya", role: "Design intern", organization: "Harbor Lab" };
let data: AppData;
beforeEach(() => {
  data = {
    version: 1,
    profile,
    entries: [
      entry({ id: "a", date: "2025-03-03", title: "Older day", skills: ["Figma"] }),
      entry({ id: "b", date: "2025-03-05", title: "Newer day", skills: ["React"], blockers: "No access", blockerStatus: "open" }),
    ],
  };
});

describe("Dashboard", () => {
  it("round-trips imported IDs containing query and fragment characters", async () => {
    const id = "imported&new=1#part /?+%";
    const j = makeJournal({ ...data, entries: [entry({ id, title: 'Imported entry' })] });
    const { memory } = wrap(<Switch><Route path="/" component={DashboardPage} /><Route path="/entries" component={EntriesPage} /></Switch>, j);
    await userEvent.click(screen.getByTestId(`card-entry-${id}`));
    expect(memory.history?.at(-1)).toBe(`/entries?entry=${encodeURIComponent(id)}`);
    expect(screen.getByTestId(`detail-entry-${id}`)).toBeInTheDocument();
  });
  it("shows helpful empty state and a load-samples action without auto loading", async () => {
    const j = makeJournal({ version: 1, profile, entries: [] });
    wrap(<DashboardPage />, j);
    expect(screen.getByText(/no entries yet/i)).toBeInTheDocument();
    expect(j.loadSamples).not.toHaveBeenCalled();
  });
  it("shows stats", () => {
    wrap(<DashboardPage />, makeJournal(data));
    expect(screen.getByTestId("stat-entries")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-blockers")).toHaveTextContent("1");
  });
});

describe("Entries page", () => {
  it("offers unfinished drafts after cancelling and restores edits separately for each entry", async () => {
    const j = makeJournal(data);
    const first = wrap(<EntriesPage />, j, "/entries?new=1");
    await userEvent.type(screen.getByLabelText(/^title/i), "New draft");
    await userEvent.click(screen.getByTestId("button-cancel-entry"));
    await userEvent.click(screen.getByTestId("card-entry-a"));
    await userEvent.click(screen.getByTestId("button-edit-entry"));
    await userEvent.type(screen.getByLabelText(/what did you learn/i), "Edit draft");
    first.unmount();
    wrap(<EntriesPage />, j, "/entries");
    await userEvent.click(screen.getByRole("button", { name: /resume: new draft/i }));
    expect(screen.getByLabelText(/^title/i)).toHaveValue("New draft");
    await userEvent.click(screen.getByRole("button", { name: /resume: older day/i }));
    expect(screen.getByLabelText(/what did you learn/i)).toHaveValue("Edit draft");
    expect(j.saveEntry).not.toHaveBeenCalled();
  });

  it("lets users review a deleted entry draft and recover it as a new entry", async () => {
    const first = wrap(<EntriesPage />, makeJournal(data), "/entries?entry=a&edit=1");
    await userEvent.type(screen.getByLabelText(/what did you learn/i), "Preserve these notes");
    first.unmount();
    const j = makeJournal({ ...data, entries: [] });
    wrap(<EntriesPage />, j, "/entries");
    await userEvent.click(screen.getByRole("button", { name: /resume: older day/i }));
    expect(screen.getByRole("button", { name: /save entry/i })).toBeDisabled();
    expect(screen.getByLabelText(/what did you learn/i)).toHaveValue("Preserve these notes");
    await userEvent.click(screen.getByRole("button", { name: /I reviewed/i }));
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(j.saveEntry).toHaveBeenCalledWith(expect.objectContaining({ learning: "Preserve these notes" }), undefined);
  });
  it("keeps the panel in sync with same-page URL navigation", async () => {
    const { memory } = wrap(<EntriesPage />, makeJournal(data), "/entries?entry=a");
    expect(screen.getByTestId('detail-entry-a')).toBeInTheDocument();
    act(() => { memory.navigate('/entries?new=1'); });
    expect(screen.getByRole('heading', { name: 'New entry' })).toBeInTheDocument();
    act(() => { memory.navigate('/entries?entry=b'); });
    expect(screen.getByTestId('detail-entry-b')).toBeInTheDocument();
    act(() => { memory.navigate('/entries?entry=a'); });
    expect(screen.getByTestId('detail-entry-a')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('button-edit-entry'));
    expect(memory.history?.at(-1)).toBe('/entries?entry=a&edit=1');
    await userEvent.click(screen.getByTestId('button-cancel-entry'));
    expect(memory.history?.at(-1)).toBe('/entries?entry=a');
  });
  it("lists newest first and filters by search", async () => {
    wrap(<EntriesPage />, makeJournal(data), "/entries");
    const titles = screen.getAllByTestId(/^text-entry-title-/).map((n) => n.textContent);
    expect(titles).toEqual(["Newer day", "Older day"]);
    await userEvent.type(screen.getByLabelText(/search entries/i), "older");
    expect(screen.getAllByTestId(/^text-entry-title-/).map((n) => n.textContent)).toEqual(["Older day"]);
  });

  it("confirms before deleting an entry", async () => {
    const j = makeJournal(data);
    wrap(<EntriesPage />, j, "/entries");
    await userEvent.click(screen.getByTestId("card-entry-b"));
    await userEvent.click(screen.getByRole("button", { name: /^delete/i }));
    expect(j.deleteEntry).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete entry/i }));
    expect(j.deleteEntry).toHaveBeenCalledWith("b");
  });

  it("creates a new entry through the form", async () => {
    const j = makeJournal(data);
    wrap(<EntriesPage />, j, "/entries");
    await userEvent.click(screen.getByTestId("button-new-entry"));
    await userEvent.type(screen.getByLabelText(/^title/i), "Fresh");
    await userEvent.type(screen.getByLabelText(/what did you work on/i), "Stuff");
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(j.saveEntry).toHaveBeenCalledWith(expect.objectContaining({ title: "Fresh" }), undefined);
  });
});

describe("Settings page", () => {
  it("validates imports before asking to replace, including a profile-only journal", async () => {
    const j = makeJournal({ ...data, entries: [] });
    wrap(<SettingsPage />, j, "/settings");
    const file = new File(["backup"], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => JSON.stringify(data) });
    await userEvent.upload(screen.getByTestId("input-import-file"), file);
    const dialog = await screen.findByRole("alertdialog");
    expect(j.replaceData).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: /replace with backup/i }));
    expect(j.replaceData).toHaveBeenCalledWith(data);
  });
  it("rejects malformed imports without changing the journal", async () => {
    const j = makeJournal(data);
    wrap(<SettingsPage />, j, "/settings");
    const file = new File(["broken"], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => '{"version":1}' });
    await userEvent.upload(screen.getByTestId("input-import-file"), file);
    expect(await screen.findByTestId("text-import-error")).toHaveTextContent(/invalid/i);
    expect(j.replaceData).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("asks for confirmation before loading samples when data exists", async () => {
    const j = makeJournal(data);
    wrap(<SettingsPage />, j, "/settings");
    await userEvent.click(screen.getByTestId("button-load-samples"));
    expect(j.loadSamples).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /replace with samples/i }));
    expect(j.loadSamples).toHaveBeenCalled();
  });

  it("loads samples immediately when journal is empty", async () => {
    const j = makeJournal({ version: 1, profile: { name: "", role: "", organization: "" }, entries: [] });
    wrap(<SettingsPage />, j, "/settings");
    await userEvent.click(screen.getByTestId("button-load-samples"));
    expect(j.loadSamples).toHaveBeenCalled();
  });

  it("confirms clearing data", async () => {
    const j = makeJournal(data);
    wrap(<SettingsPage />, j, "/settings");
    await userEvent.click(screen.getByTestId("button-clear-data"));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /clear everything/i }));
    expect(j.clearData).toHaveBeenCalled();
  });

  it("saves profile", async () => {
    const j = makeJournal(data);
    wrap(<SettingsPage />, j, "/settings");
    const name = screen.getByLabelText(/your name/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Sam");
    await userEvent.click(screen.getByTestId("button-save-profile"));
    expect(j.saveProfile).toHaveBeenCalledWith({ ...profile, name: "Sam" });
  });
});

describe("Report page", () => {
  it("keeps independent week drafts through week changes, page changes and remounts", async () => {
    const j = makeJournal({ ...data, entries: [...data.entries, entry({ id: "older", date: "2025-02-26" })] });
    const first = wrap(<ReportPage initialDate="2025-03-04" />, j, "/report");
    await userEvent.click(screen.getByRole("button", { name: /edit report/i }));
    await userEvent.clear(screen.getByLabelText(/report markdown/i));
    await userEvent.type(screen.getByLabelText(/report markdown/i), "Current week edits");
    await userEvent.click(screen.getByRole("button", { name: /previous week/i }));
    await userEvent.clear(screen.getByLabelText(/report markdown/i));
    await userEvent.type(screen.getByLabelText(/report markdown/i), "Previous week edits");
    await userEvent.click(screen.getByRole("button", { name: /next week/i }));
    expect(screen.getByLabelText(/report markdown/i)).toHaveValue("Current week edits");
    first.unmount();
    wrap(<ReportPage initialDate="2025-02-26" />, j, "/report");
    await userEvent.click(screen.getByRole("button", { name: /edit report/i }));
    expect(screen.getByLabelText(/report markdown/i)).toHaveValue("Previous week edits");
    await userEvent.click(screen.getByTestId("button-regenerate"));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByTestId("button-confirm-cancel"));
    expect(screen.getByLabelText(/report markdown/i)).toHaveValue("Previous week edits");
    await userEvent.click(screen.getByTestId("button-regenerate"));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByTestId("button-confirm-action"));
    await userEvent.click(screen.getByRole("button", { name: /next week/i }));
    expect(screen.getByLabelText(/report markdown/i)).toHaveValue("Current week edits");
    expect(j.data.entries).toEqual([...data.entries, entry({ id: "older", date: "2025-02-26" })]);
  });

  it("preserves even an empty edited report when its source entries are removed", async () => {
    const first = wrap(<ReportPage initialDate="2025-03-04" />, makeJournal(data), "/report");
    await userEvent.click(screen.getByRole("button", { name: /edit report/i }));
    await userEvent.clear(screen.getByLabelText(/report markdown/i));
    first.unmount();
    wrap(<ReportPage initialDate="2025-03-04" />, makeJournal({ ...data, entries: [] }), "/report");
    await userEvent.click(screen.getByRole("button", { name: /edit report/i }));
    expect(screen.getByLabelText(/report markdown/i)).toHaveValue("");
    expect(screen.queryByTestId("empty-report")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/changed since this report/i);
  });
  it("shows an empty-week state when no entries in selected week", () => {
    wrap(<ReportPage />, makeJournal({ version: 1, profile, entries: [] }), "/report");
    expect(screen.getByText(/nothing logged this week/i)).toBeInTheDocument();
  });
  it("renders editable markdown and can regenerate", async () => {
    wrap(<ReportPage initialDate="2025-03-04" />, makeJournal(data), "/report");
    await userEvent.click(screen.getByRole('button', { name: /edit report/i }));
    const ta = screen.getByLabelText(/report markdown/i) as HTMLTextAreaElement;
    const original = ta.value;
    expect(original).toContain("Newer day");
    await userEvent.type(ta, " extra");
    expect(ta.value).not.toBe(original);
    await userEvent.click(screen.getByTestId("button-regenerate"));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByTestId("button-confirm-action"));
    expect(ta.value).toBe(original);
  });
});
