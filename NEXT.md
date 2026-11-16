# Next session: where things stand (2026-11-16, v1.43 on branch `claude/cpu-speedup`, not on main)

v1.42 is on `main` and live. v1.43 (engine physics on the graphics card) is on the branch `claude/cpu-speedup`, NOT merged:
Wyatt hasn't tried it on a real GPU yet. Read CLAUDE.md, then HISTORY.md v1.43.

## What this stretch did (GPU plan, steps 0–4)
- Step 0 (CPU): only +10% was available (mixing fused, bit-identical). The CPU solver is compute-bound.
- Steps 1–3: `src/gpu.js` runs the whole per-step physics in WebGPU (gas, tanks, igniters, sparks, injectors, solid propellant,
  stirring, burning, heat loss). Matches the CPU: H₂ engine 2.29 kN / 369 s vs 2.30 / 373; quick test within 0.1–1.4%.
- Step 4: worker GPU loop with CPU fallback (`?cpu`, no WebGPU, GPU lost), atoms balance, tests/gpu/quick.js in run.sh,
  "· GPU" in the Sim readout, desktop + phone checked.

## Next
- **Measure on Wyatt's computer** (the whole point): open the branch build in Chrome, Build an engine, light it, hover the Sim
  readout for steps/s; compare with `?cpu`. This container only has SwiftShader (emulated GPU, slower than the CPU path).
- If it's fast: merge to main (Wyatt says when), then Step 5 ideas: bigger/finer worlds, maybe draw straight from the GPU.
- If it's slow on a real GPU: profile bursts (encode time vs GPU time); likely fixes: skip the full read-back when no
  snapshot is wanted, fewer dispatches (merge mixIt passes), encode the next burst while the GPU runs.
- Older ideas still open: trim ready-made rockets' spare Δv, tech-tree pacing from a fresh start, docking port, playtest email v2 for Zack.

## Testing tips
- WebGPU in headless Chrome here: `chromium.launch({args:['--enable-unsafe-webgpu']})` and a `file://` page (about:blank isn't a
  secure context). Adapter = SwiftShader. `GPU.wgsl()` prints the shader with the world size baked in.
- Torches use Math.random: seed it for bit-exact CPU comparisons. Sparks are fired by the glue (`runSparks` every 4 steps), not `step()`.
- Title screen covers everything on load: `__title.go('fly'|'engine'|'watch')`. Fresh profiles have the tech tree locked:
  set `localStorage['throat.tech.v1']={"got":[],"all":true}` before driving the editor/launch in a script.
- Write screenshots to the scratchpad, not the repo root.

## Rules that bit us
- WGSL: no comma-separated `let a=..,b=..`; one `let` per value.
- The page drops a worker that hasn't answered in 3 s: the worker must post before slow setup (GPU init).
- Long one-line JS edits: never add `// comment` before more code on the same line. Use `/* */`.
- Push to `main` only when Wyatt says so; otherwise the session branch. Run `bash tests/run.sh` before every push (~8 min now).
