import { useMemo, useState } from 'react';
import { BarChart3, BookOpen, CalendarDays, MessageSquareText, RotateCcw } from 'lucide-react';
import Header from './components/Header';
import TrackHome from './components/TrackHome';
import ReviewList from './components/ReviewList';
import Session from './components/session/Session';
import Dashboard from './components/Dashboard';
import PlanView from './components/plan/PlanView';
import PlanBanner from './components/plan/PlanBanner';
import { STAGES } from './data/decks';
import type { Card, ComposeMode, Deck } from './types';
import { useStore } from './lib/store';
import { todayStr } from './lib/srs';
import { dayStats, getStreak } from './lib/stats';
import { pickSessionCards, type SessionItem, type SessionMode } from './lib/session';
import { computePlan } from './lib/plan';
import { readPref, writePref } from './lib/storage';

type Tab = Deck | 'review' | 'plan' | 'dashboard';

const TABS = [
  ['word', '単語', BookOpen],
  ['composition', '英作文', MessageSquareText],
  ['review', '復習', RotateCcw],
  ['plan', '計画', CalendarDays],
  ['dashboard', '記録', BarChart3],
] as const;

const COMPOSE_MODE_KEY = 'eigo-quest:compose-mode';
const loadComposeMode = (): ComposeMode => (readPref(COMPOSE_MODE_KEY) === 'type' ? 'type' : 'oral');

const WORD_STAGES = STAGES.filter((s) => s.deck === 'word');
const COMPOSITION_STAGES = STAGES.filter((s) => s.deck === 'composition');
const STAGE_ORDER = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));

export default function App() {
  const { cards, logs, plan, answerCard, removeFromReview, setPlan, reset, loadDemo } = useStore();
  const [tab, setTab] = useState<Tab>('word');
  const [composeMode, setComposeMode] = useState<ComposeMode>(loadComposeMode);
  const [session, setSession] = useState<{ key: number; items: SessionItem[] } | null>(null);

  const today = todayStr();
  const wordCards = useMemo(() => cards.filter((c) => c.deck === 'word'), [cards]);
  const compositionCards = useMemo(() => cards.filter((c) => c.deck === 'composition'), [cards]);
  const reviewCount = cards.filter((c) => c.inReviewList).length;

  const streak = useMemo(() => getStreak(logs, today), [logs, today]);
  const xpToday = dayStats(logs)[today]?.xp ?? 0;
  const planSummary = useMemo(() => (plan ? computePlan(cards, logs, plan, today) : null), [cards, logs, plan, today]);

  const start = (pool: Card[], mode: SessionMode, stageId?: string) => {
    const items = pickSessionCards(pool, { mode, stageId, stageOrder: STAGE_ORDER });
    if (items.length === 0) return;
    setSession({ key: Date.now(), items });
  };

  const changeComposeMode = (m: ComposeMode) => {
    setComposeMode(m);
    writePref(COMPOSE_MODE_KEY, m);
  };

  if (session) {
    return (
      <Session
        key={session.key}
        items={session.items}
        allCards={cards}
        onRecord={answerCard}
        onExit={() => setSession(null)}
        composeMode={composeMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header streak={streak.current} studiedToday={streak.studiedToday} xpToday={xpToday} />
      <main className="mx-auto max-w-xl space-y-6 px-4 pb-28 pt-5">
        {(tab === 'word' || tab === 'composition') && <PlanBanner summary={planSummary} onOpen={() => setTab('plan')} />}
        {tab === 'word' && <TrackHome key="word" deck="word" stages={WORD_STAGES} cards={wordCards} onStart={start} />}
        {tab === 'composition' && (
          <TrackHome
            key="composition"
            deck="composition"
            stages={COMPOSITION_STAGES}
            cards={compositionCards}
            onStart={start}
            composeMode={composeMode}
            onComposeModeChange={changeComposeMode}
          />
        )}
        {tab === 'review' && <ReviewList cards={cards} onStart={(pool) => start(pool, 'review')} onRemove={removeFromReview} />}
        {tab === 'plan' && <PlanView cards={cards} logs={logs} plan={plan} today={today} onSave={setPlan} onGo={setTab} />}
        {tab === 'dashboard' && <Dashboard cards={cards} logs={logs} onDemo={loadDemo} onReset={reset} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl gap-1 px-2 py-2">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl border-2 py-1.5 text-[11px] font-black ${
                tab === id ? 'border-sky-300 bg-sky-100 text-sky-500' : 'border-transparent text-slate-400'
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
              {id === 'review' && reviewCount > 0 && (
                <span className="absolute right-[18%] top-0.5 min-w-5 rounded-full bg-rose-500 px-1 text-[10px] leading-5 text-white">
                  {reviewCount > 99 ? '99+' : reviewCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
