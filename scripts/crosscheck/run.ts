/**
 * 排盘交叉核对：用 scripts/crosscheck/cases.json 里的 500 个合成时刻（固定随机种子生成，非真人数据）
 * 对照独立实现（PyEphem 节气 + 儒略日纪日 + 五鼠遁，另以 sxtwl 复核），检查 fate 的
 * 四柱（两种子时口径）、节令时刻、真太阳时与大运起运。
 *
 *   npm run test:crosscheck          # 打印摘要，有未归类差异时以非零码退出
 *   npm run test:crosscheck -- --write   # 同时更新 scripts/crosscheck/summary.json
 *
 * 重新生成参考数据：pip install ephem sxtwl && python3 scripts/crosscheck/gen_reference.py
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Solar } from 'lunar-javascript';
import { computeBazi, BaziInput } from '../../src/lib/bazi';

const here = dirname(fileURLToPath(import.meta.url));
const { meta, cases } = JSON.parse(readFileSync(join(here, 'cases.json'), 'utf8'));

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const idx60 = (gz: string) => { for (let i = 0; i < 60; i++) if (GAN[i % 10] + ZHI[i % 12] === gz) return i; return -1; };
const parse = (s: string) => { const [d, t] = s.split(' '); const [y, m, dd] = d.split('-').map(Number); const [hh, mi, ss = 0] = t.split(':').map(Number); return { y, m, d: dd, hh, mi, ss }; };
const ms = (s: string) => { const p = parse(s); return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mi, p.ss); };

const JIE_TOL_S = 60; // 节令时刻允许差（秒）
const TST_TOL_S = 60; // 真太阳时允许差（秒）
const YUN_TOL_D = 30; // 起运时刻允许差（天，lunar 口径按时辰取整，约 ±20 天）

type Diff = { id: number; kind: string; civil: string; what: string; fate: string; ref: string; cls: string; note: string };
const diffs: Diff[] = [];
const stats = { pillarsChecked: 0, pillarsMatched: 0, jieChecked: 0, jieMaxDiffS: 0, tstChecked: 0, tstMaxDiffS: 0, yunChecked: 0, yunMaxDiffDays: 0, yunDirectionMismatch: 0, firstLuckChecked: 0, firstLuckMatched: 0, monthJieChecked: 0, monthJieMatched: 0 };

for (const c of cases) {
  const p = parse(c.civil);
  const base: BaziInput = {
    calendar: 'solar', year: p.y, month: p.m, day: p.d, hour: p.hh, minute: p.mi, gender: c.gender,
    trueSolar: c.longitude != null, useEot: true, longitude: c.longitude ?? 120, utcOffset: 8, zishiSect: 2, isLeapMonth: false,
  };
  let effStr = '';
  for (const sect of [1, 2] as const) {
    const r = computeBazi({ ...base, zishiSect: sect }, 2026);
    const e = r.effective;
    effStr = `${e.y}-${String(e.m).padStart(2, '0')}-${String(e.d).padStart(2, '0')} ${String(e.hh).padStart(2, '0')}:${String(e.mm).padStart(2, '0')}:${String(e.ss).padStart(2, '0')}`;
    const got = r.pillars.map((x) => x.ganZhi);
    const want: string[] = c.ref[`sect${sect}`];
    stats.pillarsChecked += 4;
    got.forEach((g, i) => {
      if (g === want[i]) { stats.pillarsMatched++; return; }
      const role = ['年柱', '月柱', '日柱', '时柱'][i];
      const effMs = ms(effStr);
      const nearJie = Math.min(Math.abs(effMs - ms(c.ref.prevJie[1])), Math.abs(effMs - ms(c.ref.nextJie[1]))) / 1000;
      let cls = 'unexplained', note = '';
      if ((i <= 1) && nearJie < 120) { cls = 'jie-precision'; note = `距节令 ${nearJie.toFixed(0)} 秒`; }
      if (c.refTrueSolar) {
        const dt = Math.abs(effMs - ms(c.refTrueSolar)) / 1000;
        const ref = parse(c.refTrueSolar);
        const crossesHour = ref.mi === 0 || (ref.mi === 59) || dt > 60;
        if (cls === 'unexplained' && crossesHour) { cls = 'tst-precision'; note = `真太阳时差 ${dt.toFixed(0)} 秒，落在时辰边界`; }
      }
      diffs.push({ id: c.id, kind: c.kind, civil: c.civil, what: `${role}·sect${sect}`, fate: g, ref: want[i], cls, note });
    });
    if (sect === 2) {
      // 节令
      const lunar = Solar.fromYmdHms(e.y, e.m, e.d, e.hh, e.mm, e.ss).getLunar() as any;
      const pj = lunar.getPrevJie(false); const nj = lunar.getNextJie(false);
      for (const [j, refJ] of [[pj, c.ref.prevJie], [nj, c.ref.nextJie]] as const) {
        stats.jieChecked++;
        const dS = Math.abs(ms(j.getSolar().toYmdHms()) - ms(refJ[1])) / 1000;
        stats.jieMaxDiffS = Math.max(stats.jieMaxDiffS, dS);
        if (j.getName() !== refJ[0] || dS > JIE_TOL_S) diffs.push({ id: c.id, kind: c.kind, civil: c.civil, what: '节令时刻', fate: `${j.getName()} ${j.getSolar().toYmdHms()}`, ref: `${refJ[0]} ${refJ[1]}`, cls: 'unexplained', note: `${dS.toFixed(0)} 秒` });
      }
      // 结果页显示的「某节后」与节气区间须与精确时刻一致
      stats.monthJieChecked++;
      if (r.jieQi.monthJie === c.ref.prevJie[0]) stats.monthJieMatched++;
      else diffs.push({ id: c.id, kind: c.kind, civil: c.civil, what: '月令所属节（显示）', fate: `${r.jieQi.monthJie}后`, ref: `${c.ref.prevJie[0]}后`, cls: 'unexplained', note: '' });
      // 真太阳时
      if (c.refTrueSolar) {
        stats.tstChecked++;
        const dS = Math.abs(ms(effStr) - ms(c.refTrueSolar)) / 1000;
        stats.tstMaxDiffS = Math.max(stats.tstMaxDiffS, dS);
        if (dS > TST_TOL_S) diffs.push({ id: c.id, kind: c.kind, civil: c.civil, what: '真太阳时', fate: effStr, ref: c.refTrueSolar, cls: 'unexplained', note: `${dS.toFixed(0)} 秒` });
      }
      // 大运
      stats.yunChecked++;
      const m = /(\d+)年(\d+)个月(\d+)天/.exec(r.yun.startText);
      const yrs = m ? Number(m[1]) + Number(m[2]) / 12 + Number(m[3]) / 360 : NaN;
      const dDays = Math.abs(yrs - c.ref.yun.startYears) * 365.2422;
      stats.yunMaxDiffDays = Math.max(stats.yunMaxDiffDays, dDays);
      if (r.yun.forward !== c.ref.yun.forward) { stats.yunDirectionMismatch++; diffs.push({ id: c.id, kind: c.kind, civil: c.civil, what: '大运顺逆', fate: String(r.yun.forward), ref: String(c.ref.yun.forward), cls: 'unexplained', note: '' }); }
      else if (!(dDays <= YUN_TOL_D)) diffs.push({ id: c.id, kind: c.kind, civil: c.civil, what: '起运', fate: r.yun.startText, ref: `${c.ref.yun.startYears.toFixed(3)} 年`, cls: 'unexplained', note: `${dDays.toFixed(1)} 天` });
      // 第一步大运 = 月柱顺/逆推一位
      stats.firstLuckChecked++;
      const mi = idx60(c.ref.sect2[1]);
      const expect = (mi + (c.ref.yun.forward ? 1 : 59)) % 60;
      const first = r.luck[0]?.ganZhi ?? '';
      if (idx60(first) === expect) stats.firstLuckMatched++;
      else diffs.push({ id: c.id, kind: c.kind, civil: c.civil, what: '首步大运', fate: first, ref: GAN[expect % 10] + ZHI[expect % 12], cls: 'unexplained', note: '' });
    }
  }
}

const byCls: Record<string, number> = {};
for (const d of diffs) byCls[d.cls] = (byCls[d.cls] || 0) + 1;
const summary = {
  generated: meta, cases: cases.length,
  pillars: { checked: stats.pillarsChecked, matched: stats.pillarsMatched, rate: +(stats.pillarsMatched / stats.pillarsChecked * 100).toFixed(2) },
  jie: { checked: stats.jieChecked, maxDiffSeconds: +stats.jieMaxDiffS.toFixed(1), toleranceSeconds: JIE_TOL_S },
  trueSolar: { checked: stats.tstChecked, maxDiffSeconds: +stats.tstMaxDiffS.toFixed(1), toleranceSeconds: TST_TOL_S },
  yun: { checked: stats.yunChecked, directionMismatch: stats.yunDirectionMismatch, maxStartDiffDays: +stats.yunMaxDiffDays.toFixed(1), toleranceDays: YUN_TOL_D },
  firstLuck: { checked: stats.firstLuckChecked, matched: stats.firstLuckMatched },
  monthJieLabel: { checked: stats.monthJieChecked, matched: stats.monthJieMatched },
  differences: byCls,
  details: diffs,
};
console.log(JSON.stringify({ ...summary, details: diffs.slice(0, 40) }, null, 1));
if (process.argv.includes('--write')) writeFileSync(join(here, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
const unexplained = diffs.filter((d) => d.cls === 'unexplained').length;
console.log(unexplained ? `\n✗ ${unexplained} 处未归类差异` : `\n✓ 交叉核对通过（${cases.length} 个时刻）`);
process.exit(unexplained ? 1 : 0);
