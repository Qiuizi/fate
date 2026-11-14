import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ELEMENT_META, ELEMENTS, Element } from '../lib/elements';

interface Props {
  values: Record<Element, number>;
  mode: 'visible' | 'weighted';
  dayMaster: { gan: string; element: Element; yinYang: string };
  hoverEl?: Element | null;
  onHoverEl?: (el: Element | null) => void;
}

const CX = 200;
const CY = 200;
const R = 106;
const T = 22;
const GAP = 4;
const AUTO_SPEED = 0.005; // 度/毫秒 ≈ 5°/s（约 72 秒一圈）

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}
function arcPath(a0: number, a1: number, r: number) {
  const p0 = polar(r, a0);
  const p1 = polar(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/** 外圈刻度：十二个圆点（对应十二地支方位），以点代线，减少细线感 */
const TICKS = Array.from({ length: 12 }, (_, k) => {
  const p = polar(134, k * 30);
  return { x: p.x, y: p.y, major: k % 3 === 0 };
});

export default function ElementRing({ values, mode, dayMaster, hoverEl = null, onHoverEl }: Props) {
  const [angle, setAngle] = useState(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef({ active: false, startAngle: 0, startRot: 0, lastAng: 0, lastT: 0, vel: 0 });
  const raf = useRef<number | null>(null);

  const stopInertia = () => {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  };
  useEffect(() => () => stopInertia(), []);

  // 自动旋转循环（仅在拖拽 / 惯性期间暂停，其余时间持续自转）
  useEffect(() => {
    let last = performance.now();
    let acc = 0;
    let id = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (!drag.current.active && raf.current == null) {
        acc += dt;
        if (acc >= 24) {
          setAngle((a) => a + AUTO_SPEED * acc);
          acc = 0;
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const angleAt = (x: number, y: number) => {
    const el = svgRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
  };

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    stopInertia();
    try {
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const a = angleAt(e.clientX, e.clientY);
    drag.current = { active: true, startAngle: a, startRot: angle, lastAng: a, lastT: performance.now(), vel: 0 };
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current.active) return;
    const a = angleAt(e.clientX, e.clientY);
    const now = performance.now();
    const dt = Math.max(1, now - drag.current.lastT);
    let step = a - drag.current.lastAng;
    while (step > 180) step -= 360;
    while (step < -180) step += 360;
    drag.current.vel = step / dt; // deg per ms
    drag.current.lastAng = a;
    drag.current.lastT = now;
    let da = a - drag.current.startAngle;
    while (da > 180) da -= 360;
    while (da < -180) da += 360;
    setAngle(drag.current.startRot + da);
  };
  const onUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    let v = drag.current.vel * 16; // deg per ~frame
    if (Math.abs(v) < 0.2) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      v *= Math.pow(0.9, dt / 16);
      setAngle((a) => a + v * (dt / 16));
      if (Math.abs(v) > 0.05) raf.current = requestAnimationFrame(tick);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(tick);
  };

  const total = ELEMENTS.reduce((s, e) => s + values[e], 0) || 1;
  const dmColor = ELEMENT_META[dayMaster.element].color;

  let acc = 0;
  const segs = ELEMENTS.map((el) => {
    const v = values[el];
    const sweep = (v / total) * 360;
    const a0 = acc;
    const a1 = acc + sweep;
    acc = a1;
    return { el, v, pct: Math.round((v / total) * 100), sweep, a0, a1, mid: a0 + sweep / 2 };
  });

  const centerChar = hoverEl ?? dayMaster.gan;
  const centerColor = hoverEl ? ELEMENT_META[hoverEl].color : dmColor;
  const centerCap = hoverEl ? 'FIVE ELEMENTS' : 'DAY MASTER';
  const centerSub = hoverEl
    ? `${mode === 'weighted' ? values[hoverEl].toFixed(1) : values[hoverEl]} · ${Math.round((values[hoverEl] / total) * 100)}%`
    : `${dayMaster.yinYang}${dayMaster.element}`;

  return (
    <div className="ring-card">
      <div className="ring-wrap">
        <svg
          ref={svgRef}
          className="ring-svg"
          viewBox="0 0 400 400"
          role="img"
          aria-label="五行占比环（可拖拽旋转）"
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setAngle((a) => a - 12);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setAngle((a) => a + 12);
            }
          }}
        >
          {/* 轨道底 */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--paper-2)" strokeWidth={T} />

          {/* 旋转刻度外圈（环境动效；拖拽时叠加在轮盘上） */}
          <g className="bezel-spin">
            {TICKS.map((t, k) => (
              <circle key={k} cx={t.x} cy={t.y} r={t.major ? 2.2 : 1.6} fill="var(--muted-2)" opacity={t.major ? 0.7 : 0.4} />
            ))}
            <circle className="orbit-dot" cx={CX} cy={CY - 136} r={2.6} fill="var(--gold)" />
          </g>

          {/* 轮盘：弧段（随拖拽旋转） */}
          <g transform={`rotate(${angle} ${CX} ${CY})`}>
            {segs.map((s) => {
              const meta = ELEMENT_META[s.el];
              const dim = !!hoverEl && hoverEl !== s.el;
              const start = s.a0 + GAP / 2;
              const end = s.a1 - GAP / 2;
              const showArc = s.sweep - GAP > 1;
              if (!showArc) return null;
              return (
                <path
                  key={s.el}
                  className={`ring-slice ${dim ? 'is-dim' : ''}`}
                  d={arcPath(start, end, R)}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={T}
                  strokeLinecap="round"
                  onMouseEnter={() => onHoverEl?.(s.el)}
                  onMouseLeave={() => onHoverEl?.(null)}
                />
              );
            })}
          </g>

          {/* 标签（随轮盘方位移动，但保持正向） */}
          {segs.map((s) => {
            const meta = ELEMENT_META[s.el];
            const dim = !!hoverEl && hoverEl !== s.el;
            const lp = polar(156, s.mid + angle);
            return (
              <text
                key={'l' + s.el}
                x={lp.x}
                y={lp.y}
                textAnchor="middle"
                className={`ring-label ${dim ? 'is-dim' : ''}`}
                onMouseEnter={() => onHoverEl?.(s.el)}
                onMouseLeave={() => onHoverEl?.(null)}
                style={{ cursor: 'pointer' }}
              >
                <tspan x={lp.x} dy="-1" className="ring-label-char" fill={meta.color}>
                  {s.el}
                </tspan>
                <tspan x={lp.x} dy="15" className="ring-label-num">
                  {mode === 'weighted' ? s.v.toFixed(1) : s.v} · {s.pct}%
                </tspan>
              </text>
            );
          })}

          {/* 中心徽记（不旋转） */}
          <circle cx={CX} cy={CY} r={80} fill="var(--ring-core, #ffffff)" className="ring-core" />
          <text x={CX} y={CY - 30} textAnchor="middle" className="ring-center-cap">
            {centerCap}
          </text>
          <text x={CX} y={CY + 22} textAnchor="middle" className="ring-center-char" fill={centerColor}>
            {centerChar}
          </text>
          <text x={CX} y={CY + 48} textAnchor="middle" className="ring-label-num" fill="var(--muted)">
            {centerSub}
          </text>
        </svg>
        <div className="ring-hint">自动旋转 · 可拖拽拨动</div>
      </div>

      <div className="ring-legend">
        {ELEMENTS.map((el) => (
          <div
            className={`lg ${hoverEl === el ? 'is-hot' : ''}`}
            key={el}
            onMouseEnter={() => onHoverEl?.(el)}
            onMouseLeave={() => onHoverEl?.(null)}
          >
            <span className="dot" style={{ background: ELEMENT_META[el].color }} />
            <b>{el}</b>
            <span>
              {mode === 'weighted' ? values[el].toFixed(1) : values[el]} · {Math.round((values[el] / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
