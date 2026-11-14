import { Solar, Lunar, LunarYear } from 'lunar-javascript';
import {
  Element,
  ELEMENTS,
  GAN_ELEMENT,
  ZHI_ELEMENT,
  GAN_YINYANG,
  ZHI_YINYANG,
  ZHI_ORDER,
} from './elements';

export type Gender = 'male' | 'female';
export type CalendarType = 'solar' | 'lunar';

export interface BaziInput {
  calendar: CalendarType;
  year: number;
  month: number; // 1-12 (lunar positive)
  day: number;
  isLeapMonth?: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
  gender: Gender;
  trueSolar: boolean;
  useEot: boolean; // 是否叠加均时差
  longitude: number; // 东经（内部计算用，前端以地点名称呈现）
  cityName?: string; // 出生地点（省/市/区县显示名）
  utcOffset: number; // 时区，默认 8
  zishiSect: 1 | 2; // 1: 23:00 换日；2: 00:00 换日
  name?: string;
}

export interface HiddenStem {
  gan: string;
  element: Element;
  shiShen: string;
}

export interface Pillar {
  role: string;
  roleEn: string;
  gan: string;
  zhi: string;
  ganZhi: string;
  ganEl: Element;
  zhiEl: Element;
  ganYinYang: '阳' | '阴';
  zhiYinYang: '阳' | '阴';
  shiShen: string;
  hidden: HiddenStem[];
  naYin: string;
  xingYun: string;
  selfStage: string;
  isXunKong: boolean;
}

export interface LuckPillar {
  ganZhi: string;
  gan: string;
  zhi: string;
  ganEl: Element;
  zhiEl: Element;
  shiShen: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  current: boolean;
  liuNian: { year: number; age: number; ganZhi: string; shiShen: string }[];
}

export interface ElementStat {
  element: Element;
  count: number; // 明字计数
  weighted: number; // 含藏干加权
}

export interface BaziResult {
  input: BaziInput;
  civil: { y: number; m: number; d: number; hh: number; mm: number };
  effective: { y: number; m: number; d: number; hh: number; mm: number; ss: number };
  tst: { applied: boolean; deltaMinutes: number; eotMinutes: number; longitude: number; stdMeridian: number };
  solarText: string;
  lunarText: string;
  week: string;
  zodiac: string;
  constellation: string;
  jieQi: { prev: string; prevTime: string; next: string; nextTime: string; monthJie: string };
  pillars: Pillar[];
  dayMaster: { gan: string; element: Element; yinYang: '阳' | '阴'; label: string };
  elementStats: ElementStat[];
  visibleCount: Record<Element, number>;
  weighted: Record<Element, number>;
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  taiXi: string;
  dayXunKong: string;
  yun: { forward: boolean; startText: string; startSolar: string; direction: string };
  luck: LuckPillar[];
  currentYear: number;
  monthSeason: string;
}

const n = (s: any): number => Number(s);

/** NOAA 近似均时差（分钟），精度约 ±1 秒量级 */
export function equationOfTime(y: number, m: number, d: number, hour: number): number {
  const date = Date.UTC(y, m - 1, d);
  const dayOfYear = Math.floor((date - Date.UTC(y, 0, 1)) / 86400000) + 1;
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hour - 12) / 24);
  const eot =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  return eot;
}

function addMinutes(y: number, m: number, d: number, hh: number, mm: number, delta: number) {
  const ms = Date.UTC(y, m - 1, d, hh, mm, 0) + delta * 60000;
  const t = new Date(Math.round(ms));
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    hh: t.getUTCHours(),
    mm: t.getUTCMinutes(),
    ss: t.getUTCSeconds(),
  };
}

/** 某农历年的闰月（无闰月返回 0） */
export function lunarLeapMonthOf(year: number): number {
  try {
    return n((LunarYear as any).fromYear(year).getLeapMonth()) || 0;
  } catch {
    return 0;
  }
}

/** 农历某月天数；该月不存在时返回 0 */
function lunarDaysOf(year: number, month: number): number {
  try {
    const m = (LunarYear as any).fromYear(year).getMonth(month);
    return m ? n(m.getDayCount()) : 0;
  } catch {
    return 0;
  }
}

/**
 * 民用钟点（公历）。农历录入时换算成公历；闰月只在该年确有此闰月时生效，
 * 日数超出该月天数时夹到月末（仍在同一个月内，不会跳到相邻的非闰月）。
 */
