import { RotateCcw, Target } from 'lucide-react';

interface Props {
  dueCount: number;
  weakCount: number;
  onStart: () => void;
}

export default function ReviewWidget({ dueCount, weakCount, onStart }: Props) {
  const done = dueCount === 0;
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border-b-8 p-5 text-white ${
        done ? 'border-sky-700 bg-sky-500' : 'border-purple-800 bg-purple-500'
      }`}
    >
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-3xl bg-white/20">
          <span className="text-5xl font-black leading-none">{dueCount}</span>
          <span className="mt-1 text-xs font-extrabold">問</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black leading-tight">
            {done ? '今日の復習は完了！' : '今日の復習があります'}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm font-bold text-white/85">
            <Target className="h-4 w-4" />
            苦手な問題 {weakCount}問
          </p>
        </div>
      </div>
      <button
        onClick={onStart}
        className={`relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-slate-300 bg-white py-3.5 text-lg font-black transition active:translate-y-0.5 active:border-b-2 ${
          done ? 'text-sky-600' : 'text-purple-600'
        }`}
      >
        <RotateCcw className="h-5 w-5" />
        {done ? '弱点・新出に挑戦する' : '復習をはじめる'}
      </button>
    </section>
  );
}
