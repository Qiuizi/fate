import { BaziResult, ganTenGod } from './bazi';
import { Element } from './elements';
import { favorable } from './structure';

export type CompatTag = '吉' | '平' | '需留意';

export interface CompatDim {
  title: string;
  score: number;
  tag: CompatTag;
  text: string;
}

export interface CompatResult {
  score: number;
  level: string;
  dims: CompatDim[];
  paragraphs: string[];
}

const GEN: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const ELS: Element[] = ['木', '火', '土', '金', '水'];

const GAN_HE: [string, string, Element][] = [
  ['甲', '己', '土'],
  ['乙', '庚', '金'],
  ['丙', '辛', '水'],
  ['丁', '壬', '木'],
  ['戊', '癸', '火'],
];
const LIUHE = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
const LIUCHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
const LIUHAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
const SANHE = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
];
const ZIXING = ['子卯', '寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未'];

const hasPair = (set: string[], a: string, b: string) => set.includes(a + b) || set.includes(b + a);

function elementRelation(a: Element, b: Element): { score: number; tag: CompatTag; text: string } {
  if (a === b) return { score: 62, tag: '平', text: `同属${a}，性情相近、易生共鸣，但亦易各执己见。` };
  if (GEN[a] === b) return { score: 84, tag: '吉', text: `${a}生${b}，你乐于付出、对方得滋养，关系顺畅。` };
  if (GEN[b] === a) return { score: 84, tag: '吉', text: `${b}生${a}，多得对方助益与照顾。` };
  if (CTRL[a] === b) return { score: 54, tag: '需留意', text: `${a}克${b}，主导欲偏强，宜多体谅、避免压制。` };
  return { score: 54, tag: '需留意', text: `${b}克${a}，相处压力较大，宜柔和沟通。` };
}

function branchRelation(a: string, b: string): { score: number; tag: CompatTag; text: string; type: string } {
  if (hasPair(LIUHE, a, b)) return { score: 90, tag: '吉', text: `${a}${b}六合，情投意合、吸引力强，聚合力佳。`, type: '六合' };
  if (hasPair(LIUCHONG, a, b)) return { score: 46, tag: '需留意', text: `${a}${b}相冲，易有摩擦与变动，宜多沟通、留空间。`, type: '六冲' };
  if (hasPair(LIUHAI, a, b)) return { score: 52, tag: '需留意', text: `${a}${b}相害，暗生嫌隙，宜坦诚相待。`, type: '相害' };
  if (hasPair(ZIXING, a, b)) return { score: 55, tag: '需留意', text: `${a}${b}相刑，易生内耗，宜互相包容。`, type: '相刑' };
  for (const g of SANHE) {
    if (g.includes(a) && g.includes(b) && a !== b) return { score: 85, tag: '吉', text: `${a}${b}同属三合局，彼此助力、默契佳。`, type: '三合' };
  }
  return { score: 66, tag: '平', text: `${a}${b}无特殊合冲，关系平稳、重在经营。`, type: '平' };
}

function naYinElement(r: BaziResult): Element {
  const s = r.pillars[2].naYin;
  const last = s[s.length - 1];
  return (ELS.includes(last as Element) ? (last as Element) : '土') as Element;
}

function complement(a: BaziResult, b: BaziResult) {
  const lackA = ELS.filter((e) => a.visibleCount[e] === 0);
  const lackB = ELS.filter((e) => b.visibleCount[e] === 0);
  const fillA = lackA.filter((e) => b.visibleCount[e] > 0);
  const fillB = lackB.filter((e) => a.visibleCount[e] > 0);
  const score = Math.min(95, 58 + fillA.length * 10 + fillB.length * 10);
  const parts: string[] = [];
  if (fillA.length) parts.push(`对方可补你之${fillA.join('、')}（你所缺）`);
  if (fillB.length) parts.push(`你可补对方之${fillB.join('、')}（其所缺）`);
  const text = parts.length
    ? `${parts.join('；')}，彼此补益，相处易互补长短。`
    : '双方所缺相近、互补性一般，宜在作息与性情上互相调和。';
  const tag: CompatTag = parts.length >= 2 ? '吉' : '平';
  return { score, tag, text };
}

/** 粗略“参考喜用”（按身强弱近似，非严格用神）已移至 structure.ts */

function yongshenHelp(a: BaziResult, b: BaziResult) {
  const favA = favorable(a);
  const favB = favorable(b);
  const supplyA = favA.filter((e) => b.visibleCount[e] > 0);
  const supplyB = favB.filter((e) => a.visibleCount[e] > 0);
  const n = supplyA.length + supplyB.length;
  const score = Math.min(95, 56 + n * 9);
  const tag: CompatTag = n >= 2 ? '吉' : n >= 1 ? '平' : '需留意';
  const parts: string[] = [];
  parts.push(`你的参考喜用约在「${favA.join('、')}」，${supplyA.length ? '对方命局能补' + supplyA.join('、') : '对方补益有限'}`);
  parts.push(`对方喜用约在「${favB.join('、')}」，${supplyB.length ? '你能补其' + supplyB.join('、') : '你对其补益有限'}`);
  return { score, tag, text: `${parts.join('；')}。（按身强弱近似，非严格用神）` };
}

