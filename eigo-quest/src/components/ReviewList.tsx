import { useMemo, useState } from 'react';
import { BookmarkX, Play, Volume2 } from 'lucide-react';
import type { Card, Deck } from '../types';
import Segmented from './ui/Segmented';
import { DECK_META, LEVEL_LABEL } from '../data/decks';
import { REVIEW_CLEAR_STREAK } from '../lib/review';
import { speak } from '../lib/sound';

interface Props {
  cards: Card[];
  onStart: (pool: Card[]) => void;
  onRemove: (cardId: string) => void;
}

type Filter = 'all' | Deck;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'word', label: DECK_META.word.short },
  { id: 'composition', label: DECK_META.composition.label },
];

/** 復習リスト: 一度でも間違えた・わからなかった問題の一覧 */
export default function ReviewList({ cards, onStart, onRemove }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const listed = useMemo(
    () =>
      cards
        .filter((c) => c.inReviewList)
        .sort((a, b) => (b.missedAt ?? '').localeCompare(a.missedAt ?? '') || b.missCount - a.missCount),
    [cards],
  );
  const shown = filter === 'all' ? listed : listed.filter((c) => c.deck === filter);
  const count = (f: Filter) => (f === 'all' ? listed.length : listed.filter((c) => c.deck === f).length);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border-b-8 border-rose-700 bg-rose-500 p-5 text-white">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-3xl bg-white/20">
            <span className="text-5xl font-black leading-none">{shown.length}</span>
            <span className="mt-1 text-xs font-extrabold">問</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black leading-tight">復習リスト</h2>
            <p className="mt-1 text-sm font-bold text-white/85">
              間違えた・わからなかった問題が入ります。{REVIEW_CLEAR_STREAK}回連続で正解するとリストから外れます。
            </p>
          </div>
        </div>
        <button
          onClick={() => onStart(shown)}
          disabled={shown.length === 0}
          className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-slate-300 bg-white py-3.5 text-lg font-black text-rose-600 transition active:translate-y-0.5 active:border-b-2 disabled:opacity-60"
        >
          <Play className="h-5 w-5 fill-rose-600" />
          {shown.length === 0 ? '復習する問題はありません' : `復習をはじめる（最大10問）`}
        </button>
      </section>

      <Segmented
        options={FILTERS.map((f) => ({
          id: f.id,
          label: (
            <>
              {f.label}
              <span className="ml-1 text-xs">{count(f.id)}</span>
            </>
          ),
        }))}
        value={filter}
        onChange={setFilter}
        activeClass="text-rose-600"
      />

      {shown.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
          まだありません。単語や瞬間英作文で間違えたり「わからない」を押したりすると、ここに追加されます。
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 p-3">
              <button
                onClick={() => speak(c.answer)}
                className="shrink-0 rounded-full p-1.5 text-sky-500 hover:bg-sky-50"
                aria-label="発音を聞く"
              >
                <Volume2 className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-700">{c.answer}</div>
                <div className="text-sm font-bold text-slate-500">{c.prompt}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-extrabold text-slate-400">
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-600">{LEVEL_LABEL[c.level]}</span>
                  <span>{DECK_META[c.deck].short}・{c.category}</span>
                  <span className="text-rose-500">ミス {c.missCount}回</span>
                  <span className="flex items-center gap-0.5" title="連続正解">
                    {Array.from({ length: REVIEW_CLEAR_STREAK }, (_, k) => (
                      <span key={k} className={`h-2 w-2 rounded-full ${k < c.reviewStreak ? 'bg-green-500' : 'bg-slate-200'}`} />
                    ))}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemove(c.id)}
                className="shrink-0 rounded-xl p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                aria-label="復習リストから外す"
                title="復習リストから外す"
              >
                <BookmarkX className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
