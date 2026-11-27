import * as T from '../vendor/three.module.min.js';
import { seededRandom } from './random.js';

export function riverX(z) {
  return Math.sin(z / 1100) * 170 + Math.sin(z / 440) * 45;
}

export function groundHeight(x, z) {
  const distanceFromRiver = Math.abs(x - riverX(z));
  const ridge = Math.max(0, distanceFromRiver - 220);
  const detail = Math.sin(x * 0.011 + z * 0.007) * 5
    + Math.sin(x * 0.023 - z * 0.015) * 2.5
    + Math.sin(x * 0.047 + z * 0.031) * 1.1;
  const natural = 6 + ridge * 0.32
    + (Math.sin(x * 0.003 + z * 0.002) * 0.5 + 0.5) * ridge * 0.4
    + Math.sin(z * 0.008) * Math.min(ridge * 0.04, 25)
    + detail * Math.min(1, ridge / 150);
  const distance = Math.hypot(
    Math.max(0, Math.abs(x - 310) - 53),
    Math.max(0, -2100 - z, z + 900)
  );
  const t = Math.min(1, distance / 150);
  const blend = t * t * (3 - 2 * t);
  const original = 24 + (natural - 24) * blend;
  // A shallow valley under the approach, with a widening, rounded shoulder.
  // Keep the runway interior intact; ease into the cut at its threshold.
  const smooth = (v) => { const s = Math.max(0, Math.min(1, v)); return s * s * (3 - 2 * s); };
  const along = smooth((z + 990) / 40) * (1 - smooth((z + 250) / 200));
  const shoulder = 180 + 80 * smooth((z + 950) / 700);
  const across = 1 - smooth((Math.abs(x - 310) - 60) / shoulder);
  const floor = 17.5 - 3.5 * smooth((z + 950) / 150);
  // A smooth positive part avoids a crease where the cut meets lower terrain.
  const excess = original - floor;
  const cut = excess <= 0 ? 0 : excess < 2 ? excess * excess * (1 - excess / 4) : excess - 1;
  return original - cut * along * across;
}

function isRunwayExclusion(x, z) {
  return Math.abs(x - 310) < 90 && z > -2200 && z < -800;
}

function isTreeLocationAllowed(x, z, y) {
  return y >= 15 && y <= 950
    && !isRunwayExclusion(x, z)
    && !(Math.abs(x - 310) < 60 && z > -950 && z < -300)
    && Math.hypot(x - 120, z + 1000) >= 120;
}

function buildGround(scene) {
  const geometry = new T.PlaneGeometry(14000, 14000, 256, 256);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const valley = new T.Color(0x385b55), grass = new T.Color(0x52645f);
  const rock = new T.Color(0x746e7b), snow = new T.Color(0xd9d4df), sand = new T.Color(0x8b806a);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const y = groundHeight(x, z);
    positions.setY(i, y);
  }
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  const smooth = (a, b, v) => { const t = T.MathUtils.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const detail = Math.sin(x * 0.018 + z * 0.013) * 0.55 + Math.sin(x * 0.041 - z * 0.027) * 0.3 + Math.sin(x * 0.006 - z * 0.009) * 0.15;
    const slope = 1 - normals.getY(i);
    const snowline = 1030 + Math.sin(x * 0.004 + z * 0.003) * 100;
    const color = valley.clone().lerp(grass, smooth(120, 260, y));
    color.lerp(rock, Math.max(smooth(470, 620, y), smooth(0.12, 0.38, slope) * 0.65));
    color.lerp(snow, smooth(snowline - 65, snowline + 65, y) * (1 - smooth(0.28, 0.55, slope) * 0.5));
    color.lerp(sand, (1 - smooth(12, 47, y + detail * 13)) * 0.72);
    color.multiplyScalar(0.94 + detail * 0.09);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const variation = Math.sin(x * Math.PI / 8) * Math.sin(y * Math.PI / 16) + Math.cos((x + y) * Math.PI / 16);
    const shade = 239 + Math.round(variation * 5);
    const offset = (y * 64 + x) * 4;
    pixels.set([shade, shade, shade, 255], offset);
  }
  const texture = new T.DataTexture(pixels, 64, 64, T.RGBAFormat);
  texture.needsUpdate = true;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearFilter;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(28, 28);
  texture.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshStandardMaterial({ vertexColors: true, map: texture, roughness: 1 });
  const ground = new T.Mesh(geometry, material);
  ground.receiveShadow = true;
  scene.add(ground);
}

