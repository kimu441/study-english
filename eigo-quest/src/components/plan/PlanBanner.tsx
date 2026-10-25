import { CalendarClock, ChevronRight } from 'lucide-react';
import type { PlanSummary } from '../../lib/plan';
import { QUEST_SIZE } from '../../lib/plan';

interface Props {
  summary: PlanSummary | null;
  onOpen: () => void;
}

/** 単語・瞬間英作文タブ上部の、試験日までの残り日数と今日のノルマ */
export default function PlanBanner({ summary: s, onOpen }: Props) {
  if (!s) {
    return (
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 px-4 py-3 text-left text-sm font-black text-indigo-500"
      >
        <CalendarClock className="h-6 w-6 shrink-0" />
        <span className="flex-1">試験日を設定すると、1日に必要なクエスト数がわかります</span>
        <ChevronRight className="h-5 w-5" />
      </button>
    );
  }
  if (s.daysLeft <= 0) return null;
  const done = s.todayNew >= s.dailyNew;
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-4 py-3 text-left">
      <div className="flex shrink-0 flex-col items-center text-indigo-600">
        <span className="text-[10px] font-extrabold">試験まで</span>
        <span className="text-2xl font-black leading-none">{s.daysLeft}</span>
        <span className="text-[10px] font-extrabold">日</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-700">
          {s.remaining === 0
            ? '新出は全範囲クリア！復習を続けよう'
            : done
              ? '今日の新出ノルマ達成！'
              : `今日のクエスト：新出 あと${Math.ceil((s.dailyNew - s.todayNew) / QUEST_SIZE)}回`}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${s.dailyNew ? Math.min(100, (s.todayNew / s.dailyNew) * 100) : 100}%` }}
          />
        </div>
        <div className="mt-0.5 text-[11px] font-bold text-slate-400">
          新出 {s.todayNew} / {s.dailyNew}問・復習日の問題 {s.dueToday}問
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-indigo-300" />
    </button>
  );
}
