import { useCallback, useMemo, useState } from 'react';
import { BookOpen, CalendarClock, MessageSquareText, Pencil, Swords, TrendingUp } from 'lucide-react';
import type { Card, Deck, ReviewLog, ScopeKey, StudyPlan } from '../../types';
import PlanForm, { scopeLabel } from './PlanForm';
import PlanCalendar from './PlanCalendar';
import { ALL_SCOPES, QUEST_SIZE, computePlan, planDays, scopeOf } from '../../lib/plan';
import { formatDateJa } from '../../lib/srs';

interface Props {
  cards: Card[];
  logs: ReviewLog[];
  plan: StudyPlan | null;
  today: string;
  onSave: (plan: StudyPlan | null) => void;
  /** 単語 / 瞬間英作文 のタブへ移動 */
  onGo: (deck: Deck) => void;
}

/** 計画タブ: 試験日までのカウントダウン・今日のクエスト・ペース・カレンダー */
export default function PlanView({ cards, logs, plan, today, onSave, onGo }: Props) {
  const [editing, setEditing] = useState(false);

  const counts = useMemo(() => {
    const r = Object.fromEntries(ALL_SCOPES.map((k) => [k, 0])) as Record<ScopeKey, number>;
    for (const c of cards) r[scopeOf(c)] += 1;
    return r;
  }, [cards]);

  const summary = useMemo(() => (plan ? computePlan(cards, logs, plan, today) : null), [cards, logs, plan, today]);
  const getDays = useCallback(
    (dates: string[]) => (plan && summary ? planDays(dates, summary, plan, cards, logs, today) : []),
    [plan, summary, cards, logs, today],
  );

  if (!plan || !summary || editing) {
    return (
      <PlanForm
        initial={plan}
        today={today}
        counts={counts}
        onSave={(p) => {
          onSave(p);
          setEditing(false);
        }}
        onCancel={plan ? () => setEditing(false) : undefined}
        onDelete={
          plan
            ? () => {
                onSave(null);
                setEditing(false);
              }
            : undefined
        }
      />
    );
  }

  const s = summary;
  const coverage = s.total ? Math.round((s.done / s.total) * 100) : 0;
  const questsDone = Math.min(s.dailyQuests, Math.floor(s.todayNew / QUEST_SIZE));
  const newDone = s.dailyNew > 0 && s.todayNew >= s.dailyNew;
  const target = s.inFinalReview ? plan.examDate : s.learnEndDate;
  const onTrack = s.remaining === 0 || (s.projectedFinish !== null && s.projectedFinish <= target);
  const decks = [...new Set(plan.scope.map((k): Deck => (k.startsWith('composition') ? 'composition' : 'word')))];

  return (
    <>
      {/* カウントダウン */}
      <section className="relative overflow-hidden rounded-3xl border-b-8 border-indigo-800 bg-indigo-500 p-5 text-white">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <CalendarClock className="h-14 w-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold text-white/80">TOEIC Bridge 試験日 {formatDateJa(plan.examDate)}</div>
            {s.daysLeft > 0 ? (
              <div className="text-4xl font-black leading-tight">
                あと{s.daysLeft}
                <span className="ml-1 text-lg">日</span>
              </div>
            ) : (
              <div className="text-2xl font-black leading-tight">{s.daysLeft === 0 ? '今日が試験日！がんばって！' : '試験日を過ぎました'}</div>
            )}
            {s.inFinalReview && <div className="mt-1 text-sm font-bold text-white/90">総復習期間に入りました</div>}
          </div>
          <button onClick={() => setEditing(true)} className="self-start rounded-full bg-white/20 p-2 hover:bg-white/30" aria-label="計画を変更">
            <Pencil className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* 今日のクエスト */}
      {s.daysLeft > 0 && (
        <section className="rounded-3xl border-2 border-sky-200 p-4">
          <div className="flex items-center gap-2 text-lg font-black text-slate-700">
            <Swords className="h-6 w-6 text-sky-500" />
            今日のクエスト
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-sky-50 p-3">
              <div className="text-xs font-extrabold text-sky-500">新出レッスン</div>
              <div className="text-3xl font-black text-sky-600">
                {questsDone}
                <span className="text-base"> / {s.dailyQuests}回</span>
              </div>
              <div className="text-[11px] font-bold text-sky-500">
                新出 {s.todayNew} / {s.dailyNew}問（1回{QUEST_SIZE}問）
              </div>
            </div>
            <div className="rounded-2xl bg-purple-50 p-3">
              <div className="text-xs font-extrabold text-purple-500">復習</div>
              <div className="text-3xl font-black text-purple-600">
                {s.reviewQuests}
                <span className="text-base">回</span>
              </div>
              <div className="text-[11px] font-bold text-purple-500">今日が復習日 残り{s.dueToday}問</div>
            </div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-700"
              style={{ width: `${s.dailyNew ? Math.min(100, (s.todayNew / s.dailyNew) * 100) : 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-500">
            {s.remaining === 0
              ? '範囲の新出はすべて学習済み！復習で定着させよう。'
              : newDone
                ? '今日の新出ノルマ達成！余裕があれば復習もしよう。'
                : `あと新出${s.dailyNew - s.todayNew}問。マップの新しいステージから進めよう。`}
          </p>
          <div className="mt-3 flex gap-2">
            {decks.map((d) => (
              <button
                key={d}
                onClick={() => onGo(d)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-b-4 border-green-700 bg-green-500 py-2.5 text-sm font-black text-white active:translate-y-0.5 active:border-b-2"
              >
                {d === 'word' ? <BookOpen className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                {d === 'word' ? '単語へ' : '瞬間英作文へ'}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 網羅率とペース */}
      <section className="rounded-3xl border-2 border-slate-200 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-black text-slate-700">網羅率</h3>
          <span className="text-sm font-extrabold text-slate-400">
            {s.done} / {s.total}問（{coverage}%）
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${coverage}%` }} />
        </div>
        <div className="mt-3 space-y-2">
          {s.scopes.map((sc) => (
            <div key={sc.key} className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
              <span className="w-24 shrink-0">{scopeLabel(sc.key)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-green-400" style={{ width: `${sc.total ? (sc.done / sc.total) * 100 : 0}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right">
                {sc.done}/{sc.total}
              </span>
            </div>
          ))}
        </div>
        {s.remaining > 0 && s.daysLeft > 0 && (
          <div className={`mt-4 flex gap-2 rounded-2xl p-3 text-sm font-bold ${onTrack ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
            <TrendingUp className="h-5 w-5 shrink-0" />
            <p>
              直近7日のペースは1日{s.recentPace.toFixed(1)}問。
              {s.projectedFinish
                ? `このままだと${formatDateJa(s.projectedFinish)}に全範囲を学習し終えます。`
                : 'まだ新出の学習記録がありません。'}
              {onTrack
                ? `目標（${formatDateJa(target)}）に間に合うペースです！`
                : `目標の${formatDateJa(target)}までに終えるには、1日${s.dailyNew}問のペースが必要です。`}
            </p>
          </div>
        )}
      </section>

      <PlanCalendar today={today} examDate={plan.examDate} getDays={getDays} />
    </>
  );
}
