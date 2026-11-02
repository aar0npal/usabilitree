import { Fragment, type CSSProperties } from "react";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  FileUp,
  IndentDecrease,
  IndentIncrease,
  Plus,
  Search,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { Collapse, Keyboard, Phone, Roll, Stage, Toggle, type Act } from "../../kit";
import "./phone.css";

// The tree editor from usabilitree-tree-editor, on an iPhone. It opens on the
// Tree tab as v1 draws it at phone width, its label badged Old (the mono
// textarea with its comma placeholder, Parse Structure). The new editor's
// empty state wipes in over it from the right behind a thin line, and Old
// becomes New as the line passes the label. A phone
// can't drag a file in, so the import is a tap: Import CSV brings up iOS's
// Files sheet, the CSV is tapped, and the rows arrive top to bottom. Then the editor: a phone has no Tab key, so the
// shortcuts become a toolbar that rides above the iOS keyboard (Outdent,
// Indent, Add, Delete, Done). A tap on "Business permits" makes it a field and
// brings the keyboard up; Add opens a row under it; Indent nests that row, so
// "Business permits" becomes a parent; "Renew a permit" is typed; "Health
// services" is tapped and deleted; Done drops the keyboard. Plays once; the
// poster keeps the keyboard up with the typed row, since the toolbar is what
// this version is about.
//
// What keeps it honest as a phone design:
// - Rows are 44pt or taller (touch targets) and their text is 16pt, the size
//   iOS Safari won't zoom into when the field takes focus. v1's textarea is
//   16px below its md breakpoint too, so the old body wraps as it does today.
// - Every leaf shows its path, the string a task's correct answer is set to,
//   under its name: beside it there's no room at phone width. A long path
//   keeps its end, the part that tells two leaves apart. The field's path
//   follows the name as it's typed; a leaf that becomes a parent drops it.
// - Indent is disabled when there's no row above at the same level to nest
//   under; the toolbar says what's possible.
// - The Files sheet, the toolbar and the keyboard arrive and leave on UIKit's
//   curve; the page doesn't move under them. Files that aren't a CSV are
//   dimmed in the sheet, as iOS dims what an input won't accept.
//
// Real strings: the tabs, the label, the old placeholder and button, the empty
// state, the file names, the tree labels, the paths, the toolbar, the typed
// item. The keyboard keeps its letters: it's the platform's signature.

type RowId = "permits" | "new" | "health";

type S = {
  // Today's textarea, or the new editor in its place
  version: "old" | "new";
  // iOS's Files sheet is up
  picker: boolean;
  imported: boolean;
  editing: RowId | null;
  added: boolean;
  deleted: boolean;
  level: number;
  name: string;
  moving: boolean;
  holding: boolean;
  lifted: boolean;
  dragY: number;
  slot: boolean;
  moved: boolean;
  moveIndented: boolean;
  moveBar: boolean;
  toast: boolean;
};

type Item = { id: string; name: string; level: number; parent: boolean; collapsed?: boolean };

const TREE: Item[] = [
  { id: "home", name: "Home", level: 0, parent: true },
  { id: "services", name: "Services", level: 1, parent: true },
  { id: "permits", name: "Business permits", level: 2, parent: false },
  { id: "health", name: "Health services", level: 2, parent: false },
  { id: "about", name: "About us", level: 1, parent: false },
  { id: "contact", name: "Contact", level: 1, parent: false },
  // Collapsed sections, so the list runs under the keyboard rather than stopping short
  { id: "news", name: "News", level: 1, parent: true, collapsed: true },
  { id: "events", name: "Events", level: 1, parent: true, collapsed: true },
  { id: "tourism", name: "Tourism", level: 1, parent: true, collapsed: true },
  { id: "careers", name: "Careers", level: 1, parent: false },
  { id: "faq", name: "FAQ", level: 1, parent: false },
];

