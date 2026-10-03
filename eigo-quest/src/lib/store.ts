import { useCallback, useEffect, useState } from 'react';
import type { AppData, Card, Rating, ReviewLog } from '../types';
import { createInitialCards } from '../data/mockData';
import { calcNextReview, calcXp, todayStr } from './srs';
import { generateDemoData } from './demo';

const KEY = 'eigo-quest:v1';

function load(): AppData {
  const seed = createInitialCards();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.version === 1 && Array.isArray(parsed.cards) && Array.isArray(parsed.logs)) {
        // 新しく追加された問題があれば取り込む
        const existing = new Map(parsed.cards.map((c) => [c.id, c]));
              // 問題の内容は最新のデータ(seed)を使い、学習の進み具合(SRS状態)だけ保存データから引き継ぐ
        const merged = seed.map((s) => {
          const e = existing.get(s.id);
          return e
            ? {
                ...s,
                interval: e.interval,
                easeFactor: e.easeFactor,
                repetitions: e.repetitions,
                nextReviewDate: e.nextReviewDate,
                lapses: e.lapses,
                totalAttempts: e.totalAttempts,
                totalCorrect: e.totalCorrect,
                lastReviewedAt: e.lastReviewedAt,
              }
            : s;
        });
        return { version: 1, cards: merged, logs: parsed.logs };
      }
    }
  } catch {
    /* 破損データは初期化 */
  }
  return { version: 1, cards: seed, logs: [] };
}

export function useStore() {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* 容量超過などは無視 */
    }
  }, [data]);

  /** 1回答を記録: SRS更新 + 履歴追加 */
  const answerCard = useCallback((cardId: string, rating: Rating, answeredCorrectly: boolean) => {
    setData((prev) => {
      const today = todayStr();
      const card = prev.cards.find((c) => c.id === cardId);
      if (!card) return prev;
      const next: Card = {
        ...calcNextReview(card, rating, today),
        totalAttempts: card.totalAttempts + 1,
        totalCorrect: card.totalCorrect + (answeredCorrectly ? 1 : 0),
      };
      const log: ReviewLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cardId,
        date: today,
        timestamp: Date.now(),
        rating,
        correct: answeredCorrectly,
        xp: calcXp(rating, answeredCorrectly),
        prevInterval: card.interval,
        newInterval: next.interval,
      };
      return { ...prev, cards: prev.cards.map((c) => (c.id === cardId ? next : c)), logs: [...prev.logs, log] };
    });
  }, []);

  const reset = useCallback(() => setData({ version: 1, cards: createInitialCards(), logs: [] }), []);
  const loadDemo = useCallback(() => setData(generateDemoData()), []);

  return { cards: data.cards, logs: data.logs, answerCard, reset, loadDemo };
}