import type { Card } from '../types';
import { diffDays, todayStr } from './srs';
import { errorRate, isDue, isWeak } from './stats';

export type SessionReason = 'weak' | 'due' | 'new' | 'extra';
export interface SessionItem {
  card: Card;
  reason: SessionReason;
}
export type SessionMode = 'weak' | 'stage';

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
 */
export function pickSessionCards(
  cards: Card[],
  opts: { mode: SessionMode; stageId?: string; size?: number; stageOrder?: Record<string, number>; today?: string },
): SessionItem[] {
  const { mode, stageId, stageOrder = {}, today = todayStr() } = opts;
  const size = opts.size ?? (mode === 'stage' ? 5 : 8);
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

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function isAnswerCorrect(card: Card, input: string): boolean {
  const n = normalize(input);
  if (!n) return false;
  return [card.answer, ...(card.alternatives ?? [])].some((a) => normalize(a) === n);
}