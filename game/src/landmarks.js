import * as T from '../vendor/three.module.min.js';
import { groundHeight, riverX } from './terrain.js';

function addBox(scene, x, y, z, width, height, depth, material) {
  const mesh = new T.Mesh(new T.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function buildRunwayOverlay(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 2048;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 256, 2048);
  context.fillStyle = 'rgba(240, 232, 211, 0.92)';
  for (let x = 27; x < 230; x += 34) {
    context.fillRect(x, 1720, 18, 150);
  }
  context.font = 'bold 120px sans-serif';
  context.textAlign = 'center';
  context.fillText('36', 128, 1650);
  context.fillStyle = 'rgba(10, 14, 18, 0.28)';
  for (let x = 92; x <= 164; x += 72) {
    context.fillRect(x, 1250, 5, 400);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(76, 1100), new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(310, 26.2, -1500);
  scene.add(mesh);
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(canvas);
}

function buildPapi(scene) {
  const lights = [];
  const texture = glowTexture();
  const housing = new T.MeshStandardMaterial({ color: 0x2a2d2f, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const x = 365 + i * 11;
    addBox(scene, x, 29, -1090, 1.2, 0.8, 0.6, housing);
    const material = new T.MeshBasicMaterial({ color: i < 2 ? 0xff3333 : 0xffffff, toneMapped: false });
    const light = new T.Mesh(new T.CircleGeometry(0.38, 16), material);
    light.position.set(x, 29, -1089.68); scene.add(light);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false }));
    glow.position.set(x, 29, -1089.6); glow.scale.set(1.5, 1.5, 1); scene.add(glow);
    // Both materials share the same Color, so the unchanged indication updates both.
    glow.material.color = material.color;
    lights.push(light);
  }
  return lights;
}

function updatePapiIndication(lights, flight) {
  const distance = Math.max(1, flight.z + 1090);
  const angle = Math.atan2(flight.y - 26, distance) * 180 / Math.PI;
  const thresholds = [2.4, 2.8, 3.2, 3.6];
  lights.forEach((light, i) => {
    light.material.color.setHex(angle < thresholds[i] ? 0xff3030 : 0xffffff);
  });
}

function foundation(scene, x, y, z, width, depth) {
  addBox(scene, x, y - 20, z, width + 5, 40, depth + 5,
    new T.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.95 }));
}

function buildBuilding(scene, x, z, width, height, depth) {
  const y = groundHeight(x, z);
  const walls = new T.MeshStandardMaterial({ color: 0x624f48, roughness: 0.9 });
  const roof = new T.MeshStandardMaterial({ color: 0x343945, roughness: 0.9 });
  const windowMaterial = new T.MeshStandardMaterial({ color: 0xffbc68, emissive: 0xff8c32, emissiveIntensity: 1.5 });
  foundation(scene, x, y, z, width, depth);
  const hangar = width > 100;
  if (hangar) {
    // Three walls and a lintel leave a real opening on the runway-facing west side.
    addBox(scene, x, y + height / 2, z, width, height, depth, walls);
    // Remove the central part of the west wall by constructing it in sections instead.
    const solid = scene.children[scene.children.length - 1]; scene.remove(solid);
    addBox(scene, x, y + height / 2, z - depth / 2 + 2, width, height, 4, walls);
    addBox(scene, x, y + height / 2, z + depth / 2 - 2, width, height, 4, walls);
    addBox(scene, x + width / 2 - 2, y + height / 2, z, 4, height, depth, walls);
    for (const side of [-1, 1]) addBox(scene, x - width / 2 + 2, y + height / 2, z + side * depth * 0.40, 4, height, depth * 0.2, walls);
    addBox(scene, x - width / 2 + 2, y + height - 4, z, 4, 8, depth * 0.6, walls);
    addBox(scene, x + width / 2 - 5, y + 13, z, 1, 24, depth * 0.55, windowMaterial);
    const line = new T.MeshBasicMaterial({ color: 0xf6d66b });
    for (let i = 0; i < 28; i++) {
      const lx = x - width / 2 - 3 - i * 3;
      addBox(scene, lx, groundHeight(lx, z) + 0.18, z, 3.1, 0.12, 0.65, line);
    }
    for (const side of [-1, 1]) for (let i = 0; i < 15; i++) {
      const lx = x - width / 2 - 4 - i * 3;
      const lz = z + side * 25;
      addBox(scene, lx, groundHeight(lx, lz) + 0.18, lz, 3.1, 0.12, 0.45, line);
    }
  } else {
    addBox(scene, x, y + height / 2, z, width, height, depth, walls);
    for (let i = -1; i <= 1; i++) addBox(scene, x + i * width * 0.25, y + height * 0.62, z + depth / 2 + 0.3, width * 0.14, height * 0.25, 1, windowMaterial);
  }
  const rise = depth * 0.18;
  const angle = Math.atan2(rise, depth / 2);
  for (const side of [-1, 1]) {
    const panel = addBox(scene, x, y + height + rise / 2, z + side * depth / 4, width + 4, 2, Math.hypot(depth / 2 + 2, rise), roof);
    panel.rotation.x = side * angle;
  }
  addBox(scene, x, y + height + rise, z, width + 4, 1.2, 1.2, roof);
}

