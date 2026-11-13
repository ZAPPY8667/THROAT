# Plan: webcast look, flight computer, cinematic launch (v1.15 → v1.19)

Agreed with Wyatt on 2026-11-13 through a round of questions. Read `CLAUDE.md` first. Work in five phases. After **each**
phase: `python build.py`, `bash tests/run.sh`, check in a browser (desktop 1280×720 and phone 390×844), commit, push to
`main`, and post a short summary.

## Before you start (session setup)
- Switch the session to **Auto** permission mode first (`set_session_permission_mode` → `auto`). Wyatt is tired of approving each step.
- On this PC `python3` is the Microsoft Store stub: use `python build.py`. Node isn't installed (the winget install hung
  on its admin prompt); get Wyatt's OK, then use the official portable zip from nodejs.org (check SHASUMS256) or winget.
- Browser check: the browser pane can't open `file://`. Serve the repo with `python -m http.server` through `.claude/launch.json`
  and use `preview_start` (keep that file out of git).
- Git identity in this clone is repo-local `Claude <noreply@anthropic.com>` (matches earlier commits).

## The look (all phases follow this)
- **Reference:** a SpaceX launch webcast. Minimal, cinematic telemetry, not a dashboard.
- **Colour:** white and grey on black; **one accent: red**, used sparingly (live dot, warnings, active state, key events). Green only
  for "on/ok". Replace the amber accent tokens in `shell.html` `:root` and the hard-coded amber in canvas code (`#ff9d2e`, `#ffc27a`).
- **Font:** a thin, wide, techy open-licence font built into the file (offline). First choice **D-DIN** (SIL OFL); fallback
  **Rajdhani** (OFL). Subset to Latin + digits + symbols used (°, ×, Δ, ₂, ₄, ·, –, →), woff2, base64 `@font-face`,
  target ≤ 60 KB. **Downloading the font needs Wyatt's OK first.** Keep the monospace stack for numbers that must align.
- **Density: minimal on screen, deep when pulled out.** Only key numbers and a slim toolbar are always visible. Every data panel
  (probe, tool/keys, inspector, editor stats, and all flight panels) lives behind a small labelled **edge tab** (INFO, SAS,
  ASCENT, NODE, LAND, …). Click a tab to slide its panel out, click again to hide it. Several can be open at once; remember
  which are open. Pulled-out panels are **detailed, MechJeb-style**: lots of numbers, clearly grouped.
- **Motion everywhere:**
  - Smooth transitions between test stand ↔ editor ↔ flight (fade plus a slight scale).
  - Rolling numbers: readouts ease toward new values instead of jumping.
  - Press, hover and open/close feedback on every button, panel and dialog.
  - Ignition drama: screen shake, flash and bloom when an engine lights or a rocket launches.
  - Respect `prefers-reduced-motion`.

## Phase 1: UI shell (v1.15)
1. Tokens: white/grey on black, red accent, font embedded. Restyle panels to hairline-thin, more space, uppercase spaced labels.
2. Fold-away panels with edge tabs (test stand, editor, flight). Phone layout keeps its stacked layout (no fold-away there).
3. Motion: screen transitions, rolling numbers (one helper used by every readout: probe, flight HUD, editor stats), button and
   dialog animations.
4. **Flight HUD = webcast telemetry:**
   - Bottom-left: two **round dials** for speed and altitude (thin arcs that fill, big thin numbers in the middle).
   - Bottom-centre: **mission timeline bar** with a T+ clock and event ticks (LIFTOFF, MAX-Q, BOOSTER SEP, STAGE SEP, SPACE,
     ORBIT; MOON when it applies). Events tick off as they happen; derive the list from the rocket's stages.
   - **Event callouts:** big thin centred text that fades in and out (LIFTOFF, MAX-Q, STAGE SEPARATION, …). This replaces the
     current `fmsg` box for events; keep `fmsg` for hints.
   - **Live feel:** a small red ● LIVE tag, slight camera drift, and shake that scales with thrust and dynamic pressure.
   - Secondary numbers (Ap/Pe, TWR, Δv, fuel) stay small and can be folded away.
5. **INFO pull-out panels (MechJeb-style readouts),** each its own edge tab or a section of INFO:
   - **Orbit:** Ap, Pe, period, eccentricity, semi-major axis, time to Ap and Pe, orbital speed, SOI (Earth/Moon).
   - **Surface:** altitude above ground, vertical and horizontal speed, surface speed, dynamic pressure q (with Max-Q marker),
     drag, air density, distance to the pad and landing zone.
   - **Vessel:** mass (wet/dry), TWR now and max, Δv per stage and total, burn time per stage, engines lit, booster burn left.
6. **SAS hold modes** (a SAS tab plus a compact always-visible strip of icon buttons in flight, with hotkeys):
   - Stability (hold current heading, as now), Prograde, Retrograde, Radial out, Radial in (relative to the current orbit).
   - Surface prograde and surface retrograde: follow the path over the ground, for landings.
   - Horizon east and horizon west: flat along the ground.
   - Normal and anti-normal are left out on purpose, because in 2D they point out of the screen.
   - Steering input (A/D) drops back to Stability; the active hold shows as a red marker on the navball-style heading ring.
   - The holds use the existing fly-by-wire/heading-hold torque limits in `stepV` (`flight.js`), so an active hold can't do
     anything the rocket couldn't do already. Add a headless test that each hold settles within a few degrees.

## Phase 2: test stand as an engineering cutaway (v1.16)
- Walls render as **crisp white outlines** (contours of the solid regions) on a near-black blue background, instead of pixel steel.
  Tanks, valves, injectors and igniters become line drawings in the same style (red only for active/open state).
