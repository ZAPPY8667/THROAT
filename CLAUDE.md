# THROAT — project notes for Claude

A 2D rocket-engine sandbox game. You build engines on a test stand where real gas physics runs (CFD), then build
rockets from parts and fly them in real time to orbit and the Moon. Made by Wyatt for a game-making contest
(judged by his dad), so it has to be easy for a newcomer to understand and fun to show off.

## Build, run, deploy
- `python3 build.py` → writes `index.html` (the whole game in one self-contained file, ~445 KB, incl. the embedded Rajdhani font from `src/fonts`). Always rebuild after editing `src/`.
- Run it: open `index.html` in Chrome (works from `file://`; physics runs in a Web Worker made from a blob URL).
- Live: https://zappy8667.github.io/THROAT/ (GitHub Pages, public repo, serves `index.html` from the root of `main`).
  Deploy = rebuild, commit, push to `main`; the site updates about a minute later.
- Tests: `bash tests/run.sh` (Node 18+, ~3–4 min, headless). Run before every push.
  - `tests/core/*` load `src/core.js` directly (atom bookkeeping, booster burn curve and Isp, speed).
  - `tests/flight/*` use `harness.js`, which runs `parts.js + orbit.js + flight.js` with DOM stubs (autopilot to orbit,
    landing limits, Moon landing, on-rails warp vs map prediction, ready-made rocket stats, SAS holds settle, RCS, hold-down clamps, capsule abort/chutes/re-entry, pre-v1.16 saves rebuilt, autopilots: ascent for every template, Moon transfer, landing zone + Moon landings, the world: terrain/sea/splashdown/clock).
  - UI changes: check them in a real browser too (playwright + Chrome works well: screenshots of the test stand,
    editor, flight, map; phone viewport 390×844).

