import { useState } from 'react';
import type { ScopeKey, StudyPlan } from '../../types';
import { ALL_SCOPES, scopeLabel } from '../../lib/plan';
import { addDays, diffDays } from '../../lib/srs';
import { BTN_PRIMARY, choiceClass } from '../ui/styles';

interface Props {
  initial: StudyPlan | null;
  today: string;
  /** 範囲ごとの問題数（チェックボックスの横に表示） */
  counts: Record<ScopeKey, number>;
  onSave: (plan: StudyPlan) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

const REVIEW_OPTIONS = [0, 3, 7];

/** 試験日・範囲・総復習期間の設定フォーム */
export default function PlanForm({ initial, today, counts, onSave, onCancel, onDelete }: Props) {
  const [examDate, setExamDate] = useState(initial?.examDate ?? addDays(today, 60));
  // 問題が1つもない範囲（未登録のマイ単語帳など）は選べない
  const scopes = ALL_SCOPES.filter((k) => counts[k] > 0);
  const [scope, setScope] = useState<ScopeKey[]>(() => (initial?.scope ?? scopes).filter((k) => counts[k] > 0));
  const [reviewDays, setReviewDays] = useState(initial?.reviewDays ?? 7);

  const valid = examDate > today && scope.length > 0;
  const daysLeft = valid ? diffDays(examDate, today) : 0;
  const total = scope.reduce((s, k) => s + counts[k], 0);

  const toggle = (k: ScopeKey) =>
    setScope((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : ALL_SCOPES.filter((x) => x === k || prev.includes(x))));

  return (
    <section className="space-y-5 rounded-3xl border-2 border-slate-200 p-5">
      <h2 className="text-xl font-black text-slate-700">{initial ? '学習計画を変更' : '試験日を設定しよう'}</h2>

      <label className="block">
        <span className="text-xs font-extrabold text-slate-400">TOEIC Bridge の試験日</span>
        <input
          type="date"
          value={examDate}
          min={addDays(today, 1)}
          onChange={(e) => setExamDate(e.target.value)}
          className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-lg font-black text-slate-700 outline-none focus:border-sky-400"
        />
      </label>

      <div>
        <div className="text-xs font-extrabold text-slate-400">試験日までに網羅する範囲</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {scopes.map((k) => {
            const on = scope.includes(k);
            return (
              <button
                key={k}
                onClick={() => toggle(k)}
                className={`rounded-xl border-2 px-3 py-2 text-left ${choiceClass(on)}`}
              >
                <span className="block text-sm font-black">{scopeLabel(k)}</span>
                <span className="block text-[11px] font-bold opacity-80">{counts[k]}問</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-extrabold text-slate-400">試験直前の総復習期間（新出を入れない日数）</div>
        <div className="mt-2 flex gap-2">
          {REVIEW_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setReviewDays(d)}
              className={`flex-1 rounded-xl border-2 py-2 text-sm font-black ${
                reviewDays === d ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-400'
              }`}
            >
              {d === 0 ? 'なし' : `${d}日間`}
            </button>
          ))}
        </div>
      </div>

      {valid ? (
        <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">
          試験まであと{daysLeft}日・全{total}問。
          {daysLeft <= reviewDays && '総復習期間が試験までの日数より長いため、試験前日までで新出を割り振ります。'}
        </p>
      ) : (
        <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-500">
          {scope.length === 0 ? '範囲を1つ以上選んでください。' : '試験日は明日以降の日付にしてください。'}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button onClick={onCancel} className="rounded-2xl border-2 border-b-4 border-slate-200 px-5 py-3 font-black text-slate-400">
            戻る
          </button>
        )}
        <button
          disabled={!valid}
          onClick={() => onSave({ examDate, scope, reviewDays })}
          className={`${BTN_PRIMARY} flex-1 py-3 text-lg`}
        >
          この計画で始める
        </button>
      </div>
      {onDelete && (
        <button
          onClick={() => window.confirm('学習計画を削除します。学習記録は消えません。') && onDelete()}
          className="w-full text-center text-xs font-extrabold text-slate-400 hover:text-slate-600"
        >
          計画を削除する
        </button>
      )}
    </section>
  );
}
