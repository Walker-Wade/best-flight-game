import * as T from '../vendor/three.module.min.js';

function makeCanvas() {
  if (typeof document !== 'undefined') return document.createElement('canvas');
  const gradient = { addColorStop() {} };
  const context = {
    fillRect() {},
    arc() {}, ellipse() {}, save() {}, restore() {}, translate() {}, rotate() {}, clip() {}, setLineDash() {}, clearRect() {},
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


function material(color, extra = {}) {
  return new T.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.25, ...extra });
}

function addMesh(parent, geometry, mat, x, y, z) {
  const mesh = new T.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function beam(parent, a, b, radius, mat) {
  const start = new T.Vector3(...a);
  const end = new T.Vector3(...b);
  const mesh = addMesh(parent, new T.CylinderGeometry(radius, radius, start.distanceTo(end), 8), mat, 0, 0, 0);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize());
  return mesh;
}

function wingGeometry(side) {
  const shape = new T.Shape();
  shape.moveTo(0, -1.9);
  shape.lineTo(side * 9.7, -1.35);
  shape.lineTo(side * 9.7, 0.7);
  shape.lineTo(0, 1.25);
  const geometry = new T.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function liveryTexture() {
  const canvas = makeCanvas();
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f1dfbf';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#164b55';
  ctx.beginPath();
  ctx.moveTo(0, 150);
  ctx.bezierCurveTo(130, 105, 260, 200, 512, 110);
  ctx.lineTo(512, 165);
  ctx.bezierCurveTo(280, 240, 140, 150, 0, 202);
  ctx.fill();
  ctx.strokeStyle = '#e0774b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 210);
  ctx.bezierCurveTo(180, 155, 300, 250, 512, 175);
  ctx.stroke();
  ctx.fillStyle = '#173b48';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('AC-07', 300, 92);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export function createAircraft() {
  const root = new T.Group();
  const ivory = material(0xeee0c6);
  const teal = material(0x165661);
  const orange = material(0xe5784e);
  const dark = material(0x182d36);
  const rubber = material(0x20272a, { roughness: 0.9 });
  const glass = material(0x8cc6ca, { transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide });
  const painted = material(0xffffff, { map: liveryTexture() });
  const body = addMesh(root, new T.CylinderGeometry(0.65, 1.35, 7.3, 12), painted, 0, 0, 1.1);
  body.rotation.x = -Math.PI / 2;
  // Flatten the forward upper fuselage below the instrument sightlines.
  function lowerForwardTop(mesh, limit, startZ) {
    mesh.updateMatrix();
    mesh.geometry.applyMatrix4(mesh.matrix);
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    const vertices = mesh.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      if (vertices.getZ(i) < startZ && vertices.getY(i) > limit) vertices.setY(i, limit);
    }
    vertices.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
  lowerForwardTop(body, 0.20, -0.5);
  const nose = addMesh(root, new T.CylinderGeometry(1.2, 1.35, 3.2, 12), ivory, 0, 0, -3.9);
  nose.rotation.x = Math.PI / 2;
  lowerForwardTop(nose, 0.20, 0);
  const cowling = addMesh(root, new T.CylinderGeometry(1.05, 1.2, 1.45, 12), orange, 0, 0, -5.7);
  cowling.rotation.x = Math.PI / 2;
  lowerForwardTop(cowling, 0.20, 0);
  beam(root, [0.9, -0.55, -4.2], [1.35, -0.9, -2.7], 0.14, dark);
  for (const side of [-1, 1]) {
    const wing = addMesh(root, wingGeometry(side), ivory, 0, 1.6, -0.5);
    wing.material.side = T.DoubleSide;
    beam(root, [side * 1.05, -0.85, 0.8], [side * 6.5, 1.5, -1.5], 0.09, dark);
    beam(root, [side * 1.05, -0.85, 0.8], [side * 6.5, 1.5, 0.35], 0.09, dark);
    for (let i = 0; i < 3; i++) {
      addMesh(root, new T.BoxGeometry(0.035, 0.48, 0.65), glass, side * 1.1, 0.45, 0.6 + i * 1.05);
    }
    const light = material(side < 0 ? 0xff4438 : 0x51ff9d, { emissive: side < 0 ? 0xff4438 : 0x51ff9d, emissiveIntensity: 2 });
    addMesh(root, new T.SphereGeometry(0.18, 8, 6), light, side * 9.65, 1.65, -0.5);
    beam(root, [side * 0.8, -0.9, -0.5], [side * 2.2, -2.05, -0.2], 0.16, dark);
    beam(root, [side * 0.6, -0.9, 1.3], [side * 2.2, -2.05, -0.2], 0.12, dark);
    const wheel = addMesh(root, new T.CylinderGeometry(0.7, 0.7, 0.48, 16), rubber, side * 2.2, -2.1, -0.2);
    wheel.rotation.z = Math.PI / 2;
    const hub = addMesh(root, new T.CylinderGeometry(0.25, 0.25, 0.5, 12), ivory, side * 2.2, -2.1, -0.2);
    hub.rotation.z = Math.PI / 2;
  }
  const surfaces = [];
  for (const side of [-1, 1]) {
    for (const [x, width, kind] of [[side * 7.4, 3.8, 'aileron'], [side * 3.4, 3.6, 'flap']]) {
      const hinge = new T.Group();
      hinge.position.set(x, 1.55, 0.45);
      root.add(hinge);
      addMesh(hinge, new T.BoxGeometry(width, 0.15, 0.65), teal, 0, 0, 0.3);
      surfaces.push({ hinge, side, kind });
    }
  }
  addMesh(root, new T.BoxGeometry(6.6, 0.18, 1.5), ivory, 0, 0.65, 4.55);
  const elevator = new T.Group();
  elevator.position.set(0, 0.65, 5.1);
  root.add(elevator);
  addMesh(elevator, new T.BoxGeometry(6.4, 0.14, 0.65), teal, 0, 0, 0.3);
  const fin = addMesh(root, new T.BoxGeometry(0.2, 2.3, 1.5), orange, 0, 1.75, 4.45);
  fin.rotation.x = -0.15;
  const rudder = new T.Group();
  rudder.position.set(0, 1.7, 5.1);
  root.add(rudder);
  addMesh(rudder, new T.BoxGeometry(0.16, 1.9, 0.6), teal, 0, 0, 0.3);
  beam(root, [0, -0.5, 4.5], [0, -1.35, 5.1], 0.12, dark);
  const tailWheel = addMesh(root, new T.CylinderGeometry(0.35, 0.35, 0.3, 12), rubber, 0, -1.35, 5.1);
  tailWheel.rotation.z = Math.PI / 2;
  addMesh(root, new T.BoxGeometry(2.05, 1.25, 2.65), glass, 0, 1.05, -1.35);
  for (const x of [-1.05, 1.05]) {
    beam(root, [x, 0.45, -2.7], [x, 1.7, -2.5], 0.08, dark);
    beam(root, [x, 0.45, -0.05], [x, 1.7, -0.2], 0.08, dark);
    beam(root, [x, 1.7, -2.5], [x, 1.7, -0.2], 0.08, dark);
  }
  beam(root, [-1.05, 1.7, -2.5], [1.05, 1.7, -2.5], 0.08, dark);
  addMesh(root, new T.BoxGeometry(0.7, 0.9, 0.55), dark, -0.42, 0.55, -0.55);
  addMesh(root, new T.SphereGeometry(0.3, 10, 8), dark, -0.42, 1.2, -0.65);
  const cockpitCanvas = makeCanvas();
  cockpitCanvas.width = 1024;
  cockpitCanvas.height = 512;
  const context = cockpitCanvas.getContext('2d');
  function drawDashboard(state, systems) {
  context.fillStyle = '#0e1e24';
  context.fillRect(0, 0, 1024, 512);
  context.fillStyle = '#253a3e';
  context.fillRect(12, 12, 1000, 440);
  context.fillStyle = '#101d21';
  context.fillRect(20, 20, 984, 424);
  function dial(x, y, label, needle, attitude = false) {
    context.beginPath(); context.arc(x, y, 91, 0, Math.PI * 2);
    context.fillStyle = '#516768'; context.fill();
    context.beginPath(); context.arc(x, y, 82, 0, Math.PI * 2);
    context.fillStyle = '#07171c'; context.fill();
    if (attitude) {
      context.save(); context.beginPath(); context.arc(x, y, 76, 0, Math.PI * 2); context.clip();
      context.translate(x, y); context.rotate(-(state.roll || 0));
      const horizon = Math.max(-55, Math.min(55, (state.pitch || 0) * 120));
      context.fillStyle = '#207d9b'; context.fillRect(-120, -140 + horizon, 240, 140);
      context.fillStyle = '#a65f37'; context.fillRect(-120, horizon, 240, 140);
      context.strokeStyle = '#eafbe4'; context.lineWidth = 4;
      context.beginPath(); context.moveTo(-80, horizon); context.lineTo(80, horizon); context.stroke(); context.restore();
    }
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      context.strokeStyle = i % 3 === 0 ? '#baffdd' : '#6dc9be'; context.lineWidth = i % 3 === 0 ? 5 : 3;
      context.beginPath(); context.moveTo(x + Math.sin(angle) * 64, y - Math.cos(angle) * 64);
      context.lineTo(x + Math.sin(angle) * 75, y - Math.cos(angle) * 75); context.stroke();
    }
    context.strokeStyle = '#ffb957'; context.lineWidth = 5;
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.sin(needle) * 57, y - Math.cos(needle) * 57); context.stroke();
    context.beginPath(); context.arc(x, y, 7, 0, Math.PI * 2); context.fillStyle = '#f9e5a8'; context.fill();
    context.fillStyle = 'rgba(255,255,255,0.20)'; context.beginPath();
    context.moveTo(x - 54, y - 53); context.bezierCurveTo(x - 18, y - 82, x + 29, y - 79, x + 52, y - 48);
    context.lineTo(x + 35, y - 48); context.bezierCurveTo(x + 4, y - 65, x - 27, y - 64, x - 54, y - 40); context.fill();
    context.fillStyle = '#d5eee4'; context.font = 'bold 18px sans-serif'; context.textAlign = 'center'; context.fillText(label, x, y + 46);
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  dial(125, 120, 'AIRSPEED', -2.35 + clamp(state.speed * 1.944 / 160, 0, 1) * 4.7);
  dial(320, 120, 'ATTITUDE', 0, true);
  dial(515, 120, 'ALTITUDE', (state.y || 0) / 1000 * Math.PI * 2);
  dial(125, 322, 'HEADING', state.heading || 0);
  dial(320, 322, 'VERT SPEED', clamp(state.vertical || 0, -10, 10) * 0.22);
  dial(515, 322, 'FUEL / ENG', -2.35 + clamp(systems.fuel / 100, 0, 1) * 4.7);
  context.fillStyle = '#e9f6d1'; context.font = 'bold 21px sans-serif'; context.textAlign = 'center';
  for (const [x, y, value] of [[125, 120, `${Math.round(state.speed * 1.944)} KT`], [515, 120, `${Math.round(state.y || 0)} M`], [125, 322, `${String(Math.round(((state.heading || 0) * 180 / Math.PI % 360 + 360) % 360)).padStart(3, '0')}°`], [320, 322, `${(state.vertical || 0).toFixed(1)} M/S`], [515, 322, `${Math.round(systems.fuel)}%`]]) context.fillText(value, x, y + 24);
  context.fillStyle = '#527271'; context.fillRect(628, 35, 365, 364);
  context.fillStyle = '#071b20'; context.fillRect(640, 47, 341, 340);
  context.fillStyle = '#122e29'; context.beginPath(); context.moveTo(650, 345); context.lineTo(700, 270); context.lineTo(745, 308); context.lineTo(805, 205); context.lineTo(855, 275); context.lineTo(905, 225); context.lineTo(970, 300); context.lineTo(970, 378); context.lineTo(650, 378); context.fill();
  context.strokeStyle = '#5cf7bd'; context.lineWidth = 5; context.beginPath(); context.moveTo(805, 365); context.lineTo(805, 160); context.lineTo(845, 95); context.stroke();
  context.fillStyle = '#e9f6d1'; context.font = 'bold 26px sans-serif'; context.fillText('36', 805, 151);
  context.fillStyle = '#83eace'; context.font = 'bold 20px sans-serif'; context.fillText('APPROACH', 815, 78);
  context.fillText(`THR ${Math.round((state.throttle || 0) * 100)}%  FLAPS ${state.flaps || 0}°`, 815, 355);
  for (const [x, active, color] of [[665, systems.damage > 0, '#ff693b'], [704, systems.fuel < 25, '#f7bb49'], [743, state.stall, '#ff693b']]) {
    context.fillStyle = active ? color : '#273638'; context.beginPath(); context.arc(x, 425, 12, 0, Math.PI * 2); context.fill();
  }
  for (const x of [810, 910]) {
    context.fillStyle = '#050c0e'; context.fillRect(x - 12, 418, 24, 80);
    context.fillStyle = '#80928a'; context.fillRect(x - 4, 420, 8, 51);
    context.fillStyle = '#f09747'; context.fillRect(x - 20, 418, 40, 20);
  }
  }
  const dashboardTexture = new T.CanvasTexture(cockpitCanvas);
  let dashboardKey = '';
  dashboardTexture.colorSpace = T.SRGBColorSpace;
  const dashboard = addMesh(root, new T.PlaneGeometry(1.8, 0.7), new T.MeshBasicMaterial({ map: dashboardTexture, side: T.DoubleSide, toneMapped: false }), 0, 0.7, -2.35);
  dashboard.rotation.x = -0.15;
  const prop = new T.Group();
  prop.position.set(0, 0, -6.55);
  root.add(prop);
  addMesh(prop, new T.BoxGeometry(0.25, 5.3, 0.15), dark, 0, 0, 0);
  addMesh(prop, new T.SphereGeometry(0.4, 12, 8), orange, 0, 0, -0.1);
  const blur = addMesh(root, new T.CircleGeometry(2.65, 32), new T.MeshBasicMaterial({ color: 0xe4e7db, transparent: true, opacity: 0.12, side: T.DoubleSide, depthWrite: false }), 0, 0, -6.54);
  const lamp = addMesh(root, new T.CircleGeometry(0.3, 16), new T.MeshBasicMaterial({ color: 0xffedb3, transparent: true, opacity: 0.6, side: T.DoubleSide }), -2.2, 1.55, -2.38);
  lamp.rotation.y = Math.PI;
  root.scale.setScalar(1.5);
  let flapDegrees = 0;
  function setFlaps(deg) {
    flapDegrees = [0, 15, 30].reduce((best, value) => Math.abs(value - deg) < Math.abs(best - deg) ? value : best, 0);
  }
  function update(dt, flight = 0, systems = { fuel: 100, damage: 0 }) {
    const state = typeof flight === 'number' ? { throttle: flight } : (flight || {});
    prop.rotation.z += dt * (25 + (state.throttle || 0) * 70);
    blur.material.opacity = 0.08 + (state.throttle || 0) * 0.1;
    if (state.flaps !== undefined) setFlaps(state.flaps);
    for (const surface of surfaces) {
      surface.hinge.rotation.x = surface.kind === 'flap' ? flapDegrees * Math.PI / 180 : (state.roll || 0) * surface.side * 0.45;
    }
    elevator.rotation.x = (state.pitch || 0) * 0.6;
    rudder.rotation.y = (state.roll || 0) * 0.2;
    const key = [state.speed, state.y, state.heading, state.vertical, state.pitch, state.roll, systems.fuel, systems.damage, state.stall, state.throttle, state.flaps].map(v => typeof v === 'number' ? Math.round(v * 100) / 100 : v).join('|');
    if (key !== dashboardKey) {
      drawDashboard(state, systems);
      dashboardTexture.needsUpdate = true;
      dashboardKey = key;
    }
  }
  function getCockpitTransform() {
    root.updateMatrixWorld(true);
    // Eye sits low and back in the canopy: clear of the wing underside above
    // (local y 1.38) and of the dashboard ahead (local z -2.35), so the panel
    // stays in frame and the nose sits low enough to show the runway.
    const eye = root.localToWorld(new T.Vector3(0.42, 1.05, -0.5));
    const quaternion = new T.Quaternion();
    root.getWorldQuaternion(quaternion);
    return { eye, quaternion };
  }
  return { root, update, setFlaps, getCockpitTransform, cockpitCanvas };
}
