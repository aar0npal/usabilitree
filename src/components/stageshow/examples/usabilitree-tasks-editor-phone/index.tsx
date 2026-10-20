import { type CSSProperties } from "react";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { Collapse, Keyboard, Phone, Roll, Stage, Toggle, type Act } from "../../kit";
import "./phone.css";

// The Tasks tab redesign from usabilitree-tasks-editor, on an iPhone. It opens
// on the Tasks tab as v1 draws it at phone width, its label badged Old: switch
// cards, then a task whose answer is a path typed into a textarea and checked
// with Check. The redesign wipes in from the right behind a thin line and Old
// becomes New as the line passes the label. Add task opens Task 2 with its
// question field focused and the keyboard up; the question is typed. Add answer
// raises the tree as a bottom drawer (the app's own Drawer), its search
// focused, so the keyboard stays; "heal" is typed, the rows that don't match
// fade back; Health services is tapped and its check lands; Done drops the
// drawer and the keyboard, and the answer sits in Task 2 as a chip. Last,
// long-press the card and move it above Task 1; the digits crossfade on drop. Plays once.
//
// What keeps it honest as a phone design:
// - Text is 16pt in every field (the question, the search), the size iOS
//   Safari won't zoom into; rows and buttons are 44pt or more.
// - A popover has no room beside its trigger at phone width, so the picker is
//   a drawer from the bottom, over a dimmed page, with the keyboard under it.
// - The search fades the rows that don't match rather than removing them, so
//   the tree keeps its shape and the row to tap stays where it was.
//
// Real strings: the tabs, the old tab's labels, the tasks, the item names, the
// buttons, the search. The keyboard keeps its letters: it's the platform's.

type S = {
  version: "old" | "new";
  added: boolean;
  describing: boolean;
  desc: string;
  drawer: boolean;
  query: string;
  picked: boolean;
  reordering: boolean;
  holding: boolean;
  lifted: boolean;
  dragY: number;
  slot: boolean;
  reordered: boolean;
  up: number;
  down: number;
};

const TABS = ["General", "Tree", "Tasks", "Messages"];
const TASK_1 = "Where would you renew a permit?";
const TASK_2 = "Where would you book a check-up?";

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
  drawer: false,
  query: "",
  picked: false,
  reordering: false,
  holding: false,
  lifted: false,
  dragY: 0,
  slot: false,
  reordered: false,
  up: 0,
  down: 0,
};
// The result: both tasks answered, each answer a chip
const poster: S = {
  ...initial,
  version: "new",
  added: true,
  describing: false,
  desc: TASK_2,
  drawer: false,
  query: "heal",
  picked: true,
};

// The predictive bar follows the word being typed, as iOS's does
const COMPLETE: Record<string, [string, string]> = {
  W: ["Where", "What"],
  Wh: ["Where", "What"],
  Whe: ["Where", "When"],
  Wher: ["Where", "Whereas"],
  Where: ["Where’s", "Wherever"],
  w: ["would", "with"],
  wo: ["would", "work"],
  wou: ["would", "wouldn’t"],
  woul: ["would", "wouldn’t"],
  would: ["wouldn’t", "would’ve"],
  y: ["you", "your"],
  yo: ["you", "your"],
  you: ["your", "you’re"],
  b: ["book", "buy"],
  bo: ["book", "both"],
  boo: ["book", "booking"],
  book: ["booking", "books"],
  a: ["a", "an"],
  c: ["check-up", "can"],
  ch: ["check-up", "check"],
  che: ["check-up", "check"],
  chec: ["check-up", "check"],
  check: ["check-up", "checks"],
  "check-": ["check-up", "check-in"],
  "check-u": ["check-up", "check-ups"],
  "check-up": ["check-ups", "check-up?"],
  h: ["health", "home"],
  he: ["health", "help"],
  hea: ["health", "head"],
  heal: ["health", "healthy"],
};

function suggestions(typed: string): [string, string, string] {
  const word = typed.split(" ").pop() ?? "";
  if (!word) return typed ? ["a", "the", "and"] : ["The", "I", "A"];
  const [one, two] = COMPLETE[word.replace(/\?$/, "")] ?? [word, word];
  return [`“${word}”`, one, two];
}

async function script(a: Act<S>) {
  // The Tasks tab as it is today
  await a.wait(2400);

  // The redesign wipes in over it from the right
  a.mark("swap");
  a.put({ version: "new" });
  await a.wait(2400);

  a.mark("add");
  await a.click({ at: "add-task", x: 0.7, y: 0.5 });
  a.put({ added: true, describing: true });
  await a.wait(900);

  a.mark("type");
  await a.type("desc", TASK_2, { interval: 80 });
  await a.wait(500);

  // The tree rises as a drawer, its search taking the keyboard
  a.mark("open");
  await a.click({ at: "add-answer-2", x: 0.72, y: 0.5 });
  a.put({ describing: false, drawer: true });
  await a.wait(900);

  a.mark("search");
  await a.type("query", "heal", { interval: 140 });
  await a.wait(600);

  a.mark("pick");
  await a.click({ at: "pick-health", x: 0.7, y: 0.5 });
  a.put({ picked: true });
  await a.wait(1000);

  a.mark("done");
  await a.click({ at: "done", x: 0.5, y: 0.5 });
  a.put({ drawer: false });
  await a.wait(2600);
  await reorderTasks(a);
}