// v1's sanitizeTreeTestLink, so every path is the one the Tasks tab takes as an answer
const slug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
// Each item's path is its ancestors' slugs and its own
const PATH: Record<string, string> = {};
{
  const trail: string[] = [];
  for (const item of TREE) {
    trail.length = item.level;
    trail.push(slug(item.name));
    PATH[item.id] = `/${trail.join("/")}`;
  }
}

// Too long for its row, a path drops whole segments from its start: the end tells two leaves apart, and a
// cut never lands mid-word. The budget is the row's text width at this level over a wide 13px character
const fit = (path: string, level: number) => {
  const max = Math.floor((304 - 16 * level) / 6.9);
  const parts = path.split("/").filter(Boolean);
  if (path.length <= max) return path;
  while (parts.length > 1 && `…/${parts.join("/")}`.length > max) parts.shift();
  return `…/${parts.join("/")}`;
};

const TABS = ["General", "Tree", "Tasks", "Messages"];

// v1's placeholder, word for word
const PLACEHOLDER = [
  "Enter tree structure (use commas for next level)",
  "Example:",
  "Home - City of Manila",
  ",Services",
  ",,Business Permits",
  ",,Health Services",
  ",About Us",
];

// The Files sheet's recents: only the CSV is one the input accepts
const FILES = [
  { id: "csv", name: "site-tree.csv", meta: "Today at 9:38 AM – 1 KB", kind: "csv" },
  { id: "pdf", name: "Permit fees 2026.pdf", meta: "Yesterday at 4:12 PM – 240 KB", kind: "pdf" },
  { id: "jpg", name: "IMG_2041.jpeg", meta: "Oct 28 at 7:03 PM – 3.1 MB", kind: "jpg" },
] as const;

const initial: S = {
  version: "old",
  picker: false,
  imported: false,
  editing: null,
  added: false,
  deleted: false,
  level: 2,
  name: "",
  moving: false,
  holding: false,
  lifted: false,
  dragY: 0,
  slot: false,
  moved: false,
  moveIndented: false,
  moveBar: false,
  toast: false,
};
const poster: S = {
  ...initial,
  version: "new",
  imported: true,
  editing: "new",
  added: true,
  level: 3,
  name: "Renew a permit",
};

// The predictive bar follows the word being typed, as iOS's does
const COMPLETE: Record<string, [string, string]> = {
  R: ["Renew", "Request"],
  Re: ["Renew", "Request"],
  Ren: ["Renew", "Rent"],
  Rene: ["Renew", "Renewal"],
  Renew: ["Renewal", "Renewed"],
  a: ["a", "an"],
  p: ["permit", "pay"],
  pe: ["permit", "per"],
  per: ["permit", "permits"],
  perm: ["permit", "permits"],
  permi: ["permit", "permits"],
  permit: ["permits", "permit"],
  services: ["service", "Services"],
};

function suggestions(typed: string): [string, string, string] {
  const word = typed.split(" ").pop() ?? "";
  if (!word) return typed ? ["a", "the", "and"] : ["The", "I", "A"];
  const [one, two] = COMPLETE[word] ?? [word, word];
  return [`“${word}”`, one, two];
}

