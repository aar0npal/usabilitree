import { createContext, useContext } from "react";
import type { PlaybackClock } from "./playback-clock";
import { clock } from "./clock";

export const PlaybackContext = createContext<{ clock: PlaybackClock; repeat: boolean } | null>(
  null
);
const nativeClock = {
  ...clock,
  interval: (fn: () => void, ms: number) => window.setInterval(fn, ms),
  clearInterval: (id: number) => window.clearInterval(id),
};
export function usePlaybackClock() {
  return useContext(PlaybackContext)?.clock ?? nativeClock;
}
