import type { Card, CardStatus, ReviewLog, Stage } from '../types';
import { MASTER_INTERVAL, addDays, diffDays, getCardStatus } from './srs';

export const isDue = (c: Card, today: string) => c.totalAttempts > 0 && c.nextReviewDate <= today;

export const errorRate = (c: Card) => (c.totalAttempts === 0 ? 0 : 1 - c.totalCorrect / c.totalAttempts);

/** 苦手判定: 間違い率が高い or 忘却回数が多い */
export const isWeak = (c: Card) => c.totalAttempts > 0 && (errorRate(c) >= 0.3 || c.lapses >= 2);

export function dayStats(logs: ReviewLog[]): Record<string, { count: number; xp: number }> {
  const map: Record<string, { count: number; xp: number }> = {};
  for (const l of logs) {
    const e = (map[l.date] ??= { count: 0, xp: 0 });
    e.count += 1;
    e.xp += l.xp;
  }
  return map;
}

export function getStreak(logs: ReviewLog[], today: string) {
  const dates = new Set(logs.map((l) => l.date));
  let current = 0;
  let cursor: string | null = dates.has(today) ? today : dates.has(addDays(today, -1)) ? addDays(today, -1) : null;
  while (cursor && dates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...dates].sort()) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest, studiedToday: dates.has(today) };
}

export function statusBreakdown(cards: Card[]): Record<CardStatus, number> {
  const r: Record<CardStatus, number> = { new: 0, learning: 0, mastered: 0 };
  for (const c of cards) r[getCardStatus(c)] += 1;
  return r;
}

export interface StageState {
  stage: Stage;
  index: number;
  cards: Card[];
  status: 'locked' | 'available' | 'completed';
  /** ★の数: 全問学習済=1, 全問が連続正解中=2, 全問マスター=3 */
  stars: 0 | 1 | 2 | 3;
  studied: number;
  mastered: number;
}

export function getStageStates(stages: Stage[], cards: Card[]): StageState[] {
  const result: StageState[] = [];
  stages.forEach((stage, index) => {
    const sc = cards.filter((c) => c.stageId === stage.id);
    const studied = sc.filter((c) => c.totalAttempts > 0).length;
    const mastered = sc.filter((c) => c.interval >= MASTER_INTERVAL).length;
    const allStudied = sc.length > 0 && studied === sc.length;
    const allStreak = allStudied && sc.every((c) => c.repetitions >= 1);
    const stars = (allStudied ? 1 : 0) + (allStreak ? 1 : 0) + (allStreak && mastered === sc.length ? 1 : 0);
    const prev = result[index - 1];
    const unlocked = index === 0 || (prev !== undefined && prev.studied === prev.cards.length);
    result.push({
      stage,
      index,
      cards: sc,
      status: !unlocked ? 'locked' : allStreak ? 'completed' : 'available',
      stars: stars as 0 | 1 | 2 | 3,
      studied,
      mastered,
    });
  });
  return result;
}