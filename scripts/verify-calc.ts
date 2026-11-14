import { computeBazi, BaziInput, sanitizeInput } from '../src/lib/bazi';

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
console.log(`\n全部 ${cases.length + 2} 项通过 ✓`);
