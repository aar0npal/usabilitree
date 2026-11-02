export const ONBOARDING_STORAGE_KEYS = {
  dashboard: "dashboard-tour-completed",
  tree: "tree-editor-demo-seen",
  tasks: "tasks-editor-demo-seen",
} as const;

export type EditorDemoKind = "tree" | "tasks";

export function resetOnboarding(storage: Pick<Storage, "removeItem"> = localStorage) {
  for (const key of Object.values(ONBOARDING_STORAGE_KEYS)) storage.removeItem(key);
}
