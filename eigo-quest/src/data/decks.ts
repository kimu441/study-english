import type { BookId, Card, CustomWord, Deck, Stage, WordLevel } from '../types';
import { initialSrsState } from '../lib/srs';
import { parseCsv, stripBom } from '../lib/csv';
import { byNo } from '../lib/customWords';
import wordsCsv from './toeic-bridge-words.csv?raw';
import core800Csv from './core-800-words.csv?raw';
import sentencesCsv from './toeic-bridge-sentences.csv?raw';

/**
 * 単語の出題の向き
 *  'en-ja' : 英語を見て、日本語の意味を選ぶ（TOEIC Bridge の読解・リスニング向け）
 *  'ja-en' : 日本語を見て、英語を選ぶ（自分で言えるようにする練習）
 *  'mixed' : 問題ごとにランダム
 */
export type WordDirection = 'en-ja' | 'ja-en' | 'mixed';
export const WORD_DIRECTION: WordDirection = 'mixed';

/** 1ステージに入れる最大問題数（超えると「その2」「その3」に分割） */
const ITEMS_PER_STAGE = 10;

export const LEVEL_LABEL: Record<WordLevel, string> = { junior: '中学', senior: '高校' };
export const LEVELS: WordLevel[] = ['junior', 'senior'];
const STAGE_EMOJI: Record<Deck, Record<WordLevel, string>> = {
  word: { junior: '📘', senior: '📕' },
  composition: { junior: '💬', senior: '🗣️' },
};

/** 単語帳の表示名 */
export const BOOK_META: Record<BookId, { label: string; short: string; emoji: string; note: string }> = {
  toeic: { label: 'TOEIC Bridge', short: 'TOEIC', emoji: '📘', note: 'TOEIC Bridge 頻出単語' },
  core800: { label: '高校必修800', short: '必修800', emoji: '📗', note: '高校基礎〜共通テストレベルの重要語' },
  custom: { label: 'マイ単語帳', short: 'マイ単語', emoji: '📝', note: '自分で登録した単語' },
};
export const WORD_BOOKS: BookId[] = ['toeic', 'core800', 'custom'];

/** デッキの表示名と数え方 */
export const DECK_META: Record<Deck, { label: string; short: string; unit: string }> = {
  word: { label: 'TOEIC Bridge 単語', short: '単語', unit: '語' },
  composition: { label: '瞬間英作文', short: '英作文', unit: '文' },
};
export const DECKS: Deck[] = ['word', 'composition'];

type CardContent = Omit<Card, keyof ReturnType<typeof initialSrsState>>;
type Item = {
  level: WordLevel;
  category: string;
  content: Omit<CardContent, 'stageId' | 'deck' | 'book' | 'level' | 'category'>;
};

/** 問題の出どころの短い表示名（「必修800」「英作文」など） */
export const sourceLabel = (c: Pick<Card, 'deck' | 'book'>) =>
  c.deck === 'word' ? BOOK_META[c.book].short : DECK_META.composition.short;

/** 問題のレベル表示（TOEIC Bridge は「中学」「高校」、他の単語帳は単語帳名） */
export const levelLabel = (c: Pick<Card, 'deck' | 'book' | 'level'>) =>
  c.book === 'toeic' ? LEVEL_LABEL[c.level] : sourceLabel(c);

/** 問題の位置（マイ単語帳は番号、それ以外はカテゴリ） */
export const cardTag = (c: Pick<Card, 'no' | 'category'>) => (c.no !== undefined ? `No.${c.no}` : c.category);

/** 単語の例文を解説文にする */
const exampleText = (example: string, exampleJa: string) =>
  example ? `例文：${example}${exampleJa ? `（${exampleJa}）` : ''}` : '';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** CSV の行を [level, category, ...rest] に分解（コメント行・ヘッダー行・不正な行は除く） */
function dataRows(text: string) {
  return parseCsv(stripBom(text))
    .map((r) => r.map((c) => c.trim()))
    .filter(([level, category]) => (level === 'junior' || level === 'senior') && !!category)
    .map(([level, category, ...rest]) => ({ level: level as WordLevel, category, rest }));
}

/**
 * 単語CSV: level,category,english,japanese,example,example_ja
 * ID は TOEIC Bridge だけ既存の学習データと互換性を保つため 'w-{level}-' のまま
 */
