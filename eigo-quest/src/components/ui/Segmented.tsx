import type { ReactNode } from 'react';

interface Option<T extends string> {
  id: T;
  label: ReactNode;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 'lg': 画面上部の大きな切り替え / 'sm': カード見出し横の小さな切り替え */
  size?: 'lg' | 'sm';
  /** 選択中の文字色（Tailwind クラス） */
  activeClass?: string;
}

/** タブ風の切り替えボタン */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'lg',
  activeClass = 'text-green-600',
}: Props<T>) {
  const lg = size === 'lg';
  return (
    <div className={`flex bg-slate-100 font-black ${lg ? 'rounded-2xl p-1.5 text-sm' : 'rounded-xl p-1 text-xs'}`}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`transition ${lg ? 'flex-1 rounded-xl py-2' : 'rounded-lg px-3 py-1'} ${
            value === o.id ? `bg-white shadow-sm ${activeClass}` : 'text-slate-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
