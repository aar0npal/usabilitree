import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TreeTestComponent } from "@/components/tree-test";
import { storeTreeTaskResult } from "@/lib/treetest/actions";
import type { TreeTestConfig } from "@/lib/types/tree-test";

const push = vi.fn();

vi.mock("@/env", () => ({ env: {} }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/treetest/actions", () => ({ storeTreeTaskResult: vi.fn() }));
vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/components/tree-test-navigation", () => ({ Navigation: () => <nav /> }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <dialog>{children}</dialog> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

const store = vi.mocked(storeTreeTaskResult);

const config: TreeTestConfig = {
  tree: [{ name: "Home", link: "/home", children: [] }],
  tasks: [
    { id: "t1", description: "Task one", link: "/home" },
    { id: "t2", description: "Task two", link: "/home" },
    { id: "t3", description: "Task three", link: "/home" },
  ],
  requireConfidenceRating: true,
  randomizeTasks: false,
  allowNonLeafAnswers: false,
  preview: false,
  participantId: "participant",
  studyId: "study",
  customText: {
    instructions: "",
    startTest: "",
    findItHere: "",
    selectAsAnswer: "",
    startTask: "Start task {0}",
    confidenceQuestion: "",
    stronglyAgree: "Agree",
    stronglyDisagree: "Disagree",
    taskProgress: "Task {0} of {1}",
    skipTask: "Skip task",
    submitContinue: "",
    completedMessage: "",
    nextButton: "",
    confidenceDescription: "",
  },
};

let view: ReactTestRenderer;
let pending: (() => void)[];

beforeEach(() => {
  pending = [];
  push.mockReset();
  store.mockReset();
  store.mockImplementation(() => new Promise<void>((resolve) => pending.push(resolve)) as never);
  vi.stubGlobal("window", { scrollTo: vi.fn() });
});
afterEach(() => {
  act(() => view.unmount());
  vi.unstubAllGlobals();
});

function render(initialTaskIndex = 0) {
  act(() => {
    view = create(<TreeTestComponent config={config} initialTaskIndex={initialTaskIndex} />);
  });
}
const heading = () => view.root.findByType("h2").children.join("");
const skipButton = () =>
  view.root.findAll((node) => node.type === "button" && node.children.includes("Skip task"))[0];
function startTask() {
  const start = view.root.find((node) => node.props.children?.toString().startsWith("Start task"));
  act(() => start.props.onClick());
}
async function saveFinishes() {
  await act(async () => {
    pending.forEach((resolve) => resolve());
  });
}

describe("skip task", () => {
  it("saves one result and moves one task when Skip is tapped repeatedly", async () => {
    render();
    startTask();
    const skip = skipButton();
    act(() => {
      skip.props.onClick();
      skip.props.onClick();
      skip.props.onClick();
    });
    expect(store).toHaveBeenCalledOnce();
    expect(store.mock.calls[0][1]).toBe("t1");
    expect(skipButton().props.disabled).toBe(true);

    await saveFinishes();
    expect(heading()).toContain("Task 2 of 3");

    startTask();
    expect(skipButton().props.disabled).toBe(false);
    act(() => skipButton().props.onClick());
    expect(store).toHaveBeenCalledTimes(2);
    expect(store.mock.calls[1][1]).toBe("t2");
  });

  it("goes to the completed page once when Skip is tapped repeatedly on the last task", async () => {
    render(2);
    startTask();
    const skip = skipButton();
    act(() => {
      skip.props.onClick();
      skip.props.onClick();
    });
    await saveFinishes();
    expect(store).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("completed");
    expect(heading()).toContain("Task 3 of 3");
  });

  it("stays on the task and lets the participant retry when the save fails", async () => {
    store.mockRejectedValueOnce(new Error("Network"));
    render();
    startTask();
    await act(async () => {
      skipButton().props.onClick();
    });
    expect(heading()).toContain("Task 1 of 3");
    expect(skipButton().props.disabled).toBe(false);
  });
});
