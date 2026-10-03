import type { AppData, Rating, ReviewLog } from '../types';
import { createInitialCards } from '../data/mockData';
import { addDays, calcXp, todayStr } from './srs';

/** ダッシュボードの見た目確認用デモデータ */
export function generateDemoData(): AppData {
  const today = todayStr();
  const cards = createInitialCards().map((c, i) => {
    if (i >= 15) return c; // ステージ4・5は未学習
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
