// The persistent audio graph starts after a pilot gesture.
export class FlightAudio {
  start() {
    if (this.context) {
      this.context.resume();
      return;
    }
    const c = this.context = new AudioContext();
    this.engine = c.createOscillator();
    this.engine.type = 'sawtooth';
    this.gain = c.createGain();
    this.gain.gain.value = 0.025;
    const filter = c.createBiquadFilter();
    filter.frequency.value = 350;
    this.engine.connect(filter).connect(this.gain).connect(c.destination);
    this.engine.start();
    this.pulse = c.createOscillator();
    this.pulse.frequency.value = 18;
    this.pulseGain = c.createGain();
    this.pulseGain.gain.value = 0.006;
    this.pulse.connect(this.pulseGain).connect(this.gain.gain);
    this.pulse.start();
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.random() * 2 - 1;
    }
    this.wind = c.createBufferSource();
    this.wind.buffer = buffer;
    this.wind.loop = true;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    this.windFilter = c.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 900;
    this.wind.connect(this.windFilter).connect(this.windGain).connect(c.destination);
    this.wind.start();
    this.nextWarning = 0;
  }

  update(throttle, speed, fuel = 100, damage = 0) {
    if (!this.context) {
      return;
    }
    const t = this.context.currentTime;
    this.engine.frequency.setTargetAtTime(36 + throttle * 65, t, 0.2);
    this.gain.gain.setTargetAtTime(0.012 + throttle * 0.026, t, 0.2);
    this.pulse.frequency.setTargetAtTime(12 + throttle * 14, t, 0.2);
    if (Number.isFinite(speed)) {
      this.windGain.gain.setTargetAtTime(Math.min(0.065, speed / 78 * 0.065), t, 0.3);
      this.windFilter.frequency.setTargetAtTime(400 + speed * 18, t, 0.3);
    }
    if ((fuel < 25 || damage > 0) && t >= this.nextWarning) {
      this.tone('warning');
      this.nextWarning = t + 4;
    }
  }

  tone(kind) {
    if (!this.context) {
      return;
    }
    const c = this.context;
    const notes = kind === 'success' ? [523, 659, 784] : kind === 'ring' ? [880, 1320] : kind === 'touchdown' ? [65] : kind === 'drop' ? [420, 280] : kind === 'flaps' ? [240] : [740];
    const duration = kind === 'touchdown' ? 0.18 : kind === 'warning' ? 0.12 : 0.35;
    for (const [i, note] of notes.entries()) {
      const oscillator = c.createOscillator();
      const gain = c.createGain();
      const t = c.currentTime + i * 0.09;
      oscillator.frequency.setValueAtTime(note, t);
      if (kind === 'touchdown') {
        oscillator.frequency.exponentialRampToValueAtTime(28, t + duration);
      }
      gain.gain.setValueAtTime(kind === 'touchdown' ? 0.15 : 0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      oscillator.connect(gain).connect(c.destination);
      oscillator.onended = function disconnectTone() {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(t);
      oscillator.stop(t + duration + 0.02);
    }
  }
}
