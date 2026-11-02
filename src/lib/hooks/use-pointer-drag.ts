"use client";

import * as React from "react";

export interface DragPoint {
  x: number;
  y: number;
}

export interface DragHandlers<T> {
  onStart: (item: T, point: DragPoint, touch: boolean) => void;
  /** Also called after the page scrolls under a still pointer, so a drop target can follow */
  onMove: (point: DragPoint) => void;
  onDrop: (point: DragPoint) => void;
  onCancel: () => void;
}

// How long a finger rests before a press lifts an item, as iOS's own long-press
const LONG_PRESS = 450;
// How far a finger may wander during that press before it counts as a scroll
const SLOP = 8;
// How far a mouse moves from its press before a drag starts, so a click stays a click
const THRESHOLD = 3;
// The band at the screen's top and bottom where a drag scrolls the page
const EDGE = 64;

/**
 * Dragging items with a mouse or a finger. A mouse drags from a handle as
 * soon as it moves; a finger long-presses the item, so a swipe still scrolls.
 * While dragging, the page scrolls near the screen's edges, the finger can't
 * scroll it, and Escape cancels.
 */
export function usePointerDrag<T>(handlers: DragHandlers<T>) {
  const latest = React.useRef(handlers);
  React.useLayoutEffect(() => {
    latest.current = handlers;
  });
  // Ends the drag in progress; `waiting` drops a press that hasn't become one yet
  const stop = React.useRef<(() => void) | null>(null);
  const waiting = React.useRef<(() => void) | null>(null);
  const endedAt = React.useRef(0);

  // Leaving the page ends both, so nothing runs against an editor that's gone
  React.useEffect(
    () => () => {
      waiting.current?.();
      stop.current?.();
    },
    []
  );

  return React.useMemo(() => {
    type Listen = (
      move: (point: DragPoint) => void,
      end: (point: DragPoint) => void,
      cancel: () => void
    ) => () => void;

    const run = (item: T, start: DragPoint, touch: boolean, listen: Listen) => {
      let point = start;
      let frame = 0;
      let unlisten = () => {};
      const finish = () => {
        cancelAnimationFrame(frame);
        unlisten();
        document.removeEventListener("keydown", onKey, true);
        stop.current = null;
        // Only a finger's lift leaves a tap behind; a mouse's release never clicks a row
        if (touch) endedAt.current = Date.now();
      };
      const cancel = () => {
        finish();
        latest.current.onCancel();
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        cancel();
      };
      const scroll = () => {
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop ?? 0;
        const bottom = top + (viewport?.height ?? window.innerHeight);
        const by =
          point.y < top + EDGE
            ? -(top + EDGE - point.y) / 4
            : point.y > bottom - EDGE
              ? (point.y - (bottom - EDGE)) / 4
              : 0;
        if (by) {
          window.scrollBy(0, by);
          latest.current.onMove(point);
        }
        frame = requestAnimationFrame(scroll);
      };

      latest.current.onStart(item, start, touch);
      unlisten = listen(
        (next) => {
          point = next;
          latest.current.onMove(next);
        },
        (end) => {
          finish();
          latest.current.onDrop(end);
        },
        cancel
      );
      document.addEventListener("keydown", onKey, true);
      frame = requestAnimationFrame(scroll);
      stop.current = cancel;
    };

    /** On a handle's pointerdown: a mouse or pen drag, once it has moved a few pixels */
    const fromHandle = (event: React.PointerEvent, item: T) => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      // Keeps a field that's being edited focused, and the page's text unselected
      event.preventDefault();
      const start = { x: event.clientX, y: event.clientY };
      const wait = (move: PointerEvent) => {
        if (Math.hypot(move.clientX - start.x, move.clientY - start.y) < THRESHOLD) return;
        unwait();
        run(item, { x: move.clientX, y: move.clientY }, false, (onMove, onEnd, onCancel) => {
          const pointAt = (e: PointerEvent) => ({ x: e.clientX, y: e.clientY });
          const move = (e: PointerEvent) => onMove(pointAt(e));
          const up = (e: PointerEvent) => onEnd(pointAt(e));
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
          window.addEventListener("pointercancel", onCancel);
          return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", onCancel);
          };
        });
      };
      const unwait = () => {
        window.removeEventListener("pointermove", wait);
        window.removeEventListener("pointerup", unwait);
        if (waiting.current === unwait) waiting.current = null;
      };
      waiting.current?.();
      waiting.current = unwait;
      window.addEventListener("pointermove", wait);
      window.addEventListener("pointerup", unwait);
    };

    /** On an item's touchstart: a long-press lifts it; moving first lets the page scroll */
    const fromPress = (event: React.TouchEvent, item: T) => {
      if (event.touches.length !== 1 || stop.current) return;
      const touch = event.touches[0];
      const start = { x: touch.clientX, y: touch.clientY };
      const timer = window.setTimeout(lift, LONG_PRESS);
      const wander = (e: TouchEvent) => {
        const t = e.touches[0];
        if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > SLOP) unwait();
      };
      const unwait = () => {
        window.clearTimeout(timer);
        document.removeEventListener("touchmove", wander);
        document.removeEventListener("touchend", unwait);
        document.removeEventListener("touchcancel", unwait);
        if (waiting.current === unwait) waiting.current = null;
      };
      waiting.current?.();
      waiting.current = unwait;
      document.addEventListener("touchmove", wander, { passive: true });
      document.addEventListener("touchend", unwait);
      document.addEventListener("touchcancel", unwait);

      function lift() {
        unwait();
        navigator.vibrate?.(10);
        run(item, start, true, (onMove, onEnd, onCancel) => {
          let last = start;
          // Not passive: the finger moves the item now, not the page
          const move = (e: TouchEvent) => {
            e.preventDefault();
            const t = e.touches[0];
            last = { x: t.clientX, y: t.clientY };
            onMove(last);
          };
          // Stops the tap that would otherwise follow and open the item for editing
          const end = (e: TouchEvent) => {
            e.preventDefault();
            onEnd(last);
          };
          document.addEventListener("touchmove", move, { passive: false });
          document.addEventListener("touchend", end, { passive: false });
          document.addEventListener("touchcancel", onCancel);
          return () => {
            document.removeEventListener("touchmove", move);
            document.removeEventListener("touchend", end);
            document.removeEventListener("touchcancel", onCancel);
          };
        });
      }
    };

    /** Whether a click is the tail of a touch drag that just ended, to ignore it */
    const justDragged = () => Date.now() - endedAt.current < 400;

    return { fromHandle, fromPress, justDragged };
  }, []);
}
