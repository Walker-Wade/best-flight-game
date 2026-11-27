import * as T from '../vendor/three.module.min.js';

function makeCanvas() {
  if (typeof document !== 'undefined') return document.createElement('canvas');
  const gradient = { addColorStop() {} };
  const context = {
    fillRect() {},
    beginPath() {},
    moveTo() {},
    bezierCurveTo() {},
    lineTo() {},
    fill() {},
    stroke() {},
    fillText() {},
    createRadialGradient() { return gradient; }
  };
  return { width: 0, height: 0, getContext() { return context; } };
}


function smokeTexture() {
  const canvas = makeCanvas();
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(canvas);
}

function lineBetween(group, a, b, material) {
  const geometry = new T.BufferGeometry().setFromPoints([new T.Vector3(...a), new T.Vector3(...b)]);
  group.add(new T.Line(geometry, material));
}

export function createEffects(scene) {
  const texture = smokeTexture();
  const particles = [];
  const canopies = [];
  let elapsed = 0;
  function puff(pos, color, size, life, velocity) {
    const material = new T.SpriteMaterial({ map: texture, color, transparent: true, opacity: 0.8, depthWrite: false });
    const sprite = new T.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.setScalar(size);
    scene.add(sprite);
    particles.push({ object: sprite, velocity, life, age: 0, size, sprite: true });
  }
  function touchdownSmoke(pos) {
    for (let i = 0; i < 8; i++) {
      const offset = new T.Vector3((i - 3.5) * 1.4, 0.7, 2 + (i % 3) * 2);
      const position = new T.Vector3(pos.x, pos.y, pos.z).add(offset);
      puff(position, 0xbcc6c5, 4.5 + (i % 3) * 0.5, 1.5, new T.Vector3((i - 3.5) * 0.9, 1.5 + i * 0.15, 1));
    }
  }
  function wingtipSmoke(pos, side) {
    puff(pos, 0xe0f4ef, 1.2, 0.8, new T.Vector3((side === 'left' ? -1 : side === 'right' ? 1 : side) * 0.8, 0.3, 0.6));
  }
  function damageSmoke(pos) {
    puff(pos, 0x34383a, 1.8, 1.8, new T.Vector3(0, 1.2, 1.5));
  }
  function crashBurst(pos) {
    puff(pos, 0xffa13b, 8, 0.5, new T.Vector3(0, 1, 0));
    for (let i = 0; i < 7; i++) {
      const fragment = new T.Mesh(new T.BoxGeometry(0.4, 0.25, 0.8), new T.MeshStandardMaterial({ color: i % 2 ? 0xe67b49 : 0x344b50 }));
      fragment.position.copy(pos);
      scene.add(fragment);
      const angle = i * Math.PI * 2 / 7;
      particles.push({ object: fragment, velocity: new T.Vector3(Math.cos(angle) * 5, 4 + i * 0.4, Math.sin(angle) * 5), life: 2, age: 0, sprite: false });
    }
  }
  function update(dt) {
    elapsed += dt;
    for (const canopy of canopies) {
      canopy.rotation.z = Math.sin(elapsed * 2) * 0.035;
      canopy.scale.x = 1 + Math.sin(elapsed * 3) * 0.02;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.age += dt;
      particle.object.position.addScaledVector(particle.velocity, dt);
      if (particle.sprite) {
        particle.object.scale.setScalar(particle.size * (1 + particle.age));
        particle.object.material.opacity = 0.8 * Math.max(0, 1 - particle.age / particle.life);
      } else {
        particle.velocity.y -= 9.8 * dt;
        particle.object.rotation.x += dt * 3;
        particle.object.rotation.z += dt * 2;
      }
      if (particle.age >= particle.life) {
        scene.remove(particle.object);
        particle.object.material.dispose();
        if (!particle.sprite) particle.object.geometry.dispose();
        particles.splice(i, 1);
      }
    }
  }
  function buildParachuteCrate() {
    const group = new T.Group();
    const wood = new T.MeshStandardMaterial({ color: 0xa36b3c, roughness: 0.85 });
    const strap = new T.MeshStandardMaterial({ color: 0x3d4b43 });
    const crate = new T.Mesh(new T.BoxGeometry(2, 1.6, 2), wood);
    group.add(crate);
    for (const x of [-0.65, 0.65]) {
      const band = new T.Mesh(new T.BoxGeometry(0.15, 1.65, 2.05), strap);
      band.position.x = x;
      group.add(band);
    }
    const canopy = new T.Mesh(new T.SphereGeometry(3.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xf3b65e, side: T.DoubleSide, roughness: 0.8 }));
    canopy.position.y = 5.3;
    group.add(canopy);
    canopies.push(canopy);
    const cord = new T.LineBasicMaterial({ color: 0xeee4d1 });
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      lineBetween(group, [Math.cos(angle) * 0.8, 0.8, Math.sin(angle) * 0.8], [Math.cos(angle) * 3.1, 5.3, Math.sin(angle) * 3.1], cord);
    }
    return { group };
  }
  return { update, touchdownSmoke, wingtipSmoke, damageSmoke, crashBurst, buildParachuteCrate };
}
