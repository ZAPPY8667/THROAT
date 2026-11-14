# Next session: where things stand (2026-11-14, after v1.25)

Everything in PLAN.md is done (phases 1–5, phase 1.5, the world, backlog 1–6), released as v1.15 → v1.24 and pushed to `main`.
Read CLAUDE.md, then HISTORY.md (sections v1.15 onward) for why things are tuned the way they are.

## Open items
Done in v1.25: live site checked, playtest pass (see HISTORY.md v1.25), flight school + new goals, Rajdhani font, playtest email text.
1. ✅ (v1.29) Phone test stand zooms to the engine.
2. ✅ (v1.30) Super Heavy reaches orbit in ~7 min.
3. Known gaps: trees/buildings have no collisions; no separate upper-stage part. (✅ v1.31: pre-v1.16 saved rockets are rebuilt.)

## Rules that bit us
- Long one-line JS edits: never append `// comment` before more code on the same line (it hid `v.hasLegs` for 7 versions).
- New part ids with extra fields (`engine:stand:4`) must be parsed everywhere ids are read (vab palette broke once).
- Pushing to `main` needs Wyatt to say so in the session; otherwise push to the session's branch.
