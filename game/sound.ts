let ctx: AudioContext | null = null;
let enabled = true;
let musicEL: HTMLAudioElement | null = null;
let droneOsc1: OscillatorNode | null = null;
let droneOsc2: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let droneLfo: OscillatorNode | null = null;

export function startMusic() {
  if (typeof window === "undefined") return;
  if (!musicEL) {
    musicEL = new Audio("/bg.mp3");
    musicEL.loop = true;
    musicEL.volume = 0.03;
  }
  if (enabled) musicEL.play().catch(() => {});
}

export function stopMusic() {
  musicEL?.pause();
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (droneGain && ctx) {
    droneGain.gain.setValueAtTime(value ? 0.05 : 0, ctx.currentTime);
  }
  if (!value) musicEL?.pause();
  else musicEL?.play().catch(() => {});
}

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function noiseBurst(
  ac: AudioContext,
  now: number,
  duration: number,
  volume: number,
  lowpassHz: number,
) {
  const bufferSize = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpassHz;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter).connect(gain).connect(ac.destination);
  source.start(now);
}

function thud(
  ac: AudioContext,
  now: number,
  startFreq: number,
  endFreq: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playKnock() {
  const ac = getCtx();
  if (!ac) return;
  thud(ac, ac.currentTime, 200, 90, 0.14, 0.22, "triangle");
}

export function playStrain() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  thud(ac, now, 150, 60, 0.18, 0.3, "sawtooth");
  noiseBurst(ac, now, 0.12, 0.2, 700);
}

export function playBang() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  thud(ac, now, 130, 35, 0.32, 0.55, "sine");
  noiseBurst(ac, now, 0.2, 0.45, 900);
  noiseBurst(ac, now + 0.06, 0.12, 0.25, 1400);
}

export function playHitImpact() {
  const ac = getCtx();
  if (!ac) return;
  thud(ac, ac.currentTime, 320, 90, 0.09, 0.28, "square");
}

export function playMiss() {
  const ac = getCtx();
  if (!ac) return;
  thud(ac, ac.currentTime, 90, 50, 0.12, 0.12, "sine");
}

export function playJumpscareSting() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  thud(ac, now, 900, 60, 0.6, 0.5, "sawtooth");
  thud(ac, now, 940, 55, 0.6, 0.4, "square");
  noiseBurst(ac, now, 0.45, 0.5, 2200);
  noiseBurst(ac, now + 0.05, 0.3, 0.35, 500);
}

export function startDrone(boss = false) {
  const ac = getCtx();
  if (!ac || droneGain) return;

  droneGain = ac.createGain();
  droneGain.gain.setValueAtTime(0, ac.currentTime);
  droneGain.gain.linearRampToValueAtTime(
    boss ? 0.08 : 0.05,
    ac.currentTime + 2,
  );

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = boss ? 160 : 220;

  droneOsc1 = ac.createOscillator();
  droneOsc1.type = "sawtooth";
  droneOsc1.frequency.value = boss ? 38 : 55;
  droneOsc2 = ac.createOscillator();
  droneOsc2.type = "sawtooth";
  droneOsc2.frequency.value = boss ? 40 : 58;

  droneLfo = ac.createOscillator();
  droneLfo.frequency.value = boss ? 0.12 : 0.07;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = boss ? 90 : 60;
  droneLfo.connect(lfoGain).connect(filter.frequency);

  droneOsc1.connect(filter);
  droneOsc2.connect(filter);
  filter.connect(droneGain).connect(ac.destination);

  droneOsc1.start();
  droneOsc2.start();
  droneLfo.start();
}

export function stopDrone() {
  const ac = ctx;
  if (droneGain && ac)
    droneGain.gain.linearRampToValueAtTime(0, ac.currentTime + 1);
  const osc1 = droneOsc1,
    osc2 = droneOsc2,
    lfo = droneLfo;
  droneOsc1 = droneOsc2 = droneLfo = droneGain = null;
  setTimeout(() => {
    osc1?.stop();
    osc2?.stop();
    lfo?.stop();
  }, 1100);
}

export function playCreak() {
  const ac = getCtx();
  if (!ac) return;
  thud(ac, ac.currentTime, 240, 180, 0.5, 0.06, "sawtooth");
}

export function playDistantThud() {
  const ac = getCtx();
  if (!ac) return;
  noiseBurst(ac, ac.currentTime, 0.35, 0.05, 350);
}

export function playFaintWhisper() {
  const ac = getCtx();
  if (!ac) return;
  noiseBurst(ac, ac.currentTime, 0.6, 0.04, 1800);
}

export function playFootstep(pan: number, intensity: number) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const panner = ac.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  panner.connect(ac.destination);

  const freq = 90 - intensity * 20;
  const vol = 0.05 + intensity * 0.12;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(1, freq * 0.6),
    now + 0.18,
  );
  const oscGain = ac.createGain();
  oscGain.gain.setValueAtTime(vol, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(oscGain).connect(panner);
  osc.start(now);
  osc.stop(now + 0.2);

  const bufferSize = Math.floor(ac.sampleRate * 0.06);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(vol * 0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  noise.connect(filter).connect(noiseGain).connect(panner);
  noise.start(now);
}

export function playLightsOut() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  thud(ac, now, 400, 40, 0.4, 0.25, "sawtooth");
  noiseBurst(ac, now, 0.15, 0.2, 2000);
}
