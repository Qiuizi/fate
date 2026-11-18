import { BaziResult } from './bazi';
import { Element } from './elements';
import { analyzeRelations } from './relations';
import { computeShenSha } from './shensha';
import { buildClassicBook } from './classics';

/**
 * 导出的 HTML 是独立文件：字体按绝对地址引用应用自带的 fonts/fonts-export.css
 * （在线版即 GitHub Pages 上的同一份自托管字体，不再请求 Google Fonts）。取不到地址时只用系统字体。
 */
function exportFontLink(): string {
  try {
    const href = new URL('fonts/fonts-export.css', document.baseURI).href;
    return `<link href="${href}" rel="stylesheet">`;
  } catch {
    return '';
  }
}

const ELS: Element[] = ['木', '火', '土', '金', '水'];

const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const genderCN = (g: string) => (g === 'male' ? '乾造（男）' : '坤造（女）');

function sumRec(rec: Record<string, number>) {
  return Object.values(rec).reduce((a, b) => a + b, 0) || 1;
}

export function chartFilename(r: BaziResult, ext: string) {
  const gz = r.pillars.map((p) => p.ganZhi).join('');
  return `八字排盘_${r.solarText.slice(0, 10).replace(/-/g, '')}_${gz}.${ext}`;
}

/* ------------------------------------------------------------------ *
 *  AI 友好的结构化 Markdown
 * ------------------------------------------------------------------ */
