// 五行 · 天干地支基础映射与配色
export const ELEMENTS = ['木', '火', '土', '金', '水'] as const;
export type Element = (typeof ELEMENTS)[number];

export interface ElementMeta {
  color: string;
  soft: string;
  tint: string;
  en: string;
  season: string;
  nature: string;
}

// 矿物颜料般的五行配色（瓷白底可读、低饱和、印刷感）。金取鎏金/黄，土取赭石，二者明度与色相均区分。
export const ELEMENT_META: Record<Element, ElementMeta> = {
  木: { color: '#66b08f', soft: 'rgba(102,176,143,0.16)', tint: 'rgba(102,176,143,0.10)', en: 'WOOD', season: '春', nature: '生发' },
  火: { color: '#e8705a', soft: 'rgba(232,112,90,0.16)', tint: 'rgba(232,112,90,0.10)', en: 'FIRE', season: '夏', nature: '炎上' },
  土: { color: '#cf9f63', soft: 'rgba(207,159,99,0.16)', tint: 'rgba(207,159,99,0.10)', en: 'EARTH', season: '长夏', nature: '稼穑' },
  金: { color: '#e6c25a', soft: 'rgba(230,194,90,0.16)', tint: 'rgba(230,194,90,0.10)', en: 'METAL', season: '秋', nature: '从革' },
  水: { color: '#6f9fd8', soft: 'rgba(111,159,216,0.16)', tint: 'rgba(111,159,216,0.10)', en: 'WATER', season: '冬', nature: '润下' },
};

export const GAN_ELEMENT: Record<string, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export const ZHI_ELEMENT: Record<string, Element> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

export const GAN_YINYANG: Record<string, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳', 己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};

export const ZHI_YINYANG: Record<string, '阳' | '阴'> = {
  子: '阳', 丑: '阴', 寅: '阳', 卯: '阴', 辰: '阳', 巳: '阴', 午: '阳', 未: '阴', 申: '阳', 酉: '阴', 戌: '阳', 亥: '阴',
};

export const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const SHICHEN: { zhi: string; label: string; range: string; startHour: number }[] = [
  { zhi: '子', label: '子时', range: '23–01', startHour: 23 },
  { zhi: '丑', label: '丑时', range: '01–03', startHour: 1 },
  { zhi: '寅', label: '寅时', range: '03–05', startHour: 3 },
  { zhi: '卯', label: '卯时', range: '05–07', startHour: 5 },
  { zhi: '辰', label: '辰时', range: '07–09', startHour: 7 },
  { zhi: '巳', label: '巳时', range: '09–11', startHour: 9 },
  { zhi: '午', label: '午时', range: '11–13', startHour: 11 },
  { zhi: '未', label: '未时', range: '13–15', startHour: 13 },
  { zhi: '申', label: '申时', range: '15–17', startHour: 15 },
  { zhi: '酉', label: '酉时', range: '17–19', startHour: 17 },
  { zhi: '戌', label: '戌时', range: '19–21', startHour: 19 },
  { zhi: '亥', label: '亥时', range: '21–23', startHour: 21 },
];

export function shichenOf(hour: number): string {
  // 23:00-00:59 -> 子 ; 1-2 -> 丑 ...
  const h = ((hour % 24) + 24) % 24;
  if (h === 23 || h === 0) return '子';
  return ZHI_ORDER[Math.floor((h + 1) / 2)] as string;
}
