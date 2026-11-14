import { BaziResult } from '../lib/bazi';
import { assessStrength, assessPattern, favorable } from '../lib/structure';
import { tiaohouOf } from '../lib/classics';

export default function StructurePanel({ result }: { result: BaziResult }) {
  const s = assessStrength(result);
  const p = assessPattern(result);
  const fav = favorable(result);
  const th = tiaohouOf(result.dayMaster.gan, result.pillars[1].zhi);
  const tagOf = (label: string) => (label === '偏弱' ? '弱' : label === '偏旺' ? '旺' : '中');

  return (
    <div className="structure">
      <div className="rel-head">
        <h4>旺衰 · 格局</h4>
        <span className="en">STRUCTURE</span>
        <span className="ss-note">参考 · 子平思路 · 非确定结论</span>
      </div>
      <div className="st-grid">
        <div className="st-card">
          <div className="st-title">
            旺衰参考
            <b className={`st-strong ${tagOf(s.label)}`}>{s.label}</b>
          </div>
          <div className="st-score">
            {s.score}
            <span>/100</span>
          </div>
          <div className="st-bar">
            <span style={{ width: `${s.score}%` }} />
          </div>
          <div className="st-parts">
            {s.parts.map((part) => (
              <div className="st-part" key={part.name}>
                <span>{part.name}</span>
                <em>{part.note}</em>
              </div>
            ))}
          </div>
        </div>
        <div className="st-card">
          <div className="st-title">
            格局
            <b className="st-name">{p.name}</b>
            <span className={`st-tag ${p.category.includes('善') ? 'good' : p.category.includes('凶') ? 'warn' : 'mid'}`}>
              {p.category}
            </span>
          </div>
          <div className="st-basis">{p.basis}</div>
          <div className="st-guide">{p.guide}</div>
          <div className="st-sub">
            调候用神（穷通宝鉴·参考）：<b>{th || '—'}</b>　喜用（近似）：{fav.join('、')}
          </div>
        </div>
      </div>
      <p className="st-note">旺衰/格局为参考评分（月令本气取格·简法）；流派与版本不同会有差异，仅供参看、非确定结论。</p>
    </div>
  );
}
