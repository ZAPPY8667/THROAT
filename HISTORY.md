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

## Things that went wrong (don't repeat)
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
