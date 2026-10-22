import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DraftProvider } from "@/components/draft-context";
import { EntryForm } from "@/components/entry-form";
import { DRAFT_KEY } from "@/components/draft-context";
import type { Entry } from "@/lib/domain";

afterEach(() => vi.restoreAllMocks());
const existing: Entry = { id: "new", date: "2026-10-19", title: "Saved title", tasks: "Saved work", learning: "", blockers: "", blockerStatus: "open", nextSteps: "", hours: 2, skills: [] };

const form = (save = vi.fn(() => false)) => (
  <DraftProvider><EntryForm onSubmit={save} onCancel={() => {}} /></DraftProvider>
);

describe("entry draft lifecycle", () => {
  it("keeps a new-entry draft separate from an imported entry whose ID is new", async () => {
    const first = render(form());
    await userEvent.type(screen.getByLabelText(/^title/i), "Unfinished new entry");
    first.unmount();
    render(<DraftProvider><EntryForm initial={existing} onSubmit={() => false} onCancel={() => {}} /></DraftProvider>);
    expect(screen.getByLabelText(/^title/i)).toHaveValue("Saved title");
  });

  it("requires review after the committed entry changed while preserving the recovered edits", async () => {
    const first = render(<DraftProvider><EntryForm initial={existing} onSubmit={() => false} onCancel={() => {}} /></DraftProvider>);
    await userEvent.type(screen.getByLabelText(/what did you learn/i), "Draft learning");
    first.unmount();
    render(<DraftProvider><EntryForm initial={{ ...existing, tasks: "Work from another tab" }} onSubmit={() => false} onCancel={() => {}} /></DraftProvider>);
    expect(screen.getByLabelText(/what did you learn/i)).toHaveValue("Draft learning");
    expect(screen.getByRole("button", { name: /save entry/i })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /I reviewed/i }));
    expect(screen.getByRole("button", { name: /save entry/i })).toBeEnabled();
  });

  it("warns on storage failure, keeps edits during page changes, and guards refresh", async () => {
    function Switcher() {
      const [show, setShow] = useState(true);
      return <><button onClick={() => setShow(!show)}>Switch page</button>{show && <EntryForm onSubmit={() => false} onCancel={() => {}} />}</>;
    }
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
    render(<DraftProvider><Switcher /></DraftProvider>);
    await userEvent.type(screen.getByLabelText(/^title/i), "Memory draft");
    expect(screen.getByRole("alert")).toHaveTextContent(/may be lost on refresh/i);
    await userEvent.click(screen.getByRole("button", { name: /switch page/i }));
    await userEvent.click(screen.getByRole("button", { name: /switch page/i }));
    expect(screen.getByLabelText(/^title/i)).toHaveValue("Memory draft");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    write.mockRestore();
    await userEvent.type(screen.getByLabelText(/^title/i), " saved");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const safe = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(safe);
    expect(safe.defaultPrevented).toBe(false);
  });

  it("does not overwrite unreadable draft bytes", async () => {
    sessionStorage.setItem(DRAFT_KEY, "{broken draft");
    render(form());
    await userEvent.type(screen.getByLabelText(/^title/i), "New memory draft");
    expect(sessionStorage.getItem(DRAFT_KEY)).toBe("{broken draft");
    expect(screen.getByRole("alert")).toHaveTextContent(/storage is unavailable/i);
  });
  it("recovers every raw field after remount without committing journal data", async () => {
    const first = render(form());
    await userEvent.type(screen.getByLabelText(/^title/i), " Unfinished ");
    await userEvent.clear(screen.getByLabelText(/hours/i));
    await userEvent.type(screen.getByLabelText(/skills/i), "Pending tag");
    await userEvent.type(screen.getByLabelText(/what did you learn/i), "My notes");
    first.unmount();
    render(form());
    expect(screen.getByLabelText(/^title/i)).toHaveValue(" Unfinished ");
    expect(screen.getByLabelText(/hours/i)).toHaveValue(null);
    expect(screen.getByLabelText(/skills/i)).toHaveValue("Pending tag");
    expect(screen.getByLabelText(/what did you learn/i)).toHaveValue("My notes");
    expect(screen.getByText(/draft recovered/i)).toBeInTheDocument();
    expect(localStorage.getItem("internlog.data.v1")).toBeNull();
  });

  it("retains failed saves, but removes drafts after successful saves", async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const first = render(form(save));
    await userEvent.type(screen.getByLabelText(/^title/i), "Work");
    await userEvent.type(screen.getByLabelText(/what did you work on/i), "Notes");
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    first.unmount();
    const second = render(form(save));
    expect(screen.getByLabelText(/^title/i)).toHaveValue("Work");
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    second.unmount();
    render(form());
    expect(screen.getByLabelText(/^title/i)).toHaveValue("");
  });

  it("requires confirmation to discard a draft", async () => {
    render(form());
    await userEvent.type(screen.getByLabelText(/^title/i), "Keep me");
    await userEvent.click(screen.getByRole("button", { name: /discard draft/i }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByTestId("button-confirm-cancel"));
    expect(screen.getByLabelText(/^title/i)).toHaveValue("Keep me");
    await userEvent.click(screen.getByRole("button", { name: /discard draft/i }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByTestId("button-confirm-action"));
    expect(screen.getByLabelText(/^title/i)).toHaveValue("");
  });
});
