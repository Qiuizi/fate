import { useMemo, useState } from 'react';
import { BaziResult } from '../lib/bazi';
import { yearGanOf, monthPillars, buildXiaoYun, countTenGods } from '../lib/extras';
import Mystic from './Mystic';
import Count from './Count';

export function LiuYuePanel({ result }: { result: BaziResult }) {
  const [year, setYear] = useState(result.currentYear);
  const yearGan = useMemo(() => yearGanOf(year), [year]);
  const months = useMemo(() => monthPillars(yearGan, result.dayMaster.gan), [yearGan, result.dayMaster.gan]);
  return (
    <div className="x-panel">
      <div className="x-head">
        <h4>流月</h4>
        <span className="en">MONTHLY</span>
        <div className="ly-year">
          <button onClick={() => setYear((y) => y - 1)} aria-label="上一年">
            ‹
          </button>
          <span>
            {year} · {yearGan}年
          </span>
          <button onClick={() => setYear((y) => y + 1)} aria-label="下一年">
            ›
          </button>
        </div>
      </div>
      <div className="ly-grid" key={year}>
        {months.map((m, i) => (
          <div className="ly-item" key={m.index} style={{ animationDelay: `${i * 26}ms` }}>
            <div className="ly-jie">{m.jie}</div>
            <div className="ly-gz">
              <Mystic text={m.ganZhi} />
            </div>
            <div className="ly-ss">{m.shiShen}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function XiaoYunPanel({ result }: { result: BaziResult }) {
  const list = useMemo(() => buildXiaoYun(result.pillars[3].ganZhi, result.yun.forward, 12), [result]);
  return (
    <div className="x-panel">
      <div className="x-head">
        <h4>小运</h4>
        <span className="en">MINOR LUCK</span>
        <span className="x-note">童限 · 逐年</span>
      </div>
      <div className="xy-chips">
        {list.map((x, i) => (
          <span className="xy-chip" key={x.age} style={{ animationDelay: `${i * 26}ms` }}>
            <em>{x.age}岁</em>
            <Mystic text={x.ganZhi} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function TenGodStats({
  result,
  onHoverRoles,
  onOpenClassic,
}: {
  result: BaziResult;
  onHoverRoles?: (roles: string[] | null) => void;
  onOpenClassic?: (key: string) => void;
}) {
  const counts = useMemo(() => countTenGods(result.pillars), [result]);

  const rolesFor = (name: string) => {
    const set = new Set<string>();
    result.pillars.forEach((p, i) => {
      const lab = p.role.replace('柱', '');
      if (i !== 2 && p.shiShen === name) set.add(lab);
      if (p.hidden.some((h) => h.shiShen === name)) set.add(lab);
    });
    return Array.from(set);
  };

  return (
    <div className="x-panel">
      <div className="x-head">
        <h4>十神统计</h4>
        <span className="en">TEN GODS</span>
        <span className="x-note">天干＋藏干 · 悬停定位</span>
        {onOpenClassic && (
          <button className="ref-link" onClick={() => onOpenClassic('shishen')}>
            断语 →
          </button>
        )}
      </div>
      <div className="tgs-grid">
        {counts.map((c, i) => (
          <div
            className={`tgs-item ${c.count === 0 ? 'is-zero' : ''}`}
            key={c.name}
            style={{ animationDelay: `${i * 22}ms` }}
            onMouseEnter={() => {
              const rs = rolesFor(c.name);
              onHoverRoles?.(rs.length ? rs : null);
            }}
            onMouseLeave={() => onHoverRoles?.(null)}
          >
            <span className="n">{c.name}</span>
            <span className={`c ${c.count === 0 ? 'zero' : ''}`}>
              <Count value={c.count} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
