import { afterEach, describe, expect, it, vi } from "vitest";
import { safeStorage } from "../safe-storage";

function blockStorage() {
  const deny = () => {
    throw new DOMException("Access is denied for this document.", "SecurityError");
  };
  vi.stubGlobal("localStorage", { getItem: deny, setItem: deny, removeItem: deny });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safeStorage", () => {
  it("uses localStorage when it is available", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });

    safeStorage.setItem("available", "1");
    expect(store.get("available")).toBe("1");
    expect(safeStorage.getItem("available")).toBe("1");
    safeStorage.removeItem("available");
    expect(store.has("available")).toBe(false);
  });

  it("falls back to memory when storage access throws", () => {
    blockStorage();

    expect(safeStorage.getItem("blocked")).toBeNull();
    safeStorage.setItem("blocked", "participant-1");
    expect(safeStorage.getItem("blocked")).toBe("participant-1");
    safeStorage.removeItem("blocked");
    expect(safeStorage.getItem("blocked")).toBeNull();
  });
});
