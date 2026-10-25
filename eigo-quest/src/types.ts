/** 問題の種類: 英単語（4択） / 瞬間英作文（入力） */
export type CardType = 'vocab' | 'speaking';

/** 自己評価（SRSへの入力） */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

/** 問題のグループ: TOEIC Bridge 単語 / 瞬間英作文 */
export type Deck = 'word' | 'composition';

/** 単語レベル: 中学 / 高校 */
export type WordLevel = 'junior' | 'senior';

/** 瞬間英作文の解答方法: 入力 / 口頭（答えを見て自己判定） */
export type ComposeMode = 'type' | 'oral';

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

  deck: Deck;
  /** レベル（中学 / 高校） */
  level: WordLevel;
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

  // ---- 復習リスト ----
  /** 間違えた・わからなかった回数 */
  missCount: number;
  /** 復習リストに入っているか（一度でも間違える / わからない で入る） */
  inReviewList: boolean;
  /** 復習リストに入ってからの連続正解数（REVIEW_CLEAR_STREAK に達するとリストから外れる） */
  reviewStreak: number;
  /** 最後に間違えた日 (YYYY-MM-DD) */
  missedAt: string | null;
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
  deck: Deck;
  level: WordLevel;
  title: string;
  description: string;
  emoji: string;
}

/** 学習範囲の単位（例: 'word:junior' = 単語・中学レベル） */
export type ScopeKey = `${Deck}:${WordLevel}`;

/** 試験日に向けた学習計画 */
export interface StudyPlan {
  /** 試験日 (YYYY-MM-DD) */
  examDate: string;
  /** 試験日までに網羅したい範囲 */
  scope: ScopeKey[];
  /** 試験直前の総復習期間（日）。この期間は新出を入れない */
  reviewDays: number;
}

/** LocalStorage に保存するデータ全体 */
export interface AppData {
  version: 1;
  cards: Card[];
  logs: ReviewLog[];
  /** 未設定なら null（古い保存データには項目自体が無い） */
  plan?: StudyPlan | null;
}