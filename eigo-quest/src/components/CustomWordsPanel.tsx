import { useMemo, useState } from 'react';
import { FileUp, ListPlus, Plus, Trash2, X } from 'lucide-react';
import type { CustomWord } from '../types';
import Segmented from './ui/Segmented';
import { mergeCustomWords, parseWordList, type WordInput } from '../lib/customWords';

interface Props {
  words: CustomWord[];
  onSave: (words: CustomWord[]) => void;
}

type Mode = 'closed' | 'add' | 'import' | 'list';

const INPUT = 'w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-700 outline-none focus:border-sky-400';
const SAMPLE = '1,example,例,This is an example.,これは例です。\n2,practice,練習する';

/** マイ単語帳: 1語ずつの追加・CSV取り込み・一覧と削除 */
export default function CustomWordsPanel({ words, onSave }: Props) {
  const [mode, setMode] = useState<Mode>(words.length === 0 ? 'add' : 'closed');
  const [message, setMessage] = useState('');

  const save = (incoming: WordInput[]) => {
    const { list, added, updated } = mergeCustomWords(words, incoming);
    onSave(list);
    setMessage(`${added}語を追加${updated ? `・${updated}語を更新` : ''}しました`);
  };

  const toggle = (m: Mode) => {
    setMode(mode === m ? 'closed' : m);
    setMessage('');
  };

  return (
    <section className="rounded-3xl border-2 border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-700">マイ単語帳</h3>
          <p className="text-xs font-bold text-slate-400">登録 {words.length}語・番号順に10語ずつステージになります</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([
          ['add', '1語追加', Plus],
          ['import', 'CSV取り込み', FileUp],
          ['list', '一覧・削除', ListPlus],
        ] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => toggle(m)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border-2 py-2 text-xs font-black ${
              mode === m ? 'border-sky-400 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
      {message && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700">{message}</p>}
      {mode === 'add' && <AddForm onAdd={(w) => save([w])} />}
      {mode === 'import' && <ImportForm onImport={save} />}
      {mode === 'list' && <WordList words={words} onSave={onSave} />}
    </section>
  );
}

function AddForm({ onAdd }: { onAdd: (w: WordInput) => void }) {
  const [no, setNo] = useState('');
  const [english, setEnglish] = useState('');
  const [japanese, setJapanese] = useState('');
  const [example, setExample] = useState('');
  const [exampleJa, setExampleJa] = useState('');
  const valid = /[a-z]/i.test(english) && japanese.trim() !== '';

  const submit = () => {
    if (!valid) return;
    onAdd({ no: /^\d+$/.test(no.trim()) ? Number(no) : null, english: english.trim(), japanese: japanese.trim(), example: example.trim(), exampleJa: exampleJa.trim() });
    // 続けて入力しやすいよう、番号は1つ進めて残す
    setNo(/^\d+$/.test(no.trim()) ? String(Number(no) + 1) : '');
    setEnglish('');
    setJapanese('');
    setExample('');
    setExampleJa('');
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <input value={no} onChange={(e) => setNo(e.target.value)} inputMode="numeric" placeholder="番号" className={`${INPUT} w-20 shrink-0`} />
        <input
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder="英語（例: develop）"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          className={INPUT}
        />
      </div>
      <input value={japanese} onChange={(e) => setJapanese(e.target.value)} placeholder="日本語の意味（例: 発達させる）" className={INPUT} />
      <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="例文（任意）" className={INPUT} />
      <input value={exampleJa} onChange={(e) => setExampleJa(e.target.value)} placeholder="例文の訳（任意）" className={INPUT} />
      <button
        onClick={submit}
        disabled={!valid}
        className="w-full rounded-2xl border-b-4 border-green-700 bg-green-500 py-2.5 font-black text-white active:translate-y-0.5 active:border-b-2 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
      >
        追加する
      </button>
      <p className="text-[11px] font-bold text-slate-400">同じ英語の単語がすでにあれば上書きされます。</p>
    </div>
  );
}

function ImportForm({ onImport }: { onImport: (words: WordInput[]) => void }) {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseWordList(text), [text]);

  const readFile = async (file: File | undefined) => {
    if (file) setText(await file.text());
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-bold text-slate-500">
        1行に1語、「番号,英語,日本語,例文,例文訳」の順で書きます（番号・例文・例文訳は省略可）。表計算ソフトからコピーしたタブ区切りもそのまま貼り付けられます。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={SAMPLE}
        spellCheck={false}
        className={`${INPUT} resize-y font-mono text-sm`}
      />
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-2 text-sm font-black text-slate-400 hover:bg-slate-50">
        <FileUp className="h-4 w-4" />
        CSVファイルを選ぶ
        <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
      </label>
      {text.trim() && (
        <p className="text-xs font-bold text-slate-500">
          読み込める単語：{parsed.words.length}語{parsed.skipped > 0 && `（読み飛ばし ${parsed.skipped}行）`}
        </p>
      )}
      <button
        onClick={() => {
          onImport(parsed.words);
          setText('');
        }}
        disabled={parsed.words.length === 0}
        className="w-full rounded-2xl border-b-4 border-green-700 bg-green-500 py-2.5 font-black text-white active:translate-y-0.5 active:border-b-2 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
      >
        取り込む
      </button>
    </div>
  );
}

function WordList({ words, onSave }: Props) {
  const [sort, setSort] = useState<'no' | 'added'>('no');
  const shown = useMemo(
    () => (sort === 'no' ? [...words].sort((a, b) => (a.no ?? Infinity) - (b.no ?? Infinity)) : [...words].reverse()),
    [words, sort],
  );

  if (words.length === 0) return <p className="mt-4 text-center text-sm font-bold text-slate-400">まだ単語がありません。</p>;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <Segmented
          size="sm"
          options={[
            { id: 'no', label: '番号順' },
            { id: 'added', label: '新しい順' },
          ]}
          value={sort}
          onChange={setSort}
        />
        <button
          onClick={() => window.confirm(`マイ単語帳の${words.length}語をすべて削除します。学習記録も消えます。`) && onSave([])}
          className="flex items-center gap-1 text-xs font-extrabold text-slate-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
          すべて削除
        </button>
      </div>
      <ul className="max-h-80 divide-y-2 divide-slate-100 overflow-y-auto rounded-2xl border-2 border-slate-200">
        {shown.map((w) => (
          <li key={w.id} className="flex items-center gap-2 px-3 py-2">
            <span className="w-12 shrink-0 text-xs font-black text-slate-400">{w.no !== null ? `No.${w.no}` : '−'}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-extrabold text-slate-700">{w.english}</div>
              <div className="truncate text-xs font-bold text-slate-500">{w.japanese}</div>
            </div>
            <button
              onClick={() => onSave(words.filter((x) => x.id !== w.id))}
              className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-red-500"
              aria-label={`${w.english} を削除`}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
