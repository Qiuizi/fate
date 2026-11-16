import html2canvas from 'html2canvas';
import { BaziResult } from './bazi';
import { ELEMENT_META, ELEMENTS } from './elements';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 生成并下载一张命盘分享卡片 PNG（深色海报风） */
export async function exportShareCard(r: BaziResult, filename = '八字命盘.png') {
  const total = Object.values(r.weighted).reduce((a, b) => a + b, 0) || 1;
  const bars = ELEMENTS.map((el) => {
    const v = r.weighted[el];
    const pct = Math.round((v / total) * 100);
    const c = ELEMENT_META[el].color;
    return `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;">
      <span style="width:16px;color:${c};font-family:'Noto Serif SC',serif;font-size:14px;">${el}</span>
      <span style="flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:6px;overflow:hidden;">
        <span style="display:block;height:100%;width:${pct}%;background:${c};border-radius:6px;"></span>
      </span>
      <span style="width:58px;text-align:right;color:#a8a293;font-size:12px;font-family:'Cormorant Garamond',serif;">${v.toFixed(1)}·${pct}%</span>
    </div>`;
  }).join('');

  const pillars = r.pillars
    .map(
      (p, i) => `<div style="flex:1;text-align:center;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 4px;">
        <div style="font-size:12px;color:#8a877e;letter-spacing:.16em;margin-bottom:4px;">${['年', '月', '日', '时'][i]}柱</div>
        <div style="font-family:'Noto Serif SC',serif;font-size:26px;font-weight:700;line-height:1.1;">
          <span style="color:${ELEMENT_META[p.ganEl].color}">${p.gan}</span><span style="color:${ELEMENT_META[p.zhiEl].color}">${p.zhi}</span>
        </div>
        <div style="font-size:12px;color:#9d998f;margin-top:3px;">${esc(p.shiShen)}</div>
        <div style="font-size:12px;color:#8a877e;margin-top:2px;">${p.hidden.map((h) => h.gan).join(' ')}</div>
      </div>`
    )
    .join('');

  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;left:0;top:0;width:720px;z-index:-1;box-sizing:border-box;' +
    "padding:44px 46px;background:radial-gradient(120% 80% at 50% 0%,#1c1a17 0%,#0b0b0d 70%);color:#ece9e2;font-family:'Noto Sans SC',sans-serif;";

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:16px;">
      <div style="font-family:'Noto Serif SC',serif;font-size:18px;letter-spacing:.28em;color:#ece9e2;">四柱 · 八字</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:11px;letter-spacing:.3em;color:#c9a05a;">BAZI · ATELIER</div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:16px;margin:26px 0 8px;">
      <div style="font-family:'Noto Serif SC',serif;font-size:96px;font-weight:700;line-height:1;color:${ELEMENT_META[r.dayMaster.element].color};">${r.dayMaster.gan}</div>
      <div style="padding-bottom:10px;">
        <div style="font-size:15px;color:#d8d5ce;letter-spacing:.1em;">日主 · ${r.dayMaster.yinYang}${r.dayMaster.element}</div>
        <div style="font-size:12px;color:#9d998f;margin-top:4px;">生于 ${r.pillars[1].zhi}月 · 生肖 ${r.pillars[0].zhi}</div>
      </div>
    </div>
    <div style="font-size:12px;color:#9d998f;letter-spacing:.06em;margin-bottom:18px;">${esc(r.solarText)} · ${r.input.gender === 'male' ? '乾造（男）' : '坤造（女）'}</div>
    <div style="display:flex;gap:10px;margin-bottom:24px;">${pillars}</div>
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 18px;margin-bottom:24px;">
      <div style="font-family:'Cormorant Garamond',serif;font-size:12px;letter-spacing:.24em;color:#c9a05a;margin-bottom:8px;">FIVE ELEMENTS · 五行</div>
      ${bars}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.12);padding-top:14px;">
      <div style="font-size:12px;color:#8a877e;letter-spacing:.06em;line-height:1.7;">立春换年 · 节气换月 · 干支纪日<br/>真太阳时 · 子时换日口径</div>
      <div style="width:52px;height:52px;border:2px solid #a8322a;border-radius:3px;color:#a8322a;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700;transform:rotate(-4deg);">命</div>
    </div>`;

  document.body.appendChild(wrap);
  try {
    await (document as any).fonts?.ready;
  } catch {
    /* ignore */
  }
  await new Promise((res) => setTimeout(res, 60));
  try {
    const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    wrap.remove();
  }
}
