/** 緑の立体ボタン（決定・開始など）。余白と文字サイズは使う側で足す */
export const BTN_PRIMARY =
  'rounded-2xl border-b-4 border-green-700 bg-green-500 font-black text-white transition active:translate-y-0.5 active:border-b-2 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400';

/** 選択肢カードの枠と文字色（選択中 / 未選択） */
export const choiceClass = (on: boolean) => (on ? 'border-sky-400 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-400');
