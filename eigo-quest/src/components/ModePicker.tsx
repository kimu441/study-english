import type { LucideIcon } from 'lucide-react';
import { choiceClass } from './ui/styles';

export interface ModeOption<T extends string> {
  id: T;
  label: string;
  sub: string;
  Icon: LucideIcon;
}

interface Props<T extends string> {
  title: string;
  options: readonly ModeOption<T>[];
  value: T;
  onChange: (m: T) => void;
}

/** 解き方の切り替え（単語のリスニング、瞬間英作文の解答方法） */
export default function ModePicker<T extends string>({ title, options, value, onChange }: Props<T>) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 p-3">
      <div className="mb-2 text-xs font-extrabold text-slate-400">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ id, label, sub, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left ${choiceClass(value === id)}`}
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
