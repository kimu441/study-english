import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayPlan } from '../../lib/plan';
import { QUEST_SIZE } from '../../lib/plan';
import { formatDateJa, toDateStr } from '../../lib/srs';

interface Props {
  today: string;
  examDate: string;
  /** 指定した日付の予定・実績を返す */
  getDays: (dates: string[]) => DayPlan[];
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/** 月の日付（日曜始まりの週で埋める。前後の月の日は null） */
function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toDateStr(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function cellStyle(d: DayPlan, today: string) {
  if (d.kind === 'exam') return 'bg-red-500 text-white';
  if (d.kind === 'review') return 'bg-amber-100 text-amber-700';
  if (d.kind === 'learn') return d.date === today ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700';
  if (d.kind === 'past') return d.answers > 0 ? 'bg-green-100 text-green-700' : 'text-slate-300';
  return 'text-slate-300';
}

function cellNote(d: DayPlan) {
  if (d.kind === 'exam') return '🎯';
  if (d.kind === 'review') return '総復習';
  if (d.kind === 'learn') return d.plannedNew > 0 ? `${d.plannedNew}問` : '復習';
  if (d.kind === 'past' && d.answers > 0) return `✓${d.answers}`;
  return '';
}

function detail(d: DayPlan) {
  switch (d.kind) {
    case 'exam':
      return '試験日。前日はしっかり休もう。';
    case 'review':
      return '総復習期間。新出は入れず、復習リストと今日の復習を中心に。';
    case 'learn':
      return d.plannedNew > 0
        ? `新出 ${d.plannedNew}問（クエスト ${Math.ceil(d.plannedNew / QUEST_SIZE)}回）＋ 復習日の問題`
        : '新出は完了予定。復習日の問題を解こう。';
    case 'past':
      return d.answers > 0 ? `${d.answers}問に回答（新出 ${d.actualNew}問）` : '学習記録なし';
    default:
      return '試験日のあと';
  }
}

/** 試験日までの予定と、これまでの実績を月ごとに表示するカレンダー */
export default function PlanCalendar({ today, examDate, getDays }: Props) {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(today);

  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const days = useMemo(() => {
    const plans = getDays(cells.filter((c): c is string => c !== null));
    return new Map(plans.map((p) => [p.date, p]));
  }, [cells, getDays]);
  const sel = days.get(selected) ?? getDays([selected])[0];

  // 今月より前・試験月より後には移動しない
  const examOffset = (Number(examDate.slice(0, 4)) - Number(today.slice(0, 4))) * 12 + Number(examDate.slice(5, 7)) - Number(today.slice(5, 7));
  const minOffset = -3;
  const maxOffset = Math.max(0, examOffset);

  return (
    <section className="rounded-3xl border-2 border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setOffset((o) => o - 1)}
          disabled={offset <= minOffset}
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          aria-label="前の月"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h3 className="text-lg font-black text-slate-700">
          {year}年{month + 1}月
        </h3>
        <button
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= maxOffset}
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          aria-label="次の月"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK.map((w, i) => (
          <div key={w} className={`pb-1 text-[11px] font-black ${i === 0 ? 'text-red-400' : i === 6 ? 'text-sky-400' : 'text-slate-400'}`}>
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          const d = date ? days.get(date) : undefined;
          if (!date || !d) return <div key={`e${i}`} />;
          return (
            <button
              key={date}
              onClick={() => setSelected(date)}
              className={`flex h-14 flex-col items-center justify-start rounded-xl pt-1 ${cellStyle(d, today)} ${
                date === selected ? 'ring-2 ring-slate-500' : ''
              }`}
            >
              <span className="text-sm font-black leading-tight">{Number(date.slice(8))}</span>
              <span className="mt-0.5 text-[10px] font-extrabold leading-tight">{cellNote(d)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-extrabold text-slate-400">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-sky-50 ring-1 ring-sky-200" />新出の予定</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100" />総復習</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" />試験日</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-100" />学習した日</span>
      </div>

      {sel && (
        <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
          <span className="font-black">{formatDateJa(sel.date)}</span>　{detail(sel)}
        </p>
      )}
    </section>
  );
}
