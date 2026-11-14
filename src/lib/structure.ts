import { BaziResult, ganTenGod } from './bazi';
import { Element, GAN_ELEMENT, ZHI_ELEMENT } from './elements';

const GEN: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
export const genBy = (e: Element): Element => (Object.keys(GEN) as Element[]).find((k) => GEN[k] === e) || e;
export const ctrlBy = (e: Element): Element => (Object.keys(CTRL) as Element[]).find((k) => CTRL[k] === e) || e;

/** 参考喜用（按身强弱近似，非严格用神） */
export function favorable(r: BaziResult): Element[] {
  const el = r.dayMaster.element;
  const support = r.weighted[el] + r.weighted[genBy(el)];
  const drain = r.weighted[CTRL[el]] + r.weighted[ctrlBy(el)] + r.weighted[GEN[el]];
  const ratio = support / (support + drain || 1);
  if (ratio < 0.4) return [genBy(el), el];
  if (ratio > 0.56) return [GEN[el], CTRL[el], ctrlBy(el)];
  return [GEN[el], CTRL[el]];
}

export interface StrengthPart {
  name: string;
  score: number;
  note: string;
}
export interface StrengthReport {
  score: number;
  label: '偏弱' | '中和' | '偏旺';
  parts: StrengthPart[];
}

/** 旺衰参考评分（子平思路：得令/得地/得助/生扶占比） */
export function assessStrength(r: BaziResult): StrengthReport {
  const el = r.dayMaster.element;
  const yin = genBy(el);
  const total = Object.values(r.weighted).reduce((a, b) => a + b, 0) || 1;
  const support = r.weighted[el] + r.weighted[yin];
  const ratio = support / total;
  let score = Math.round(ratio * 100);

  const monthEl = r.pillars[1].zhiEl;
  const deLing = monthEl === el || monthEl === yin;
  score += deLing ? 8 : -4;

  const dayEl = r.pillars[2].zhiEl;
  const deDi = dayEl === el || dayEl === yin;
  score += deDi ? 6 : -3;

  const helpers = r.pillars.filter((p, i) => i !== 2 && (p.ganEl === el || p.ganEl === yin)).length;
  score += helpers * 3;
  score = Math.max(0, Math.min(100, score));

  const label = score < 42 ? '偏弱' : score > 58 ? '偏旺' : '中和';
  return {
    score,
    label,
    parts: [
      { name: '生扶占比', score: Math.round(ratio * 100), note: `同类+印 ${support.toFixed(1)} / 总 ${total.toFixed(1)}` },
      { name: '得令', score: deLing ? 1 : 0, note: `月令${r.pillars[1].zhi}属${monthEl}，${deLing ? '帮身' : '耗身'}` },
      { name: '得地', score: deDi ? 1 : 0, note: `日支${r.pillars[2].zhi}属${dayEl}，${deDi ? '有根' : '少根'}` },
      { name: '得助', score: helpers, note: `天干生扶 ${helpers} 处` },
    ],
  };
}

const PATTERN_NAME: Record<string, string> = {
  比肩: '建禄格', 劫财: '月劫格', 食神: '食神格', 伤官: '伤官格', 偏财: '偏财格', 正财: '正财格',
  七杀: '七杀格', 正官: '正官格', 偏印: '偏印格', 正印: '正印格',
};
const GOOD = ['正官', '正财', '偏财', '正印', '食神'];
const BAD = ['七杀', '伤官', '偏印', '劫财'];
const GUIDE: Record<string, string> = {
  正官: '正官为善，宜顺用：喜财生官、印护官；忌伤官见官、官杀混杂。',
  七杀: '七杀为凶，宜逆用：喜食制杀或印化杀；忌财党杀、身弱无制。',
  正财: '正财为善，宜身旺任财、食伤生财；忌比劫分夺、身弱。',
  偏财: '偏财为善，主机遇流动之财；喜身旺、食伤生财；忌比劫争夺。',
  食神: '食神为善，主福寿才艺；喜身旺财泄；忌枭神夺食。',
  伤官: '伤官为凶，宜逆用：喜佩印制或生财；忌见官。',
  偏印: '偏印（枭）为凶，宜逆用：喜财制枭；忌枭神夺食。',
  正印: '正印为善，主学问庇荫；喜官杀生印；忌财破印。',
  比肩: '建禄身旺：喜财官有力、食伤生财；忌比劫太旺。',
  劫财: '月劫身旺：喜官杀制、财为用、食伤化劫；忌再聚。',
};
const ZHI_MAIN: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
};

export interface PatternReport {
  name: string;
  tg: string;
  main: string;
  basis: string;
  category: '善神顺用' | '凶神逆用' | '中性';
  guide: string;
}
/** 格局参考（以月令本气取格，简法） */
export function assessPattern(r: BaziResult): PatternReport {
  const mz = r.pillars[1].zhi;
  const main = ZHI_MAIN[mz] || '';
  const dayGan = r.dayMaster.gan;
  const god = ganTenGod(dayGan, main);
  const name = PATTERN_NAME[god] || '—';
  const category: PatternReport['category'] = GOOD.includes(god) ? '善神顺用' : BAD.includes(god) ? '凶神逆用' : '中性';
  return {
    name,
    tg: god,
    main,
    basis: `月令${mz}本气${main}，于日主${dayGan}为「${god}」`,
    category,
    guide: GUIDE[god] || '当审用神喜忌、相神得失，顺逆各得其宜。',
  };
}

/** 某干支对命主喜用的顺/平/留意（参考） */
export function elementFavor(gz: string, fav: Element[]): { tone: '顺' | '平' | '留意'; detail: string } {
  const e1 = GAN_ELEMENT[gz[0]];
  const e2 = ZHI_ELEMENT[gz[1]];
  const hits = [e1, e2].filter((e) => e && fav.includes(e)).length;
  const tone = hits >= 2 ? '顺' : hits === 1 ? '平' : '留意';
  return { tone, detail: `${gz}（${e1 || ''}/${e2 || ''}）` };
}
