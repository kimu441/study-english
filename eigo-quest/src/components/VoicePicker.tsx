import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { currentVoice, englishVoices, setVoiceName, speak } from '../lib/sound';

const SAMPLE = 'Hello. Nice to meet you.';

/** 発音に使う声の選択と試聴 */
export default function VoicePicker() {
  const [voices, setVoices] = useState(englishVoices);
  const [selected, setSelected] = useState(() => currentVoice()?.name ?? '');

  // 声の一覧はあとから読み込まれるブラウザがある
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => {
      setVoices(englishVoices());
      setSelected(currentVoice()?.name ?? '');
    };
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  if (voices.length === 0) return null;

  const change = (name: string) => {
    setVoiceName(name);
    setSelected(name);
    speak(SAMPLE);
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 p-3">
      <span className="shrink-0 text-xs font-extrabold text-slate-400">音声</span>
      <select
        value={selected}
        onChange={(e) => change(e.target.value)}
        className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-sky-400"
      >
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.name}>
            {v.name}（{v.lang}）
          </option>
        ))}
      </select>
      <button
        onClick={() => speak(SAMPLE)}
        className="flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-black text-sky-500 hover:bg-sky-50"
      >
        <Volume2 className="h-5 w-5" />
        試聴
      </button>
    </div>
  );
}