export function buildChartMarkdown(r: BaziResult): string {
  const inp = r.input;
  const vis = r.visibleCount;
  const wtd = r.weighted;
  const rel = analyzeRelations(r.pillars);
  const shensha = computeShenSha(r.pillars).list;
  const classics = buildClassicBook(r);
  const L: string[] = [];

  L.push('---');
  L.push('title: 四柱八字排盘');
  L.push('schema: bazi.chart.v1');
  L.push('engine: lunar-javascript 1.7.8');
  L.push(`gender: ${inp.gender}`);
  L.push(`calendar_input: ${inp.calendar}`);
  L.push(`solar_datetime: "${r.solarText}"`);
  L.push(`lunar_datetime: "${r.lunarText}"`);
  L.push(`four_pillars: "${r.pillars.map((p) => p.ganZhi).join(' ')}"`);
  L.push(`true_solar_time: ${r.tst.applied}`);
  L.push(`zishi_rollover: "${inp.zishiSect === 1 ? '23:00' : '00:00'}"`);
  L.push('---');
  L.push('');
  L.push(`# 四柱八字排盘 · ${r.pillars.map((p) => p.ganZhi).join(' ')}`);
  L.push('');
  L.push(
    '> 本文件为「人读 + 机读」双格式：正文表格便于阅读，末尾 ```json 代码块为**完整结构化数据**，便于 AI 精确解析。'
  );
  L.push(
    `> 计算口径：立春换年 · 节气换月 · 干支纪日 · 真太阳时${r.tst.applied ? '开' : '关'} · 子时${inp.zishiSect === 1 ? '23:00' : '00:00'}换日。`
  );
  L.push('');

  L.push('## 1. 基本信息');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('| --- | --- |');
  L.push(`| 性别 | ${genderCN(inp.gender)} |`);
  L.push(`| 公历 | ${r.solarText} |`);
  L.push(`| 农历 | ${r.lunarText.replace('农历 ', '')} |`);
  L.push(`| 生肖 | ${r.zodiac} |`);
  L.push(`| 星座 | ${r.constellation} |`);
  L.push(`| 日主 | ${r.dayMaster.gan}（${r.dayMaster.yinYang}${r.dayMaster.element}） |`);
  L.push(`| 月令 | ${r.pillars[1].zhi}${r.pillars[1].zhiEl}（${r.jieQi.monthJie}后） |`);
  L.push(`| 日空 | ${r.dayXunKong} |`);
  L.push('');

  L.push('## 2. 四柱（Eight Characters）');
  L.push('');
  L.push('| 柱 | 天干 | 地支 | 天干五行 | 地支五行 | 天干十神 | 藏干（十神） | 纳音 | 星运 | 自坐 |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  r.pillars.forEach((p) => {
    const hid = p.hidden.map((h) => `${h.gan}(${h.element}·${h.shiShen})`).join('、');
    L.push(
      `| ${p.role} | ${p.gan} | ${p.zhi} | ${p.ganEl} | ${p.zhiEl} | ${p.shiShen} | ${hid} | ${p.naYin} | ${p.xingYun} | ${p.selfStage} |`
    );
  });
  L.push('');

  L.push('## 3. 藏干明细');
  L.push('');
  r.pillars.forEach((p) => {
    const hid = p.hidden.map((h) => `${h.gan}（${h.element}·${h.shiShen}）`).join('　');
    L.push(`- **${p.role}（${p.ganZhi}）**：${hid}${p.isXunKong ? ' · 空亡' : ''}`);
  });
  L.push('');

  L.push('## 3.5 关系（合冲刑害会）');
  L.push('');
  L.push(`- 天干：${rel.gan.length ? rel.gan.map((x) => x.text).join('；') : '无合冲'}`);
  L.push(`- 地支：${rel.zhi.length ? rel.zhi.map((x) => x.text).join('；') : '无合冲刑害'}`);
  L.push('');
  L.push('## 3.6 神煞');
  L.push('');
  L.push(shensha.length ? shensha.map((x) => `${x.name}（${x.roles.join('·')}）`).join('；') : '未见常见神煞');
  L.push('');
  L.push('## 3.7 古籍断语（长文参论，供参考）');
  L.push('');
  classics.forEach((s) => {
    L.push(`### ${s.title}（${s.source}）`);
    s.paragraphs.forEach((p) => {
      L.push(p.quote ? `> ${p.text}` : p.text);
    });
    L.push('');
  });

  L.push('## 4. 五行统计');
  L.push('');
  L.push(`- 明字计数（八字共 8 字）：${ELS.map((e) => `${e}${vis[e]}`).join('　')}`);
  L.push('');
  L.push('| 五行 | 明字计数 | 含藏干加权 | 加权占比 |');
  L.push('| --- | --- | --- | --- |');
  const wt = sumRec(wtd);
  ELS.forEach((e) => {
    L.push(`| ${e} | ${vis[e]} | ${wtd[e].toFixed(2)} | ${Math.round((wtd[e] / wt) * 100)}% |`);
  });
  L.push('');

  L.push('## 5. 大运');
  L.push('');
  L.push(`起运：${r.yun.startText}（${r.yun.startSolar}）· ${r.yun.direction}。`);
  L.push('');
  L.push('| # | 起止岁 | 起止年 | 干支 | 十神 | 当前 |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  r.luck.forEach((l, i) => {
    L.push(
      `| ${i + 1} | ${l.startAge}–${l.endAge} | ${l.startYear}–${l.endYear} | ${l.ganZhi} | ${l.shiShen} | ${
        l.current ? '★' : ''
      } |`
    );
  });
  L.push('');
  const cur = r.luck.find((l) => l.current) || r.luck[0];
  if (cur) {
    L.push(`### 当前大运流年：${cur.ganZhi}（${cur.startAge}–${cur.endAge} 岁）`);
    L.push('');
    L.push('| 年份 | 干支 | 十神 | 年龄 |');
    L.push('| --- | --- | --- | --- |');
    cur.liuNian.forEach((ln) => {
      L.push(`| ${ln.year} | ${ln.ganZhi} | ${ln.shiShen} | ${ln.age} |`);
    });
    L.push('');
  }

  L.push('## 6. 命盘参数');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('| --- | --- |');
  L.push(`| 胎元 | ${r.taiYuan} |`);
  L.push(`| 命宫 | ${r.mingGong} |`);
  L.push(`| 身宫 | ${r.shenGong} |`);
  L.push(`| 胎息 | ${r.taiXi} |`);
  L.push(`| 空亡 | ${r.dayXunKong} |`);
  L.push('');

  L.push('## 7. 计算口径');
  L.push('');
  L.push('| 项 | 说明 |');
  L.push('| --- | --- |');
  L.push('| 换年 | 立春换年（非正月初一） |');
  L.push('| 换月 | 十二节令换月（非农历月序） |');
  L.push('| 日柱 | 连续干支纪日 |');
  L.push(
    `| 真太阳时 | ${r.tst.applied ? `开 · ${r.input.cityName || '出生地点'} · 校正 ${r.tst.deltaMinutes.toFixed(1)} 分${r.input.useEot ? '（含均时差）' : ''}` : '关（按北京时间·平太阳时）'} |`
  );
  L.push(`| 子时换日 | ${inp.zishiSect === 1 ? '23:00（晚子归次日）' : '00:00（晚子算当日）'} |`);
  L.push(`| 有效时刻 | ${r.effective.y}-${String(r.effective.m).padStart(2, '0')}-${String(r.effective.d).padStart(2, '0')} ${String(r.effective.hh).padStart(2, '0')}:${String(r.effective.mm).padStart(2, '0')} |`);
  L.push(`| 节气区间 | ${r.jieQi.prev} → ${r.jieQi.next} |`);
  L.push('');

  L.push('## 8. 供 AI 分析的要点（事实，不含吉凶判断）');
  L.push('');
  L.push(`- 日主：${r.dayMaster.gan}，五行属${r.dayMaster.element}（${r.dayMaster.yinYang}）。`);
  L.push(`- 月令：${r.pillars[1].zhi}${r.pillars[1].zhiEl}（${r.jieQi.monthJie}后），为当令之气。`);
  L.push(`- 四柱：${r.pillars.map((p) => p.ganZhi + '（' + p.shiShen + '）').join('　')}。`);
  L.push(`- 五行明字：${ELS.map((e) => `${e}${vis[e]}`).join(' ')}；含藏干加权：${ELS.map((e) => `${e}${wtd[e].toFixed(1)}`).join(' ')}。`);
  L.push(`- 大运：${r.yun.direction}，${r.yun.startText}起运。`);
  L.push('');

  // 结构化 JSON —— 便于 AI 精确解析
  const payload = {
    schema: 'bazi.chart.v1',
    generatedBy: '四柱·八字排盘 ATELIER',
    engine: 'lunar-javascript 1.7.8',
    meta: {
      gender: inp.gender,
      genderCN: genderCN(inp.gender),
      calendarInput: inp.calendar,
      solarDatetime: r.solarText,
      lunarDatetime: r.lunarText.replace('农历 ', ''),
      zodiac: r.zodiac,
      constellation: r.constellation,
    },
    dayMaster: { stem: r.dayMaster.gan, element: r.dayMaster.element, yinYang: r.dayMaster.yinYang },
    pillars: Object.fromEntries(
      r.pillars.map((p) => [
        p.roleEn.toLowerCase(),
        {
          label: p.role,
          stem: p.gan,
          branch: p.zhi,
          ganZhi: p.ganZhi,
          stemElement: p.ganEl,
          branchElement: p.zhiEl,
          stemYinYang: p.ganYinYang,
          branchYinYang: p.zhiYinYang,
          tenGod: p.shiShen,
          hiddenStems: p.hidden.map((h) => ({ stem: h.gan, element: h.element, tenGod: h.shiShen })),
          naYin: p.naYin,
          stage: p.xingYun,
          selfStage: p.selfStage,
          isVoid: p.isXunKong,
        },
      ])
    ),
    fiveElements: {
      visibleCount: vis,
      weighted: Object.fromEntries(ELS.map((e) => [e, Math.round(wtd[e] * 100) / 100])),
      percent: Object.fromEntries(ELS.map((e) => [e, Math.round((wtd[e] / wt) * 100)])),
    },
    relations: {
      gan: rel.gan.map((x) => x.text),
      zhi: rel.zhi.map((x) => x.text),
    },
    shensha: shensha.map((x) => ({ name: x.name, pillars: x.roles })),
    classics: classics.map((s) => ({ title: s.title, source: s.source, paragraphs: s.paragraphs.map((p) => p.text) })),
    luck: r.luck.map((l, i) => ({
      index: i + 1,
      ganZhi: l.ganZhi,
      shiShen: l.shiShen,
      startAge: l.startAge,
      endAge: l.endAge,
      startYear: l.startYear,
      endYear: l.endYear,
      current: l.current,
      liuNian: l.liuNian.map((x) => ({ year: x.year, age: x.age, ganZhi: x.ganZhi, shiShen: x.shiShen })),
    })),
    parameters: { taiYuan: r.taiYuan, mingGong: r.mingGong, shenGong: r.shenGong, taiXi: r.taiXi, dayXunKong: r.dayXunKong },
    calculation: {
      yearBoundary: 'lichun',
      monthBoundary: 'jieqi',
      trueSolarTime: r.tst.applied,
      equationOfTime: r.input.useEot,
      city: r.tst.applied ? r.input.cityName || null : null,
      zishiRollover: inp.zishiSect === 1 ? '23:00' : '00:00',
      effectiveTime: `${r.effective.y}-${String(r.effective.m).padStart(2, '0')}-${String(r.effective.d).padStart(2, '0')} ${String(r.effective.hh).padStart(2, '0')}:${String(r.effective.mm).padStart(2, '0')}`,
      prevJieQi: r.jieQi.prev,
      nextJieQi: r.jieQi.next,
    },
  };
  L.push('## 9. 结构化数据（JSON）');
  L.push('');
  L.push('```json');
  L.push(JSON.stringify(payload, null, 2));
  L.push('```');
  L.push('');
  return L.join('\n');
}

