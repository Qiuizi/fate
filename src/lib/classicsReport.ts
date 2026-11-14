import { BaziResult } from './bazi';
import { buildClassicBook } from './classics';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CN = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾', '拾壹', '拾贰', '拾叁', '拾肆'];

export function buildClassicBookHTML(r: BaziResult): string {
  const sections = buildClassicBook(r);
  const body = sections
    .map(
      (s, i) => `<section>
      <h2><span class="num">${CN[i] || ''}</span>${esc(s.title)}<em>${esc(s.source)}</em></h2>
      ${s.paragraphs.map((p) => (p.quote ? `<blockquote>「${esc(p.text)}」</blockquote>` : `<p>${esc(p.text)}</p>`)).join('')}
    </section>`
    )
    .join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>命书</title>
  <style>
    :root{--ink:#1b1b1f;--muted:#6b6a66;--gold:#a67c2e;--line:#e4e1d8}
    *{box-sizing:border-box}
    body{margin:0;background:#fff;color:var(--ink);font-family:"Noto Serif SC","Songti SC",serif}
    .book{max-width:760px;margin:0 auto;padding:48px 44px 60px}
    h1{font-size:34px;letter-spacing:.5em;text-align:center;margin:0 0 8px;font-weight:700}
    .sub{text-align:center;color:var(--muted);font-size:12.5px;letter-spacing:.1em;margin-bottom:6px}
    .rule{height:1px;background:var(--line);margin:18px 0 26px}
    section{margin-bottom:22px;break-inside:avoid}
    h2{font-size:17px;letter-spacing:.14em;margin:0 0 10px;display:flex;align-items:baseline;gap:10px;border-bottom:1px solid var(--line);padding-bottom:8px}
    h2 .num{color:var(--gold);font-size:13px;letter-spacing:.1em}
    h2 em{margin-left:auto;font-style:normal;font-size:11px;color:var(--muted);letter-spacing:.06em}
    p{font-size:14px;line-height:2;margin:8px 0;text-align:justify;color:#2a2a2f}
    blockquote{margin:12px 0;padding:6px 0 6px 16px;border-left:2px solid var(--gold);font-size:15px;line-height:2;color:#161619}
    .foot{margin-top:26px;padding-top:14px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;line-height:1.8;text-align:center}
    @media print{body{-webkit-print-color-adjust:exact}.book{padding:24px 28px}}
  </style></head><body><div class="book">
    <h1>命 书</h1>
    <div class="sub">${esc(r.solarText)} · 四柱 ${r.pillars.map((p) => p.ganZhi).join(' ')} · 日主 ${r.dayMaster.gan}${r.dayMaster.element}</div>
    <div class="rule"></div>
    ${body}
    <div class="foot">古籍断语为传统命理参考，非确定结论；原文以常见通行版本为准，扩展解读为据经典原则之归纳，仅供参考。</div>
  </div></body></html>`;
}

type VBlock = { type: 's' | 'p' | 'q'; text: string };
export interface VBookOptions {
  fontSizePt?: number;
  limit?: number;
}

const dotify = (t: string) => esc(t).replace(/([。！？])/g, '$1<span class="dian"></span>');

const DIG = ['', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
function cnNum(n: number): string {
  if (n <= 0) return '零';
  if (n === 10) return '拾';
  if (n < 10) return DIG[n] || '';
  if (n < 20) return '拾' + DIG[n - 10];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return DIG[t] + '拾' + (u ? DIG[u] : '');
}

function frontisSVG(): string {
  const E = ['木', '火', '土', '金', '水'];
  const pts = E.map((e, i) => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    return { e, x: 200 + Math.cos(a) * 122, y: 200 + Math.sin(a) * 122 };
  });
  const sheng = pts
    .map((p, i) => {
      const q = pts[(i + 1) % 5];
      return `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="#b08a2e" stroke-width="1.5" marker-end="url(#ah)"/>`;
    })
    .join('');
  const ke = [
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 0],
    [4, 1],
  ]
    .map(([i, j]) => `<line x1="${pts[i].x.toFixed(1)}" y1="${pts[i].y.toFixed(1)}" x2="${pts[j].x.toFixed(1)}" y2="${pts[j].y.toFixed(1)}" stroke="#b08a2e" stroke-width="0.8" stroke-dasharray="3 5" opacity="0.4"/>`)
    .join('');
  const nodes = pts
    .map(
      (p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="27" fill="#fbf7ea" stroke="#b08a2e" stroke-width="1.3"/>
      <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="22" fill="#7a1f16" font-family="'Noto Serif SC',serif">${p.e}</text>`
    )
    .join('');
  return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="ah" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="none" stroke="#b08a2e" stroke-width="1.1"/></marker></defs>
    ${ke}${sheng}${nodes}
    <circle cx="200" cy="200" r="35" fill="none" stroke="#b08a2e" stroke-width="1.1"/>
    <path d="M200,165 a17.5,17.5 0 0 1 0,35 a17.5,17.5 0 0 0 0,35" fill="#2a2622" opacity="0.85"/>
    <path d="M200,165 a17.5,17.5 0 0 0 0,35 a17.5,17.5 0 0 1 0,35" fill="#c9a24a" opacity="0.9"/>
    <circle cx="200" cy="182.5" r="4.2" fill="#c9a24a"/>
    <circle cx="200" cy="217.5" r="4.2" fill="#2a2622"/>
  </svg>`;
}

function pageInner(blks: VBlock[]) {
  return blks
    .map((b) =>
      b.type === 's'
        ? `<span class="sect">${esc(b.text)}</span><br/>`
        : b.type === 'q'
        ? `<span class="quote">「${dotify(b.text)}」</span><br/>`
        : `<span class="para">${dotify(b.text)}</span><br/>`
    )
    .join('');
}

function essayPage(title: string, body: string, sign: string, sealChar: string) {
  return `<section class="vpreface">
    <div class="cv-frame"></div>
    <div class="essay">
      <span class="essay-title">${esc(title)}</span><br/><br/>
      <span class="essay-body">${esc(body)}</span><br/><br/>
      <span class="essay-sign">${esc(sign)}</span>
    </div>
    <div class="cv-seal">${esc(sealChar)}</div>
  </section>`;
}

/** 竖排线装：封面 + 序 + 目录 + 章节页(每章另起) + 双页对折 + 鱼尾/版心 + 断句点 + 题跋，朱墨套印 */
export function buildClassicBookVerticalHTML(r: BaziResult, opts: VBookOptions = {}): string {
  const fontSize = opts.fontSizePt || 12.5;
  const limit = opts.limit || 470;
  const sections = buildClassicBook(r);
  const blocks: VBlock[] = [];
  sections.forEach((s) => {
    blocks.push({ type: 's', text: s.title });
    s.paragraphs.forEach((p) => blocks.push({ type: p.quote ? 'q' : 'p', text: p.text }));
  });

  // 分页：每章另起一页
  const pagesBlocks: VBlock[][] = [];
  let cur: VBlock[] = [];
  let n = 0;
  blocks.forEach((b) => {
    if (b.type === 's') {
      if (cur.length) {
        pagesBlocks.push(cur);
        cur = [];
        n = 0;
      }
      cur.push(b);
      n += b.text.length + 18;
      return;
    }
    const len = b.text.length;
    if (cur.length && n + len > limit) {
      pagesBlocks.push(cur);
      cur = [];
      n = 0;
    }
    cur.push(b);
    n += len;
  });
  if (cur.length) pagesBlocks.push(cur);

  const toc: { title: string; page: number }[] = [];
  pagesBlocks.forEach((blks, idx) => blks.forEach((b) => b.type === 's' && toc.push({ title: b.text, page: idx + 1 })));

  const half = (blks: VBlock[] | undefined, num: number, side: 'r' | 'l') =>
    blks
      ? `<div class="vhalf ${side}"><div class="frame"><div class="content">${pageInner(blks)}</div><div class="pageno">第${cnNum(num)}页</div></div></div>`
      : `<div class="vhalf ${side}"></div>`;

  let spreads = '';
  for (let i = 0; i < pagesBlocks.length; i += 2) {
    const total = pagesBlocks.length;
    spreads += `<section class="vspread">
      <div class="holes"><i></i><i></i><i></i><i></i></div>
      ${half(pagesBlocks[i], i + 1, 'r')}
      <div class="banxin">
        <div class="yuw top"></div>
        <div class="bx-text"><span>四柱命書</span><span>第${cnNum(i + 1)}–${cnNum(Math.min(i + 2, total))}页</span></div>
        <div class="yuw bot"></div>
      </div>
      ${half(pagesBlocks[i + 1], i + 2, 'l')}
    </section>`;
  }

  const dm = `${r.dayMaster.gan}${r.dayMaster.element}`;
  const cover = `<section class="vcover">
    <div class="cv-frame"></div>
    <div class="slip"><span>四柱命書</span></div>
    <div class="cv-sub">${esc(r.solarText)}<br/>四柱 ${r.pillars.map((p) => p.ganZhi).join(' ')}<br/>日主 ${dm}</div>
    <div class="cv-seal">命</div>
    <div class="cv-note">线 装 · 竖 排 · 参 考</div>
  </section>`;

  const frontis = `<section class="vfrontis"><div class="cv-frame"></div>
    <div class="frontis-wrap">${frontisSVG()}</div>
    <div class="frontis-cap"><span>卷 首 圖</span><span>五 行 生 剋 之 環</span></div>
  </section>`;

  const preface = essayPage(
    '序',
    `夫命者，禀天地之气而立；五行布而性情分，十神列而人事见。今取${dm}日主之盘，参其四柱、五行、十神、大运，稽诸古籍，勒为此编。语多摭拾，聊备观览，庶几有助自省云尔。`,
    `岁在 ${new Date().getFullYear()} · 谨序`,
    '序'
  );

  const tocPage = `<section class="vtoc"><div class="toc-frame"><div class="toc-content">
    <span class="toc-title">目 錄</span><br/>
    ${toc.map((t) => `<span class="toc-item">${esc(t.title)}<span class="toc-lead">········</span><span class="toc-pg">第${cnNum(t.page)}页</span></span><br/>`).join('')}
  </div></div></section>`;

  const colophon = essayPage(
    '題跋',
    `右命书一卷，凡十三篇，皆本古法参论而成。命之理微，非一言可尽；此编所及，祇其大略。读者取会其通，不执一端，则近道矣。`,
    `岁在 ${new Date().getFullYear()} · 谨识`,
    '印'
  );

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>命书·竖排线装</title>
  <style>
    @page{size:A4 landscape;margin:0}
    *{box-sizing:border-box}
    html,body{margin:0;background:#e9e3d4}
    @media screen{body{display:flex;flex-direction:column;align-items:center;overflow-x:auto}}
    .vcover,.vtoc,.vpreface,.vfrontis,.vspread{width:297mm;height:210mm;page-break-after:always;position:relative;background:#fbf7ea;overflow:hidden}
    .cv-frame{position:absolute;inset:10mm;border:1.2px solid #2a2a2a;box-shadow:inset 0 0 0 4px #fbf7ea, inset 0 0 0 5px #2a2a2a}
    .slip{position:absolute;right:26mm;top:26mm;width:28mm;height:118mm;border:2px solid #a8322a;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.35)}
    .slip span{writing-mode:vertical-rl;font-family:"Noto Serif SC",serif;font-size:32pt;letter-spacing:.42em;color:#1b1b1b;font-weight:700}
    .cv-sub{position:absolute;right:60mm;top:26mm;height:118mm;writing-mode:vertical-rl;font-family:"Noto Serif SC",serif;font-size:10.5pt;color:#5a4a2a;letter-spacing:.18em;line-height:1.7}
    .cv-seal{position:absolute;left:24mm;bottom:24mm;width:20mm;height:20mm;border:2.5px solid #a8322a;border-radius:3px;color:#a8322a;display:flex;align-items:center;justify-content:center;font-family:"Noto Serif SC",serif;font-size:28pt;font-weight:700;transform:rotate(-5deg);opacity:.92}
    .cv-note{position:absolute;left:24mm;bottom:52mm;writing-mode:vertical-rl;font-size:9pt;letter-spacing:.4em;color:#8a7a52}
    /* 双色烫金封面 */
    .vcover{background:radial-gradient(120% 90% at 50% 18%, #2c1a15 0%, #1c1210 60%, #140d0b 100%)}
    .vcover .cv-frame{border-color:#caa14a;box-shadow:inset 0 0 0 4px #1c1210, inset 0 0 0 5px #caa14a, inset 0 0 60px rgba(202,161,74,.08)}
    .vcover .slip{border-color:#caa14a;background:rgba(202,161,74,.06)}
    .vcover .slip span{color:transparent;background:linear-gradient(180deg,#f6e6b4,#d8b45e 42%,#a9822f 58%,#f2dfa6);-webkit-background-clip:text;background-clip:text;text-shadow:0 0 16px rgba(202,161,74,.35)}
    .vcover .cv-sub{color:#cdb27a}
    .vcover .cv-note{color:#a08a5c}
    .vcover::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg, rgba(202,161,74,.05) 0 2px, transparent 2px 6px);pointer-events:none;mix-blend-mode:screen}
    /* 卷首图 */
    .frontis-wrap{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:152mm;height:152mm}
    .frontis-wrap svg{width:100%;height:100%}
    .frontis-cap{position:absolute;right:26mm;top:26mm;height:112mm;writing-mode:vertical-rl;display:flex;gap:10mm;font-family:"Noto Serif SC",serif;font-size:14pt;letter-spacing:.3em;color:#a8322a}
    /* 序 / 题跋 */
    .essay{position:absolute;inset:20mm 26mm;writing-mode:vertical-rl;text-orientation:upright;font-family:"Noto Serif SC",serif;color:#1c1c1c;font-size:12pt;line-height:2;letter-spacing:.04em}
    .essay-title{font-size:22pt;font-weight:700;color:#a8322a;letter-spacing:.5em}
    .essay-body{color:#1c1c1c}
    .essay-sign{color:#5a4a2a;font-size:10pt;letter-spacing:.2em}
    /* 目录 */
    .toc-frame{position:absolute;inset:10mm;border:1.2px solid #2a2a2a;box-shadow:inset 0 0 0 4px #fbf7ea, inset 0 0 0 5px #2a2a2a}
    .toc-content{position:absolute;inset:18mm;writing-mode:vertical-rl;text-orientation:upright;font-family:"Noto Serif SC",serif;color:#1c1c1c;font-size:12pt;line-height:2.1;letter-spacing:.04em}
    .toc-title{font-size:20pt;font-weight:700;letter-spacing:.5em;color:#a8322a}
    .toc-item{color:#2a2a2f}
    .toc-lead{color:#b7a98a}
    .toc-pg{color:#a8322a}
    /* 跨页 */
    .vspread{display:flex}
    .vhalf{position:relative;flex:1 1 50%;height:100%}
    .vhalf .frame{position:absolute;inset:8mm 7mm;border:1px solid #2a2a2a;box-shadow:inset 0 0 0 3px #fbf7ea, inset 0 0 0 4px #2a2a2a}
    .vhalf.r .frame{inset:8mm 9mm 8mm 8mm}
    .vhalf.l .frame{inset:8mm 8mm 8mm 9mm}
    .content{position:absolute;inset:15mm 13mm;writing-mode:vertical-rl;text-orientation:upright;font-family:"Noto Serif SC","Songti SC",serif;color:#1c1c1c;font-size:${fontSize}pt;line-height:1.95;letter-spacing:.02em;background-image:repeating-linear-gradient(90deg, rgba(90,60,25,.13) 0, rgba(90,60,25,.13) 1px, transparent 1px 1.72em)}
    .sect{font-size:${fontSize + 2.5}pt;font-weight:700;color:#a8322a;letter-spacing:.14em}
    .quote{color:#4a2f12}
    .dian{display:inline-block;width:.4em;height:.4em;border:.7px solid #a8322a;border-radius:50%;margin:0 .06em;opacity:.7;vertical-align:middle}
    .pageno{position:absolute;bottom:6mm;color:#a8322a;font-size:9pt;letter-spacing:.1em}
    .vhalf.r .pageno{right:12mm}
    .vhalf.l .pageno{left:12mm}
    .holes{position:absolute;right:4mm;top:14mm;bottom:14mm;width:8mm;z-index:4}
    .holes i{position:absolute;left:0;width:6mm;height:6mm;border-radius:50%;border:1px solid #2a2a2a;background:#fbf7ea}
    .holes i:nth-child(1){top:0}
    .holes i:nth-child(2){top:33%}
    .holes i:nth-child(3){top:66%}
    .holes i:nth-child(4){bottom:0}
    .holes::before{content:"";position:absolute;left:2.7mm;top:3mm;bottom:3mm;width:1px;background:#2a2a2a;opacity:.45}
    .banxin{position:absolute;left:50%;transform:translateX(-50%);top:9mm;bottom:9mm;width:12mm;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;background:rgba(250,245,232,.82);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:2mm 0;z-index:3}
    .yuw{width:8mm;height:5mm;background:#2a2a2a;clip-path:polygon(0 0,100% 0,100% 34%,50% 100%,0 34%)}
    .yuw.bot{transform:rotate(180deg)}
    .bx-text{writing-mode:vertical-rl;display:flex;align-items:center;justify-content:center;gap:7mm;flex:1;font-family:"Noto Serif SC",serif;font-size:9pt;color:#5a4a2a;letter-spacing:.22em}
    @media print{body{background:#fff}}
  </style></head><body>${cover}${frontis}${preface}${tocPage}${spreads}${colophon}</body></html>`;
}
