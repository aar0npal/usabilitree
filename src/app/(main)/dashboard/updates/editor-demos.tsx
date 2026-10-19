"use client";

import { EditorDemo } from "@/components/stageshow/editor-demo";

export function EditorDemos() {
  return (
    <div className="space-y-6">
      <EditorDemo editor="tree" />
      <EditorDemo editor="tasks" />
    </div>
  );
}