async function script(a: Act<S>) {
  // The Tree tab as it is today, marked Old
  await a.wait(2400);

  // The new editor wipes in over it from the right; Old becomes New as the line passes the label
  a.mark("swap");
  a.put({ version: "new" });
  await a.wait(2400);

  // Import CSV brings up the Files sheet; the tap lands past the button's words
  a.mark("import");
  await a.click({ at: "import", x: 0.86, y: 0.5 });
  a.put({ picker: true });
  await a.wait(1200);

  // The CSV is tapped: the sheet goes and the rows arrive under it, top to bottom
  a.mark("pick");
  await a.click({ at: "file-csv", x: 0.72, y: 0.5 });
  a.put({ picker: false, imported: true });
  await a.wait(1700);

  a.mark("tap");
  await a.click({ at: "row-permits", x: 0.72, y: 0.5 });
  a.put({ editing: "permits" });
  await a.wait(1200);
  a.mark("add");
  await a.click({ at: "tool-add", x: 0.5, y: 0.5 });
  a.put({ added: true, editing: "new" });
  await a.wait(1000);
  a.mark("indent");
  await a.click({ at: "tool-indent", x: 0.5, y: 0.5 });
  a.put({ level: 3 });
  await a.wait(800);
  a.mark("type");
  await a.type("name", "Renew a permit", { interval: 95 });
  await a.wait(700);
  // Another row takes the focus; the keyboard stays up and the toolbar now acts on it
  a.mark("select");
  await a.click({ at: "row-health", x: 0.72, y: 0.5 });
  a.put({ editing: "health" });
  await a.wait(900);
  a.mark("delete");
  await a.click({ at: "tool-delete", x: 0.5, y: 0.5 });
  // The row goes; the focus moves to the row above, as an outliner's does
  a.put({ deleted: true, editing: "new" });
  await a.wait(1100);
  a.mark("done");
  await a.click({ at: "tool-done", x: 0.5, y: 0.5 });
  a.put({ editing: null });
  await a.wait(2600);

  // Last beat: a vertical long-press drag, then an explicit level correction.
  a.mark("move-hold");
  a.put({ moving: true });
  const source = a.rect("row-contact");
  const scale = source.height / 60;
  const from = { x: source.x + source.width - 40 * scale, y: source.y + 24 * scale };
  await a.move(from, { duration: 300 });
  a.put({ holding: true });
  // drag() spends 310ms pressing before its first callback. Another 140ms
  // here makes a 450ms hold; the progress ring uses that same total.
  await a.drag(
    { x: from.x, y: from.y - 68 * scale },
    (at, _from, t) => {
      const lifted = t >= 140 / 1800;
      a.put({
        lifted,
        holding: !lifted,
        dragY: (at.y - from.y) / scale,
        slot: at.y < from.y - 20 * scale,
      });
    },
    {
      duration: 1800,
      path: (t, start, end) => {
        const hold = (140 / 1800) ** 2 / (2 * 0.25) / 0.875;
        const u = Math.max(0, (t - hold) / (1 - hold));
        const eased = u * u * (3 - 2 * u);
        return { x: start.x, y: start.y + (end.y - start.y) * eased };
      },
    }
  );
  a.mark("move-drop");
  a.put({ holding: false, lifted: false, moved: true, slot: false, moveBar: true });
  await a.wait(900);
  a.mark("move-indent");
  await a.click({ at: "move-indent", x: 0.75, y: 0.6 });
  a.put({ moveIndented: true });
  await a.wait(1100);
  a.mark("move-done");
  await a.click({ at: "move-done", x: 0.75, y: 0.6 });
  a.put({ moveBar: false });
  // Confirm the finished move after its tools have left, so the toast and
  // the bottom bar never compete for the same screen space.
  await a.wait(400);
  a.mark("move-toast");
  a.put({ toast: true });
  await a.wait(2000);
}

