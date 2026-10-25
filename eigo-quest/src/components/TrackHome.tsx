import { useMemo, useState } from 'react';
import { Keyboard, Mic } from 'lucide-react';
import type { BookId, Card, ComposeMode, CustomWord, Deck, Stage, WordLevel } from '../types';
import ReviewWidget from './ReviewWidget';
import PathMap from './PathMap';
import CustomWordsPanel from './CustomWordsPanel';
import TodayGoal from './plan/TodayGoal';
import Segmented from './ui/Segmented';
import { BOOK_META, DECK_META, LEVELS, LEVEL_LABEL, WORD_BOOKS } from '../data/decks';
import { todayStr } from '../lib/srs';
import { getStageStates, isDue, isWeak } from '../lib/stats';
import type { SessionMode } from '../lib/session';
import { readPref, writePref } from '../lib/storage';
import { stageGoal, type PlanSummary } from '../lib/plan';

interface Props {
  deck: Deck;
  stages: Stage[];
  cards: Card[];
  onStart: (pool: Card[], mode: SessionMode, stageId?: string) => void;
  composeMode?: ComposeMode;
  onComposeModeChange?: (m: ComposeMode) => void;
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

/** 単語 / 瞬間英作文 それぞれのホーム画面（単語帳・レベル切り替え + 今日の復習 + ステージマップ） */
export default function TrackHome({
  deck,
  stages,
  cards,
  onStart,
  composeMode,
  onComposeModeChange,
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
  const scopeKey = book === 'toeic' ? (`${deck}:${level}` as const) : book;
  const progress = planSummary?.scopes.find((s) => s.key === scopeKey) ?? null;
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

      {deck === 'composition' && composeMode && onComposeModeChange && (
        <div className="rounded-2xl border-2 border-slate-200 p-3">
          <div className="mb-2 text-xs font-extrabold text-slate-400">解答方法</div>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['oral', '口頭で言う', '答えを見て自己判定', Mic],
              ['type', '入力する', '英文をタイピング', Keyboard],
            ] as const).map(([m, label, sub, Icon]) => (
              <button
                key={m}
                onClick={() => onComposeModeChange(m)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left ${
                  composeMode === m ? 'border-sky-400 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block text-sm font-black">{label}</span>
                  <span className="block text-[11px] font-bold opacity-80">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
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
