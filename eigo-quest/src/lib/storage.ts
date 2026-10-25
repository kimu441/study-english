/**
 * LocalStorage の安全な読み書き。
 * プライベートモードや容量超過で例外が出ても、アプリは既定値で動き続ける。
 */
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readPref(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
