const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toKey(new Date());

export const isValidKey = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && toKey(fromKey(key)) === key;

export const addDays = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const addMonths = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return toKey(d);
};

export const startOfMonth = (key: string) => `${key.slice(0, 8)}01`;

export const endOfMonth = (key: string) => {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

export const startOfWeek = (key: string, weekStartsOn: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() - ((d.getDay() - weekStartsOn + 7) % 7));
  return toKey(d);
};

export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

/** All the days shown by a month grid, in whole weeks. */
export function monthGrid(key: string, weekStartsOn: number): string[] {
  const start = startOfWeek(startOfMonth(key), weekStartsOn);
  const weeks = Math.ceil((daysBetween(start, endOfMonth(key)) + 1) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export function weekdayLabels(weekStartsOn: number): string[] {
  // 2024-01-07 is a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    capitalize(new Date(2024, 0, 7 + weekStartsOn + i).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')),
  );
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatLong = (key: string) =>
  capitalize(fromKey(key).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));

export const formatMonth = (key: string) =>
  capitalize(fromKey(key).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));

export const formatShort = (key: string) =>
  fromKey(key).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export type RangeMode = 'week' | 'month' | 'year';

export function rangeFor(mode: RangeMode, anchor: string, weekStartsOn: number) {
  if (mode === 'week') {
    const from = startOfWeek(anchor, weekStartsOn);
    const to = addDays(from, 6);
    return { from, to, label: `${formatShort(from)} – ${formatShort(to)}` };
  }
  if (mode === 'month') {
    return { from: startOfMonth(anchor), to: endOfMonth(anchor), label: formatMonth(anchor) };
  }
  const year = anchor.slice(0, 4);
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: year };
}

export function shiftAnchor(mode: RangeMode, anchor: string, dir: 1 | -1) {
  if (mode === 'week') return addDays(anchor, 7 * dir);
  if (mode === 'month') return addMonths(anchor, dir);
  return addMonths(anchor, 12 * dir);
}
