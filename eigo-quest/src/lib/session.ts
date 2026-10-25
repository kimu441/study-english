import type { Card } from '../types';
import { diffDays, todayStr } from './srs';
import { errorRate, isDue, isWeak } from './stats';

export type SessionReason = 'review' | 'weak' | 'due' | 'new' | 'extra';
export interface SessionItem {
  card: Card;
  reason: SessionReason;
}
export type SessionMode = 'weak' | 'stage' | 'review';

/** 1回のセッション（クエスト）で出題する問題数 */
export const SESSION_SIZE: Record<SessionMode, number> = { stage: 5, weak: 8, review: 10 };

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 弱点自動ピックアップ。
 *  1) 今日が復習日（期限切れが長いほど優先）  +100〜
 *  2) 過去の間違い率・忘却回数が高い          +最大60 + lapses*4
 *  3) 未学習の新出問題                        stage:+40 / weak:+15（若いステージ優先）
 * スコア上位から size 問を選び、出題順はシャッフルする。
 *
 * mode='review' は復習リスト専用: 間違えた回数が多い・最近間違えたものを優先する。
 */
export function pickSessionCards(
  cards: Card[],
  opts: { mode: SessionMode; stageId?: string; size?: number; stageOrder?: Record<string, number>; today?: string },
): SessionItem[] {
  const { mode, stageId, stageOrder = {}, today = todayStr() } = opts;
  const size = opts.size ?? SESSION_SIZE[mode];

  if (mode === 'review') {
    const picked = cards
      .filter((c) => c.inReviewList)
      .map((card) => {
        const sinceMiss = card.missedAt ? diffDays(today, card.missedAt) : 30;
        return { card, score: card.missCount * 10 + Math.max(0, 14 - sinceMiss) + Math.random() * 5 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, size)
      .map(({ card }) => ({ card, reason: 'review' as const }));
    return shuffle(picked);
  }
  const pool = mode === 'stage' && stageId ? cards.filter((c) => c.stageId === stageId) : cards;

  const scored = pool.map((card) => {
    const due = isDue(card, today);
    const isNew = card.totalAttempts === 0;
    const weak = isWeak(card);
    let score = Math.random() * 5;
    let reason: SessionReason = 'extra';

    if (due) {
      score += 100 + Math.min(30, diffDays(today, card.nextReviewDate) * 5);
      reason = 'due';
    }
    if (card.totalAttempts > 0) score += errorRate(card) * 60 + card.lapses * 4;
    if (weak) {
      score += 20;
      reason = 'weak';
    }
    if (isNew) {
      score += mode === 'stage' ? 40 : 15 - (stageOrder[card.stageId] ?? 0) * 2;
      reason = 'new';
    }
    return { card, reason, score };
  });

  const picked = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, size)
    .map(({ card, reason }) => ({ card, reason }));
  return shuffle(picked);
}

/** 短縮形は元の形に揃えて比較する（I'm = I am など） */
const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\bi'm\b/g, 'i am'],
  [/\blet's\b/g, 'let us'],
  [/\b(he|she|it|that|what|where|there|who|here)'s\b/g, '$1 is'],
  [/n't\b/g, ' not'],
  [/'re\b/g, ' are'],
  [/'ll\b/g, ' will'],
  [/'ve\b/g, ' have'],
  [/'d\b/g, ' would'],
  [/\bcan not\b/g, 'cannot'],
];

const normalize = (s: string) => {
  let n = s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of CONTRACTIONS) n = n.replace(re, to);
  return n.replace(/\s+/g, ' ');
};

export function isAnswerCorrect(card: Card, input: string): boolean {
  const n = normalize(input);
  if (!n) return false;
  return [card.answer, ...(card.alternatives ?? [])].some((a) => normalize(a) === n);
}