# THROAT — how we got here

The project was built with Claude in one long claude.ai chat (Nov 2026) before moving to Claude Code. This is the
part of that conversation worth keeping: what Wyatt asked for, what was built, what was tried and dropped, and why
things are tuned the way they are. Read with `CLAUDE.md` (how the code works today).

## The idea
Wyatt's dad challenged him and his brother Zack to each make a game with Claude; dad judges. THROAT is a 2D,
physics-based rocket-engine sandbox: build an engine, fill it with gases, watch realistic-but-simple combustion
(2 H₂ + O₂ → 2 H₂O), and get an exhaust that looks like a real rocket plume (tight with shock diamonds at sea level,
ballooning in vacuum). PC-first controls. Long-term: an SFS-style flight game that uses the numbers your engine
made on the test stand.

## Versions
| version | what changed |
|---|---|
| ≤0.9 | Grid CFD sandbox: gas brush, walls, tanks, valves, spark; H₂/O₂ combustion; first engine scenario. |
| 0.9.1–1.0 | Flow ~3× faster (CFL 0.85, flattened species, cheaper mixing, GPU upscaling, Web Worker). Torch igniter: a small, weak, wandering flame that puffs out of the nozzle, then the main valves open and the engine lights with a bang ("small flame then boom"). Real view. |
| 1.1–1.2 | Real view matched to a photo of a real hydrogen engine test: pink plume, white Mach diamonds, blue core near the nozzle. Big UI overhaul: Select tool with a settings inspector; placing things no longer binds keys; one resizable valve object (Shift+wheel / Shift+drag length, Q/E rotate); erase rebound to X; facelift (pixel-art steel, rivets); optimisation. |
| 1.3 | Undo/redo, save/load designs (browser + file), thrust/Isp readout, warm haze fades, valves bore through thick walls, crisper labels, inspector docked right-middle and compact, valves open instantly. |
| 1.3.1–1.4 | Draggable + minimisable panels; pipe tool; injector plates (straight, impinging, angled, swirl, pintle); Shift = straight lines for wall/pipe/gas/erase; check valve (one-way: Wyatt noticed chamber pressure pushing back up the feed lines); world size S/L/XL. |
| 1.5 | Real-time **Flight** mode: the test stand records your engine's thrust/Isp; launch a rocket on a small SFS-like planet; procedural plume; map; warp; crash explosions. |
| 1.6 | **Rocket editor** with snap-together parts, mirror pairs, ready-made rockets (Hopper, Orbiter, Heavy, Lander), saved rockets, per-stage Δv/TWR. Staging (Space), several craft flying at once, basic aerodynamics (nose cones, AoA drag, fins weathervane), fly-by-wire steering + heading hold, landing legs (G), landing zone 2 km east. |
| 1.7 | **The Moon** (SOI hand-over, landing/take-off), on-rails warp to 20,000×, new map (pan/zoom/focus, Ap/Pe with altitude + T−, encounter/leave/impact). Wyatt's editor requests: interstage shroud around an engine on a decoupler that splits off at staging; better landing legs + "Legs out" preview; moving one of a mirrored pair onto the centre line deletes its twin; pre-made engines Wren (weak sea level), Mule, Bison (powerful sea level), Lumen Vac (vacuum). |
| 1.8 | **Solid rocket boosters** on the test stand: paint propellant (B), the grain burns back from hot surfaces at r = a·Pⁿ, bore shape sets the thrust curve; orange→white particle glow and smoke; burn summary. Core generalised to 6 gases. |

## Why things are the way they are (engine tuning)
- Only the centreline burned at first (stratified chamber) → added turbulent mixing (whole-parcel exchange, gated by
  Mach and speed).
- Mixing then pulled hot gas back into 1-cell injector holes and starved the O₂ → `NARROW` cells never mix.
- Unequal tank pressures made the mixture ratio drift and go unstable → both tanks 350 psi with 3 H₂ : 4 O₂ holes
  (mixture ratio ≈5, slightly fuel-rich like real H₂ engines, stiff injectors).
- The old spark plug had been secretly heating the chamber; once it was replaced by the torch, the chamber ran cold →
  `HEAT_SCALE 0.45` puts it back near 2,300–2,900 K.
