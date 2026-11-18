/* 「复制给 AI」导出自检：交给 AI 的数据必须与应用排出的盘逐项一致，且隐私模式不泄露生辰。
 * 用法：npm run test:ai   （全部为合成时刻，不含真实生辰）
 */
import { computeBazi, BaziInput } from '../src/lib/bazi';
import { analyzeRelations } from '../src/lib/relations';
import { computeShenSha } from '../src/lib/shensha';
import { assessPattern, assessStrength, favorable } from '../src/lib/structure';
import { isChinaDST } from '../src/lib/dstCn';
import { computeCompat } from '../src/lib/compat';
import { readFileSync } from 'node:fs';
import { buildSkillMd } from '../src/lib/aiSkill';
import { buildAiPayload, buildAiPrompt, buildCompatAiPayload, buildCompatAiPrompt, AI_SCHEMA } from '../src/lib/aiExport';

const BASE: BaziInput = {
  calendar: 'solar', year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male',
  trueSolar: false, useEot: true, longitude: 120, utcOffset: 8, zishiSect: 2, isLeapMonth: false,
};
const CY = 2026;
const cases: { name: string; input: Partial<BaziInput>; expectDst?: boolean; city?: string; expectTerm?: string; expectHour?: boolean }[] = [
  { name: '公历 1992-08-17 14:25 女', input: { year: 1992, month: 8, day: 17, hour: 14, minute: 25, gender: 'female' } },
  { name: '真太阳时 · 2001-03-05 06:40 · 乌鲁木齐', input: { year: 2001, month: 3, day: 5, hour: 6, minute: 40, trueSolar: true, longitude: 87.62, cityName: '新疆 · 乌鲁木齐', useEot: true }, city: '乌鲁木齐' },
  { name: '晚子时 23:30 · 23:00 换日', input: { year: 1977, month: 11, day: 2, hour: 23, minute: 30, zishiSect: 1 } },
  { name: '夏令时期间 1988-06-15 00:30', input: { year: 1988, month: 6, day: 15, hour: 0, minute: 30 }, expectDst: true },
  { name: '农历 2023 闰二月初十 08:05', input: { calendar: 'lunar', year: 2023, month: 2, day: 10, isLeapMonth: true, hour: 8, minute: 5, gender: 'female' } },
  { name: '尚未起运的幼儿 2025-09-09 09:09', input: { year: 2025, month: 9, day: 9, hour: 9, minute: 9 } },
  { name: '立春前数小时 2024-02-04 10:00', input: { year: 2024, month: 2, day: 4, hour: 10, minute: 0 }, expectTerm: '立春' },
  { name: '时辰分界旁 1995-05-20 08:50', input: { year: 1995, month: 5, day: 20, hour: 8, minute: 50, gender: 'female' }, expectHour: true },
];

let failed = 0, total = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  total++;
  if (!cond) { failed++; console.log(`✗ ${name} ${extra}`); }
};
const pad = (x: number) => String(x).padStart(2, '0');

