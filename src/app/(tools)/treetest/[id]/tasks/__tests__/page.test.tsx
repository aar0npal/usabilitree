import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import TreeTestPage from "../page";

vi.mock("@/env", () => ({ env: {} }));
vi.mock("react-idle-timer", () => ({ useIdleTimer: () => ({ getTotalActiveTime: () => 0 }) }));
vi.mock("@/lib/treetest/actions", () => ({
  loadTestConfig: vi.fn(async () => ({
    participantId: "participant-1",
    randomizeTasks: false,
    tree: [{ name: "Home" }],
    tasks: [{ id: "task-1", description: "Find home" }],
  })),
}));
vi.mock("@/components/tree-test", () => ({
  TreeTestComponent: () => <main data-testid="study" />,
}));
vi.mock("@/components/tree-test-loading-skeleton", () => ({
  LoadingSkeleton: () => <div data-testid="loading" />,
}));

let view: ReactTestRenderer | undefined;

afterEach(() => {
  act(() => view?.unmount());
  vi.unstubAllGlobals();
});

it("loads the study when the browser blocks site storage", async () => {
  const deny = () => {
    throw new DOMException("Access is denied for this document.", "SecurityError");
  };
  vi.stubGlobal("localStorage", { getItem: deny, setItem: deny, removeItem: deny });
  const events = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("window", events);
  vi.stubGlobal("document", events);

  await act(async () => {
    view = create(<TreeTestPage params={{ id: "study-1" }} />);
  });

  expect(view!.root.findAllByProps({ "data-testid": "study" })).toHaveLength(1);
  expect(JSON.stringify(view!.toJSON())).not.toContain("Failed to load the study");
});
