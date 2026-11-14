import { REGIONS } from '../data/chinaRegions';

export interface Region {
  county: string;
  city: string;
  province: string;
  lng: number;
  full: string;
  display: string;
  sub: string;
}

const shortProv = (p: string) => p.replace(/(省|市|自治区|特别行政区|维吾尔|壮族|回族|自治州)/g, '');
const shortCity = (c: string) => c.replace(/(市|地区|盟|自治州|自治县|新区)$/g, '');

export const REGION_LIST: Region[] = REGIONS.map(([county, city, province, lng]) => {
  const parts = province === city ? [province, county] : [province, city, county];
  const full = parts.join(' ');
  const display = province === city ? `${county}·${shortProv(province)}` : `${county}·${shortCity(city)}`;
  return { county, city, province, lng, full, display, sub: `${shortProv(province)} · ${shortCity(city)}` };
});

const POPULAR_CITIES = ['北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉', '西安', '南京', '天津', '苏州', '长沙', '郑州', '青岛', '沈阳', '厦门', '昆明', '合肥', '福州'];

export const POPULAR_REGIONS: Region[] = POPULAR_CITIES.map((n) =>
  REGION_LIST.find((r) => r.city.startsWith(n) || r.province.startsWith(n))
).filter((r): r is Region => !!r);

export function searchRegions(q: string, limit = 80): Region[] {
  const s = q.trim();
  if (!s) return POPULAR_REGIONS;
  const hits: Region[] = [];
  for (const r of REGION_LIST) {
    if (r.full.includes(s) || r.county.includes(s) || r.display.includes(s)) {
      hits.push(r);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

export function regionByName(name: string): Region | undefined {
  return REGION_LIST.find((r) => r.display === name) || REGION_LIST.find((r) => r.full === name);
}
