import { lazy, Suspense, useEffect, useState } from 'react';
import { BaziInput, BaziResult, computeBazi, defaultInputFromNow, sanitizeInput } from './lib/bazi';
import Ornament from './components/Ornament';
import BrandMark from './components/BrandMark';
import Gear from './components/Gear';
import ChartForm from './components/ChartForm';
import ChartSheet from './components/ChartSheet';
import HistoryModal, { type HistoryItem } from './components/HistoryModal';

const CompatPage = lazy(() => import('./components/CompatPage'));

/** 页面载入时取本机当前时间，不预填固定生辰。地点等口径仍用通用默认值。 */
const DEFAULT_INPUT: BaziInput = defaultInputFromNow();

/** 支持通过 URL 参数深链分享命盘。示例见 README。 */
function readUrlInput(): { input: BaziInput; auto: boolean } {
  const q = new URLSearchParams(window.location.search);
  if (![...q.keys()].length) return { input: DEFAULT_INPUT, auto: false };
  const num = (k: string) => (q.has(k) ? q.get(k) : undefined);
  const input = sanitizeInput(
    {
      calendar: q.get('cal') === 'lunar' ? 'lunar' : 'solar',
      isLeapMonth: q.get('leap') === '1',
      year: num('y') as any,
      month: num('m') as any,
      day: num('d') as any,
      hour: num('h') as any,
      minute: num('mi') as any,
      gender: q.get('g') === 'female' ? 'female' : 'male',
      trueSolar: q.get('ts') === '1',
      useEot: q.get('eot') !== '0',
      longitude: (num('lng') ?? DEFAULT_INPUT.longitude) as any,
      cityName: q.get('city') || DEFAULT_INPUT.cityName,
      utcOffset: (num('tz') ?? DEFAULT_INPUT.utcOffset) as any,
      zishiSect: Number(q.get('sect') ?? 2) === 1 ? 1 : 2,
    },
    DEFAULT_INPUT
  );
  return { input, auto: q.has('y') };
}

/** 计算失败（损坏的历史/备份等）时返回 null，而不是让整页白屏 */
function tryCompute(input: BaziInput): BaziResult | null {
  try {
    return computeBazi(input, new Date().getFullYear());
  } catch (e) {
    console.warn('排盘失败', e);
    return null;
  }
}

const sameChart = (a: BaziInput, b: BaziInput) => JSON.stringify(a) === JSON.stringify(b);

interface AppProps {
  /** 在统一外壳中运行时隐藏自身的顶栏与页脚，保留全部排盘内容。 */
  embedded?: boolean;
}

