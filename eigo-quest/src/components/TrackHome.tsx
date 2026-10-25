import { useMemo, useState } from 'react';
import { Keyboard, Mic } from 'lucide-react';
import type { Card, ComposeMode, Deck, Stage, WordLevel } from '../types';
import ReviewWidget from './ReviewWidget';
import PathMap from './PathMap';
import Segmented from './ui/Segmented';
import { DECK_META, LEVELS, LEVEL_LABEL } from '../data/decks';
import { todayStr } from '../lib/srs';
import { getStageStates, isDue, isWeak } from '../lib/stats';
import type { SessionMode } from '../lib/session';
import { readPref, writePref } from '../lib/storage';

interface Props {
  deck: Deck;
  stages: Stage[];
  cards: Card[];
  onStart: (pool: Card[], mode: SessionMode, stageId?: string) => void;
  composeMode?: ComposeMode;
  onComposeModeChange?: (m: ComposeMode) => void;
}

const LEVEL_KEY = (deck: Deck) => `eigo-quest:level:${deck}`;

function loadLevel(deck: Deck): WordLevel {
  return readPref(LEVEL_KEY(deck)) === 'senior' ? 'senior' : 'junior';
}

const LEVEL_OPTIONS = LEVELS.map((l) => ({ id: l, label: `${LEVEL_LABEL[l]}レベル` }));

/** 単語 / 瞬間英作文 それぞれのホーム画面（レベル切り替え + 今日の復習 + ステージマップ） */
export default function TrackHome({ deck, stages, cards, onStart, composeMode, onComposeModeChange }: Props) {
  const [level, setLevel] = useState<WordLevel>(() => loadLevel(deck));
  const today = todayStr();

  const changeLevel = (l: WordLevel) => {
    setLevel(l);
    writePref(LEVEL_KEY(deck), l);
  };

  const levelStages = useMemo(() => stages.filter((s) => s.level === level), [stages, level]);
  const levelCards = useMemo(() => cards.filter((c) => c.level === level), [cards, level]);
  const states = useMemo(() => getStageStates(levelStages, levelCards), [levelStages, levelCards]);

  const dueCount = levelCards.filter((c) => isDue(c, today)).length;
  const weakCount = levelCards.filter(isWeak).length;

  const startWeak = () => {
    // 未開放ステージの新出問題は弱点モードから除外
    const open = new Set(states.filter((s) => s.status !== 'locked').map((s) => s.stage.id));
    onStart(levelCards.filter((c) => open.has(c.stageId)), 'weak');
  };

  return (
    <>
      <div>
        <Segmented options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />
        <p className="mt-2 text-center text-xs font-extrabold text-slate-400">
          {deck === 'word' ? 'TOEIC Bridge 頻出単語' : 'TOEIC Bridge の場面で使う文'}・{LEVEL_LABEL[level]}レベル 全
          {levelCards.length}
          {DECK_META[deck].unit}
        </p>
      </div>

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

      <ReviewWidget dueCount={dueCount} weakCount={weakCount} onStart={startWeak} />
      <PathMap key={`${deck}-${level}`} states={states} onStart={(id) => onStart(levelCards, 'stage', id)} />
    </>
  );
}