- Mixing blew up at large time steps → each mixing substep capped at 0.22.
- Tested every injector type on the default engine: none burned more completely than straight (it's already ~100%).
  Said so honestly rather than inventing a winner.
- A worker interleaved with `MessageChannel` beat the main-thread budget loop; `?noworker` falls back.
- Bigger worlds: L ≈ 2× the cost of S, XL ≈ 3.3×; snapshots are throttled for big worlds.
- Real-time 1:1 for the gas sim is impossible (~3 µs of sim per step, ~365k steps per sim second) → hence Flight mode
  using the measured numbers. Wyatt's own idea.

## Flight tuning
- Earth R 300 km (like SFS), g 9.81, scale height 4.5 km, air to 40 km; orbit ≈ 2,300 m/s.
- Tanks: hydrolox bulk density 360 kg/m³; dry 8% + 1 kg. Ready-made rockets are generous on Δv on purpose.
- Steering: A/D ask for a turn rate (0.55 rad/s); let go and it holds heading and cancels air torque up to its
  authority. (A first version used plain rate damping and small upper stages slowly spun up under air torque.)
- Fins: strong weathervaning; finless rockets are slightly unstable but controllable near prograde.
- Landing: legs deployed and their feet lowest → up to 9 m/s and 0.45 rad tilt; otherwise 3.5 m/s / 0.25 rad.
- Moon: R 90 km, g 1.62, 2,500 km out, period 7.3 h, Hohmann ≈ 505 m/s from a 60 km orbit, transfer ≈ 1.6 h.
  Warp drops to 50× at SOI changes. On-rails propagation is exact (verified against the map prediction to the km).
- Engines (sea level / vacuum): Wren 1.1/1.25 kN 285/322 s, Mule 3.3/3.65 kN 305/338 s, Bison 7.5/8.3 kN 300/330 s
  (120 cm wide), Lumen Vac 0.8/2.6 kN 140/445 s (separates and sputters in air). "Your engine" = test-stand numbers
  (default 2.25 kN / 355 s; vacuum estimated ×1.1 if never tested in vacuum).

## Solid booster tuning
- Time-lapse `SRB_K = 120`: a grain burns out in ~7 ms of sim (~15–30 s real) instead of hours.
- `SRB_A = 2.5e-4` (≈10× real APCP) because a 2D slice has far less burning surface per throat than a 3D grain;
  without it the motor never pressurises.
- First booster scenario had a 5-cell bore that choked the flow (the bore became the throat) → bore 9 cells,
  throat 7 cells; port must be bigger than throat.
- Booster chamber skips the small-flame heat-loss model (it was cooling the chamber to ~1,900 K).
- Booster igniter cuts itself 0.8 ms after the grain is burning well.
- Isp readout uses propellant actually burned (the hollow left by burnt grain refills for free in the time-lapse,
  which counted as fuel). Still reads ~190 s at burnout vs ~210 s expected — backlog item.
- The test stand does not record "Your engine" numbers while a booster burns.

## v1.15: webcast look (phase 1 of PLAN.md)
- White/grey on black with one red accent (`--red`; `--acc` is red, `--acc2` is white). Font stack starts with D-DIN / Rajdhani
  (not embedded yet: downloading one needs Wyatt's OK), then Bahnschrift, which Windows already has.
- Edge tabs (`foldUI` in ui.js, `throat.tabs.v1`): PROBE/TOOL on the stand, PARTS/ROCKET in the editor, ORBIT/SURFACE/VESSEL/
  DATA/SAS in flight. Phones keep the stacked stand and editor; in flight a phone shows one panel at a time.
- Motion: `roll()` eases every readout to its new value, `kick()` shakes and flashes the screen on ignition, `enter()` replays a
  screen's entrance. All off with prefers-reduced-motion (`REDUCED`).
- Flight HUD: speed/altitude dials, T+ clock, timeline built from the rocket's stages (`buildEvents`/`mark`), centred callouts
  (`callout`; `fmsg` is now only for hints), LIVE tag, camera drift + shake from thrust, q and ignition.
- SAS holds (`v.sas`, `sasTarget` in flight.js, keys 1–9): they only choose the heading for the existing heading hold, so they
  can't out-turn A/D. In thick air at speed the fins can beat the reaction wheel; the test (tests/flight/sas_holds.js) checks the
  surface modes above the Moon for that reason.

## v1.16 (start of phase 1.5): real-size rockets
- Wyatt: parts too wide, too small (a tank held ~90 kg; he wants ~90 t), side boosters sat far from the core.
- Units are now 10 cm (`UM`), so every rocket is 10× longer; volume (propellant, masses) and thrust are ×1000 (`MK`), which keeps
  TWR and Δv about where they were. Engines and boosters scale thrust and mass with width² from a reference size.
- Solid boosters were ~10× too weak for their size next to real ones: `RHO_S` 220 → 900 and booster thrust is referenced to an
  18-unit (1.8 m) width (`SRB_REF`), so a 3.7 m booster pushes ~14 MN like an SLS booster.
- Reaction wheels 12 MN·m per 4 m probe (a straight ×1000 scale left big rockets turning painfully slowly); RCS 250 kN per block.
- Tests compute thrust and centre-of-mass height from the vessel instead of hard-coded numbers; the ascent test drops burnt-out
  boosters. The SLS-shaped template reaches orbit (but needs ~14 minutes; the core alone has TWR 0.5 after the boosters go).
- Still to do in phase 1.5: 1,000 km Earth, capsule + abort tower, parachutes, heat shield, upper stage, engine mount part.

## v1.17: the world (asked for by Wyatt after phase 1.5's first part)
- Wyatt wanted oceans, biomes, rain, wind, trees, rocks, mountains, buildings, day/night and better time warp. Answers: weather is
  scenery only; coastal spaceport; hand-made planet, same every game; warp on the ground + clock + warp-to-event; 1,000 km Earth;
  land anywhere; full day/night (20-minute day); all four areas equally.
- Earth 1,000 km (orbit ~3.1 km/s), Moon 300 km at 8,000 km. Air still 40 km thick (kept so the ascent tests and feel stay).
- Ground collisions use the real terrain under each contact point; the sea floats a slow splashdown. Landing zone moved to 2 km
  west (east of the pad is now ocean).
- The camera pulls back as the rocket climbs (ground kept in the bottom of the frame); a marker shows the rocket when it's tiny.
- Wyatt: "make the continents look real" → a painted globe (domain-warped 3D noise, climate zones, ridged mountains, cloud layer)
  drawn whenever the planet is small on screen and on the map; near the rim it blends into the real terrain so they agree.
- Thick, detailed launch tower: lattice with X-bracing, platforms, elevator, stairs, crane, umbilical arms with hoses and a crew
  arm; the arms swing away in the 1.6 s after lift-off. (Phase 3 will add the countdown, clamps, venting and deluge.)
- Night darkens the scene with an overlay, then lights and engine flames are drawn again on top so they glow.

## v1.19: cinematic launch (phase 3)
- Launch puts the rocket on the pad in a hold: tanks vent cold vapour, bare tanks are frosted up to the fuel level (the SLS-style
  orange foam is insulation, so no frost there). Space / Start countdown → 10 s count with beeps, big numbers and a spoken voice
  (browser speechSynthesis, muted with sound off). T−5 deluge + upper arms swing away; T−3 liquid engines spool up against the
  hold-down clamps (solid boosters wait, as on real pads); T−0 clamps open, base umbilicals drop, full throttle.
- Steam clouds roll out of both ends of the trench, lit orange by the flame; the flame lights the ground; heat shimmer; frost
  flakes off on the way up (gone by ~10 km). The headless tests run without the countdown (no JX); clamps have their own test.

## v1.20: the rest of phase 1.5
- Engine clusters are an engine part with a count `p.k` (thrust and mass × k, each engine sized to fit, two rows above 3).
- Capsule = a probe with a heat shield and parachutes; escape tower = ABORT that splits everything from the capsule up off the
  rocket and pushes 9 g for 3 s, then drops itself; it also drops by itself above ~34 km.
- Heating = ρ·v³: ascent peaks ~5e7, LEO re-entry nose-first goes past 1e8 (burns up), heat-shield-first is allowed 15× more.
- The old test autopilot can't fly the SLS (its fixed gravity turn and "coast when Ap > 70 km" don't suit a heavy rocket).

## v1.22: autopilots (phase 5)
- Ascent: tip-over by height OR speed (a light, punchy rocket would otherwise go straight up and run out of time to turn);
  "keep time-to-apoapsis ≥ 30–80 s" stops a heavy one from flattening too early; coast at 98% of the target apoapsis.
- Node: the planned Moon burn alone lands ±100 km off the target pass because the burn takes time; a trim right after (search
  over small prograde + radial burns, radial moves the pass height most) gets it to ~100 km.
- Land: brake sideways while holding height, then a true suicide burn (start when stopping needs 80% of the thrust), final
  metres at 1.5–2 m/s; sideways speed steered onto the target the whole way. A craft's v.m isn't set before its first step.

## v1.23: test stand as an engineering cutaway (phase 2)
- Walls: dark section hatching with a crisp white contour; blueprint grid (1 cm when zoomed, 10 cm always); valves drawn as P&ID
  bowties, igniters as a spark in a circle, injectors and tanks as outlines; red only when open or lit.
- findEngine walks from the first injector along the flow, following the middle of the gap, to find chamber, throat and exit;
  drawDims draws the dimension lines plus live chamber P/T and exit Mach/pressure/expansion ratio. Nothing is drawn if no engine
  shape is found (e.g. the solid booster scenario has no injector).
- Not done: the editor stays realistic (Wyatt's later request beats the plan's white-line editor).

## v1.25: playtest pass, flight school, font
- Live site checked: GitHub Pages serves main's index.html (repo public, Pages on). The cloud session needed
  zappy8667.github.io added to its network allowlist to see it.
- Flight school (tut.js `TUT2`, Controls → "Flight school", `__tut.school()`): loads the Super Heavy (the only ready-made rocket
  with a capsule), countdown → ABORT → parachutes → touchdown → R → ASCENT autopilot. The first tutorial's last card points to it.
- Goals 11–17: abort, chutes (land under chutes), splash (any splashdown), ap_ascent / ap_node / ap_land (an autopilot reports
  "done"; hooked in `apOff`). The landing-zone hint said "east"; it's 2 km west.
- Camera: a small craft (< 15 m) in the air no longer shrinks to a marker while the camera pulls back (the aborted capsule was a
  dot at 1.6 km). Big rockets keep the old pull-back.
- Pe below the ground reads "below ground" (was "−1000 km", the planet's centre).
- Phone: solid countdown button lower down, pad hint moved off the DATA panel, timeline labels only on the next event (they
  overlapped), toasts below the toolbar; touch devices are told to tap rather than press Space.
- Font: Rajdhani 400/600 latin (SIL OFL, from the @fontsource npm package; GitHub raw was blocked), embedded by build.py from
  src/fonts as base64 woff2 (+40 KB).
- Not fixed: on a phone the test stand draws the engine tiny (whole world fits the narrow canvas); SLS still ~14 min to orbit.

## v1.26: touch controls + warp down
- Wyatt: on a phone two-finger pan/zoom didn't work well, and time warp could only go up (the button wrapped 100000× → 1×).
- Test stand: two fingers pinch-zoom (snapped to the stand's zoom steps) and pan; capture-phase listeners on the canvas's parent
  swallow the second finger so it doesn't paint or move parts. Editor pinch now also pans with the fingers' midpoint.
  Flight view: pinch zooms the camera (it had no touch zoom). Map: two fingers also pan while pinching.
- Warp: a slower button (,) next to the faster one (.); faster stops at the top instead of wrapping.

## v1.27: the flame follows the gimbal
- Wyatt: make the plume curve with the engine's gimbal; simulate it rather than a fixed picture.
- `v.gim` (flight.js steering) = the share of the turning torque the engines' gimbal gives, smoothed. `plume(..., bd)` rotates the
  whole flame by the gimbal angle (up to ~8°) at the nozzle and bends the body, core and Mach diamonds by k·d² (d = depth below
  the nozzle): k from the turn rate (exhaust drawn as if ~60 m/s, so old exhaust visibly lags) and the sideways air (blows the
  tail back). Capped at a third of the flame's length. Solid boosters are unchanged.
- The "comment on a long line" trap bit again ("spread is not defined"): new code + comment go on their own lines.

## v1.28: realer flames
- Wyatt: "make the plumes themselves look realer". One renderer `flame()` (flight.js) with palettes `PAL` by propellant:
  hydrolox (your engine, Lumen Vac, saved engines): pale blue-violet, nearly see-through, orange-white shock diamonds;
  kerosene (Wren, Mule, Bison, via `fireKind`): white-hot core, yellow-orange body, dark soot in the tail; solid boosters:
  white-hot column, white smoke tail. Five nested layers (wide+faint → narrow+bright) make a soft edge; each edge boils with
  three sine waves running down the flame. Vacuum: one squashed radial glow (the old 7 wedges showed hard edges), outer layers
  fade, only the core stays bright. Nozzle glow lights the rocket's base. Gimbal bend from v1.27 kept for all, boosters included.

## v1.29: phone test stand
- On phones (`SMALL`) loading a scenario zooms the stand to the walls' bounding box (`fitCam`, snapped to `ZL`, room behind the
  nozzle for the flame), and world labels (`TXT`) are 1.8× bigger. Before, the engine was a few pixels tall at 390 px wide.

## v1.30: Super Heavy faster to orbit
- Core 60 → 48 m, boosters 54 → 44 m: the core alone had TWR 1.1 after booster sep and 5.7 km/s of Δv it never used (490 t
  left in orbit), so the ascent took ~14 game-minutes. Now ~7 (405 s on the autopilot), lift-off TWR 1.9. Menu says 91 m.

## v1.31: rockets saved before v1.16 are rebuilt
- Old saves keep the old small-part numbers (engines 60 wide, decouplers 15 tall, fins 45 wide); read at today's scale the engines
  were ~4× too strong for tanks holding a fraction of the fuel. `oldScale` (parts.js) spots a part only the old catalogue made;
  `upscaleOld` swaps each part for its modern size (tanks ⅔ as wide and 2.4× as long, standard engines, 60×150 booster →
  18×260 like the Sparrow's, thin decouplers), re-stacks from the bottom, puts each side column flush to the widest core part
  beside it (3-unit gap if it had a side decoupler), hangs fins/legs on the widest part of their stack and side decouplers on
  the booster's inner edge. The editor does it on load (current rocket and saved ones) and says so; Save keeps the new version.
- tests/flight/old_rockets.js: the v1.15 ready-made rockets (old_rockets.json, built by v1.15's own tpl) are spotted, rebuilt
  with no overlaps or loose parts, reach orbit on the ascent autopilot; today's rockets are never taken for old ones.

## v1.32: solid buildings
- `groundAt` (world.js) now includes the spaceport buildings (`SOLID` = `BLD` minus the road; `bldAt`): their roofs are ground
  (land on the assembly building), and a contact point more than 3 m below a roof means the craft came in from the side: crash
  ("Flew into the hangar", names in `BNAME`). The LAND autopilot uses `groundAt` too, so it sets down on a roof correctly.
  Launch tower and pad stay out of it. Trees stay scenery (forests everywhere would make every landing there a crash).

## v1.33: demo, fuels in flight, auto detail, sharing, kits (+ a crash fix)
- **Crash fix (live since v1.20):** above 34 km the escape tower jettisons itself; the tower then flies as its own craft that
  still "has an escape tower" above 34 km, so it jettisoned itself again, inside the same loop over `VS` it was being pushed
  onto: an endless loop, JavaScript out of memory, the tab died on every Super Heavy flight. `lesCheck` now loops over a copy
  and skips a craft that is only the tower; `jettisonLes` refuses one too. tests/flight/capsule.js flies the SLS through it.
  Found by the demo: always fly the showcase rocket all the way up in a real browser.
- **Demo** (`demo.js`, "Watch a launch" on the stand and in Controls): the Super Heavy on the real autopilots with captions,
  ×4 warp on the climb, close-ups at Max-Q and separations (zoom that undoes the tracking pull-back: hAG ÷ 1.43·H), orbit,
  the Moon burn on the map, warp to the Moon's gravity. ~4 minutes. Any key or "Take control" hands over without cutting the
  engines. Goals are muted while it flies (`JUICE.quiet`); launch/10 km goals are now once per flight (`said.l20/k10`).
- **Fuel in flight:** the stand records which fuel its tanks hold (`standFuel` in ui.js → `recordTest(F,isp,fuel)` → `card.fuel`);
  "Your engine" and saved library engines (`e.fuel`, `p.n.fuel`) draw that flame: new methane palette (clear blue-violet,
  bright diamonds). Tank density stays the shared hydrolox value for every engine: changing it per fuel would rebalance every
  ready-made rocket (kerosene is ~3× denser), so it's left as a known simplification.
- **Detail level** (`QL` 2/1/0 in flight.js, `throat.quality.v1`): frame time averaged; > 30 ms for 4 s drops a level (canvas
  pixel ratio 2 → 1.25 → 0.8, steam/smoke caps × 0.6 / 0.3, flames 3 layers, no shimmer); < 18 ms for 12 s raises it unless it
  dropped this flight. Headless Chrome went 22 → 57 fps.
- **Share** (editor): `THROAT-R1z:` + base64url of deflate-raw JSON (only shape fields, `SHARE_KEYS`; ~480 chars for the SLS);
  plain `THROAT-R1:` where CompressionStream is missing. Loading validates every part, gives fresh ids, keeps twins, runs the
  old-save upgrade. Text boxes no longer trigger editor/stand shortcuts (TEXTAREA added to the key guards).
- **Kits** (editor palette, end of the list): Upper stage (decoupler + Lumen Vac + 40×110 tank) and Booster pair (Thumpers with
  cone noses on side decouplers). Carried as one block (`kitBlock`, a tank-like or fin-like box so `snapPart` works unchanged),
  dropped as parts; `hangSdec` moves the side decoupler to where the core beside the booster is; mirrored as twins.

## v1.34: boosters push off
- Wyatt: "in booster separation make them push off with force". Side boosters (a dropped piece holding a side decoupler) fire
  separation motors for `SEP_T` 1.2 s: `SEP_A` 25 m/s² sideways away from the core along the booster's own left/right
  (`v.sepSide`), plus a 0.3 rad/s nose-out spin (`SEP_OM`). Result: ~30 m/s apart, ~50 m out and noses ~35° out 2 s later
  (tests/flight/separation.js). Drawn as small solid-motor jets at the inner side of each booster's nose (aimed in and forward)
  and tail (in and back) with smoke blown toward the core; a bang and a harder camera jolt. Before: a 1.4 m/s drift.

## v1.35: title screen, the demo goes to the Moon and back, propellant density
- **Title screen** (`title.js`): THROAT over the live demo (cockpit displays hidden by `#flight.attract`, camera shifted right
  on wide screens so the title doesn't cover the rocket, callouts muted, the demo restarts when it ends). Watch a launch (demo
  from the pad, with captions) · Build an engine (the stand; first-timers get the tutorial, which no longer starts by itself)
  · Fly a rocket (editor). Enter / Esc. Flight keys are ignored while it's up.
- **Demo part 2**: at the Moon the core drops; LAND from the incoming path (warp 20 while falling high, close-up under 2.5 km);
  ASCENT on the Moon to 20 km; NODE "home" (re-entry periapsis ~30 km); warp to Earth; stage down to the capsule, hold
  retrograde (heat shield first); warp 2 only while it glows; chutes under 240 m/s and 9 km; splashdown/touchdown. ~10 min.
  Close-up zoom now targets the real framing scale (it stacked on the v1.25 small-craft zoom and filled the screen with hull).
- Found on the way: the ASCENT autopilot couldn't take off from the Moon (TWR ~13 there: it reached the target height going
  straight up, then the circularise burn pointed along the vertical path and escaped). Now it leans over within 2 km where there
  is no air, and circularises pointing flat along the ground. The Super Heavy had no decoupler under the capsule, so a capsule
  coming home couldn't drop the service module and burned up nose-first: added.
- **Propellant density**: a tank holds what its engines burn (`tagTanks` → `p.fk`; `RHO_FUEL` h2 360, ch4 830, kero 1030 kg/m³;
  `engFuel`: Wren/Mule/Bison kerosene, your engine = last stand fuel, saved engines = their fuel). Tank dry mass stays by volume.
  In flight the marks are kept (a dropped tank keeps its fuel); in the editor they're redone. Retuned: Heavy's Mule boosters'
  tanks 300 → 140, Lander 160/90 → 70/40, Super Heavy service module 36 → 18; old-save upgrade makes kerosene tanks shorter.
  The editor shows "120 t kerosene + oxygen". All ready-made rockets still reach orbit on the autopilot.

## v1.36: flame trench, clean view, everything folds away
- **Flame trench** (`trenchGeo`/`trenchPath`/`drawTrench` in world.js): the ground under the pad is drawn cut open: a slot
  under the rocket, a steel deflector wedge that splits the exhaust, two tunnels, and vents coming up beyond the tower on both
  sides. While engines fire near the pad (`trK` = TWR, fading out by 120 m up) the trench glows white-hot down the slot and
  orange along the tunnels, with fire blasting out of the vents; the steam clouds now billow from the vents. Near the pad the
  rocket's own flame is clipped (`underPad`, evenodd clip) so below the deck it only shows inside the trench, not through rock.
  At night the trench fire is put back in the glow pass.
  Made deeper and bolder after Wyatt's first look (depth 30 m+, thick lining, hazard stripes down the slot).
- Redone after Wyatt's second look: **two straight 45° ducts** (a slot, the wedge, then ducts rising at 45° out through the
  pad's slopes; `trenchGeo` finds where each comes out, steam starts there) instead of the U tunnels. **The pad is raised**:
  `padMound` in `terrH` (12 m high, flat ±44 m, smooth slopes out to ±74 m, `PADH/PADT/PADS`), so it's physical ground too;
  `padAt` now uses the real ground height; the deck never overhangs the mound. Tests: world.js expects the 12 m mound,
  clamps.js measures the rocket's height from the pad, not sea level. Altitude on the pad now reads ~12 m more (it's above sea level).
- Third version (Wyatt didn't like the V): the wedge's two 45° faces turn the flame sideways into **two flat tunnels at ground
  level** that come out through the foot of the mound (`trenchGeo`: floor at -PADH, tunnel height `th`, mouth `xe/ye`); fire and
  steam roll out along the ground.
- **Tower in the background**: the launch tower is drawn at half strength (hazy), so the rocket stands out in front; the deck stays solid.
- **Clean view**: a button in the top-right corner (or V) hides every display (`#flight.clean`) so only the rocket shows.
- **More fold-away tabs** on the right: GAUGES (speed/altitude dials), TIMELINE (clock + events), STEER (heading ring + SAS
  buttons) join DATA/TIME/SAS. Only GAUGES starts open now (DATA used to). `free:true` tabs don't count in the phones'
  one-panel-at-a-time rule. foldUI fix: a tab with no saved state starts the way its def says (new tabs used to start closed).

## v1.37: lots more parts
- **Engines** (`ENG`, each with its own drawing in `drawEngine`; `fuel`/`pf` fields replace the hard-coded kerosene list in
  `engFuel`/`fireKind` and the plume width table): Gnat (tiny methane thruster), Spike (aerospike: ring of chambers + a plug,
  nearly as good at sea level as in vacuum), Condor (huge full-flow methane), Atom (nuclear: reactor drum with the trefoil,
  Isp 820 in vacuum, weak and heavy).
- **Boosters** (`BOOST` with their own size `w/h`, `BOOST_ORDER`): Sprinter (short, black with yellow bands, kicks hard and
  fades), Longhorn (long bare-steel, steady, best Isp). The inspector lists every booster model.
- **Variants** (`VARS`, palette id `type:variant` → `p.v`; same physics as the base type, own drawing and default size):
  fuel spheres (`tank:ball`, ⅔ the capacity), grid fins and a swept wing (`fin:grid`, `fin:wing`), lander cabin
  (`probe:cabin`), cockpit (`nose:cockpit`: a nose that is also the brain, `isBrain`), big Dragon-style capsule (`capsule:dragon`).
- **New parts**: solar panel (radial; folded, opens above the air or near the Moon: `o.open` in flight, "Show deployed" in
  the editor), floodlight (lamp + a 45° beam in the dark: `drawBeam`, `nightK`), heat-shield plate (`shield`; at the bottom it
  counts as shield-first for re-entry, like a capsule: `v.capBottom`).
- **Paint**: tanks also Carbon black, Black & white (Saturn roll pattern), Gold foil; nose cones White/Black/Steel/Orange/Gold
  (`NOSE_SKINS`, `SKIN_COL`).
- **Pathfinder** (ready-made): steel Condor booster with grid fins and wings, Atom upper stage on a gold-foil tank with solar panels
  and floodlights, heat shield + big capsule. Reaches orbit on the autopilot (tests: templates, ap_ascent).
- Centres: grid fins count ½ (open lattice), solar panels and lights 0.3. Share codes carry `v`. `__vab` exposes `drawPart`/`mkPart`
  (part gallery screenshots), `__flt` `release`/`setZoom`.
- Bit us again: a `// comment` added before more code on the same line hid `v.hasLes` (abort test caught it). Use `/* */` mid-line.

## v1.38: tech tree
- Agreed with Wyatt: **science from firsts**, a **small starter kit**, and an **"Unlock everything" switch** (THROAT stays a sandbox).
- Science = the goals: each goal in `GOALS` (juice.js) got a 4th field, its science (5–60; 305 in all). It isn't stored: it's
  worked out from the goals done (`JX.science()`), so goals done before v1.38 count. The goal toast and the goals card show "+N".
- `tech.js`: `techStart()` (probe, nose, tank, your engine, Wren, decoupler, fin, your booster), `techNodes()` (15 nodes in six
  lines: engines, space engines, boosters, landing/landers/spaceplanes, crew, control/power; 295 science for all), state
  `throat.tech.v1` `{got, all}`. `techOK(id)` for palette ids (`partKey(p)` for placed parts; library parts always OK; kits need
  all their parts), `techMissing(ps)` blocks Launch with a note in the tree card. Locked palette items show dimmed with a lock
  (click opens the tree); locked engine/booster models are disabled in the inspector; clusters need Heavy lift.
- Editor bar: Tech button with the science left and a red dot when something can be unlocked. Tree card: nodes with part icons,
  Unlock buttons, "Needs …"; Esc closes it (the editor's capture key handler swallows keys, so it closes the card itself).
- The demo/title flights use `tpl()` directly and ignore the tree.

## v1.39: fairings, big legs, booster paint
- **Payload fairing** (`fair`): a base ring on the upper stage; the payload sits on it; its shell (`p.fh`, 12 m by default,
  "Taller/Shorter shell" in its settings) is drawn over the payload (`drawFairing`; see-through in the editor). While closed it
  counts as a nose cone if it's the top (`v.nose`), adds the shell's mass (`fairShell`) and height. `fairCheck()` (each frame,
  like `lesCheck`) opens it above 0.9 × the top of the air: two white halves tumble away (`flyers` with `wh`), "FAIRING SEP".
  Retry closes it again. Paintable like a nose. In the tech tree with Space engines.
- **Big landing leg** (`leg:big`): the normal leg drawn 1.8× about its top hinge; feet 1.8× further out and down
  (`contactPts`). Tech tree: Landers.
- **Booster paint**: Standard (the model's own look), White, Black, Steel, Orange, Gold, Black & white (`p.sk` on `srb`).
- **Comsat** (ready-made): Mule first stage, Lumen Vac upper stage, a fairing over a small gold satellite with folded solar
  panels. Orbit on the autopilot.
- tests/flight/new_parts.js: fairing nose/mass/height, big legs, every palette part has a size and mass.

## v1.40: detailed engines (from Wyatt's photos: RS-25, Raptor, SLS booster)
- `drawEngine` helpers: `pipe` (with a lit edge), `flange`/`pipeF` (bolted flanges at every joint), `valve` (red actuators),
  `struts` (two gimbal actuators: fat cylinder + shiny rod to a lug on the bell), `bands` (stiffener bands round the bell at
  points along its curve, `bellPt`), `exitBand`, `cables` (wires down the bell).
- Your engine / saved engines now look like an RS-25 (they burn hydrogen by default): busy powerhead with two pumps, a big
  bent duct with red flanges, red valves, a near-black bell with six bands, cables and a red exit band. Mule keeps the Merlin
  look (pump + exhaust pipe) with flanges, struts and bands; Bison/Condor (Raptor/BE-4) get struts, cables, blue valve caps;
  Lumen Vac a heat tint and rings on the extension; Atom control-drum housings and bands; Wren a helium line + valve; Spike a feed
  manifold; Gnat a valve. Exit widths unchanged (the flames start there).
- Solid boosters: a flared aft skirt with bolt pads, stiffener rings, raised field joints with a ring of pins, a forward attach
  ring, a highlight down the casing, the nozzle's exit lip.

## v1.41: the planet has an inside, navball
- Wyatt: zoomed out in flight the planet looked see-through, "just the crust". Before, only a 3.4 km band of rock was drawn under
  the surface, and the painted globe (meant for whole-planet views) also showed up close, blocky, with a 100 km strip of rim
  biomes painted round its edge that read as a ring of crust. Now (`drawEarth`, G = planet radius in screen pixels): G < 1,000
  the globe (sharper: 1,024² texture, smoothing on; rim biomes only in the outer 2.5 %; the soil band a thin line); above
  ~1,150 a cut-away of the inside (`drawInterior`: crust, mantle, outer core, white-hot inner core, faint layer lines), with a
  short cross-fade between.
- **Navball** (`navInit`/`navUpdate`, replaces the heading ring in the STEER box): sky and ground turn around your nose (the
  orange wing mark fixed in the middle), horizon with a pitch ladder and E/W; markers round the edge in KSP shapes and colours:
  prograde (yellow circle + three ticks), retrograde (yellow circle + X), radial out/in (cyan), SAS hold (red). The SAS buttons
  and the SAS tab list show the same icons (`sasIcon`; surface modes green, horizon arrows white, stability a gyro), names in
  the tooltip and the list.

## v1.42: a bigger Earth (1.6×)
- Wyatt: launches too easy, too much Δv left at the top. Earth `PR` 1,000 → 1,600 km (g still 9.81, so low orbit is ~3.9 km/s,
  was ~3.0). Measured with the ascent autopilot (Δv actually spent): Orbiter 4,140 → 4,970 m/s, Sparrow 3,900 → 4,750, Comsat
  4,080 → 4,920. (The editor's "orbit takes about 2,300 m/s" was wrong even before; now "about 4,500 (the autopilot uses ~4,900)".)
- The surface map (`TK`, `BIOMES`, drawn for 1,000 km) is stretched with it beyond 2 km from the pad (`SF`, `grow`): same
  continents 1.6× wider, the coast still 620 m east and the landing zone 2 km west. The Moon moved out with it: `DM` 8,000 →
  12,800 km (SOI ~1,640 km, a lap ~16 h).
- Every ready-made rocket still reaches orbit (less fuel left over). A rebuilt pre-v1.16 Sparrow fell back into the air while
  circularising (it reached the target height too slowly sideways): `circ` now tilts the push up just enough to stop the fall
  (g·(1 − vh²/vc²)).
- tests/flight/mission.js: the demo's whole mission headless (SLS to orbit, Moon transfer, land, Moon orbit, home, capsule only,
  re-entry heat shield first, chutes): passes with 38 t to spare at the Moon.

## Things that went wrong (don't repeat)
- Pushing new craft onto `VS` while looping over it (tower jettison) froze and killed the tab: loop over `VS.slice()`.
- Appending a `// comment` to a one-line edit commented out the next statement on the same line (`v.hasLegs`), so legs were
  dead from v1.15b to v1.22. When editing these long lines, put new code and its comment on their own line.
- A new palette id with an extra field ("engine:stand:4") broke the editor palette (ENG lookup by the whole suffix): check
  every place that parses part ids.
- The flight bundle is one closure: map.js already has `tfmt`/`kmf`, so a second `const` with those names breaks the whole page.
- Wyatt shared a schlieren reference image with no text; Claude assumed what he wanted and changed things. He said
  "no" — ask what a reference image is for before acting on it.
- A "draft email" card can't carry an attachment. When Wyatt wants the playtest email, make a real Gmail draft with
  the game file attached (Gmail → Insert from Drive → *Add as attachment*), and **draft, don't send**, unless he says
  send.
- Wyatt is busy and direct: short updates, do the work, don't over-explain or re-ask what's already decided. Do check
  before anything irreversible (sending, publishing, deleting, making the repo public).

## Hosting so far
- claude.ai artifact (private to Wyatt; frozen at v1.8 now).
- Netlify: zip of `index.html` dropped by hand (zips were put in his Google Drive each version).
- GitHub: ZAPPY8667/THROAT, made public with GitHub Pages on → https://zappy8667.github.io/THROAT/ (from v1.8).

## Not in the repo
Browser test scripts (playwright + Chrome) used during development: they drove the editor (drag parts, resize,
undo, save), flight (launch, stage, legs, map, warp, Moon), the booster, and phone layouts, and took screenshots.
Recreate as needed; `tests/` has the headless checks.
