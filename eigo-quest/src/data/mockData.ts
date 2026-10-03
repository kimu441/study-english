import type { Card, CardType, Stage } from '../types';
import { initialSrsState } from '../lib/srs';

export const STAGES: Stage[] = [
  { id: 's1', title: 'はじめの一歩', description: 'あいさつと自己紹介の基本', emoji: '🌱' },
  { id: 's2', title: '毎日の暮らし', description: '家事・生活シーンの表現', emoji: '🏠' },
  { id: 's3', title: '旅行・お出かけ', description: '空港・駅・ホテルで使う英語', emoji: '✈️' },
  { id: 's4', title: '仕事・ビジネス', description: '会議・メールで使う定番フレーズ', emoji: '💼' },
  { id: 's5', title: '気持ちと意見', description: '感情や意見をスムーズに伝える', emoji: '💬' },
];

type Seed = [
  stageId: string,
  type: CardType,
  category: string,
  prompt: string,
  answer: string,
  explanation: string,
  alternatives?: string[],
];

const SEEDS: Seed[] = [
  // ---- Stage 1 ----
  ['s1', 'vocab', '食べ物', 'りんご', 'apple', 'a は母音で始まる単語の前では an になります（an apple）。'],
  ['s1', 'vocab', '人', '友達', 'friend', 'a friend of mine =「私の友達の一人」。複数形は friends。'],
  ['s1', 'speaking', 'あいさつ', 'はじめまして。', 'Nice to meet you.', '初対面の定番。返事も同じ Nice to meet you, too. でOK。', ['Pleased to meet you.']],
  ['s1', 'speaking', 'あいさつ', 'お元気ですか？', 'How are you?', "返答は I'm fine, thank you. And you? が基本形。", ["How're you?", 'How are you doing?']],
  ['s1', 'speaking', '自己紹介', '私は学生です。', "I'm a student.", "I'm = I am の短縮形。職業の前には a / an をつけます。", ['I am a student.']],
  // ---- Stage 2 ----
  ['s2', 'vocab', '家事', '洗濯をする', 'do the laundry', 'do + 家事の名詞で表現：do the dishes（皿洗い）、do the cooking（料理）。'],
  ['s2', 'vocab', '家電', '冷蔵庫', 'refrigerator', '日常会話では fridge と略すことも多いです。'],
  ['s2', 'speaking', '日課', '毎朝7時に起きます。', 'I get up at seven every morning.', '習慣は現在形。get up は「起き上がる」、wake up は「目が覚める」。', ['I get up at 7 every morning.', 'I wake up at seven every morning.']],
  ['s2', 'speaking', '進行形', '夕食を作っているところです。', "I'm making dinner.", '「今まさに〜している」は現在進行形 be + ing。', ['I am making dinner.', "I'm cooking dinner.", 'I am cooking dinner.']],
  ['s2', 'speaking', '予定', 'お風呂に入ってきます。', "I'm going to take a bath.", '「お風呂に入る」は take a bath。shower なら take a shower。', ['I am going to take a bath.', "I'll take a bath."]],
  // ---- Stage 3 ----
  ['s3', 'vocab', '旅行', '空港', 'airport', 'port は「港」。air + port = 空の港、と覚えると定着します。'],
  ['s3', 'vocab', '旅行', '予約する', 'make a reservation', 'レストランやホテルの予約。book でも言い換えられます。'],
  ['s3', 'speaking', '道案内', '駅はどこですか？', 'Where is the station?', "Where's the station? と短縮しても自然です。", ["Where's the station?"]],
  ['s3', 'speaking', '交通', 'この電車は京都に行きますか？', 'Does this train go to Kyoto?', '行き先の確認は「Does + 乗り物 + go to 場所?」が便利。', ['Is this train going to Kyoto?']],
  ['s3', 'speaking', '機内', '窓側の席をお願いします。', "I'd like a window seat, please.", "I'd like = I would like。丁寧に希望を伝える表現です。", ['I would like a window seat, please.', 'Can I have a window seat, please?', 'A window seat, please.']],
  // ---- Stage 4 ----
  ['s4', 'vocab', '仕事', '会議', 'meeting', 'have a meeting（会議がある）、attend a meeting（会議に出席する）。'],
  ['s4', 'vocab', '仕事', '締め切り', 'deadline', 'meet the deadline =「締め切りに間に合う」。'],
  ['s4', 'speaking', 'メール', '資料を送っていただけますか？', 'Could you send me the document?', 'Could you ...? は Can you ...? より丁寧な依頼表現。', ['Could you send me the materials?', 'Could you send me the file?', 'Can you send me the document?']],
  ['s4', 'speaking', '約束', '来週までに終わらせます。', "I'll finish it by next week.", 'by は「〜までに（期限）」、until は「〜までずっと（継続）」。', ['I will finish it by next week.', "I'll get it done by next week."]],
  ['s4', 'speaking', '質問', '明日の会議は何時からですか？', "What time does tomorrow's meeting start?", '予定されている未来の出来事でも、時刻表的な内容は現在形で表せます。', ["What time is tomorrow's meeting?", 'What time does the meeting start tomorrow?']],
  // ---- Stage 5 ----
  ['s5', 'vocab', '感情', '緊張している', 'nervous', "I'm nervous.（緊張してる）は面接や発表前の定番フレーズ。"],
  ['s5', 'vocab', '意見', '〜に賛成する', 'agree with', 'agree with + 人/意見、agree to + 提案。前置詞の違いに注意。'],
  ['s5', 'speaking', '意見', 'それは良い考えだと思います。', "I think that's a good idea.", 'I think で断定を和らげるのが英語らしい言い方。', ["I think it's a good idea.", 'I think that is a good idea.']],
  ['s5', 'speaking', '質問', 'もう少し詳しく教えてもらえますか？', 'Could you tell me a little more?', '追加説明のお願い。a little more で「もう少し」。', ['Could you explain a little more?', 'Could you tell me more?']],
  ['s5', 'speaking', '意見', 'それについてどう思いますか？', 'What do you think about that?', '意見を求める定番。how do you feel about ...? も近い表現。', ['What do you think of that?', 'What do you think about it?', 'How do you feel about that?']],
];

export function createInitialCards(): Card[] {
  return SEEDS.map(([stageId, type, category, prompt, answer, explanation, alternatives], i) => ({
    id: `c${String(i + 1).padStart(3, '0')}`,
    type,
    stageId,
    category,
    prompt,
    answer,
    alternatives,
    explanation,
    ...initialSrsState(),
  }));
}