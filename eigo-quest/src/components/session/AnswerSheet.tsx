import { BookmarkPlus, Check, Volume2, X } from 'lucide-react';
import type { Card, Rating } from '../../types';
import { RATING_LABEL, formatInterval, previewInterval } from '../../lib/srs';
import { REVIEW_CLEAR_STREAK } from '../../lib/review';
import { speak } from '../../lib/sound';

interface Props {
  card: Card;
  correct: boolean;
  onRate: (rating: Rating) => void;
}

const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

const RATING_STYLE: Record<Rating, string> = {
  again: 'bg-red-500 border-red-700',
  hard: 'bg-orange-400 border-orange-600',
  good: 'bg-sky-500 border-sky-700',
  easy: 'bg-green-500 border-green-700',
};

/** 解答後に下から出るシート: 正誤・答え・解説 + 自己評価（SRS連動） */
export default function AnswerSheet({ card, correct, onRate }: Props) {
  const answers = [card.answer, ...(card.alternatives ?? [])];
  const sub = `mt-1 text-sm font-bold ${correct ? 'text-green-700/80' : 'text-red-700/80'}`;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 animate-slide-up border-t-2 p-4 pb-6 ${
        correct ? 'border-green-200 bg-green-100' : 'border-red-200 bg-red-100'
      }`}
    >
      <div className="mx-auto max-w-xl">
        <div className={`flex items-center gap-2 text-xl font-black ${correct ? 'text-green-600' : 'text-red-600'}`}>
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${correct ? 'bg-green-500' : 'bg-red-500'}`}>
            {correct ? <Check className="h-5 w-5" strokeWidth={4} /> : <X className="h-5 w-5" strokeWidth={4} />}
          </span>
          {correct ? 'ナイス！正解！' : '正解はこちら'}
        </div>
        <div className={`mt-2 flex items-center gap-2 text-lg font-extrabold ${correct ? 'text-green-700' : 'text-red-700'}`}>
          {card.answer}
          {card.deck === 'word' && <span className="text-base font-bold opacity-80">（{card.prompt}）</span>}
          <button onClick={() => speak(card.answer)} className="rounded-full p-1.5 hover:bg-white/60" aria-label="発音を聞く">
            <Volume2 className="h-5 w-5" />
          </button>
        </div>
        {answers.length > 1 && (
          <p className={sub}>
            別解：{answers.slice(1, 4).join(' / ')}
          </p>
        )}
        <p className={sub}>{card.explanation}</p>
        {!correct ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-extrabold text-rose-600">
            <BookmarkPlus className="h-4 w-4" />
            復習リストに追加されます
          </p>
        ) : (
          card.inReviewList && (
            <p className="mt-2 text-xs font-extrabold text-green-700">
              復習リスト：連続正解 {card.reviewStreak + 1} / {REVIEW_CLEAR_STREAK}（{REVIEW_CLEAR_STREAK}回でリストから外れます）
            </p>
          )
        )}

        <div className="mb-2 mt-4 text-xs font-extrabold text-slate-500">どれくらい覚えていた？</div>
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => {
            const disabled = !correct && (r === 'good' || r === 'easy');
            return (
              <button
                key={r}
                disabled={disabled}
                onClick={() => onRate(r)}
                className={`rounded-2xl border-b-4 px-1 py-2.5 text-white transition active:translate-y-0.5 active:border-b-2 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400 ${RATING_STYLE[r]}`}
              >
                <div className="text-sm font-black">{RATING_LABEL[r]}</div>
                <div className="text-[11px] font-bold opacity-90">{formatInterval(previewInterval(card, r))}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
