import { useCallback, useEffect, useState } from 'react';
import type { AppData, Card, CustomWord, Rating, ReviewLog, StudyPlan } from '../types';
import { createInitialCards } from '../data/decks';
import { calcNextReview, calcXp, initialSrsState, todayStr } from './srs';
import { applyReviewResult } from './review';
import { generateDemoData } from './demo';
import { readJson, writePref } from './storage';

const KEY = 'eigo-quest:v1';

/** 保存データから引き継ぐ学習状態のキー（SRS + 復習リスト） */
const PROGRESS_KEYS = Object.keys(initialSrsState()) as (keyof ReturnType<typeof initialSrsState>)[];

/**
 * 問題の内容は最新のデータ(seed)を使い、学習の進み具合だけ保存済みのカードから引き継ぐ。
 * 古い保存データに無い項目（復習リストなど）は初期値のまま。
 */
function mergeProgress(seed: Card[], saved: Card[]): Card[] {
  const existing = new Map(saved.map((c) => [c.id, c]));
  return seed.map((s) => {
    const e = existing.get(s.id) as Partial<Card> | undefined;
    if (!e) return s;
    const progress = Object.fromEntries(PROGRESS_KEYS.map((k) => [k, e[k] ?? s[k]]));
    return { ...s, ...progress } as Card;
  });
}

function load(): AppData {
  const parsed = readJson<AppData>(KEY);
  if (parsed?.version === 1 && Array.isArray(parsed.cards) && Array.isArray(parsed.logs)) {
    const customWords = parsed.customWords ?? [];
    const cards = mergeProgress(createInitialCards(customWords), parsed.cards);
    return { version: 1, cards, logs: parsed.logs, plan: parsed.plan ?? null, customWords };
  }
  // 未保存・破損データは初期化
  return { version: 1, cards: createInitialCards(), logs: [], plan: null, customWords: [] };
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

  /** マイ単語帳を丸ごと置き換える（残った単語の学習記録は引き継ぐ） */
  const saveCustomWords = useCallback((customWords: CustomWord[]) => {
    setData((prev) => ({ ...prev, customWords, cards: mergeProgress(createInitialCards(customWords), prev.cards) }));
  }, []);

  // 学習計画（試験日）とマイ単語帳はリセット・デモ投入でも残す
  const reset = useCallback(
    () =>
      setData((prev) => ({
        version: 1,
        cards: createInitialCards(prev.customWords),
        logs: [],
        plan: prev.plan,
        customWords: prev.customWords,
      })),
    [],
  );
  const loadDemo = useCallback(
    () => setData((prev) => ({ ...generateDemoData(prev.customWords), plan: prev.plan, customWords: prev.customWords })),
    [],
  );

  return {
    cards: data.cards,
    logs: data.logs,
    plan: data.plan ?? null,
    customWords: data.customWords ?? [],
    answerCard,
    removeFromReview,
    setPlan,
    saveCustomWords,
    reset,
    loadDemo,
  };
}
