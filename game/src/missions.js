import { getWind } from './flight.js';
import { groundHeight } from './terrain.js';

export function createMissions(world, effects) {
  const state = {
    status: 'idle', success: false, missDistance: null,
    crate: null, elapsed: 0, dropRadius: 48
  };

  function startSupplyDrop(flight) {
    if (state.status !== 'idle') {
      return false;
    }
    const crate = effects.buildParachuteCrate();
    crate.group.position.set(flight.x, flight.y, flight.z);
    world.scene.add(crate.group);
    state.crate = crate;
    state.status = 'dropping';
    state.elapsed = world.time || 0;
    return true;
  }

  function step(dt, flight) {
    if (state.status !== 'dropping') {
      return;
    }
    state.elapsed += dt;
    const position = state.crate.group.position;
    const wind = getWind(position.x, position.z, state.elapsed);
    const angle = wind.dirDeg * Math.PI / 180;
    const speed = wind.speedKt * 0.514444;
    position.x -= Math.sin(angle) * speed * dt;
    position.z += Math.cos(angle) * speed * dt;
    position.y -= 5.5 * dt;
    const floor = groundHeight(position.x, position.z) + 0.8;
    if (position.y <= floor) {
      position.y = floor;
      state.status = 'landed';
      state.missDistance = Math.hypot(position.x - 120, position.z + 1000);
      state.success = state.missDistance <= state.dropRadius;
    }
  }

  return { startSupplyDrop, step, state };
}
