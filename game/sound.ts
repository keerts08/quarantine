let enabled = true;
export function setSoundEnabled(v: boolean) {
  enabled = v;
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function thud(
  freq: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(1, freq * 0.5),
    c.currentTime + duration,
  );
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function noiseBurst(duration: number, gain: number, filterFreq: number) {
  const c = getCtx();
  if (!c) return;
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

  noise.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  noise.start();
}

export function playKnock() {
  thud(220, 0.15, 0.2, "square");
}
export function playStrain() {
  noiseBurst(0.2, 0.15, 800);
}
export function playBang() {
  noiseBurst(0.3, 0.35, 300);
  thud(80, 0.3, 0.3, "sawtooth");
}
export function playHitImpact() {
  thud(180, 0.12, 0.25, "square");
}
export function playMiss() {
  thud(110, 0.1, 0.12, "sine");
}
