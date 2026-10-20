"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { PlaybackContext } from "@/components/stageshow/kit/playback";
import { createPlaybackClock } from "@/components/stageshow/kit/playback-clock";
import type { EditorDemoKind } from "@/lib/onboarding";

const TreeDesktop = dynamic(
  () => import("@/components/stageshow/examples/usabilitree-tree-editor"),
  { ssr: false, loading: () => <DemoPlaceholder phone={false} /> }
);
const TreePhone = dynamic(
  () => import("@/components/stageshow/examples/usabilitree-tree-editor-phone"),
  { ssr: false, loading: () => <DemoPlaceholder phone /> }
);
const TasksDesktop = dynamic(
  () => import("@/components/stageshow/examples/usabilitree-tasks-editor"),
  { ssr: false, loading: () => <DemoPlaceholder phone={false} /> }
);
const TasksPhone = dynamic(
  () => import("@/components/stageshow/examples/usabilitree-tasks-editor-phone"),
  { ssr: false, loading: () => <DemoPlaceholder phone /> }
);

export function EditorDemo({ editor, bleed = true }: { editor: EditorDemoKind; bleed?: boolean }) {
  const [isPhone, setIsPhone] = useState<boolean | null>(null);
  const [clock] = useState(createPlaybackClock);
  const playback = useMemo(() => ({ clock, repeat: true }), [clock]);

  useEffect(() => () => clock.dispose(), [clock]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const title = editor === "tree" ? "Tree editor" : "Tasks editor";
  const description =
    editor === "tree"
      ? "Build your tree inline, edit items, and move them into place."
      : "Write your tasks and pick correct answers straight from the tree.";
  const Demo =
    isPhone === null
      ? null
      : editor === "tree"
        ? isPhone
          ? TreePhone
          : TreeDesktop
        : isPhone
          ? TasksPhone
          : TasksDesktop;

  return (
    <figure className="space-y-3">
      <figcaption className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </figcaption>
      {/* The viewport selects the demo; its container only scales it. */}
      <div
        className={
          bleed ? "-mx-6 overflow-hidden sm:mx-0 sm:rounded-lg" : "overflow-hidden rounded-lg"
        }
        data-ss-wide={isPhone === false ? "" : undefined}
        aria-hidden="true"
      >
        <PlaybackContext.Provider value={playback}>
          {Demo ? <Demo /> : <DemoPlaceholder />}
        </PlaybackContext.Provider>
      </div>
    </figure>
  );
}

function DemoPlaceholder({ phone }: { phone?: boolean }) {
  return (
    <div
      className={`mx-auto flex w-full items-center justify-center bg-muted text-sm text-muted-foreground ${
        phone === false
          ? "aspect-[3/2] max-w-[720px]"
          : phone
            ? "aspect-[358/540] max-w-[420px]"
            : "aspect-[358/540] max-w-[420px] md:aspect-[3/2] md:max-w-[720px]"
      }`}
    >
      Loading demo…
    </div>
  );
}
