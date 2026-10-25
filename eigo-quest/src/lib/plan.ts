import type { Card, ReviewLog, ScopeKey, StudyPlan } from '../types';
import { DECKS, LEVELS } from '../data/decks';
import { addDays, diffDays } from './srs';
import { isDue } from './stats';
import { SESSION_SIZE } from './session';

/** 1クエスト = ステージのレッスン1回（新出 5 問） */
export const QUEST_SIZE = SESSION_SIZE.stage;
/** 復習のクエスト1回あたりの問題数 */
const REVIEW_QUEST_SIZE = SESSION_SIZE.weak;
/** ペース判定に使う直近の日数 */
const PACE_WINDOW = 7;

export const ALL_SCOPES: ScopeKey[] = DECKS.flatMap((d) => LEVELS.map((l) => `${d}:${l}` as const));
export const scopeOf = (c: Card): ScopeKey => `${c.deck}:${c.level}`;

/** 各カードを初めて学習した日（cardId → YYYY-MM-DD） */
export function firstStudyDates(logs: ReviewLog[]): Map<string, string> {
  const first = new Map<string, string>();
  for (const l of logs) {
    const d = first.get(l.cardId);
    if (!d || l.date < d) first.set(l.cardId, l.date);
  }
  return first;
}

export type DayKind = 'past' | 'learn' | 'review' | 'exam' | 'after';

export interface DayPlan {
  date: string;
  kind: DayKind;
  /** 予定している新出の数（今日以降の学習日） */
  plannedNew: number;
  /** 実際に初めて学習した数（今日以前） */
  actualNew: number;
  /** 回答した問題の数（今日以前） */
  answers: number;
}

export interface ScopeProgress {
  key: ScopeKey;
  total: number;
  done: number;
}

export interface PlanSummary {
  /** 今日から試験前日までの日数（今日を含む）。0 なら今日が試験日、負なら試験日を過ぎている */
  daysLeft: number;
  /** 新出を進める最終日（この翌日から総復習期間） */
  learnEndDate: string;
  inFinalReview: boolean;
  scopes: ScopeProgress[];
  total: number;
  done: number;
  remaining: number;
  /** 1日あたりの新出の目標数（今日の分を含めて残りを均等に割る） */
  dailyNew: number;
  /** 1日あたりの新出クエスト数 */
  dailyQuests: number;
  /** 今日初めて学習した数 */
  todayNew: number;
  /** 今日復習日の問題数（範囲内） */
  dueToday: number;
  reviewQuests: number;
  /** 直近 PACE_WINDOW 日の1日平均の新出数（今日を除く） */
  recentPace: number;
  /** 直近のペースで続けたときに全範囲を学習し終える日 */
  projectedFinish: string | null;
}

/**
 * 試験日までの学習計画を計算する（純粋関数）。
 *  - 試験前日から plan.reviewDays 日間は総復習期間とし、新出はそれまでに終える
 *  - 残りの新出を学習日数で均等に割り、1日の目標数を出す。今日学習した分は今日の目標に含めるので、
 *    1日の途中で目標数が変わらない
 *  - 総復習期間に入っても新出が残っていれば、試験前日までで割り直す
 */
export function computePlan(cards: Card[], logs: ReviewLog[], plan: StudyPlan, today: string): PlanSummary {
  const scope = new Set(plan.scope);
  const inScope = cards.filter((c) => scope.has(scopeOf(c)));
  const first = firstStudyDates(logs);

  const scopes = plan.scope.map((key) => {
    const sc = inScope.filter((c) => scopeOf(c) === key);
    return { key, total: sc.length, done: sc.filter((c) => c.totalAttempts > 0).length };
  });
  const total = inScope.length;
  const done = inScope.filter((c) => c.totalAttempts > 0).length;
  const remaining = total - done;
  const todayNew = inScope.filter((c) => first.get(c.id) === today).length;

  const daysLeft = diffDays(plan.examDate, today);
  const learnDays = daysLeft - plan.reviewDays;
  const learnEndDate = addDays(plan.examDate, -plan.reviewDays - 1);
  const spreadDays = learnDays > 0 ? learnDays : daysLeft;
  const remainingAtStart = remaining + todayNew;
  const dailyNew = remainingAtStart === 0 ? 0 : spreadDays > 0 ? Math.ceil(remainingAtStart / spreadDays) : remainingAtStart;

  const dueToday = inScope.filter((c) => isDue(c, today)).length;

  const windowStart = addDays(today, -PACE_WINDOW);
  const recentNew = inScope.filter((c) => {
    const d = first.get(c.id);
    return !!d && d >= windowStart && d < today;
  }).length;
  const recentPace = recentNew / PACE_WINDOW;
  const pace = Math.max(recentPace, todayNew);
  const projectedFinish = remaining === 0 ? today : pace > 0 ? addDays(today, Math.ceil(remaining / pace)) : null;

  return {
    daysLeft,
    learnEndDate,
    inFinalReview: daysLeft > 0 && learnDays <= 0,
    scopes,
    total,
    done,
    remaining,
    dailyNew,
    dailyQuests: Math.ceil(dailyNew / QUEST_SIZE),
    todayNew,
    dueToday,
    reviewQuests: Math.ceil(dueToday / REVIEW_QUEST_SIZE),
    recentPace,
    projectedFinish,
  };
}

/** カレンダー表示用に、指定した日付それぞれの予定と実績を返す */
export function planDays(
  dates: string[],
  summary: PlanSummary,
  plan: StudyPlan,
  cards: Card[],
  logs: ReviewLog[],
  today: string,
): DayPlan[] {
  const scope = new Set(plan.scope);
  const inScope = new Set(cards.filter((c) => scope.has(scopeOf(c))).map((c) => c.id));
  const newByDate = new Map<string, number>();
  for (const [id, d] of firstStudyDates(logs)) if (inScope.has(id)) newByDate.set(d, (newByDate.get(d) ?? 0) + 1);
  const answersByDate = new Map<string, number>();
  for (const l of logs) answersByDate.set(l.date, (answersByDate.get(l.date) ?? 0) + 1);

  // 今日から新出を dailyNew ずつ割り当てていく（今日の分は今日学習した数も含む）
  const remainingAtStart = summary.remaining + summary.todayNew;
  const learnEnd = summary.inFinalReview ? addDays(plan.examDate, -1) : summary.learnEndDate;

  return dates.map((date) => {
    const base = { date, plannedNew: 0, actualNew: newByDate.get(date) ?? 0, answers: answersByDate.get(date) ?? 0 };
    if (date === plan.examDate) return { ...base, kind: 'exam' };
    if (date > plan.examDate) return { ...base, kind: 'after' };
    if (date < today) return { ...base, kind: 'past' };
    if (date > learnEnd) return { ...base, kind: 'review' };
    const i = diffDays(date, today);
    const plannedNew = Math.max(0, Math.min(summary.dailyNew, remainingAtStart - i * summary.dailyNew));
    return { ...base, kind: 'learn', plannedNew };
  });
}
