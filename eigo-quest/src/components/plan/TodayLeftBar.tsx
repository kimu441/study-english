import { Flag } from 'lucide-react';
import type { Card } from '../../types';
import { DECK_META } from '../../data/decks';
import { scopeLabel, scopeOf, todayNewPct, type PlanSummary } from '../../lib/plan';
import ProgressBar from '../ui/ProgressBar';

interface Props {
  summary: PlanSummary | null;
  /** 解いている最中の問題。渡すと、その問題の範囲の残りも表示する */
  card?: Card | null;
}

/**
 * 画面上部に固定する「今日あと何問」。
 * 学習計画の全範囲の新出の残り + 復習日の問題を合計して表示する。回答するたびに summary が更新される。
 */
export default function TodayLeftBar({ summary: s, card }: Props) {
  if (!s || s.daysLeft <= 0) return null;
  const done = s.todayLeft === 0;
  const scope = card ? s.scopes.find((sc) => sc.key === scopeOf(card)) : undefined;
  const scopeLeft = scope ? Math.max(0, scope.dailyNew - scope.todayNew) : 0;

  return (
    <div className={`rounded-2xl px-3 py-2 ${done ? 'bg-green-50' : 'bg-indigo-50'}`}>
      <div className={`flex items-center gap-1.5 text-sm font-black ${done ? 'text-green-600' : 'text-indigo-600'}`}>
        <Flag className="h-4 w-4 shrink-0" />
        {done ? '今日の分は達成！🎉' : `今日はあと${s.todayLeft}問`}
        <span className="ml-auto shrink-0 text-[11px] font-extrabold text-slate-400">
          新出 あと{s.newLeft}・復習日 あと{s.dueToday}
        </span>
      </div>
      <ProgressBar
        pct={todayNewPct(s)}
        className="mt-1.5 h-1.5 bg-white"
        barClass={`transition-all duration-500 ${done ? 'bg-green-500' : 'bg-indigo-500'}`}
      />
      {card && scope && scope.dailyNew > 0 && (
        <div className="mt-1 truncate text-[11px] font-bold text-slate-400">
          いまの範囲（{scopeLabel(scope.key)}）：新出 {scope.todayNew}/{scope.dailyNew}
          {DECK_META[card.deck].unit}
          {scopeLeft > 0 ? `・あと${scopeLeft}${DECK_META[card.deck].unit}` : '・達成'}
        </div>
      )}
    </div>
  );
}
