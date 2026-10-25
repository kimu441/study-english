import { useMemo, useRef, useState } from 'react';
import { Eye, Volume2, VolumeX, X } from 'lucide-react';
import type { Card, ComposeMode, Rating } from '../../types';
import { calcXp } from '../../lib/srs';
import { isAnswerCorrect, shuffle, type SessionItem, type SessionReason } from '../../lib/session';
import { isSoundOn, setSoundOn, sfx, speak } from '../../lib/sound';
import { DECK_META, LEVEL_LABEL, WORD_DIRECTION } from '../../data/decks';
import SessionResult, { type SessionTotals } from './SessionResult';
import AnswerSheet from './AnswerSheet';

interface Props {
  items: SessionItem[];
  allCards: Card[];
  onRecord: (cardId: string, rating: Rating, answeredCorrectly: boolean) => void;
  onExit: () => void;
  composeMode?: ComposeMode;
}

const REASON: Record<SessionReason, { label: string; cls: string }> = {
  review: { label: '復習リスト', cls: 'bg-rose-100 text-rose-600' },
  weak: { label: '苦手', cls: 'bg-red-100 text-red-600' },
  due: { label: '復習日', cls: 'bg-amber-100 text-amber-600' },
  new: { label: '新出', cls: 'bg-sky-100 text-sky-600' },
  extra: { label: '練習', cls: 'bg-slate-100 text-slate-500' },
};

