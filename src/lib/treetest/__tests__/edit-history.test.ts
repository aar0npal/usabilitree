import { describe, expect, it } from "vitest";
import { emptyHistory, record, redo, undo } from "@/lib/treetest/edit-history";

describe("undo and redo", () => {
  it("steps back and forward through changes", () => {
    let history = record(emptyHistory<string>(), "a");
    history = record(history, "ab");
    // Now at "abc"
    const [back, afterUndo] = undo(history, "abc")!;
    expect(back).toBe("ab");
    const [forward] = redo(afterUndo, back)!;
    expect(forward).toBe("abc");
  });

  it("undoes typing in one field as one step", () => {
    let history = emptyHistory<string>();
    for (const before of ["", "R", "Re", "Ren"]) history = record(history, before, "rename:row-1");
    const [back] = undo(history, "Rene")!;
    expect(back).toBe("");
  });

  it("starts a new step when the field changes, or after an undo", () => {
    let history = record(emptyHistory<string>(), "", "rename:row-1");
    history = record(history, "Home", "rename:row-2");
    expect(history.past).toEqual(["", "Home"]);
    const [, afterUndo] = undo(history, "Home, Shop")!;
    expect(record(afterUndo, "Home", "rename:row-2").past).toEqual(["", "Home"]);
  });

  it("drops the redo once something new happens", () => {
    const history = record(emptyHistory<string>(), "a");
    const [, afterUndo] = undo(history, "b")!;
    expect(redo(record(afterUndo, "a"), "c")).toBeNull();
  });

  it("has nothing to undo or redo at the start", () => {
    expect(undo(emptyHistory<string>(), "a")).toBeNull();
    expect(redo(emptyHistory<string>(), "a")).toBeNull();
  });

  it("keeps the last 100 steps", () => {
    let history = emptyHistory<number>();
    for (let i = 0; i < 150; i += 1) history = record(history, i);
    expect(history.past).toHaveLength(100);
    expect(history.past[0]).toBe(50);
  });
});
