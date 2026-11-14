import { useMemo } from 'react';
import { Pillar } from '../lib/bazi';
import { analyzeRelations } from '../lib/relations';

const clsFor = (t: string) =>
  /合|会/.test(t) ? 'rel-he' : t === '六冲' || t === '相冲' ? 'rel-chong' : t.includes('刑') ? 'rel-xing' : t.includes('害') || t.includes('破') ? 'rel-hai' : 'rel-other';

export default function RelationsPanel({
  pillars,
  onHoverRoles,
}: {
  pillars: Pillar[];
  onHoverRoles?: (roles: string[] | null) => void;
}) {
  const { gan, zhi } = useMemo(() => analyzeRelations(pillars), [pillars]);
  return (
    <div className="relations">
      <div className="rel-head">
        <h4>关系</h4>
        <span className="en">RELATIONS</span>
        <span className="ss-note">悬停定位到柱</span>
      </div>
      <div className="rel-row">
        <span className="rel-key">天干</span>
        <div className="rel-chips">
          {gan.length ? (
            gan.map((r, i) => (
              <span
                key={i}
                className={`rel-chip ${clsFor(r.type)}`}
                style={{ animationDelay: `${i * 22}ms` }}
                onMouseEnter={() => onHoverRoles?.(r.roles)}
                onMouseLeave={() => onHoverRoles?.(null)}
              >
                <b>{r.type}</b>
                {r.text}
              </span>
            ))
          ) : (
            <span className="rel-none">无合冲</span>
          )}
        </div>
      </div>
      <div className="rel-row">
        <span className="rel-key">地支</span>
        <div className="rel-chips">
          {zhi.length ? (
            zhi.map((r, i) => (
              <span
                key={i}
                className={`rel-chip ${clsFor(r.type)}`}
                style={{ animationDelay: `${i * 22}ms` }}
                onMouseEnter={() => onHoverRoles?.(r.roles)}
                onMouseLeave={() => onHoverRoles?.(null)}
              >
                <b>{r.type}</b>
                {r.text}
              </span>
            ))
          ) : (
            <span className="rel-none">无合冲刑害</span>
          )}
        </div>
      </div>
    </div>
  );
}
