import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCw, Shuffle, Trash2, Volume2 } from 'lucide-react';
import Segmented from './ui/Segmented';
import { BTN_PRIMARY } from './ui/styles';
import { speak } from '../lib/sound';
import { POS_LABEL, POS_OPTIONS, STATUS_LABEL, useAddedWords, type AddedWord, type WordStatus } from '../lib/addedWords';

type Filter = 'all' | WordStatus;
type View = 'card' | 'list';

const FILTERS: Filter[] = ['all', 'none', 'learning', 'hard', 'known'];
const filterLabel = (f: Filter) => (f === 'all' ? 'すべて' : STATUS_LABEL[f]);

const STATUS_BUTTONS: { status: Exclude<WordStatus, 'none'>; on: string; off: string }[] = [
  { status: 'known', on: 'border-green-600 bg-green-500 text-white', off: 'border-green-200 text-green-600' },
  { status: 'learning', on: 'border-amber-600 bg-amber-400 text-white', off: 'border-amber-200 text-amber-600' },
  { status: 'hard', on: 'border-rose-600 bg-rose-500 text-white', off: 'border-rose-200 text-rose-600' },
];

const POS_COLOR: Record<string, string> = {
  動: 'bg-sky-100 text-sky-600',
  名: 'bg-green-100 text-green-700',
  形: 'bg-amber-100 text-amber-700',
  副: 'bg-purple-100 text-purple-600',
  前: 'bg-rose-100 text-rose-600',
  接: 'bg-slate-200 text-slate-600',
  他: 'bg-slate-200 text-slate-600',
};

function PosBadges({ pos }: { pos: string }) {
  if (!pos) return null;
  return (
    <span className="inline-flex gap-1">
      {pos.split('/').map((p) => (
        <span key={p} className={`rounded-full px-2 py-0.5 text-[11px] font-black ${POS_COLOR[p] ?? POS_COLOR.他}`}>
          {POS_LABEL[p] ?? p}
        </span>
      ))}
    </span>
  );
}

const shuffled = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function StatusButtons({ word, onSet, size = 'md' }: { word: AddedWord; onSet: (s: WordStatus) => void; size?: 'md' | 'sm' }) {
  return (
    <div className="flex gap-2">
      {STATUS_BUTTONS.map((b) => (
        <button
          key={b.status}
          onClick={() => onSet(word.status === b.status && size === 'sm' ? 'none' : b.status)}
          className={`flex-1 rounded-xl border-2 font-black transition active:scale-95 ${size === 'md' ? 'py-3 text-sm' : 'py-1.5 text-xs'} ${
            word.status === b.status ? b.on : `bg-white ${b.off}`
          }`}
        >
          {STATUS_LABEL[b.status]}
        </button>
      ))}
    </div>
  );
}

