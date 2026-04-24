# Tree Testing — Implementation Notes & Redesign Thoughts

Personal working doc for thinking through the tree test data model. Covers (1) what the current implementation actually does and why Recalculate Stats has been fragile, (2) the minimum viable fix on the current schema, and (3) what a proper overhaul should look like.

---

## 1. Current Implementation — Design & Problems

### The relevant tables

- `tree_tasks.expected_answer` — a plain string path, e.g. `/settings/server/general`. Multiple correct answers are comma-separated.
- `tree_configs.parsed_tree` — JSON blob of `TreeNode[]` (recursive, each node has `name` and optional `link`).
- `tree_task_results`:
  - `successful` (bool)
  - `direct_path_taken` (bool)
  - `completion_time_seconds` (int)
  - `path_taken` — **concatenated string** of every node name the participant visited, e.g. `/settings/kavita/third-party/openid-connect`
  - `confidence_rating`, `skipped`, timestamps
  - **No `selected_link` column.** The actual leaf the participant clicked is never persisted.

### Live completion path (ground truth)

When a participant clicks a leaf to submit a task in `src/components/tree-test.tsx`:

1. `selectedLink` is read directly from the clicked leaf node's `link` property.
2. `successful = correctAnswers.includes(selectedLink)` — deterministic.
3. `directPathTaken` is computed by comparing the visited node sequence to the expected path.
4. `pathTaken` is serialized to a slash-concatenated string for display, and **`selectedLink` is thrown away** once `successful` is derived from it.

This is fine *at the moment of completion* — the source of truth exists, it's just not kept.

### Recalculate Stats (the broken path)

Added in January 2026 after a user reported that editing `expected_answer` didn't refresh historical stats. The button walks every result for a study and recomputes `successful`.

Since `selected_link` was never stored, it has to reverse-engineer the participant's final selection from `path_taken`. As of this PR the resolver is split into two helpers in `src/lib/treetest/actions.ts`:

- `collectValidLinks(tree)` — DFS-collects every leaf `link` from the tree.
- `resolveSelectedLink(validLinks, pathTaken)` — the actual matching logic.

`findLastValidPath(tree, pathTaken)` is a thin wrapper for single-shot callers. Hot loops (`recalculateStudyResults`, the answer-changed path in `saveStudyData`) call the two helpers directly so the tree walk doesn't rerun per result.

`resolveSelectedLink` sorts `validLinks` by length descending once and then walks through four steps:

1. **Longest-match suffix check** — return the first link that `pathTaken.endsWith(link)` using the sorted list, so the longest (most specific) match wins. Handles the happy path where the participant landed directly on a leaf.
2. **Truncated-path fix-up** — append the last segment a second time (`pathTaken + "/" + lastSegment`) and retry (1). Works around an older `updatePathTaken` bug where a child with the same slug as its parent was deduped out.
3. **Progressive multi-segment suffix** — build growing trailing suffixes of `pathTaken` (`/seg`, `/seg-1/seg`, …) and return the first length that produces exactly one match, again filtering from `sortedLinks` so hits are stable under tree reorganization.
4. **Last-resort fallback** — if every suffix length was ambiguous, return the first candidate from the most-specific (smallest) ambiguous set seen. Because we filter from `sortedLinks`, that first candidate is the longest link at that suffix level, not whatever happens to come first in DFS order.

Before this PR, step 3 didn't exist and step 4 was a naïve `validLinks.find(link => link.endsWith('/${segment}'))` using only the last segment of `pathTaken`. That fallback failed in two ways:

- `.find` returned the *first* link in array order whose terminal segment matched. Array order is whatever tree-parse order happened to be — effectively arbitrary. Two leaves named `contact-us` under different parents → 50/50 wrong.
- When a user backtracks (opens `Kavita+` → decides wrong → closes it → opens `Third-Party` → clicks `OpenID Connect`), `path_taken` is `/kavita/third-party/openid-connect` but the selected leaf lives under `Third-Party`, not `Kavita+`. The heuristic had no way to know which branch the final click was in.

### The drift this causes

