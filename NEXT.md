# Next session: where things stand (2026-11-16, after v1.42)

v1.42 is on `main` and live (https://zappy8667.github.io/THROAT/, checked byte-for-byte after the push). Read CLAUDE.md, then
HISTORY.md from v1.36 on (this stretch: v1.36–v1.42).

## What this stretch did
- v1.36 pad on a 12 m mound + flame trench (wedge, ground-level tunnels), clean view (V), everything in flight folds behind tabs.
- v1.37 lots of parts (Gnat/Spike/Condor/Atom engines, Sprinter/Longhorn boosters, variants, solar/light/shield, paints, Pathfinder).
- v1.38 tech tree (science from goals, starter kit, "Unlock everything" switch).
- v1.39 payload fairing, big legs, booster paint, Comsat. v1.40 detailed engine drawings (from Wyatt's RS-25/Raptor/SLS photos).
- v1.41 planet cut-away interior when zoomed out + sharper globe; navball with KSP-style SAS icons.
- v1.42 Earth 1.6× bigger (1,600 km; orbit ~4.9 km/s on the autopilot), map/Moon scaled, headless demo-mission test.

## Open items / ideas (ask Wyatt before starting)
- Ready-made rockets still carry lots of spare Δv (Orbiter ~8.3 km/s total). If orbit still feels easy, trim their fuel.
- Tech tree pacing: play from a fresh start and check unlocks come at a good rate for a newcomer.
- Docking port (not built: docking two craft is its own big job).
- Playtest email v2 for Zack (lots new since the last one): needs his address from Wyatt. Gmail draft only.
- THROAT stays a sandbox: no challenges or missions.

## Testing tips
- Title screen covers everything on load: `__title.go('fly'|'engine'|'watch')`. Fresh profiles have the tech tree locked:
  set `localStorage['throat.tech.v1']={"got":[],"all":true}` before driving the editor/launch in a script.
- `__vab.drawPart/mkPart` for part gallery screenshots; `__flt.release()`, `__flt.setZoom(z)`, `__flt.setFT(t)` to stage shots.
- The editor's capture key handler swallows every key while it's open (dialogs over it must be handled inside it).
- Write screenshots to the scratchpad, not the repo root.

## Rules that bit us
- Long one-line JS edits: never add `// comment` before more code on the same line (hid `v.hasLes` again in v1.37). Use `/* */`.
- New part ids with extra fields must be parsed everywhere ids are read.
- Push to `main` only when Wyatt says so; otherwise the session branch. Run `bash tests/run.sh` before every push (~6 min now).
