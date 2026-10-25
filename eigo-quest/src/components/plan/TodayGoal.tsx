import { CalendarClock, Flag } from 'lucide-react';
import type { PlanSummary, ScopeProgress, StageGoal } from '../../lib/plan';
import { QUEST_SIZE } from '../../lib/plan';

interface Props {
  summary: PlanSummary;
  /** 表示中の単語帳・レベルの進み具合（学習計画の範囲外なら null） */
  progress: ScopeProgress | null;
  goal: StageGoal | null;
  unit: string;
  onOpenPlan: () => void;
}

/** 単語・瞬間英作文のマップ上部: 試験日から逆算した「今日はどこまでやるか」 */
export default function TodayGoal({ summary: s, progress: p, goal, unit, onOpenPlan }: Props) {
  if (s.daysLeft <= 0) return null;

  if (!p) {
    return (
      <button onClick={onOpenPlan} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-500">
        この単語帳は学習計画の範囲に入っていません。計画タブで範囲に追加すると、今日の目標が出ます。
      </button>
    );
  }

  const remaining = p.total - p.done;
  const done = p.todayNew >= p.dailyNew;
  const pct = p.dailyNew ? Math.min(100, (p.todayNew / p.dailyNew) * 100) : 100;

  return (
    <section className={`rounded-3xl border-2 p-4 ${done ? 'border-green-200 bg-green-50' : 'border-indigo-200 bg-indigo-50'}`}>
      <div className={`flex items-center gap-2 text-sm font-black ${done ? 'text-green-600' : 'text-indigo-600'}`}>
        <Flag className="h-5 w-5" />
        今日のゴール
        <span className="ml-auto flex items-center gap-1 text-xs font-extrabold text-slate-400">
          <CalendarClock className="h-4 w-4" />
          試験まであと{s.daysLeft}日
        </span>
      </div>

      {remaining === 0 && p.todayNew === 0 ? (
        <p className="mt-2 text-lg font-black text-green-700">この範囲は全部学習済み！復習で定着させよう</p>
      ) : (
        <>
          <div className="mt-2 text-lg font-black leading-snug text-slate-700">
            {done ? (
              '今日の分は達成！🎉'
            ) : goal ? (
              <>
                「{goal.stage.title}」まで進めよう
              </>
            ) : (
              `新出をあと${p.dailyNew - p.todayNew}${unit}`
            )}
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
            <div className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-bold text-slate-500">
            今日の新出 {p.todayNew} / {p.dailyNew}
            {unit}
            {!done && `（あと${p.dailyNew - p.todayNew}${unit}・レッスン約${Math.ceil((p.dailyNew - p.todayNew) / QUEST_SIZE)}回）`}
            ・残り{remaining}
            {unit}を1日{p.dailyNew}
            {unit}ペース
          </p>
        </>
      )}
    </section>
  );
}
