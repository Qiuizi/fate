import { computeBazi, BaziInput, resolveCivilSolar, sanitizeInput } from '../src/lib/bazi';
import { dstMinusOneHour, isChinaDST } from '../src/lib/dstCn';

const BASE: BaziInput = {
  calendar: 'solar',
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: 'male',
  trueSolar: false,
  useEot: true,
  longitude: 120,
  utcOffset: 8,
  zishiSect: 2,
  isLeapMonth: false,
};

interface Case {
  name: string;
  input: Partial<BaziInput>;
  full?: [string, string, string, string];
  year?: string;
  day?: string;
  solarPrefix?: string;
}

const cases: Case[] = [
  { name: '2000-01-01 12:00（元旦）', input: { year: 2000, month: 1, day: 1, hour: 12 }, full: ['己卯', '丙子', '戊午', '戊午'] },
  { name: '1986-05-29 10:30（示例）', input: { year: 1986, month: 5, day: 29, hour: 10, minute: 30 }, full: ['丙寅', '癸巳', '癸酉', '丁巳'] },
  { name: '1990-02-03（立春前）', input: { year: 1990, month: 2, day: 3, hour: 12 }, year: '己巳' },
  { name: '1990-02-05（立春后）', input: { year: 1990, month: 2, day: 5, hour: 12 }, full: ['庚午', '戊寅', '辛丑', '甲午'] },
  { name: '2024-02-04 10:00（立春前）', input: { year: 2024, month: 2, day: 4, hour: 10 }, year: '癸卯' },
  { name: '2024-02-04 20:00（立春后）', input: { year: 2024, month: 2, day: 4, hour: 20 }, year: '甲辰' },
  { name: '真太阳时·23:00 换日（sect1）', input: { year: 2024, month: 6, day: 15, hour: 23, minute: 45, trueSolar: true, longitude: 112, zishiSect: 1 }, day: '辛亥' },
  { name: '真太阳时·00:00 换日（sect2）', input: { year: 2024, month: 6, day: 15, hour: 23, minute: 45, trueSolar: true, longitude: 112, zishiSect: 2 }, day: '庚戌' },
  { name: '农历 2023 闰二月三十（该月只有 29 天，夹到闰二月廿九 2023-04-19）', input: { calendar: 'lunar', year: 2023, month: 2, day: 30, isLeapMonth: true, hour: 12 }, solarPrefix: '2023-04-19' },
  { name: '农历 2024 正月三十（该月只有 29 天，夹到正月廿九 2024-03-09）', input: { calendar: 'lunar', year: 2024, month: 1, day: 30, hour: 12 }, solarPrefix: '2024-03-09' },
  { name: '农历 2024 无闰二月却勾闰月（按二月初一 2024-03-10）', input: { calendar: 'lunar', year: 2024, month: 2, day: 1, isLeapMonth: true, hour: 12 }, solarPrefix: '2024-03-10' },
  { name: '农历 2023 闰二月初一（应 2023-03-22）', input: { calendar: 'lunar', year: 2023, month: 2, day: 1, isLeapMonth: true, hour: 12 }, full: ['癸卯', '乙卯', '己卯', '庚午'], solarPrefix: '2023-03-22' },
];

let failed = 0;

for (const c of cases) {
  const input: BaziInput = { ...BASE, ...c.input };
  let r;
  try {
    r = computeBazi(input, 2026);
  } catch (e: any) {
    failed++;
    console.log(`✗ ${c.name} — 计算异常：${e?.message || e}`);
    continue;
  }
  const got = r.pillars.map((p) => p.ganZhi);
  const checks: string[] = [];
  if (c.full) checks.push(`四柱 ${got.join(' ')} ${c.full.every((e, i) => got[i] === e) ? '✓' : `✗(应 ${c.full.join(' ')})`}`);
  if (c.year) checks.push(`年柱 ${got[0]} ${got[0] === c.year ? '✓' : `✗(应 ${c.year})`}`);
  if (c.day) checks.push(`日柱 ${got[2]} ${got[2] === c.day ? '✓' : `✗(应 ${c.day})`}`);
  if (c.solarPrefix) checks.push(`公历 ${r.solarText.slice(0, 10)} ${r.solarText.startsWith(c.solarPrefix) ? '✓' : `✗(应 ${c.solarPrefix})`}`);

  const ok =
    (!c.full || c.full.every((e, i) => got[i] === e)) &&
    (!c.year || got[0] === c.year) &&
    (!c.day || got[2] === c.day) &&
    (!c.solarPrefix || r.solarText.startsWith(c.solarPrefix));

  console.log(`${ok ? '✓' : '✗'} ${c.name} — ${checks.join('；')}`);
  if (!ok) failed++;
}

