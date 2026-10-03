/** 外部ファイル不要の効果音（Web Audio API） */
let ctx: AudioContext | null = null;
let enabled = true;

export const isSoundOn = () => enabled;
export const setSoundOn = (v: boolean) => {
  enabled = v;
};

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  if (!enabled) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {
    /* 音が出せない環境は無視 */
  }
}

export const sfx = {
  tap: () => tone(520, 0, 0.06, 'triangle', 0.08),
  correct: () => {
    tone(660, 0, 0.12, 'triangle');
    tone(990, 0.1, 0.22, 'triangle');
  },
  wrong: () => {
    tone(240, 0, 0.18, 'sawtooth', 0.08);
    tone(180, 0.16, 0.28, 'sawtooth', 0.08);
  },
  complete: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle')),
};
