# Next session: where things stand (2026-11-14, after v1.25)

Everything in PLAN.md is done (phases 1–5, phase 1.5, the world, backlog 1–6), released as v1.15 → v1.24 and pushed to `main`.
Read CLAUDE.md, then HISTORY.md (sections v1.15 onward) for why things are tuned the way they are.

## Open items
All five from the v1.32 list are done in v1.33 (demo, fuel in flight, auto detail, sharing, kits) plus the tower-jettison crash fix.
Ideas for later: per-fuel tank density (needs a rebalance of every ready-made rocket), Moon landing in the demo,
the demo on a phone starts with the stand scrolled (the button is low on the page), more kits (lander legs set, crew top).

## Rules that bit us
- Long one-line JS edits: never append `// comment` before more code on the same line (it hid `v.hasLegs` for 7 versions).
- New part ids with extra fields (`engine:stand:4`) must be parsed everywhere ids are read (vab palette broke once).
- Pushing to `main` needs Wyatt to say so in the session; otherwise push to the session's branch.
