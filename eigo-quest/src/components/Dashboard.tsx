import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Flame, Target, Trophy, Zap } from 'lucide-react';
import type { Card, ReviewLog } from '../types';
import { addDays, todayStr } from '../lib/srs';
import { dayStats, getStreak, statusBreakdown } from '../lib/stats';

interface Props {
  cards: Card[];
  logs: ReviewLog[];
  onDemo: () => void;
  onReset: () => void;
}

const WEEKS = 16;
const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
const LEVEL_CLS = ['bg-slate-100', 'bg-green-200', 'bg-green-400', 'bg-green-500', 'bg-green-700'];

function level(metric: 'count' | 'xp', v: number) {
  if (v <= 0) return 0;
  const t = metric === 'count' ? [1, 3, 6, 10] : [1, 20, 50, 100];
  return t.filter((x) => v >= x).length;
}

function message(streak: number, studiedToday: boolean) {
  if (streak === 0) return '今日が最初の一歩。5問だけでもOK！';
  if (!studiedToday) return `${streak}日連続中！今日学習して記録を守ろう 🔥`;
  if (streak >= 30) return `${streak}日連続…もう習慣の達人です！`;
  if (streak >= 7) return `1週間以上継続中！この調子！`;
  return `${streak}日連続！いい流れです`;
}