for (const c of cases) {
  const r = computeBazi({ ...BASE, ...c.input } as BaziInput, CY);
  const p = buildAiPayload(r);
  const n = c.name;
  const ps = Object.values(p.pillars);
  ok(`${n}：schema`, p.schema === AI_SCHEMA);
  ok(`${n}：四柱一致`, ps.map((x) => x.ganZhi).join() === r.pillars.map((x) => x.ganZhi).join());
  r.pillars.forEach((rp, i) => {
    const x = ps[i];
    ok(`${n}：${rp.role}十神/纳音/星运/自坐/空亡`, x.tenGod === rp.shiShen && x.naYin === rp.naYin && x.dayMasterStage.value === rp.xingYun && x.selfStage.value === rp.selfStage && x.isVoid === rp.isXunKong);
    ok(`${n}：${rp.role}藏干与十神`, JSON.stringify(x.hiddenStems.map((h) => [h.stem, h.element, h.tenGod])) === JSON.stringify(rp.hidden.map((h) => [h.gan, h.element, h.shiShen])));
    ok(`${n}：${rp.role}五行阴阳`, x.stemElement === rp.ganEl && x.branchElement === rp.zhiEl && x.stemYinYang === rp.ganYinYang && x.branchYinYang === rp.zhiYinYang);
  });
  ok(`${n}：日主/月令/日空`, p.dayMaster.stem === r.dayMaster.gan && p.monthCommand.branch === r.pillars[1].zhi && p.monthCommand.afterJie === r.jieQi.monthJie && p.dayVoid === r.dayXunKong);
  ok(`${n}：五行`, JSON.stringify(p.fiveElements.visibleCount) === JSON.stringify(r.visibleCount) && Object.entries(p.fiveElements.weighted).every(([e, v]) => Math.abs(v - (r.weighted as any)[e]) < 0.006));
  const rel = analyzeRelations(r.pillars);
  ok(`${n}：干支关系`, JSON.stringify([...p.relations.stems, ...p.relations.branches].map((x) => x.text)) === JSON.stringify([...rel.gan, ...rel.zhi].map((x) => x.text)));
  ok(`${n}：神煞`, JSON.stringify(p.shensha) === JSON.stringify(computeShenSha(r.pillars).list.map((x) => ({ name: x.name, pillars: x.roles }))));
  ok(`${n}：应用参考`, p.appReference.strength.label === assessStrength(r).label && p.appReference.pattern.name === assessPattern(r).name && p.appReference.favorableElements.join() === favorable(r).join());
  ok(`${n}：大运`, JSON.stringify(p.luck.pillars.map((l) => [l.ganZhi, l.tenGod, l.ages, l.years, l.current])) === JSON.stringify(r.luck.map((l) => [l.ganZhi, l.shiShen, `${l.startAge}–${l.endAge}`, `${l.startYear}–${l.endYear}`, l.current])));
  ok(`${n}：起运/方向`, p.luck.direction === r.yun.direction && p.luck.start.startsWith(r.yun.startText));
  const ln = r.luck.flatMap((l) => l.liuNian).find((x) => x.year === CY);
  ok(`${n}：当前流年`, ln ? p.luck.currentLiuNian?.ganZhi === ln.ganZhi && p.luck.currentLiuNian?.age === ln.age : p.luck.currentLiuNian === null);
  // 流年时间表：逐年取自应用大运流年表（当前年 ±5），交运年标记与大运起始年一致
  const expectTl = r.luck.flatMap((l) => l.liuNian.filter((x) => Math.abs(x.year - CY) <= 5).map((x) => [x.year, x.age, x.ganZhi, x.shiShen, l.ganZhi, x.year === l.startYear]));
  ok(`${n}：流年时间表`, JSON.stringify(p.luck.timeline.map((x) => [x.year, x.age, x.ganZhi, x.tenGod, x.luck, x.luckStarts])) === JSON.stringify(expectTl));
  ok(`${n}：大运不再重复附流年`, p.luck.pillars.every((l) => !('liuNian' in l)));
  // 临界提醒：用另一种写法独立核对（时辰分界在奇数整点；节令取前后相邻节气中的「节」）
  const em = r.effective.hh * 60 + r.effective.mm;
  const hourDist = Math.min(...[-1, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25].map((h) => Math.abs(em - h * 60)));
  const sens = (p.receipt as any).sensitivity;
  ok(`${n}：临界提醒 · 时辰`, sens.hourBoundaryNear === hourDist <= 30 && (c.expectHour === undefined || sens.hourBoundaryNear === c.expectHour));
  const toT = (s: string) => new Date(s.replace(' ', 'T') + 'Z').getTime();
  const effT = Date.UTC(r.effective.y, r.effective.m - 1, r.effective.d, r.effective.hh, r.effective.mm, r.effective.ss || 0);
  const JIE = '立春惊蛰清明立夏芒种小暑立秋白露寒露立冬大雪小寒';
  const termHit = [[r.jieQi.prev, r.jieQi.prevTime], [r.jieQi.next, r.jieQi.nextTime]].find(([nm, t]) => JIE.includes(nm) && nm.length === 2 && Math.abs(toT(t) - effT) <= 24 * 3600e3);
  ok(`${n}：临界提醒 · 交节`, sens.solarTermNear === !!termHit && (!c.expectTerm || (termHit?.[0] === c.expectTerm && sens.notes.some((x: string) => x.includes(c.expectTerm!) && x.includes('年柱')))));
  ok(`${n}：临界提醒 · 无提醒时为空`, sens.hourBoundaryNear || sens.solarTermNear || r.input.zishiSect !== 1 || sens.notes.length === 0);
  const rc = p.receipt as any;
  ok(`${n}：口径 · 子时`, rc.zishi.startsWith(r.input.zishiSect === 1 ? '23:00' : '00:00'));
  ok(`${n}：口径 · 真太阳时`, rc.trueSolarTime.applied === r.tst.applied && (!r.tst.applied || Math.abs(rc.trueSolarTime.correctionMinutes - r.tst.deltaMinutes) < 0.06));
  ok(`${n}：口径 · 有效时刻`, rc.effectiveTime === `${r.effective.y}-${pad(r.effective.m)}-${pad(r.effective.d)} ${pad(r.effective.hh)}:${pad(r.effective.mm)}`);
  ok(`${n}：口径 · 节气区间`, rc.solarTerms.prev === r.jieQi.prev && rc.solarTerms.next === r.jieQi.next && rc.solarTerms.prevTime === r.jieQi.prevTime);
  ok(`${n}：口径 · 夏令时`, rc.dst.inChinaDstPeriod === isChinaDST(r.civil.y, r.civil.m, r.civil.d) && (c.expectDst === undefined || rc.dst.inChinaDstPeriod === c.expectDst));

  // 提示词：完整版 JSON 与数据一致；精简版不带 JSON 但事实一项不少；包含规则与输出结构；结果可复现
  const md = buildAiPrompt(r);
  const fullMd = buildAiPrompt(r, { detail: 'full' });
  const json = fullMd.match(/```json\n([\s\S]*?)\n```/);
  ok(`${n}：完整版内 JSON 与数据一致`, !!json && JSON.stringify(JSON.parse(json![1])) === JSON.stringify(p));
  ok(`${n}：精简版不附 JSON 且明显更短`, !md.includes('```json') && md.length < fullMd.length * 0.6, `${md.length}/${fullMd.length}`);
  const facts = [
    ...ps.flatMap((x) => [x.ganZhi, x.naYin, ...x.hiddenStems.map((h) => `${h.stem}${h.element}·${h.tenGod}`)]),
    ...[...p.relations.stems, ...p.relations.branches].map((x) => x.text),
    ...p.shensha.map((x) => `${x.name}（${x.pillars.join('·')}）`),
    p.parameters.taiYuan, p.parameters.mingGong, p.parameters.shenGong, p.parameters.taiXi,
    `旺衰${p.appReference.strength.label}`, p.appReference.pattern.name, ...p.appReference.strength.parts.map((x) => x.note),
    ...p.luck.pillars.map((l) => `${l.ganZhi}（${l.tenGod}，${l.ages} 岁，${l.years}）`),
    ...p.luck.timeline.map((x) => `| ${x.age} | ${x.ganZhi} | ${x.tenGod} | ${x.luck}`),
    ...sens.notes, rc.effectiveTime, r.jieQi.prevTime, r.lunarText.replace('农历 ', ''),
  ];
  const missing = facts.filter((f) => !md.includes(f));
  ok(`${n}：精简版事实齐全`, missing.length === 0, JSON.stringify(missing));
  ok(`${n}：提示词含规则与输出结构`, ['不要重新排盘', '盘面事实', '推断', '信号冲突', '只表示「存在」', '用神推导链', '健康提示', '大运节奏', '流年时间表', '想向你确认的问题', '自检', '## 我想问'].every((k) => md.includes(k)));
  ok(`${n}：结果可复现`, md === buildAiPrompt(r) && fullMd === buildAiPrompt(r, { detail: 'full' }));

  // 隐私模式：四柱保留，出生日期 / 时刻 / 地点 / 农历日期 / 星座 / 有效时刻不出现
  const priv = buildAiPrompt(r, { privacy: true });
  const civilDate = `${r.civil.y}-${pad(r.civil.m)}-${pad(r.civil.d)}`;
  const leaks = [civilDate, `${pad(r.civil.m)}-${pad(r.civil.d)}`, `${pad(r.civil.hh)}:${pad(r.civil.mm)}`, r.lunarText.replace('农历 ', ''), r.constellation, rc.effectiveTime, r.jieQi.prevTime, r.yun.startSolar];
  if (c.city) leaks.push(c.city);
  const leaked = leaks.filter((s) => s && priv.includes(s));
  ok(`${n}：隐私模式不含生辰`, leaked.length === 0, JSON.stringify(leaked));
  ok(`${n}：隐私模式临界提醒不给分钟数`, (buildAiPayload(r, { privacy: true }).receipt as any).sensitivity.notes.every((x: string) => !/\d{1,2}:\d{2}/.test(x.replace('00:00 换日', '')) && !/\d+(\.\d+)? (分钟|小时)(?!内)/.test(x)));
  const privFull = buildAiPrompt(r, { privacy: true, detail: 'full' });
  ok(`${n}：隐私完整版同样不含生辰`, leaks.filter((s) => s && privFull.includes(s)).length === 0);
  ok(`${n}：隐私模式保留四柱与大运`, r.pillars.every((x) => priv.includes(x.ganZhi)) && r.luck.every((l) => priv.includes(l.ganZhi)));
}

