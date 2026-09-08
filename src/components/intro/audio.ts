/**
 * Synth-generated SFX for the intro sequence — no audio assets shipped.
 * All sounds are built from oscillators + filtered noise via Web Audio API.
 */

let cachedCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (cachedCtx && cachedCtx.state !== "closed") return cachedCtx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
};

/** Soft UI tick — used as the BEGIN button click cue. */
export const playClick = () => {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
};

/**
 * The dive whoosh — band-passed noise sweeping high→low with a sub-bass thump.
 * Roughly 1.6s long. Loud-ish; tune master gain at the end if needed.
 */
export const playDive = () => {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  // 1) Filtered noise burst — the "whoosh"
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.8, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(180, now);
  bp.frequency.exponentialRampToValueAtTime(5200, now + 0.35);
  bp.frequency.exponentialRampToValueAtTime(120, now + 1.55);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.45, now + 0.06);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

  noise.connect(bp).connect(noiseGain).connect(master);
  noise.start(now);
  noise.stop(now + 1.7);

  // 2) Sub-bass impact — sells the dive feeling
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(140, now);
  sub.frequency.exponentialRampToValueAtTime(38, now + 1.0);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.55, now + 0.08);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

  sub.connect(subGain).connect(master);
  sub.start(now);
  sub.stop(now + 1.4);

  // 3) High shimmer arrival — gentle bell at landing
  const shimmer = ctx.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(1320, now + 0.9);

  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime(0, now + 0.9);
  shimmerGain.gain.linearRampToValueAtTime(0.16, now + 1.0);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);

  shimmer.connect(shimmerGain).connect(master);
  shimmer.start(now + 0.9);
  shimmer.stop(now + 1.8);
};
