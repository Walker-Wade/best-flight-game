import * as T from '../vendor/three.module.min.js';
import { seededRandom } from './random.js';

function buildSkyDome(scene) {
  scene.background = new T.Color(0xc98e79);
  const dome = new T.Mesh(new T.SphereGeometry(12000, 48, 24), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 direction;
      void main() { direction = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 direction;
      void main() {
        vec3 d = normalize(direction);
        float h = max(d.y, 0.0);
        vec3 horizon = vec3(0.72, 0.39, 0.32);
        vec3 sky = mix(horizon, vec3(0.16, 0.23, 0.39), smoothstep(0.0, 0.42, h));
        sky = mix(sky, vec3(0.035, 0.065, 0.16), smoothstep(0.28, 0.95, h));
        vec3 sun = normalize(vec3(-0.56, 0.18, -0.83));
        float glow = pow(max(dot(d, sun), 0.0), 10.0);
        sky += vec3(0.36, 0.18, 0.08) * glow * (1.0 - smoothstep(0.3, 0.8, h));
        gl_FragColor = vec4(sky, 1.0);
      }`
  }));
  dome.frustumCulled = false;
  dome.onBeforeRender = (_renderer, _scene, camera) => dome.position.copy(camera.position);
  scene.add(dome);
}

function buildAuroraCurtains(scene) {
  for (let layer = 0; layer < 2; layer++) {
    const geometry = new T.PlaneGeometry(1, 1, 64, 12);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const u = positions.getX(i) + 0.5;
      const v = positions.getY(i) + 0.5;
      const angle = (u - 0.5) * 2.2;
      const radius = 7500 + layer * 350 + Math.sin(u * 13 + layer) * 170 + Math.sin(u * 29) * 60;
      positions.setXYZ(i, Math.sin(angle) * radius, 1250 + v * 2600 + Math.sin(u * 8 + layer) * 180, -Math.cos(angle) * radius);
    }
    const material = new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
      uniforms: { phase: { value: layer * 2.3 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float phase;
        float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          float a = fract(sin(dot(i, vec2(127.1,311.7))) * 43758.5453);
          float b = fract(sin(dot(i+vec2(1.,0.), vec2(127.1,311.7))) * 43758.5453);
          float c = fract(sin(dot(i+vec2(0.,1.), vec2(127.1,311.7))) * 43758.5453);
          float d = fract(sin(dot(i+vec2(1.,1.), vec2(127.1,311.7))) * 43758.5453);
          return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
        void main() {
          float n = noise(vec2(vUv.x*9.0 + phase, vUv.y*3.0)) * 0.7 + noise(vec2(vUv.x*19.0, vUv.y*5.0 + phase)) * 0.3;
          float bottom = smoothstep(0.0, 0.2, vUv.y + (n-0.5)*0.13);
          float top = 1.0-smoothstep(0.6, 1.0, vUv.y + (n-0.5)*0.2);
          vec3 color = mix(vec3(0.12,0.67,0.43), vec3(0.48,0.22,0.52), smoothstep(0.1,0.95,vUv.y));
          gl_FragColor = vec4(color, bottom*top*(0.28 + n*0.38));
        }`
    });
    const curtain = new T.Mesh(geometry, material);
    curtain.frustumCulled = false;
    curtain.onBeforeRender = (_renderer, _scene, camera) => curtain.position.copy(camera.position);
    scene.add(curtain);
  }
}

function buildDuskClouds(scene, seed) {
  const random = seededRandom(seed + 42);
  const material = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float lumps = sin(p.x*7.0 + sin(p.y*4.0))*0.10 + sin(p.x*13.0-p.y*6.0)*0.04;
        float edge = 1.0-smoothstep(0.45, 1.0, length(p) + lumps);
        vec3 color = mix(vec3(0.92,0.52,0.34), vec3(0.43,0.52,0.65), smoothstep(0.15,0.85,vUv.y));
        gl_FragColor = vec4(color, edge * 0.48);
      }`
  });
  const geometry = new T.PlaneGeometry(1, 1);
  for (let i = 0; i < 32; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 1800 + random() * 6500;
    const cloud = new T.Mesh(geometry, material);
    cloud.position.set(Math.cos(angle) * distance, 500 + random() * 1800, Math.sin(angle) * distance);
    cloud.scale.set(1100 + random() * 1700, 300 + random() * 400, 1);
    cloud.onBeforeRender = (_renderer, _scene, camera) => cloud.quaternion.copy(camera.quaternion);
    scene.add(cloud);
  }
}

function buildStars(scene, seed) {
  const random = seededRandom(seed + 90);
  const stars = [];
  for (let i = 0; i < 700; i++) {
    const angle = random() * Math.PI * 2;
    const height = random() * 0.62 + 0.38;
    const radius = 8500;
    stars.push(Math.cos(angle) * radius * Math.sqrt(1 - height * height), height * radius, Math.sin(angle) * radius * Math.sqrt(1 - height * height));
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(stars, 3));
  const points = new T.Points(geometry, new T.PointsMaterial({ color: 0xd6d8e8, size: 6, transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
  points.frustumCulled = false;
  points.onBeforeRender = (_renderer, _scene, camera) => points.position.copy(camera.position);
  scene.add(points);
}

export function createSky(scene, seed) {
  buildSkyDome(scene);
  buildAuroraCurtains(scene);
  buildDuskClouds(scene, seed);
  buildStars(scene, seed);
}