/** 追加単語: めくるカードで覚え、「覚えた／まだまだ／難しい」に分類する */
export default function AddedWordsView() {
  const { words, setStatus, addWord, removeWord } = useAddedWords();
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>('card');
  const [random, setRandom] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: words.length, none: 0, known: 0, learning: 0, hard: 0 };
    for (const w of words) c[w.status]++;
    return c;
  }, [words]);

  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  // 絞り込み・並びを変えたときだけ出題順を作り直す（分類した単語が途中で消えないように）
  const rebuild = (f: Filter, rnd: boolean) => {
    const ids = words.filter((w) => f === 'all' || w.status === f).map((w) => w.id);
    setQueue(rnd ? shuffled(ids) : ids);
    setPos(0);
    setFlipped(false);
  };
  useEffect(() => {
    rebuild(filter, random);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, random]);

  const current = byId.get(queue[pos]);
  const finished = queue.length > 0 && pos >= queue.length;

  const next = () => {
    setFlipped(false);
    setPos((p) => p + 1);
  };
  const classify = (status: WordStatus) => {
    if (!current) return;
    setStatus(current.id, status);
    next();
  };

  const shownList = words.filter((w) => filter === 'all' || w.status === filter);

  return (
    <>
      <section className="rounded-3xl border-b-8 border-sky-700 bg-sky-500 p-5 text-white">
        <h2 className="text-lg font-black">追加単語</h2>
        <p className="mt-1 text-xs font-bold text-sky-100">
          音声で追加した単語を、めくるカードで覚えます（全{counts.all}語）
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-black">
          {(['none', 'learning', 'hard', 'known'] as const).map((s) => (
            <div key={s} className="rounded-xl bg-white/15 py-2">
              <div className="text-lg">{counts[s]}</div>
              {STATUS_LABEL[s]}
            </div>
          ))}
        </div>
      </section>

      <Segmented
        size="sm"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ id: f, label: `${filterLabel(f)} ${counts[f]}` }))}
        activeClass="text-sky-500"
      />

      <div className="flex items-center justify-between gap-2">
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { id: 'card' as const, label: 'カード' },
            { id: 'list' as const, label: '一覧' },
          ]}
          activeClass="text-sky-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setRandom(!random)}
            className={`flex items-center gap-1 rounded-xl border-2 px-3 py-1.5 text-xs font-black ${
              random ? 'border-sky-400 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            <Shuffle className="h-4 w-4" />
            ランダム
          </button>
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center gap-1 rounded-xl border-2 border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500"
          >
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
      </div>

      {adding && <AddForm onAdd={addWord} />}

      {view === 'card' && (
        <>
          {queue.length === 0 && <Empty text="この分類の単語はまだありません" />}
          {finished && (
            <div className="rounded-3xl border-2 border-slate-200 p-8 text-center">
              <p className="text-lg font-black text-slate-700">ひととおり終わりました 🎉</p>
              <button onClick={() => rebuild(filter, random)} className={`${BTN_PRIMARY} mt-4 px-6 py-3 text-sm`}>
                もう一度やる
              </button>
            </div>
          )}
          {current && !finished && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-400">
                <span>
                  {pos + 1} / {queue.length}
                </span>
                <span>{STATUS_LABEL[current.status]}</span>
              </div>
              <div className="min-h-64 rounded-3xl border-2 border-b-8 border-slate-200 p-6 text-center">
                <div className="flex items-center justify-center gap-3">
                  <PosBadges pos={current.pos} />
                </div>
                <p className="mt-4 text-4xl font-black text-slate-800">{current.english}</p>
                {current.uncertain && <p className="mt-1 text-[11px] font-bold text-amber-500">聞き取りの推測（単語帳と照合してね）</p>}
                <button
                  onClick={() => speak(current.english)}
                  className="mx-auto mt-3 flex items-center gap-1.5 rounded-full border-2 border-sky-200 px-4 py-1.5 text-sm font-black text-sky-500 active:scale-95"
                >
                  <Volume2 className="h-4 w-4" />
                  発音を聞く
                </button>

                {flipped ? (
                  <div className="mt-5 space-y-2 border-t-2 border-dashed border-slate-200 pt-4">
                    <p className="text-xl font-black text-green-600">{current.japanese}</p>
                    {current.note && <p className="text-xs font-bold text-slate-500">{current.note}</p>}
                    {current.example && (
                      <button onClick={() => speak(current.example)} className="text-left text-sm font-bold text-slate-600">
                        <Volume2 className="mr-1 inline h-4 w-4 text-sky-400" />
                        {current.example}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setFlipped(true)}
                    className="mx-auto mt-6 flex items-center gap-1.5 rounded-2xl border-2 border-slate-200 px-5 py-2.5 text-sm font-black text-slate-500 active:scale-95"
                  >
                    <RotateCw className="h-4 w-4" />
                    意味をめくる
                  </button>
                )}
              </div>

              {flipped && (
                <>
                  <StatusButtons word={current} onSet={classify} />
                  <button onClick={next} className="w-full py-2 text-xs font-black text-slate-400">
                    分類しないで次へ
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {view === 'list' && (
        <ul className="space-y-3">
          {shownList.length === 0 && <Empty text="この分類の単語はまだありません" />}
          {shownList.map((w) => (
            <li key={w.id} className="space-y-2 rounded-2xl border-2 border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <button onClick={() => speak(w.english)} aria-label={`${w.english} の発音`} className="text-sky-400">
                  <Volume2 className="h-5 w-5" />
                </button>
                <span className="text-lg font-black text-slate-800">{w.english}</span>
                <PosBadges pos={w.pos} />
                {w.uncertain && <span className="text-[11px] font-bold text-amber-500">要確認</span>}
                {w.custom && (
                  <button onClick={() => removeWord(w.id)} aria-label="削除" className="ml-auto text-slate-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-sm font-bold text-slate-700">{w.japanese}</p>
              {w.note && <p className="text-xs font-bold text-slate-400">{w.note}</p>}
              <StatusButtons word={w} onSet={(s) => setStatus(w.id, s)} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">{text}</p>;
}

function AddForm({ onAdd }: { onAdd: (w: { english: string; pos: string; japanese: string; example: string }) => boolean }) {
  const [english, setEnglish] = useState('');
  const [pos, setPos] = useState<string>('動');
  const [japanese, setJapanese] = useState('');
  const [example, setExample] = useState('');
  const [message, setMessage] = useState('');

  const submit = () => {
    if (!/[a-z]/i.test(english) || !japanese.trim()) {
      setMessage('英語と意味を入れてください');
      return;
    }
    if (!onAdd({ english, pos, japanese, example })) {
      setMessage('その単語はもう追加されています');
      return;
    }
    setEnglish('');
    setJapanese('');
    setExample('');
    setMessage('追加しました');
  };

  const input = 'w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-sky-400';
  return (
    <div className="space-y-2 rounded-2xl border-2 border-slate-200 p-4">
      <input className={input} placeholder="英語（例: concern）" value={english} onChange={(e) => setEnglish(e.target.value)} />
      <div className="flex flex-wrap gap-1.5">
        {POS_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setPos(p)}
            className={`rounded-full border-2 px-3 py-1 text-xs font-black ${pos === p ? 'border-sky-400 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-400'}`}
          >
            {POS_LABEL[p]}
          </button>
        ))}
      </div>
      <input className={input} placeholder="意味（例: 〜を心配させる）" value={japanese} onChange={(e) => setJapanese(e.target.value)} />
      <input className={input} placeholder="例文（任意）" value={example} onChange={(e) => setExample(e.target.value)} />
      <div className="flex items-center gap-3">
        <button onClick={submit} className={`${BTN_PRIMARY} px-5 py-2 text-sm`}>
          追加する
        </button>
        {message && <span className="text-xs font-bold text-slate-500">{message}</span>}
      </div>
    </div>
  );
}
