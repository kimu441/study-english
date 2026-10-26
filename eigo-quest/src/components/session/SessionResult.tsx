import { BookmarkPlus, Target, Trophy, Zap } from 'lucide-react';
import { BTN_PRIMARY } from '../ui/styles';

export interface SessionTotals {
  xp: number;
  correct: number;
  total: number;
  /** このセッションで新しく復習リストに入った数 */
  added: number;
}

interface Props {
  result: SessionTotals;
  onExit: () => void;
}

/** レッスン完了画面 */
export default function SessionResult({ result, onExit }: Props) {
  const acc = result.total ? Math.round((result.correct / result.total) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-white px-6 text-center">
      {['🎉', '⭐', '✨', '🎊', '⭐', '✨', '🎉'].map((e, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-0 animate-confetti text-2xl"
          style={{ left: `${8 + i * 14}%`, animationDelay: `${i * 0.35}s` }}
        >
          {e}
        </span>
      ))}
      <Trophy className="h-24 w-24 animate-bobble fill-amber-400 text-amber-500" />
      <h1 className="mt-4 text-3xl font-black text-amber-500">レッスン完了！</h1>
      <div className="mt-6 flex gap-3">
        <div className="w-32 rounded-2xl border-2 border-yellow-400 bg-yellow-400 pb-3 text-white">
          <div className="py-1 text-xs font-black">獲得XP</div>
          <div className="mx-0.5 flex items-center justify-center gap-1 rounded-xl bg-white py-3 text-2xl font-black text-yellow-500">
            <Zap className="h-6 w-6 fill-yellow-400" />
            {result.xp}
          </div>
        </div>
        <div className="w-32 rounded-2xl border-2 border-green-500 bg-green-500 pb-3 text-white">
          <div className="py-1 text-xs font-black">正解率</div>
          <div className="mx-0.5 flex items-center justify-center gap-1 rounded-xl bg-white py-3 text-2xl font-black text-green-500">
            <Target className="h-6 w-6" />
            {acc}%
          </div>
        </div>
      </div>
      {result.added > 0 && (
        <p className="mt-5 flex items-center gap-1.5 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-extrabold text-rose-600">
          <BookmarkPlus className="h-5 w-5" />
          {result.added}問を復習リストに追加しました
        </p>
      )}
      <button
        onClick={onExit}
        className={`${BTN_PRIMARY} mt-10 w-full max-w-sm py-3.5 text-lg`}
      >
        ホームに戻る
      </button>
    </div>
  );
}
