import { useCallback, useEffect, useState } from 'react';
import type { AppData, Card, Rating, ReviewLog, StudyPlan } from '../types';
import { createInitialCards } from '../data/decks';
import { calcNextReview, calcXp, initialSrsState, todayStr } from './srs';
import { applyReviewResult } from './review';
import { generateDemoData } from './demo';
import { readJson, writePref } from './storage';

const KEY = 'eigo-quest:v1';

/** 保存データから引き継ぐ学習状態のキー（SRS + 復習リスト） */
const PROGRESS_KEYS = Object.keys(initialSrsState()) as (keyof ReturnType<typeof initialSrsState>)[];

function load(): AppData {
  const seed = createInitialCards();
  const parsed = readJson<AppData>(KEY);
  if (parsed?.version === 1 && Array.isArray(parsed.cards) && Array.isArray(parsed.logs)) {
    const existing = new Map(parsed.cards.map((c) => [c.id, c]));
    // 問題の内容は最新のデータ(seed)を使い、学習の進み具合だけ保存データから引き継ぐ。
    // 古い保存データに無い項目（復習リストなど）は初期値のまま。
    const merged = seed.map((s) => {
      const e = existing.get(s.id) as Partial<Card> | undefined;
      if (!e) return s;
      const progress = Object.fromEntries(PROGRESS_KEYS.map((k) => [k, e[k] ?? s[k]]));
      return { ...s, ...progress } as Card;
    });
    return { version: 1, cards: merged, logs: parsed.logs, plan: parsed.plan ?? null };
  }
  // 未保存・破損データは初期化
  return { version: 1, cards: seed, logs: [], plan: null };
}

export function useStore() {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => writePref(KEY, JSON.stringify(data)), [data]);

  /** 1回答を記録: SRS更新 + 復習リスト更新 + 履歴追加 */
  const answerCard = useCallback((cardId: string, rating: Rating, answeredCorrectly: boolean) => {
    setData((prev) => {
      const today = todayStr();
      const card = prev.cards.find((c) => c.id === cardId);
      if (!card) return prev;
      const next: Card = applyReviewResult(
        {
          ...calcNextReview(card, rating, today),
          totalAttempts: card.totalAttempts + 1,
          totalCorrect: card.totalCorrect + (answeredCorrectly ? 1 : 0),
        },
        rating,
        answeredCorrectly,
        today,
      );
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

  /** 復習リストから手動で外す */
  const removeFromReview = useCallback((cardId: string) => {
    setData((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, inReviewList: false, reviewStreak: 0 } : c)),
    }));
  }, []);

  const setPlan = useCallback((plan: StudyPlan | null) => setData((prev) => ({ ...prev, plan })), []);

  // 学習計画（試験日）はリセット・デモ投入でも残す
  const reset = useCallback(
    () => setData((prev) => ({ version: 1, cards: createInitialCards(), logs: [], plan: prev.plan })),
    [],
  );
  const loadDemo = useCallback(() => setData((prev) => ({ ...generateDemoData(), plan: prev.plan })), []);

  return {
    cards: data.cards,
    logs: data.logs,
    plan: data.plan ?? null,
    answerCard,
    removeFromReview,
    setPlan,
    reset,
    loadDemo,
  };
}
