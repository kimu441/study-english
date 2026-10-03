import { useMemo, useRef, useState } from 'react';
import { Check, Trophy, Volume2, VolumeX, X, Zap, Target } from 'lucide-react';
import type { Card, Rating } from '../types';
import { RATING_LABEL, calcXp, formatInterval, previewInterval } from '../lib/srs';
import { isAnswerCorrect, shuffle, type SessionItem, type SessionReason } from '../lib/session';
import { isSoundOn, setSoundOn, sfx } from '../lib/sound';

interface Props {
  items: SessionItem[];
  allCards: Card[];
  onRecord: (cardId: string, rating: Rating, answeredCorrectly: boolean) => void;
  onExit: () => void;
}

const REASON: Record<SessionReason, { label: string; cls: string }> = {
  weak: { label: '苦手', cls: 'bg-red-100 text-red-600' },
  due: { label: '復習日', cls: 'bg-amber-100 text-amber-600' },
  new: { label: '新出', cls: 'bg-sky-100 text-sky-600' },
  extra: { label: '練習', cls: 'bg-slate-100 text-slate-500' },
};

const RATING_STYLE: Record<Rating, string> = {
  again: 'bg-red-500 border-red-700',
  hard: 'bg-orange-400 border-orange-600',
  good: 'bg-sky-500 border-sky-700',
  easy: 'bg-green-500 border-green-700',
};

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* 非対応環境は無視 */
  }
}

