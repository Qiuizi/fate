import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BaziResult } from '../lib/bazi';
import { ELEMENT_META, Element, ELEMENTS } from '../lib/elements';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { buildChartHTML, buildChartMarkdown, chartFilename, downloadFile } from '../lib/exporters';
import { buildClassicBookVerticalHTML } from '../lib/classicsReport';
import { printHTML } from '../lib/print';
import PillarGrid from './PillarGrid';
import PillarDetail from './PillarDetail';
import RelationsPanel from './RelationsPanel';
import ShenShaPanel from './ShenShaPanel';
import ClassicPanel from './ClassicPanel';
import StructurePanel from './StructurePanel';
import { XiaoYunPanel, TenGodStats } from './ExtrasPanels';
import ElementRing from './ElementRing';
import LuckTimeline from './LuckTimeline';
import Mystic from './Mystic';

interface Props {
  result: BaziResult;
  onEdit: () => void;
  onOpenCompat?: () => void;
}

const fmtTime = (s: string) => (s ? s.slice(5, 16) : '');
const pad = (x: number) => String(x).padStart(2, '0');

export default function ChartSheet({ result, onEdit, onOpenCompat }: Props) {
  const [mode, setMode] = useState<'visible' | 'weighted'>('weighted');
  const [hoverEl, setHoverEl] = useState<Element | null>(null);
  const [toast, setToast] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [selPillar, setSelPillar] = useState(2);
  const [detail, setDetail] = useState<'simple' | 'pro'>('pro');
  const [hoverRoles, setHoverRoles] = useState<string[]>([]);
  const hoverRolesCb = (roles: string[] | null) => setHoverRoles(roles ?? []);
  const [activeSec, setActiveSec] = useState('sec-pillars');
  const [showCase, setShowCase] = useState(false);
  const [showMode, setShowMode] = useState<'chart' | 'book'>('chart');
  const [classicOpen, setClassicOpen] = useState<string | null>(null);
  const openClassic = (key: string | null) => {
    // 断语章节只在「专业」视图渲染；从普通视图点日主等入口时先切过去
    if (key) setDetail('pro');
    setClassicOpen(key);
    if (key) window.setTimeout(() => document.getElementById('sec-classics')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const navRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indRef = useRef<HTMLSpanElement | null>(null);
  const progRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useScrollReveal<HTMLDivElement>();
  const toastTimer = useRef<number | undefined>(undefined);
  // 连续触发提示时，旧的定时器不能把新提示提前清掉
  const flash = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const dm = result.dayMaster;
  const dmColor = ELEMENT_META[dm.element].color;
  const genderLabel = result.input.gender === 'male' ? '乾造 · 男' : '坤造 · 女';

  const copyLink = async () => {
    const inp = result.input;
    const p = new URLSearchParams();
    p.set('y', String(inp.year));
    p.set('m', String(inp.month));
    p.set('d', String(inp.day));
    p.set('h', String(inp.hour));
    p.set('mi', String(inp.minute));
    p.set('g', inp.gender);
    if (inp.calendar === 'lunar') {
      p.set('cal', 'lunar');
      if (inp.isLeapMonth) p.set('leap', '1');
    }
    if (inp.trueSolar) {
      p.set('ts', '1');
      p.set('lng', String(inp.longitude));
      if (inp.cityName) p.set('city', inp.cityName);
      p.set('tz', String(inp.utcOffset));
    }
    if (inp.zishiSect === 1) p.set('sect', '1');
    const url = `${location.origin}${location.pathname}?${p.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      flash('命盘链接已复制到剪贴板');
    } catch {
      flash('复制失败，可手动复制地址栏链接');
    }
  };

  const doExport = (fmt: 'html' | 'md') => {
    const content = fmt === 'html' ? buildChartHTML(result) : buildChartMarkdown(result);
    const mime = fmt === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8';
    downloadFile(chartFilename(result, fmt === 'html' ? 'html' : 'md'), content, mime);
    setExportOpen(false);
    flash(fmt === 'html' ? '已导出 HTML 命盘（炫酷单文件）' : '已导出 Markdown（AI 友好结构化）');
  };

  const navItems =
    detail === 'pro'
      ? [
          { id: 'sec-pillars', label: '四柱' },
          { id: 'sec-luck', label: '大运' },
          { id: 'sec-classics', label: '断语' },
          { id: 'sec-params', label: '参数' },
          { id: 'sec-receipt', label: '口径' },
        ]
      : [
          { id: 'sec-pillars', label: '四柱' },
          { id: 'sec-luck', label: '大运' },
        ];

  const showcaseHtml = useMemo(() => (showCase ? buildChartHTML(result) : ''), [showCase, result]);
  const bookHtml = useMemo(
    () => (showCase && showMode === 'book' ? buildClassicBookVerticalHTML(result) : ''),
    [showCase, showMode, result]
  );

  useEffect(() => {
    if (!showCase) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCase(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCase]);

  useEffect(() => {
    const ids = (detail === 'pro'
      ? ['sec-pillars', 'sec-luck', 'sec-classics', 'sec-params', 'sec-receipt']
      : ['sec-pillars', 'sec-luck']) as string[];
    const els = ids.map((id) => document.getElementById(id)).filter((x): x is HTMLElement => !!x);
    if (!('IntersectionObserver' in window) || !els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSec((e.target as HTMLElement).id);
        });
      },
      { rootMargin: '-72px 0px -62% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [detail]);

  // 切到「普通」后，断语/参数/口径章节被隐藏，活动章节回到四柱，否则指示条停在旧位置
  useEffect(() => {
    if (!navItems.some((i) => i.id === activeSec)) setActiveSec('sec-pillars');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  // 章节导航滑动指示条
  useEffect(() => {
    const place = () => {
      const nav = navRef.current;
      const idx = navItems.findIndex((i) => i.id === activeSec);
      const btn = btnRefs.current[idx];
      if (nav && btn && indRef.current) {
        const nr = nav.getBoundingClientRect();
        const br = btn.getBoundingClientRect();
        indRef.current.style.transform = `translateX(${br.left - nr.left}px)`;
        indRef.current.style.width = `${br.width}px`;
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeSec, detail]);

  // 顶部滚动进度
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(1, el.scrollTop / max) : 0;
      if (progRef.current) progRef.current.style.transform = `scaleX(${p})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="result" ref={rootRef}>
      <div className="scroll-progress" ref={progRef} />
      <div className="result-aura" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="result-bar">
        <div className="result-left">
          <button className="btn-ghost" onClick={onEdit}>
            ← 重新排盘
          </button>
          <div className="seg detail-seg">
            <button className={detail === 'simple' ? 'on' : ''} onClick={() => setDetail('simple')}>
              普通
            </button>
            <button className={detail === 'pro' ? 'on' : ''} onClick={() => setDetail('pro')}>
              专业
            </button>
          </div>
        </div>
        <div className="result-actions">
          <div className="result-crumb">
            <span>命盘 · CHART</span>
            <span style={{ color: 'var(--line-2)' }}>·</span>
            <span>{result.input.calendar === 'solar' ? '公历' : '农历'}录入</span>
          </div>
          <button className="btn-ghost compat-btn" onClick={() => onOpenCompat?.()}>
            ⇄ 合盘
          </button>
          <button className="btn-ghost showcase-btn" onClick={() => setShowCase(true)}>
            ✦ 展演
          </button>
          <button className="btn-ghost share-btn" onClick={copyLink}>
            分享 · 复制链接
          </button>
          <button
            className="btn-ghost sharecard-btn"
            onClick={async () => {
              try {
                const { exportShareCard } = await import('../lib/shareCard');
                await exportShareCard(result);
              } catch (e) {
                console.warn('卡片图生成失败', e);
                flash('卡片图生成失败，请稍后重试');
              }
            }}
          >
            卡片图
          </button>
          <div className="export-menu">
            <button className="btn-ghost export-btn" onClick={() => setExportOpen((v) => !v)}>
              导出 ⤓
            </button>
            {exportOpen && (
              <div className="export-pop">
                <button onClick={() => doExport('html')}>
                  <b>HTML</b>
                  <small>炫酷单文件 · 可离线分享</small>
                </button>
                <button onClick={() => doExport('md')}>
                  <b>Markdown</b>
                  <small>结构化 · 便于 AI 分析</small>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="sec-nav" ref={navRef}>
        <span className="sec-ind" ref={indRef} />
        {navItems.map((it, i) => (
          <button
            key={it.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            className={activeSec === it.id ? 'on' : ''}
            onClick={() => document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {it.label}
          </button>
        ))}
      </nav>

      {/* 身份头 */}
      <section className="id-head reveal">
        <div className="id-left">
          <div className="who">
            {genderLabel}
            {result.input.name ? ` · ${result.input.name}` : ''}
          </div>
          <div className="dm-line">
            <span className="dm-char clickable" style={{ color: dmColor, textShadow: `0 0 44px ${dmColor}55` }} onClick={() => openClassic('xingqing')} title="查看日主断语">
              {dm.gan}
              <small>
                {dm.yinYang}
                {dm.element}
              </small>
            </span>
            <span className="dm-say">
              日主 · 生于<Mystic text={result.pillars[1].zhi} />月（{result.jieQi.monthJie}后）
            </span>
          </div>
          <div className="id-meta">
            <span>
              <i>公历</i>
              {result.solarText}
            </span>
            <span>
              <i>农历</i>
              {result.lunarText.replace('农历 ', '')}
            </span>
            <span>
              <i>生肖</i>
              {result.zodiac}
            </span>
            <span>
              <i>星座</i>
              {result.constellation}
            </span>
            <span>
              <i>日空</i>
              <Mystic text={result.dayXunKong} />
            </span>
          </div>
        </div>
        <div className="id-right">
          <div className="bazi-banner">
            {result.pillars.map((p, i) => (
              <div className="bazi-col" key={p.role}>
                <span className="bazi-role">{['年', '月', '日', '时'][i]}</span>
                <span className="bazi-gz">
                  <b style={{ color: ELEMENT_META[p.ganEl].color, textShadow: `0 0 18px ${ELEMENT_META[p.ganEl].color}55` }}>
                    {p.gan}
                  </b>
                  <b style={{ color: ELEMENT_META[p.zhiEl].color, textShadow: `0 0 18px ${ELEMENT_META[p.zhiEl].color}55` }}>
                    {p.zhi}
                  </b>
                </span>
              </div>
            ))}
          </div>
          <div className="id-right-meta">
            月令 {result.pillars[1].zhi}
            {result.pillars[1].zhiEl} · 起运 {result.yun.startText} · {result.yun.direction}
          </div>
        </div>
      </section>

      {/* 四柱 + 五行 */}
      <div className="chart-layout reveal" id="sec-pillars">
        <div>
          <div className="panel-title">
            <span className="sec-no">壹</span>
            <h3>四柱</h3>
            <span className="en">FOUR PILLARS · BAZI</span>
            {detail === 'pro' && <span className="pg-hint">点选柱位 · 查看该柱详情</span>}
          </div>
          <PillarGrid
            pillars={result.pillars}
            hoverEl={hoverEl}
            onHoverEl={setHoverEl}
            selected={selPillar}
            onSelect={setSelPillar}
            detail={detail}
            highlightRoles={hoverRoles}
          />
        </div>

        <div className="side-col">
          <div className="panel-title" style={{ marginBottom: 0 }}>
            <span className="sec-no">贰</span>
            <h3>五行</h3>
            <span className="en">FIVE ELEMENTS</span>
            <div className="mini-seg" style={{ marginLeft: 'auto' }}>
              <button className={mode === 'weighted' ? 'on' : ''} onClick={() => setMode('weighted')}>
                含藏干
              </button>
              <button className={mode === 'visible' ? 'on' : ''} onClick={() => setMode('visible')}>
                明字
              </button>
            </div>
          </div>
          <ElementRing
            values={mode === 'weighted' ? result.weighted : result.visibleCount}
            mode={mode}
            dayMaster={dm}
            hoverEl={hoverEl}
            onHoverEl={setHoverEl}
          />
          <p className="ring-note">
            {(() => {
              const present = ELEMENTS.filter((e) => result.visibleCount[e] > 0);
              const missing = ELEMENTS.filter((e) => result.visibleCount[e] === 0);
              return missing.length
                ? `明字五行：${present.join('、')} · 缺 ${missing.join('、')}`
                : '明字五行：木火土金水俱全';
            })()}
          </p>
        </div>
      </div>

      {detail === 'pro' && (
        <>
          <PillarDetail pillar={result.pillars[selPillar]} index={selPillar} onHoverEl={setHoverEl} onOpenClassic={openClassic} />
          <ShenShaPanel pillars={result.pillars} onHoverRoles={hoverRolesCb} onOpenClassic={openClassic} />
          <RelationsPanel pillars={result.pillars} onHoverRoles={hoverRolesCb} />
          <StructurePanel result={result} />
          <div id="sec-classics">
            <ClassicPanel result={result} openKey={classicOpen} onOpen={openClassic} />
          </div>
        </>
      )}

      {/* 大运流年 */}
      <section className="luck-section reveal" id="sec-luck">
        <div className="panel-title">
          <span className="sec-no">叁</span>
          <h3>大运{detail === 'pro' ? ' · 流年' : ''}</h3>
          <span className="en">{detail === 'pro' ? 'LUCK PILLARS' : 'LUCK PILLARS'}</span>
        </div>
        <LuckTimeline luck={result.luck} currentYear={result.currentYear} result={result} compact={detail !== 'pro'} />
      </section>

      {/* 流月 · 小运 · 十神 */}
      {detail === 'pro' && (
        <section className="extra-section reveal" id="sec-extra">
          <div className="panel-title">
            <span className="sec-no">肆</span>
            <h3>小运 · 十神</h3>
            <span className="en">MINOR LUCK · TEN GODS</span>
          </div>
          <div className="extra-two">
            <XiaoYunPanel result={result} />
            <TenGodStats result={result} onHoverRoles={hoverRolesCb} onOpenClassic={openClassic} />
          </div>
        </section>
      )}

      {/* 补充信息 */}
      <section className="info-section reveal" id="sec-params" style={{ display: detail === 'pro' ? undefined : 'none' }}>
        <div className="panel-title" style={{ marginBottom: 20 }}>
          <span className="sec-no">伍</span>
          <h3>命盘参数</h3>
          <span className="en">CHART PARAMETERS</span>
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="k">
              胎元 <em>TAIYUAN</em>
            </div>
            <div className="v">
              <Mystic text={result.taiYuan} />
            </div>
          </div>
          <div className="stat">
            <div className="k">
              命宫 <em>MINGGONG</em>
            </div>
            <div className="v">
              <Mystic text={result.mingGong} />
            </div>
          </div>
          <div className="stat">
            <div className="k">
              身宫 <em>SHENGONG</em>
            </div>
            <div className="v">
              <Mystic text={result.shenGong} />
            </div>
          </div>
          <div className="stat">
            <div className="k">
              胎息 <em>TAIXI</em>
            </div>
            <div className="v">
              <Mystic text={result.taiXi} />
            </div>
          </div>
        </div>
      </section>

      {/* 计算口径 */}
      <section className="receipt-section reveal" id="sec-receipt" style={{ display: detail === 'pro' ? undefined : 'none' }}>
        <div className="receipt">
          <div className="receipt-head">
            <span className="sec-no">陆</span>
            <h4>计算口径</h4>
            <span className="en">CALCULATION RECEIPT</span>
          </div>
          <div className="receipt-grid">
            <div className="receipt-item">
              <div className="k">换年依据</div>
              <div className="v">立春（非正月初一）</div>
            </div>
            <div className="receipt-item">
              <div className="k">换月依据</div>
              <div className="v">十二节令（非农历月序）</div>
            </div>
            <div className="receipt-item">
              <div className="k">日柱</div>
              <div className="v">连续干支纪日</div>
            </div>
            <div className="receipt-item">
              <div className="k">真太阳时</div>
              <div className="v">
                {result.tst.applied ? (
                  <>
                    <b>已启用</b>
                    {result.input.cityName ? ` · ${result.input.cityName}` : ''} · 校正 {result.tst.deltaMinutes.toFixed(1)} 分
                    {result.input.useEot ? ' · 含均时差' : ' · 未含均时差'}
                  </>
                ) : (
                  '未启用（按北京时间·平太阳时）'
                )}
              </div>
            </div>
            <div className="receipt-item">
              <div className="k">子时换日</div>
              <div className="v">{result.input.zishiSect === 1 ? '23:00 换日（晚子归次日）' : '00:00 换日（晚子算当日）'}</div>
            </div>
            <div className="receipt-item">
              <div className="k">有效时刻</div>
              <div className="v">
                {result.effective.y}-{pad(result.effective.m)}-{pad(result.effective.d)} {pad(result.effective.hh)}:
                {pad(result.effective.mm)}
              </div>
            </div>
            <div className="receipt-item">
              <div className="k">节气区间</div>
              <div className="v">
                {result.jieQi.prev} {fmtTime(result.jieQi.prevTime)} → {result.jieQi.next} {fmtTime(result.jieQi.nextTime)}
              </div>
            </div>
            <div className="receipt-item">
              <div className="k">计算引擎</div>
              <div className="v">lunar-javascript 1.7.8 · 天文节气数据</div>
            </div>
          </div>
        </div>
      </section>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {showCase &&
        createPortal(
          <div className="showcase" role="dialog" aria-modal="true" aria-label="命盘展演">
            <div className="showcase-tabs">
              <button className={showMode === 'chart' ? 'on' : ''} onClick={() => setShowMode('chart')}>
                命盘展演
              </button>
              <button className={showMode === 'book' ? 'on' : ''} onClick={() => setShowMode('book')}>
                竖排命书
              </button>
              <button
                className="showcase-print"
                onClick={() => printHTML(showMode === 'book' ? bookHtml : showcaseHtml, showMode === 'book' ? '命书·竖排线装' : '命盘展演')}
              >
                打印 / 另存PDF
              </button>
            </div>
            <button className="showcase-close" onClick={() => setShowCase(false)}>
              ✕ 关闭
            </button>
            <iframe title="展演" srcDoc={showMode === 'book' ? bookHtml : showcaseHtml} />
          </div>,
          document.body
        )}

    </div>
  );
}
