# Next session: where things stand (2026-11-14, after v1.35)

v1.35 is on `main` and live (https://zappy8667.github.io/THROAT/, checked byte-for-byte after the push). Everything from PLAN.md,
the backlog and both "next 5" lists is done (v1.25–v1.35). Read CLAUDE.md, then HISTORY.md (v1.25 onward is this stretch).

## Testing tips from the last session
- Browser scripts (playwright): the title screen now covers everything on load. Call `__title.go('engine')` (then `__tut.end()`
  on a fresh profile, since a first-timer gets the tutorial) before driving the stand or editor. `__demo.D` exposes the demo state
  so a script can jump to a phase (e.g. set the craft falling home and `D.ph='homecoast'`) instead of watching 10 minutes.
- The full demo (pad → Moon → home) takes ~10 minutes in headless Chrome; the headless mission script that proved it is easy to
  rebuild from tests/flight/ap_node_land.js (ascent, node moon, rails coast, land here, ascent alt 20 km, node home, stage to the
  capsule, sas "retro", chutes).
- The session's network needed zappy8667.github.io allowed (done in the Default environment) to check the live site.

## Open items
Done in v1.35: title screen, demo to the Moon and back, propellant density. Wyatt doesn't want challenges/missions: THROAT stays a
sandbox.
- **Future: a tech tree** (Wyatt's idea for later): unlock parts and engines as you test and fly. Not started; ask him how it
  should work (what unlocks what, what you earn it with) before building anything.
- Playtest email v2 for Zack (demo, separation motors, share codes, kits, title screen) when Wyatt wants it.

## Rules that bit us
- Long one-line JS edits: never append `// comment` before more code on the same line (it hid `v.hasLegs` for 7 versions).
- New part ids with extra fields (`engine:stand:4`) must be parsed everywhere ids are read (vab palette broke once).
- Pushing to `main` needs Wyatt to say so in the session; otherwise push to the session's branch.
