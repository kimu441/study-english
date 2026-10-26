import { readPref, writePref } from './storage';

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

// ---------- 英語の発音（ブラウザの音声合成） ----------
const VOICE_KEY = 'eigo-quest:voice';
let voiceName = readPref(VOICE_KEY);

/** macOS の効果音のような声は候補から外す */
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Grandma|Grandpa|Hysterical|Jester|Junior|Organ|Pipe Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/;
/** 自然に聞こえやすい声（上ほど優先） */
const PREFERRED = [/Natural/, /Google US English/, /Samantha/, /Ava|Allison|Susan/, /Enhanced|Premium/, /Google/];

const rank = (v: SpeechSynthesisVoice) => {
  const i = PREFERRED.findIndex((re) => re.test(v.name));
  return (i === -1 ? PREFERRED.length : i) * 2 + (v.lang.replace('_', '-') === 'en-US' ? 0 : 1);
};

/** 選べる英語の声（おすすめ順） */
export function englishVoices(): SpeechSynthesisVoice[] {
  try {
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith('en') && !NOVELTY.test(v.name))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** 発音に使う声（選んだ声が無ければ一番おすすめの声） */
export function currentVoice(): SpeechSynthesisVoice | undefined {
  const voices = englishVoices();
  return voices.find((v) => v.name === voiceName) ?? voices[0];
}

export function setVoiceName(name: string) {
  voiceName = name;
  writePref(VOICE_KEY, name);
}

export function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voice = currentVoice();
    u.voice = voice ?? null;
    u.lang = voice?.lang ?? 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* 非対応環境は無視 */
  }
}