## Layout (`src/`)
| file | what |
|---|---|
| `core.js` | Physics core, shared by the worker and the page. 2D compressible Euler (MUSCL-Hancock + HLLC, dimensional splitting, CFL 0.85), γ=1.3, 1 cm cells, open edges. Species, H₂+O₂ chemistry, heat loss, turbulent mixing, tanks/valves/check valves/injectors/pipes/torch igniters, solid propellant, scenarios, `act()` commands, save/load designs, snapshots. |
| `glue.js` | Web Worker loop: steps in 8 ms chunks, posts snapshots when the page asks. |
| `ui.js` | Page: rendering (Real/Glow/Gases/Pressure/Temp/Mach/Shocks views; walls as a cutaway since v1.23: section hatching + white contour in `buildWalls`, blueprint grid, parts as line symbols (valve bowtie, red only when open/lit), auto dimension lines + live chamber/exit numbers from `findEngine`/`drawDims`), tools, inspector, panels, readouts, undo, designs, world size. `/*FLIGHT*/` gets the flight bundle at build time. |
| `shell.html` | Page markup + CSS; placeholders `/*CORE*/ /*GLUE*/ /*GASES_VIEWS*/ /*UI*/`. |
| `juice.js` | Sound + goals (`JUICE`). Synthesized WebAudio: roar/hiss follow thrust (muffled in vacuum), ignition bang on a thrust jump, booster crackle, stage clunk, crash, goal chime; U / 🔊 mutes (`throat.sound.v1`). Goals checklist with toasts (`throat.goals.v1`), 🏆 card. The test stand sets `JUICE.stand`, flight sets `JUICE.fly`; its own rAF loop plays whichever screen is open. Built into the UI closure just before the flight bundle; flight reaches it through `JX` (null in the headless tests). `window.__juice` for browser tests. |
| `gv.js` | Tiny legacy gas-list snippet (kept so the build placeholders stay the same). |
| `parts.js` | Rocket parts catalog (probe, nose, tank, adapter, engines, decoupler, side decoupler, fin, RCS block `rcs` (250 kN, own 2.5 t monoprop `p.mono`, Isp 180), leg, crew `capsule` (a brain like the probe, heat shield, parachutes), escape tower `les`), engine clusters (`p.k` engines under one plate, `clusterGeo`/`engH`), nose shape `p.ns` (ogive/cone), engine models (`ENG`: your engine + Wren, Mule, Bison, Lumen Vac, `lib`), solid boosters (`srb` part, `BOOST`: your booster / Thumper / `lib`; own propellant `srbCap`, `RHO_S` 900, `SRB_REF` 18; thrust curve over burned fraction via `curveAt`), joining by touching edges, staging analysis (Δv/TWR per stage), part drawing, shrouds, ready-made rockets (incl. `sls`, SLS-shaped, ~91 m), old-save upgrade (`oldScale`/`upscaleOld`: rockets saved before v1.16 rebuilt with full-size parts on load). Parts are in units of 10 cm (`UM` = 0.1 m; x = centre, y = bottom); real size since v1.16, masses and thrust `MK` = 1000× the old small numbers; engines and boosters scale thrust with width² (`engStat`/`boostStat` → `scaleStat`); free width for stacked parts (`PT[t].wr`, Ctrl+wheel / [ ] in the editor; adapters have a top width `w2`); thin side decouplers so boosters sit flush; `fM`/`fF` format tonnes / MN. |
| `orbit.js` | Earth (R 1,000 km since v1.17, g 9.81, air to 40 km) and Moon (R 300 km, 1.62 g, 8,000 km away, SOI ≈1,490 km). Universal-variable Kepler propagation, orbit elements, `predict()` for the map (legs across SOIs, Ap/Pe/encounter/impact marks). |
| `world.js` | Earth's surface (v1.17): hand-made height profile `TK` + biomes `BIOMES` (spaceport, ocean, beach, jungle, forest, mountains to ~5.8 km, desert, ice plateau, grassland, hills), `terrH(s)` (s = metres east of the pad), `groundAt()` for collisions (land anywhere; water = splashdown ≤12 m/s floats, faster crashes; buildings are solid since v1.32: roofs are ground, walls crash). Spaceport buildings `BLD`, landing zone `PAD2` (2 km west, on land). Trees/rocks by fixed hash. Day/night (`DAY` 1200 s, clock starts 9:00, `sunAng`, `hourAt`, `skyFor`), night lights, planet shadow. Painted globe for far views and the map (`makeGlobe`/`drawGlobe`: warped-noise continents, climate zones, mountains, clouds; blends into the real rim). Launch tower `drawTower` (lattice, platforms, elevator, umbilical + crew arms that swing away at lift-off). Clouds by altitude (`makeClouds`: cumulus 1–3 km, stratus 4–8, cirrus 9–14; depth `d` for parallax, `cloudFog` fogs the view inside one), horizon glow from high up. Weather per launch (`pickWeather`; clear/cloudy/rain/storm; scenery only: clouds, rain, lightning, wind on smoke/trees/waves). |
| `lib.js` | Engine library (`throat.englib.v1`): 📚 Engines dialog on the test stand saves the current liquid engine and the last booster burn by name. Library items show in the editor palette as `lib:<id>`; a placed part copies the numbers into `p.n` so rockets survive deletes. |
| `tut.js` | First-time tutorial (`throat.tut.v1`): coach cards + a ring on the thing to press; each step advances when the player does it (torch → valves → Rocket → Launch → fly). Auto-starts on a first visit; Skip; "Start the tutorial" in Controls. Second lesson `TUT2` "Flight school" (abort, chutes, autopilot) from Controls. `window.__tut` for tests. |
| `vab.js` | Rocket editor: palette, snapping, mirror pairs (move one onto the centre line → its twin is deleted), drag moves a part + everything under it (Alt: just it), resize tanks, inspector, saved rockets, stage list. |
| `flight.js` | Real-time flight: several vessels at once, staging, fly-by-wire steering + heading hold, SAS hold modes (`sasTarget`, keys 1–9), RCS (T toggles; adds turning torque, I J K L translate), webcast HUD (dials, timeline, callouts, ORBIT/SURFACE/VESSEL panels), basic aero (shape/AoA drag, fins weathervane), legs and landing rules, pads, on-rails warp (≥50×), warp-to (sunrise/sunset/Ap/Pe/Moon, TIME tab), tracking camera that pulls back as you climb, SOI hand-over, countdown (v1.19: `CD` wait → count → go, `startCount`/`release`, clamps `v.clamped`, `padFx` for arms/clamps/deluge/venting, spoken callouts `JX.snd.say`, beeps), frost on bare tanks up to the fuel level, ABORT (`abort`, Backspace; `splitOff`, escape motor `v.lesT`, tower auto-jettison `jettisonLes`), parachutes (`chutes`, P), re-entry heating `v.hf` = ρv³ (limit 8e7, 1.2e9 heat-shield-first via `v.capBottom`), plasma glow, boil-off venting, steam clouds `steam`, flame glow, procedural plume, crash effects, HUD. |
| `autopilot.js` | Flight computer (v1.22): `AP` state, `apStep(dt)` once per physics step for the flown craft. ASCENT (`apAscent`: gravity turn by height or speed, Max-Q throttling, auto-staging `apStage`, coast, circularise), NODE (`planNode`: circularise at Ap/Pe, set Ap/Pe, to the Moon (Hohmann + timing search), home from the Moon; `apNode` warps, points, burns, then trims prograde+radial), LAND (`apLand`: kill sideways speed toward the landing zone or here, suicide burn, legs). Steers only through the heading hold (`v.sas="ap"`); any player steering/throttle hands control back. Panels ASCENT/NODE/LAND (left tabs); planned burn dashed red on the map. |
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
  4–5 kN, ~7.5 ms burn. Isp (fixed v1.13): the time-lapse inflates the chamber's growth 120×, so gas filling the burnt-out
  grain (`openBurntCell`, tallied in `srbFree`, not `srbMass`) and the start-up fill / blow-down are ~120× too big. The honest number
  is the steady one, thrust ÷ propellant burn rate above half the peak thrust (`steadyIsp` in ui.js, tests/core/booster_isp.js):
  ≈222 s at sea level, matching ideal-nozzle theory for 3,000 K, γ 1.3. Whole-burn averages read 185–260 s depending on bookkeeping.
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
- Keep the single-file build working offline; no external libraries, fonts or network.
- Look (v1.15, "launch webcast", see PLAN.md): tokens in `:root` of shell.html: white/grey on black, one red accent (live dot,
  warnings, active state, key events); green only for on/ok. Thin wide display font for words, `--mono` for aligned numbers,
  hairline panels, uppercase spaced labels with a red tick. Data panels hide behind edge tabs (`foldUI`); readouts roll (`roll()`);
  `kick()` for ignition jolts; respect `REDUCED`. Buttons use the SVG set `ICP`/`ico()` in ui.js (`data-ic="name"` on static
  buttons, `icoBtn()` for ones whose label changes): no emoji on buttons.
- Test in a browser before shipping UI; keep the phone layout working.
- Text shown to players: short, plain, no jargon without a hint.

## Backlog (agreed with Wyatt)
1. ✅ (v1.9) Sound (WebAudio, synthesized: roar with thrust, ignition bang, booster crackle, crash) + a goals checklist with toasts.
2. ✅ (v1.10) Engine library: save test-stand engines and boosters by name with their measured numbers; use them in the editor,
   including strap-on solid boosters.
3. ✅ (v1.11) Methane and kerosene on the test stand (blue-violet methane flame, sooty orange kerosene).
4. ✅ (v1.13) Fix booster Isp (see above).
5. ✅ (v1.14) Short first-time tutorial (light the engine → build a rocket → launch).
6. ✅ (v1.24) Centre of mass / lift / thrust markers (`centres`/`drawCentres` in parts.js): editor (Centres button, C) and flight (C);
   the editor warns when lift is above mass (unstable in air).

## Working with Wyatt
- Wants direct, brief updates; copy-paste-ready output; no padding.
- Every few versions, draft a short playtest email (what's new + 3 things to try) for his playtester friend —
  ask Wyatt for the address. Make it a real Gmail draft that links the live site (or attaches `index.html`).
  Draft only; Wyatt sends it.
