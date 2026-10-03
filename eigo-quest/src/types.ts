/** 問題の種類: 英単語（4択） / 瞬間英作文（入力） */
export type CardType = 'vocab' | 'speaking';

/** 自己評価（SRSへの入力） */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

/** 学習ステータス（ダッシュボードの集計用） */
export type CardStatus = 'new' | 'learning' | 'mastered';

/** 単語・問題カード（問題内容 + SRSの状態） */
export interface Card {
  id: string;
  type: CardType;
  stageId: string;
  category: string;
  /** 問題文（日本語） */
  prompt: string;
  /** 正解（英語） */
  answer: string;
  /** 入力式で正解とみなす別解 */
  alternatives?: string[];
  explanation: string;

  // ---- SRS の状態 ----
  /** 復習間隔（日） */
  interval: number;
  /** 易しさ係数（SM-2系。大きいほど間隔が伸びやすい） */
  easeFactor: number;
  /** 連続正解回数 */
  repetitions: number;
  /** 次回復習日 (YYYY-MM-DD, ローカル日付) */
  nextReviewDate: string;
  /** 忘却（もう一度を選んだ）回数 */
  lapses: number;
  totalAttempts: number;
  totalCorrect: number;
  lastReviewedAt: string | null;
}

/** 学習履歴（1回の回答につき1件） */
export interface ReviewLog {
  id: string;
  cardId: string;
  /** YYYY-MM-DD */
  date: string;
  timestamp: number;
  rating: Rating;
  /** 実際の回答が正解だったか */
  correct: boolean;
  xp: number;
  prevInterval: number;
  newInterval: number;
}

export interface Stage {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

/** LocalStorage に保存するデータ全体 */
export interface AppData {
  version: 1;
  cards: Card[];
  logs: ReviewLog[];
}