// 中国历史夏令时判定（通行口径判断表）：日期口径，起止日都含
const dstCases: Array<{ name: string; y: number; m: number; d: number; want: boolean }> = [
  { name: '1988-06-15 00:30（夏令时内）', y: 1988, m: 6, d: 15, want: true },
  { name: '1985-06-15（无夏令时）', y: 1985, m: 6, d: 15, want: false },
  { name: '1992-06-15（夏令时已结束）', y: 1992, m: 6, d: 15, want: false },
];
const dstBounds: Array<[number, number, number, number, number]> = [
  [1986, 5, 4, 9, 14],
  [1987, 4, 12, 9, 13],
  [1988, 4, 10, 9, 11],
  [1989, 4, 16, 9, 17],
  [1990, 4, 15, 9, 16],
  [1991, 4, 14, 9, 15],
];
const prevDay = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d) - 86400000);
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()] as const;
};
const nextDay = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d) + 86400000);
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()] as const;
};
for (const [y, m1, d1, m2, d2] of dstBounds) {
  dstCases.push({ name: `${y}-${m1}-${d1} 起始日`, y, m: m1, d: d1, want: true });
  dstCases.push({ name: `${y}-${m2}-${d2} 结束日`, y, m: m2, d: d2, want: true });
  const [py, pm, pd] = prevDay(y, m1, d1);
  dstCases.push({ name: `${py}-${pm}-${pd} 起始日前一日`, y: py, m: pm, d: pd, want: false });
  const [ny, nm, nd] = nextDay(y, m2, d2);
  dstCases.push({ name: `${ny}-${nm}-${nd} 结束日后一日`, y: ny, m: nm, d: nd, want: false });
}
for (const c of dstCases) {
  const got = isChinaDST(c.y, c.m, c.d);
  const ok = got === c.want;
  console.log(`${ok ? '✓' : '✗'} 夏令时 ${c.name} — ${got}`);
  if (!ok) failed++;
}

// 夏令时「减 1 小时」：真实日期运算，跨日 / 跨月 / 跨年；农历录入换算回农历（含闰月），再排盘结果须与公历减 1 小时一致
const fmtIn = (i: Partial<BaziInput>) =>
  `${i.calendar === 'lunar' ? '农历' : '公历'} ${i.year}-${i.month}${i.isLeapMonth ? '(闰)' : ''}-${i.day} ${String(i.hour).padStart(2, '0')}:${String(i.minute).padStart(2, '0')}`;