/* ------------------------------------------------------------------ *
 *  炫酷深空风 · 单文件 HTML
 * ------------------------------------------------------------------ */
const EXPORT_COLORS: Record<Element, string> = {
  木: '#4fa57f',
  火: '#e0684f',
  土: '#c99a5c',
  金: '#e0b44f',
  水: '#5b87c4',
};

function ringSVG(r: BaziResult) {
  const total = Math.max(0.0001, sumRec(r.weighted));
  let acc = 0;
  const stops: string[] = [];
  const labels: string[] = [];
  ELS.forEach((el) => {
    const v = r.weighted[el];
    const sweep = (v / total) * 360;
    const a0 = acc;
    const a1 = acc + sweep;
    acc = a1;
    stops.push(`${EXPORT_COLORS[el]} ${a0.toFixed(2)}deg ${a1.toFixed(2)}deg`);
    const mid = a0 + sweep / 2;
    const rad = (mid * Math.PI) / 180;
    const x = 50 + 47 * Math.sin(rad);
    const y = 50 - 47 * Math.cos(rad);
    const tf = x < 26 ? 'translate(0,-50%)' : x > 74 ? 'translate(-100%,-50%)' : 'translate(-50%,-50%)';
    labels.push(
      `<div class="ring-lbl" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;transform:${tf};color:${EXPORT_COLORS[el]}"><span class="rlbl">${el}</span><span class="rval">${v.toFixed(
        1
      )} · ${Math.round((v / total) * 100)}%</span></div>`
    );
  });
  return `<div class="ring-donut-wrap" aria-label="五行气数环">
    <div class="ring-orbit"></div>
    <div class="ring-donut" style="background:conic-gradient(from 0deg, ${stops.join(', ')});"></div>
    ${labels.join('')}
    <div class="ring-center">
      <span class="rcap">DAY MASTER</span>
      <span class="rchar" style="color:${EXPORT_COLORS[r.dayMaster.element]}">${r.dayMaster.gan}</span>
      <span class="rcap2">${r.dayMaster.yinYang}${r.dayMaster.element}</span>
    </div>
  </div>`;
}

