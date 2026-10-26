interface Props {
  /** 0〜100 */
  pct: number;
  /** 外枠（高さ・背景色・余白など） */
  className?: string;
  /** バーの色など */
  barClass?: string;
}

/** 横長の進捗バー */
export default function ProgressBar({ pct, className = 'h-3 bg-slate-200', barClass = 'bg-green-500' }: Props) {
  return (
    <div className={`overflow-hidden rounded-full ${className}`}>
      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