function buildWater(scene) {
  const material = new T.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 worldPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        worldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 worldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - worldPosition);
        float fresnel = pow(1.0 - abs(viewDirection.y), 2.0);
        float ripple = sin(worldPosition.x * 0.025 + time * 0.7) * sin(worldPosition.z * 0.018 - time * 0.45);
        float glint = pow(max(0.0, 1.0 - abs(viewDirection.x + 0.45 + ripple * 0.025) * 2.0), 6.0);
        vec3 color = vec3(0.025, 0.22, 0.25) + fresnel * vec3(0.04, 0.19, 0.16);
        color += fresnel * vec3(0.20, 0.09, 0.07) + glint * vec3(0.48, 0.25, 0.13);
        color += fresnel * (0.5 + 0.5 * sin(worldPosition.z * 0.0015 + ripple * 0.4)) * vec3(0.025, 0.10, 0.055);
        color += ripple * vec3(0.008, 0.025, 0.023);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  const water = new T.Mesh(new T.PlaneGeometry(14000, 14000), material);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 9;
  water.onBeforeRender = () => {
    material.uniforms.time.value = performance.now() * 0.001;
  };
  scene.add(water);
  const lake = new T.Mesh(new T.CircleGeometry(310, 64), material);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, 11, 1000);
  scene.add(lake);
}

function buildTrees(scene, seed) {
  const random = seededRandom(seed);
  const count = 1400;
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(1.4, 2, 13, 5), new T.MeshStandardMaterial({ color: 0x544a51 }), count);
  const crowns = new T.InstancedMesh(new T.ConeGeometry(13, 34, 6), new T.MeshStandardMaterial({ color: 0x1b4545, roughness: 1 }), count * 2);
  const dummy = new T.Object3D();
  const trees = [];
  let clusterX = 0;
  let clusterZ = 0;
  for (let i = 0; i < count; i++) {
    let x;
    let z;
    let y;
    let attempts = 0;
    do {
      if (i % 12 === 0 || attempts % 20 === 0) {
        clusterX = (random() - 0.5) * 6200;
        clusterZ = (random() - 0.5) * 11000;
      }
      x = clusterX + (random() - 0.5) * 300;
      z = clusterZ + (random() - 0.5) * 300;
      y = groundHeight(x, z);
      attempts++;
    } while (!isTreeLocationAllowed(x, z, y));
    const scale = (0.7 + random() * 0.8) * 0.55;
    dummy.scale.setScalar(scale);
    dummy.position.set(x, y + 7 * scale, z);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 23 * scale;
    dummy.updateMatrix();
    crowns.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.y = y + 37 * scale;
    dummy.scale.setScalar(scale * 0.72);
    dummy.updateMatrix();
    crowns.setMatrixAt(i * 2 + 1, dummy.matrix);
    trees.push({ x, z, y, height: 54 * scale / 0.55 });
  }
  if (trees.some((tree) => isRunwayExclusion(tree.x, tree.z))) {
    throw new Error('Tree placed in runway exclusion');
  }
  scene.add(trunks, crowns);
  return trees;
}

function buildRunway(scene) {
  const strip = new T.Mesh(new T.BoxGeometry(76, 2, 1100), new T.MeshStandardMaterial({ color: 0x263b48, roughness: 0.85 }));
  strip.position.set(310, 25, -1500);
  strip.receiveShadow = true;
  scene.add(strip);
  for (let z = -2000; z < -950; z += 70) {
    const mark = new T.Mesh(new T.BoxGeometry(3, 0.2, 28), new T.MeshBasicMaterial({ color: 0xf6e3bd }));
    mark.position.set(310, 26.1, z);
    scene.add(mark);
    for (const x of [270, 350]) {
      const light = new T.Mesh(new T.SphereGeometry(0.9, 6, 6), new T.MeshBasicMaterial({ color: 0x8cfff1 }));
      light.position.set(x, 28, z);
      scene.add(light);
    }
  }
}

export function buildTerrain(scene, seed) {
  buildGround(scene);
  buildWater(scene);
  const trees = buildTrees(scene, seed);
  buildRunway(scene);
  return { trees };
}
