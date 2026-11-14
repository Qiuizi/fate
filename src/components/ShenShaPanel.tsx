import { useMemo } from 'react';
import { Pillar } from '../lib/bazi';
import { computeShenSha } from '../lib/shensha';

export default function ShenShaPanel({
  pillars,
  onHoverRoles,
  onOpenClassic,
}: {
  pillars: Pillar[];
  onHoverRoles?: (roles: string[] | null) => void;
  onOpenClassic?: (key: string) => void;
}) {
  const { list } = useMemo(() => computeShenSha(pillars), [pillars]);
  return (
    <div className="shensha">
      <div className="rel-head">
        <h4>神煞</h4>
        <span className="en">SHENSHA</span>
        <span className="ss-note">通行子平取法 · 悬停定位</span>
        {onOpenClassic && (
          <button className="ref-link" onClick={() => onOpenClassic('shensha')}>
            断语 →
          </button>
        )}
      </div>
      {list.length ? (
        <div className="ss-chips">
          {list.map((s, i) => (
            <span
              className="ss-chip"
              key={s.name}
              style={{ animationDelay: `${i * 26}ms` }}
              onMouseEnter={() => onHoverRoles?.(s.roles)}
              onMouseLeave={() => onHoverRoles?.(null)}
            >
              <b>{s.name}</b>
              <i>{s.roles.join('·')}</i>
            </span>
          ))}
        </div>
      ) : (
        <div className="rel-none">未见常见神煞</div>
      )}
    </div>
  );
}
