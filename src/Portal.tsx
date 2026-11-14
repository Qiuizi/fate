import { ELEMENT_META, ELEMENTS } from './lib/elements';

interface Props {
  onBazi: () => void;
  onZiwei: () => void;
  onYijing: () => void;
}

/** 合并首页：同一个应用内的八字 / 紫微 / 易经入口 */
export default function Portal({ onBazi, onZiwei, onYijing }: Props) {
  return (
    <div className="app portal-home">
      <div className="container">
        <section className="hero portal-hero">
          <span className="eyebrow center">CHINESE ASTROLOGY · ATELIER</span>
          <h1 className="hero-title">
            <span className="cn">命理</span>
            <span className="thin">排盘</span>
          </h1>
          <p className="hero-sub">
            <b>八字 · 紫微 · 易经。</b>
            以确定性内核排盘，以结构化的方式阅读。
          </p>
        </section>

        <div className="portal-grid">
          <button className="portal-card is-feature" onClick={onBazi}>
            <span className="portal-glyph" aria-hidden="true">八</span>
            <span className="portal-kicker">FOUR PILLARS · BAZI</span>
            <span className="portal-title">八字排盘</span>
            <span className="portal-desc">四柱 · 十神藏干 · 五行旺衰 · 神煞关系 · 大运流年</span>
            <span className="portal-els" aria-hidden="true">
              {ELEMENTS.map((el) => (
                <i key={el} style={{ background: ELEMENT_META[el].color }} />
              ))}
            </span>
            <span className="portal-go">进入排盘 <em>→</em></span>
          </button>

          <button className="portal-card" onClick={onZiwei}>
            <span className="portal-glyph" aria-hidden="true">紫</span>
            <span className="portal-kicker">PURPLE STAR ASTROLOGY</span>
            <span className="portal-title">紫微斗数</span>
            <span className="portal-desc">十二宫 · 星曜亮度 · 四化 · 大限流年 · 深度解盘</span>
            <span className="portal-go">进入排盘 <em>→</em></span>
          </button>

          <button className="portal-card" onClick={onYijing}>
            <span className="portal-glyph" aria-hidden="true">易</span>
            <span className="portal-kicker">I CHING · 周易</span>
            <span className="portal-title">易经六爻</span>
            <span className="portal-desc">铜钱起卦 · 卦爻辞 · 启蒙取辞 · 六爻纳甲</span>
            <span className="portal-go">进入起卦 <em>→</em></span>
          </button>
        </div>
      </div>
    </div>
  );
}