const GAN_HE_LOOK = (x: string, y: string) =>
  GAN_HE.find(([p, q]) => (p === x && q === y) || (p === y && q === x));

export function computeCompat(a: BaziResult, b: BaziResult): CompatResult {
  const aDay = a.dayMaster.gan;
  const bDay = b.dayMaster.gan;
  const aEl = a.dayMaster.element;
  const bEl = b.dayMaster.element;
  const aYear = a.pillars[0].zhi;
  const bYear = b.pillars[0].zhi;
  const aSpouse = a.pillars[2].zhi;
  const bSpouse = b.pillars[2].zhi;

  const er = elementRelation(aEl, bEl);
  const he = GAN_HE_LOOK(aDay, bDay);
  const zo = branchRelation(aYear, bYear);
  const sp = branchRelation(aSpouse, bSpouse);
  const co = complement(a, b);
  const ys = yongshenHelp(a, b);
  const anEl = naYinElement(a);
  const bnEl = naYinElement(b);
  const nr = elementRelation(anEl, bnEl);
  const t1 = ganTenGod(aDay, bDay);
  const t2 = ganTenGod(bDay, aDay);
  const goodTg = ['正官', '正财', '正印', '食神'];
  const tgScore = goodTg.includes(t1) ? 82 : t1 === '比肩' || t1 === '劫财' ? 66 : 62;
  const tgTag: CompatTag = tgScore >= 80 ? '吉' : tgScore >= 65 ? '平' : '需留意';

  const dims: CompatDim[] = [
    {
      title: '日主关系',
      score: he ? Math.min(95, er.score + 12) : er.score,
      tag: he ? '吉' : er.tag,
      text: he
        ? `日主${aDay}（${aEl}）与${bDay}（${bEl}）为天干五合，化${he[2]}，天然亲近、易生好感。`
        : `日主${aDay}（${aEl}）与${bDay}（${bEl}）：${er.text}`,
    },
    { title: '生肖合冲', score: zo.score, tag: zo.tag, text: `生肖（${aYear}${bYear}）：${zo.text}` },
    { title: '夫妻宫（日支）', score: sp.score, tag: sp.tag, text: `日支${aSpouse}${bSpouse}：${sp.text}` },
    { title: '五行互补', score: co.score, tag: co.tag, text: co.text },
    { title: '用神互济', score: ys.score, tag: ys.tag, text: ys.text },
    {
      title: '纳音合参',
      score: nr.score,
      tag: nr.tag,
      text: `日柱纳音「${a.pillars[2].naYin}」（${anEl}）与「${b.pillars[2].naYin}」（${bnEl}）：${nr.text}`,
    },
    {
      title: '十神互动',
      score: tgScore,
      tag: tgTag,
      text: `以你（${aDay}）论对方日主为「${t1}」，对方看你为「${t2}」。${
        goodTg.includes(t1) ? '彼此为对方之吉神，相处多助益与欣赏。' : t1 === '比肩' || t1 === '劫财' ? '彼此如友如伴、较平等，宜防争强。' : '彼此为对方之偏星，个性有张力，宜多磨合。'
      }`,
    },
  ];

  const score = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
  const level = score >= 82 ? '上吉 · 高度契合' : score >= 70 ? '中上 · 较为相合' : score >= 58 ? '中平 · 需磨合' : '偏弱 · 宜多加经营';

  const paragraphs: string[] = [];
  paragraphs.push(
    `综合契合度约 ${score} 分（${level}）。依据日主、生肖、夫妻宫、五行互补、用神互济、纳音与十神等多项参合：${
      dims.filter((d) => d.tag === '吉').length
    } 项偏吉、${dims.filter((d) => d.tag === '需留意').length} 项需留意。`
  );
  paragraphs.push(
    `日主层面：${aDay}${aEl} 与 ${bDay}${bEl}${
      he ? '天干相合，情投意合、缘分较深' : er.tag === '吉' ? '五行相生，彼此滋养、相处顺遂' : er.tag === '需留意' ? '五行相克，主导与压力并存，宜多体谅' : '五行比和，平等而需经营'
    }。`
  );
  paragraphs.push(
    `生肖（${aYear}${bYear}）${zo.type === '平' ? '无显著合冲' : '呈' + zo.type + '之象'}；夫妻宫（日支）${aSpouse}${bSpouse}${
      sp.type === '平' ? '关系平稳' : '见' + sp.type
    }——夫妻宫为婚姻宫，合则聚、冲刑害则宜多沟通化解。`
  );
  paragraphs.push(co.text + `纳音上，${a.pillars[2].naYin}与${b.pillars[2].naYin}${nr.tag === '吉' ? '相生相济' : nr.tag === '需留意' ? '相克，宜调适' : '比和，平和相处'}。`);
  paragraphs.push('合盘为传统命理参考，非确定结论；感情与关系贵在经营、体谅与共同成长。');

  return { score, level, dims, paragraphs };
}