export default function Dashboard({ cards, logs, onDemo, onReset }: Props) {
  const today = todayStr();
  const [metric, setMetric] = useState<'count' | 'xp'>('count');
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => dayStats(logs), [logs]);
  const streak = useMemo(() => getStreak(logs, today), [logs, today]);
  const status = useMemo(() => statusBreakdown(cards), [cards]);

  const totalXp = logs.reduce((s, l) => s + l.xp, 0);
  const totalCorrect = logs.filter((l) => l.correct).length;
  const accuracy = logs.length ? Math.round((totalCorrect / logs.length) * 100) : 0;
  const lv = Math.floor(totalXp / 100) + 1;
  const lvPct = totalXp % 100;
  const next = MILESTONES.find((m) => m > streak.current) ?? streak.current + 1;

  // ヒートマップ: 日曜始まりの週ごとの列
  const weeks = useMemo(() => {
    const dow = new Date().getDay();
    const start = addDays(today, -dow - 7 * (WEEKS - 1));
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(start, w * 7 + d);
        return { date, future: date > today, v: days[date]?.[metric] ?? 0 };
      }),
    );
  }, [days, metric, today]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, []);

  // ドーナツ
  const total = cards.length || 1;
  const segs = [
    { key: 'mastered', label: 'マスター済', n: status.mastered, color: '#22c55e', bar: 'bg-green-500' },
    { key: 'learning', label: '学習中', n: status.learning, color: '#38bdf8', bar: 'bg-sky-400' },
    { key: 'new', label: '未学習', n: status.new, color: '#cbd5e1', bar: 'bg-slate-300' },
  ];
  const R = 48;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="space-y-5">
      {/* ストリーク + 激励 */}
      <section className="rounded-3xl border-b-8 border-orange-600 bg-orange-500 p-5 text-white">
        <div className="flex items-center gap-4">
          <Flame className={`h-16 w-16 fill-yellow-300 text-yellow-300 ${streak.studiedToday ? 'animate-flame' : 'opacity-60'}`} />
          <div>
            <div className="text-5xl font-black leading-none">
              {streak.current}
              <span className="ml-1 text-xl">日連続</span>
            </div>
            <p className="mt-1 text-sm font-bold text-white/90">{message(streak.current, streak.studiedToday)}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-extrabold text-white/90">
            <span>次の目標：{next}日連続</span>
            <span>あと{Math.max(0, next - streak.current)}日</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/20">
            <div className="h-full rounded-full bg-yellow-300 transition-all duration-700" style={{ width: `${Math.min(100, (streak.current / next) * 100)}%` }} />
          </div>
        </div>
      </section>

      {/* サマリー */}
      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: <Zap className="h-6 w-6 fill-yellow-400 text-yellow-400" />, label: '累計XP', value: totalXp.toLocaleString(), cls: 'border-yellow-200' },
          { icon: <Trophy className="h-6 w-6 fill-amber-400 text-amber-500" />, label: '最長ストリーク', value: `${streak.longest}日`, cls: 'border-amber-200' },
          { icon: <Target className="h-6 w-6 text-sky-500" />, label: '正解率', value: `${accuracy}%`, cls: 'border-sky-200' },
          { icon: <Award className="h-6 w-6 text-purple-500" />, label: '解いた問題', value: `${logs.length}問`, cls: 'border-purple-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border-2 bg-white p-4 ${s.cls}`}>
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400">
              {s.icon}
              {s.label}
            </div>
            <div className="mt-1 text-2xl font-black text-slate-700">{s.value}</div>
          </div>
        ))}
        <div className="col-span-2 rounded-2xl border-2 border-green-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-green-600">Lv.{lv}</span>
            <span className="text-xs font-extrabold text-slate-400">次のレベルまで {100 - lvPct} XP</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${lvPct}%` }} />
          </div>
        </div>
      </section>

      {/* ヒートマップ */}
      <section className="rounded-3xl border-2 border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-700">学習カレンダー</h3>
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black">
            {(['count', 'xp'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`rounded-lg px-3 py-1 ${metric === m ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}
              >
                {m === 'count' ? '問題数' : 'XP'}
              </button>
            ))}
          </div>
        </div>
        <div ref={scrollRef} className="overflow-x-auto pb-2">
          <div className="flex w-max gap-1">
            <div className="mr-1 flex flex-col gap-1 pt-5 text-[10px] font-bold text-slate-400">
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div key={d} className="flex h-4 items-center">{i % 2 === 1 ? d : ''}</div>
              ))}
            </div>
            {weeks.map((week, wi) => {
              const monthStart = week.find((c) => c.date.slice(8) === '01');
              return (
                <div key={wi} className="flex flex-col gap-1">
                  <div className="h-4 text-[10px] font-bold text-slate-400">
                    {monthStart ? `${Number(monthStart.date.slice(5, 7))}月` : ''}
                  </div>
                  {week.map((c) => (
                    <div
                      key={c.date}
                      title={`${c.date}: ${c.v}${metric === 'count' ? '問' : ' XP'}`}
                      className={`h-4 w-4 rounded-[5px] ${c.future ? 'opacity-0' : LEVEL_CLS[level(metric, c.v)]} ${c.date === today ? 'ring-2 ring-sky-400' : ''}`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-bold text-slate-400">
          少
          {LEVEL_CLS.map((c) => (
            <span key={c} className={`h-3 w-3 rounded-[4px] ${c}`} />
          ))}
          多
        </div>
      </section>

      {/* ステータス円グラフ */}
      <section className="rounded-3xl border-2 border-slate-200 p-4">
        <h3 className="mb-3 text-lg font-black text-slate-700">学習ステータス</h3>
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f5f9" strokeWidth="16" />
              {segs.map((s) => {
                const len = (s.n / total) * C;
                const el = (
                  <circle
                    key={s.key}
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="16"
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-green-600">{Math.round((status.mastered / total) * 100)}%</span>
              <span className="text-[10px] font-extrabold text-slate-400">マスター</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {segs.map((s) => {
              const pct = Math.round((s.n / total) * 100);
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-sm font-extrabold text-slate-600">
                    <span>{s.label}</span>
                    <span>
                      {s.n}語 ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 開発用 */}
      <section className="flex justify-center gap-3 pb-2 text-xs font-extrabold">
        <button onClick={onDemo} className="rounded-xl border-2 border-slate-200 px-3 py-2 text-slate-400 hover:bg-slate-50">
          デモデータを入れる
        </button>
        <button
          onClick={() => window.confirm('学習データをすべて削除します。よろしいですか？') && onReset()}
          className="rounded-xl border-2 border-slate-200 px-3 py-2 text-slate-400 hover:bg-slate-50"
        >
          データをリセット
        </button>
      </section>
    </div>
  );
}
