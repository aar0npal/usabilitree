# Stageshow editor demos in Updates

Sources: the existing UsabiliTree Tree and Tasks editor examples, including their
phone variants. The latest compositions, scripts, cursor targets and posters
were refreshed from the source examples. Only the parts of the MIT-licensed kit these four demos use are
included; `kit/index.ts` contains those exports. The source license is in `LICENSE`.

Host: the November 3, 2026 update in `/dashboard/updates`. Each demo repeats automatically and has an icon button beside
its title to pause or resume in place. Below 768px the host loads the phone example; larger screens
load the desktop example, which also has its original compact column layout.
The kit respects reduced motion and stops offscreen work.

## Checks

- TypeScript passes; all 119 tests pass, including four playback-clock tests.
- Updates-page lint and formatting pass. Imported Stageshow code has 20 lint
  warnings, with no errors; it was formatted for this repository.
- Rendered the actual UpdatesList and EditorDemos components in an isolated
  review page using the app's Tailwind styles and dashboard column dimensions.
  The authenticated dashboard itself redirected the preview to login. The
  review page uses a placeholder public app URL, not account or production data.
- Checked responsive selection at 390px, 768px and 1440px, plus layout at 360px.
  No horizontal page overflow. At 390px both phone stages render at their 358px
  compact design width; at 768px the desktop examples use their compact layout.
- Exercised pause/resume in the isolated card preview. Each demo has its own
  clock; pausing freezes script waits, tween time, part cleanup timers, CSS
  transitions and keyframes. Reduced motion retains the completed poster.
  Completed stories hold briefly and fade back to their opening before replay.
- Captured and inspected all four animation contact sheets, plus a full update
  card with reduced motion on a 390px viewport. Text, date, email link and beta
  invitation are present. The demo bodies are hidden from assistive technology;
  their captions and real playback controls remain accessible.

## Film limitations

These contact sheets and scans belong to the first integration, before the
latest demo refresh and playback controls. The latest round verified two
automatic restarts in the phone preview, a paused DOM remaining unchanged for
28 seconds, and every running stage animation entering the paused state.
New full film gates have not been run for the refreshed demos.

The four `film.mjs --gate` runs are **not passes**. Motion coverage was
inconclusive under machine load, with gaps of 267–669ms. All four runs report
six identical `kit override` findings: the scanner treats the kit's own phone
rules inside the bundled stylesheet as example overrides (including Android
rules when the selected scene is the desktop browser). Those declarations are
from the copied kit, not host geometry changes. A missing review-page favicon
also produced a 404. Other candidates include the existing path-width changes,
text appearing while typing, and rows moving during reordering. Contact sheets
were inspected, but these scans cannot rule out a one-frame motion fault.

Artifacts from this integration check are local `/tmp/usabilitree-updates-*`
PNGs, reports and logs; they are not shipped with the app.

Not checked: the logged-in dashboard, physical devices, Safari/Firefox, an
independent fresh-eye review, or production bundle sizes. The original demos
and safekeep copies were not changed.

## Playback integration

The copied kit has a local playback clock and context. It does not replace the
page's global clocks. Part timers use that clock, while layout measurements stay
on the native layout clock. The stage pauses its own Web Animations and resumes
only the animations it paused. Its repeat boundary resets behind a short fade.
These are host integration changes; the source skill and safekeep remain intact.
