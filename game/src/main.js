import * as T from '../vendor/three.module.min.js';
import { CONFIG, CONTRACTS } from './config.js';
import { createRenderer, getEffects } from './render.js';
import { buildTerrain } from './terrain.js';
import { createAircraft } from './aircraft.js';
import { CourierWorld } from './world.js';
import { createInput } from './input.js';
import { FlightHUD } from './hud.js';
import { FlightAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7);
const view = createRenderer(document.querySelector('#view'), seed);
const terrain = buildTerrain(view.scene, seed);
const aircraft = createAircraft();
view.scene.add(aircraft.root);
const audio = new FlightAudio();
const world = new CourierWorld(view.scene, terrain, audio);
const hud = new FlightHUD();
const overlay = document.querySelector('#overlay');
const panel = document.querySelector('#panel');
const effectPosition = new T.Vector3();
let screen = 'title';
let accumulator = 0;
let last = 0;
let smokeTimer = 0;
let wingTimer = 0;

function best(i) {
  try {
    return localStorage.getItem('aurora-best-' + i) || '—';
  } catch {
    return '—';
  }
}

function start(i) {
  audio.start();
  world.reset(i);
  screen = 'flying';
  overlay.classList.add('hidden');
  overlay.classList.remove('result-overlay');
}

function title() {
  screen = 'title';
  overlay.classList.remove('hidden', 'result-overlay');
  panel.innerHTML =
    '<div class="kicker">THE NORTHERN AIR SERVICE</div>'
    + '<h1>Aurora Courier</h1>'
    + '<p class="intro">One aircraft. A valley beyond the roads.<br>Carry a little hope beneath the northern lights.</p>'
    + '<div class="contracts">'
    + CONTRACTS.map((c, i) => `<button class="contract" data-contract="${i}"><b>${c.name}</b><span>${c.subtitle}<br>${c.detail}</span><i>BEST ${best(i)} → ACCEPT CONTRACT</i></button>`).join('')
    + '</div>'
    + '<div class="controls">'
    + 'W / S or SHIFT / CTRL — throttle &nbsp; ↑ / ↓ — nose down / up<br>'
    + '← / → — bank & turn &nbsp; SPACE — supply drop &nbsp; P / ESC — pause<br>'
    + 'DRAG — look around &nbsp; WHEEL — throttle &nbsp; C — camera &nbsp; F — flaps &nbsp; B — brake<br>'
    + 'Keep airspeed above 49 knots. Green ring replenishes fuel (+30%).'
    + '</div>';
  panel.querySelectorAll('[data-contract]').forEach((button) => {
    button.onclick = () => start(Number(button.dataset.contract));
  });
}

function result() {
  screen = world.status;
  overlay.classList.remove('hidden');
  overlay.classList.add('result-overlay');
  const grade = world.touchdown ? `${world.touchdown.verdict} ${world.touchdown.score}` : world.status === 'complete' ? 'CONTRACT COMPLETE' : 'FLIGHT TERMINATED';
  const time = new Date(world.time * 1000).toISOString().slice(14, 19);
  panel.innerHTML =
    `<div class="result-title">${grade}</div>`
    + '<div class="result-stats">'
    + `<div>SCORE<strong>${world.score}</strong></div>`
    + `<div>TIME<strong>${time}</strong></div>`
    + `<div>FUEL<strong>${Math.round(world.fuel)}%</strong></div>`
    + `<div>DAMAGE<strong>${Math.round(world.damage)}%</strong></div>`
    + '</div>'
    + '<button class="button" id="again">FLY AGAIN</button>'
    + '<button class="button" id="contracts">CHANGE CONTRACT</button>';
  document.querySelector('#again').onclick = () => start(world.contract);
  document.querySelector('#contracts').onclick = title;
}

function pause() {
  if (screen === 'flying') {
    screen = 'paused';
    overlay.classList.remove('hidden');
    panel.innerHTML = '<div class="kicker">FLIGHT ON HOLD</div><h1>Take a breath.</h1><p class="intro">The valley will wait.</p><button class="button" id="resume">RESUME FLIGHT</button><button class="button" id="contracts">CONTRACTS</button>';
    document.querySelector('#resume').onclick = pause;
    document.querySelector('#contracts').onclick = title;
  } else if (screen === 'paused') {
    screen = 'flying';
    overlay.classList.add('hidden');
  }
}

const input = createInput((code) => {
  if (code === 'KeyP' || code === 'Escape') pause();
  if (code === 'Space' && screen === 'flying') {
    audio.start();
    world.release();
  }
  if (code === 'KeyR') start(world.contract);
});

const shot = params.get('shot');
if (shot) {
  stageShot(shot, world);
  screen = 'shot';
  overlay.classList.add('hidden');
  if (shot === 'cockpit') {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC' }));
  }
  if (shot === 'touchdown') {
    effectPosition.set(world.flight.x, world.flight.y + 1, world.flight.z);
    getEffects().touchdownSmoke(effectPosition);
    getEffects().update(0.4);
    result();
  }
  hud.update(world);
  view.draw(world.flight, aircraft, 0, true);
  window.__shotReady = true;
} else {
  title();
  requestAnimationFrame(frame);
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  accumulator += dt;
  if (screen === 'flying') {
    while (accumulator >= CONFIG.fixedStep) {
      const wasGrounded = world.flight.onGround;
      const previousStatus = world.status;
      world.step(input.read(), CONFIG.fixedStep);
      const f = world.flight;
      effectPosition.set(f.x, f.y, f.z);
      if (!wasGrounded && f.onGround) getEffects().touchdownSmoke(effectPosition);
      if (previousStatus === 'flying' && world.status === 'crashed') getEffects().crashBurst(effectPosition);
      accumulator -= CONFIG.fixedStep;
    }
    const f = world.flight;
    smokeTimer -= dt;
    wingTimer -= dt;
    effectPosition.set(f.x, f.y, f.z);
    if (world.damage > 0 && smokeTimer <= 0) {
      getEffects().damageSmoke(effectPosition);
      smokeTimer = 0.35;
    }
    if (Math.abs(f.roll) > 0.5 && wingTimer <= 0) {
      effectPosition.x += Math.cos(f.heading) * 14;
      getEffects().wingtipSmoke(effectPosition, 'right');
      effectPosition.x -= Math.cos(f.heading) * 28;
      getEffects().wingtipSmoke(effectPosition, 'left');
      wingTimer = 0.2;
    }
    audio.update(f.throttle);
    if (f.stall && Math.floor(world.time * 2) !== Math.floor((world.time - dt) * 2)) audio.tone('warning');
  } else {
    accumulator = 0;
  }
  hud.update(world);
  view.draw(world.flight, aircraft, dt, false);
  if (screen === 'flying' && world.status !== 'flying') result();
  requestAnimationFrame(frame);
}
