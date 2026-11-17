import { Solar } from 'lunar-javascript';

/**
 * 中国大陆夏令时判定 —— 与紫微源码 `ziwei/src/lib/ziwei/dst-cn.ts` 的通行口径逐字一致。
 *
 * 表与判定逻辑按通行口径整理（XLS_CN 表与其判定函数），起止日均含；表内年份为 1935–1979 年间的若干年与 1986–1991 年。
 * 夏令时期间钟表拨快 1 小时，出生时刻落在时辰边界的人会因此排错日柱 / 时柱，
 * 所以只做提示、不自动改时间：无法得知用户填的是当年钟表读数，还是已换算过的标准时间。
 * 用户亲手点「减 1 小时」后，用 shiftCivilMinutes 做真实日期运算（可跨日、跨月、跨年）。
 */

/** 通行口径 XLS_CN，逐字照抄：[年, 起月, 起日, 止月, 止日]，起止日**都含**。 */
const XLS_CN: readonly (readonly [number, number, number, number, number])[] = [
  [1935, 5, 1, 9, 30], [1936, 5, 1, 9, 30], [1937, 5, 1, 9, 30], [1938, 5, 1, 9, 30],
  [1939, 5, 1, 9, 30], [1940, 5, 1, 9, 30], [1941, 5, 1, 9, 30], [1942, 5, 1, 9, 30],
  [1943, 5, 1, 9, 30], [1944, 5, 1, 9, 30], [1945, 5, 1, 9, 30], [1946, 5, 1, 9, 30],
  [1947, 5, 1, 9, 30], [1948, 5, 1, 9, 30], [1949, 5, 1, 9, 30], [1950, 5, 1, 9, 30],
  [1951, 5, 1, 9, 30], [1952, 3, 1, 10, 31], [1953, 4, 1, 10, 31], [1954, 4, 1, 10, 31],
  [1955, 5, 1, 9, 30], [1956, 5, 1, 9, 30], [1957, 4, 1, 9, 30], [1958, 4, 1, 9, 30],
  [1959, 4, 1, 9, 30], [1960, 6, 1, 9, 30], [1961, 6, 1, 9, 30], [1974, 4, 1, 10, 31],
  [1975, 4, 1, 10, 31], [1979, 7, 1, 9, 30], [1986, 5, 4, 9, 14], [1987, 4, 12, 9, 13],
  [1988, 4, 10, 9, 11], [1989, 4, 16, 9, 17], [1990, 4, 15, 9, 16], [1991, 4, 14, 9, 15],
] as const;

/**
 * 该公历日期是否处于中国大陆夏令时期间。
 *
 * 判定逻辑逐字对齐通行口径：**纯按日期**，不看小时。
 * 原式：
 *   if (month > m1 && month < m2) return true;
 *   if (month == m1) { if (day >= d1) return true; }
 *   else if (month == m2) { if (day <= d2) return true; }
 * 注意 `else if` —— 当 month == m1 且 day < d1 时不会再比 m2 分支，这与通行口径一致。
 */
export function isChinaDST(year: number, month: number, day: number): boolean {
  for (const [y, m1, d1, m2, d2] of XLS_CN) {
    if (year !== y) continue;
    if (month > m1 && month < m2) return true;
    if (month === m1) {
      if (day >= d1) return true;
    } else if (month === m2) {
      if (day <= d2) return true;
    }
  }
  return false;
}

/** 该年是否在夏令时表内。 */
export function isChinaDSTYear(year: number): boolean {
  return XLS_CN.some(([y]) => y === year);
}

/** 该年的夏令时区间（供文案展示）。不在表内返回 null。 */
export function chinaDSTRange(year: number): { start: string; end: string } | null {
  const hit = XLS_CN.find(([y]) => y === year);
  if (!hit) return null;
  const [, m1, d1, m2, d2] = hit;
  return { start: `${m1} 月 ${d1} 日`, end: `${m2} 月 ${d2} 日` };
}

/** 公历钟点平移 deltaMin 分钟，按真实日期运算（跨日 / 跨月 / 跨年都正确）。 */
export function shiftCivilMinutes(
  civil: { y: number; m: number; d: number; hh: number; mm: number },
  deltaMin: number
): { y: number; m: number; d: number; hh: number; mm: number } {
  const t = new Date(Date.UTC(civil.y, civil.m - 1, civil.d, civil.hh, civil.mm) + deltaMin * 60000);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    hh: t.getUTCHours(),
    mm: t.getUTCMinutes(),
  };
}

/** 公历日期 → 农历（lunar-javascript）；isLeapMonth 表示闰月，month 恒为正。 */
export function solarToLunarYmd(y: number, m: number, d: number): { year: number; month: number; day: number; isLeapMonth: boolean } {
  const l = Solar.fromYmd(y, m, d).getLunar();
  const month = Number(l.getMonth());
  return { year: Number(l.getYear()), month: Math.abs(month), day: Number(l.getDay()), isLeapMonth: month < 0 };
}

/** 夏令时提示所需的最小录入字段（与 BaziInput 同名同义）。 */
export interface DstInput {
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
  hour: number;
  minute: number;
}

/** 录入值签名：用来判断「已按标准时间调整」之后用户有没有再改过日期 / 时间。 */
export function dstInputKey(i: DstInput): string {
  return [i.calendar, i.year, i.month, i.day, i.isLeapMonth ? 1 : 0, i.hour, i.minute].join('|');
}

/**
 * 「减 1 小时」：把当年钟表读数换成标准时间。
 * civil 为该录入换算出的公历钟点（农历录入先经 resolveCivilSolar 换成公历）。
 * 公历录入直接回填公历；农历录入用 lunar-javascript 换算回农历（含闰月）后回填，
 * 保证再排盘结果与「公历减 1 小时」完全一致。
 */
export function dstMinusOneHour(
  calendar: 'solar' | 'lunar',
  civil: { y: number; m: number; d: number; hh: number; mm: number }
): { year: number; month: number; day: number; isLeapMonth: boolean; hour: number; minute: number } {
  const t = shiftCivilMinutes(civil, -60);
  if (calendar === 'lunar') {
    const l = solarToLunarYmd(t.y, t.m, t.d);
    return { year: l.year, month: l.month, day: l.day, isLeapMonth: l.isLeapMonth, hour: t.hh, minute: t.mm };
  }
  return { year: t.y, month: t.m, day: t.d, isLeapMonth: false, hour: t.hh, minute: t.mm };
}
