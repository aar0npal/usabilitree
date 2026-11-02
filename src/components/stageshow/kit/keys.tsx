import "./keys.css";

// Keystrokes shown as keycaps (act.key): the caps for a combo, and the rows
// the stage draws them in.

/** Where keycaps show. Give `{ wide, compact }` to place them per layout. */
export type KeysAt = "bottom" | "top" | "bottom-left" | "bottom-right";

// Each keystroke is its own row of caps, so one still fading out never
// changes or recenters when the next arrives
export type Keys = { id: number; caps: string[]; show: boolean; down: boolean };

const KEYCAPS: Record<string, string> = {
  cmd: "⌘",
  shift: "⇧",
  alt: "⌥",
  option: "⌥",
  ctrl: "⌃",
  enter: "↵",
  return: "↵",
  esc: "esc",
  tab: "⇥",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  backspace: "⌫",
};

// Key names for labeled caps, as the keys are printed on a keyboard
const NAMES: Record<string, string> = {
  cmd: "Cmd",
  shift: "Shift",
  alt: "Alt",
  option: "Option",
  ctrl: "Ctrl",
  enter: "Enter",
  return: "Return",
  esc: "Esc",
  tab: "Tab",
  backspace: "Backspace",
  space: "Space",
};

/**
 * 'cmd+k' as caps: ['⌘', 'K']. With `label`, a named key carries its name
 * after its glyph, as a keyboard prints it: 'tab' is '⇥ Tab', 'esc' is 'Esc'.
 * For an audience that doesn't read the glyphs alone.
 */
export const capsOf = (combo: string, label = false) =>
  combo.split("+").map((part) => {
    const key = part.trim().toLowerCase();
    const glyph = KEYCAPS[key];
    const name = label ? NAMES[key] : undefined;
    if (name) return glyph && glyph.toLowerCase() !== key ? `${glyph} ${name}` : name;
    return glyph ?? part.trim().toUpperCase();
  });

/** The last row (fading out) and the current one. */
export function Keycaps({ rows, at }: { rows: (Keys | null)[]; at: KeysAt }) {
  return (
    <>
      {rows.map(
        (row) =>
          row && (
            <div key={row.id} className="ss-keys" data-show={row.show} data-at={at} aria-hidden>
              {row.caps.map((c, i) => (
                <kbd key={i} className="ss-key" data-down={row.down}>
                  {c}
                </kbd>
              ))}
            </div>
          )
      )}
    </>
  );
}
