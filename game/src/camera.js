import * as T from '../vendor/three.module.min.js';
import { groundHeight } from './terrain.js';

export function createCameraController(camera, aircraft) {
  let mode = 'chase';
  let yaw = 0;
  let pitch = 0;
  let initialized = false;

  function setMode(next) {
    if (next !== 'chase' && next !== 'cockpit') return;
    mode = next;
    if (typeof document !== 'undefined') document.body.classList.toggle('cockpit-view', mode === 'cockpit');
    yaw = 0;
    pitch = 0;
    initialized = false;
  }

  function getMode() {
    return mode;
  }

  function update(dt, flight, look = {}) {
    yaw = T.MathUtils.clamp(yaw - (look.mouseDX || 0) * 0.003, -0.65, 0.65);
    pitch = T.MathUtils.clamp(pitch - (look.mouseDY || 0) * 0.003, -0.3, 0.3);
    const near = mode === 'cockpit' ? 0.1 : 1;
    if (camera.near !== near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    if (mode === 'cockpit') {
      const transform = aircraft.getCockpitTransform();
      camera.position.copy(transform.eye);
      camera.quaternion.copy(transform.quaternion);
      camera.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(pitch - 0.10, yaw, 0, 'YXZ')));
    } else {
      const angle = flight.heading + yaw;
      const back = flight.coverCamera ? 28.5 : 23;
      const side = flight.coverCamera ? 14 : 12;
      const target = new T.Vector3(flight.x - Math.sin(angle) * back - Math.cos(angle) * side, flight.y + 7 + pitch * 20, flight.z + Math.cos(angle) * back - Math.sin(angle) * side);
      target.y = Math.max(target.y, groundHeight(target.x, target.z) + 2);
      if (!initialized || look.snap) camera.position.copy(target);
      else camera.position.lerp(target, 1 - Math.exp(-Math.max(dt, 0) * 4));
      camera.lookAt(flight.x + Math.sin(flight.heading) * 4, flight.y + 1, flight.z - Math.cos(flight.heading) * 4);
    }
    camera.position.y = Math.max(camera.position.y, groundHeight(camera.position.x, camera.position.z) + 2);
    initialized = true;
  }
  return { update, setMode, getMode };
}
