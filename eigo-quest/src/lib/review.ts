import type { Card, Rating } from '../types';

/** 復習リストから外れるのに必要な連続正解数 */
export const REVIEW_CLEAR_STREAK = 3;

/** 不正解・「わからない」・自己評価「もう一度」「難しい」は、復習リストに入れる */
export const isMissed = (rating: Rating, answeredCorrectly: boolean) =>
  !answeredCorrectly || rating === 'again' || rating === 'hard';

/**
 * 回答結果を復習リストに反映する（純粋関数）。
 *  - isMissed に当たる回答 → 復習リストに入る（連続正解は0に戻る）
 *  - 復習リスト内の問題に正解（「普通」「簡単」） → 連続正解 +1。REVIEW_CLEAR_STREAK 回続くとリストから外れる
 */
export function applyReviewResult(card: Card, rating: Rating, answeredCorrectly: boolean, today: string): Card {
  if (isMissed(rating, answeredCorrectly)) {
    return { ...card, inReviewList: true, reviewStreak: 0, missCount: card.missCount + 1, missedAt: today };
  }
  if (!card.inReviewList) return card;
  const reviewStreak = card.reviewStreak + 1;
  return reviewStreak >= REVIEW_CLEAR_STREAK
    ? { ...card, inReviewList: false, reviewStreak: 0 }
    : { ...card, reviewStreak };
}
