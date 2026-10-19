"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ONBOARDING_STORAGE_KEYS, type EditorDemoKind } from "@/lib/onboarding";
import { EditorDemo } from "./editor-demo";

export function EditorDemoDialog({ editor }: { editor: EditorDemoKind }) {
  const [open, setOpen] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const storageKey = ONBOARDING_STORAGE_KEYS[editor];

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === "true";
    } catch {
      // Storage restrictions must not block the editor.
    }
    setOpen(!seen);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    setCanClose(false);
    const timer = setTimeout(() => setCanClose(true), 1000);
    return () => clearTimeout(timer);
  }, [open, storageKey]);

  const handleOpenChange = (next: boolean) => {
    if (next || !canClose) return;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // The popup can still be dismissed without browser storage.
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden p-4 sm:p-6"
        closeDisabled={!canClose}
        onOpenAutoFocus={() => {
          const active = document.activeElement;
          if (active instanceof HTMLElement) returnFocus.current = active;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (!canClose) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!canClose) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 pr-6 text-left">
          <DialogTitle>New update</DialogTitle>
          <DialogDescription>
            Here&apos;s a quick look at the new {editor === "tree" ? "tree" : "tasks"} editor.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto">
          <EditorDemo editor={editor} bleed={false} />
        </div>
        <p className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
          {canClose ? "Close this whenever you’re ready." : "You can close this in a moment."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
