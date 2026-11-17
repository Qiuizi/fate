import { useEffect, useMemo, useState } from 'react';
import { BaziResult, LuckPillar, ganTenGod } from '../lib/bazi';
import { ELEMENT_META } from '../lib/elements';
import { monthPillars, daysOfMonth, hoursOfDay, type MonthPillar, type DayItem, type HourItem } from '../lib/extras';
import { favorable, elementFavor } from '../lib/structure';
import Mystic from './Mystic';

const ZHI_HIDDEN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'],
  午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};
const TEN_BRIEF: Record<string, string> = {
  比肩: '自立、竞争，宜合作', 劫财: '进取多争，宜守财', 食神: '福寿才艺，宜生财', 伤官: '聪明才华，宜印制',
  偏财: '机遇之财，宜身旺', 正财: '勤俭正财，宜稳守', 七杀: '压力魄力，宜制化', 正官: '责任名位，宜正途',
  偏印: '偏才玄思，宜财制', 正印: '学问庇护，宜修养',
};

interface Props {
  luck: LuckPillar[];
  currentYear: number;
  result: BaziResult;
  compact?: boolean;
}

export default function LuckTimeline({ luck, currentYear, result, compact = false }: Props) {
  const defaultIdx = useMemo(() => {
    const idx = luck.findIndex((l) => l.current);
    return idx >= 0 ? idx : 0;
  }, [luck, currentYear]);
  const [sel, setSel] = useState(defaultIdx);
  const [selYear, setSelYear] = useState<{ year: number; ganZhi: string } | null>(null);
  const [selMonth, setSelMonth] = useState<MonthPillar | null>(null);
  const [selDay, setSelDay] = useState<DayItem | null>(null);
  const [selHour, setSelHour] = useState<HourItem | null>(null);
  const active = luck[sel];

  useEffect(() => {
    const ln = luck[sel]?.liuNian || [];
    const cur = ln.find((l) => l.year === currentYear) || ln[0];
    setSelYear(cur ? { year: cur.year, ganZhi: cur.ganZhi } : null);
  }, [sel, currentYear, luck]);

  const months = useMemo(() => (selYear ? monthPillars(selYear.ganZhi[0], result.dayMaster.gan) : []), [selYear, result]);
  useEffect(() => {
    setSelMonth(months[0] || null);
  }, [selYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(
    () => (selYear && selMonth ? daysOfMonth(selYear.year, selMonth.ganZhi, result.dayMaster.gan) : []),
    [selYear, selMonth, result]
  );
  useEffect(() => {
    setSelDay(days[0] || null);
  }, [selMonth]); // eslint-disable-line react-hooks/exhaustive-deps
  const hours = useMemo(() => (selDay ? hoursOfDay(selDay.dayGz, result.dayMaster.gan) : []), [selDay, result]);
  useEffect(() => {
    setSelHour(hours[0] || null);
  }, [selDay]); // eslint-disable-line react-hooks/exhaustive-deps
  const hiddenTg: [string, string][] = selHour
    ? (ZHI_HIDDEN[selHour.zhi] || []).map((g) => [g, ganTenGod(result.dayMaster.gan, g)] as [string, string])
    : [];
  const ln = active?.liuNian?.find((l) => l.year === selYear?.year) || null;
  const yearHidden: [string, string][] = selYear
    ? (ZHI_HIDDEN[selYear.ganZhi[1]] || []).map((g) => [g, ganTenGod(result.dayMaster.gan, g)] as [string, string])
    : [];
  const monthHidden: [string, string][] = selMonth
    ? (ZHI_HIDDEN[selMonth.zhi] || []).map((g) => [g, ganTenGod(result.dayMaster.gan, g)] as [string, string])
    : [];
  const fav = useMemo(() => favorable(result), [result]);
  const yFavor = selYear ? elementFavor(selYear.ganZhi, fav) : null;
  const mFavor = selMonth ? elementFavor(selMonth.ganZhi, fav) : null;

  return (
    <>
    <div className={`timeflow ${compact ? 'compact' : ''}`}>
      {/* 大运 */}
      <div className="tf-col">
        <div className="tf-head">
          大运 <span>LUCK</span>
        </div>
        <div className="tf-list">
          {luck.map((l, i) => (
            <button key={l.ganZhi + i} className={`tf-item ${i === sel ? 'on' : ''} ${l.current ? 'cur' : ''}`} onClick={() => setSel(i)}>
              <span className="tf-main tf-gz">
                <b style={{ color: ELEMENT_META[l.ganEl].color }}>{l.gan}</b>
                <b style={{ color: ELEMENT_META[l.zhiEl].color }}>{l.zhi}</b>
              </span>
              <span className="tf-meta">
                {l.startAge}–{l.endAge}岁 · {l.shiShen}
                {l.current ? ' · 当前' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!compact && (
        <>
          {/* 流年 */}
          <div className="tf-col">
            <div className="tf-head">
              流年 <span className="tf-head-gz">{selYear ? selYear.year : ''}</span>
            </div>
            <div className="tf-list" key={'ln' + sel}>
              {(active?.liuNian || []).map((ln) => (
                <button
                  key={ln.year}
                  className={`tf-item ${selYear?.year === ln.year ? 'on' : ''} ${ln.year === currentYear ? 'cur' : ''}`}
                  onClick={() => setSelYear({ year: ln.year, ganZhi: ln.ganZhi })}
                >
                  <span className="tf-main">{ln.year}</span>
                  <span className="tf-meta">
                    <Mystic text={ln.ganZhi} /> · {ln.shiShen} · {ln.age}岁
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 流月 */}
          <div className="tf-col">
            <div className="tf-head">
              流月 <span className="tf-head-gz">{selYear ? selYear.ganZhi + '年' : ''}</span>
            </div>
            <div className="tf-list" key={'mo' + (selYear?.year || '')}>
              {months.map((m) => (
                <button
                  key={m.index}
                  className={`tf-item ${selMonth?.ganZhi === m.ganZhi ? 'on' : ''}`}
                  onClick={() => setSelMonth(m)}
                >
                  <span className="tf-main">{m.monthName}</span>
                  <span className="tf-meta">
                    {m.jie} · <Mystic text={m.ganZhi} /> · {m.shiShen}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 流日 */}
          <div className="tf-col">
            <div className="tf-head">
              流日 <span className="tf-head-gz">{selMonth ? selMonth.ganZhi : ''}</span>
            </div>
            <div className="tf-list" key={'dy' + (selMonth?.ganZhi || '')}>
              {days.map((d) => (
                <button
                  className={`tf-item ${selDay?.date === d.date ? 'on' : ''}`}
                  key={d.date}
                  onClick={() => setSelDay(d)}
                >
                  <span className="tf-main">{d.date}</span>
                  <span className="tf-meta">
                    <Mystic text={d.dayGz} /> · {d.shiShen}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 流时 */}
          <div className="tf-col">
            <div className="tf-head">
              流时 <span className="tf-head-gz">{selDay ? selDay.dayGz : ''}</span>
            </div>
            <div className="tf-list" key={'hr' + (selDay?.date || '')}>
              {hours.map((h) => (
                <button
                  className={`tf-item ${selHour?.zhi === h.zhi ? 'on' : ''}`}
                  key={h.zhi}
                  onClick={() => setSelHour(h)}
                >
                  <span className="tf-main">{h.zhi}时</span>
                  <span className="tf-meta">
                    <Mystic text={h.ganZhi} /> · {h.shiShen} · {h.range}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>

    {!compact && (selYear || selMonth) && (
      <div className="period-detail">
        {selYear && (
          <div className="pd-cell">
            <div className="pd-h">
              <b>{selYear.year}</b> · <Mystic text={selYear.ganZhi} /> · {ln?.shiShen || ''}
              {ln?.age ? ` · ${ln.age}岁` : ''}
            </div>
            <div className="pd-t">{ln ? TEN_BRIEF[ln.shiShen] || '' : ''}</div>
            <div className="pd-hid">流年支藏干：{yearHidden.map(([g, t]) => `${g}·${t}`).join('　')}</div>
            {yFavor && (
              <div className={`pd-fav ${yFavor.tone}`}>
                喜忌：{yFavor.tone} · {yFavor.detail}（参考）
              </div>
            )}
          </div>
        )}
        {selMonth && (
          <div className="pd-cell">
            <div className="pd-h">
              <b>{selMonth.monthName}</b> · <Mystic text={selMonth.ganZhi} /> · {selMonth.shiShen} · {selMonth.jie}
            </div>
            <div className="pd-t">{TEN_BRIEF[selMonth.shiShen] || ''}</div>
            <div className="pd-hid">流月支藏干：{monthHidden.map(([g, t]) => `${g}·${t}`).join('　')}</div>
            {mFavor && (
              <div className={`pd-fav ${mFavor.tone}`}>
                喜忌：{mFavor.tone} · {mFavor.detail}（参考）
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {!compact && selHour && (
      <div className="hour-detail">
        <div className="hd-head">
          <span className="hd-title">
            {selHour.zhi}时 · <Mystic text={selHour.ganZhi} />
          </span>
          <span className="hd-range">{selHour.range}</span>
        </div>
        <div className="hd-grid">
          <div className="hd-cell">
            <span className="k">时干十神</span>
            <span className="v">{selHour.shiShen}</span>
          </div>
          <div className="hd-cell">
            <span className="k">时支藏干</span>
            <span className="v">{hiddenTg.map(([g, t]) => `${g}·${t}`).join('  ')}</span>
          </div>
          <div className="hd-cell">
            <span className="k">要义</span>
            <span className="v">{TEN_BRIEF[selHour.shiShen] || ''}</span>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
