/**
 * 一键导出给 AI：代码排盘，AI 只解读。
 *
 * 这里不做任何新的历法或命理计算，所有字段都直接取自应用已经算好、界面上已经展示的数据
 * （computeBazi 的结果，以及界面同样在用的关系、神煞、旺衰 / 格局 / 喜用参考与合盘评分），
 * 保证交给 AI 的盘和屏幕上的盘逐字一致。
 */
import type { BaziResult, Pillar } from './bazi';
import { ELEMENTS, type Element } from './elements';
import { analyzeRelations } from './relations';
import { computeShenSha } from './shensha';
import { assessPattern, assessStrength, favorable } from './structure';
import { chinaDSTRange, isChinaDST } from './dstCn';
import type { CompatResult } from './compat';

export const AI_SCHEMA = 'fate.bazi.ai.v1';
export const AI_COMPAT_SCHEMA = 'fate.compat.ai.v1';
const ENGINE = 'lunar-javascript 1.7.8';

export interface AiExportOptions {
  /** 隐去出生日期、时刻与地点（四柱、大运、流年年份保留） */
  privacy?: boolean;
}

const pad = (x: number) => String(x).padStart(2, '0');
const ymdhm = (t: { y: number; m: number; d: number; hh: number; mm: number }) =>
  `${t.y}-${pad(t.m)}-${pad(t.d)} ${pad(t.hh)}:${pad(t.mm)}`;
const genderCN = (g: string) => (g === 'male' ? '乾造（男）' : '坤造（女）');
const ROLE_KEY: Record<string, string> = { 年柱: 'year', 月柱: 'month', 日柱: 'day', 时柱: 'hour' };

function pillarPayload(p: Pillar, dayGan: string) {
  return {
    label: p.role,
    ganZhi: p.ganZhi,
    stem: p.gan,
    branch: p.zhi,
    stemElement: p.ganEl,
    branchElement: p.zhiEl,
    stemYinYang: p.ganYinYang,
    branchYinYang: p.zhiYinYang,
    tenGod: p.shiShen,
    hiddenStems: p.hidden.map((h, i) => ({
      stem: h.gan,
      element: h.element,
      tenGod: h.shiShen,
      layer: ['本气', '中气', '余气'][i] ?? '余气',
    })),
    naYin: p.naYin,
    /** 星运：日主在本柱地支的十二长生 */
    dayMasterStage: { value: p.xingYun, meaning: `日主${dayGan}在${p.zhi}` },
    /** 自坐：本柱天干在本柱地支的十二长生 */
    selfStage: { value: p.selfStage, meaning: `${p.gan}在${p.zhi}` },
    isVoid: p.isXunKong,
  };
}

const JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
const ymdhmsUTC = (s: string) => {
  const m = s.match(/(\d+)-(\d+)-(\d+)[ T](\d+):(\d+)(?::(\d+))?/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : NaN;
};

/** 流年时间表：当前年 ±5 年，逐年取自应用的大运流年表，并标出交运年 */
function timeline(r: BaziResult) {
  const out: { year: number; age: number; ganZhi: string; tenGod: string; luck: string; luckStarts: boolean }[] = [];
  for (const l of r.luck)
    for (const x of l.liuNian)
      if (Math.abs(x.year - r.currentYear) <= 5)
        out.push({ year: x.year, age: x.age, ganZhi: x.ganZhi, tenGod: x.shiShen, luck: l.ganZhi, luckStarts: x.year === l.startYear });
  return out.sort((a, b) => a.year - b.year);
}

/**
 * 临界提醒：只比较应用已经给出的有效时刻、时辰分界与相邻节气时刻，不重新排盘。
 * 出生时间若有几十分钟误差，临界处的时柱 / 日柱 / 月柱（立春还涉及年柱）可能不同。
 */
function sensitivity(r: BaziResult, privacy: boolean) {
  const notes: string[] = [];
  const e = r.effective;
  const m = e.hh * 60 + e.mm;
  let best = Infinity;
  let at = 0;
  for (let h = -1; h <= 25; h += 2) {
    const d = Math.abs(m - h * 60);
    if (d < best) [best, at] = [d, (h + 24) % 24];
  }
  const dayToo = at === 23 && r.input.zishiSect === 1;
  const hourNear = best <= 30;
  if (hourNear)
    notes.push(`${privacy ? '有效时刻在时辰分界 30 分钟内' : `有效时刻距 ${pad(at)}:00 时辰分界 ${best} 分钟`}，出生时间若有误差，${dayToo ? '时柱与日柱' : '时柱'}可能不同`);
  const mid = Math.min(m, 1440 - m);
  if (r.input.zishiSect !== 1 && mid <= 30)
    notes.push(`${privacy ? '有效时刻在 00:00 换日 30 分钟内' : `有效时刻距 00:00 换日 ${mid} 分钟`}，出生时间若有误差，日柱可能不同`);
  const effT = Date.UTC(e.y, e.m - 1, e.d, e.hh, e.mm, e.ss || 0);
  let termNear: { term: string; hours: number } | null = null;
  for (const [name, t] of [
    [r.jieQi.prev, r.jieQi.prevTime],
    [r.jieQi.next, r.jieQi.nextTime],
  ] as const) {
    if (!JIE.includes(name)) continue;
    const h = Math.abs(ymdhmsUTC(t) - effT) / 3600000;
    if (h <= 24 && (!termNear || h < termNear.hours)) termNear = { term: name, hours: Math.round(h * 10) / 10 };
  }
  if (termNear)
    notes.push(
      `${privacy ? `出生时刻在${termNear.term}交节 24 小时内` : `出生时刻距${termNear.term}交节 ${termNear.hours} 小时`}，出生时间若有误差，${termNear.term === '立春' ? '月柱与年柱' : '月柱'}及起运可能不同`
    );
  return { hourBoundaryNear: hourNear, solarTermNear: !!termNear, notes };
}

/** 单人命盘的结构化数据（JSON 可直接序列化） */
export function buildAiPayload(r: BaziResult, opts: AiExportOptions = {}) {
  const privacy = !!opts.privacy;
  const inp = r.input;
  const dayGan = r.dayMaster.gan;
  const rel = analyzeRelations(r.pillars);
  const shensha = computeShenSha(r.pillars).list;
  const strength = assessStrength(r);
  const pattern = assessPattern(r);
  const fav = favorable(r);
  const total = ELEMENTS.reduce((a, e) => a + r.weighted[e], 0) || 1;
  const cur = r.luck.find((l) => l.current) || null;
  const curIdx = cur ? r.luck.indexOf(cur) : -1;
  const thisYear = r.luck.flatMap((l) => l.liuNian.map((x) => ({ ...x, luck: l.ganZhi }))).find((x) => x.year === r.currentYear) || null;
  const inDst = isChinaDST(r.civil.y, r.civil.m, r.civil.d);
  const dstRange = inDst ? chinaDSTRange(r.civil.y) : null;

  return {
    schema: AI_SCHEMA,
    generator: 'fate · 命理 ATELIER',
    engine: ENGINE,
    privacy: privacy ? '已隐去出生日期、时刻与地点；四柱、大运与流年年份保留' : 'none',
    subject: {
      gender: inp.gender,
      genderCN: genderCN(inp.gender),
      zodiac: r.zodiac,
      ...(privacy
        ? {}
        : {
            input: {
              calendar: inp.calendar === 'lunar' ? '农历' : '公历',
              civilTime: ymdhm(r.civil),
              lunarDate: r.lunarText.replace('农历 ', ''),
              place: inp.cityName || null,
              utcOffset: inp.utcOffset,
            },
            constellation: r.constellation,
          }),
    },
    dayMaster: { stem: dayGan, element: r.dayMaster.element, yinYang: r.dayMaster.yinYang },
    monthCommand: { branch: r.pillars[1].zhi, element: r.pillars[1].zhiEl, afterJie: r.jieQi.monthJie },
    pillars: Object.fromEntries(r.pillars.map((p) => [ROLE_KEY[p.role] ?? p.roleEn.toLowerCase(), pillarPayload(p, dayGan)])),
    dayVoid: r.dayXunKong,
    fiveElements: {
      visibleCount: r.visibleCount,
      weighted: Object.fromEntries(ELEMENTS.map((e) => [e, Math.round(r.weighted[e] * 100) / 100])) as Record<Element, number>,
      percent: Object.fromEntries(ELEMENTS.map((e) => [e, Math.round((r.weighted[e] / total) * 100)])) as Record<Element, number>,
      method: '明字：八字各计 1；加权：天干 1，地支藏干本气 1、中气 0.5、余气 0.3',
    },
    relations: {
      stems: rel.gan.map((x) => ({ type: x.type, text: x.text, pillars: x.roles })),
      branches: rel.zhi.map((x) => ({ type: x.type, text: x.text, pillars: x.roles })),
    },
    shensha: shensha.map((x) => ({ name: x.name, pillars: x.roles })),
    parameters: { taiYuan: r.taiYuan, mingGong: r.mingGong, shenGong: r.shenGong, taiXi: r.taiXi },
    appReference: {
      note: '应用内的简法参考评估，不是定论；可以不同意，但要写出依据',
      strength: { label: strength.label, score: strength.score, parts: strength.parts.map((p) => ({ name: p.name, note: p.note })) },
      pattern: { name: pattern.name, basis: pattern.basis, category: pattern.category },
      favorableElements: fav,
    },
    luck: {
      direction: r.yun.direction,
      start: privacy ? r.yun.startText : `${r.yun.startText}（${r.yun.startSolar} 交运）`,
      ageConvention: '虚岁（出生当年记 1 岁）',
      currentYear: r.currentYear,
      currentLuck: cur ? { index: curIdx + 1, ganZhi: cur.ganZhi } : null,
      currentLiuNian: thisYear ? { year: thisYear.year, age: thisYear.age, ganZhi: thisYear.ganZhi, tenGod: thisYear.shiShen, luck: thisYear.luck } : null,
      pillars: r.luck.map((l, i) => ({
        index: i + 1,
        ganZhi: l.ganZhi,
        tenGod: l.shiShen,
        ages: `${l.startAge}–${l.endAge}`,
        years: `${l.startYear}–${l.endYear}`,
        current: l.current,
      })),
      /** 当前年前后各 5 年的流年（均取自应用的大运流年表；未起运的年份不列） */
      timeline: timeline(r),
    },
    receipt: {
      sensitivity: sensitivity(r, privacy),
      yearBoundary: '立春换年（非正月初一）',
      monthBoundary: '十二节令换月（非农历月序）',
      dayPillar: '连续干支纪日',
      hourPillar: '日上起时（五鼠遁）',
      zishi: inp.zishiSect === 1 ? '23:00 换日（晚子归次日）' : '00:00 换日（晚子算当日）',
      trueSolarTime: r.tst.applied
        ? {
            applied: true,
            ...(privacy ? {} : { place: inp.cityName || null, correctionMinutes: Math.round(r.tst.deltaMinutes * 10) / 10 }),
            equationOfTime: inp.useEot,
          }
        : { applied: false, note: '按北京时间（平太阳时）' },
      ...(privacy ? {} : { effectiveTime: ymdhm(r.effective), timezone: `UTC${inp.utcOffset >= 0 ? '+' : ''}${inp.utcOffset}` }),
      solarTerms: privacy
        ? { prev: r.jieQi.prev, next: r.jieQi.next }
        : { prev: r.jieQi.prev, prevTime: r.jieQi.prevTime, next: r.jieQi.next, nextTime: r.jieQi.nextTime },
      dst: privacy
        ? { inChinaDstPeriod: inDst }
        : {
            inChinaDstPeriod: inDst,
            ...(dstRange ? { period: `${r.civil.y} 年 ${dstRange.start}–${dstRange.end}` } : {}),
            note: inDst
              ? '出生日期落在中国历史夏令时期间。本盘按录入时间计算；若录入的是当年钟表时间，应减 1 小时后重排（应用内可一键调整）'
              : '不在中国历史夏令时期间',
          },
      engine: ENGINE,
    },
  };
}

export type AiPayload = ReturnType<typeof buildAiPayload>;

/* ------------------------------------------------------------------ *
 *  提示词
 * ------------------------------------------------------------------ */
export type AiDetail = 'compact' | 'full';
export interface AiPromptOptions extends AiExportOptions {
  /** compact：提示词 + Markdown 命盘（默认，复制用）；full：再附完整 JSON（下载存档 / 交给 Agent） */
  detail?: AiDetail;
}

/**
 * 规则：只约束 AI 的解读方式，不引入任何新的计算。
 * 参考了 bazi-skill、跃渊 YueYuan、bazi-ziwei-skills、liki、OpenFate 等开源项目的提示词思路（只借鉴思路，文字为本项目自写）。
 */
export const AI_RULES = [
  '**不要重新排盘。** 四柱、藏干、十神、大运、流年都已由程序按「计算口径」算好，以给出的数据为准；觉得可疑只指出疑点，不要改盘或换算。',
  '**只用给出的数据。** 数据里没有的神煞、格局名、关系不要补算；缺的信息写「数据未提供」，或放进最后的「想向你确认的问题」。',
  '**每条判断注明依据**（哪一柱、哪个十神或藏干、哪步大运、哪一年），例如「（依据：月柱正官透干 + 日支藏财）」。',
  '**分清事实与推断**：【盘面事实】是数据里直接可查的；【推断】要写出推理链并标把握（高 / 中 / 低）——只有两条以上互相独立的依据同向时才可标「高」。',
  '**信号冲突要说出来**：旺衰、格局、调候、合冲互相矛盾时，写明你优先哪一个、为什么，不要折中带过。',
  '**干支关系只表示「存在」**：数据列出的合、冲、刑、害不等于已经合化或成局；是否化、化得成不成，要你结合月令判断并写出依据。',
  '**十二长生分清归属**：「星运」是日主在该地支的状态，「自坐」是该柱天干在本支的状态，不要混用。',
  '「应用参考」里的旺衰、格局、喜用是简法评估，可以不同意，但要写出理由；多种解释都合理时并列写出，说明各自成立的条件。',
  '**说人话、说具体**：术语后面跟一句白话；不写对谁都成立的话（如「性格时而外向时而内向」「事业有起有落」「注意身体」），建议要能落到行动。',
  '**不绝对化**：不说「必然」「注定」「一定会」；不做医疗诊断，不给具体投资或法律建议，健康只谈作息保养，必要时建议就医。',
  '若「计算口径」里有临界提醒，先提醒命主核实出生时间，并说明哪些结论会随之改变。',
  '先只依据命盘独立分析，不猜测、不迎合命主经历；命主之后补充的经历，用来逐条核对（命中 / 部分命中 / 未命中 / 未知），并说明哪些判断因此要修正。',
];

export const AI_SECTIONS = [
  '一句话结论：先用一两句话概括这张盘的主线，再给 3–5 个关键词',
  '用神推导链：按「旺衰依据（得令 / 得地 / 得势）→ 格局 → 调候 / 病药 → 喜用忌」一步步写，每步引用数据；与「应用参考」不同处写明理由',
  '性格：结合十神与五行配置',
  '事业：适合的方向与工作方式',
  '财：求财方式与需要留意的地方',
  '感情：相处模式与婚恋倾向（不对具体对象下结论）',
  '健康提示：五行偏枯对应的作息、保养提示（非医疗诊断）',
  '大运节奏：按大运切片，重点写上一步、当前、下一步的主题；交运年单独点出',
  '流年时间表：按下方「流年时间表」逐年一句（主题 + 依据），今年多写几句',
  '想向你确认的问题：3–5 个能帮助校准判断的问题（例如某几年的重大变化）',
  '自检：最后用一行列出 ① 是否改动过任何干支 ② 是否每条判断都有依据 ③ 把握为「低」的结论有哪些',
];

const FOLLOW_UP = [
  '## 我想问',
  '',
  '（可在这行下面写具体问题，例如「事业方向」「感情」「2027 年」。写了问题：先给结论，只展开与问题相关的部分，仍按上面的规则注明依据，不必输出全部小节；没写问题：按「输出结构」完整解读。之后的追问也都以这张命盘为准。）',
  '',
];

function pillarTable(p: AiPayload): string[] {
  const ps = Object.values(p.pillars);
  const row = (k: string, f: (x: (typeof ps)[number]) => string) => `| ${k} | ${ps.map(f).join(' | ')} |`;
  return [
    `| | ${ps.map((x) => x.label).join(' | ')} |`,
    `| --- | ${ps.map(() => '---').join(' | ')} |`,
    row('十神', (x) => x.tenGod),
    row('天干', (x) => `${x.stem}（${x.stemYinYang}${x.stemElement}）`),
    row('地支', (x) => `${x.branch}（${x.branchYinYang}${x.branchElement}）`),
    row('藏干', (x) => x.hiddenStems.map((h) => `${h.stem}${h.element}·${h.tenGod}`).join('、')),
    row('纳音', (x) => x.naYin),
    row('星运', (x) => x.dayMasterStage.value),
    row('自坐', (x) => x.selfStage.value),
    row('空亡', (x) => (x.isVoid ? '空' : '—')),
  ];
}

function summaryLines(p: AiPayload): string[] {
  const L: string[] = [...pillarTable(p), '', '藏干按本气、中气、余气顺序排列。', ''];
  const fe = p.fiveElements;
  L.push(`- 日主：${p.dayMaster.stem}（${p.dayMaster.yinYang}${p.dayMaster.element}）；月令：${p.monthCommand.branch}${p.monthCommand.element}（${p.monthCommand.afterJie}后）；日空：${p.dayVoid}`);
  L.push(`- 五行（含藏干加权）：${ELEMENTS.map((e) => `${e} ${fe.weighted[e]}（${fe.percent[e]}%）`).join('，')}；明字：${ELEMENTS.map((e) => `${e}${fe.visibleCount[e]}`).join(' ')}（${fe.method}）`);
  const rels = [...p.relations.stems, ...p.relations.branches].map((x) => x.text);
  L.push(`- 干支关系（仅表示存在）：${rels.length ? rels.join('；') : '无'}`);
  L.push(`- 神煞：${p.shensha.length ? p.shensha.map((x) => `${x.name}（${x.pillars.join('·')}）`).join('、') : '无'}`);
  const pa = p.parameters;
  L.push(`- 胎元 ${pa.taiYuan}；命宫 ${pa.mingGong}；身宫 ${pa.shenGong}；胎息 ${pa.taiXi}`);
  const ar = p.appReference;
  L.push(`- 应用参考（简法，可反驳）：旺衰${ar.strength.label}（${ar.strength.score}；${ar.strength.parts.map((x) => `${x.name}：${x.note}`).join('；')}）`);
  L.push(`  格局 ${ar.pattern.name}（${ar.pattern.basis}；${ar.pattern.category}）；喜用倾向 ${ar.favorableElements.join('、')}`);
  const lk = p.luck;
  L.push(`- 大运：${lk.direction}；出生后 ${lk.start}起运；年龄按${lk.ageConvention}`);
  L.push(`  ${lk.pillars.map((x) => `${x.ganZhi}（${x.tenGod}，${x.ages} 岁，${x.years}）${x.current ? '★当前' : ''}`).join('；')}`);
  if (lk.currentLiuNian) {
    const c = lk.currentLiuNian;
    L.push(`- 当前流年：${c.year} 年 ${c.ganZhi}（${c.tenGod}，${c.age} 岁），所在大运 ${c.luck}`);
  } else {
    L.push(`- 当前流年：${lk.currentYear} 年尚未进入第一步大运`);
  }
  if (lk.timeline.length) {
    L.push('');
    L.push(`流年时间表（${lk.currentYear} 年前后各 5 年，十神指流年天干对日主）：`);
    L.push('');
    L.push('| 年份 | 虚岁 | 流年 | 十神 | 大运 |');
    L.push('| --- | --- | --- | --- | --- |');
    lk.timeline.forEach((x) =>
      L.push(`| ${x.year}${x.year === lk.currentYear ? ' ★今年' : ''} | ${x.age} | ${x.ganZhi} | ${x.tenGod} | ${x.luck}${x.luckStarts ? '（交运）' : ''} |`)
    );
  }
  return L;
}

function receiptLines(p: AiPayload): string[] {
  const rc = p.receipt as AiPayload['receipt'] & { effectiveTime?: string; timezone?: string };
  const tst = rc.trueSolarTime as { applied: boolean; place?: string | null; correctionMinutes?: number; equationOfTime?: boolean; note?: string };
  const st = rc.solarTerms as { prev: string; next: string; prevTime?: string; nextTime?: string };
  const dst = rc.dst as { inChinaDstPeriod: boolean; period?: string; note?: string };
  const L: string[] = [];
  L.push(`- 换年 / 换月：${rc.yearBoundary}；${rc.monthBoundary}；日柱${rc.dayPillar}；时柱${rc.hourPillar}`);
  L.push(`- 子时：${rc.zishi}`);
  L.push(
    `- 真太阳时：${
      tst.applied
        ? `已启用${tst.place ? ` · ${tst.place}` : ''}${tst.correctionMinutes !== undefined ? ` · 校正 ${tst.correctionMinutes} 分` : ''}${tst.equationOfTime ? ' · 含均时差' : ' · 未含均时差'}`
        : '未启用（按北京时间，平太阳时）'
    }`
  );
  if (rc.effectiveTime) L.push(`- 有效时刻：${rc.effectiveTime}（${rc.timezone}）`);
  L.push(`- 节气区间：${st.prev}${st.prevTime ? ` ${st.prevTime}` : ''} → ${st.next}${st.nextTime ? ` ${st.nextTime}` : ''}`);
  L.push(`- 夏令时：${dst.note ?? (dst.inChinaDstPeriod ? '出生日期在中国历史夏令时期间' : '不在中国历史夏令时期间')}${dst.period ? `（${dst.period}）` : ''}`);
  L.push(`- 临界提醒：${rc.sensitivity.notes.length ? rc.sensitivity.notes.join('；') : '无（出生时刻不靠近时辰分界或交节）'}`);
  L.push(`- 计算引擎：${rc.engine}`);
  return L;
}

function jsonBlock(p: unknown): string[] {
  return ['## 结构化数据（JSON，与上文一致，以此为准）', '', '```json', JSON.stringify(p, null, 2), '```', ''];
}

/** 单人命盘：Markdown 提示词（compact 不附 JSON；full 附完整 JSON） */
export function buildAiPrompt(r: BaziResult, opts: AiPromptOptions = {}): string {
  const p = buildAiPayload(r, opts);
  const full = opts.detail === 'full';
  const sub = p.subject as AiPayload['subject'] & { input?: { calendar: string; civilTime: string; lunarDate: string; place: string | null }; constellation?: string };
  const L: string[] = [];
  L.push(`# 八字命盘解读 · ${Object.values(p.pillars).map((x) => x.ganZhi).join(' ')}`);
  L.push('');
  L.push('> 以下命盘由「fate · 命理 ATELIER」按确定的历法口径排出（代码排盘，AI 只解读）。请不要重新排盘。');
  L.push('');
  L.push('## 你的角色');
  L.push('');
  L.push('你是熟悉子平八字（《渊海子平》《子平真诠》《滴天髓》《穷通宝鉴》）的命理研究者。把这张已经排好的命盘讲清楚：讲依据、讲推理，不夸大，也不制造焦虑。');
  L.push('');
  L.push('## 规则');
  L.push('');
  AI_RULES.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push('');
  L.push('## 输出结构');
  L.push('');
  L.push('用中文、按以下小标题依次输出，每节先写结论，再写依据：');
  L.push('');
  AI_SECTIONS.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push('');
  L.push('## 命盘');
  L.push('');
  L.push(
    `- ${sub.genderCN} · 生肖${sub.zodiac}${sub.constellation ? ` · ${sub.constellation}` : ''}${
      sub.input ? ` · ${sub.input.calendar}录入 ${sub.input.civilTime}（农历 ${sub.input.lunarDate}）${sub.input.place ? ` · ${sub.input.place}` : ''}` : ''
    }`
  );
  if (opts.privacy) L.push('- 已按命主要求隐去出生日期、时刻与地点；四柱、大运与流年年份保留。');
  L.push('');
  L.push(...summaryLines(p));
  L.push('');
  L.push('## 计算口径（口径回执）');
  L.push('');
  L.push(...receiptLines(p));
  L.push('');
  if (full) L.push(...jsonBlock(p));
  L.push(...FOLLOW_UP);
  return L.join('\n');
}

/* ------------------------------------------------------------------ *
 *  合盘
 * ------------------------------------------------------------------ */
export function buildCompatAiPayload(a: BaziResult, b: BaziResult, c: CompatResult, opts: AiExportOptions = {}) {
  return {
    schema: AI_COMPAT_SCHEMA,
    generator: 'fate · 命理 ATELIER',
    engine: ENGINE,
    privacy: opts.privacy ? '已隐去双方出生日期、时刻与地点；四柱、大运与流年年份保留' : 'none',
    a: buildAiPayload(a, opts),
    b: buildAiPayload(b, opts),
    appCompat: {
      note: '应用内的合盘参考评分（简法），不是定论；可以不同意，但要写出依据',
      score: c.score,
      level: c.level,
      dimensions: c.dims.map((d) => ({ title: d.title, score: d.score, tag: d.tag, text: d.text })),
    },
  };
}

export function buildCompatAiPrompt(a: BaziResult, b: BaziResult, c: CompatResult, opts: AiPromptOptions = {}): string {
  const p = buildCompatAiPayload(a, b, c, opts);
  const gz = (x: AiPayload) => Object.values(x.pillars).map((v) => v.ganZhi).join(' ');
  const L: string[] = [];
  L.push(`# 八字合盘解读 · 甲方 ${gz(p.a)} ／ 乙方 ${gz(p.b)}`);
  L.push('');
  L.push('> 以下两张命盘与合盘评分由「fate · 命理 ATELIER」按确定的历法口径算出。请你只做解读，不要重新排盘。');
  L.push('');
  L.push('## 你的角色');
  L.push('');
  L.push('你是熟悉子平八字合婚与六亲论法的命理研究者。你的任务是说明两人命盘之间的互动：哪里相合、哪里需要磨合、各自需要对方什么，讲依据、讲推理，不替两人做决定。');
  L.push('');
  L.push('## 规则');
  L.push('');
  AI_RULES.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push(`${AI_RULES.length + 1}. 合盘不下「合适 / 不合适」「能不能结婚」之类的结论，只说明互动模式与相处建议；涉及哪一方时写明「甲方」或「乙方」及对应柱位。`);
  L.push('');
  L.push('## 输出结构');
  L.push('');
  [
    '总览：两人日主、五行与喜用的互补或冲突',
    '性格互动：十神与日主关系体现的相处方式',
    '夫妻宫与关键干支：日支及其他柱的合、冲、刑、害',
    '各维度评分解读：逐条说明应用评分的依据是否成立',
    '大运同步：对照两人的流年时间表，当前与下一步大运的节奏是否同步，哪些年份需要多沟通',
    '相处建议：具体、可执行',
    '想向你们确认的问题：3–5 个',
    '自检：最后用一行列出 ① 是否改动过任何干支 ② 是否每条判断都有依据 ③ 把握为「低」的结论有哪些',
  ].forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push('');
  for (const [tag, x] of [['甲方', p.a], ['乙方', p.b]] as const) {
    const sub = x.subject as AiPayload['subject'] & { input?: { calendar: string; civilTime: string; place: string | null } };
    L.push(`## ${tag}命盘 · ${sub.genderCN} · 生肖${sub.zodiac}${sub.input ? ` · ${sub.input.calendar}录入 ${sub.input.civilTime}${sub.input.place ? ` · ${sub.input.place}` : ''}` : ''}`);
    L.push('');
    L.push(...summaryLines(x));
    L.push('');
    L.push('计算口径：');
    L.push('');
    L.push(...receiptLines(x));
    L.push('');
  }
  L.push(`## 应用合盘评分（参考）：${p.appCompat.score} 分 · ${p.appCompat.level}`);
  L.push('');
  p.appCompat.dimensions.forEach((d) => L.push(`- ${d.title}：${d.score}（${d.tag}）${d.text}`));
  L.push('');
  if (opts.privacy) L.push('> 已隐去双方出生日期、时刻与地点；四柱、大运与流年年份保留。\n');
  if (opts.detail === 'full') L.push(...jsonBlock(p));
  L.push(...FOLLOW_UP);
  return L.join('\n');
}

export function aiFilename(r: BaziResult, ext: 'md' | 'json', privacy = false) {
  const gz = r.pillars.map((p) => p.ganZhi).join('');
  return privacy ? `八字AI解读_${gz}.${ext}` : `八字AI解读_${r.solarText.slice(0, 10).replace(/-/g, '')}_${gz}.${ext}`;
}

/** 写入剪贴板：优先 Clipboard API，不可用时（非安全上下文等）退回 execCommand。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 退回下面的兼容写法 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
