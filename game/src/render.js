import * as T from '../vendor/three.module.min.js';
import * as flightModule from './flight.js';
import { createSky } from './sky.js';
import { buildLandmarks } from './landmarks.js';
import { createEffects } from './effects.js';
import { createCameraController } from './camera.js';
import { getInputState, resetFrameInput } from './input.js';
import { getCockpitSystems } from './hud.js';

let effectsInstance = null;

export function getEffects() {
  return effectsInstance;
}

export function createRenderer(canvas, seed) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0xc49280, 0.00016);
  const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 1, 20000);
  scene.add(new T.HemisphereLight(0xb5bedf, 0x544d53, 2.4));
  const sun = new T.DirectionalLight(0xffbd85, 3);
  sun.position.set(-2000, 1800, -3000);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -750, right: 750, top: 750, bottom: -750, near: 1, far: 6000 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
  createSky(scene, seed);
  const existing = new Set(scene.children);
  const landmarks = buildLandmarks(scene, seed);
  for (const object of scene.children) {
    if (!existing.has(object)) object.traverse((child) => {
      if (child.isMesh && child.material && !child.material.transparent) child.castShadow = true;
    });
  }
  let aircraftShadowsReady = false;
  effectsInstance = createEffects(scene);
  let controller;
  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });
  function draw(f, aircraft, dt, snap = false) {
    if (!aircraftShadowsReady) {
      aircraft.root.traverse((child) => { if (child.isMesh) child.castShadow = true; });
      aircraftShadowsReady = true;
    }
    sun.target.position.set(f.x, 0, f.z);
    sun.position.set(f.x - 2000, 1800, f.z - 3000);
    if (!controller) controller = createCameraController(camera, aircraft);
    const input = getInputState();
    if (input.pressedC) controller.setMode(controller.getMode() === 'chase' ? 'cockpit' : 'chase');
    if (input.pressedF) {
      const next = (Number(f.flaps || 0) + 15) % 45;
      if (typeof flightModule.setFlaps === 'function') flightModule.setFlaps(f, next);
      else f.flaps = next;
    }
    f.braking = input.keys.includes('KeyB');
    f.throttle = T.MathUtils.clamp(f.throttle - input.wheelDelta * 0.0005, 0, 1);
    aircraft.root.position.set(f.x, f.y, f.z);
    aircraft.root.rotation.set(f.pitch, -f.heading, -f.roll, 'YXZ');
    aircraft.update(dt, f, getCockpitSystems());
    controller.update(dt, f, { ...input, snap });
    // Cockpit-only field of view: a little narrower than the chase camera so
    // the panel reads and the wing ceiling takes less of the frame. Chase
    // stays at the 58-degree field set when the camera was created.
    const cockpitFov = 52;
    const wantFov = controller.getMode() === 'cockpit' ? cockpitFov : 58;
    if (camera.fov !== wantFov) {
      camera.fov = wantFov;
      camera.updateProjectionMatrix();
    }
    document.querySelector('#camera-mode').textContent = `${controller.getMode().toUpperCase()} · C TO SWITCH`;
    landmarks.update(f, dt);
    effectsInstance.update(dt);
    resetFrameInput();
    renderer.render(scene, camera);
  }
  return { scene, camera, renderer, draw };
}
