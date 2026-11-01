import { useCallback, useState } from 'react';
import { readPref, writePref } from './storage';

/**
 * LocalStorage に保存する設定値の state。
 * 初回は保存済みの値を parse して読み込み、変更すると保存する。
 */
export function usePref<T extends string>(key: string, parse: (raw: string | null) => T): [T, (value: T) => void] {
  const [value, setValue] = useState(() => parse(readPref(key)));
  const set = useCallback(
    (v: T) => {
      setValue(v);
      writePref(key, v);
    },
    [key],
  );
  return [value, set];
}
