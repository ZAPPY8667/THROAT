# THROAT — project notes for Claude

A 2D rocket-engine sandbox game. You build engines on a test stand where real gas physics runs (CFD), then build
rockets from parts and fly them in real time to orbit and the Moon. Made by Wyatt for a game-making contest
(judged by his dad), so it has to be easy for a newcomer to understand and fun to show off.

## Build, run, deploy
- `python3 build.py` → writes `index.html` (the whole game in one self-contained file, ~225 KB). Always rebuild after editing `src/`.
- Run it: open `index.html` in Chrome (works from `file://`; physics runs in a Web Worker made from a blob URL).
- Live: https://zappy8667.github.io/THROAT/ (GitHub Pages, public repo, serves `index.html` from the root of `main`).
  Deploy = rebuild, commit, push to `main`; the site updates about a minute later.
- Tests: `bash tests/run.sh` (Node 18+, ~1 min, headless). Run before every push.
  - `tests/core/*` load `src/core.js` directly (atom bookkeeping, booster burn curve and Isp, speed).
  - `tests/flight/*` use `harness.js`, which runs `parts.js + orbit.js + flight.js` with DOM stubs (autopilot to orbit,
    landing limits, Moon landing, on-rails warp vs map prediction, ready-made rocket stats).
  - UI changes: check them in a real browser too (playwright + Chrome works well: screenshots of the test stand,
    editor, flight, map; phone viewport 390×844).

## Layout (`src/`)
| file | what |
|---|---|
| `core.js` | Physics core, shared by the worker and the page. 2D compressible Euler (MUSCL-Hancock + HLLC, dimensional splitting, CFL 0.85), γ=1.3, 1 cm cells, open edges. Species, H₂+O₂ chemistry, heat loss, turbulent mixing, tanks/valves/check valves/injectors/pipes/torch igniters, solid propellant, scenarios, `act()` commands, save/load designs, snapshots. |
| `glue.js` | Web Worker loop: steps in 8 ms chunks, posts snapshots when the page asks. |
| `ui.js` | Page: rendering (Real/Glow/Gases/Pressure/Temp/Mach/Shocks views), tools, inspector, panels, readouts, undo, designs, world size. `/*FLIGHT*/` gets the flight bundle at build time. |
| `shell.html` | Page markup + CSS; placeholders `/*CORE*/ /*GLUE*/ /*GASES_VIEWS*/ /*UI*/`. |
| `juice.js` | Sound + goals (`JUICE`). Synthesized WebAudio: roar/hiss follow thrust (muffled in vacuum), ignition bang on a thrust jump, booster crackle, stage clunk, crash, goal chime; U / 🔊 mutes (`throat.sound.v1`). Goals checklist with toasts (`throat.goals.v1`), 🏆 card. The test stand sets `JUICE.stand`, flight sets `JUICE.fly`; its own rAF loop plays whichever screen is open. Built into the UI closure just before the flight bundle; flight reaches it through `JX` (null in the headless tests). `window.__juice` for browser tests. |
| `gv.js` | Tiny legacy gas-list snippet (kept so the build placeholders stay the same). |
| `parts.js` | Rocket parts catalog (probe, nose, tank, adapter, engines, decoupler, side decoupler, fin, leg), engine models (`ENG`: your engine + Wren, Mule, Bison, Lumen Vac, `lib`), solid boosters (`srb` part, `BOOST`: your booster / Thumper / `lib`; own propellant `srbCap`, `RHO_S` 220; thrust curve over burned fraction via `curveAt`), joining by touching edges, staging analysis (Δv/TWR per stage), part drawing, shrouds, ready-made rockets. Parts are in cm (x = centre, y = bottom). |
| `orbit.js` | Earth (R 300 km, g 9.81, air to 40 km) and Moon (R 90 km, 1.62 g, 2,500 km away, SOI ≈464 km). Universal-variable Kepler propagation, orbit elements, `predict()` for the map (legs across SOIs, Ap/Pe/encounter/impact marks). |
| `lib.js` | Engine library (`throat.englib.v1`): 📚 Engines dialog on the test stand saves the current liquid engine and the last booster burn by name. Library items show in the editor palette as `lib:<id>`; a placed part copies the numbers into `p.n` so rockets survive deletes. |
| `vab.js` | Rocket editor: palette, snapping, mirror pairs (move one onto the centre line → its twin is deleted), drag moves a part + everything under it (Alt: just it), resize tanks, inspector, saved rockets, stage list. |
| `flight.js` | Real-time flight: several vessels at once, staging, fly-by-wire steering + heading hold, basic aero (shape/AoA drag, fins weathervane), legs and landing rules, pads, on-rails warp (≥50×), SOI hand-over, procedural plume, crash effects, HUD. |
| `map.js` | Map view: pan/zoom/focus, path ahead with labelled Ap/Pe (altitude + T−), Moon encounter / leave / impact, click a craft to fly it. |

