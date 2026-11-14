import { Pillar } from './bazi';

export interface ShenSha {
  name: string;
  roles: string[];
}
export interface ShenShaResult {
  list: ShenSha[];
}

const R = (p: Pillar) => p.role.replace('柱', '');

/** 天乙贵人（以日干取） */
const TIANYI: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};
/** 文昌贵人（以日干取） */
const WENCHANG: Record<string, string> = {
  甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
};
/** 太极贵人（以日干取） */
const TAIJI: Record<string, string[]> = {
  甲: ['子', '午'], 乙: ['子', '午'], 丙: ['卯', '酉'], 丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'], 己: ['辰', '戌', '丑', '未'], 庚: ['寅', '亥'], 辛: ['寅', '亥'],
  壬: ['巳', '申'], 癸: ['巳', '申'],
};
/** 禄神（以日干取） */
const LU: Record<string, string> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
};
/** 羊刃（阳干取，阴干不列） */
const YANGREN: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };

const groupOf = (zhi: string) => {
  if ('申子辰'.includes(zhi)) return '水';
  if ('寅午戌'.includes(zhi)) return '火';
  if ('巳酉丑'.includes(zhi)) return '金';
  if ('亥卯未'.includes(zhi)) return '木';
  return '';
};
/** 三合类：将星/华盖/驿马/桃花/劫煞/亡神 */
const BY_GROUP: Record<string, Record<string, string>> = {
  将星: { 水: '子', 火: '午', 金: '酉', 木: '卯' },
  华盖: { 水: '辰', 火: '戌', 金: '丑', 木: '未' },
  驿马: { 水: '寅', 火: '申', 金: '亥', 木: '巳' },
  桃花: { 水: '酉', 火: '卯', 金: '午', 木: '子' },
  劫煞: { 水: '巳', 火: '亥', 金: '寅', 木: '申' },
  亡神: { 水: '亥', 火: '巳', 金: '申', 木: '寅' },
};
/** 孤辰寡宿（以年支） */
const GUCHEN: Record<string, [string, string]> = {
  亥: ['寅', '戌'], 子: ['寅', '戌'], 丑: ['寅', '戌'],
  寅: ['巳', '丑'], 卯: ['巳', '丑'], 辰: ['巳', '丑'],
  巳: ['申', '辰'], 午: ['申', '辰'], 未: ['申', '辰'],
  申: ['亥', '未'], 酉: ['亥', '未'], 戌: ['亥', '未'],
};
/** 红鸾 / 天喜（以年支） */
const HONGLUAN: Record<string, string> = {
  子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌',
  午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰',
};
const opp = (zhi: string) => {
  const order = '子丑寅卯辰巳午未申酉戌亥';
  return order[(order.indexOf(zhi) + 6) % 12];
};

/** 月德贵人（以月支三合取天干） */
const YUEDE: Record<string, string> = {
  寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚',
};
/** 金舆（日干） */
const JINYU: Record<string, string> = {
  甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅',
};
/** 国印贵人（日干） */
const GUOYIN: Record<string, string> = {
  甲: '戌', 乙: '亥', 丙: '丑', 丁: '寅', 戊: '丑', 己: '寅', 庚: '辰', 辛: '巳', 壬: '未', 癸: '申',
};
/** 红艳煞（日干） */
const HONGYAN: Record<string, string> = {
  甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申',
};
/** 流霞（日干） */
const LIUXIA: Record<string, string> = {
  甲: '酉', 乙: '戌', 丙: '未', 丁: '申', 戊: '巳', 己: '午', 庚: '辰', 辛: '卯', 壬: '亥', 癸: '寅',
};
const KUIGANG = new Set(['庚辰', '庚戌', '壬辰', '戊戌']);
const YINYANG_CUO = new Set(['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥']);
const SHIE_DABAI = new Set(['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥']);

export function computeShenSha(pillars: Pillar[]): ShenShaResult {
  const map = new Map<string, Set<string>>();
  const add = (name: string, branches: string[]) => {
    const hits = pillars.filter((p) => branches.includes(p.zhi)).map(R);
    if (!hits.length) return;
    if (!map.has(name)) map.set(name, new Set());
    hits.forEach((h) => map.get(name)!.add(h));
  };
  const addGan = (name: string, gan?: string) => {
    if (!gan) return;
    const hits = pillars.filter((p) => p.gan === gan).map(R);
    if (!hits.length) return;
    if (!map.has(name)) map.set(name, new Set());
    hits.forEach((h) => map.get(name)!.add(h));
  };

  const dayGan = pillars[2].gan;
  const yearZhi = pillars[0].zhi;
  const dayZhi = pillars[2].zhi;

  add('天乙贵人', TIANYI[dayGan] || []);
  add('文昌贵人', WENCHANG[dayGan] ? [WENCHANG[dayGan]] : []);
  add('太极贵人', TAIJI[dayGan] || []);
  add('禄神', LU[dayGan] ? [LU[dayGan]] : []);
  if (YANGREN[dayGan]) add('羊刃', [YANGREN[dayGan]]);

  const gy = groupOf(yearZhi);
  const gd = groupOf(dayZhi);
  (Object.keys(BY_GROUP) as (keyof typeof BY_GROUP)[]).forEach((k) => {
    const t = new Set<string>();
    if (gy && BY_GROUP[k][gy]) t.add(BY_GROUP[k][gy]);
    if (gd && BY_GROUP[k][gd]) t.add(BY_GROUP[k][gd]);
    add(k, Array.from(t));
  });

  const gu = GUCHEN[yearZhi];
  if (gu) {
    add('孤辰', [gu[0]]);
    add('寡宿', [gu[1]]);
  }
  if (HONGLUAN[yearZhi]) {
    add('红鸾', [HONGLUAN[yearZhi]]);
    add('天喜', [opp(HONGLUAN[yearZhi])]);
  }

  // 月德贵人（月支三合取干）
  addGan('月德贵人', YUEDE[pillars[1].zhi]);
  // 日干类
  add('金舆', JINYU[dayGan] ? [JINYU[dayGan]] : []);
  add('国印贵人', GUOYIN[dayGan] ? [GUOYIN[dayGan]] : []);
  add('红艳煞', HONGYAN[dayGan] ? [HONGYAN[dayGan]] : []);
  add('流霞', LIUXIA[dayGan] ? [LIUXIA[dayGan]] : []);
  // 日柱类
  const dayGz = pillars[2].ganZhi;
  const addDay = (name: string, v: boolean) => {
    if (!v) return;
    if (!map.has(name)) map.set(name, new Set());
    map.get(name)!.add('日');
  };
  addDay('魁罡', KUIGANG.has(dayGz));
  addDay('阴差阳错', YINYANG_CUO.has(dayGz));
  addDay('十恶大败', SHIE_DABAI.has(dayGz));
  // 天罗地网
  const zhis = pillars.map((p) => p.zhi);
  if (zhis.includes('辰') && zhis.includes('巳')) {
    if (!map.has('地网')) map.set('地网', new Set());
    pillars.filter((p) => ['辰', '巳'].includes(p.zhi)).forEach((p) => map.get('地网')!.add(R(p)));
  }
  if (zhis.includes('戌') && zhis.includes('亥')) {
    if (!map.has('天罗')) map.set('天罗', new Set());
    pillars.filter((p) => ['戌', '亥'].includes(p.zhi)).forEach((p) => map.get('天罗')!.add(R(p)));
  }

  const list: ShenSha[] = Array.from(map.entries()).map(([name, roles]) => ({
    name,
    roles: Array.from(roles),
  }));
  return { list };
}