function Row({
  id,
  name,
  level,
  parent,
  collapsed,
  editing,
  placeholder,
  path,
  order,
  motion,
  selected,
  holding,
  lifted,
}: {
  id: string;
  name: string;
  level: number;
  parent: boolean;
  collapsed?: boolean;
  editing: boolean;
  placeholder?: string;
  path?: string;
  order?: number;
  motion?: CSSProperties;
  selected?: boolean;
  holding?: boolean;
  lifted?: boolean;
}) {
  // A leaf keeps its path's line even before it has a name, so naming it never moves the row
  const leaf = path !== undefined && !parent;
  return (
    <div
      className="utp-row"
      data-target={`row-${id}`}
      data-parent={parent || undefined}
      data-leaf={leaf || undefined}
      data-collapsed={collapsed || undefined}
      data-editing={editing || undefined}
      data-selected={selected || undefined}
      data-holding={holding || undefined}
      data-lifted={lifted || undefined}
      style={{ marginLeft: level * 16, ["--i" as string]: order, ...motion }}
    >
      {id === "contact" && (
        <svg className="utp-hold-ring" width="32" height="32" viewBox="0 0 32 32" aria-hidden>
          <circle className="utp-hold-track" cx="16" cy="16" r="14" />
          <circle className="utp-hold-progress" cx="16" cy="16" r="14" pathLength="100" />
        </svg>
      )}
      <span className="utp-text">
        <span className="utp-name">
          {name}
          {editing && <span className="utp-caret" key={name} />}
          {placeholder && (
            <span
              className="utp-placeholder"
              data-show={(editing && !name) || undefined}
              aria-hidden
            >
              {placeholder}
            </span>
          )}
        </span>
        {path !== undefined && (
          <span className="utp-path" data-show={(leaf && name.trim() !== "") || undefined}>
            {id === "contact" ? <Roll variant="fade">{fit(path, level)}</Roll> : fit(path, level)}
          </span>
        )}
      </span>
      <ChevronDown className="utp-chevron" size={18} strokeWidth={2} aria-hidden />
    </div>
  );
}

/** A document as iOS's Files draws one: a page with a folded corner and a colored band, or a photo's thumbnail */
function FileIcon({ kind }: { kind: "csv" | "pdf" | "jpg" }) {
  if (kind === "jpg") return <span className="utp-thumb" aria-hidden />;
  return (
    <span className="utp-doc" data-kind={kind} aria-hidden>
      <span className="utp-doc__band">{kind.toUpperCase()}</span>
    </span>
  );
}

