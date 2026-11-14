# Next session: where things stand (2026-11-14, after v1.25)

Everything in PLAN.md is done (phases 1–5, phase 1.5, the world, backlog 1–6), released as v1.15 → v1.24 and pushed to `main`.
Read CLAUDE.md, then HISTORY.md (sections v1.15 onward) for why things are tuned the way they are.

## Open items (after v1.34), in order
1. **Title screen**: the game opens straight onto the test stand, which is a lot for a first-time player. Big THROAT title over a
   live launch in the background, three buttons: Watch a launch · Build an engine (tutorial) · Fly a rocket.
2. **Demo part 2**: after reaching the Moon, land on it (LAND autopilot), take off, fly home, re-enter heat-shield first,
   splash down under parachutes. The whole mission in ~6 minutes.
3. **Missions with stars**: short challenges with a score (land on the landing zone, orbit using under X t of fuel, Moon and
   back), 1–3 stars each; replay value beyond the goals list.
4. **Playtest email v2 for Zack**: what's new since v1.25 (demo, separation motors, share codes so he can send rockets back,
   kits) + 3 things to try.
5. **Fuel density per propellant**: kerosene/methane tanks hold more mass than hydrogen ones (real: ~3× denser), with the
   ready-made rockets retuned so they still reach orbit.

## Rules that bit us
- Long one-line JS edits: never append `// comment` before more code on the same line (it hid `v.hasLegs` for 7 versions).
- New part ids with extra fields (`engine:stand:4`) must be parsed everywhere ids are read (vab palette broke once).
- Pushing to `main` needs Wyatt to say so in the session; otherwise push to the session's branch.
