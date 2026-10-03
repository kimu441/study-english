import { useState } from 'react';
import { Check, Crown, Lock, Play, Star, X } from 'lucide-react';
import type { StageState } from '../lib/stats';

interface Props {
  states: StageState[];
  onStart: (stageId: string) => void;
}

const W = 320;
const ROW = 150;
const TOP = 70;

export default function PathMap({ states, onStart }: Props) {
  const [selected, setSelected] = useState<StageState | null>(null);

  const nodes = states.map((s, i) => ({ s, x: W / 2 + Math.round(Math.sin(i * 1.25) * 78), y: TOP + i * ROW }));
  const height = TOP * 2 + (states.length - 1) * ROW;

  const segment = (a: (typeof nodes)[number], b: (typeof nodes)[number]) =>
    `M ${a.x} ${a.y} C ${a.x} ${a.y + ROW / 2}, ${b.x} ${b.y - ROW / 2}, ${b.x} ${b.y}`;

  return (
    <section>
      <div className="relative mx-auto" style={{ width: W, height }}>
        <svg className="absolute inset-0" width={W} height={height} aria-hidden>
          {nodes.slice(0, -1).map((n, i) => {
            const open = nodes[i + 1].s.status !== 'locked';
            return (
              <path
                key={i}
                d={segment(n, nodes[i + 1])}
                fill="none"
                stroke={open ? '#4ade80' : '#e2e8f0'}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray="0.1 22"
              />
            );
          })}
        </svg>

        {nodes.map(({ s, x, y }) => (
          <div key={s.stage.id}>
            <div className="absolute" style={{ left: x - 40, top: y - 40 }}>
              {s.status === 'available' && (
                <>
                  <span className="absolute inset-0 animate-ring rounded-full bg-green-400" />
                  <div className="absolute -top-11 left-1/2 -translate-x-1/2 animate-bobble whitespace-nowrap rounded-2xl border-2 border-slate-200 bg-white px-3 py-1 text-sm font-black text-green-500">
                    START
                    <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-slate-200 bg-white" />
                  </div>
                </>
              )}
              <button
                onClick={() => setSelected(s)}
                aria-label={`${s.stage.title}（${s.status === 'locked' ? '未開放' : s.status === 'completed' ? 'クリア済' : 'プレイ可能'}）`}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border-b-[8px] text-white transition active:translate-y-1 active:border-b-4 ${
                  s.status === 'locked'
                    ? 'border-slate-300 bg-slate-200 text-slate-400'
                    : s.status === 'completed'
                      ? 'border-amber-600 bg-amber-400'
                      : 'border-green-700 bg-green-500'
                }`}
              >
                {s.status === 'locked' ? (
                  <Lock className="h-8 w-8" />
                ) : s.status === 'completed' ? (
                  s.stars === 3 ? <Crown className="h-9 w-9 fill-white" /> : <Check className="h-9 w-9" strokeWidth={4} />
                ) : (
                  <Star className="h-9 w-9 fill-white" />
                )}
              </button>
            </div>
            <div className="absolute w-44 text-center" style={{ left: x - 88, top: y + 54 }}>
              <div className={`text-sm font-black leading-tight ${s.status === 'locked' ? 'text-slate-400' : 'text-slate-700'}`}>
                {s.stage.emoji} {s.stage.title}
              </div>
              {s.status !== 'locked' && (
                <div className="mt-1 flex justify-center gap-0.5">
                  {[0, 1, 2].map((k) => (
                    <Star key={k} className={`h-4 w-4 ${k < s.stars ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-xl animate-slide-up rounded-t-3xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl">{selected.stage.emoji}</div>
                <h3 className="mt-1 text-xl font-black text-slate-800">{selected.stage.title}</h3>
                <p className="text-sm font-bold text-slate-500">{selected.stage.description}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="閉じる">
                <X className="h-6 w-6" />
              </button>
            </div>
            {selected.status === 'locked' ? (
              <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                前のステージの問題を一通り学習すると開放されます。
              </p>
            ) : (
              <>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs font-extrabold text-slate-400">
                    <span>学習済み</span>
                    <span>
                      {selected.studied} / {selected.cards.length}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${(selected.studied / selected.cards.length) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    onStart(selected.stage.id);
                    setSelected(null);
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-green-700 bg-green-500 py-3.5 text-lg font-black text-white transition active:translate-y-0.5 active:border-b-2"
                >
                  <Play className="h-5 w-5 fill-white" />
                  {selected.status === 'completed' ? 'もう一度練習する' : 'レッスン開始'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
