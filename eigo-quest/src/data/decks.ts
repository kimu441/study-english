import type { Card, Deck, Stage, WordLevel } from '../types';
import { initialSrsState } from '../lib/srs';
import wordsCsv from './toeic-bridge-words.csv?raw';
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
const DECK_LABEL: Record<Deck, string> = { word: 'TOEIC Bridge 単語', composition: '瞬間英作文' };
const UNIT: Record<Deck, string> = { word: '語', composition: '文' };

/** ダブルクォート対応の簡易CSVパーサー */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

type CardContent = Omit<Card, keyof ReturnType<typeof initialSrsState>>;
type Item = { level: WordLevel; category: string; content: Omit<CardContent, 'stageId' | 'deck' | 'level' | 'category'> };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** CSV の行を [level, category, ...rest] に分解（コメント行・ヘッダー行・不正な行は除く） */
function dataRows(text: string) {
  return parseCsv(text.replace(/^﻿/, ''))
    .map((r) => r.map((c) => c.trim()))
    .filter(([level, category]) => (level === 'junior' || level === 'senior') && !!category)
    .map(([level, category, ...rest]) => ({ level: level as WordLevel, category, rest }));
}

/** 単語CSV: level,category,english,japanese,example,example_ja */
function loadWords(): Item[] {
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const { level, category, rest } of dataRows(wordsCsv)) {
    const [english, japanese, example = '', exampleJa = ''] = rest;
    if (!english || !japanese) continue;
    const key = `${level}:${english.toLowerCase()}`;
    if (seen.has(key)) continue; // 重複は最初の1件だけ使う
    seen.add(key);
    items.push({
      level,
      category,
      content: {
        id: `w-${level}-${english.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'vocab',
        prompt: japanese,
        answer: english,
        explanation: example ? `例文：${example}${exampleJa ? `（${exampleJa}）` : ''}` : '',
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

/** レベル → カテゴリの順にステージへ分割する */
function build(deck: Deck, items: Item[]) {
  const stages: Stage[] = [];
  const cards: CardContent[] = [];

  for (const level of LEVELS) {
    const categories = [...new Set(items.filter((w) => w.level === level).map((w) => w.category))];
    for (const category of categories) {
      const group = items.filter((w) => w.level === level && w.category === category);
      const parts = Math.ceil(group.length / ITEMS_PER_STAGE);
      for (let p = 0; p < parts; p++) {
        const chunk = group.slice(p * ITEMS_PER_STAGE, (p + 1) * ITEMS_PER_STAGE);
        // 単語は既存の学習データと互換性を保つため 't:' プレフィックスのまま
        const stageId = `${deck === 'word' ? 't' : 'c'}:${level}:${category}:${p + 1}`;
        stages.push({
          id: stageId,
          deck,
          level,
          title: `${category}${parts > 1 ? `（その${p + 1}）` : ''}`,
          description: `${DECK_LABEL[deck]}（${LEVEL_LABEL[level]}レベル）${chunk.length}${UNIT[deck]}`,
          emoji: STAGE_EMOJI[deck][level],
        });
        for (const w of chunk) cards.push({ ...w.content, deck, level, stageId, category });
      }
    }
  }
  return { stages, cards };
}

const words = build('word', loadWords());
const sentences = build('composition', loadSentences());

export const STAGES: Stage[] = [...words.stages, ...sentences.stages];

export function createInitialCards(): Card[] {
  return [...words.cards, ...sentences.cards].map((c) => ({ ...c, ...initialSrsState() }));
}
