import { useMemo, useState } from 'react';
import { Keyboard, Mic } from 'lucide-react';
import type { Card, Deck, Stage, WordLevel } from '../types';
import ReviewWidget from './ReviewWidget';
import PathMap from './PathMap';
import type { ComposeMode } from './Session';
import { LEVELS, LEVEL_LABEL } from '../data/decks';
import { todayStr } from '../lib/srs';
import { getStageStates, isDue, isWeak } from '../lib/stats';
import type { SessionMode } from '../lib/session';

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
  try {
    const v = localStorage.getItem(LEVEL_KEY(deck));
    if (v === 'junior' || v === 'senior') return v;
  } catch {
    /* 読めない環境は既定値 */
  }
  return 'junior';
}

/** 単語 / 瞬間英作文 それぞれのホーム画面（レベル切り替え + 今日の復習 + ステージマップ） */
export default function TrackHome({ deck, stages, cards, onStart, composeMode, onComposeModeChange }: Props) {
  const [level, setLevel] = useState<WordLevel>(() => loadLevel(deck));
  const today = todayStr();

  const changeLevel = (l: WordLevel) => {
    setLevel(l);
    try {
      localStorage.setItem(LEVEL_KEY(deck), l);
    } catch {
      /* 保存できなくても動作は続ける */
    }
  };

  const levelStages = useMemo(() => stages.filter((s) => s.level === level), [stages, level]);
  const levelCards = useMemo(() => cards.filter((c) => c.level === level), [cards, level]);
  const states = useMemo(() => getStageStates(levelStages, levelCards), [levelStages, levelCards]);

  const dueCount = levelCards.filter((c) => isDue(c, today)).length;
  const weakCount = levelCards.filter(isWeak).length;
  const unit = deck === 'word' ? '語' : '文';

  const startWeak = () => {
    // 未開放ステージの新出問題は弱点モードから除外
    const open = new Set(states.filter((s) => s.status !== 'locked').map((s) => s.stage.id));
    onStart(levelCards.filter((c) => open.has(c.stageId)), 'weak');
  };

  return (
    <>
      <div>
        <div className="flex rounded-2xl bg-slate-100 p-1.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => changeLevel(l)}
              className={`flex-1 rounded-xl py-2 text-sm font-black transition ${
                level === l ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              {LEVEL_LABEL[l]}レベル
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-extrabold text-slate-400">
          {deck === 'word' ? 'TOEIC Bridge 頻出単語' : 'TOEIC Bridge の場面で使う文'}・{LEVEL_LABEL[level]}レベル 全
          {levelCards.length}
          {unit}
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
