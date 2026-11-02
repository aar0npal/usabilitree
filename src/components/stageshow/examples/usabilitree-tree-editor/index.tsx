import { Fragment, type CSSProperties } from "react";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  GripVertical,
  Keyboard as KeyboardIcon,
  FileText,
  FileUp,
  IndentDecrease,
  IndentIncrease,
  ListChecks,
  MessageSquareCode,
  Plus,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Collapse,
  Roll,
  Stage,
  Toggle,
  Tooltip,
  Window,
  type Act,
  type Point,
  type Rect,
} from "../../kit";
import "./tree.css";

// UsabiliTree's setup, Tree tab. It opens on the tab as it is today, its label
// badged Old: an empty textarea with the comma syntax in its placeholder and a
// Parse Structure button. The new editor's empty state wipes in over it from
// the right behind a thin line, and Old becomes New as the line passes the
// label, so a first-time viewer can't miss what replaced what. Then a CSV file
// is dragged in from outside:
// the rows arrive top to bottom. Then the
// rows are the editor. A selected row carries its own small toolbar (Outdent,
// Indent, Add, Delete) on its right end; each button's tooltip names it with
// its shortcut, so the mouse path teaches the keyboard one. Beats: click
// "Business permits" (it becomes a field, its toolbar fades in); Add opens a
// new row under it; Indent nests that row, so "Business permits" turns into a
// parent; "Renew a permit" is typed; then "Health services" is selected and
// deleted, and the rows below close up. Plays once.
//
// What keeps it reading as the product, not a new widget:
// - The old body is v1's own: the label, the mono textarea with its real
//   placeholder, the black Parse Structure button. The tabs and the label stay
//   put through the swap; only the body below them changes.
// - Rows keep the preview's anatomy: gray-100 parents with a chevron on the
//   right, gray-50 leaves, 36px rows 8px apart, 16px per level.
// - Editing is the row itself turning into an input (white, the app's 1px
//   ring), so its text never moves when the edit starts.
// - The toolbar sits on the row's right end, which Indent never moves: only
//   the row's left edge steps in.
// - Indent is disabled when there's no row above at the same level to nest
//   under, so the toolbar only offers what's possible.
//
// - Every leaf shows its path in v1's blue pill, the string a task's correct
//   answer is set to. The selected row's pill steps left for the toolbar and
//   follows the name as it's typed; a leaf that becomes a parent drops its pill.
//
// Real strings: the tabs, the label, the old placeholder and button, the
// empty state, the file name, the tree labels, the paths, the typed item, the
// tooltips.

type RowId = "permits" | "new" | "health";
type Tip = "add" | "indent" | "delete";
// The file's drag image: shown while carried, `off` is where the hand holds it
type Ghost = { on: boolean; dropped: boolean; off: Point; at: Point };

type S = {
  // Today's textarea, or the new editor in its place
  version: "old" | "new";
  // A file is carried over the empty state
  over: boolean;
  imported: boolean;
  ghost: Ghost;
  editing: RowId | null;
  added: boolean;
  level: number;
  name: string;
  deleted: boolean;
  // Which tooltip, kept apart from whether it shows, so it fades out where it was
  tip: Tip;
  tipShow: boolean;
  moving: boolean;
  scrolled: boolean;
  grip: boolean;
  lifted: boolean;
  drag: Point;
  slot: boolean;
  moveLevel: number;
  moved: boolean;
  toast: boolean;
};