- **Blueprint grid** (faint, 1 cm minor / 10 cm major) and **dimension lines**: auto-measure throat width, exit width and
  chamber length on the built engine and draw them like a technical drawing.
- **Glowing gas inside:** the gas and flame views stay in full colour inside the white lines (the Real view stays the default).
- **Live numbers on the drawing:** chamber pressure and temperature written on the chamber, exit Mach and pressure at the nozzle
  exit, updating live (place them at sensible auto-found spots; hide them when there's no engine shape).
- **No part-name labels** (Wyatt didn't pick them).
- The **rocket editor** gets the same blueprint/cutaway style (white-line parts on a grid). **Flight keeps realistic rocket art.**

## Phase 3: cinematic launch (v1.17)
- **Pre-launch on the pad** (while the rocket sits waiting and through the countdown):
  - **Umbilical arms** from the tower connect to each stage's tanks. Upper arms swing away from T-5 to T-2, the base
    umbilicals drop at T-0. Draw the hoses with sag; arms retract with easing.
  - **Boil-off venting:** white cold-vapour plumes from vents on fuelled tanks. They puff and drift with a little wind,
    get stronger while waiting, and stop about T-10 (vents close).
  - **Frost on the tanks:** a frosty white coating on cold propellant tanks (cryogenic H₂/O₂, and methane). It flakes off as
    small falling particles during the climb and is gone by about 10 km. Solid boosters get no frost.
  - **Hold-down clamps** at the base hold the rocket while the engines spool up from T-3. They open at T-0.
- **Flow:** Launch in the editor puts the rocket on the pad and it waits. **Space (or an on-screen START COUNTDOWN button)**
  starts a **10 s countdown**. Space during the countdown skips to T-0. After lift-off, Space stages as now.
- **Countdown:**
  - Big T- clock and callouts ("T minus 10", "ignition sequence start" at T-3, "liftoff").
  - **Spoken callouts** with the browser's `speechSynthesis`: offline, with a radio-style filter feel if possible, muted with sound off.
  - Countdown beeps from `juice.js`.
  - Engines light at T-3 (ramping, clamps hold the rocket), clamps release at T-0, throttle goes to full, then the player has control.
- **Pad and tower:** detailed launch tower with swing arms that pull away at T-5 to T-0, a flame trench, pad lights, and **water
  deluge** spray that starts at T-5.
- **Huge exhaust clouds:** big billowing steam/smoke clouds roll sideways out of the trench across the pad at ignition, grow and
  drift, and linger after the rocket leaves. Render with layered soft particles. Watch performance (cap the count; cheap when
  off screen).
- **Shake and glow:** camera shake at ignition and lift-off, the ground and tower lit orange by the flame (falls off with height),
  heat shimmer above the trench.
- Hook into the existing `JUICE` sounds (ignition bang, roar) and goals (`launch`).

## Phase 4: sky and clouds by altitude (v1.18)
- **Layers by altitude:** puffy cumulus at 1–3 km, flat stratus sheets at 4–8 km, thin wispy cirrus at 9–14 km; none above about 15 km.
- **Fly through them:** passing through a layer briefly fogs the view white (density by thickness), then clears above it.
- **Parallax depth:** several depth bands; far clouds move slower than near ones relative to the rocket.
- **Sky colour shift:** blue → deep blue → black with stars; a thin glowing horizon line and the planet's curve appear high up
  (from roughly 20 km). Keep it consistent with the existing `renderFlight` sky gradient and star field (`flight.js`).
- Random but stable per launch (seeded), so a retry looks the same.

## Phase 5: flight computer, the MechJeb-style autopilots (v1.19)
Each is a pull-out edge-tab panel with clear Engage/Abort buttons, status text ("Gravity turn… 34%"), and the autopilot's
plan drawn on the map. The player can take over at any moment (any steering or throttle input disengages it, with a callout).
- **ASCENT:** set the target orbit altitude (default 60 km). It flies a gravity turn (start speed, turn shape, end angle, all
  tweakable), limits throttle near Max-Q, auto-stages when a stage runs dry, coasts to Ap and circularises. Base it on the
  proven headless autopilot in `tests/flight/orbit_ascent.js`, which already reaches orbit with the Orbiter and Sparrow.
- **NODE:** maneuver planner plus executor. Presets: circularise at Ap or Pe, change Ap, change Pe, Hohmann transfer to the
  Moon (reuse the search in `tests/flight/rails_vs_prediction.js`), return from the Moon. Show the planned orbit on the map
  (dashed, using `predict()` in `orbit.js`), the burn Δv and time to the burn. Execute: warp to the burn, point at the burn
  direction, burn and trim.
- **LAND:** target the landing zone or the current spot on the Moon. De-orbit burn, coast, then a suicide burn with legs down,
  aiming for under 3 m/s touchdown. Base it on `tests/flight/moon_landing.js` and `landing_limits.js`.
- Add headless tests: ascent to orbit for every ready-made rocket, Moon transfer to a Moon periapsis between 20 and 200 km,
  landing on the landing zone and on the Moon with no crash.

## Out of scope / open
- **Still waiting on Wyatt:** make the repo public and turn on GitHub Pages? The repo is private and Pages is off, so the
  "live" URL in CLAUDE.md doesn't work yet. Don't do this without his yes.
- Flight tanks still use hydrolox density for every fuel (methane/kerosene should be denser): a later backlog item.
- Backlog item 6 (centre of mass / lift / thrust markers) is unchanged.