// 合盘
const a = computeBazi({ ...BASE, year: 1992, month: 8, day: 17, hour: 14, minute: 25, gender: 'female' }, CY);
const b = computeBazi({ ...BASE, year: 1990, month: 12, day: 3, hour: 7, minute: 50, gender: 'male' }, CY);
const cr = computeCompat(a, b);
const cp = buildCompatAiPayload(a, b, cr, { privacy: true });
ok('合盘：双方数据与单人导出一致', JSON.stringify(cp.a) === JSON.stringify(buildAiPayload(a, { privacy: true })) && JSON.stringify(cp.b) === JSON.stringify(buildAiPayload(b, { privacy: true })));
ok('合盘：评分与各维度一致', cp.appCompat.score === cr.score && JSON.stringify(cp.appCompat.dimensions.map((d) => [d.title, d.score, d.tag])) === JSON.stringify(cr.dims.map((d) => [d.title, d.score, d.tag])));
const cmd = buildCompatAiPrompt(a, b, cr, { privacy: true });
ok('合盘：精简版不附 JSON，完整版 JSON 与数据一致', !cmd.includes('```json') && JSON.stringify(JSON.parse(buildCompatAiPrompt(a, b, cr, { privacy: true, detail: 'full' }).match(/```json\n([\s\S]*?)\n```/)![1])) === JSON.stringify(cp));
ok('合盘：提示词含双方四柱且不含生辰', [a, b].every((x) => x.pillars.every((p) => cmd.includes(p.ganZhi))) && !cmd.includes('1992-08-17') && !cmd.includes('1990-12-03') && !cmd.includes('14:25'));

// Agent Skill 文件与网页提示词同源
// Windows 上 core.autocrlf=true 检出的是 CRLF，按 LF 比较
const skill = readFileSync(new URL('../skills/fate-bazi-reader/SKILL.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
ok('SKILL.md 与 aiExport 同步（不同步请运行 npm run gen:ai-skill）', skill === buildSkillMd());
ok('SKILL.md 含全部规则与 frontmatter', skill.startsWith('---\nname: fate-bazi-reader\n') && skill.includes('不要重新排盘') && skill.includes('只表示「存在」'));

console.log(failed ? `\n${failed} / ${total} 项失败 ✗` : `\n全部 ${total} 项通过 ✓（${cases.length} 个合成时刻 + 合盘）`);
process.exit(failed ? 1 : 0);