- Original completion: correct (had `selectedLink`).
- After Recalculate: sometimes wrong (heuristic guessed the wrong leaf).

So a result can start as Success and become Fail after recalculation — even when `expected_answer` didn't change — purely because the recalc heuristic picked the wrong leaf.

Bonus inconsistency: `recalculateStudyResults` only updates `successful`. It does **not** touch `direct_path_taken`. So if anything actually did change legitimately, the two booleans drift out of sync and you get rows labeled "Direct Fail" when the recalculation would have said "Indirect Success" (or vice versa).

### Impact

This button has been live since Jan 2026. Every owner who clicked Recalculate on a study with duplicate leaf names or users who backtracked has received at least some wrong outcomes. The stats shown on the Analysis tab for those studies is not trustworthy.

---

## 2. Short-Term Fix for the Current Schema

Shipped on `fix/recalculate-path-outcome`: improved the suffix-matching logic so the fallback prefers longer, context-aware matches. This removes most of the easy failure cases (duplicate leaf names where one branch is further from the pathTaken trajectory).

But the heuristic is still a heuristic. The real short-term fix is:

### Add `selected_link` to `tree_task_results`

```sql
ALTER TABLE tree_task_results ADD COLUMN selected_link TEXT;
```

- **Live completion**: write `selectedLink` at submit time — it's already in memory, just persist it.
- **Recalculate**: becomes `successful = correctAnswers.includes(result.selected_link)`. No heuristics, identical logic to live completion.
- **Also update `direct_path_taken`** in the recalc loop so the two outcome fields stay consistent.

### Backfill strategy (two options)

1. **Best-effort backfill** — run the improved `findLastValidPath` once on existing rows to populate `selected_link`. Flag with `selected_link_backfilled = true`. Accept that some rows are still wrong but at least they're stable (won't flip again on next Recalculate).
2. **Honest** — leave `selected_link` NULL for pre-migration rows. Recalculate refuses to touch NULL rows and shows the owner a "X legacy results cannot be recalculated accurately" note.

Lean toward option 2. Better to tell the owner "we don't know" than to silently lie with a guess.

### Upgrade `path_taken` to structured JSON

The concatenated string can't distinguish "clicked folder" from "clicked leaf" from "expanded and backtracked." Replace with:

```json
[
  { "nodeId": "n42", "action": "expand", "atMs": 1200 },
  { "nodeId": "n56", "action": "expand", "atMs": 3100 },
  { "nodeId": "n56", "action": "collapse", "atMs": 4100 },
  { "nodeId": "n57", "action": "select", "atMs": 4800 }
]
```

Benefits:
- Same-named leaves never ambiguous (node ID is unique).
- Directness recomputation becomes precise even when the correct answer changes.
- Intent is preserved — a folder expand no longer looks identical to a leaf click.

Keep the slash-concatenated string as a denormalized display field if you want, but the JSON is authoritative.

---

## 3. Future Overhaul — Rethinking the Schema

Since the DB is already being redesigned for V2, this is the right time to stop patching the outcome-centric model and move to an event-sourced one. The established tree-testing tools (Optimal Workshop Treejack, UXTweak Tree Testing) both operate on the same underlying idea: **store every interaction as a discrete event, derive outcomes from the event stream.** That's what makes their "First click" analysis, path flow diagrams, and retroactive correct-answer changes work without heuristics.

### Design principles

1. **Stable node IDs.** Every tree node has a permanent UUID. Tree edits don't break historical data.
2. **Versioned trees.** Each published tree snapshot is immutable. Results reference the version they were collected against. Owners can edit the tree freely after the study goes live without corrupting past data.
3. **Events are the source of truth.** `click`, `expand`, `collapse`, `back`, `skip`, `submit`, `idle_pause` — every discrete thing the participant did, with timestamps.
4. **Outcomes are derived.** `is_successful`, `is_direct`, `final_selected_node_id` — all computed from the event stream. A bug in the derivation is a pure function bug; rerun it and you're fixed. No data lost.

### Proposed schema

