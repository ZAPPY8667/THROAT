#!/usr/bin/env bash
# Headless checks (Node 18+). Takes about a minute.
set -e -o pipefail
cd "$(dirname "$0")"
echo "== core: atom bookkeeping on the liquid engine";   node core/atoms_balance.js
echo "== core: solid booster burn (pressure, thrust)";   node core/booster_burn.js | tail -4
echo "== core: hydrogen, methane, kerosene engines"; node core/fuels.js
echo "== core: booster Isp (steady, should be ~220 s)"; node core/booster_isp.js
echo "== flight: ready-made rockets";                    node flight/templates.js
echo "== flight: autopilot to orbit (Orbiter)";          node flight/orbit_ascent.js orbiter | tail -1
echo "== flight: autopilot to orbit (Sparrow, solid boosters)"; node flight/orbit_ascent.js sparrow | tail -1
echo "== flight: landing limits";                        node flight/landing_limits.js
echo "== flight: Moon landing + take-off";               node flight/moon_landing.js
echo "== flight: on-rails warp matches map prediction";  node flight/rails_vs_prediction.js
echo "== flight: SAS hold modes settle"; node flight/sas_holds.js | tail -1
echo "== flight: RCS"; node flight/rcs.js | tail -1
echo "== core: speed (large world)";                     node core/speed.js
