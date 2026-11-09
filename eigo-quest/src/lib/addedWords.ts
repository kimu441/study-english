import { useCallback, useState } from 'react';
import { parseCsv, stripBom } from './csv';
import { readJson, writePref } from './storage';
import seedCsv from '../data/added-words.csv?raw';

/** 追加単語の覚え具合: 未分類 / 覚えた / まだまだ / 難しい */
export type WordStatus = 'none' | 'known' | 'learning' | 'hard';

/** 「追加単語」の 1 語（既存の単語帳・SRS とは別に管理する） */
export interface AddedWord {
  id: string;
  english: string;
  /** 品詞（'動/名' のように / 区切り） */
  pos: string;
  japanese: string;
  example: string;
  /** よく出る意味・セットで使う表現など */
  note: string;
  /** 音声の聞き取りから推測した単語（単語帳との照合が必要） */
  uncertain: boolean;
  status: WordStatus;
  /** 自分で追加した単語か（初期データは false） */
  custom: boolean;
  updatedAt: number | null;
}

export const STATUS_LABEL: Record<WordStatus, string> = {
  none: '未分類',
  known: '覚えた',
  learning: 'まだまだ',
  hard: '難しい',
};

export const POS_OPTIONS = ['動', '名', '形', '副', '前', '接', '他'] as const;
export const POS_LABEL: Record<string, string> = {
  動: '動詞',
  名: '名詞',
  形: '形容詞',
  副: '副詞',
  前: '前置詞',
  接: '接続詞',
  他: 'その他',
};

/** 保存先。既存アプリのデータ（eigo-quest:v1）とは別のキーなので、互いに影響しない */
const STORAGE_KEY = 'eigo-quest:added-words:v1';

interface Saved {
  words: AddedWord[];
}

const norm = (english: string) => english.trim().toLowerCase().replace(/\s+/g, ' ');

/** 同梱の初期データ（src/data/added-words.csv） */
function seedWords(): AddedWord[] {
  const [, ...rows] = parseCsv(stripBom(seedCsv));
  return rows.map(([english = '', pos = '', japanese = '', example = '', note = '', uncertain = '']) => ({
    id: `seed:${norm(english)}`,
    english: english.trim(),
    pos: pos.trim(),
    japanese: japanese.trim(),
    example: example.trim(),
    note: note.trim(),
    uncertain: uncertain.trim() === '1',
    status: 'none' as const,
    custom: false,
    updatedAt: null,
  }));
}

function load(): AddedWord[] {
  const saved = readJson<Saved>(STORAGE_KEY);
  if (!saved || !Array.isArray(saved.words)) return seedWords();
  return saved.words;
}

export type NewWord = Pick<AddedWord, 'english' | 'pos' | 'japanese' | 'example'>;

export function useAddedWords() {
  const [words, setWords] = useState<AddedWord[]>(load);

  const commit = useCallback((next: AddedWord[]) => {
    setWords(next);
    writePref(STORAGE_KEY, JSON.stringify({ words: next } satisfies Saved));
  }, []);

  const setStatus = useCallback(
    (id: string, status: WordStatus) => {
      commit(words.map((w) => (w.id === id ? { ...w, status, updatedAt: Date.now() } : w)));
    },
    [words, commit],
  );

  /** 追加する。英語が既にあれば追加せず false を返す */
  const addWord = useCallback(
    (input: NewWord): boolean => {
      const key = norm(input.english);
      if (!key || words.some((w) => norm(w.english) === key)) return false;
      const word: AddedWord = {
        id: `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        english: input.english.trim(),
        pos: input.pos,
        japanese: input.japanese.trim(),
        example: input.example.trim(),
        note: '',
        uncertain: false,
        status: 'none',
        custom: true,
        updatedAt: Date.now(),
      };
      commit([word, ...words]);
      return true;
    },
    [words, commit],
  );

  /** 自分で追加した単語だけ削除できる */
  const removeWord = useCallback(
    (id: string) => commit(words.filter((w) => !(w.id === id && w.custom))),
    [words, commit],
  );

  return { words, setStatus, addWord, removeWord };
}
