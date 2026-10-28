// Tiny WebAudio synth so the game ships with zero audio files.
(function (root) {
  'use strict';
  const Snd = {
    ctx: null, on: true, calm: false,
    init() {
      if (this.ctx) return;
      const AC = root.AudioContext || root.webkitAudioContext;
      if (AC) this.ctx = new AC();
    },
    tone(freq, dur, type, vol, slideTo, delay) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const v = (vol || 0.1) * (this.calm ? 0.5 : 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    coin() { this.tone(988, 0.08, 'square', 0.05); this.tone(1319, 0.14, 'square', 0.05, null, 0.06); },
    buy() { this.tone(523, 0.1, 'triangle', 0.1); this.tone(784, 0.16, 'triangle', 0.1, null, 0.08); },
    big() { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, null, i * 0.07)); },
    ghost() { this.tone(300, 0.5, 'sine', 0.08, 600); },
    alert() { this.tone(660, 0.12, 'square', 0.05); this.tone(550, 0.18, 'square', 0.05, null, 0.12); },
    exorcism() { this.tone(220, 1.2, 'sawtooth', 0.06, 880); this.tone(110, 1.4, 'sine', 0.1, 55); },
    ach() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.1, null, i * 0.09)); },
  };
  root.HLSound = Snd;
})(typeof window !== 'undefined' ? window : globalThis);
