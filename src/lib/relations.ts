import { Pillar } from './bazi';

export interface Rel {
  type: string;
  text: string;
  roles: string[];
}
export interface Relations {
  gan: Rel[];
  zhi: Rel[];
}

const label = (p: Pillar) => p.role.replace('柱', '');

const GAN_HE: [string, string, string][] = [
  ['甲', '己', '土'],
  ['乙', '庚', '金'],
  ['丙', '辛', '水'],
  ['丁', '壬', '木'],
  ['戊', '癸', '火'],
];
const GAN_CHONG: [string, string][] = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
];
const ZHI_HE: [string, string, string][] = [
  ['子', '丑', '土'],
  ['寅', '亥', '木'],
  ['卯', '戌', '火'],
  ['辰', '酉', '金'],
  ['巳', '申', '水'],
  ['午', '未', '土'],
];
const ZHI_CHONG: [string, string][] = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];
const ZHI_HAI: [string, string][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];
const ZHI_PO: [string, string][] = [
  ['子', '酉'],
  ['卯', '午'],
  ['辰', '丑'],
  ['未', '戌'],
  ['寅', '亥'],
  ['巳', '申'],
];
const ZHI_XING: [string, string][] = [
  ['寅', '巳'],
  ['巳', '申'],
  ['寅', '申'],
  ['丑', '戌'],
  ['戌', '未'],
  ['丑', '未'],
  ['子', '卯'],
];
const SAN_HE: [string[], string][] = [
  [['申', '子', '辰'], '水'],
  [['亥', '卯', '未'], '木'],
  [['寅', '午', '戌'], '火'],
  [['巳', '酉', '丑'], '金'],
];
const SAN_HUI: [string[], string][] = [
  [['寅', '卯', '辰'], '木'],
  [['巳', '午', '未'], '火'],
  [['申', '酉', '戌'], '金'],
  [['亥', '子', '丑'], '水'],
];
const SELF_XING = ['辰', '午', '酉', '亥'];

export function analyzeRelations(pillars: Pillar[]): Relations {
  const gan: Rel[] = [];
  const zhi: Rel[] = [];

  const pushZhi = (type: string, text: string, roles: string[]) => {
    if (!zhi.some((r) => r.text === text)) zhi.push({ type, text, roles });
  };

  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i].gan;
      const b = pillars[j].gan;
      const roles = [label(pillars[i]), label(pillars[j])];
      const pairLabel = roles.join('·');
      for (const [x, y, el] of GAN_HE) {
        if ((a === x && b === y) || (a === y && b === x)) gan.push({ type: '五合', text: `${a}${b}合${el}（${pairLabel}）`, roles });
      }
      for (const [x, y] of GAN_CHONG) {
        if ((a === x && b === y) || (a === y && b === x)) gan.push({ type: '相冲', text: `${a}${b}冲（${pairLabel}）`, roles });
      }
    }
  }

  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i].zhi;
      const b = pillars[j].zhi;
      const roles = [label(pillars[i]), label(pillars[j])];
      const pairLabel = roles.join('·');
      for (const [x, y, el] of ZHI_HE) {
        if ((a === x && b === y) || (a === y && b === x)) pushZhi('六合', `${a}${b}合${el}（${pairLabel}）`, roles);
      }
      for (const [x, y] of ZHI_CHONG) {
        if ((a === x && b === y) || (a === y && b === x)) pushZhi('六冲', `${a}${b}冲（${pairLabel}）`, roles);
      }
      for (const [x, y] of ZHI_HAI) {
        if ((a === x && b === y) || (a === y && b === x)) pushZhi('六害', `${a}${b}害（${pairLabel}）`, roles);
      }
      for (const [x, y] of ZHI_PO) {
        if ((a === x && b === y) || (a === y && b === x)) pushZhi('相破', `${a}${b}破（${pairLabel}）`, roles);
      }
      for (const [x, y] of ZHI_XING) {
        if ((a === x && b === y) || (a === y && b === x)) pushZhi('相刑', `${a}${b}刑（${pairLabel}）`, roles);
      }
    }
  }

  const zhiCount: Record<string, string[]> = {};
  pillars.forEach((p) => {
    (zhiCount[p.zhi] = zhiCount[p.zhi] || []).push(label(p));
  });
  Object.entries(zhiCount).forEach(([br, labels]) => {
    if (SELF_XING.includes(br) && labels.length >= 2) pushZhi('自刑', `${br}${br}自刑（${labels.join('·')}）`, labels);
  });

  const allZhi = pillars.map((p) => p.zhi);
  const rolesOf = (brs: string[]) => pillars.filter((p) => brs.includes(p.zhi)).map(label);
  for (const [brs, el] of SAN_HE) {
    if (brs.every((b) => allZhi.includes(b))) pushZhi('三合', `${brs.join('')}三合${el}局（${rolesOf(brs).join('·')}）`, rolesOf(brs));
  }
  for (const [brs, el] of SAN_HUI) {
    if (brs.every((b) => allZhi.includes(b))) pushZhi('三会', `${brs.join('')}三会${el}方（${rolesOf(brs).join('·')}）`, rolesOf(brs));
  }

  return { gan, zhi };
}
