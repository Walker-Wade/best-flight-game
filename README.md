# Aurora Courier

An original, offline 3D bush flying game set in Ember Valley, beneath a dusk aurora. Built from authored geometry, procedural terrain and synthesized sound; Three.js is bundled locally.

Choose Ring Run (eight ordered gates), Supply Drop (release cargo over the cyan ground beacon), or Ridge Landing (touch down gently in the first third of the illuminated runway). Keep airspeed above 49 knots; bank to turn. Fuel and aircraft damage persist throughout each sortie. Green ring replenishes fuel (+30%, 20-second cooldown). Best contract scores are saved locally.

- W/S or Shift/Ctrl: throttle
- Up/Down: nose down/up
- Left/Right: bank and turn
- Space: release cargo
- P/Esc: pause; R: restart
- Drag mouse: look around (also steers gently); mouse wheel: throttle
- C: switch camera (chase / cockpit); F: flaps; B: brake

Run `node serve.ts`, then open the local server on port 8080. Build the submission with `MAKEFUN_OUTPUT_DIR=out node main.ts`. No build step or online assets are needed for play.

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/Walker-Wade/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/Walker-Wade/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

Referral code: **rbz389nj**

Screenshot views are reproducible with `shots.json` and seed 7; they render the actual game scene.
