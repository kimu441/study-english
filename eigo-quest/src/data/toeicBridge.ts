import type { Card, Stage, WordLevel } from '../types';
import { initialSrsState } from '../lib/srs';
import csv from './toeic-bridge-words.csv?raw';

/**
 * 出題の向き
 *  'en-ja' : 英語を見て、日本語の意味を選ぶ（TOEIC Bridge の読解・リスニング向け）
 *  'ja-en' : 日本語を見て、英語を選ぶ（自分で言えるようにする練習）
 *  'mixed' : 問題ごとにランダム
 */
export type WordDirection = 'en-ja' | 'ja-en' | 'mixed';
export const WORD_DIRECTION: WordDirection = 'mixed';

/** 1ステージに入れる最大単語数（超えると「その2」「その3」に分割） */
const WORDS_PER_STAGE = 10;

export const LEVEL_LABEL: Record<WordLevel, string> = { junior: '中学', senior: '高校' };
const LEVEL_ORDER: WordLevel[] = ['junior', 'senior'];
const LEVEL_EMOJI: Record<WordLevel, string> = { junior: '📘', senior: '📕' };

interface Word {
  level: WordLevel;
  category: string;
  english: string;
  japanese: string;
  example: string;
  exampleJa: string;
}

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

function loadWords(): Word[] {
  const seen = new Set<string>();
  const words: Word[] = [];
  for (const r of parseCsv(csv.replace(/^\uFEFF/, ''))) {
    const [level, category, english, japanese, example = '', exampleJa = ''] = r.map((c) => c.trim());
    if (level.startsWith('#') || level === 'level') continue; // コメント行・ヘッダー行
    if (level !== 'junior' && level !== 'senior') continue;
    if (!category || !english || !japanese) continue;
    const key = `${level}:${english.toLowerCase()}`;
    if (seen.has(key)) continue; // 重複は最初の1件だけ使う
    seen.add(key);
    words.push({ level, category, english, japanese, example, exampleJa });
  }
  return words;
}

function build() {
  const words = loadWords();
  const stages: Stage[] = [];
  const cards: Omit<Card, keyof ReturnType<typeof initialSrsState>>[] = [];

  for (const level of LEVEL_ORDER) {
    const categories = [...new Set(words.filter((w) => w.level === level).map((w) => w.category))];
    for (const category of categories) {
      const group = words.filter((w) => w.level === level && w.category === category);
      const parts = Math.ceil(group.length / WORDS_PER_STAGE);
      for (let p = 0; p < parts; p++) {
        const chunk = group.slice(p * WORDS_PER_STAGE, (p + 1) * WORDS_PER_STAGE);
        const stageId = `t:${level}:${category}:${p + 1}`;
        stages.push({
          id: stageId,
          title: `${LEVEL_LABEL[level]}｜${category}${parts > 1 ? `（その${p + 1}）` : ''}`,
          description: `TOEIC Bridge 単語（${LEVEL_LABEL[level]}レベル）${chunk.length}語`,
          emoji: LEVEL_EMOJI[level],
        });
        for (const w of chunk) {
          cards.push({
            id: `w-${level}-${w.english.toLowerCase().replace(/\s+/g, '_')}`,
            type: 'vocab',
            deck: 'toeic',
            level,
            stageId,
            category,
            prompt: w.japanese,
            answer: w.english,
            explanation: w.example ? `例文：${w.example}${w.exampleJa ? `（${w.exampleJa}）` : ''}` : '',
          });
        }
      }
    }
  }
  return { stages, cards };
}

const built = build();

export const TOEIC_STAGES: Stage[] = built.stages;
export const createToeicCards = (): Card[] => built.cards.map((c) => ({ ...c, ...initialSrsState() }));