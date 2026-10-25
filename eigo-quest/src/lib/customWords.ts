import type { CustomWord } from '../types';
import { parseCsv } from './csv';

export type WordInput = Omit<CustomWord, 'id'>;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const key = (english: string) => english.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * 貼り付け・ファイルの単語リストを読む。
 * 1行 = 番号,英語,日本語,例文,例文訳（番号・例文・例文訳は省略可）。
 * カンマ区切りのほか、表計算ソフトからコピーしたタブ区切りにも対応する。
 * 英字を含まない行（見出し行など）と、英語・日本語が欠けた行は読み飛ばす。
 */
export function parseWordList(text: string): { words: WordInput[]; skipped: number } {
  const clean = text.replace(/^﻿/, '');
  const rows = clean.includes('\t')
    ? clean
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => l.split('\t'))
    : parseCsv(clean);

  const words: WordInput[] = [];
  let skipped = 0;
  for (const raw of rows) {
    const cells = raw.map((c) => c.trim());
    const hasNo = /^\d+$/.test(cells[0] ?? '');
    const [english = '', japanese = '', example = '', exampleJa = ''] = hasNo ? cells.slice(1) : cells;
    if (!/[a-z]/i.test(english) || !japanese) {
      skipped++;
      continue;
    }
    words.push({ no: hasNo ? Number(cells[0]) : null, english, japanese, example, exampleJa });
  }
  return { words, skipped };
}

/** 英語が同じ単語は上書き（ID と学習記録はそのまま）、それ以外は追加する */
export function mergeCustomWords(existing: CustomWord[], incoming: WordInput[]) {
  const list = [...existing];
  const index = new Map(list.map((w, i) => [key(w.english), i]));
  let added = 0;
  let updated = 0;
  for (const w of incoming) {
    const i = index.get(key(w.english));
    if (i === undefined) {
      index.set(key(w.english), list.length);
      list.push({ ...w, id: newId() });
      added++;
    } else {
      list[i] = { ...w, id: list[i].id };
      updated++;
    }
  }
  return { list, added, updated };
}
