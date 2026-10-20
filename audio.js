// Fully procedural Web Audio soundscape (no samples, no copyrighted music)
export class Audio {
  constructor() { this.ctx = null; this.on = true; }
  start() {
    if (this.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC(); ctx.resume();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); this.master.connect(comp).connect(ctx.destination);
    // reverb
    this.verb = ctx.createConvolver(); const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.25; this.verb.connect(vg).connect(this.master);
    // noise buffer
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noiseBuf = nb;
    // music bus (stage near entry/avenue) - positional
    this.stage = this.panner(0, 4, 30, 40); this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.9; this.musicGain.connect(this.stage);
    // crowd murmur (non-positional bed + positional at avenue)
    this.crowd = this.noiseLoop(400, 0.9, 0.18, this.master);
    this.crowdPos = this.noiseLoop(700, 1.2, 0.5, this.panner(0, 2, 10, 15));
    this.rideP = this.panner(42, 6, -12, 10); this.wheelP = this.panner(-55, 10, -25, 12); this.stallP = this.panner(-20, 2, 10, 8);
    this.fireNode = null;
    this.beat = 0; this.nextT = ctx.currentTime + 0.1; this.bpm = 112; this.nextVendor = 4; this.nextCheer = 8;
  }
  toggle() { this.on = !this.on; if (this.master) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.1); return this.on; }
  panner(x, y, z, ref = 10) { const p = this.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1; p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; p.connect(this.master); p.connect(this.verb); return p; }
  noiseLoop(freq, q, gain, dest) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; const g = this.ctx.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(dest); s.start(); return { g, f }; }
  noiseHit(t, dest, { type = 'bandpass', freq = 1000, q = 1, gain = 0.5, dur = 0.1, attack = 0.002 } = {}) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  tone(t, dest, freq, dur, gain, type = 'sine', f2 = null) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.7);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  dhol(t, low) { const d = this.musicGain; if (low) { this.tone(t, d, 95, 0.35, 0.9, 'sine', 50); this.noiseHit(t, d, { type: 'lowpass', freq: 300, gain: 0.4, dur: 0.08 }); } else { this.tone(t, d, 330, 0.12, 0.3, 'triangle', 260); this.noiseHit(t, d, { freq: 2500, q: 2, gain: 0.4, dur: 0.07 }); } }
  taasha(t, g = 0.35) { this.noiseHit(t, this.musicGain, { type: 'highpass', freq: 3500, gain: g, dur: 0.06 }); this.tone(t, this.musicGain, 820, 0.05, 0.08, 'square'); }
  // simple shehnai-like lead: sawtooth -> bandpass with vibrato
  lead(t, freq, dur) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(freq * 0.97, t); o.frequency.linearRampToValueAtTime(freq, t + 0.06);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.5; vg.gain.value = freq * 0.012; vib.connect(vg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq * 2.2; f.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.04); g.gain.setValueAtTime(0.11, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f).connect(g).connect(this.musicGain); o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  }
  scheduleMusic() {
    const ctx = this.ctx, step = 60 / this.bpm / 2; // 8th notes
    // Bhairavi-ish / festive scale degrees (Sa Re Ga Ma Pa Dha Ni) in D
    const sa = 293.66, sc = [0, 2, 4, 5, 7, 9, 11, 12, 14];
    const melody = [4, 4, 5, 4, 2, 1, 2, -1, 0, 1, 2, 4, 5, 4, 2, -1, 7, 7, 6, 5, 4, 5, 4, -1, 2, 4, 2, 1, 0, -1, 0, -1];
    while (this.nextT < ctx.currentTime + 0.2) {
      const b = this.beat % 16, t = this.nextT;
      // dhol pattern: bhangra-ish "dha - ge dha / na"
      if ([0, 3, 6, 8, 11, 14].includes(b)) this.dhol(t, b === 0 || b === 6 || b === 8 || b === 14);
      if ([2, 5, 10, 13].includes(b)) this.dhol(t, false);
      this.taasha(t, b % 2 ? 0.18 : 0.32); if (b % 4 === 3) this.taasha(t + step / 2, 0.2);
      const m = melody[this.beat % melody.length];
      if (m >= 0 && this.beat % 2 === 0) this.lead(t, sa * Math.pow(2, sc[m] / 12), step * 1.9);
      if (b === 0) this.tone(t, this.musicGain, sa / 2, step * 16, 0.05, 'sawtooth'); // drone
      this.beat++; this.nextT += step;
    }
  }
  at(p) { return this.panner(p.x, p.y, p.z, 30); }
  boom(p, big) { if (!this.ctx) return; const t = this.ctx.currentTime + Math.min(0.6, this.dist(p) / 340); const d = this.at(p); this.tone(t, d, big ? 70 : 90, big ? 1.6 : 1.1, big ? 1.4 : 0.9, 'sine', 30); this.noiseHit(t, d, { type: 'lowpass', freq: 900, gain: big ? 1.2 : 0.8, dur: big ? 1.8 : 1.2 }); }
  crackle(p) { if (!this.ctx) return; const d = this.at(p), t0 = this.ctx.currentTime; for (let i = 0; i < 40; i++) this.noiseHit(t0 + Math.random() * 1.2, d, { type: 'highpass', freq: 2000 + Math.random() * 3000, gain: 0.25, dur: 0.03 }); }
  pop(p) { if (!this.ctx) return; this.noiseHit(this.ctx.currentTime, this.at(p), { type: 'highpass', freq: 1500, gain: 0.4, dur: 0.05 }); }
  whistle(p) { if (!this.ctx) return; this.tone(this.ctx.currentTime, this.at(p), 1800, 1.4, 0.04, 'sine', 3200); }
  cheer(p, amt = 1) { if (!this.ctx) return; const t = this.ctx.currentTime, d = this.at(p); const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.7; const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6 * amt, t + 0.6); g.gain.linearRampToValueAtTime(0, t + 4); s.connect(f).connect(g).connect(d); s.start(t); s.stop(t + 4.2);
    for (let i = 0; i < 6; i++) this.tone(t + Math.random() * 2, d, 700 + Math.random() * 500, 0.6, 0.05 * amt, 'triangle', 1100 + Math.random() * 400); }
  fireRoar(on) { if (!this.ctx) return; if (on && !this.fireNode) { this.fireNode = this.noiseLoop(250, 0.5, 0, this.panner(0, 15, -110, 25)); this.fireNode.g.gain.setTargetAtTime(1.2, this.ctx.currentTime, 1); } else if (!on && this.fireNode) { this.fireNode.g.gain.setTargetAtTime(0, this.ctx.currentTime, 1); this.fireNode = null; } }
  dist(p) { return this.cam ? this.cam.position.distanceTo(p) : 50; }
  update(cam, time, s) {
    if (!this.ctx) return; this.cam = cam; const L = this.ctx.listener, t = this.ctx.currentTime;
    const f = { x: 0, y: 0, z: -1 }, e = cam.matrixWorld.elements; const fx = -e[8], fy = -e[9], fz = -e[10];
    if (L.positionX) { L.positionX.setTargetAtTime(cam.position.x, t, 0.05); L.positionY.setTargetAtTime(cam.position.y, t, 0.05); L.positionZ.setTargetAtTime(cam.position.z, t, 0.05); L.forwardX.setTargetAtTime(fx, t, 0.05); L.forwardY.setTargetAtTime(fy, t, 0.05); L.forwardZ.setTargetAtTime(fz, t, 0.05); L.upX.value = e[4]; L.upY.value = e[5]; L.upZ.value = e[6]; }
    else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(fx, fy, fz, e[4], e[5], e[6]); }
    this.scheduleMusic();
    // ride creak at ends of swing + kids squeal
    const sgn = Math.sign(s.ship); if (sgn !== this.lastSgn) { this.lastSgn = sgn; this.tone(t, this.rideP, 140, 0.6, 0.15, 'sawtooth', 110); if (Math.random() < 0.7) for (let i = 0; i < 3; i++) this.tone(t + 0.3 + i * 0.1, this.rideP, 900 + Math.random() * 400, 0.5, 0.06, 'triangle', 1400); }
    if (time > this.nextVendor) { this.nextVendor = time + 3 + Math.random() * 5; // "vendor calls": formant-ish sing-song blips
      const b = 180 + Math.random() * 60; [1, 1.25, 1.12, 0.9].forEach((m, i) => { this.lead(t + i * 0.18, b * m * 2, 0.16); }); }
    if (time > this.nextCheer) { this.nextCheer = time + 10 + Math.random() * 12; this.cheer({ x: 48, y: 5, z: 34 }, 0.5); }
  }
}
