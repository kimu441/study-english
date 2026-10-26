import { useMemo, useState } from 'react';
import { BookOpen, Headphones, Keyboard, Mic } from 'lucide-react';
import type { BookId, Card, ComposeMode, CustomWord, Deck, Stage, WordLevel, WordMode } from '../types';
import ReviewWidget from './ReviewWidget';
import PathMap from './PathMap';
import CustomWordsPanel from './CustomWordsPanel';
import ModePicker, { type ModeOption } from './ModePicker';
import VoicePicker from './VoicePicker';
import TodayGoal from './plan/TodayGoal';
import Segmented from './ui/Segmented';
import { BOOK_META, DECK_META, LEVELS, LEVEL_LABEL, WORD_BOOKS } from '../data/decks';
import { todayStr } from '../lib/srs';
import { getStageStates, isDue, isWeak } from '../lib/stats';
import type { SessionMode } from '../lib/session';
import { readPref, writePref } from '../lib/storage';
import { scopeKey, stageGoal, type PlanSummary } from '../lib/plan';

interface Props {
  deck: Deck;
  stages: Stage[];
  cards: Card[];
  onStart: (pool: Card[], mode: SessionMode, stageId?: string) => void;
  composeMode?: ComposeMode;
  onComposeModeChange?: (m: ComposeMode) => void;
  /** 単語タブのみ: 解き方 */
  wordMode?: WordMode;
  onWordModeChange?: (m: WordMode) => void;
  /** 単語タブのみ: マイ単語帳 */
  customWords?: CustomWord[];
  onSaveCustomWords?: (words: CustomWord[]) => void;
  /** 学習計画（未設定なら null） */
  planSummary: PlanSummary | null;
  onOpenPlan: () => void;
}

const LEVEL_KEY = (deck: Deck) => `eigo-quest:level:${deck}`;
const BOOK_KEY = 'eigo-quest:book';

function loadLevel(deck: Deck): WordLevel {
  return readPref(LEVEL_KEY(deck)) === 'senior' ? 'senior' : 'junior';
}

function loadBook(): BookId {
  const v = readPref(BOOK_KEY);
  return WORD_BOOKS.find((b) => b === v) ?? 'toeic';
}

const BOOK_OPTIONS = WORD_BOOKS.map((b) => ({ id: b, label: BOOK_META[b].label }));

const WORD_MODES: ModeOption<WordMode>[] = [
  { id: 'read', label: '通常', sub: '英⇔日の4択', Icon: BookOpen },
  { id: 'listen', label: 'リスニング', sub: '音声を聞いて意味を選ぶ', Icon: Headphones },
];

const COMPOSE_MODES: ModeOption<ComposeMode>[] = [
  { id: 'oral', label: '口頭で言う', sub: '答えを見て自己判定', Icon: Mic },
  { id: 'type', label: '入力する', sub: '英文をタイピング', Icon: Keyboard },
];

/** 単語 / 瞬間英作文 それぞれのホーム画面（単語帳・レベル切り替え + 今日の復習 + ステージマップ） */
export default function TrackHome({
  deck,
  stages,
  cards,
  onStart,
  composeMode,
  onComposeModeChange,
  wordMode,
  onWordModeChange,
  customWords = [],
  onSaveCustomWords,
  planSummary,
  onOpenPlan,
}: Props) {
  const [book, setBook] = useState<BookId>(() => (deck === 'word' ? loadBook() : 'toeic'));
  const [savedLevel, setLevel] = useState<WordLevel>(() => loadLevel(deck));
  const today = todayStr();

  const bookStages = useMemo(() => stages.filter((s) => s.book === book), [stages, book]);
  // レベルが1つしかない単語帳（高校必修800・マイ単語帳）ではレベル切り替えを出さない
  const levels = LEVELS.filter((l) => bookStages.some((s) => s.level === l));
  const level = levels.includes(savedLevel) ? savedLevel : (levels[0] ?? savedLevel);

  const changeBook = (b: BookId) => {
    setBook(b);
    writePref(BOOK_KEY, b);
  };
  const changeLevel = (l: WordLevel) => {
    setLevel(l);
    writePref(LEVEL_KEY(deck), l);
  };

  const levelStages = useMemo(() => bookStages.filter((s) => s.level === level), [bookStages, level]);
  const levelCards = useMemo(() => cards.filter((c) => c.book === book && c.level === level), [cards, book, level]);
  const states = useMemo(() => getStageStates(levelStages, levelCards), [levelStages, levelCards]);

  // 表示中の単語帳・レベルが学習計画のどの範囲にあたるか
  const scope = scopeKey(deck, book, level);
  const progress = planSummary?.scopes.find((s) => s.key === scope) ?? null;
  const goal = useMemo(() => (progress ? stageGoal(levelStages, levelCards, progress) : null), [progress, levelStages, levelCards]);

  const dueCount = levelCards.filter((c) => isDue(c, today)).length;
  const weakCount = levelCards.filter(isWeak).length;

  const startWeak = () => {
    // 未開放ステージの新出問題は弱点モードから除外
    const open = new Set(states.filter((s) => s.status !== 'locked').map((s) => s.stage.id));
    onStart(levelCards.filter((c) => open.has(c.stageId)), 'weak');
  };

  return (
    <>
      <div className="space-y-2">
        {deck === 'word' && <Segmented options={BOOK_OPTIONS} value={book} onChange={changeBook} activeClass="text-sky-600" />}
        {levels.length > 1 && (
          <Segmented options={levels.map((l) => ({ id: l, label: `${LEVEL_LABEL[l]}レベル` }))} value={level} onChange={changeLevel} />
        )}
        <p className="text-center text-xs font-extrabold text-slate-400">
          {deck === 'word' ? BOOK_META[book].note : 'TOEIC Bridge の場面で使う文'}
          {levels.length > 1 && `・${LEVEL_LABEL[level]}レベル`} 全{levelCards.length}
          {DECK_META[deck].unit}
        </p>
      </div>

      {book === 'custom' && onSaveCustomWords && <CustomWordsPanel words={customWords} onSave={onSaveCustomWords} />}

      {deck === 'word' && wordMode && onWordModeChange && (
        <>
          <ModePicker title="解き方" options={WORD_MODES} value={wordMode} onChange={onWordModeChange} />
          <VoicePicker />
        </>
      )}
      {deck === 'composition' && composeMode && onComposeModeChange && (
        <ModePicker title="解答方法" options={COMPOSE_MODES} value={composeMode} onChange={onComposeModeChange} />
      )}

      {levelCards.length > 0 && (
        <>
          {planSummary && (
            <TodayGoal summary={planSummary} progress={progress} goal={goal} unit={DECK_META[deck].unit} onOpenPlan={onOpenPlan} />
          )}
          <ReviewWidget dueCount={dueCount} weakCount={weakCount} onStart={startWeak} />
          <PathMap
            key={`${deck}-${book}-${level}`}
            states={states}
            goalStageId={progress && progress.todayNew < progress.dailyNew ? goal?.stage.id : undefined}
            onStart={(id) => onStart(levelCards, 'stage', id)}
          />
        </>
      )}
    </>
  );
}
