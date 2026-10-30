import { Flag } from 'lucide-react';
import type { Card } from '../../types';
import { DECK_META } from '../../data/decks';
import { scopeLabel, scopeOf, todayNewPct, type PlanSummary } from '../../lib/plan';
import ProgressBar from '../ui/ProgressBar';

interface Props {
  summary: PlanSummary | null;
  card: Card;
}

/** 解いている最中の上部: 今の問題の範囲で、今日あと何問解けばいいか */
export default function SessionGoal({ summary: s, card }: Props) {
  if (!s || s.daysLeft <= 0) return null;
  const p = s.scopes.find((sc) => sc.key === scopeOf(card));
  if (!p || p.dailyNew === 0) return null;

  const unit = DECK_META[card.deck].unit;
  const left = p.dailyNew - p.todayNew;
  const done = left <= 0;

  return (
    <div className={`mb-3 rounded-2xl px-3 py-2 ${done ? 'bg-green-50' : 'bg-indigo-50'}`}>
      <div className={`flex items-center gap-1.5 text-xs font-black ${done ? 'text-green-600' : 'text-indigo-600'}`}>
        <Flag className="h-4 w-4 shrink-0" />
        <span className="truncate">今日のゴール（{scopeLabel(p.key)}）</span>
        <span className="ml-auto shrink-0">
          {done ? '達成！🎉' : `新出あと${left}${unit}`}
          <span className="ml-1 font-bold text-slate-400">
            {p.todayNew}/{p.dailyNew}
          </span>
        </span>
      </div>
      <ProgressBar
        pct={todayNewPct(p)}
        className="mt-1.5 h-1.5 bg-white"
        barClass={`transition-all duration-500 ${done ? 'bg-green-500' : 'bg-indigo-500'}`}
      />
      {s.dueToday > 0 && <div className="mt-1 text-[11px] font-bold text-slate-400">復習日の問題 あと{s.dueToday}問</div>}
    </div>
  );
}