const dstShiftCases: Array<{
  name: string;
  input: Partial<BaziInput>;
  want: Partial<BaziInput>;
  dayGz?: string;
  hourGz?: string;
  sameAsSolar?: Partial<BaziInput>;
}> = [
  {
    name: '1988-06-15 00:30 跨日 → 1988-06-14 23:30（庚子日戊子时）',
    input: { year: 1988, month: 6, day: 15, hour: 0, minute: 30 },
    want: { calendar: 'solar', year: 1988, month: 6, day: 14, hour: 23, minute: 30, isLeapMonth: false },
    dayGz: '庚子',
    hourGz: '戊子',
  },
  {
    name: '1988-07-01 00:30 跨月 → 1988-06-30 23:30',
    input: { year: 1988, month: 7, day: 1, hour: 0, minute: 30 },
    want: { calendar: 'solar', year: 1988, month: 6, day: 30, hour: 23, minute: 30, isLeapMonth: false },
  },
  {
    name: '1988-06-15 10:30 不跨日 → 09:30',
    input: { year: 1988, month: 6, day: 15, hour: 10, minute: 30 },
    want: { calendar: 'solar', year: 1988, month: 6, day: 15, hour: 9, minute: 30, isLeapMonth: false },
  },
  {
    // 1987 年闰六月初一 = 公历 1987-07-26；减 1 小时退到六月三十（非闰，该月大）
    name: '农历 1987 闰六月初一 00:30 → 六月三十 23:30（闰月跨回本月）',
    input: { calendar: 'lunar', year: 1987, month: 6, day: 1, isLeapMonth: true, hour: 0, minute: 30 },
    want: { calendar: 'lunar', year: 1987, month: 6, day: 30, hour: 23, minute: 30, isLeapMonth: false },
    sameAsSolar: { year: 1987, month: 7, day: 25, hour: 23, minute: 30 },
  },
  {
    // 1987 年七月初一 = 公历 1987-08-24；减 1 小时退到闰六月最后一天
    name: '农历 1987 七月初一 00:30 → 闰六月廿九 23:30（跨入闰月）',
    input: { calendar: 'lunar', year: 1987, month: 7, day: 1, hour: 0, minute: 30 },
    want: { calendar: 'lunar', year: 1987, month: 6, day: 29, hour: 23, minute: 30, isLeapMonth: true },
    sameAsSolar: { year: 1987, month: 8, day: 23, hour: 23, minute: 30 },
  },
];
for (const c of dstShiftCases) {
  const input: BaziInput = { ...BASE, ...c.input };
  const civil = resolveCivilSolar(input);
  const inDst = isChinaDST(civil.y, civil.m, civil.d);
  const next = { calendar: input.calendar, ...dstMinusOneHour(input.calendar, civil) };
  const fieldsOk = (Object.keys(c.want) as (keyof BaziInput)[]).every((k) => (next as any)[k] === (c.want as any)[k]);
  const r = computeBazi({ ...input, ...next }, 2026);
  const got = r.pillars.map((p) => p.ganZhi);
  const pillarOk = (!c.dayGz || got[2] === c.dayGz) && (!c.hourGz || got[3] === c.hourGz);
  let solarOk = true;
  if (c.sameAsSolar) {
    const ref = computeBazi({ ...BASE, ...c.sameAsSolar }, 2026).pillars.map((p) => p.ganZhi);
    solarOk = ref.every((g, i) => g === got[i]);
  }
  const ok = inDst && fieldsOk && pillarOk && solarOk;
  console.log(
    `${ok ? '✓' : '✗'} 夏令时减 1 小时 ${c.name} — 得到 ${fmtIn(next)}，四柱 ${got.join(' ')}` +
      (inDst ? '' : '（原时间不在夏令时内）') +
      (c.sameAsSolar ? `，与公历 ${fmtIn({ calendar: 'solar', ...c.sameAsSolar })} ${solarOk ? '一致' : '不一致'}` : '')
  );
  if (!ok) failed++;
}

// 损坏 / 非法输入（URL 参数、旧备份）应被整理成可计算的值，而不是抛异常白屏
const junk = sanitizeInput({ year: 'abc', month: 13, day: 31, hour: NaN, minute: -5, longitude: 'x', utcOffset: 99 } as any, BASE);
try {
  const r = computeBazi(junk, 2026);
  const ok = junk.year === BASE.year && junk.month === 12 && junk.day === 31 && junk.hour === BASE.hour && junk.minute === 0 && junk.longitude === BASE.longitude && junk.utcOffset === BASE.utcOffset;
  console.log(`${ok ? '✓' : '✗'} 非法输入整理后可排盘 — ${r.solarText}`);
  if (!ok) failed++;
} catch (e: any) {
  failed++;
  console.log(`✗ 非法输入整理后仍异常：${e?.message || e}`);
}
const feb = sanitizeInput({ year: 2023, month: 2, day: 30 } as any, BASE);
console.log(`${feb.day === 28 ? '✓' : '✗'} 公历 2023-02-30 夹到 02-28（得到 ${feb.day}）`);
if (feb.day !== 28) failed++;

if (failed) {
  throw new Error(`回归失败：有 ${failed} 项未通过`);
}
console.log(`\n全部 ${cases.length + dstCases.length + dstShiftCases.length + 2} 项通过 ✓`);