export default function UsabilitreeTreeEditorPhone() {
  return (
    <Stage<S>
      width={420}
      height={620}
      compact={{ below: 420, width: 358, height: 540 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: { wide: { x: 300, y: 560 }, compact: { x: 260, y: 500 } }, style: "touch" }}
      className="utp"
    >
      {(s, _rect, layout) => {
        const isNew = s.version === "new";
        const nested = s.added && s.level === 3;
        // Indent needs a row above at the same level to nest under
        // Health services has Business permits above it at the same level; the new row only before it's nested
        const canIndent = s.editing === "health" || (s.editing === "new" && s.level === 2);
        // The keyboard follows the focused field's text
        const focused = s.editing === "health" ? "Health services" : s.name;
        const motion = (id: string): CSSProperties | undefined => {
          if (!s.moving) return undefined;
          if (id === "contact")
            return {
              transform: `translateY(${s.lifted ? s.dragY : s.moved ? -68 : 0}px)`,
              transformOrigin: "calc(100% - 40px) 24px",
              marginRight: s.lifted ? 8 : 0,
            };
          if (id === "about" && (s.slot || s.moved)) return { transform: "translateY(68px)" };
          return undefined;
        };
        return (
          <Phone width={layout === "compact" ? 326 : 360} className="utp-phone">
            <div className="utp-page">
              <div className="utp-tabs">
                {TABS.map((label) => (
                  <span key={label} className="utp-tab" data-active={label === "Tree" || undefined}>
                    {label}
                  </span>
                ))}
              </div>
              {/* Today's tab, then the new editor wiped in over it from the right. Each version
                  carries its own header, so the label never moves and Old becomes New as the line passes it */}
              <div className="utp-swap" data-version={s.version}>
                {/* Today: the comma syntax, typed and parsed by hand */}
                <div className="utp-old" aria-hidden={isNew || undefined}>
                  <div className="utp-head">
                    <span className="utp-label">Tree Structure</span>
                    <span className="utp-badge utp-badge--old">Old</span>
                  </div>
                  <div className="utp-textarea">
                    {PLACEHOLDER.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                  <span className="utp-parse">Parse Structure</span>
                </div>

                <div className="utp-new" aria-hidden={!isNew || undefined}>
                  <div className="utp-head utp-head--new" data-target="head">
                    <span className="utp-heading">
                      <span className="utp-label">Tree Structure</span>
                      <span className="utp-badge">New</span>
                    </span>
                    <span className="utp-head-actions">
                      <span className="utp-paths-control">
                        <span className="utp-paths-label">Paths</span>
                        <Toggle on aria-label="Paths" />
                      </span>
                      <span className="utp-head-divider" aria-hidden />
                      <span className="utp-head-icons">
                        <span
                          className="utp-head-button"
                          role="button"
                          aria-label="Expand all"
                          data-target="header-chevronsupdown"
                          data-cursor="pointer"
                        >
                          <ChevronsUpDown size={16} strokeWidth={2} aria-hidden />
                        </span>
                        <span
                          className="utp-head-button"
                          role="button"
                          aria-label="Collapse all"
                          data-target="header-chevronsdownup"
                          data-cursor="pointer"
                        >
                          <ChevronsDownUp size={16} strokeWidth={2} aria-hidden />
                        </span>
                        <span
                          className="utp-head-button"
                          role="button"
                          aria-label="What participants will see"
                          data-target="header-eye"
                          data-cursor="pointer"
                        >
                          <Eye size={16} strokeWidth={2} aria-hidden />
                        </span>
                        <span
                          className="utp-head-button"
                          role="button"
                          aria-label="Import"
                          data-target="header-upload"
                          data-cursor="pointer"
                        >
                          <Upload size={16} strokeWidth={2} aria-hidden />
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className="utp-editor">
                    <div className="utp-empty" data-gone={s.imported || undefined}>
                      <span className="utp-empty__icon">
                        <FileUp size={22} strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="utp-empty__title">Start your tree</span>
                      <span className="utp-empty__line">
                        Import a CSV, or add items one by one.
                      </span>
                      <span className="utp-empty__actions">
                        <span className="utp-btn" data-target="import">
                          <Upload size={18} strokeWidth={2} aria-hidden />
                          Import CSV
                        </span>
                        <span className="utp-btn">
                          <Plus size={18} strokeWidth={2} aria-hidden />
                          Add item
                        </span>
                      </span>
                    </div>

                    <div
                      className="utp-rows"
                      data-target="rows"
                      data-moving={s.moving || undefined}
                      data-in={s.imported || undefined}
                    >
                      {TREE.map((item, i) => (
                        <Fragment key={item.id}>
                          {item.id === "health" ? (
                            // Deletable: its Collapse carries the gap above it, so the rows below close up whole
                            <Collapse open={!s.deleted}>
                              <div className="utp-gap">
                                <Row
                                  id="health"
                                  name={item.name}
                                  level={item.level}
                                  parent={false}
                                  editing={s.editing === "health"}
                                  path={PATH.health}
                                  order={i}
                                />
                              </div>
                            </Collapse>
                          ) : (
                            <Row
                              id={item.id}
                              name={item.name}
                              level={
                                item.id === "contact" && s.moved
                                  ? s.moveIndented
                                    ? 4
                                    : 3
                                  : item.level
                              }
                              motion={motion(item.id)}
                              selected={item.id === "contact" && s.moved && s.moveBar}
                              holding={item.id === "contact" && s.holding}
                              lifted={item.id === "contact" && s.lifted}
                              parent={item.parent || (item.id === "permits" && nested)}
                              collapsed={item.collapsed}
                              editing={s.editing === item.id}
                              path={
                                item.id === "contact" && s.moved
                                  ? `${PATH.permits}/${s.moveIndented ? "renew-a-permit/" : ""}contact`
                                  : PATH[item.id]
                              }
                              order={i}
                            />
                          )}
                          {item.id === "permits" && (
                            <Collapse open={s.added}>
                              <div className="utp-gap">
                                <Row
                                  id="new"
                                  name={s.name}
                                  level={s.level}
                                  parent={s.moveIndented}
                                  editing={s.editing === "new"}
                                  placeholder="Item name"
                                  path={`${s.level === 3 ? PATH.permits : PATH.services}/${slug(s.name)}`}
                                />
                              </div>
                            </Collapse>
                          )}
                        </Fragment>
                      ))}

                      <span className="utp-insertion" data-show={s.slot || undefined} aria-hidden />
                    </div>
                  </div>
                </div>
                {/* The line that carries the new version in; no handle, so it never reads as a slider to drag */}
                <span className="utp-wipe" aria-hidden>
                  <span className="utp-wipe__line" />
                </span>
              </div>
            </div>

            {/* iOS's Files sheet, over a dimmed page */}
            <div className="utp-scrim" data-show={s.picker || undefined} aria-hidden />
            <div
              className="utp-sheet"
              data-open={s.picker || undefined}
              aria-hidden={!s.picker || undefined}
            >
              <div className="utp-sheet__nav">
                <span className="utp-sheet__cancel">Cancel</span>
              </div>
              <div className="utp-sheet__title">Recents</div>
              <div className="utp-sheet__search">
                <Search size={16} strokeWidth={2.5} aria-hidden />
                Search
              </div>
              <div className="utp-files">
                {FILES.map((file) => (
                  <div
                    key={file.id}
                    className="utp-file"
                    data-target={`file-${file.id}`}
                    data-disabled={file.kind !== "csv" || undefined}
                  >
                    <FileIcon kind={file.kind} />
                    <span className="utp-file__text">
                      <span className="utp-file__name">{file.name}</span>
                      <span className="utp-file__meta">{file.meta}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="utp-toaster">
              <div className="utp-move-toast" data-show={s.toast || undefined} role="status">
                <span className="utp-toast-title">Moved “Contact” under Renew a permit</span>
                <span className="utp-toast-undo" role="button" aria-label="Undo move">
                  Undo
                </span>
              </div>
            </div>

            {/* Move mode needs no keyboard. The device is cropped, so this bar
                is anchored to the visible viewport's safe inset. */}
            <div className="utp-move-dock" data-open={s.moveBar || undefined}>
              <div className="utp-bar">
                <span className="utp-tool" data-target="move-outdent">
                  <IndentDecrease size={18} strokeWidth={2} aria-hidden />
                  Outdent
                </span>
                <span
                  className="utp-tool"
                  data-target="move-indent"
                  data-disabled={s.moveIndented || undefined}
                >
                  <IndentIncrease size={18} strokeWidth={2} aria-hidden />
                  Indent
                </span>
                <span className="utp-tool" data-target="move-undo">
                  <Undo2 size={18} strokeWidth={2} aria-hidden />
                  Undo
                </span>
                <span className="utp-done" data-target="move-done">
                  Done
                </span>
              </div>
            </div>

            {/* The toolbar rides on the keyboard: one object in and out */}
            <div className="utp-dock" data-open={s.editing !== null || undefined}>
              <div className="utp-bar">
                <span className="utp-tool" data-target="tool-outdent">
                  <IndentDecrease size={18} strokeWidth={2} aria-hidden />
                  Outdent
                </span>
                <span
                  className="utp-tool"
                  data-target="tool-indent"
                  data-disabled={!canIndent || undefined}
                >
                  <IndentIncrease size={18} strokeWidth={2} aria-hidden />
                  Indent
                </span>
                {/* Add and Delete are icon-only: + and a bin read on their own; the indent glyphs don't */}
                <span
                  className="utp-tool utp-tool--icon"
                  data-target="tool-add"
                  aria-label="Add item"
                >
                  <Plus size={18} strokeWidth={2} aria-hidden />
                </span>
                <span
                  className="utp-tool utp-tool--icon utp-tool--delete"
                  data-target="tool-delete"
                  aria-label="Delete item"
                >
                  <Trash2 size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="utp-done" data-target="tool-done">
                  Done
                </span>
              </div>
              <Keyboard typed={focused} suggestions={suggestions(focused)} />
            </div>
          </Phone>
        );
      }}
    </Stage>
  );
}