export default function App({ embedded = false }: AppProps) {
  const [initial] = useState(readUrlInput);
  const [input, setInputState] = useState<BaziInput>(() => initial.input);
  const [result, setResult] = useState<BaziResult | null>(() => (initial.auto ? tryCompute(initial.input) : null));
  const [showResult, setShowResult] = useState(() => initial.auto && !!result);
  /** 每次换一张盘（新排盘 / 从历史打开）递增，用作结果页与合盘页的 key，避免沿用上一张盘的局部状态 */
  const [chartSeq, setChartSeq] = useState(0);
  const [compat, setCompat] = useState(false);
  const [compatB, setCompatB] = useState<BaziInput | null>(null);
  const [histOpen, setHistOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const s = localStorage.getItem('bazi-history');
      const arr = s ? JSON.parse(s) : [];
      if (Array.isArray(arr)) return arr.filter((x) => x && x.id && x.input);
    } catch {
      /* ignore */
    }
    return [];
  });
  const persistHistory = (next: HistoryItem[]) => {
    setHistory(next);
    try {
      localStorage.setItem('bazi-history', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const addHistory = (r: BaziResult) => {
    const chartInput = r.input;
    const item: HistoryItem = {
      id: Date.now().toString(36),
      kind: 'chart',
      label: `${r.solarText} · ${r.pillars.map((p) => p.ganZhi).join(' ')} · ${chartInput.gender === 'male' ? '男' : '女'}`,
      ts: Date.now(),
      input: chartInput,
    };
    // 只替换同一张单人盘；合盘记录的 input 也是本命盘，不能被顺手删掉
    setHistory((h) => {
      const filtered = h.filter((x) => x.kind === 'compat' || !sameChart(x.input, chartInput));
      const next = [item, ...filtered].slice(0, 40);
      try {
        localStorage.setItem('bazi-history', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const addCompatHistory = (bInput: BaziInput, bLabel: string, score: number) => {
    if (!result) return;
    const key = JSON.stringify([result.input, bInput]);
    const item: HistoryItem = {
      id: Date.now().toString(36) + 'c',
      kind: 'compat',
      label: `合盘 ${result.solarText.slice(0, 10)} × ${bLabel}`,
      ts: Date.now(),
      input: result.input,
      bInput,
      score,
    };
    setHistory((h) => {
      const filtered = h.filter((x) => JSON.stringify([x.input, x.bInput]) !== key);
      const next = [item, ...filtered].slice(0, 40);
      try {
        localStorage.setItem('bazi-history', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const [scene, setScene] = useState<'idle' | 'cover' | 'open'>('idle');

  useEffect(() => {
    const open = () => setHistOpen(true);
    window.addEventListener('atelier:open-bazi-history', open);
    return () => window.removeEventListener('atelier:open-bazi-history', open);
  }, []);

  const setInput = (patch: Partial<BaziInput>) =>
    setInputState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('bazi-input', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  // 过场动效：齿轮转动（天干地支刻于齿盘）
  const runScene = (action: () => void, _kind: 'forward' | 'back' = 'forward') => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      action();
      window.scrollTo(0, 0);
      return;
    }
    setScene('cover');
    window.setTimeout(() => {
      action();
      window.scrollTo(0, 0);
      setScene('open');
    }, 780);
    window.setTimeout(() => setScene('idle'), 1480);
  };

  const pickHistory = (it: HistoryItem) => {
    const picked = sanitizeInput(it.input, DEFAULT_INPUT);
    const r = tryCompute(picked);
    setHistOpen(false);
    if (!r) return;
    setInput(picked);
    setResult(r);
    setShowResult(true);
    setChartSeq((n) => n + 1);
    if (it.kind === 'compat' && it.bInput) {
      setCompatB(sanitizeInput(it.bInput, { ...DEFAULT_INPUT, gender: 'female' }));
      setCompat(true);
    } else {
      setCompat(false);
      setCompatB(null);
    }
  };

  const onSubmit = () =>
    runScene(() => {
      const r = tryCompute(input);
      if (!r) return;
      setResult(r);
      setShowResult(true);
      setChartSeq((n) => n + 1);
      addHistory(r);
    }, 'forward');

  return (
    <div className="app">
      <div className="bg-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      {scene !== 'idle' && (
        <div className={`gear-scene ${scene}`} aria-hidden="true">
          <div className="gear-stage">
            <Gear chars="甲乙丙丁戊己庚辛壬癸" size={420} duration={20} color="#c9a961" />
            <div className="gear-small">
              <Gear chars="子丑寅卯辰巳午未申酉戌亥" size={250} duration={13} reverse color="#ece7db" />
            </div>
            <div className="gear-center">
              命盘
              <span>CHART</span>
            </div>
          </div>
        </div>
      )}
      <div className="container">
        {!embedded && (
          <header className="topbar">
            <button className="brand" onClick={() => setShowResult(false)} style={{ textAlign: 'left' }}>
              <BrandMark size={40} />
              <span className="brand-word">
                <b>四柱</b>
                <span>BAZI · ATELIER</span>
              </span>
            </button>
            <button className="btn-ghost topbar-home" onClick={() => { window.location.href = './'; }}>← 首页</button>
            <button className="btn-ghost topbar-hist" onClick={() => setHistOpen(true)}>
              历史{history.length ? ` · ${history.length}` : ''}
            </button>
            <div className="topbar-note">
              <b>立春换年 · 节气换月</b>
              <br />
              真太阳时 · 子时换日 · 可核对口径
            </div>
          </header>
        )}

        {compat && result ? (
          <Suspense fallback={<div className="page-loading">加载合盘…</div>}>
            <CompatPage
              key={chartSeq}
              a={result}
              initialB={compatB}
              onSaveCompat={addCompatHistory}
              onBack={() =>
                runScene(() => {
                  setCompat(false);
                  setCompatB(null);
                }, 'back')
              }
            />
          </Suspense>
        ) : showResult && result ? (
          <ChartSheet
            key={chartSeq}
            result={result}
            onEdit={() => runScene(() => { setCompat(false); setShowResult(false); }, 'back')}
            onOpenCompat={() => runScene(() => setCompat(true), 'forward')}
          />
        ) : (
          <>
            <section className="hero">
              <span className="eyebrow center">THE FOUR PILLARS · 子平术</span>
              <h1 className="hero-title">
                <span className="cn">八字</span>
                <span className="thin">排盘</span>
              </h1>
              <p className="hero-sub">
                <b>准确为先，审美其后。</b>
                一张命盘，是一段时间的拓片——以立春为岁首、以节气分月令，四柱八字循天时而立；
                可选真太阳时与子时换日，只为让此刻更接近真实。
              </p>
            </section>

            <div className="form-wrap container-narrow">
              <ChartForm input={input} setInput={setInput} onSubmit={onSubmit} />
            </div>
          </>
        )}
      </div>

      {!embedded && (
        <footer className="footer">
          <div className="container footer-inner" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Ornament /> 四柱 · 八字排盘 ATELIER
            </span>
          </div>
        </footer>
      )}

      {histOpen && (
        <HistoryModal
          items={history}
          onPick={pickHistory}
          onDelete={(id) => persistHistory(history.filter((x) => x.id !== id))}
          onUpdate={(id, patch) =>
            setHistory((h) => {
              const next = h.map((x) => (x.id === id ? { ...x, ...patch } : x));
              try {
                localStorage.setItem('bazi-history', JSON.stringify(next));
              } catch {
                /* ignore */
              }
              return next;
            })
          }
          onReplace={(next) => persistHistory(next)}
          onClose={() => setHistOpen(false)}
        />
      )}
    </div>
  );
}
