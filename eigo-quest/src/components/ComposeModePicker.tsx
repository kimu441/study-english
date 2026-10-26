import { Keyboard, Mic } from 'lucide-react';
import type { ComposeMode } from '../types';
import { choiceClass } from './ui/styles';

interface Props {
  value: ComposeMode;
  onChange: (m: ComposeMode) => void;
}

const MODES = [
  ['oral', '口頭で言う', '答えを見て自己判定', Mic],
  ['type', '入力する', '英文をタイピング', Keyboard],
] as const;

/** 瞬間英作文の解答方法の切り替え */
export default function ComposeModePicker({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 p-3">
      <div className="mb-2 text-xs font-extrabold text-slate-400">解答方法</div>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map(([m, label, sub, Icon]) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left ${choiceClass(value === m)}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>
              <span className="block text-sm font-black">{label}</span>
              <span className="block text-[11px] font-bold opacity-80">{sub}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
