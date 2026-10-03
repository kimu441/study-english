import { useMemo, useState } from 'react';
import { BarChart3, Home } from 'lucide-react';
import Header from './components/Header';
import ReviewWidget from './components/ReviewWidget';
import PathMap from './components/PathMap';
import Session from './components/Session';
import Dashboard from './components/Dashboard';
import { STAGES } from './data/mockData';
import { useStore } from './lib/store';
import { todayStr } from './lib/srs';
import { dayStats, getStageStates, getStreak, isDue, isWeak } from './lib/stats';
import { pickSessionCards, type SessionItem, type SessionMode } from './lib/session';

type Tab = 'home' | 'dashboard';

export default function App() {
  const { cards, logs, answerCard, reset, loadDemo } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [session, setSession] = useState<{ key: number; items: SessionItem[] } | null>(null);

  const today = todayStr();
  const states = useMemo(() => getStageStates(STAGES, cards), [cards]);
  const streak = useMemo(() => getStreak(logs, today), [logs, today]);
  const xpToday = dayStats(logs)[today]?.xp ?? 0;
  const dueCount = cards.filter((c) => isDue(c, today)).length;
  const weakCount = cards.filter(isWeak).length;

  const start = (mode: SessionMode, stageId?: string) => {
    const stageOrder = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
    // 未開放ステージの新出問題は弱点モードから除外
    const open = new Set(states.filter((s) => s.status !== 'locked').map((s) => s.stage.id));
    const pool = mode === 'weak' ? cards.filter((c) => open.has(c.stageId)) : cards;
    const items = pickSessionCards(pool, { mode, stageId, stageOrder });
    if (items.length === 0) return;
    setSession({ key: Date.now(), items });
  };

  if (session) {
    return (
      <Session
        key={session.key}
        items={session.items}
        allCards={cards}
        onRecord={answerCard}
        onExit={() => setSession(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header streak={streak.current} studiedToday={streak.studiedToday} xpToday={xpToday} />
      <main className="mx-auto max-w-xl space-y-8 px-4 pb-28 pt-5">
        {tab === 'home' ? (
          <>
            <ReviewWidget dueCount={dueCount} weakCount={weakCount} onStart={() => start('weak')} />
            <PathMap states={states} onStart={(id) => start('stage', id)} />
          </>
        ) : (
          <Dashboard cards={cards} logs={logs} onDemo={loadDemo} onReset={reset} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl justify-around py-2">
          {([
            ['home', 'ホーム', Home],
            ['dashboard', '記録', BarChart3],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex w-32 flex-col items-center gap-0.5 rounded-2xl border-2 py-1.5 text-xs font-black ${
                tab === id ? 'border-sky-300 bg-sky-100 text-sky-500' : 'border-transparent text-slate-400'
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}