The flight files are concatenated inside one closure (see `build.py`); only `FLT`, `recordTest`/`_rt` and `recordBurn`/`_rb` are outside.

## Physics notes worth knowing
- Gases: `NS=8` — H₂, O₂, N₂, H₂O, CO₂, Al₂O₃ smoke (`AL`), CH₄, kerosene (`KER`, modelled as single CH₂ links: a heavy
  C₁₂H₂₄ gas pushed ~3.5× too much mass through injector holes). `FUELS` in core.js: each fuel's O₂ need, real heat per mol O₂,
  products and lighting temperature; `react()` burns them in one pass. `NSA` = how many are present anywhere; the solver only
  loops over those, so rare gases cost nothing until something makes them. Atom bookkeeping (H,O,N,C,Al) via
  `added/removed/edgeOut` must stay balanced (`atomCheck().ok`).
- Engine scenarios: First engine (H₂), Methane engine, Kerosene engine — `scEngine(fuel)` + `ENG_FUEL` (holes, tank pressures,
  tuned by measuring the feed: keep the fuel tank ≳1.5× chamber pressure or the mixture flips between far-rich and far-lean).
  Measured (tests/core/fuels.js): H₂ 2.30 kN / 371 s / 2,300 K · CH₄ 3.51 kN / 296 s / 2,940 K · kerosene 2.91 kN / 293 s / 3,040 K.
  Real view: CO₂ share in hot exhaust tints methane blue-violet; unburnt kerosene in hot gas glows orange (soot), cool → grey smoke.
  Flight tanks still use the hydrolox bulk density for every fuel.
- Liquid engine (`scEngine`): 3 H₂ : 4 O₂ injector holes, both tanks 350 psi, `HEAT_SCALE 0.45`, ≈2.25 kN / ≈355 s
  at sea level. Torch igniter on key 2, main valves key 1.
- Solid propellant: wall type 4, `prop[]` fraction left, `lit[]` burning. Burns where it touches gas hotter than
  800 K; regression r = a·Pⁿ (n 0.35, `SRB_A` 2.5e-4, ~10× real because a 2D slice has little burning surface per
  throat). Time-lapse `SRB_K = 120`: each cell holds 1/K the propellant and burns back K× faster, same gas flow per
  area. Exhaust `SRB_Y` (H₂ 2%, N₂ 13%, H₂O 30%, CO₂ 25%, smoke 30%) at 3,000 K. Booster scenario ≈ 880 psi peak,
  4–5 kN, ~7.5 ms burn. Known issue: Isp reads ~190 s at burnout (should be ~210 s) — the void left by burnt grain
  refills "for free" in the time-lapse; not fixed yet.
- The test stand records the liquid engine's steady thrust/Isp (sea level and vacuum) for "Your engine" in flight
  (`throat.card.v1` in localStorage). Not recorded while a booster burns.
- Booster burns: when a burn finishes, `burnDone()` (ui.js) reports average thrust, Isp and a 12-point thrust curve (sampled against
  impulse delivered, normalised to mean 1) through `recordBurn` → `card.srb.sl|vac`. In flight a booster lights on the first
  throttle-up, ignores the throttle, follows the curve until empty, and keeps burning after it's dropped (`p.ign`).
- Flight is real time and uses those numbers; the CFD is far too slow for real time (~70 steps/s × ~3 µs).

## More context
See `HISTORY.md` for the version history, why things are tuned the way they are, and lessons learned.

## Style
- Comments explain *why* in plain English (the game is judged by a non-programmer; code reads like a lab notebook).
- Keep the single-file build working offline; no external libraries or network.
- Test in a browser before shipping UI; keep the phone layout working.
- Text shown to players: short, plain, no jargon without a hint.

## Backlog (agreed with Wyatt)
1. ✅ (v1.9) Sound (WebAudio, synthesized: roar with thrust, ignition bang, booster crackle, crash) + a goals checklist with toasts.
2. ✅ (v1.10) Engine library: save test-stand engines and boosters by name with their measured numbers; use them in the editor,
   including strap-on solid boosters.
3. ✅ (v1.11) Methane and kerosene on the test stand (blue-violet methane flame, sooty orange kerosene).
4. Fix booster Isp (see above).
5. Short first-time tutorial (light the engine → build a rocket → launch).
6. Later: centre of mass / centre of lift / centre of thrust in flight.

## Working with Wyatt
- Wants direct, brief updates; copy-paste-ready output; no padding.
- Every few versions, draft a short playtest email (what's new + 3 things to try) for his playtester friend —
  ask Wyatt for the address. Make it a real Gmail draft that links the live site (or attaches `index.html`).
  Draft only; Wyatt sends it.
