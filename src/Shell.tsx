import { lazy, Suspense, useEffect, useState } from 'react';
import App from './App';
import Portal from './Portal';
import BrandMark from './components/BrandMark';

const YijingApp = lazy(() => import('./yijing/App').then((m) => ({ default: m.YijingApp })));

export type ModuleKey = 'home' | 'bazi' | 'ziwei' | 'yijing';

const MODULES: Array<{ id: Exclude<ModuleKey, 'home'>; label: string }> = [
  { id: 'bazi', label: '八字排盘' },
  { id: 'ziwei', label: '紫微斗数' },
  { id: 'yijing', label: '易经六爻' },
];

function initialModule(): ModuleKey {
  const q = new URLSearchParams(window.location.search);
  const m = q.get('mod');
  if (m === 'bazi' || m === 'ziwei' || m === 'yijing') return m;
  if (q.has('y') || q.has('cal')) return 'bazi';
  return 'home';
}

export default function Shell() {
  const [module, setModule] = useState<ModuleKey>(initialModule);
  const [visited, setVisited] = useState<Record<ModuleKey, boolean>>({
    home: true,
    bazi: true,
    ziwei: false,
    yijing: false,
  });

  useEffect(() => {
    setVisited((prev) => (prev[module] ? prev : { ...prev, [module]: true }));
    document.title =
      module === 'bazi' ? '八字 · 排盘 ATELIER'
      : module === 'ziwei' ? '紫微 · 斗数排盘 ATELIER'
      : module === 'yijing' ? '易经 · 六爻 ATELIER'
      : '命理 · 排盘 ATELIER';
  }, [module]);

  function go(next: ModuleKey) {
    setModule(next);
    const url = new URL(window.location.href);
    if (next === 'home') url.searchParams.delete('mod');
    else url.searchParams.set('mod', next);
    window.history.replaceState({}, '', url.toString());
    if (next !== 'ziwei') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="uni-app">
      <header className="uni-header">
        <div className="uni-header-inner">
          <button className="uni-brand" type="button" onClick={() => go('home')}>
            <BrandMark size={38} />
            <span className="brand-word">
              <b>命理</b>
              <span>ATELIER · 八字 · 紫微 · 易经</span>
            </span>
          </button>

          <nav className="uni-nav" aria-label="模块切换">
            {MODULES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`uni-tab${module === item.id ? ' on' : ''}`}
                onClick={() => go(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="uni-side">
            {module === 'bazi' && (
              <button
                className="btn-ghost uni-history"
                type="button"
                onClick={() => window.dispatchEvent(new Event('atelier:open-bazi-history'))}
              >
                历史
              </button>
            )}
            <div className="topbar-note uni-note">
              <b>四柱 · 紫微 · 周易</b>
              <br />
              三套体系 · 一个工坊
            </div>
          </div>
        </div>
      </header>

      <main className="uni-main">
        <section className="uni-view" hidden={module !== 'home'}>
          <Portal
            onBazi={() => go('bazi')}
            onZiwei={() => go('ziwei')}
            onYijing={() => go('yijing')}
          />
        </section>

        <section className="uni-view" hidden={module !== 'bazi'}>
          <App embedded />
        </section>

        {visited.yijing && (
          <section className="uni-view" hidden={module !== 'yijing'}>
            <Suspense fallback={<div className="uni-loading">载入易经…</div>}>
              <div className="yijing-module">
                <YijingApp embedded />
              </div>
            </Suspense>
          </section>
        )}

        {visited.ziwei && (
          <section className="uni-view uni-view-frame" hidden={module !== 'ziwei'}>
            <iframe
              className="uni-iframe"
              src="./ziwei/index.html?embed=1"
              title="紫微斗数排盘"
            />
          </section>
        )}
      </main>
    </div>
  );
}