/** A long press away from the words; the card follows the finger vertically. */
async function reorderTasks(a: Act<S>) {
  const first = a.rect("task-1");
  const second = a.rect("task-2");
  const scale = a.rect("task-number-2").height / 24;
  const up = (second.y - first.y) / scale;
  const down = second.height / scale + 10;
  const from = {
    x: second.x + second.width - 32 * scale,
    y: second.y + second.height - 24 * scale,
  };
  a.mark("reorder-hold");
  a.put({ reordering: true, up, down });
  await a.move(from, { duration: 350 });
  a.put({ holding: true });
  await a.drag(
    { x: from.x, y: from.y - up * scale },
    (at, _start, t) => {
      const lifted = t >= 140 / 1800;
      a.put({
        lifted,
        holding: !lifted,
        dragY: (at.y - from.y) / scale,
        slot: at.y < from.y - up * scale * 0.3,
      });
    },
    {
      duration: 1800,
      path: (t, start, end) => {
        // drag() presses for 310ms; this final 140ms makes the hold 450ms.
        const hold = (140 / 1800) ** 2 / (2 * 0.25) / 0.875;
        const u = Math.max(0, (t - hold) / (1 - hold));
        const eased = u * u * (3 - 2 * u);
        return { x: start.x, y: start.y + (end.y - start.y) * eased };
      },
    }
  );
  a.mark("reorder-drop");
  a.put({ holding: false, lifted: false, slot: false, reordered: true });
  await a.wait(2400);
}

type Version = "Old" | "New";

function Tabs() {
  return (
    <div className="utq-tabs">
      {TABS.map((label) => (
        <span key={label} className="utq-tab" data-active={label === "Tasks" || undefined}>
          {label}
        </span>
      ))}
    </div>
  );
}

/** The section label, badged with its version as the tree phone demo's is; v1 has no label here, so the old layer borrows the new one's */
function Head({ badge }: { badge: Version }) {
  return (
    <div className="utq-head">
      <span className="utq-label">Tasks</span>
      <span className="utq-badge" data-old={badge === "Old" || undefined}>
        {badge}
      </span>
    </div>
  );
}

/** v1's Tasks tab at phone width */
function OldTasks() {
  return (
    <div className="utq-v1">
      <div className="utq-v1-card utq-v1-setting">
        <Toggle on={false} />
        <span>Randomize task order for each participant</span>
      </div>
      <div className="utq-v1-card utq-v1-setting">
        <Toggle on={false} />
        <span>Allow non-leaf (parent) nodes as answers</span>
      </div>
      <div className="utq-v1-card utq-v1-task">
        <div className="utq-v1-task__head">
          <span className="utq-v1-task__title">Task 1</span>
          <Trash2 size={18} strokeWidth={2} className="utq-v1-trash" aria-hidden />
        </div>
        <span className="utq-v1-label">Description</span>
        <span className="utq-v1-input">{TASK_1}</span>
        <div className="utq-v1-answer-head">
          <span className="utq-v1-label">Correct Answer(s)</span>
          <span className="utq-v1-check">
            <Check size={14} strokeWidth={2.5} aria-hidden />
            Check
          </span>
        </div>
        <span className="utq-v1-input utq-v1-textarea">/home/services/business-permits</span>
      </div>
    </div>
  );
}

function Chip({ name, trail }: { name: string; trail: string }) {
  return (
    <span className="utq-chip">
      <Check size={15} strokeWidth={2.5} aria-hidden />
      <span className="utq-chip__name">{name}</span>
      <span className="utq-chip__trail">{trail}</span>
    </span>
  );
}

function AddAnswer({ n }: { n: number }) {
  return (
    <span className="utq-add-answer" data-target={`add-answer-${n}`}>
      <Plus size={16} strokeWidth={2.25} aria-hidden />
      Add answer
    </span>
  );
}

/** Items that match, and the parents they sit under; the rest fade back */
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

