/** 今日のゴールの色分け（達成したら緑、まだなら青） */
export const goalTone = (done: boolean) =>
  done
    ? { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500' }
    : { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', bar: 'bg-indigo-500' };