export function resolveCivilSolar(input: BaziInput) {
  if (input.calendar === 'solar') {
    return { y: input.year, m: input.month, d: input.day, hh: input.hour, mm: input.minute };
  }
  const leap = !!input.isLeapMonth && lunarLeapMonthOf(input.year) === input.month;
  const month = leap ? -input.month : input.month;
  const maxDay = lunarDaysOf(input.year, month) || 29;
  const day = Math.min(Math.max(1, Math.trunc(input.day) || 1), maxDay);
  const s = (Lunar as any).fromYmd(input.year, month, day).getSolar();
  return { y: n(s.getYear()), m: n(s.getMonth()), d: n(s.getDay()), hh: input.hour, mm: input.minute };
}

/** 真太阳时修正量（分钟）：经度差 ×4 + 可选均时差 */
export function trueSolarDelta(
  input: BaziInput,
  civil: { y: number; m: number; d: number; hh: number }
): { stdMeridian: number; eot: number; deltaMinutes: number } {
  const stdMeridian = input.utcOffset * 15;
  const eot = input.useEot ? equationOfTime(civil.y, civil.m, civil.d, civil.hh) : 0;
  const deltaMinutes = input.trueSolar ? 4 * (input.longitude - stdMeridian) + eot : 0;
  return { stdMeridian, eot, deltaMinutes };
}

const clampInt = (v: unknown, lo: number, hi: number, def: number) => {
  const x = Number(v);
  if (!Number.isFinite(x)) return def;
  return Math.min(hi, Math.max(lo, Math.trunc(x)));
};

/** 按本机当前时间生成默认排盘输入，供首页表单与合盘对方表单预填，避免写死某一生辰。 */
export function defaultInputFromNow(now = new Date()): BaziInput {
  return {
    calendar: 'solar',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    gender: 'male',
    trueSolar: false,
    useEot: true,
    longitude: 116.41,
    cityName: '北京',
    utcOffset: 8,
    zishiSect: 2,
  };
}

/**
 * 把来自 URL / localStorage / 导入备份的输入整理成可计算的 BaziInput：
 * 非数字回退默认值，年月日时分夹在合法范围内（公历日按当月天数）。
 */
export function sanitizeInput(raw: Partial<BaziInput> | null | undefined, fallback: BaziInput): BaziInput {
  const o: any = raw && typeof raw === 'object' ? raw : {};
  const calendar: CalendarType = o.calendar === 'lunar' ? 'lunar' : 'solar';
  const year = clampInt(o.year, 1800, 2100, fallback.year);
  const month = clampInt(o.month, 1, 12, fallback.month);
  const maxDay = calendar === 'solar' ? new Date(year, month, 0).getDate() : 30;
  const lng = Number(o.longitude);
  const tz = Number(o.utcOffset);
  return {
    ...fallback,
    ...o,
    calendar,
    year,
    month,
    day: clampInt(o.day, 1, maxDay, Math.min(fallback.day, maxDay)),
    isLeapMonth: calendar === 'lunar' && !!o.isLeapMonth,
    hour: clampInt(o.hour, 0, 23, fallback.hour),
    minute: clampInt(o.minute, 0, 59, fallback.minute),
    gender: o.gender === 'female' ? 'female' : 'male',
    trueSolar: !!o.trueSolar,
    useEot: o.useEot !== false,
    longitude: Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : fallback.longitude,
    cityName: typeof o.cityName === 'string' && o.cityName ? o.cityName : fallback.cityName,
    utcOffset: Number.isFinite(tz) && tz >= -12 && tz <= 14 ? tz : fallback.utcOffset,
    zishiSect: Number(o.zishiSect) === 1 ? 1 : 2,
  };
}

const GAN_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CS_BRANCH: Record<string, string> = {
  甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯',
};
const YANG_GAN = new Set(['甲', '丙', '戊', '庚', '壬']);

/** 自坐：本柱天干在本柱地支的十二长生 */
export function selfStageOf(gan: string, zhi: string): string {
  const zIdx = ZHI_ORDER.indexOf(zhi as any);
  const csIdx = ZHI_ORDER.indexOf(CS_BRANCH[gan] as any);
  if (zIdx < 0 || csIdx < 0) return '';
  const idx = YANG_GAN.has(gan) ? (zIdx - csIdx + 12) % 12 : (csIdx - zIdx + 12) % 12;
  return STAGES[idx];
}

