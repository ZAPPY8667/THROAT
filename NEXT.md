# Next session: where things stand (2026-11-14)

Everything in PLAN.md is done (phases 1–5, phase 1.5, the world, backlog 1–6), released as v1.15 → v1.24 and pushed to `main`.
Read CLAUDE.md, then HISTORY.md (sections v1.15 onward) for why things are tuned the way they are.

## Open items, in the order I'd do them
1. **Check the live site.** Wyatt has to make the repo public and turn on GitHub Pages (Settings → Pages → main / root) in a
   browser, not the GitHub app. Then open https://zappy8667.github.io/THROAT/ and play through once.
2. **Playtest pass on the new stuff** (Wyatt hasn't played v1.19–v1.24 yet). Things most likely to need tuning:
   - SLS-shaped rocket: reaches orbit on autopilot but takes ~14 game-minutes; the core alone is weak after the boosters drop.
   - Countdown/steam/clouds/globe performance on a slower PC (steam caps at 340 particles; globe texture builds once, ~300 ms).
   - Phone layout with the new left tabs (ORBIT, SURFACE, VESSEL, ASCENT, NODE, LAND) and the countdown button.
   - Tutorial: its last step now says "press Space for the countdown"; nothing teaches abort, parachutes or the autopilots.
   - Goals list (juice.js) has nothing for the new features (abort, splashdown, autopilot to orbit, Moon trip on autopilot).
3. **Font**: the plan wants D-DIN (or Rajdhani), subset and embedded as base64 woff2 (≤ 60 KB). Needs Wyatt's OK to download.
4. **Playtest email** for Zack (zachzapalac@gmail.com): the Gmail connector here can't create drafts, so give Wyatt a mailto
   link + the text (what's new + 3 things to try + the live link).
5. Known gaps: trees and buildings are scenery (no collisions); no separate upper-stage part (a tank + Lumen Vac does it);
   rockets saved before v1.16 are at the old small scale and fly oddly (no migration).

## Rules that bit us
- Long one-line JS edits: never append `// comment` before more code on the same line (it hid `v.hasLegs` for 7 versions).
- New part ids with extra fields (`engine:stand:4`) must be parsed everywhere ids are read (vab palette broke once).
- Pushing to `main` needs Wyatt to say so in the session; otherwise push to the session's branch.
