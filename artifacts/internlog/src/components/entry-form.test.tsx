import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "./entry-form";
import type { Entry, EntryInput } from "@/lib/domain";

const existing: Entry = {
  id: "e1",
  date: "2025-03-04",
  title: "Wrote API tests",
  tasks: "Covered the auth module",
  learning: "Mocking fetch",
  blockers: "CI is flaky",
  blockerStatus: "open",
  nextSteps: "Ask about CI",
  hours: 6.5,
  skills: ["Testing", "TypeScript"],
};

describe("EntryForm", () => {
  it("shows required-field errors and does not submit when empty", async () => {
    const onSubmit = vi.fn((_input: EntryInput) => true);
    render(<EntryForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.clear(screen.getByLabelText(/^date/i));
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^title/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("rejects hours outside 0..24", async () => {
    const onSubmit = vi.fn((_input: EntryInput) => true);
    render(<EntryForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/^title/i), "Day one");
    await userEvent.type(screen.getByLabelText(/what did you work on/i), "Setup");
    const hours = screen.getByLabelText(/hours/i);
    await userEvent.clear(hours);
    await userEvent.type(hours, "30");
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(hours).toHaveAttribute("aria-invalid", "true");
  });

  it("submits a valid entry with parsed numbers and skill tags", async () => {
    const onSubmit = vi.fn((_input: EntryInput) => true);
    render(<EntryForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/^title/i), "Day one");
    await userEvent.type(screen.getByLabelText(/what did you work on/i), "Setup laptop");
    const hours = screen.getByLabelText(/hours/i);
    await userEvent.clear(hours);
    await userEvent.type(hours, "7.5");
    await userEvent.type(screen.getByLabelText(/skills/i), "Git, React{enter}");
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const input = onSubmit.mock.calls[0][0];
    expect(input).toMatchObject({ title: "Day one", tasks: "Setup laptop", hours: 7.5, blockerStatus: "open" });
    expect(input.skills).toEqual(["Git", "React"]);
    expect(input).not.toHaveProperty("id");
  });

  it("prefills when editing and allows removing a skill", async () => {
    const onSubmit = vi.fn((_input: EntryInput) => true);
    render(<EntryForm initial={existing} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByLabelText(/^title/i)).toHaveValue("Wrote API tests");
    await userEvent.click(screen.getByRole("button", { name: /remove skill testing/i }));
    await userEvent.click(screen.getByRole("radio", { name: /resolved/i }));
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ skills: ["TypeScript"], blockerStatus: "resolved", hours: 6.5 });
  });

  it("cancel calls onCancel", async () => {
    const onCancel = vi.fn();
    render(<EntryForm onSubmit={() => true} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
