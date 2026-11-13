# THROAT

A 2D rocket-engine sandbox. Build an engine on the test stand and watch real gas physics run: tanks, valves,
injectors, a torch igniter, hydrogen + oxygen combustion, shock diamonds in the plume. Or paint solid propellant
and fire a booster. Then build a rocket from parts and fly it in real time: staging, landing legs, orbit, the Moon.

**Play:** https://zappy8667.github.io/THROAT/ (Chrome on a PC works best)

Made by Wyatt with Claude.

## Developing
- `python3 build.py` builds `index.html` (the whole game in one file) from `src/`.
- `bash tests/run.sh` runs the headless checks (needs Node 18+).
- See `CLAUDE.md` for how everything fits together.
