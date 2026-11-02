import { type CSSProperties } from "react";
import {
  Check,
  CheckCheck,
  FileText,
  GripVertical,
  ListChecks,
  MessageSquareCode,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import {
  Collapse,
  Field,
  Popover,
  Roll,
  Stage,
  Toggle,
  Window,
  type Act,
  type Layout,
} from "../../kit";
import "./tasks.css";

// UsabiliTree's setup, Tasks tab. It opens on the tab as it is today, its
// "Tasks" label badged Old: two settings cards, then a task whose correct answer is a path
// typed into a textarea, checked with a Check button. The redesign wipes in
// over it from the right behind a thin line, and Old becomes New as the line
// passes the label. In the redesign an answer is picked from the tree, never
// typed: it shows as a chip with the item's name and where it sits. Beats:
// Add task opens Task 2 with its field focused; its question is typed; Add
// answer opens the tree as a picker above the row; "heal" is searched, so
// the rows that don't match fade back and the ancestors of the match stay;
// Health services is picked, its check lands and its chip appears in the
// task; Done closes the picker. Last, its number becomes a grip and Task 2
// moves above Task 1. The digits crossfade on drop. Plays once.
// The search fades the rows that don't match rather than closing them, so the
// picker never changes size under its anchor and the match keeps its place.
//
// What keeps it reading as the product:
// - The old tab is v1's own: its switch cards, "Task 1", Description,
//   "Correct Answer(s)" with Check, the rule line about paths and the typed
//   path. The tabs never move; only what's under them is replaced.
// - The picker is the tree as the Tree tab draws it (gray parents, indented
//   leaves), so picking an answer is pointing at the item, not spelling its
//   path. The chip stores the same path a typed answer did.
//
// At column width it's one task, its answer still to pick: there are no tabs,
// and the picker moves to stay in view over the
// task, as a popover does when there's no room beside its trigger.
//
// Real strings: the tabs, the old tab's labels, the tasks, the item names,
// the buttons, the search.

type S = {
  version: "old" | "new";
  // Task 2 has been added; its question field has the focus
  added: boolean;
  describing: boolean;
  desc: string;
  picker: boolean;
  query: string;
  picked: boolean;
  reordering: boolean;
  grip: boolean;
  lifted: boolean;
  dragY: number;
  slot: boolean;
  reordered: boolean;
  up: number;
  down: number;
};

const TABS = [
  { label: "General", icon: Settings },
  { label: "Tree", icon: FileText },
  { label: "Tasks", icon: ListChecks },
  { label: "Messages", icon: MessageSquareCode },
];

const TASK_1 = "Where would you go to renew a business permit?";
const TASK_2 = "Where would you book a check-up?";

// The tree from the Tree tab demo
const TREE = [
  { id: "home", name: "Home", level: 0, parent: true },
  { id: "services", name: "Services", level: 1, parent: true },
  { id: "permits", name: "Business permits", level: 2, parent: false },
  { id: "health", name: "Health services", level: 2, parent: false },
  { id: "about", name: "About us", level: 1, parent: false },
  { id: "contact", name: "Contact", level: 1, parent: false },
];

const initial: S = {
  version: "old",
  added: false,
  describing: false,
  desc: "",
  picker: false,
  query: "",
  picked: false,
  reordering: false,
  grip: false,
  lifted: false,
  dragY: 0,
  slot: false,
  reordered: false,
  up: 0,
  down: 0,
};
// The result: every task answered, each answer a chip naming the item and where it sits. (With the
// picker open, it would cover the question it answers.)
const poster: S = {
  ...initial,
  version: "new",
  added: true,
  describing: false,
  desc: TASK_2,
  picker: false,
  query: "heal",
  picked: true,
};

const STAGE = { wide: { width: 720, height: 500 }, compact: { width: 358, height: 340 } };

// Aim inside a button but off its glyph, so the cursor never covers what it clicks
const OFF_GLYPH = { x: 0.82, y: 0.7 };

async function script(a: Act<S>) {
  // The Tasks tab as it is today
  await a.wait(2400);

  // The redesign wipes in over it from the right
  a.mark("swap");
  a.put({ version: "new" });
  await a.wait(2400);

  // At column width there's one task, its answer still to pick
  if (a.layout === "compact") {
    a.mark("open");
    await a.click({ at: "add-answer-1", ...OFF_GLYPH });
    a.put({ picker: true });
    await a.wait(800);
    await pickHealth(a);
    return;
  }

  a.mark("add");
  await a.click({ at: "add-task", ...OFF_GLYPH });
  a.put({ added: true, describing: true });
  await a.wait(700);

  a.mark("type");
  await a.type("desc", TASK_2, { interval: 45 });
  await a.wait(500);

  // The answer is picked from the tree, which opens above the row
  a.mark("open");
  await a.click({ at: "add-answer-2", ...OFF_GLYPH });
  a.put({ describing: false, picker: true });
  await a.wait(800);

  await pickHealth(a);
  await reorderTasks(a);
}

/** Search the open picker, pick Health services, close it */
async function pickHealth(a: Act<S>) {
  a.mark("search");
  await a.type("query", "heal", { interval: 120 });
  await a.wait(600);

  a.mark("pick");
  await a.click({ at: "pick-health", x: 0.72, y: 0.5 });
  a.put({ picked: true });
  await a.wait(1000);

  a.mark("done");
  await a.click({ at: "done", ...OFF_GLYPH });
  a.put({ picker: false });
  await a.wait(2600);
}

/** Reorder the draft's cards by their number handles. The compact story has one card. */
async function reorderTasks(a: Act<S>) {
  const first = a.rect("task-1");
  const second = a.rect("task-2");
  const up = second.y - first.y;
  const down = second.height + 10;
  a.mark("reorder-grip");
  a.put({ reordering: true, up, down });
  await a.move("task-grip", { duration: 450 });
  a.put({ grip: true });
  await a.wait(450);
  const from = a.center("task-grip");
  a.mark("reorder-drag");
  await a.drag(
    { x: from.x, y: from.y - up },
    (at) => {
      a.put({ lifted: true, dragY: at.y - from.y, slot: at.y < from.y - up * 0.3 });
    },
    {
      duration: 1800,
      path: (t, start, end) => ({ x: start.x, y: start.y + (end.y - start.y) * t }),
    }
  );
  a.mark("reorder-drop");
  a.put({ lifted: false, grip: false, slot: false, reordered: true });
  await a.wait(700);
  await a.move(
    { x: first.x + first.width - 28, y: first.y + up + second.height + 26 },
    { duration: 350 }
  );
  await a.wait(1700);
}

type Version = "Old" | "New";

function Badge({ badge }: { badge: Version }) {
  return (
    <span className="utk-badge" data-old={badge === "Old" || undefined}>
      {badge}
    </span>
  );
}

/** The tabs, drawn once above the wipe: they're the same in both versions */
function Tabs() {
  return (
    <div className="utk-tabs">
      {TABS.map(({ label, icon: TabIcon }) => (
        <span key={label} className="utk-tab" data-active={label === "Tasks" || undefined}>
          <TabIcon size={16} strokeWidth={2} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}

/** The section label badged with its version, as the Tree tab demos have it; v1 has no label here, so the old layer borrows the new one's */
function Heading({ badge }: { badge: Version }) {
  return (
    <div className="utk-head">
      <span className="utk-label">Tasks</span>
      <Badge badge={badge} />
    </div>
  );
}

/** The picked answer: its width opens, so Add answer slides along instead of jumping */
function PickedChip({ open }: { open: boolean }) {
  return (
    <span className="utk-chip-slot" data-open={open || undefined}>
      <span className="utk-chip-slot__inner">
        <Chip name="Health services" trail="Home › Services" />
      </span>
    </span>
  );
}

/** v1's Tasks tab: settings in cards, a path typed and checked by hand */
function OldTasks({ layout }: { layout: Layout }) {
  const wide = layout === "wide";
  return (
    <div className="utk-v1">
      <div className="utk-v1-card utk-v1-setting">
        <Toggle on={false} />
        <span>Randomize task order for each participant</span>
      </div>
      <div className="utk-v1-card utk-v1-setting">
        <Toggle on={false} />
        <span className="utk-v1-setting__text">
          <span>Allow non-leaf (parent) nodes as answers</span>
          {layout === "wide" && (
            <span className="utk-v1-small">
              When on, parent category nodes can be set as correct answers for tasks.
            </span>
          )}
        </span>
      </div>
      <div className="utk-v1-card utk-v1-task">
        <div className="utk-v1-task__head">
          <span className="utk-v1-task__title">Task 1</span>
          <Trash2 size={16} strokeWidth={2} className="utk-v1-trash" aria-hidden />
        </div>
        <span className="utk-v1-label">Description</span>
        <span className="utk-v1-input">{wide ? TASK_1 : TASK_2}</span>
        <div className="utk-v1-answer-head">
          <span className="utk-v1-label">Correct Answer(s)</span>
          <span className="utk-v1-check">
            <Check size={12} strokeWidth={2.5} aria-hidden />
            Check
          </span>
        </div>
        {wide && (
          <span className="utk-v1-small">
            All paths must start with / and must be a leaf (final destination) in the tree (e.g.,
            /home/products)
          </span>
        )}
        {wide ? (
          <span className="utk-v1-textarea">/home/services/business-permits</span>
        ) : (
          <span className="utk-v1-textarea utk-v1-textarea--empty">
            Enter paths (e.g., /home/products, /products)
          </span>
        )}
      </div>
    </div>
  );
}

function Chip({ name, trail }: { name: string; trail: string }) {
  return (
    <span className="utk-chip">
      <Check size={14} strokeWidth={2.5} aria-hidden />
      <span className="utk-chip__name">{name}</span>
      <span className="utk-chip__trail">{trail}</span>
    </span>
  );
}

/** At column width it reads "Answer", so a picked chip fits beside it on one line */
function AddAnswer({ n, short }: { n: number; short?: boolean }) {
  return (
    <span className="utk-add-answer" data-target={`add-answer-${n}`} data-cursor="pointer">
      <Plus size={14} strokeWidth={2.25} aria-hidden />
      {short ? "Answer" : "Add answer"}
    </span>
  );
}

/** A rows' name with the searched letters in bold */
function Name({ name, query }: { name: string; query: string }) {
  const at = query ? name.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, at)}
      <b>{name.slice(at, at + query.length)}</b>
      {name.slice(at + query.length)}
    </>
  );
}

/** Items that match, and the parents they sit under; the rest fade back, so the tree keeps its shape */
function shownIds(query: string) {
  if (!query) return new Set(TREE.map((item) => item.id));
  const shown = new Set<string>();
  TREE.forEach((item, index) => {
    if (!item.name.toLowerCase().includes(query.toLowerCase())) return;
    shown.add(item.id);
    let level = item.level;
    for (let i = index - 1; i >= 0 && level > 0; i -= 1) {
      if (TREE[i].level < level) {
        shown.add(TREE[i].id);
        level = TREE[i].level;
      }
    }
  });
  return shown;
}

export default function UsabilitreeTasksEditor() {
  return (
    <Stage<S>
      width={STAGE.wide.width}
      height={STAGE.wide.height}
      compact={{ below: 720, ...STAGE.compact }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: { wide: { x: 640, y: 460 }, compact: { x: 320, y: 390 } } }}
      className="utk"
    >
      {(s, rect, layout) => {
        const isNew = s.version === "new";
        const wide = layout === "wide";
        const shown = shownIds(s.query);
        // Wide, the picker opens upward from Task 2's answer row, its left edge on the row's.
        // At column width there's no room above or below, so it moves to stay in view, over the task, as a popover does
        const row = rect("answers-2");
        const task = rect("task-1");
        const pickerStyle: CSSProperties = wide
          ? { left: row.x - 8, bottom: STAGE.wide.height - row.y + 8, width: 300 }
          : { left: task.x, top: task.y - 6, width: task.width };
        return (
          <>
            <div className="utk-mask">
              <Window url="usabilitree.com/treetest/setup" urlShape="pill" className="utk-win">
                <div className="utk-body">
                  {wide && <Tabs />}
                  {/* Each version carries its own label, so it never moves and Old becomes New as the line passes it */}
                  <div className="utk-swap" data-version={s.version}>
                    <div className="utk-old" aria-hidden={isNew || undefined}>
                      <Heading badge="Old" />
                      <OldTasks layout={layout} />
                    </div>

                    <div
                      className="utk-new"
                      data-reordering={s.reordering || undefined}
                      aria-hidden={!isNew || undefined}
                      style={
                        {
                          "--utk-drag-y": `${s.dragY}px`,
                          "--utk-up": `${s.up}px`,
                          "--utk-down": `${s.down}px`,
                        } as CSSProperties
                      }
                    >
                      <div className="utk-head">
                        <span className="utk-label">Tasks</span>
                        <Badge badge="New" />
                        {wide && (
                          <span className="utk-settings">
                            <span className="utk-setting">
                              <Toggle on={false} />
                              Randomize order
                            </span>
                            <span className="utk-setting">
                              <Toggle on={false} />
                              Allow parent answers
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="utk-task-list">
                        <span
                          className="utk-insertion"
                          data-show={s.slot || undefined}
                          aria-hidden
                        />
                        {wide ? (
                          <div
                            className="utk-task"
                            data-target="task-1"
                            data-displaced={s.slot || s.reordered || undefined}
                          >
                            <span className="utk-task__n">
                              <Roll variant="fade">{s.reordered ? "2" : "1"}</Roll>
                            </span>
                            <span className="utk-task__q">{TASK_1}</span>
                            <Trash2
                              size={16}
                              strokeWidth={2}
                              className="utk-task__trash"
                              aria-hidden
                            />
                            <span className="utk-answers">
                              <Chip name="Business permits" trail="Home › Services" />
                              <AddAnswer n={1} />
                            </span>
                          </div>
                        ) : (
                          <div className="utk-task" data-target="task-1">
                            <span className="utk-task__n">1</span>
                            <span className="utk-task__q">{TASK_2}</span>
                            <Trash2
                              size={16}
                              strokeWidth={2}
                              className="utk-task__trash"
                              aria-hidden
                            />
                            <span className="utk-answers">
                              <PickedChip open={s.picked} />
                              <AddAnswer n={1} short />
                            </span>
                          </div>
                        )}

                        {wide && (
                          <Collapse open={s.added}>
                            <div className="utk-gap">
                              <div
                                className="utk-task"
                                data-target="task-2"
                                data-lifted={s.lifted || undefined}
                                data-reordered={s.reordered || undefined}
                              >
                                <span
                                  className="utk-task__n utk-task__handle"
                                  data-target="task-grip"
                                  data-cursor="open"
                                  data-grip={s.grip || undefined}
                                >
                                  <span className="utk-task__digit">
                                    <Roll variant="fade">{s.reordered ? "1" : "2"}</Roll>
                                  </span>
                                  <GripVertical size={14} strokeWidth={2} aria-hidden />
                                </span>
                                <span
                                  className="utk-task__q utk-task__field"
                                  data-focused={s.describing || undefined}
                                >
                                  {s.desc}
                                  {s.describing && <span className="utk-caret" key={s.desc} />}
                                  <span
                                    className="utk-placeholder"
                                    data-show={(s.describing && !s.desc) || undefined}
                                    aria-hidden
                                  >
                                    What should participants find?
                                  </span>
                                </span>
                                <Trash2
                                  size={16}
                                  strokeWidth={2}
                                  className="utk-task__trash"
                                  aria-hidden
                                />
                                <span className="utk-answers" data-target="answers-2">
                                  <PickedChip open={s.picked} />
                                  <AddAnswer n={2} />
                                </span>
                              </div>
                            </div>
                          </Collapse>
                        )}
                      </div>

                      <span className="utk-add-task" data-target="add-task" data-cursor="pointer">
                        <Plus size={16} strokeWidth={2} aria-hidden />
                        Add task
                      </span>
                    </div>

                    {/* The line that carries the new version in; no handle, so it never reads as a slider to drag */}
                    <span className="utk-wipe" aria-hidden>
                      <span className="utk-wipe__line" />
                    </span>
                  </div>
                </div>
              </Window>
            </div>

            {/* Scaled from its top edge, which holds still as it opens and closes; the scale is a few percent, too small to read as a direction */}
            <Popover show={s.picker} origin="top left" className="utk-picker" style={pickerStyle}>
              <div className="utk-picker__head">
                <Field
                  className="utk-search"
                  value={s.query}
                  focused={s.picker && !s.picked}
                  placeholder="Search the tree"
                  leading={<Search size={14} strokeWidth={2.25} aria-hidden />}
                />
                <span className="utk-done" data-target="done" data-cursor="pointer">
                  <CheckCheck size={14} strokeWidth={2.25} aria-hidden />
                  Done
                </span>
              </div>
              <div className="utk-options">
                {TREE.map((item) => (
                  <div
                    key={item.id}
                    className="utk-option"
                    data-parent={item.parent || undefined}
                    data-dim={!shown.has(item.id) || undefined}
                    data-picked={(item.id === "health" && s.picked) || undefined}
                    data-target={item.parent ? undefined : `pick-${item.id}`}
                    data-cursor={item.parent ? undefined : "pointer"}
                    style={{ marginLeft: item.level * 14 }}
                  >
                    <span className="utk-option__name">
                      <Name name={item.name} query={s.query} />
                    </span>
                    {!item.parent && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="utk-option__check"
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </div>
            </Popover>
          </>
        );
      }}
    </Stage>
  );
}