/** 五行生克 */
const SHENG: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 天干十神：以日干为我，求某天干之十神 */
export function ganTenGod(dayGan: string, gan: string): string {
  const de = GAN_ELEMENT[dayGan];
  const oe = GAN_ELEMENT[gan];
  if (!de || !oe) return '';
  const same = GAN_YINYANG[dayGan] === GAN_YINYANG[gan];
  if (oe === de) return same ? '比肩' : '劫财';
  if (SHENG[de] === oe) return same ? '食神' : '伤官'; // 我生
  if (KE[de] === oe) return same ? '偏财' : '正财'; // 我克
  if (KE[oe] === de) return same ? '七杀' : '正官'; // 克我
  if (SHENG[oe] === de) return same ? '偏印' : '正印'; // 生我
  return '';
}

export function computeBazi(input: BaziInput, currentYear: number): BaziResult {
  const civil = resolveCivilSolar(input);

  // 真太阳时修正
  const { stdMeridian, eot, deltaMinutes } = trueSolarDelta(input, civil);
  const eff = addMinutes(civil.y, civil.m, civil.d, civil.hh, civil.mm, deltaMinutes);

  const solar = Solar.fromYmdHms(eff.y, eff.m, eff.d, eff.hh, eff.mm, eff.ss);
  const lunar = solar.getLunar();
  const ec = solar.getLunar().getEightChar();
  ec.setSect(input.zishiSect);

  const hiddenY = ec.getYearHideGan() as string[];
  const hiddenM = ec.getMonthHideGan() as string[];
  const hiddenD = ec.getDayHideGan() as string[];
  const hiddenT = ec.getTimeHideGan() as string[];
  const ssY = ec.getYearShiShenZhi() as string[];
  const ssM = ec.getMonthShiShenZhi() as string[];
  const ssD = ec.getDayShiShenZhi() as string[];
  const ssT = ec.getTimeShiShenZhi() as string[];

  const dayGan = ec.getDayGan() as string;
  const dayXunKong = ec.getDayXunKong() as string;

  const roles = [
    { role: '年柱', roleEn: 'YEAR', gan: ec.getYearGan(), zhi: ec.getYearZhi(), ss: ec.getYearShiShenGan(), hidden: hiddenY, ssZ: ssY, naYin: ec.getYearNaYin(), xingYun: ec.getYearDiShi() },
    { role: '月柱', roleEn: 'MONTH', gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), ss: ec.getMonthShiShenGan(), hidden: hiddenM, ssZ: ssM, naYin: ec.getMonthNaYin(), xingYun: ec.getMonthDiShi() },
    { role: '日柱', roleEn: 'DAY', gan: ec.getDayGan(), zhi: ec.getDayZhi(), ss: ec.getDayShiShenGan(), hidden: hiddenD, ssZ: ssD, naYin: ec.getDayNaYin(), xingYun: ec.getDayDiShi() },
    { role: '时柱', roleEn: 'HOUR', gan: ec.getTimeGan(), zhi: ec.getTimeZhi(), ss: ec.getTimeShiShenGan(), hidden: hiddenT, ssZ: ssT, naYin: ec.getTimeNaYin(), xingYun: ec.getTimeDiShi() },
  ];

  const pillars: Pillar[] = roles.map((r) => ({
    role: r.role,
    roleEn: r.roleEn,
    gan: r.gan,
    zhi: r.zhi,
    ganZhi: r.gan + r.zhi,
    ganEl: GAN_ELEMENT[r.gan],
    zhiEl: ZHI_ELEMENT[r.zhi],
    ganYinYang: GAN_YINYANG[r.gan],
    zhiYinYang: ZHI_YINYANG[r.zhi],
    shiShen: r.ss,
    hidden: r.hidden.map((g, i) => ({ gan: g, element: GAN_ELEMENT[g], shiShen: r.ssZ[i] ?? '' })),
    naYin: r.naYin,
    xingYun: r.xingYun,
    selfStage: selfStageOf(r.gan, r.zhi),
    isXunKong: dayXunKong.includes(r.zhi),
  }));

  // 五行统计
  const visibleCount: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const weighted: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const HIDDEN_WEIGHT = [1, 0.5, 0.3];
  pillars.forEach((p) => {
    visibleCount[p.ganEl] += 1;
    visibleCount[p.zhiEl] += 1;
    weighted[p.ganEl] += 1;
    p.hidden.forEach((h, i) => {
      weighted[h.element] += HIDDEN_WEIGHT[i] ?? 0.3;
    });
  });
  const elementStats: ElementStat[] = ELEMENTS.map((el) => ({
    element: el,
    count: visibleCount[el],
    weighted: Math.round(weighted[el] * 100) / 100,
  }));

  // 节气
  const prevJie: any = (lunar as any).getPrevJie(true);
  const prevJieQi: any = (lunar as any).getPrevJieQi(true);
  const nextJieQi: any = (lunar as any).getNextJieQi(true);

  // 大运
  const yun = ec.getYun(input.gender === 'male' ? 1 : 0);
  const daYunArr = yun.getDaYun() as any[];
  const luck: LuckPillar[] = daYunArr.slice(1).map((d) => {
    const gz: string = d.getGanZhi();
    const gan = gz.charAt(0);
    const zhi = gz.charAt(1);
    const sY = n(d.getStartYear());
    const eY = n(d.getEndYear());
    return {
      ganZhi: gz,
      gan,
      zhi,
      ganEl: GAN_ELEMENT[gan],
      zhiEl: ZHI_ELEMENT[zhi],
      shiShen: ganTenGod(dayGan, gan),
      startAge: n(d.getStartAge()),
      endAge: n(d.getEndAge()),
      startYear: sY,
      endYear: eY,
      current: currentYear >= sY && currentYear <= eY,
      liuNian: (d.getLiuNian() as any[]).map((l) => {
        const lgz: string = l.getGanZhi();
        return {
          year: n(l.getYear()),
          age: n(l.getAge()),
          ganZhi: lgz,
          shiShen: ganTenGod(dayGan, lgz.charAt(0)),
        };
      }),
    };
  });

  const startText = `${n(yun.getStartYear())}年${n(yun.getStartMonth())}个月${n(yun.getStartDay())}天`;
  const monthZhi = ec.getMonthZhi() as string;
  const monthEl = ZHI_ELEMENT[monthZhi];

  return {
    input,
    civil,
    effective: eff,
    tst: { applied: input.trueSolar, deltaMinutes, eotMinutes: eot, longitude: input.longitude, stdMeridian },
    solarText: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')} ${String(solar.getHour()).padStart(2, '0')}:${String(solar.getMinute()).padStart(2, '0')}`,
    lunarText: `农历 ${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    week: solar.getWeekInChinese() ? '星期' + solar.getWeekInChinese() : '',
    zodiac: (lunar as any).getYearShengXiaoByLiChun ? (lunar as any).getYearShengXiaoByLiChun() : lunar.getYearShengXiao(),
    constellation: solar.getXingZuo() + '座',
    jieQi: {
      prev: prevJieQi?.getName?.() ?? '',
      prevTime: prevJieQi?.getSolar?.()?.toYmdHms?.() ?? '',
      next: nextJieQi?.getName?.() ?? '',
      nextTime: nextJieQi?.getSolar?.()?.toYmdHms?.() ?? '',
      monthJie: prevJie?.getName?.() ?? '',
    },
    pillars,
    dayMaster: {
      gan: dayGan,
      element: GAN_ELEMENT[dayGan],
      yinYang: GAN_YINYANG[dayGan],
      label: `${GAN_YINYANG[dayGan]}${GAN_ELEMENT[dayGan]} · ${dayGan}`,
    },
    elementStats,
    visibleCount,
    weighted,
    taiYuan: (ec as any).getTaiYuan?.() ?? '',
    mingGong: (ec as any).getMingGong?.() ?? '',
    shenGong: (ec as any).getShenGong?.() ?? '',
    taiXi: (ec as any).getTaiXi?.() ?? '',
    dayXunKong,
    yun: {
      forward: yun.isForward(),
      startText,
      startSolar: yun.getStartSolar().toYmd(),
      direction: yun.isForward() ? '顺行' : '逆行',
    },
    luck,
    currentYear,
    monthSeason: `${prevJie?.getName?.() ?? ''}后 · 月令${monthZhi}${monthEl}`,
  };
}

export { GAN_ORDER };
