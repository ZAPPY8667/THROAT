# Next session: where things stand (2026-11-14, after v1.25)

Everything in PLAN.md is done (phases 1–5, phase 1.5, the world, backlog 1–6), released as v1.15 → v1.24 and pushed to `main`.
Read CLAUDE.md, then HISTORY.md (sections v1.15 onward) for why things are tuned the way they are.

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