export function buildChartHTML(r: BaziResult): string {
  const gzAll = r.pillars.map((p) => p.ganZhi).join(' ');
  const pillars = r.pillars
    .map(
      (p) => `
      <div class="pillar${p.role === '日柱' ? ' day' : ''}">
        <div class="role"><span>${p.roleEn}</span>${p.role}</div>
        <div class="ten">${esc(p.shiShen)}</div>
        <div class="stem" style="color:${EXPORT_COLORS[p.ganEl]}">${p.gan}</div>
        <div class="branch" style="color:${EXPORT_COLORS[p.zhiEl]}">${p.zhi}</div>
        <div class="hidden">${p.hidden
          .map((h) => `<span style="color:${EXPORT_COLORS[h.element]}">${h.gan}<i>${h.shiShen}</i></span>`)
          .join('')}</div>
        <div class="meta">${esc(p.naYin)}</div>
        <div class="meta dim">${esc(p.xingYun)} · ${esc(p.selfStage)}</div>
      </div>`
    )
    .join('');

  const bars = ELS.map((el, i) => {
    const wt = sumRec(r.weighted);
    const pct = (r.weighted[el] / Math.max(1, ...ELS.map((e) => r.weighted[e]))) * 100;
    return `<div class="brow"><div class="bn" style="color:${EXPORT_COLORS[el]}">${el}</div><div class="btrack"><div class="bfill" style="width:${Math.max(
      pct,
      2
    )}%;background:linear-gradient(90deg,${EXPORT_COLORS[el]}bb,${EXPORT_COLORS[el]});animation-delay:${
      0.1 * i
    }s"></div></div><div class="bv">${r.weighted[el].toFixed(1)} · ${Math.round(
      (r.weighted[el] / wt) * 100
    )}%</div></div>`;
  }).join('');

  const luck = r.luck
    .map(
      (l) => `<div class="lk${l.current ? ' cur' : ''}">
        <div class="lka">${l.startAge}–${l.endAge}岁</div>
        <div class="lkg"><b style="color:${EXPORT_COLORS[l.ganEl]}">${l.gan}</b><b style="color:${
        EXPORT_COLORS[l.zhiEl]
      }">${l.zhi}</b></div>
        <div class="lky">${l.startYear}</div>
      </div>`
    )
    .join('');

  return `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>四柱八字 · ${gzAll}</title>
${exportFontLink()}
<style>
:root{--ink:#e9e4d8;--dim:#9b9587;--gold:#e0b44f;--line:rgba(224,180,79,.18);--bg:#0c0d0f}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:var(--bg);color:var(--ink);font-family:'Noto Serif SC','Songti SC',serif;-webkit-font-smoothing:antialiased}
#stars{position:fixed;inset:0;z-index:0;opacity:.55}
.aurora{position:fixed;inset:-20%;z-index:0;pointer-events:none;background:
  radial-gradient(38% 38% at 20% 18%, rgba(224,104,79,.16), transparent 60%),
  radial-gradient(40% 40% at 82% 26%, rgba(91,135,196,.16), transparent 60%),
  radial-gradient(46% 46% at 60% 92%, rgba(79,165,127,.14), transparent 60%);
  filter:blur(20px);animation:drift 16s ease-in-out infinite alternate}
@keyframes drift{to{transform:translate3d(2%,-2%,0) scale(1.06)}}
.wrap{position:relative;z-index:2;max-width:860px;margin:0 auto;padding:56px 26px 70px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:34px;opacity:0;animation:up .9s .05s forwards}
.seal{width:40px;height:40px;border:2px solid #c8503f;border-radius:6px;display:grid;place-items:center;color:#e0684f;font-weight:700;font-size:18px;box-shadow:0 0 22px rgba(224,104,79,.35)}
.brand b{font-size:19px;letter-spacing:.28em}.brand span{font-family:'Cormorant Garamond',serif;font-size:12px;letter-spacing:.34em;color:var(--dim);display:block;margin-top:5px}
.hero{opacity:0;animation:up .9s .15s forwards}
.eyebrow{font-family:'Cormorant Garamond',serif;letter-spacing:.42em;font-size:13px;color:var(--dim);text-transform:uppercase}
h1{font-weight:600;font-size:clamp(44px,9vw,86px);line-height:1;margin:16px 0 10px;
  background:linear-gradient(100deg,#efe9db 12%,#e0b44f 46%,#e0684f 60%,#efe9db 88%);
  -webkit-background-clip:text;background-clip:text;color:transparent;background-size:220% 100%;animation:shimmer 7s linear infinite}
@keyframes shimmer{to{background-position:-220% 0}}
.sub{color:var(--dim);font-size:13.5px;letter-spacing:.04em;line-height:1.9;font-weight:300}
.idline{display:flex;flex-wrap:wrap;gap:8px 22px;margin:22px 0 8px;color:#cfc9ba;font-family:'Cormorant Garamond',serif;font-size:14px;letter-spacing:.05em}
.idline i{font-style:normal;color:var(--dim);font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin-right:6px;font-family:'Noto Serif SC',serif}
.card{margin-top:30px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01));backdrop-filter:blur(3px);padding:26px;opacity:0;animation:up .9s .28s forwards;box-shadow:0 30px 80px -40px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.05)}
.sec-t{font-family:'Cormorant Garamond',serif;letter-spacing:.3em;color:var(--gold);font-size:12px;text-transform:uppercase;margin-bottom:18px;display:flex;align-items:center;gap:12px}
.sec-t::after{content:'';height:1px;flex:1;background:linear-gradient(90deg,var(--line),transparent)}
.pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.pillar{position:relative;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px 8px 14px;text-align:center;opacity:0;transform:translateY(16px);animation:up .7s forwards;transition:transform .35s,border-color .35s,box-shadow .35s}
.pillar:hover{transform:translateY(-4px);border-color:rgba(224,180,79,.5);box-shadow:0 16px 40px -20px rgba(224,180,79,.5)}
.pillar:nth-child(1){animation-delay:.4s}.pillar:nth-child(2){animation-delay:.5s}.pillar:nth-child(3){animation-delay:.6s}.pillar:nth-child(4){animation-delay:.7s}
.pillar.day{border-color:rgba(224,180,79,.55);background:radial-gradient(120% 80% at 50% 0%,rgba(224,180,79,.12),transparent 70%)}
.role{font-size:14px;letter-spacing:.2em}.role span{display:block;font-family:'Cormorant Garamond',serif;font-size:10.5px;letter-spacing:.24em;color:var(--dim);margin-bottom:2px}
.ten{font-size:12px;color:var(--dim);margin-top:4px;letter-spacing:.06em}
.stem,.branch{font-size:clamp(34px,6vw,50px);font-weight:600;line-height:1.08;text-shadow:0 0 24px currentColor}
.hidden{display:flex;justify-content:center;gap:6px;margin-top:8px;font-size:13px;min-height:16px}
.hidden i{display:block;font-style:normal;font-size:12px;color:var(--dim)}
.meta{font-size:12px;color:#bab4a5;margin-top:6px;letter-spacing:.05em}.meta.dim{color:var(--dim);font-size:12px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:22px}
@media(max-width:680px){.two{grid-template-columns:1fr}.pillars{grid-template-columns:repeat(2,1fr)}}
.ring-donut-wrap{position:relative;width:100%;max-width:330px;margin:0 auto;aspect-ratio:1}
.ring-orbit{position:absolute;inset:7%;border-radius:50%;border:1px dashed rgba(224,180,79,.35)}
.ring-donut{position:absolute;inset:15%;border-radius:50%;-webkit-mask:radial-gradient(circle at 50% 50%,transparent 0 52%,#000 53% 100%);mask:radial-gradient(circle at 50% 50%,transparent 0 52%,#000 53% 100%);filter:drop-shadow(0 0 16px rgba(224,180,79,.25));animation:spin 90s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.ring-lbl{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.1;text-align:center;white-space:nowrap}
.ring-lbl .rlbl{font-family:'Noto Serif SC',serif;font-size:15px;font-weight:600}
.ring-lbl .rval{font-family:'Cormorant Garamond',serif;font-size:12px;color:#a8a293}
.ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none}
.ring-center .rcap{font-family:'Cormorant Garamond',serif;font-size:10.5px;letter-spacing:.28em;color:#a8a293}
.ring-center .rcap2{font-family:'Cormorant Garamond',serif;font-size:12px;letter-spacing:.1em;color:#a8a293}
.ring-center .rchar{font-family:'Noto Serif SC',serif;font-size:56px;font-weight:700;line-height:1}
.brow{display:grid;grid-template-columns:44px 1fr 90px;align-items:center;gap:12px;margin:13px 0}
.bn{font-size:15px;font-weight:600}
.btrack{height:7px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden}
.bfill{height:100%;border-radius:99px;transform-origin:left;transform:scaleX(0);animation:grow 1.1s cubic-bezier(.22,1,.36,1) forwards}
@keyframes grow{to{transform:scaleX(1)}}
.bv{font-family:'Cormorant Garamond',serif;font-size:13px;color:#cfc9ba;text-align:right}
.luckrow{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}
.lk{flex:0 0 auto;min-width:74px;text-align:center;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px 6px;transition:.3s}
.lk.cur{border-color:var(--gold);background:radial-gradient(120% 80% at 50% 0%,rgba(224,180,79,.14),transparent)}
.lka{font-size:12px;color:var(--dim);font-family:'Cormorant Garamond',serif}
.lkg b{display:block;font-size:23px;line-height:1.05}
.lky{font-size:12px;color:var(--dim);font-family:'Cormorant Garamond',serif;margin-top:3px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;margin-top:22px}
.stat{background:#111214;padding:15px 16px}
.stat .k{font-size:12px;color:var(--dim);letter-spacing:.12em}.stat .v{font-size:22px;font-weight:600;letter-spacing:.08em;margin-top:4px}
.foot{margin-top:26px;color:var(--dim);font-size:12px;letter-spacing:.06em;line-height:1.9;border-top:1px solid var(--line);padding-top:16px;opacity:0;animation:up .9s .9s forwards}
.foot b{color:#cfc9ba;font-weight:500}
@keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
</style></head>
<body>
<canvas id="stars"></canvas><div class="aurora"></div>
<div class="wrap">
  <div class="brand"><div class="seal">八</div><div><b>四柱</b><span>BAZI · ATELIER</span></div></div>
  <div class="hero">
    <div class="eyebrow">THE FOUR PILLARS · 子平八字</div>
    <h1>${gzAll}</h1>
    <div class="sub">${esc(r.dayMaster.yinYang)}${esc(r.dayMaster.element)}日主 · 生于${r.pillars[1].zhi}月（${
    r.jieQi.monthJie
  }后）</div>
    <div class="idline">
      <span><i>公历</i>${r.solarText}</span>
      <span><i>农历</i>${r.lunarText.replace('农历 ', '')}</span>
      <span><i>生肖</i>${r.zodiac}</span>
      <span><i>星座</i>${r.constellation}</span>
      <span><i>日空</i>${r.dayXunKong}</span>
    </div>
  </div>

  <div class="card">
    <div class="sec-t">FOUR PILLARS · 四柱</div>
    <div class="pillars">${pillars}</div>
  </div>

  <div class="two">
    <div class="card" style="animation-delay:.42s">
      <div class="sec-t">FIVE ELEMENTS · 五行</div>
      ${ringSVG(r)}
    </div>
    <div class="card" style="animation-delay:.5s">
      <div class="sec-t">DISTRIBUTION · 五行分布</div>
      ${bars}
    </div>
  </div>

  <div class="card" style="animation-delay:.6s">
    <div class="sec-t">LUCK PILLARS · 大运</div>
    <div class="luckrow">${luck}</div>
  </div>

  <div class="card" style="animation-delay:.68s">
    <div class="sec-t">PARAMETERS · 命盘参数</div>
    <div class="stats">
      <div class="stat"><div class="k">胎元 TAIYUAN</div><div class="v">${r.taiYuan}</div></div>
      <div class="stat"><div class="k">命宫 MINGGONG</div><div class="v">${r.mingGong}</div></div>
      <div class="stat"><div class="k">身宫 SHENGONG</div><div class="v">${r.shenGong}</div></div>
      <div class="stat"><div class="k">胎息 TAIXI</div><div class="v">${r.taiXi}</div></div>
    </div>
  </div>

  <div class="foot">
    <b>计算口径</b>：立春换年 · 节气换月 · 干支纪日 · 真太阳时${
      r.tst.applied ? `开（${r.input.cityName || '出生地点'}，校正 ${r.tst.deltaMinutes.toFixed(1)} 分）` : '关'
    } · 子时${r.input.zishiSect === 1 ? '23:00' : '00:00'}换日 · 有效时刻 ${r.effective.y}-${String(
    r.effective.m
  ).padStart(2, '0')}-${String(r.effective.d).padStart(2, '0')} ${String(r.effective.hh).padStart(2, '0')}:${String(
    r.effective.mm
  ).padStart(2, '0')}<br>
    由「四柱 · 八字排盘 ATELIER」导出 · lunar-javascript 1.7.8 · 准确为先，审美其后。
  </div>
</div>
<script>
(function(){
  var c=document.getElementById('stars'),x=c.getContext('2d'),W,H,stars=[];
  function size(){W=c.width=innerWidth;H=c.height=innerHeight;stars=[];for(var i=0;i<150;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.3+.2,s:Math.random()*.35+.05,a:Math.random()});}
  size();addEventListener('resize',size);
  (function loop(){x.clearRect(0,0,W,H);for(var i=0;i<stars.length;i++){var st=stars[i];st.y-=st.s;if(st.y<0)st.y=H;st.a+=.01;var al=.35+.35*Math.sin(st.a);x.beginPath();x.arc(st.x,st.y,st.r,0,7);x.fillStyle='rgba(224,180,79,'+al+')';x.fill();}requestAnimationFrame(loop);})();
})();
</script>
</body></html>`;
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
