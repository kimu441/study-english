import type { AppData, CustomWord, Rating, ReviewLog } from '../types';
import { createInitialCards } from '../data/decks';
import { addDays, calcXp, todayStr } from './srs';

/** ダッシュボードの見た目確認用デモデータ */
export function generateDemoData(customWords: CustomWord[] = []): AppData {
  const today = todayStr();
  const seen: Record<string, number> = { word: 0, composition: 0 };
  const cards = createInitialCards(customWords).map((c, i) => {
    // 単語は先頭30語、瞬間英作文は先頭15文を学習済みにする
    const k = seen[c.deck]++;
    if (k >= (c.deck === 'word' ? 30 : 15)) return c;
    const attempts = 3 + (i % 5);
    const wrong = i % 4 === 1 ? 2 : i % 4 === 2 ? 1 : 0;
    const mastered = i % 5 === 4;
    const interval = mastered ? 28 : [1, 3, 7, 12][i % 4];
    return {
      ...c,
      interval,
      repetitions: mastered ? 4 : 1 + (i % 3),
      easeFactor: Math.round((2.5 - wrong * 0.15) * 100) / 100,
      lapses: wrong,
      totalAttempts: attempts,
      totalCorrect: attempts - wrong,
      lastReviewedAt: addDays(today, -1),
      nextReviewDate: i % 3 === 0 ? addDays(today, -(i % 2)) : addDays(today, (i % 6) + 1),
      missCount: wrong,
      inReviewList: wrong > 0,
      reviewStreak: wrong > 0 ? i % 3 : 0,
      missedAt: wrong > 0 ? addDays(today, -(i % 7)) : null,
    };
  });

  const studied = cards.filter((c) => c.totalAttempts > 0);
  const ratings: Rating[] = ['again', 'hard', 'good', 'good', 'easy'];
  const logs: ReviewLog[] = [];
  for (let d = 0; d < 112; d++) {
    if (d === 5) continue; // 連続記録が途切れた日
    if (d > 5 && Math.random() > 0.6) continue;
    const date = addDays(today, -d);
    const n = 3 + Math.floor(Math.random() * 11);
    for (let k = 0; k < n; k++) {
      const card = studied[Math.floor(Math.random() * studied.length)];
      const rating = ratings[Math.floor(Math.random() * ratings.length)];
      const correct = rating !== 'again';
      logs.push({
        id: `demo-${d}-${k}`,
        cardId: card.id,
        date,
        timestamp: new Date(`${date}T12:00:00`).getTime() + k * 60000,
        rating,
        correct,
        xp: calcXp(rating, correct),
        prevInterval: 1,
        newInterval: 3,
      });
    }
  }
  return { version: 1, cards, logs };
}