```
tree_versions
  id (uuid)
  study_id
  snapshot_json        -- full tree structure at this version, immutable
  created_at
  published_at         -- null if still draft
  is_current (bool)

tree_nodes
  id (uuid, stable)
  study_id
  version_id           -- which version this node belongs to
  parent_id            -- self-ref, nullable for roots
  label
  href                 -- nullable; only leaves have href
  position             -- order among siblings

tree_tasks
  id
  study_id
  task_index
  description
  max_time_seconds

tree_task_correct_nodes  -- many-to-many, supports multiple correct answers
  task_id
  node_id
  version_id

tree_participants
  id
  study_id
  version_id           -- which tree version they actually saw
  started_at
  completed_at
  duration_active_seconds

tree_test_events        -- the append-only event log
  id
  participant_id
  task_id
  event_type           -- 'expand' | 'collapse' | 'select' | 'skip' | 'submit' | 'idle_pause' | 'idle_resume'
  node_id              -- nullable for non-node events
  occurred_at
  time_since_task_start_ms

tree_task_outcomes      -- derived, rebuildable from events
  id
  participant_id
  task_id
  final_selected_node_id  -- nullable if skipped
  is_successful            -- nullable if skipped
  is_direct                -- nullable if skipped
  completion_time_seconds
  confidence_rating
  skipped (bool)
  derived_at              -- last derivation timestamp
  tree_version_id
```

### Why this is a meaningful upgrade

- **Recalculation is trivial and always correct.** It's just re-running a deterministic reducer over `tree_test_events`. No heuristic, no guessing, no drift.
- **Tree edits are safe.** Owner edits create a new `tree_versions` row. Existing results keep pointing at the old version. New participants use the new version. No data corruption when someone renames a node mid-study.
- **Analytics get richer for free.** First-click distribution, time-per-click heatmaps, backtrack detection, "where did people end up when they failed" — all natural queries on the event table.
- **No string concatenation anywhere.** Node IDs all the way down; same-named leaves are never ambiguous by construction.
- **Auditable.** If a user says "my result looks wrong," you can literally replay their events in the UI. No mystery.

### What the established tools do (from their help docs)

Both Optimal Workshop Treejack and UXTweak's tree testing tool expose this surface to users, which is a strong hint their internal model is event-based:

- **First click analysis** — only possible if you stored the first click as a distinct event, not just the final answer.
- **Path visualization** (pie tree / flow diagram) — needs per-click events, not a concatenated string.
- **Retroactive correct-answer editing** without result corruption — needs stable node IDs and derived outcomes.
- **Session replay** (UXTweak) — full event stream with timestamps.

Worth spending an hour on their docs before locking the schema, just to steal any field names / event types you hadn't considered:
- Optimal Workshop Treejack help: https://help.optimalworkshop.com/
- UXTweak Tree Testing help: https://help.uxtweak.com/tree-testing

### Migration path from current schema

1. Freeze current tables in read-only mode when V2 ships.
2. New studies go straight to the V2 schema.
3. For existing studies: import `tree_task_results` rows as "pre-v2 outcomes" with `final_selected_node_id = best-effort guess from path_taken`, tagged `legacy = true`. These rows are historical — Recalculate is disabled for them because the event stream doesn't exist.
4. After a grace period, drop the old tables.

This way legacy users don't lose their data, but there's a clear line: anything collected under V2 is event-sourced and recalculation is guaranteed correct; anything older is preserved as-is and marked legacy.

---

## TL;DR

- **Today**: `selected_link` isn't stored, so Recalculate Stats guesses from `path_taken`. Guesses fail when trees have duplicate leaf names or users backtrack. The heuristic fix on `fix/recalculate-path-outcome` helps but doesn't fix the root cause.
- **Short-term** (same schema): add `selected_link` column, write it at live completion, use it in Recalculate — no more heuristics. Also update `direct_path_taken` in the recalc loop so outcomes stay consistent.
- **Overhaul** (V2 schema): event-sourced model with stable node IDs and versioned trees. Outcomes become derived views. Recalculation is free. Tree edits no longer corrupt historical data. Whole classes of bugs disappear.
