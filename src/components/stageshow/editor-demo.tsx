"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/components/stageshow/kit/reduced-motion";
import { PlaybackContext } from "@/components/stageshow/kit/playback";
import { createPlaybackClock } from "@/components/stageshow/kit/playback-clock";
import { Play, Pause } from "lucide-react";
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

  return <DemoPlayer title={title} description={description} Demo={Demo} bleed={bleed} />;
}

function DemoPlayer({
  title,
  description,
  Demo,
  bleed,
}: {
  title: string;
  description: string;
  Demo: ComponentType | null;
  bleed: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const [clock] = useState(createPlaybackClock);
  const playback = useMemo(() => ({ clock, repeat: true }), [clock]);
  const reduced = useReducedMotion();

  useEffect(() => () => clock.dispose(), [clock]);

  return (
    <figure className="space-y-3">
      <figcaption className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!Demo || reduced}
            aria-label={`${paused ? "Play" : "Pause"} ${title.toLowerCase()} demo`}
            onClick={() => {
              clock.setPaused(!paused);
              setPaused(!paused);
            }}
          >
            {paused ? (
              <Play className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pause className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </figcaption>
      <div
        className={
          bleed ? "-mx-6 overflow-hidden sm:mx-0 sm:rounded-lg" : "overflow-hidden rounded-lg"
        }
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
