import { Flame, Zap } from 'lucide-react';

interface Props {
  streak: number;
  studiedToday: boolean;
  xpToday: number;
  dailyGoal?: number;
}

export default function Header({ streak, studiedToday, xpToday, dailyGoal = 50 }: Props) {
  const pct = Math.min(100, Math.round((xpToday / dailyGoal) * 100));
  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <div className="text-2xl font-black tracking-tight text-green-500">
          eigo<span className="text-sky-500">quest</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-2xl border-2 px-3 py-1.5 font-black ${
              studiedToday ? 'border-orange-200 bg-orange-50 text-orange-500' : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
            title="連続学習日数"
          >
            <Flame className={`h-6 w-6 ${studiedToday ? 'animate-flame fill-orange-400' : 'fill-slate-300'}`} />
            <span className="text-lg leading-none">{streak}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border-2 border-yellow-200 bg-yellow-50 px-3 py-1.5 font-black text-yellow-500" title="今日の獲得XP">
            <Zap className="h-6 w-6 fill-yellow-400" />
            <span className="text-lg leading-none">{xpToday}</span>
            <span className="text-xs font-extrabold">XP</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-xl px-4 pb-3">
        <div className="mb-1 flex justify-between text-xs font-extrabold text-slate-400">
          <span>今日の目標</span>
          <span>
            {Math.min(xpToday, dailyGoal)} / {dailyGoal} XP
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="relative h-full rounded-full bg-yellow-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute inset-x-2 top-0.5 h-1 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </header>
  );
}
