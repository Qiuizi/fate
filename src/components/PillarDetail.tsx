import { Pillar } from '../lib/bazi';
import { ELEMENT_META, Element } from '../lib/elements';

interface Props {
  pillar: Pillar;
  index: number;
  onHoverEl?: (el: Element | null) => void;
  onOpenClassic?: (key: string) => void;
}

export default function PillarDetail({ pillar: p, index, onHoverEl, onOpenClassic }: Props) {
  return (
    <div className="pillar-detail" key={index}>
      <div className="pd-head">
        <span className="pd-role">{p.role}</span>
        <span className="pd-en">{p.roleEn}</span>
        <span className="pd-gz">
          <b style={{ color: ELEMENT_META[p.ganEl].color }}>{p.gan}</b>
          <b style={{ color: ELEMENT_META[p.zhiEl].color }}>{p.zhi}</b>
        </span>
        {onOpenClassic && (
          <button className="ref-link" onClick={() => onOpenClassic('rizhu')}>
            日柱断语 →
          </button>
        )}
        <span className="pd-say">
          {p.shiShen === '日主' ? '日主 · 命主自己' : `天干十神 · ${p.shiShen}`}
        </span>
      </div>
      <div className="pd-grid">
        <div className="pd-cell">
          <span className="k">天干</span>
          <div className="v">
            <b style={{ color: ELEMENT_META[p.ganEl].color, fontSize: 26 }}>{p.gan}</b>
            <span className="sub">
              {p.ganYinYang}
              {p.ganEl} · {p.shiShen}
            </span>
          </div>
        </div>
        <div className="pd-cell">
          <span className="k">地支</span>
          <div className="v">
            <b style={{ color: ELEMENT_META[p.zhiEl].color, fontSize: 26 }}>{p.zhi}</b>
            <span className="sub">
              {p.zhiYinYang}
              {p.zhiEl}
            </span>
          </div>
        </div>
        <div className="pd-cell wide">
          <span className="k">藏干 · 十神</span>
          <div className="v hidden-inline">
            {p.hidden.map((h, i) => (
              <span
                key={i}
                className="hi"
                onMouseEnter={() => onHoverEl?.(h.element)}
                onMouseLeave={() => onHoverEl?.(null)}
              >
                <b style={{ color: ELEMENT_META[h.element].color }}>{h.gan}</b>
                <span>{h.shiShen}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="pd-cell">
          <span className="k">纳音</span>
          <div className="v small">{p.naYin}</div>
        </div>
        <div className="pd-cell">
          <span className="k">星运</span>
          <div className="v small">{p.xingYun}</div>
        </div>
        <div className="pd-cell">
          <span className="k">自坐</span>
          <div className="v small">{p.selfStage}</div>
        </div>
        <div className="pd-cell">
          <span className="k">空亡</span>
          <div className="v small">{p.isXunKong ? <b style={{ color: 'var(--seal)' }}>空</b> : '—'}</div>
        </div>
      </div>
    </div>
  );
}
