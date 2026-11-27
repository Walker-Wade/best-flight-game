import { CONFIG } from './config.js';
import { groundHeight } from './terrain.js';

export function createFlight() {
  let vertical = 0;
  return {
    x: 0, y: 180, z: 450, speed: 49, heading: 0,
    pitch: 0, roll: 0, throttle: 0.68,
    get vertical() {
      return this.onGround ? vertical : deriveVertical(this);
    },
    set vertical(value) {
      vertical = value;
    },
    stall: false, onGround: false, flaps: 0, braking: false,
    elapsed: 0, thrustScale: 1
  };
}

export function setFlaps(flight, deg) {
  const requested = Number.isFinite(deg) ? deg : 0;
  flight.flaps = requested < 7.5 ? 0 : requested < 22.5 ? 15 : 30;
  return flight.flaps;
}

export function deriveVertical(f) {
  const flapLift = (f.flaps || 0) / 30;
  const sink = Math.max(0, 29 - f.speed - flapLift * 5) * 0.8;
  const bankLoss = (1 - Math.cos(f.roll || 0)) * Math.min(f.speed, 49) * 0.16;
  const lift = flapLift * Math.max(0, 1 - f.speed / 55) * 2.5;
  return Math.sin(f.pitch) * f.speed - sink - bankLoss + lift;
}

// Meteorological direction: wind comes from 245 degrees and blows northeast.
export function getWind(x, z, t = 0) {
  const position = Math.sin((x - 120) / 1700) * 0.6 + Math.sin((z + 1000) / 2100) * 0.5;
  const gust = Math.sin(t * 1.7 + x * 0.013 + z * 0.009) * 0.25;
  return {
    speedKt: 11 + position + gust,
    dirDeg: 245 + position * 3 + Math.sin(t * 0.7 + x * 0.004) * 1.2
  };
}

export function evaluateTouchdown(f, groundY) {
  const impact = Math.abs(f.vertical);
  const reasons = [];
  const speedOk = f.speed >= 25 && f.speed <= 41;
  const rollOk = Math.abs(f.roll) < 0.18;
  const impactOk = impact < 4;
  const zoneOk = f.z > -1320;
  const runwayOk = Math.abs(f.x - 310) < 38 && f.z > -2050 && f.z < -950;
  const contactOk = f.y <= groundY + CONFIG.collisionHeight + 0.5;
  reasons.push(speedOk ? 'Airspeed in landing band' : 'Airspeed outside 25–41 m/s');
  reasons.push(rollOk ? 'Wings level' : 'Excessive bank');
  reasons.push(impactOk ? 'Controlled descent' : 'Excessive vertical impact');
  reasons.push(zoneOk ? 'Threshold zone' : 'Touchdown past the first third');
  reasons.push(runwayOk ? 'On runway' : 'Outside runway');
  if (!contactOk) {
    reasons.push('Above touchdown height');
  }
  const ok = speedOk && rollOk && impactOk && zoneOk && runwayOk && contactOk;
  const penalty = impact * 8 + Math.abs(f.roll) * 90 + Math.abs(f.speed - 32) * 1.2 + Math.abs(f.x - 310) * 0.35;
  const score = Math.round(Math.max(0, Math.min(ok ? 100 : 39, 100 - penalty)));
  const verdict = !ok ? 'REJECTED' : score >= 85 ? 'GREASED' : score >= 65 ? 'FIRM' : 'HARD';
  return { ok, score, verdict, reasons };
}

export function stepFlight(f, input, dt, fuel) {
  const wasGrounded = f.onGround;
  f.elapsed = (f.elapsed || 0) + dt;
  f.throttle = Math.max(0, Math.min(1, f.throttle + (input.throttle || 0) * dt * 0.32));
  f.roll += ((input.roll || 0) * 0.92 - f.roll * 0.65) * dt;
  f.roll = Math.max(-1.15, Math.min(1.15, f.roll));
  f.pitch += ((input.pitch || 0) * 0.42 - f.pitch * 0.45) * dt;
  f.pitch = Math.max(-0.48, Math.min(0.48, f.pitch));
  const thrust = (fuel > 0 ? f.throttle : 0) * 13 * (f.thrustScale ?? 1);
  const flapDrag = (f.flaps || 0) / 30 * (0.8 + f.speed * f.speed * 0.0007);
  const friction = wasGrounded ? (f.braking ? 9 : 1.8) : 0;
  f.speed += (thrust - 3.2 - f.speed * f.speed * 0.0014 - flapDrag - Math.sin(f.pitch) * 9 - friction) * dt;
  f.speed = Math.max(wasGrounded ? 0 : 8, Math.min(CONFIG.maxSpeed, f.speed));
  f.stall = f.speed < CONFIG.stall;
  if (f.stall && !wasGrounded) {
    f.pitch -= dt * 0.22;
  }
  f.heading += Math.tan(f.roll) * 9.81 / Math.max(20, f.speed) * dt;
  f.onGround = false;
  f.vertical = deriveVertical(f);
  const takingOff = wasGrounded && f.speed >= CONFIG.stall && f.vertical > 0.5;
  if (wasGrounded && !takingOff) {
    f.vertical = 0;
  }
  const verticalStep = wasGrounded && !takingOff ? 0 : deriveVertical(f);
  f.y += verticalStep * dt;
  const wind = getWind(f.x, f.z, f.elapsed);
  const windAngle = wind.dirDeg * Math.PI / 180;
  const windSpeed = wasGrounded && !takingOff ? 0 : wind.speedKt * 0.514444;
  f.x += (Math.sin(f.heading) * f.speed - Math.sin(windAngle) * windSpeed) * dt;
  f.z += (-Math.cos(f.heading) * f.speed + Math.cos(windAngle) * windSpeed) * dt;
  const floor = groundHeight(f.x, f.z) + CONFIG.collisionHeight;
  if (f.y <= floor) {
    const impact = Math.abs(verticalStep);
    f.vertical = verticalStep;
    f.y = floor;
    f.onGround = true;
    if (!wasGrounded) {
      return { impact, runway: Math.abs(f.x - 310) < 38 && f.z > -2050 && f.z < -950 };
    }
    f.vertical = 0;
    return null;
  }
  f.onGround = false;
  return null;
}
