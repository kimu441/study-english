import type { Card, CardStatus, Rating } from '../types';

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL = 365;
/** 「マスター済」とみなす間隔（日） */
export const MASTER_INTERVAL = 21;

// ---------- 日付ユーティリティ（ローカル日付 YYYY-MM-DD） ----------
const pad = (n: number) => String(n).padStart(2, '0');
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
}

/** a - b を日数で返す */
export function diffDays(a: string, b: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((p(a) - p(b)) / 86400000);
}

// ---------- 表示用 ----------
export const RATING_LABEL: Record<Rating, string> = {
  again: 'もう一度',
  hard: '難しい',
  good: '普通',
  easy: '簡単',
};

export function formatInterval(days: number): string {
  if (days <= 1) return '1日後';
  if (days < 30) return `${days}日後`;
  if (days < 365) return `約${Math.round(days / 30)}ヶ月後`;
  return '約1年後';
}

// ---------- SRS 本体（SM-2 簡易版） ----------
/**
 * 自己評価から次回復習日・間隔・易しさ係数・連続正解回数を更新した新しいカードを返す（純粋関数）。
 *
 *  again: 連続正解を0に戻し、翌日に再出題。易しさ係数を -0.20
 *  hard : 間隔を約1.2倍。易しさ係数を -0.15
 *  good : 1回目=1日 → 2回目=3日 → 以降 前回間隔 × 易しさ係数
 *  easy : 1回目=3日 → 2回目=7日 → 以降 前回間隔 × 易しさ係数 × 1.3。易しさ係数を +0.15
 */
export function calcNextReview(card: Card, rating: Rating, today: string = todayStr()): Card {
  let { interval, easeFactor, repetitions, lapses } = card;

  switch (rating) {
    case 'again':
      repetitions = 0;
      lapses += 1;
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
      interval = 1;
      break;
    case 'hard':
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
      interval = repetitions === 0 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2));
      repetitions += 1;
      break;
    case 'good':
      interval = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(interval * easeFactor);
      repetitions += 1;
      break;
    case 'easy':
      easeFactor += 0.15;
      interval =
        repetitions === 0 ? 3 : repetitions === 1 ? 7 : Math.round(interval * easeFactor * 1.3);
      repetitions += 1;
      break;
  }

  interval = Math.min(MAX_INTERVAL, Math.max(1, interval));

  return {
    ...card,
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100,
    repetitions,
    lapses,
    nextReviewDate: addDays(today, interval),
    lastReviewedAt: today,
  };
}

/** ボタン下に「◯日後」と表示するためのプレビュー */
export function previewInterval(card: Card, rating: Rating): number {
  return calcNextReview(card, rating).interval;
}

/** 獲得XP */
export function calcXp(rating: Rating, answeredCorrectly: boolean): number {
  if (!answeredCorrectly) return 2;
  return rating === 'easy' ? 15 : rating === 'good' ? 12 : 10;
}

export function getCardStatus(card: Card): CardStatus {
  if (card.totalAttempts === 0) return 'new';
  if (card.interval >= MASTER_INTERVAL && card.repetitions >= 3) return 'mastered';
  return 'learning';
}

/** 新規カードの初期SRS状態 */
export const initialSrsState = () => ({
  interval: 0,
  easeFactor: DEFAULT_EASE,
  repetitions: 0,
  nextReviewDate: todayStr(),
  lapses: 0,
  totalAttempts: 0,
  totalCorrect: 0,
  lastReviewedAt: null as string | null,
});