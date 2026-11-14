import { LunarYear, Solar } from 'lunar-javascript';
import { Pillar, ganTenGod } from './bazi';

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';

export const TEN_GOD_ORDER = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];

/** 某公历年对应的年干（按立春） */
export function yearGanOf(year: number): string {
  try {
    const lunar: any = Solar.fromYmd(year, 6, 1).getLunar();
    return lunar.getYearGanByLiChun ? lunar.getYearGanByLiChun() : lunar.getYearGan();
  } catch {
    return '甲';
  }
}

const WUHU: Record<string, string> = {
  甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲',
};
const MONTH_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

export interface MonthPillar {
  index: number;
  monthName: string;
  gan: string;
  zhi: string;
  ganZhi: string;
  shiShen: string;
  jie: string;
}

/** 以年干五虎遁推十二流月（寅月起，配节气） */
export function monthPillars(yearGan: string, dayGan: string): MonthPillar[] {
  const start = WUHU[yearGan] || '甲';
  const si = GAN.indexOf(start);
  return MONTH_BRANCHES.map((zhi, i) => {
    const gan = GAN[(si + i) % 10];
    return {
      index: i + 1,
      monthName: `${zhi}月`,
      gan,
      zhi,
      ganZhi: gan + zhi,
      shiShen: ganTenGod(dayGan, gan),
      jie: JIE[i],
    };
  });
}

export function stepGanZhi(gz: string, dir: 1 | -1): string {
  const gi = GAN.indexOf(gz[0]);
  const zi = ZHI.indexOf(gz[1]);
  return GAN[(gi + dir + 10) % 10] + ZHI[(zi + dir + 12) % 12];
}

export interface XiaoYunItem {
  age: number;
  ganZhi: string;
}
/** 小运：以时柱起，按大运顺逆逐年推（第 1 岁为时柱后一位） */
export function buildXiaoYun(hourGz: string, forward: boolean, count = 12): XiaoYunItem[] {
  const dir: 1 | -1 = forward ? 1 : -1;
  const out: XiaoYunItem[] = [];
  let cur = hourGz;
  for (let age = 1; age <= count; age++) {
    cur = stepGanZhi(cur, dir);
    out.push({ age, ganZhi: cur });
  }
  return out;
}

/** 十神统计：4 天干（除日主）+ 全部藏干 */
export function countTenGods(pillars: Pillar[]): { name: string; count: number }[] {
  const map: Record<string, number> = {};
  TEN_GOD_ORDER.forEach((n) => (map[n] = 0));
  pillars.forEach((p, i) => {
    if (i !== 2 && map[p.shiShen] != null) map[p.shiShen]++;
  });
  pillars.forEach((p) => p.hidden.forEach((h) => {
    if (map[h.shiShen] != null) map[h.shiShen]++;
  }));
  return TEN_GOD_ORDER.map((name) => ({ name, count: map[name] }));
}

export interface DayItem {
  year: number;
  month: number;
  day: number;
  date: string;
  dayGz: string;
  shiShen: string;
}

/**
 * 取某个「节气月」内的所有日（按日柱）。
 * 通过遍历公历日、用精确月柱(getMonthInGanZhiExact)匹配目标月柱干支。
 */
/** 农历某月天数（isLeap 为闰月）；异常时回退 30 */export function lunarMonthDays(year: number, month: number, isLeap = false): number {
  try {
    const ly: any = LunarYear.fromYear(year);
    const m = ly.getMonth(isLeap ? -month : month);
    return m ? m.getDayCount() : 30;
  } catch {
    return 30;
  }
}

const dayCache = new Map<string, DayItem[]>();

export function daysOfMonth(year: number, targetMonthGz: string, dayMasterGan: string): DayItem[] {
  const cacheKey = `${year}|${targetMonthGz}|${dayMasterGan}`;
  const hit = dayCache.get(cacheKey);
  if (hit) return hit;
  const out: DayItem[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 2, 15);
  const one: any = Solar;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    try {
      const lunar: any = one.fromYmd(y, m, day).getLunar();
      const mgz: string = lunar.getMonthInGanZhiExact ? lunar.getMonthInGanZhiExact() : lunar.getMonthInGanZhi();
      if (mgz === targetMonthGz) {
        const dgz: string = lunar.getDayInGanZhi();
        out.push({
          year: y,
          month: m,
          day,
          date: `${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          dayGz: dgz,
          shiShen: ganTenGod(dayMasterGan, dgz[0]),
        });
      }
    } catch {
      /* skip */
    }
  }
  if (dayCache.size > 80) dayCache.clear();
  dayCache.set(cacheKey, out);
  return out;
}

export interface HourItem {
  zhi: string;
  ganZhi: string;
  shiShen: string;
  range: string;
}
const HOUR_RANGES = ['23-01', '01-03', '03-05', '05-07', '07-09', '09-11', '11-13', '13-15', '15-17', '17-19', '19-21', '21-23'];

/** 某日的十二时辰干支与十神（五鼠遁起时干），dayMasterGan 为命主日干 */
export function hoursOfDay(dayGz: string, dayMasterGan: string): HourItem[] {
  const dg = GAN.indexOf(dayGz[0]);
  const start = (Math.max(0, dg) % 5) * 2;
  return Array.from(ZHI).map((zhi, i) => {
    const gan = GAN[(start + i) % 10];
    return { zhi, ganZhi: gan + zhi, shiShen: ganTenGod(dayMasterGan, gan), range: HOUR_RANGES[i] };
  });
}
