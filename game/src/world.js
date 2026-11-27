import * as T from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createFlight, stepFlight, evaluateTouchdown } from './flight.js';
import { groundHeight } from './terrain.js';
import { createMissions } from './missions.js';
import { createEffects } from './effects.js';

export class CourierWorld {
  constructor(scene, terrain, audio) {
    this.scene = scene;
    this.terrain = terrain;
    this.audio = audio;
    this.effects = createEffects(scene);
    this.rings = [];
    this.route = [
      [-30, 180, 0], [80, 210, -480], [210, 240, -980], [60, 290, -1550],
      [-160, 280, -2150], [-260, 240, -2750], [-80, 200, -3350], [190, 180, -3950]
    ];
    for (const [x, y, z] of this.route) {
      const mesh = new T.Mesh(new T.TorusGeometry(CONFIG.ringRadius, 1.4, 10, 64), new T.MeshBasicMaterial({ color: 0xffc66f }));
      mesh.position.set(x, y, z);
      scene.add(mesh);
      this.rings.push(mesh);
    }
    this.fuelRing = new T.Mesh(new T.TorusGeometry(34, 1.5, 10, 48), new T.MeshBasicMaterial({ color: 0x72ffb2 }));
    this.fuelRing.position.set(-110, 160, -1200);
    scene.add(this.fuelRing);
    this.drop = new T.Mesh(new T.RingGeometry(35, 48, 64), new T.MeshBasicMaterial({ color: 0x71ffe6, side: T.DoubleSide }));
    this.drop.rotation.x = -Math.PI / 2;
    this.drop.position.set(120, groundHeight(120, -1000) + 1, -1000);
    // The beam is a child of the drop marker, so both share its visibility.
    for (const [radius, opacity] of [[7, 0.22], [15, 0.08]]) {
      const beam = new T.Mesh(new T.CylinderGeometry(radius * 0.65, radius, 120, 24, 1, true),
        new T.MeshBasicMaterial({ color: 0x71ffe6, transparent: true, opacity, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
      beam.rotation.x = Math.PI / 2;
      beam.position.z = 60;
      this.drop.add(beam);
    }
    scene.add(this.drop);
    this.reset(0);
  }

  reset(contract) {
    const oldCrate = this.missions?.state.crate;
    if (oldCrate) {
      this.scene.remove?.(oldCrate.group);
      oldCrate.group.traverse(function disposeCratePart(part) {
        part.geometry?.dispose();
        part.material?.dispose();
      });
    }
    this.contract = contract;
    this.flight = createFlight();
    if (contract === 2) {
      Object.assign(this.flight, { x: 310, y: 125, z: -300, speed: 35, throttle: 0.34 });
    }
    this.fuel = 60;
    this.damage = 0;
    this.score = 0;
    this.time = 0;
    this.progress = 0;
    this.status = 'flying';
    this.reason = '';
    this.touchdown = null;
    this.refuelCooldown = 0;
    this.warningTime = 0;
    this.lastFlaps = 0;
    this.missions = createMissions(this, this.effects);
    for (const ring of this.rings) {
      ring.visible = contract === 0;
    }
    this.drop.visible = contract === 1;
  }

  finish(success, reason) {
    if (this.status !== 'flying') {
      return;
    }
    this.status = success ? 'complete' : 'crashed';
    this.reason = reason;
    if (success) {
      this.score += Math.round(this.fuel * 10 + Math.max(0, 500 - this.time));
      this.audio.tone('success');
      try {
        const key = 'aurora-best-' + this.contract;
        localStorage.setItem(key, Math.max(this.score, Number(localStorage.getItem(key) || 0)));
      } catch {
        // Storage is optional when running without a browser.
      }
    }
  }

  release() {
    if (this.contract !== 1 || this.status !== 'flying') {
      return false;
    }
    const started = this.missions.startSupplyDrop(this.flight);
    if (started) {
      this.audio.tone('drop');
      this.reason = 'Supplies descending under canopy';
    }
    return started;
  }

  step(input, dt) {
    if (this.status !== 'flying') {
      return;
    }
    this.time += dt;
    const f = this.flight;
    this.fuel = Math.max(0, this.fuel - dt * CONFIG.fuelBurn * (0.3 + f.throttle));
    f.thrustScale = Math.max(0.3, 1 - this.damage * 0.007);
    const hit = stepFlight(f, input, dt, this.fuel);
    this.audio.update?.(f.throttle, f.speed, this.fuel, this.damage);
    if (f.flaps !== this.lastFlaps) {
      this.audio.tone('flaps');
      this.lastFlaps = f.flaps;
    }
    this.effects.update(dt);
    this.missions.step(dt, f);
    if (this.contract === 1 && this.missions.state.status === 'landed' && this.progress === 0) {
      const delivery = this.missions.state;
      this.progress = 1;
      if (delivery.success) {
        this.score += Math.round(1500 - delivery.missDistance * 7);
        this.finish(true, 'SUPPLIES DELIVERED · Valley station resupplied');
      } else {
        this.finish(false, 'Supply drop missed by ' + Math.round(delivery.missDistance) + ' m');
      }
    }
    if (hit) {
      this.audio.tone('touchdown');
      if (hit.runway) {
        this.touchdown = evaluateTouchdown(f, groundHeight(f.x, f.z));
      }
      if (hit.runway && this.contract === 2 && this.touchdown.ok) {
        this.score += 1800 - Math.round(hit.impact * 100);
        this.finish(true, 'PRECISION LANDING · ' + this.touchdown.verdict);
      } else {
        if (hit.runway && this.contract === 2) {
          this.reason = this.touchdown.reasons.join(' · ');
        }
        this.damage = Math.min(100, this.damage + hit.impact * 12 + (hit.runway ? 2 : 35));
        if (hit.impact > 7 || this.damage >= 100 || f.speed > 45) {
          this.finish(false, hit.runway ? 'Hard landing' : f.stall ? 'Stall impact' : 'Terrain collision');
        }
      }
    }
    for (const tree of this.terrain.trees) {
      if (Math.abs(tree.x - f.x) < 10 && Math.abs(tree.z - f.z) < 10 && f.y < tree.y + tree.height) {
        this.damage = Math.min(100, this.damage + 45);
        f.speed *= 0.7;
        f.y += 8;
        if (this.damage >= 100) {
          this.finish(false, 'Tree strike');
        }
        break;
      }
    }
    if (this.contract === 0 && this.progress < 8) {
      const ring = this.rings[this.progress];
      ring.material.color.setHex(0xffd79b);
      if (Math.hypot(ring.position.x - f.x, ring.position.y - f.y, ring.position.z - f.z) < CONFIG.ringRadius) {
        ring.visible = false;
        this.progress++;
        this.score += 250;
        this.fuel = Math.min(100, this.fuel + 3);
        this.audio.tone('ring');
        if (this.progress === 8) {
          this.finish(true, 'ALL GATES CLEARED · Northern route certified');
        }
      }
    }
    this.refuelCooldown = Math.max(0, this.refuelCooldown - dt);
    if (this.refuelCooldown === 0 && Math.hypot(this.fuelRing.position.x - f.x, this.fuelRing.position.y - f.y, this.fuelRing.position.z - f.z) < 34) {
      this.fuel = Math.min(100, this.fuel + 30);
      this.refuelCooldown = 20;
      this.audio.tone('ring');
    }
    if (Math.abs(f.x) > 6500 || Math.abs(f.z) > 6500) {
      this.finish(false, 'Beyond the charted valley');
    }
    if (this.fuel === 0 && f.onGround) {
      this.finish(false, 'Fuel exhausted');
    }
  }
}
