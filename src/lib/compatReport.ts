import { BaziResult } from './bazi';
import { ELEMENT_META } from './elements';
import { CompatResult } from './compat';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function pillarsTable(r: BaziResult) {
  const roles = ['年柱', '月柱', '日柱', '时柱'];
  const head = r.pillars.map((_p, i) => `<th>${roles[i]}</th>`).join('');
  const gan = r.pillars
    .map((p) => `<td><b style="color:${ELEMENT_META[p.ganEl].color}">${p.gan}</b><div class="ss">${esc(p.shiShen)}</div></td>`)
    .join('');
  const zhi = r.pillars.map((p) => `<td><b style="color:${ELEMENT_META[p.zhiEl].color}">${p.zhi}</b></td>`).join('');
  const hid = r.pillars.map((p) => `<td class="small">${p.hidden.map((h) => h.gan).join(' ')}</td>`).join('');
  const ny = r.pillars.map((p) => `<td class="small">${esc(p.naYin)}</td>`).join('');
  return `<table><thead><tr><th class="lab">四柱</th>${head}</tr></thead><tbody>
    <tr><td class="lab">天干</td>${gan}</tr>
    <tr><td class="lab">地支</td>${zhi}</tr>
    <tr><td class="lab">藏干</td>${hid}</tr>
    <tr><td class="lab">纳音</td>${ny}</tr>
  </tbody></table>`;
}

export function buildCompatReportHTML(a: BaziResult, b: BaziResult, res: CompatResult): string {
  const side = (r: BaziResult, label: string) => `
    <section class="card">
      <h2>${label}</h2>
      <p class="meta">日主 <b style="color:${ELEMENT_META[r.dayMaster.element].color}">${r.dayMaster.gan}</b>${r.dayMaster.element} · 生肖${r.pillars[0].zhi} · ${esc(r.solarText)}</p>
      ${pillarsTable(r)}
    </section>`;
  const dims = res.dims
    .map(
      (d) => `<div class="dim"><div class="dim-h"><span>${d.title}</span><span class="tag ${d.tag === '吉' ? 'good' : d.tag === '平' ? 'mid' : 'warn'}">${d.tag}</span><span class="score">${d.score}</span></div><p>${esc(d.text)}</p></div>`
    )
    .join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>合盘报告</title>
  <style>
    :root{--bg:#0b0b0d;--surface:#141418;--line:#26262c;--ink:#ece9e2;--muted:#9d998f;--gold:#d9b45c}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans SC",system-ui,sans-serif;padding:32px}
    .wrap{max-width:820px;margin:0 auto}
    h1{font-family:"Noto Serif SC",serif;font-size:26px;letter-spacing:.16em;margin:0 0 4px}
    .sub{color:var(--muted);font-size:12px;letter-spacing:.1em;margin-bottom:20px}
    .scorebox{display:flex;align-items:center;gap:18px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:16px}
    .big{font-family:"Noto Serif SC",serif;font-size:54px;font-weight:700;color:var(--gold);line-height:1}
    .lvl{font-size:15px;letter-spacing:.06em}
    .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:16px}
    .card h2{font-family:"Noto Serif SC",serif;font-size:16px;letter-spacing:.14em;margin:0 0 8px}
    .meta{color:var(--muted);font-size:12.5px;margin:0 0 10px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid var(--line);padding:8px 6px;text-align:center;font-size:14px}
    .lab{color:var(--muted);font-size:12px;background:rgba(255,255,255,.02)}
    td b{font-family:"Noto Serif SC",serif;font-size:20px}
    .ss{font-size:10px;color:var(--muted);margin-top:2px}
    .small{font-size:11px;color:var(--muted)}
    .dims{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
    .dim{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
    .dim-h{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .dim-h span:first-child{font-family:"Noto Serif SC",serif;font-size:14px}
    .score{margin-left:auto;color:var(--gold);font-size:12px}
    .tag{font-size:10px;padding:1px 8px;border-radius:20px}
    .tag.good{background:rgba(102,176,143,.18);color:#7fd0aa}
    .tag.mid{background:rgba(217,180,92,.16);color:var(--gold)}
    .tag.warn{background:rgba(224,112,92,.16);color:#e8907c}
    .dim p{margin:0;font-size:12.5px;line-height:1.8;color:#c9c6be}
    .summary{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
    .summary p{margin:6px 0;font-size:13px;line-height:1.9;color:#c9c6be}
    .foot{margin-top:16px;color:var(--muted);font-size:11px;text-align:center}
    @media print{body{background:#fff;color:#111}.card,.scorebox,.dim,.summary{background:#fff;border-color:#ddd}.dim p,.summary p{color:#333}}
  </style></head><body><div class="wrap">
    <h1>合盘 · 双人</h1><div class="sub">以双方八字参合 · 只作参考</div>
    <div class="scorebox"><div class="big">${res.score}</div><div><div class="lvl">${res.level}</div><div class="sub" style="margin:0">综合契合度</div></div></div>
    ${side(a, '本命 · 你')}
    ${side(b, '对方')}
    <div class="dims">${dims}</div>
    <div class="summary">${res.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="foot">合盘为传统命理参考，非确定结论；感情贵在经营与体谅。</div>
  </div></body></html>`;
}