const TREE = [
  { id: "home", name: "Home", level: 0, parent: true },
  { id: "services", name: "Services", level: 1, parent: true },
  { id: "permits", name: "Business permits", level: 2, parent: false },
  { id: "health", name: "Health services", level: 2, parent: false },
  { id: "about", name: "About us", level: 1, parent: false },
  { id: "contact", name: "Contact", level: 1, parent: false },
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

const TABS = [
  { label: "General", icon: Settings },
  { label: "Tree", icon: FileText },
  { label: "Tasks", icon: ListChecks },
  { label: "Messages", icon: MessageSquareCode },
];

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

const FILE = "site-tree.csv";

// `width` is each tooltip's rendered width, so it can be kept a gutter inside the stage
const TIPS: Record<Tip, { label: string; keys?: string; width: number }> = {
  add: { label: "Add item", keys: "↵ Enter", width: 121 },
  indent: { label: "Indent", keys: "⇥ Tab", width: 97 },
  delete: { label: "Delete item", width: 82 },
};

// The hand waits past the stage's right edge, holding the file, until it brings it in
const OFFSTAGE = { wide: { x: 772, y: 300 }, compact: { x: 404, y: 230 } };
// Held by its icon's upper left, so the hand never covers the CSV band (the drag image is 104 wide, the icon 36 by 46 at its center)
const GRAB = { x: 40, y: 10 };

const noGhost: Ghost = { on: false, dropped: false, off: GRAB, at: OFFSTAGE.wide };

const initial: S = {
  version: "old",
  over: false,
  imported: false,
  ghost: noGhost,
  editing: null,
  added: false,
  level: 2,
  name: "",
  deleted: false,
  tip: "add",
  tipShow: false,
  moving: false,
  scrolled: false,
  grip: false,
  lifted: false,
  drag: { x: 0, y: 0 },
  slot: false,
  moveLevel: 2,
  moved: false,
  toast: false,
};
// The result left on screen: the imported tree edited, the new row nested and named, its toolbar showing
const poster: S = {
  ...initial,
  version: "new",
  imported: true,
  editing: "new",
  added: true,
  level: 3,
  name: "Renew a permit",
  deleted: true,
  tip: "delete",
};

// Aim inside a button but off its glyph, so the cursor never covers what it clicks
const OFF_GLYPH = { x: 0.8, y: 0.8 };
// Click a row in the space between its words and its toolbar, never on the words
const ROW_GAP = (a: Act<S>) => ({ x: a.layout === "compact" ? 0.54 : 0.4, y: 0.55 });

const inside = (r: Rect, p: Point) =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

async function hoverAndClick(a: Act<S>, target: string, tip: Tip) {
  await a.move({ at: target, ...OFF_GLYPH });
  a.put({ tip, tipShow: true });
  await a.wait(650);
  await a.click({ at: target, ...OFF_GLYPH });
  a.put({ tipShow: false });
}

async function script(a: Act<S>) {
  // The Tree tab as it is today, marked Old
  await a.wait(2400);

  // The new editor wipes in over it from the right; Old becomes New as the line passes the label
  a.mark("swap");
  a.put({ version: "new" });
  await a.wait(2500);

  // A CSV comes in from outside, already held; the empty state lights under it
  a.mark("import");
  const zone = a.rect("zone");
  const start = OFFSTAGE[a.layout];
  // On the zone's empty right side, so the file never covers its words
  const drop =
    a.layout === "compact"
      ? { x: zone.x + zone.width * 0.78, y: zone.y + 10 }
      : { x: zone.x + zone.width * 0.84, y: zone.y + zone.height * 0.36 };
  a.put({ ghost: { on: true, dropped: false, off: GRAB, at: start } });
  await a.move(drop, {
    duration: 1300,
    onMove: (at) =>
      a.put({ ghost: { on: true, dropped: false, off: GRAB, at }, over: inside(zone, at) }),
  });
  await a.wait(380);

  // Dropped: the rows arrive top to bottom
  a.mark("drop");
  a.put((s) => ({ ghost: { ...s.ghost, dropped: true }, over: false, imported: true }));
  await a.wait(1500);

  a.mark("click");
  await a.click({ at: "row-permits", ...ROW_GAP(a) });
  a.put({ editing: "permits" });
  await a.wait(500);

  a.mark("add");
  await hoverAndClick(a, "tool-add-permits", "add");
  a.put({ added: true, editing: "new" });
  await a.wait(750);

  a.mark("indent");
  await hoverAndClick(a, "tool-indent-new", "indent");
  a.put({ level: 3 });
  await a.wait(450);

  // Off the toolbar: the hand goes to the keys
  const rows = a.rect("rows");
  void a.move({ x: rows.x + rows.width + 12, y: a.rect("row-new").y + 50 }, { duration: 600 });
  await a.wait(500);
  a.mark("type");
  await a.type("name", "Renew a permit", { interval: 60 });
  await a.wait(600);

  a.mark("select");
  await a.click({ at: "row-health", ...ROW_GAP(a) });
  a.put({ editing: "health" });
  await a.wait(450);

  a.mark("delete");
  await hoverAndClick(a, "tool-delete-health", "delete");
  // The row goes; the edit moves to the row above, as an outliner's does
  a.put({ deleted: true, editing: "new" });
  await a.wait(500);
  void a.move({ x: rows.x + rows.width + 12, y: a.rect("row-new").y + 50 }, { duration: 600 });
  await a.wait(2600);

  // Last beat: bring Contact into the crop, then carry it by its grip.
  a.mark("move-ready");
  a.put({ moving: true, editing: null });
  await a.move({ at: "rows", x: 0.8, y: 0.5 }, { duration: 300 });
  a.put({ scrolled: true });
  await a.wait(650);
  const source = a.rect("row-contact");
  const handle = a.rect("grip-contact");
  const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
  await a.move(from, { duration: 400 });
  a.put({ grip: true });
  await a.wait(350);
  a.mark("move-drag");
  await a.drag(
    { x: from.x + 32, y: from.y - 88 },
    (at) => {
      const dx = at.x - from.x;
      a.put({
        lifted: true,
        drag: { x: dx, y: at.y - from.y },
        slot: at.y < from.y - 30,
        moveLevel: dx > 24 ? 3 : 2,
      });
    },
    {
      duration: 2200,
      // Reach the vertical slot first, then step right by one 16px indent.
      path: (t, start) =>
        t < 0.7
          ? { x: start.x + (16 * t) / 0.7, y: start.y - (88 * t) / 0.7 }
          : { x: start.x + 16 + (16 * (t - 0.7)) / 0.3, y: start.y - 88 },
    }
  );
  a.mark("move-drop");
  a.put({ lifted: false, drag: { x: 0, y: 0 }, moved: true, slot: false, grip: false });
  await a.wait(350);
  a.put({ toast: true });
  await a.move({ x: source.x + source.width - 8, y: source.y + 10 }, { duration: 300 });
  await a.wait(1800);
}

function Tools({ id, show, canIndent }: { id: RowId; show: boolean; canIndent: boolean }) {
  return (
    <span className="ute-tools" data-show={show || undefined}>
      <span className="ute-tool" data-target={`tool-outdent-${id}`} data-cursor="pointer">
        <IndentDecrease size={16} strokeWidth={2} aria-hidden />
      </span>
      <span
        className="ute-tool"
        data-target={`tool-indent-${id}`}
        data-cursor="pointer"
        data-disabled={!canIndent || undefined}
      >
        <IndentIncrease size={16} strokeWidth={2} aria-hidden />
      </span>
      <span className="ute-tool" data-target={`tool-add-${id}`} data-cursor="pointer">
        <Plus size={16} strokeWidth={2} aria-hidden />
      </span>
      <span
        className="ute-tool ute-tool--delete"
        data-target={`tool-delete-${id}`}
        data-cursor="pointer"
      >
        <Trash2 size={16} strokeWidth={2} aria-hidden />
      </span>
    </span>
  );
}

function Row({
  id,
  name,
  level,
  parent,
  editing,
  placeholder,
  tools,
  path,
  order,
  motion,
  moving,
  lifted,
  grip,
}: {
  id: string;
  name: string;
  level: number;
  parent: boolean;
  editing: boolean;
  placeholder?: string;
  tools?: React.ReactNode;
  path?: string;
  order?: number;
  motion?: CSSProperties;
  moving?: boolean;
  lifted?: boolean;
  grip?: boolean;
}) {
  return (
    <div
      className="ute-row"
      data-target={`row-${id}`}
      data-cursor={moving ? "open" : "ibeam"}
      data-moving={moving || undefined}
      data-lifted={lifted || undefined}
      data-parent={parent || undefined}
      data-editing={editing || undefined}
      style={{ marginLeft: level * 16, ["--i" as string]: order, ...motion }}
    >
      {id === "contact" && (
        <span
          className="ute-grip"
          data-target="grip-contact"
          data-cursor="open"
          data-show={grip || lifted || undefined}
        >
          <GripVertical size={14} strokeWidth={2} aria-hidden />
        </span>
      )}
      <span className="ute-name">
        {name}
        {editing && <span className="ute-caret" key={name} />}
        {placeholder && (
          <span className="ute-placeholder" data-show={(editing && !name) || undefined} aria-hidden>
            {placeholder}
          </span>
        )}
      </span>
      <span className="ute-end">
        {/* A leaf's path is its answer in the Tasks tab; a parent has none, and a nameless row has none yet */}
        {path !== undefined && (
          <span className="ute-path" data-show={(!parent && name.trim() !== "") || undefined}>
            {/* Mount after compact mode reveals the badge so Roll can measure its text. */}
            {id === "contact" && moving ? (
              <Roll variant="fade" align="end">
                {path}
              </Roll>
            ) : (
              path
            )}
          </span>
        )}
        {tools}
        <ChevronDown className="ute-chevron" size={16} strokeWidth={2} aria-hidden />
      </span>
    </div>
  );
}

/** A spreadsheet file as macOS draws it: a page with a folded corner and a green band */
function CsvIcon() {
  return (
    <span className="ute-csv">
      <span className="ute-csv__band">CSV</span>
    </span>
  );
}

/** The drag image rides with the hand from outside the window, then shrinks away on the drop */
function DragImage({ ghost }: { ghost: Ghost }) {
  const carried = ghost.on && !ghost.dropped;
  const style: CSSProperties = {
    transform: `translate(${ghost.at.x - ghost.off.x}px, ${ghost.at.y - ghost.off.y}px)`,
  };
  return (
    <div
      className="ute-drag"
      data-show={carried || undefined}
      data-dropped={ghost.dropped || undefined}
      style={style}
      aria-hidden
    >
      <div
        className="ute-drag__inner"
        style={{ transformOrigin: `${ghost.off.x}px ${ghost.off.y}px` }}
      >
        <CsvIcon />
        <span className="ute-drag__name">{FILE}</span>
      </div>
    </div>
  );
}

export default function UsabilitreeTreeEditor() {
  return (
    <Stage<S>
      width={720}
      height={480}
      compact={{ below: 720, width: 358, height: 340 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: OFFSTAGE }}
      className="ute"
    >
      {(s, rect, layout) => {
        const isNew = s.version === "new";
        const nested = s.added && s.level === 3;
        // Indent needs a row above at the same level to nest under
        const canIndent: Record<RowId, boolean> = {
          permits: false,
          new: s.level === 2,
          health: true,
        };
        const tools = (id: RowId) => (
          <Tools id={id} show={s.editing === id} canIndent={canIndent[id]} />
        );
        const motion = (id: string): CSSProperties | undefined => {
          if (!s.moving) return undefined;
          if (id === "contact")
            return {
              transform: `translate(${s.lifted ? s.drag.x : 0}px, ${s.lifted ? s.drag.y : s.moved ? -88 : 0}px)`,
              marginRight: s.lifted ? 40 : 0,
              transformOrigin: "-9px 50%",
            };
          if ((id === "new" || id === "about") && (s.slot || s.moved))
            return { transform: `translateY(${layout === "compact" ? 64 : 44}px)` };
          return undefined;
        };
        const tip = TIPS[s.tip];
        const button = rect(
          `tool-${s.tip}-${s.tip === "add" ? "permits" : s.tip === "indent" ? "new" : "health"}`
        );
        // Centered on its button, unless that would put it within a gutter of the stage's edge
        const [stageWidth, gutter] = layout === "compact" ? [358, 16] : [720, 36];
        const center = Math.min(button.x + button.width / 2, stageWidth - gutter - tip.width / 2);
        const tipAt = { ...button, x: center - button.width / 2 };
        return (
          <>
            <div className="ute-mask" data-moving={s.moving || undefined}>
              <Window url="usabilitree.com/treetest/setup" urlShape="pill" className="ute-win">
                <div className="ute-body">
                  {layout === "wide" && (
                    <div className="ute-tabs">
                      {TABS.map(({ label, icon: TabIcon }) => (
                        <span
                          key={label}
                          className="ute-tab"
                          data-active={label === "Tree" || undefined}
                        >
                          <TabIcon size={16} strokeWidth={2} aria-hidden />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Today's tab, then the new editor wiped in over it from the right. Each version
                      carries its own header, so the label never moves and Old becomes New as the line passes it */}
                  <div className="ute-swap" data-version={s.version}>
                    {/* Today: the comma syntax, typed and parsed by hand */}
                    <div className="ute-old" aria-hidden={isNew || undefined}>
                      <div className="ute-head">
                        <span className="ute-label">Tree Structure</span>
                        <span className="ute-badge ute-badge--old">Old</span>
                      </div>
                      <div className="ute-textarea">
                        {PLACEHOLDER.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                      <span className="ute-parse">Parse Structure</span>
                    </div>

                    <div className="ute-new" aria-hidden={!isNew || undefined}>
                      <div className="ute-head ute-head--new" data-target="head">
                        <span className="ute-heading">
                          <span className="ute-label">Tree Structure</span>
                          <span className="ute-badge">New</span>
                        </span>
                        <span className="ute-head-actions">
                          <span className="ute-paths-control">
                            <span className="ute-paths-label">Paths</span>
                            <Toggle on aria-label="Paths" />
                          </span>
                          <span className="ute-head-divider" aria-hidden />
                          <span className="ute-head-icons">
                            <span
                              className="ute-head-button"
                              role="button"
                              aria-label="Expand all"
                              data-target="header-chevronsupdown"
                              data-cursor="pointer"
                            >
                              <ChevronsUpDown size={16} strokeWidth={2} aria-hidden />
                            </span>
                            <span
                              className="ute-head-button"
                              role="button"
                              aria-label="Collapse all"
                              data-target="header-chevronsdownup"
                              data-cursor="pointer"
                            >
                              <ChevronsDownUp size={16} strokeWidth={2} aria-hidden />
                            </span>
                            <span
                              className="ute-head-button"
                              role="button"
                              aria-label="What participants will see"
                              data-target="header-eye"
                              data-cursor="pointer"
                            >
                              <Eye size={16} strokeWidth={2} aria-hidden />
                            </span>
                            <span
                              className="ute-head-button"
                              role="button"
                              aria-label="Import"
                              data-target="header-upload"
                              data-cursor="pointer"
                            >
                              <Upload size={16} strokeWidth={2} aria-hidden />
                            </span>
                            <span
                              className="ute-head-button ute-head-keyboard"
                              role="button"
                              aria-label="Keyboard shortcuts"
                              data-target="header-keyboard"
                              data-cursor="pointer"
                            >
                              <KeyboardIcon size={16} strokeWidth={2} aria-hidden />
                            </span>
                          </span>
                        </span>
                      </div>
                      <div className="ute-editor" data-moving={s.moving || undefined}>
                        <div
                          className="ute-zone"
                          data-target="zone"
                          data-over={s.over || undefined}
                          data-gone={s.imported || undefined}
                        >
                          <span className="ute-zone__icon">
                            <FileUp size={20} strokeWidth={1.75} aria-hidden />
                          </span>
                          <span className="ute-zone__title">Start your tree</span>
                          {/* One line at column width too, so the file can be held above the title there */}
                          <span className="ute-zone__line">
                            {layout === "wide"
                              ? "Paste a list, drop a CSV, or add items one by one."
                              : "Paste a list, drop a CSV, or add items."}
                          </span>
                          <span className="ute-zone__actions">
                            <span className="ute-btn">
                              <Upload size={16} strokeWidth={2} aria-hidden />
                              Import CSV
                            </span>
                            <span className="ute-btn">
                              <Plus size={16} strokeWidth={2} aria-hidden />
                              Add item
                            </span>
                          </span>
                        </div>

                        <div
                          className="ute-rows"
                          data-target="rows"
                          data-in={s.imported || undefined}
                          data-moving={s.moving || undefined}
                          data-scrolled={s.scrolled || undefined}
                        >
                          {TREE.map((item, i) => (
                            <Fragment key={item.id}>
                              {item.id === "health" ? (
                                // Deletable: its Collapse carries the gap above it, so the rows below close up whole
                                <Collapse open={!s.deleted}>
                                  <div className="ute-gap">
                                    <Row
                                      id="health"
                                      name={item.name}
                                      level={item.level}
                                      parent={false}
                                      editing={s.editing === "health"}
                                      tools={tools("health")}
                                      path={PATH.health}
                                      order={i}
                                    />
                                  </div>
                                </Collapse>
                              ) : (
                                <Row
                                  id={item.id}
                                  name={item.name}
                                  level={item.id === "contact" && s.moved ? 3 : item.level}
                                  motion={motion(item.id)}
                                  moving={item.id === "contact" && s.moving}
                                  lifted={item.id === "contact" && s.lifted}
                                  grip={s.grip}
                                  parent={item.parent || (item.id === "permits" && nested)}
                                  editing={s.editing === item.id}
                                  tools={item.id === "permits" ? tools("permits") : undefined}
                                  path={
                                    item.id === "contact" && s.moved
                                      ? layout === "compact"
                                        ? "…/business-permits/contact"
                                        : `${PATH.permits}/contact`
                                      : PATH[item.id]
                                  }
                                  order={i}
                                />
                              )}
                              {/* The new item is a sibling in the list; its Collapse carries the gap above it */}
                              {item.id === "permits" && (
                                <Collapse open={s.added}>
                                  <div className="ute-gap">
                                    <Row
                                      motion={motion("new")}
                                      id="new"
                                      name={s.name}
                                      level={s.level}
                                      parent={false}
                                      editing={s.editing === "new"}
                                      placeholder="Item name"
                                      tools={tools("new")}
                                      path={`${s.level === 3 ? PATH.permits : PATH.services}/${slug(s.name)}`}
                                    />
                                  </div>
                                </Collapse>
                              )}
                            </Fragment>
                          ))}

                          <span
                            className="ute-insertion"
                            data-show={s.slot || undefined}
                            style={{ left: s.moveLevel * 16 }}
                            aria-hidden
                          />
                        </div>
                      </div>
                    </div>
                    {/* The line that carries the new version in; no handle, so it never reads as a slider to drag */}
                    <span className="ute-wipe" aria-hidden>
                      <span className="ute-wipe__line" />
                    </span>
                  </div>
                </div>
              </Window>
            </div>
            <DragImage ghost={s.ghost} />
            <div className="ute-toaster">
              <div className="ute-move-toast" data-show={s.toast || undefined} role="status">
                <span className="ute-toast-title">Moved “Contact” under Business permits</span>
                <span className="ute-toast-undo" role="button" aria-label="Undo move">
                  Undo
                </span>
              </div>
            </div>
            <Tooltip show={s.tipShow} at={tipAt} side="above" className="ute-tip">
              {tip.label}
              {tip.keys && <kbd>{tip.keys}</kbd>}
            </Tooltip>
          </>
        );
      }}
    </Stage>
  );
}
