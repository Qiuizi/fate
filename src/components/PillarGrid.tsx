import { Pillar } from '../lib/bazi';
import { ELEMENT_META, Element } from '../lib/elements';

interface Props {
  pillars: Pillar[];
  hoverEl?: Element | null;
  onHoverEl?: (el: Element | null) => void;
  selected?: number;
  onSelect?: (i: number) => void;
  detail?: 'simple' | 'pro';
  highlightRoles?: string[];
}

function GanZhiCell({
  char,
  el,
  yy,
  isDay,
  isSel,
  isHl,
  dim,
  hot,
  onEnter,
  onLeave,
  onClick,
}: {
  char: string;
  el: Element;
  yy: string;
  isDay: boolean;
  isSel: boolean;
  isHl: boolean;
  dim: boolean;
  hot: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const meta = ELEMENT_META[el];
  return (
    <div
      className={`pg-cell pg-gan ${isDay ? 'is-day' : ''} ${isSel ? 'is-sel' : ''} ${isHl ? 'is-hl' : ''}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span
        className={`glyph ${dim ? 'is-dim' : ''} ${hot ? 'is-hot' : ''}`}
        style={{ color: meta.color, textShadow: `0 0 16px ${meta.color}44` }}
      >
        {char}
        <span className="yy">{yy}</span>
      </span>
      <span className="el-tag" style={{ color: meta.color }}>
        {meta.en}
      </span>
    </div>
  );
}

export default function PillarGrid({ pillars, hoverEl = null, onHoverEl, selected = 2, onSelect, detail = 'pro', highlightRoles = [] }: Props) {
  const sel = (i: number) => ` ${selected === i ? 'is-sel' : ''}`;
  const isHl = (role: string) => (highlightRoles.includes(role.replace('柱', '')) ? ' is-hl' : '');
  return (
    <div className="pg">
      {/* 头部 */}
      <div className="pg-label pg-corner">
        <em>PILLAR</em>
      </div>
      {pillars.map((p, i) => {
        const isDay = p.role === '日柱';
        return (
          <div
            className={`pg-head ${isDay ? 'is-day' : ''}${sel(i)}${isHl(p.role)}`}
            key={'h' + p.role}
            onClick={() => onSelect?.(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(i)}
          >
            <span className="role-en">{p.roleEn}</span>
            <span className="role">{p.role}</span>
            <span className={`shi ${p.shiShen === '日主' ? 'hot' : ''}`}>{p.shiShen}</span>
          </div>
        );
      })}

      {/* 天干 */}
      <div className="pg-label">
        天干<em>STEM</em>
      </div>
      {pillars.map((p, i) => (
        <GanZhiCell
          key={'g' + p.role}
          char={p.gan}
          el={p.ganEl}
          yy={p.ganYinYang}
          isDay={p.role === '日柱'}
          isSel={selected === i}
          isHl={highlightRoles.includes(p.role.replace('柱', ''))}
          dim={!!hoverEl && hoverEl !== p.ganEl}
          hot={hoverEl === p.ganEl}
          onEnter={() => onHoverEl?.(p.ganEl)}
          onLeave={() => onHoverEl?.(null)}
          onClick={() => onSelect?.(i)}
        />
      ))}

      {/* 地支 */}
      <div className="pg-label">
        地支<em>BRANCH</em>
      </div>
      {pillars.map((p, i) => (
        <GanZhiCell
          key={'z' + p.role}
          char={p.zhi}
          el={p.zhiEl}
          yy={p.zhiYinYang}
          isDay={p.role === '日柱'}
          isSel={selected === i}
          isHl={highlightRoles.includes(p.role.replace('柱', ''))}
          dim={!!hoverEl && hoverEl !== p.zhiEl}
          hot={hoverEl === p.zhiEl}
          onEnter={() => onHoverEl?.(p.zhiEl)}
          onLeave={() => onHoverEl?.(null)}
          onClick={() => onSelect?.(i)}
        />
      ))}

      {/* 藏干 */}
      <div className="pg-label">
        藏干<em>HIDDEN</em>
      </div>
      {pillars.map((p, i) => (
        <div
          className={`pg-cell pg-hidden ${p.role === '日柱' ? 'is-day' : ''}${sel(i)}`}
          key={'hd' + p.role}
          onClick={() => onSelect?.(i)}
        >
          <div className="hidden-list">
            {p.hidden.map((h, k) => (
              <div
                className={`hidden-item ${hoverEl && hoverEl !== h.element ? 'is-dim' : ''} ${
                  hoverEl === h.element ? 'is-hot' : ''
                }`}
                key={k}
                onMouseEnter={() => onHoverEl?.(h.element)}
                onMouseLeave={() => onHoverEl?.(null)}
              >
                <b style={{ color: ELEMENT_META[h.element].color }}>{h.gan}</b>
                <span>{h.shiShen}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 纳音 */}
      <div className="pg-label">
        纳音<em>NAYIN</em>
      </div>
      {pillars.map((p, i) => (
        <div
          className={`pg-cell ${p.role === '日柱' ? 'is-day' : ''}${sel(i)}`}
          key={'n' + p.role}
          onClick={() => onSelect?.(i)}
        >
          <span className="pg-text small">{p.naYin}</span>
        </div>
      ))}

      {detail === 'pro' && (
        <>
          {/* 星运 */}
          <div className="pg-label">
            星运<em>STAGE</em>
          </div>
          {pillars.map((p, i) => (
            <div
              className={`pg-cell ${p.role === '日柱' ? 'is-day' : ''}${sel(i)}`}
              key={'x' + p.role}
              onClick={() => onSelect?.(i)}
            >
              <span className="pg-text">{p.xingYun}</span>
            </div>
          ))}

          {/* 自坐 */}
          <div className="pg-label">
            自坐<em>SELF</em>
          </div>
          {pillars.map((p, i) => (
            <div
              className={`pg-cell ${p.role === '日柱' ? 'is-day' : ''}${sel(i)}`}
              key={'s' + p.role}
              onClick={() => onSelect?.(i)}
            >
              <span className="pg-text small">{p.selfStage}</span>
            </div>
          ))}

          {/* 空亡 */}
          <div className="pg-label">
            空亡<em>VOID</em>
          </div>
          {pillars.map((p, i) => (
            <div
              className={`pg-cell ${p.role === '日柱' ? 'is-day' : ''}${sel(i)}`}
              key={'k' + p.role}
              onClick={() => onSelect?.(i)}
            >
              <span className="pg-text small">{p.isXunKong ? <b className="kong">空</b> : '—'}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