function loadWords(csv: string, book: BookId): Item[] {
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const { level, category, rest } of dataRows(csv)) {
    const [english, japanese, example = '', exampleJa = ''] = rest;
    if (!english || !japanese) continue;
    const key = `${level}:${english.toLowerCase()}`;
    if (seen.has(key)) continue; // 重複は最初の1件だけ使う
    seen.add(key);
    items.push({
      level,
      category,
      content: {
        id: `w-${book === 'toeic' ? level : book}-${english.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'vocab',
        prompt: japanese,
        answer: english,
        explanation: exampleText(example, exampleJa),
      },
    });
  }
  return items;
}

/** 瞬間英作文CSV: level,category,japanese,english,alternatives(| 区切り),explanation */
function loadSentences(): Item[] {
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const { level, category, rest } of dataRows(sentencesCsv)) {
    const [japanese, english, alternatives = '', explanation = ''] = rest;
    if (!english || !japanese) continue;
    const id = `s-${level}-${slug(english).slice(0, 48)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      level,
      category,
      content: {
        id,
        type: 'speaking',
        prompt: japanese,
        answer: english,
        alternatives: alternatives
          .split('|')
          .map((a) => a.trim())
          .filter(Boolean),
        explanation,
      },
    });
  }
  return items;
}

const STAGE_PREFIX: Record<string, string> = { 'word:toeic': 't', 'word:core800': 'k', 'composition:toeic': 'c' };

/** レベル → カテゴリの順にステージへ分割する */
function build(deck: Deck, book: BookId, items: Item[]) {
  const stages: Stage[] = [];
  const cards: CardContent[] = [];

  for (const level of LEVELS) {
    const categories = [...new Set(items.filter((w) => w.level === level).map((w) => w.category))];
    for (const category of categories) {
      const group = items.filter((w) => w.level === level && w.category === category);
      const parts = Math.ceil(group.length / ITEMS_PER_STAGE);
      for (let p = 0; p < parts; p++) {
        const chunk = group.slice(p * ITEMS_PER_STAGE, (p + 1) * ITEMS_PER_STAGE);
        const stageId = `${STAGE_PREFIX[`${deck}:${book}`]}:${level}:${category}:${p + 1}`;
        const source = book === 'toeic' ? `${DECK_META[deck].label}（${LEVEL_LABEL[level]}レベル）` : `${BOOK_META[book].label}・`;
        stages.push({
          id: stageId,
          deck,
          book,
          level,
          title: `${category}${parts > 1 ? `（その${p + 1}）` : ''}`,
          description: `${source}${chunk.length}${DECK_META[deck].unit}`,
          emoji: book === 'toeic' ? STAGE_EMOJI[deck][level] : BOOK_META[book].emoji,
        });
        for (const w of chunk) cards.push({ ...w.content, deck, book, level, stageId, category });
      }
    }
  }
  return { stages, cards };
}

/** マイ単語帳: 番号順（番号なしは登録順で最後）に 10 語ずつステージにする */
function buildCustom(words: CustomWord[]) {
  const sorted = words
    .map((w, i) => ({ w, i }))
    .sort((a, b) => byNo(a.w, b.w) || a.i - b.i)
    .map(({ w }) => w);
  const stages: Stage[] = [];
  const cards: CardContent[] = [];
  const category = BOOK_META.custom.label;
  for (let p = 0; p * ITEMS_PER_STAGE < sorted.length; p++) {
    const chunk = sorted.slice(p * ITEMS_PER_STAGE, (p + 1) * ITEMS_PER_STAGE);
    const numbered = chunk.flatMap((w) => (w.no !== null ? [w.no] : []));
    const stageId = `u:${p + 1}`;
    stages.push({
      id: stageId,
      deck: 'word',
      book: 'custom',
      level: 'senior',
      title: numbered.length > 0 ? `No.${numbered[0]}〜${numbered[numbered.length - 1]}` : `マイ単語（その${p + 1}）`,
      description: `${category}・${chunk.length}語`,
      emoji: BOOK_META.custom.emoji,
    });
    for (const w of chunk) {
      cards.push({
        id: `w-custom-${w.id}`,
        type: 'vocab',
        deck: 'word',
        book: 'custom',
        level: 'senior',
        stageId,
        category,
        no: w.no ?? undefined,
        prompt: w.japanese,
        answer: w.english,
        explanation: exampleText(w.example, w.exampleJa),
      });
    }
  }
  return { stages, cards };
}

const toeicWords = build('word', 'toeic', loadWords(wordsCsv, 'toeic'));
const core800Words = build('word', 'core800', loadWords(core800Csv, 'core800'));
const sentences = build('composition', 'toeic', loadSentences());

/** 収録データのステージ（マイ単語帳は含まない） */
const BUILTIN_STAGES: Stage[] = [...toeicWords.stages, ...core800Words.stages, ...sentences.stages];

export function getStages(customWords: CustomWord[] = []): Stage[] {
  return [...BUILTIN_STAGES, ...buildCustom(customWords).stages];
}

export function createInitialCards(customWords: CustomWord[] = []): Card[] {
  return [...toeicWords.cards, ...core800Words.cards, ...sentences.cards, ...buildCustom(customWords).cards].map((c) => ({
    ...c,
    ...initialSrsState(),
  }));
}