export default function UsabilitreeTasksEditorPhone() {
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
      className="utq"
    >
      {(s, _rect, layout) => {
        const isNew = s.version === "new";
        const shown = shownIds(s.query);
        // The keyboard follows whichever field has the focus
        const typed = s.drawer ? s.query : s.desc;
        const keyboard = s.describing || s.drawer;
        return (
          <Phone width={layout === "compact" ? 326 : 360} className="utq-phone">
            <div className="utq-page">
              <Tabs />
              {/* Each version carries its own label, so it never moves and Old becomes New as the line passes it */}
              <div className="utq-swap" data-version={s.version}>
                <div className="utq-old" aria-hidden={isNew || undefined}>
                  <Head badge="Old" />
                  <OldTasks />
                </div>

                <div
                  className="utq-new"
                  data-reordering={s.reordering || undefined}
                  aria-hidden={!isNew || undefined}
                  style={
                    {
                      "--utq-drag-y": `${s.dragY}px`,
                      "--utq-up": `${s.up}px`,
                      "--utq-down": `${s.down}px`,
                    } as CSSProperties
                  }
                >
                  <Head badge="New" />
                  <div className="utq-settings">
                    <span className="utq-setting">
                      <Toggle on={false} />
                      Randomize order
                    </span>
                    <span className="utq-setting">
                      <Toggle on={false} />
                      Parent answers
                    </span>
                  </div>

                  <div className="utq-task-list" data-reordering={s.reordering || undefined}>
                    <span className="utq-insertion" data-show={s.slot || undefined} aria-hidden />
                    <div
                      className="utq-task"
                      data-target="task-1"
                      data-displaced={s.slot || s.reordered || undefined}
                    >
                      <span className="utq-task__n">
                        <Roll variant="fade">{s.reordered ? "2" : "1"}</Roll>
                      </span>
                      <span className="utq-task__q">{TASK_1}</span>
                      <Trash2 size={18} strokeWidth={2} className="utq-task__trash" aria-hidden />
                      <span className="utq-answers">
                        <Chip name="Business permits" trail="Home › Services" />
                      </span>
                    </div>

                    <Collapse open={s.added}>
                      <div className="utq-gap">
                        <div
                          className="utq-task"
                          data-target="task-2"
                          data-lifted={s.lifted || undefined}
                          data-reordered={s.reordered || undefined}
                          data-holding={s.holding || undefined}
                        >
                          <svg
                            className="utq-hold-ring"
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            aria-hidden
                          >
                            <circle className="utq-hold-track" cx="16" cy="16" r="14" />
                            <circle
                              className="utq-hold-progress"
                              cx="16"
                              cy="16"
                              r="14"
                              pathLength="100"
                            />
                          </svg>
                          <span className="utq-task__n" data-target="task-number-2">
                            <Roll variant="fade">{s.reordered ? "1" : "2"}</Roll>
                          </span>
                          <span
                            className="utq-task__q utq-task__field"
                            data-focused={s.describing || undefined}
                          >
                            {s.desc}
                            {s.describing && <span className="utq-caret" key={s.desc} />}
                            <span
                              className="utq-placeholder"
                              data-show={(s.describing && !s.desc) || undefined}
                              aria-hidden
                            >
                              What should participants find?
                            </span>
                          </span>
                          <Trash2
                            size={18}
                            strokeWidth={2}
                            className="utq-task__trash"
                            aria-hidden
                          />
                          <span className="utq-answers">
                            {/* At phone width a chip and Add answer don't share a line: the chip opens above it */}
                            <Collapse open={s.picked}>
                              <div className="utq-chip-row">
                                <Chip name="Health services" trail="Home › Services" />
                              </div>
                            </Collapse>
                            <AddAnswer n={2} />
                          </span>
                        </div>
                      </div>
                    </Collapse>
                  </div>

                  <span className="utq-add-task" data-target="add-task">
                    <Plus size={18} strokeWidth={2} aria-hidden />
                    Add task
                  </span>
                </div>

                {/* The line that carries the new version in; no handle, so it never reads as a slider to drag */}
                <span className="utq-wipe" aria-hidden>
                  <span className="utq-wipe__line" />
                </span>
              </div>
            </div>

            {/* The tree as a drawer from the bottom, over a dimmed page */}
            <div className="utq-scrim" data-show={s.drawer || undefined} aria-hidden />
            <div
              className="utq-drawer"
              data-open={s.drawer || undefined}
              aria-hidden={!s.drawer || undefined}
            >
              <span className="utq-drawer__handle" aria-hidden />
              <div className="utq-drawer__head">
                <span className="utq-drawer__title">Answer for task 2</span>
                <span className="utq-done" data-target="done">
                  Done
                </span>
              </div>
              <div className="utq-search" data-focused={(s.drawer && !s.picked) || undefined}>
                <Search size={18} strokeWidth={2.25} aria-hidden />
                <span className="utq-search__text">
                  {s.query}
                  {s.drawer && !s.picked && <span className="utq-caret" key={s.query} />}
                  <span
                    className="utq-placeholder utq-search__placeholder"
                    data-show={(s.drawer && !s.query) || undefined}
                    aria-hidden
                  >
                    Search the tree
                  </span>
                </span>
              </div>
              <div className="utq-options">
                {TREE.map((item) => (
                  <div
                    key={item.id}
                    className="utq-option"
                    data-parent={item.parent || undefined}
                    data-dim={!shown.has(item.id) || undefined}
                    data-picked={(item.id === "health" && s.picked) || undefined}
                    data-target={item.parent ? undefined : `pick-${item.id}`}
                    style={{ marginLeft: item.level * 16 }}
                  >
                    <span className="utq-option__name">
                      <Name name={item.name} query={s.query} />
                    </span>
                    {!item.parent && (
                      <Check
                        size={16}
                        strokeWidth={2.5}
                        className="utq-option__check"
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="utq-dock" data-open={keyboard || undefined}>
              <Keyboard typed={typed} suggestions={suggestions(typed)} />
            </div>
          </Phone>
        );
      }}
    </Stage>
  );
}
