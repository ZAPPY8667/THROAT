# Next session: where things stand (2026-11-17, after v1.45)

v1.45 is committed on the session branch `claude/cpu-speedup`. Check whether it reached `main` (git log origin/main).
Read CLAUDE.md, then HISTORY.md v1.43–v1.45.

## Recent
- v1.43 physics on the graphics card (WebGPU) with CPU fallback. v1.44 camera exposure for the plume (the 2D jet flaps; at GPU
  speed it twitched). v1.45 Δv LEFT dial, Glow view fixed, speed test (click Sim), ready-made rockets trimmed, docking port, XXL world.

## Open
- **Real GPU speed**: still unmeasured (this container only has SwiftShader). Wyatt: click the Sim readout on the test stand.
  If the GPU isn't far ahead: profile bursts (encode vs GPU time), skip full read-back when no snapshot is wanted, fewer dispatches.
- Docking is tested headless (tests/flight/dock.js) but not flown end to end in a browser: try decouple → turn → dock with RCS.
- Some autopilot ascents overshoot (Sparrow Ap ~880 km, Heavy ~370 km) now the trimmed stages are punchy; they still reach orbit.
- Playtest email v2 for Zack: text drafted in chat on 2026-11-17; Gmail draft tools were turned off, and it needs Zack's address.
- THROAT stays a sandbox: no challenges or missions.

## Testing tips
- WebGPU in headless Chrome: `chromium.launch({args:['--enable-unsafe-webgpu']})` + a `file://` page. Adapter = SwiftShader.
- Title screen covers everything: `__title.go('fly'|'engine'|'watch')`. Unlock all: `localStorage['throat.tech.v1']={"got":[],"all":true}`.
- Torches use Math.random (seed it for exact comparisons). Sparks fire from the glue (`runSparks` every 4 steps), not `step()`.
- The Sim readout's text changes every frame: test its click with pointerdown (or element.click()).
- Bash heredocs containing JS sometimes trip a safety check here: use the Write/Edit tools for scripts.

## Rules that bit us
- Long one-line JS: never `// comment` mid-line (hit again in v1.45, vab.js partIcon: blank page). Use `/* */`.
- WGSL: one `let` per value. The page drops a worker silent for 3 s: post before slow setup.
- Push to `main` only when Wyatt says so; otherwise the session branch. `bash tests/run.sh` before every push (~9 min).
