import { CONFIG } from './config.js';
import { setFlaps, evaluateTouchdown } from './flight.js';
import { groundHeight } from './terrain.js';

export function stageShot(name, world) {
  const contract = name === 'supply' ? 1 : name === 'cockpit' || name === 'touchdown' ? 2 : 0;
  world.reset(contract);
  const f = world.flight;
  // Set the approach values here so the cockpit branch remains untouched.
  world.time = 52;
  world.score = 750;
  world.fuel = 64;
  if (name === 'cover') {
    world.time = 18;
    world.score = 250;
    world.fuel = 92;
    Object.assign(f, { x: -120, y: 235, z: -710, heading: 0.16, roll: 0.48, pitch: 0.04, speed: 49, throttle: 0.68 });
    f.coverCamera = true;
    world.progress = 2;
  }
  if (name === 'cockpit') {
    // The cleared southern approach now supports a three-degree glidepath:
    // 280 m before the threshold, 33.0113 m above the local terrain.
    Object.assign(f, { x: 310, y: 48.0113, z: -670, heading: 0, roll: 0, pitch: -0.05, speed: 32, throttle: 0.35 });
    setFlaps(f, 30);
  }
  if (name === 'supply') {
    world.time = 68;
    world.score = 1250;
    Object.assign(f, { x: 65, y: groundHeight(65, -975) + 45, z: -975, heading: 0, roll: 0, pitch: -0.02, speed: 35, throttle: 0.55 });
    world.fuel = 22;
    world.damage = 18;
    world.release();
    for (let i = 0; i < 30; i++) {
      world.missions.step(0.1, f);
    }
    const crate = world.missions.state.crate.group.position;
    Object.assign(f, { x: crate.x + 5, y: crate.y + 4, z: crate.z - 8, heading: 0, roll: 0, pitch: -0.02 });
  }
  if (name === 'touchdown') {
    Object.assign(f, { x: 310, y: groundHeight(310, -1300) + CONFIG.collisionHeight, z: -1300, heading: 0, roll: 0, pitch: -0.08, speed: 32, throttle: 0.25 });
    setFlaps(f, 30);
    world.touchdown = evaluateTouchdown(f, groundHeight(f.x, f.z));
    f.onGround = true;
    world.status = 'complete';
    world.score = 2200;
    world.time = 83;
    world.fuel = 46;
    if (typeof document !== 'undefined') {
      const canvas = document.querySelector('#view');
      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mousemove', { movementX: 100 }));
      window.dispatchEvent(new MouseEvent('mouseup'));
    }
  }
  world.rings.forEach((ring, i) => {
    ring.visible = contract === 0 && i >= world.progress;
  });
}
