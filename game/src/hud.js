import { CONTRACTS } from './config.js';
import { groundHeight } from './terrain.js';
import { getWind } from './flight.js';


function value(id, text) {
  document.querySelector(`#${id}`).textContent = text;
}

function drawLadder(canvas, f) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.translate(115, 65);
  c.strokeStyle = '#a6ffdf';
  c.fillStyle = '#a6ffdf';
  c.lineWidth = 1.5;
  c.rotate(f.roll * 0.5);
  for (let i = -2; i <= 2; i++) {
    const y = i * 20 + f.pitch * 80;
    c.beginPath();
    c.moveTo(-24, y);
    c.lineTo(-8, y);
    c.moveTo(8, y);
    c.lineTo(24, y);
    c.stroke();
  }
  c.restore();
  c.beginPath();
  c.arc(115, 65, 5, 0, Math.PI * 2);
  c.moveTo(103, 65);
  c.lineTo(110, 65);
  c.moveTo(120, 65);
  c.lineTo(127, 65);
  c.stroke();
}

function drawRadar(canvas, world) {
  const c = canvas.getContext('2d');
  const f = world.flight;
  c.clearRect(0, 0, 120, 120);
  c.strokeStyle = '#65bdae';
  c.lineWidth = 1;
  for (const radius of [20, 40, 57]) {
    c.beginPath();
    c.arc(60, 60, radius, 0, Math.PI * 2);
    c.stroke();
  }
  function point(x, z) {
    return [60 + (x - f.x) / 35, 60 + (z - f.z) / 35];
  }
  const runway = point(310, -1500);
  c.fillStyle = '#e4c18c';
  if (Math.hypot(runway[0] - 60, runway[1] - 60) < 52) c.fillRect(runway[0] - 2, runway[1] - 10, 4, 20);
  c.fillStyle = '#ffce83';
  for (const gate of world.route || []) {
    const p = point(gate[0], gate[2]);
    if (Math.hypot(p[0] - 60, p[1] - 60) < 54) c.fillRect(p[0] - 2, p[1] - 2, 4, 4);
  }
  c.fillStyle = '#aaffdf';
  c.beginPath();
  c.arc(60, 60, 3, 0, Math.PI * 2);
  c.fill();
}

let cockpitSystems = { fuel: 100, damage: 0 };
export function getCockpitSystems() { return cockpitSystems; }

export class FlightHUD {
  constructor() {
    this.canvas = document.querySelector('#instruments');
    this.radar = document.querySelector('#radar');
  }

  update(w) {
    const f = w.flight;
    const fuel = f.fuel ?? w.fuel;
    const damage = f.damage ?? w.damage;
    cockpitSystems = { fuel, damage };
    const heading = ((f.heading * 180 / Math.PI) % 360 + 360) % 360;
    value('speed', Math.round(f.speed * 1.944));
    value('altitude', Math.round(Math.max(0, f.y - groundHeight(f.x, f.z))));
    value('vertical', `${f.vertical >= 0 ? '+' : ''}${f.vertical.toFixed(1)}`);
    value('heading', `${String(Math.round(heading) % 360).padStart(3, '0')}°`);
    document.querySelector('#compass-track').style.transform = `translateX(${-heading * 1.8}px)`;
    for (const [id, amount] of [['throttle', f.throttle * 100], ['fuel', fuel], ['damage', damage]]) {
      document.querySelector(`#${id}-bar`).style.width = `${Math.max(0, Math.min(100, amount))}%`;
      value(`${id}-value`, `${Math.round(amount)}%`);
    }
    value('flaps', `${f.flaps ?? 0}°`);
    const wind = getWind(f.x, f.z, f.elapsed);
    value('wind', `${Math.round(wind.dirDeg)}°/${Math.round(wind.speedKt)}KT`);
    for (const [id, active] of [['low-fuel', fuel < 25], ['damage-light', damage > 0], ['stall-light', f.stall]]) {
      document.querySelector(`#${id}`).classList.toggle('active', Boolean(active));
    }
    const fuelLight = document.querySelector('#low-fuel');
    fuelLight.style.fontWeight = fuel < 25 ? 'bold' : '';
    fuelLight.style.color = fuel < 25 ? '#241407' : '';
    fuelLight.style.background = fuel < 25 ? '#ffb850' : '';
    fuelLight.style.textShadow = fuel < 25 ? 'none' : '';
    value('mission-name', CONTRACTS[w.contract].name);
    value('objective', w.contract === 0 ? `GATE ${Math.min(8, w.progress + 1)} / 8 · FOLLOW AMBER` : w.contract === 1 ? 'CYAN BEACON · SPACE TO DROP' : 'RUNWAY 36 · 48–80 KNOTS · SOFT TOUCH');
    value('timer', new Date(w.time * 1000).toISOString().slice(14, 19));
    value('score', String(w.score).padStart(5, '0'));
    const off = w.contract === 0 && w.progress < 8 && Math.hypot(f.x - w.route[w.progress][0], f.z - w.route[w.progress][2]) > 1300;
    value('warning', f.stall ? 'STALL · LOWER NOSE' : fuel < 15 ? 'LOW FUEL · GREEN RING' : off ? 'OFF ROUTE · RETURN TO AMBER GATES' : w.reason);
    const overlay = document.querySelector('#overlay');
    const overlayVisible = !overlay.classList.contains('hidden');
    const resultVisible = overlay.classList.contains('result-overlay');
    // Result strip sits at the bottom of the screen: lift the contract card
    // and the clock clear of it while any overlay is up, and keep the
    // contract detail line visible on result screens (it is only hidden
    // under the full-screen title/pause overlay).
    document.querySelector('.clock').style.bottom = overlayVisible ? '110px' : '';
    document.querySelector('.mission').style.bottom = overlayVisible ? '110px' : '';
    document.querySelector('#warning').style.visibility = overlayVisible ? 'hidden' : 'visible';
    document.querySelector('#objective').style.visibility = overlayVisible && !resultVisible ? 'hidden' : 'visible';
    drawLadder(this.canvas, f);
    drawRadar(this.radar, w);
  }
}
