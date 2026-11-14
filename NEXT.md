# Next session: where things stand (2026-11-14, after v1.25)

Everything in PLAN.md is done (phases 1–5, phase 1.5, the world, backlog 1–6), released as v1.15 → v1.24 and pushed to `main`.
Read CLAUDE.md, then HISTORY.md (sections v1.15 onward) for why things are tuned the way they are.

## Open items (after v1.32), in order
1. **Demo button** ("Watch a launch"): one click flies the Super Heavy on autopilot with a cinematic camera
   (countdown, booster sep, orbit, Moon), so a judge sees the best parts without learning the controls.
2. **Your engine's fuel goes to flight**: the test stand records methane/kerosene/hydrogen with the engine card, so "Your
   engine" gets the right flame colour and tank density in flight (today it's always drawn and fuelled as hydrogen).
3. **Speed on slower PCs**: measure frame time in countdown/steam/clouds/flames; add an automatic quality step
   (fewer steam particles, simpler flames, no cloud fog) when frames drop.
4. **Share rockets**: export/import a rocket as a short text code or file, so Zack can send designs back.
5. **Editor kits**: drop a ready-made group in one go (upper stage = decoupler + Lumen Vac + tank; booster pair with side
   decouplers and noses); needs the editor to carry several parts at once.
Done earlier: v1.25–v1.32 (see HISTORY.md). Trees are scenery on purpose.

## Rules that bit us
- Long one-line JS edits: never append `// comment` before more code on the same line (it hid `v.hasLegs` for 7 versions).
- New part ids with extra fields (`engine:stand:4`) must be parsed everywhere ids are read (vab palette broke once).
- Pushing to `main` needs Wyatt to say so in the session; otherwise push to the session's branch.