export default function Session({ items, allCards, onRecord, onExit }: Props) {
  const [queue, setQueue] = useState<SessionItem[]>(items);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'ask' | 'review' | 'done'>('ask');
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState({ xp: 0, correct: 0, total: 0 });
  const [sound, setSound] = useState(isSoundOn());
  const requeued = useRef(new Set<string>());

  const item = queue[index];
  const card = item ? (allCards.find((c) => c.id === item.card.id) ?? item.card) : null;

  const choices = useMemo(() => {
    if (!card || card.type !== 'vocab') return [];
    const others = shuffle(allCards.filter((c) => c.type === 'vocab' && c.answer !== card.answer))
      .slice(0, 3)
      .map((c) => c.answer);
    return shuffle([card.answer, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.card.id, index]);

  const canCheck = card?.type === 'vocab' ? selected !== null : input.trim().length > 0;

  const check = (skip = false) => {
    if (!card || phase !== 'ask') return;
    const ok = skip
      ? false
      : card.type === 'vocab'
        ? selected === card.answer
        : isAnswerCorrect(card, input);
    setCorrect(ok);
    setPhase('review');
    ok ? sfx.correct() : sfx.wrong();
  };

  const rate = (rating: Rating) => {
    if (!item || !card || correct === null) return;
    onRecord(card.id, rating, correct);
    sfx.tap();
    setResult((r) => ({
      xp: r.xp + calcXp(rating, correct),
      correct: r.correct + (correct ? 1 : 0),
      total: r.total + 1,
    }));

    let nextQueue = queue;
    if (rating === 'again' && !requeued.current.has(card.id)) {
      requeued.current.add(card.id);
      nextQueue = [...queue, item];
      setQueue(nextQueue);
    }
    if (index + 1 >= nextQueue.length) {
      setPhase('done');
      sfx.complete();
    } else {
      setIndex(index + 1);
      setPhase('ask');
      setSelected(null);
      setInput('');
      setCorrect(null);
    }
  };

  // ---------- 結果画面 ----------
  if (phase === 'done') {
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
        <button
          onClick={onExit}
          className="mt-10 w-full max-w-sm rounded-2xl border-b-4 border-green-700 bg-green-500 py-3.5 text-lg font-black text-white active:translate-y-0.5 active:border-b-2"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  if (!card || !item) return null;
  const reason = REASON[item.reason];
  const progress = ((index + (phase === 'review' ? 1 : 0)) / queue.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* 上部バー */}
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-4">
        <button onClick={onExit} className="text-slate-400 hover:text-slate-600" aria-label="終了">
          <X className="h-7 w-7" />
        </button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className="relative h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}>
            <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/40" />
          </div>
        </div>
        <button
          onClick={() => {
            setSoundOn(!sound);
            setSound(!sound);
          }}
          className="text-slate-400 hover:text-slate-600"
          aria-label="効果音の切り替え"
        >
          {sound ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </button>
      </div>

      {/* 問題エリア */}
      <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-4 pb-72">
        <div className="mb-3 flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${reason.cls}`}>{reason.label}</span>
          <span className="text-xs font-extrabold text-slate-400">
            {card.type === 'vocab' ? '英単語' : '瞬間英作文'}・{card.category}
          </span>
        </div>
        <h2 className="mb-5 text-xl font-black text-slate-700">
          {card.type === 'vocab' ? '英語で正しいのはどれ？' : '英語にしてみよう'}
        </h2>

        <div
          key={`${index}-${phase === 'review' ? correct : 'q'}`}
          className={`mb-6 flex items-start gap-3 ${phase === 'review' ? (correct ? 'animate-pop' : 'animate-shake') : ''}`}
        >
          <div className="text-5xl">🦉</div>
          <div className="relative rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xl font-extrabold text-slate-700">
            {card.prompt}
            <span className="absolute -left-[7px] top-5 h-3 w-3 rotate-45 border-b-2 border-l-2 border-slate-200 bg-white" />
          </div>
        </div>

        {card.type === 'vocab' ? (
          <div className="grid gap-3">
            {choices.map((c, i) => {
              const isSel = selected === c;
              const reveal = phase === 'review';
              const cls = reveal
                ? c === card.answer
                  ? 'border-green-500 bg-green-100 text-green-700'
                  : isSel
                    ? 'border-red-500 bg-red-100 text-red-600'
                    : 'border-slate-200 text-slate-400'
                : isSel
                  ? 'border-sky-400 bg-sky-100 text-sky-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50';
              return (
                <button
                  key={c}
                  disabled={reveal}
                  onClick={() => {
                    setSelected(c);
                    sfx.tap();
                  }}
                  className={`flex items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left text-lg font-extrabold transition active:translate-y-0.5 active:border-b-2 ${cls}`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-current text-sm">{i + 1}</span>
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            autoFocus
            rows={3}
            value={input}
            disabled={phase === 'review'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canCheck) check();
              }
            }}
            placeholder="英語で入力…"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            className={`w-full resize-none rounded-2xl border-2 p-4 text-lg font-bold outline-none ${
              phase === 'review'
                ? correct
                  ? 'border-green-500 bg-green-100 text-green-700'
                  : 'border-red-500 bg-red-100 text-red-600'
                : 'border-slate-200 bg-slate-50 focus:border-sky-400'
            }`}
          />
        )}
      </div>

      {/* 下部: チェックボタン */}
      {phase === 'ask' && (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-slate-200 bg-white p-4">
          <div className="mx-auto flex max-w-xl gap-3">
            <button
              onClick={() => check(true)}
              className="rounded-2xl border-2 border-b-4 border-slate-200 px-5 py-3.5 font-black text-slate-400 active:translate-y-0.5 active:border-b-2"
            >
              わからない
            </button>
            <button
              onClick={() => check()}
              disabled={!canCheck}
              className="flex-1 rounded-2xl border-b-4 border-green-700 bg-green-500 py-3.5 text-lg font-black text-white transition active:translate-y-0.5 active:border-b-2 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
            >
              チェック
            </button>
          </div>
        </div>
      )}

      {/* 下部: 判定 + 自己評価シート（SRS連動） */}
      {phase === 'review' && correct !== null && (
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
              <button onClick={() => speak(card.answer)} className="rounded-full p-1.5 hover:bg-white/60" aria-label="発音を聞く">
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
            <p className={`mt-1 text-sm font-bold ${correct ? 'text-green-700/80' : 'text-red-700/80'}`}>{card.explanation}</p>

            <div className="mb-2 mt-4 text-xs font-extrabold text-slate-500">どれくらい覚えていた？</div>
            <div className="grid grid-cols-4 gap-2">
              {(['again', 'hard', 'good', 'easy'] as Rating[]).map((r) => {
                const disabled = !correct && (r === 'good' || r === 'easy');
                return (
                  <button
                    key={r}
                    disabled={disabled}
                    onClick={() => rate(r)}
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
      )}
    </div>
  );
}