export default function Session({ items, allCards, onRecord, onExit, composeMode = 'type' }: Props) {
  const [queue, setQueue] = useState<SessionItem[]>(items);
  const [index, setIndex] = useState(0);
  // reveal: 口頭モードで答えを見て、言えたかどうかを自己判定する段階
  const [phase, setPhase] = useState<'ask' | 'reveal' | 'review' | 'done'>('ask');
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<SessionTotals>({ xp: 0, correct: 0, total: 0, added: 0 });
  const [sound, setSound] = useState(isSoundOn());
  const requeued = useRef(new Set<string>());

  const item = queue[index];
  const card = item ? (allCards.find((c) => c.id === item.card.id) ?? item.card) : null;

  const oral = card?.type === 'speaking' && composeMode === 'oral';

  // 単語は出題の向きを切り替え可能（英→日 / 日→英）。瞬間英作文は常に 日→英
  const reverse = useMemo(() => {
    if (!card || card.type !== 'vocab') return false;
    if (WORD_DIRECTION === 'en-ja') return true;
    if (WORD_DIRECTION === 'ja-en') return false;
    return Math.random() < 0.5;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.card.id, index]);

  const correctText = card ? (reverse ? card.prompt : card.answer) : '';
  const questionText = card ? (reverse ? card.answer : card.prompt) : '';

  const choices = useMemo(() => {
    if (!card || card.type !== 'vocab') return [];
    const text = (c: Card) => (reverse ? c.prompt : c.answer);
    const pool = allCards.filter((c) => c.type === 'vocab' && text(c) !== correctText);
    // 同じステージの単語を優先して、紛らわしい選択肢にする
    const same = shuffle(pool.filter((c) => c.stageId === card.stageId));
    const rest = shuffle(pool.filter((c) => c.stageId !== card.stageId));
    const others = [...new Set([...same, ...rest].map(text))].slice(0, 3);
    return shuffle([correctText, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.card.id, index, reverse]);

  const canCheck = card?.type === 'vocab' ? selected !== null : input.trim().length > 0;

  const judge = (ok: boolean) => {
    setCorrect(ok);
    setPhase('review');
    ok ? sfx.correct() : sfx.wrong();
  };

  const check = (skip = false) => {
    if (!card || phase !== 'ask') return;
    if (oral && !skip) {
      setPhase('reveal');
      sfx.tap();
      return;
    }
    const ok = skip
      ? false
      : card.type === 'vocab'
        ? selected === correctText
        : isAnswerCorrect(card, input);
    judge(ok);
  };

  const rate = (rating: Rating) => {
    if (!item || !card || correct === null) return;
    onRecord(card.id, rating, correct);
    sfx.tap();
    const missed = !correct || rating === 'again';
    setResult((r) => ({
      xp: r.xp + calcXp(rating, correct),
      correct: r.correct + (correct ? 1 : 0),
      total: r.total + 1,
      added: r.added + (missed && !card.inReviewList ? 1 : 0),
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

  if (phase === 'done') return <SessionResult result={result} onExit={onExit} />;

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
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-600">
            {LEVEL_LABEL[card.level]}
          </span>
          {card.inReviewList && item.reason !== 'review' && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-600">復習リスト</span>
          )}
          <span className="truncate text-xs font-extrabold text-slate-400">
            {DECK_META[card.deck].label}・{card.category}
          </span>
        </div>
        <h2 className="mb-5 text-xl font-black text-slate-700">
          {card.type === 'vocab'
            ? reverse
              ? '日本語の意味はどれ？'
              : '英語で正しいのはどれ？'
            : oral
              ? '英語で言ってみよう（声に出して）'
              : '英語にしてみよう'}
        </h2>

        <div
          key={`${index}-${phase === 'review' ? correct : 'q'}`}
          className={`mb-6 flex items-start gap-3 ${phase === 'review' ? (correct ? 'animate-pop' : 'animate-shake') : ''}`}
        >
          <div className="text-5xl">🦉</div>
          <div className="relative flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xl font-extrabold text-slate-700">
            {questionText}
            {reverse && (
              <button onClick={() => speak(card.answer)} className="rounded-full p-1 text-sky-500 hover:bg-sky-50" aria-label="発音を聞く">
                <Volume2 className="h-5 w-5" />
              </button>
            )}
            <span className="absolute -left-[7px] top-5 h-3 w-3 rotate-45 border-b-2 border-l-2 border-slate-200 bg-white" />
          </div>
        </div>

        {card.type === 'vocab' ? (
          <div className="grid gap-3">
            {choices.map((c, i) => {
              const isSel = selected === c;
              const reveal = phase === 'review';
              const cls = reveal
                ? c === correctText
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
        ) : oral ? (
          phase === 'ask' ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              すぐに英語で言ってから「答えを見る」を押してください。
            </p>
          ) : (
            <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-4">
              <div className="text-xs font-extrabold text-sky-500">答え</div>
              <div className="mt-1 text-lg font-extrabold text-sky-700">{card.answer}</div>
            </div>
          )
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
              disabled={!oral && !canCheck}
              className="flex-1 rounded-2xl border-b-4 border-green-700 bg-green-500 py-3.5 text-lg font-black text-white transition active:translate-y-0.5 active:border-b-2 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {oral ? (
                <span className="flex items-center justify-center gap-2">
                  <Eye className="h-5 w-5" />
                  答えを見る
                </span>
              ) : (
                'チェック'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 下部: 口頭モードの自己判定 */}
      {phase === 'reveal' && (
        <div className="fixed inset-x-0 bottom-0 animate-slide-up border-t-2 border-slate-200 bg-white p-4 pb-6">
          <div className="mx-auto max-w-xl">
            <div className="mb-2 text-xs font-extrabold text-slate-500">正しく言えた？（だいたい同じ意味ならOK）</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => judge(false)}
                className="rounded-2xl border-b-4 border-red-700 bg-red-500 py-3.5 text-lg font-black text-white active:translate-y-0.5 active:border-b-2"
              >
                言えなかった
              </button>
              <button
                onClick={() => judge(true)}
                className="rounded-2xl border-b-4 border-green-700 bg-green-500 py-3.5 text-lg font-black text-white active:translate-y-0.5 active:border-b-2"
              >
                言えた
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'review' && correct !== null && <AnswerSheet card={card} correct={correct} onRate={rate} />}
    </div>
  );
}