function buildAirport(scene) {
  buildBuilding(scene, 455, -1550, 105, 36, 75);
  const towerY = groundHeight(455, -1350);
  const towerMaterial = new T.MeshStandardMaterial({ color: 0x77777a });
  foundation(scene, 455, towerY, -1350, 20, 20);
  addBox(scene, 455, towerY + 35, -1350, 20, 70, 20, towerMaterial);
  const glass = new T.MeshStandardMaterial({ color: 0x8cc6ca, transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.2 });
  const frame = new T.MeshStandardMaterial({ color: 0x26363b });
  addBox(scene, 455, towerY + 74, -1350, 24, 8, 24, glass);
  for (const dx of [-11.5, 11.5]) for (const dz of [-11.5, 11.5]) addBox(scene, 455 + dx, towerY + 74, -1350 + dz, 1, 8, 1, frame);
  addBox(scene, 455, towerY + 78.5, -1350, 26, 1.5, 26, frame);
  const beacon = new T.Mesh(new T.SphereGeometry(1.8, 12, 8), new T.MeshBasicMaterial({ color: 0xffbc68 }));
  beacon.position.set(455, towerY + 81, -1350);
  const beam = new T.Mesh(new T.ConeGeometry(3, 30, 12, 1, true), new T.MeshBasicMaterial({ color: 0xffedbc, transparent: true, opacity: 0.1, side: T.DoubleSide, depthWrite: false }));
  beam.rotation.z = -Math.PI / 2; beam.position.x = 15; beacon.add(beam);
  scene.add(beacon);
  return beacon;
}

function buildWindsock(scene) {
  const x = 400;
  const z = -1120;
  const y = groundHeight(x, z);
  const pole = new T.Mesh(new T.CylinderGeometry(1, 1, 36, 6), new T.MeshStandardMaterial({ color: 0xbab5aa }));
  pole.position.set(x, y + 18, z);
  scene.add(pole);
  const sock = new T.Mesh(new T.ConeGeometry(5, 24, 12, 1, true), new T.MeshBasicMaterial({ color: 0xff813b, side: T.DoubleSide }));
  sock.rotation.z = Math.PI / 2;
  sock.rotation.y = 245 * Math.PI / 180;
  sock.position.set(x + Math.sin(245 * Math.PI / 180) * 12, y + 35, z - Math.cos(245 * Math.PI / 180) * 12);
  scene.add(sock);
}

function buildCamp(scene) {
  buildBuilding(scene, 10, -930, 35, 18, 28);
  buildBuilding(scene, 35, -1080, 38, 20, 30);
  buildBuilding(scene, -25, -1020, 30, 16, 25);
  const y = groundHeight(-40, -950);
  const mast = new T.Mesh(new T.CylinderGeometry(1, 2, 75, 5), new T.MeshStandardMaterial({ color: 0x8c9193 }));
  mast.position.set(-40, y + 37, -950);
  scene.add(mast);
  const mastDetail = new T.MeshStandardMaterial({ color: 0x535b5d });
  for (const h of [30, 50, 70]) addBox(scene, -40, y + h, -950, 12, 0.7, 0.7, mastDetail);
  const red = new T.MeshBasicMaterial({ color: 0xff3930, toneMapped: false });
  const warning = new T.Mesh(new T.SphereGeometry(1, 8, 6), red); warning.position.set(-40, y + 75, -950); scene.add(warning);
  const lamp = new T.MeshBasicMaterial({ color: 0xffc77d, toneMapped: false });
  const post = new T.MeshStandardMaterial({ color: 0x454b49 });
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI * 2 / 20;
    const lx = 5 + Math.cos(angle) * 85, lz = -1005 + Math.sin(angle) * 120;
    const ly = groundHeight(lx, lz);
    addBox(scene, lx, ly + 1, lz, 0.5, 2, 0.5, post);
    const bulb = new T.Mesh(new T.SphereGeometry(0.8, 8, 6), lamp); bulb.position.set(lx, ly + 2.3, lz); scene.add(bulb);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new T.CanvasTexture(canvas);
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const material = new T.SpriteMaterial({ map: texture, color: 0xc69a7d, transparent: true, opacity: 0.35, depthWrite: false });
    const smoke = new T.Sprite(material);
    scene.add(smoke);
    puffs.push(smoke);
  }
  return (elapsed) => {
    puffs.forEach((smoke, i) => {
      const phase = (i / puffs.length + elapsed * 0.015) % 1;
      const size = 20 + phase * 28;
      smoke.position.set(75 + phase * 20 + Math.sin(elapsed * 0.3 + i) * 3, groundHeight(75, -1000) + 15 + phase * 120, -1000);
      smoke.scale.set(size, size, 1);
      smoke.material.opacity = 0.35 * (1 - phase);
    });
  };
}

function buildBridge(scene) {
  const x = riverX(-2000);
  const material = new T.MeshStandardMaterial({ color: 0x6b6860 });
  addBox(scene, x, 26, -2000, 510, 5, 28, material);
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(x - 250, 15, -1987),
    new T.Vector3(x - 130, 45, -1987),
    new T.Vector3(x, 58, -1987),
    new T.Vector3(x + 130, 45, -1987),
    new T.Vector3(x + 250, 15, -1987)
  ]);
  scene.add(new T.Mesh(new T.TubeGeometry(curve, 32, 2, 6, false), material));
}

export function buildLandmarks(scene, seed) {
  buildRunwayOverlay(scene);
  const lights = buildPapi(scene);
  const beacon = buildAirport(scene);
  buildWindsock(scene);
  const updateSmoke = buildCamp(scene);
  buildBridge(scene);
  let elapsed = seed * 0.01;
  return {
    update(flight, dt) {
      elapsed += dt;
      updatePapiIndication(lights, flight);
      updateSmoke(elapsed);
      beacon.material.color.setHex(Math.sin(elapsed * 2) > 0 ? 0xffd991 : 0x8c512a);
      beacon.rotation.y += dt;
    }
  };
}
