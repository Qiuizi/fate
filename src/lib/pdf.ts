import { BaziResult } from './bazi';
import { buildClassicBook } from './classics';
import { ELEMENT_META } from './elements';
import { CompatResult } from './compat';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CN = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾', '拾壹', '拾贰', '拾叁', '拾肆'];

/** 仅 PDF 临时容器使用的作用域类名；下方分页样式只在该容器内生效，屏幕页面样式不变。 */
const PDF_SCOPE = 'fate-pdf-doc';
/** 不允许被分页从中间切开的块：引文、段落、章节标题 + 首段、卡片（合盘维度卡 / 双方命盘卡 / 总评框）、表格行。 */
const PDF_AVOID = ['blockquote', 'p', 'h2', '.pdf-keep', '.pdf-card', 'tr'];
const PDF_STYLE = `<style>${PDF_AVOID.map((sel) => `.${PDF_SCOPE} ${sel}`).join(',')}{break-inside:avoid;page-break-inside:avoid;}</style>`;

/**
 * 创建 PDF 渲染容器：外层固定在视口外（用户看不见），内层保持 normal flow。
 * 内层不能用 position:fixed / z-index:-1 —— html2pdf 克隆时会按视口高度计算，导致导出只有一页白纸。
 */
function createPdfStage(lineHeight: number) {
  const stage = document.createElement('div');
  stage.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;';
  stage.setAttribute('aria-hidden', 'true');
  const wrap = document.createElement('div');
  wrap.className = PDF_SCOPE;
  wrap.style.cssText =
    'position:relative;width:760px;padding:44px 46px;background:#ffffff;color:#1b1b1f;' +
    `font-family:"Noto Serif SC","Songti SC",serif;line-height:${lineHeight};`;
  stage.appendChild(wrap);
  document.body.appendChild(stage);
  return { stage, wrap };
}

/** 用 html2pdf 渲染并下载；无论成功或失败都移除临时节点。 */
async function renderPdf(html: string, filename: string, lineHeight: number) {
  const { stage, wrap } = createPdfStage(lineHeight);
  try {
    wrap.innerHTML = PDF_STYLE + html;
    // 等待字体就绪
    try {
      await (document as any).fonts?.ready;
    } catch {
      /* ignore */
    }
    await new Promise((res) => setTimeout(res, 60));
    const html2pdf = (await import('html2pdf.js')).default as any;
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: PDF_AVOID.map((sel) => `.${PDF_SCOPE} ${sel}`) },
      })
      .from(wrap)
      .save();
  } finally {
    stage.remove();
  }
}

/** 直接下载横排命书 PDF（html2pdf 渲染成图，中文不走字体嵌入，避免乱码） */
export async function exportBookPDF(
  r: BaziResult,
  opts: { fontSizePt?: number; includePreface?: boolean } = {},
  filename = '命书.pdf'
) {
  const fs = opts.fontSizePt || 13.5;
  const dm = `${r.dayMaster.gan}${r.dayMaster.element}`;
  const year = new Date().getFullYear();
  const sections = buildClassicBook(r);

  const para = (p: { quote?: boolean; text: string }) =>
    p.quote
      ? `<blockquote style="margin:10px 0;padding:4px 0 4px 14px;border-left:2px solid #a67c2e;font-size:${fs + 1}px;color:#161619;">「${esc(p.text)}」</blockquote>`
      : `<p style="margin:8px 0;font-size:${fs}px;color:#2a2a2f;text-align:justify;">${esc(p.text)}</p>`;

  // 章节标题与第一段放进同一个 pdf-keep 块，避免标题孤零零留在页底
  const secHtml = sections
    .map(
      (s, i) => `<section style="margin-bottom:20px;">
      <div class="pdf-keep"><h2 style="font-size:${fs + 2}px;letter-spacing:.12em;margin:0 0 8px;border-bottom:1px solid #e4e1d8;padding-bottom:7px;color:#1b1b1f;">
        <span style="color:#a67c2e;font-size:${fs - 1.5}px;margin-right:8px;">${CN[i] || ''}</span>${esc(s.title)}
        <em style="float:right;font-style:normal;font-size:10.5px;color:#6b6a66;letter-spacing:.05em;">${esc(s.source)}</em>
      </h2>${s.paragraphs.slice(0, 1).map(para).join('')}</div>
      ${s.paragraphs.slice(1).map(para).join('')}
    </section>`
    )
    .join('');

  const essay = (title: string, body: string, sign: string) => `<section style="margin-bottom:20px;">
      <h2 style="font-size:${fs + 3}px;letter-spacing:.3em;margin:0 0 10px;color:#7a1f16;">${title}</h2>
      <p style="margin:8px 0;font-size:${fs}px;color:#2a2a2f;text-align:justify;">${esc(body)}</p>
      <p style="margin:12px 0 0;font-size:${fs - 2}px;color:#6b6a66;text-align:right;letter-spacing:.1em;">${sign}</p>
    </section>`;

  const prefaceHtml = opts.includePreface
    ? essay(
        '序',
        `夫命者，禀天地之气而立；五行布而性情分，十神列而人事见。今取${dm}日主之盘，参其四柱、五行、十神、大运，稽诸古籍，勒为此编。语多摭拾，聊备观览，庶几有助自省云尔。`,
        `岁在 ${year} · 谨序`
      )
    : '';
  const colophonHtml = opts.includePreface
    ? essay(
        '题跋',
        '右命书一卷，凡十三篇，皆本古法参论而成。命之理微，非一言可尽；此编所及，祇其大略。读者取会其通，不执一端，则近道矣。',
        `岁在 ${year} · 谨识`
      )
    : '';

  const html = `
    <h1 style="font-size:32px;letter-spacing:.5em;text-align:center;margin:0 0 6px;font-weight:700;">命 书</h1>
    <div style="text-align:center;color:#6b6a66;font-size:12px;letter-spacing:.08em;">${esc(r.solarText)} · 四柱 ${r.pillars
      .map((p) => p.ganZhi)
      .join(' ')} · 日主 ${r.dayMaster.gan}${r.dayMaster.element}</div>
    <div style="height:1px;background:#e4e1d8;margin:16px 0 22px;"></div>
    ${prefaceHtml}
    ${secHtml}
    ${colophonHtml}
    <div style="margin-top:22px;padding-top:12px;border-top:1px solid #e4e1d8;color:#6b6a66;font-size:10.5px;text-align:center;">
      古籍断语为传统命理参考，非确定结论；原文以常见通行版本为准，扩展解读为参考。
    </div>`;

  await renderPdf(html, filename, 2);
}

/** 直接下载合盘报告 PDF（html2pdf 渲染成图，中文不乱码） */
export async function exportCompatPDF(a: BaziResult, b: BaziResult, res: CompatResult, filename = '合盘报告.pdf') {
  const side = (r: BaziResult, label: string) => `
    <div class="pdf-card" style="flex:1;border:1px solid #d8d4c8;border-radius:8px;padding:12px 14px;">
      <div style="font-size:12px;color:#6b6a66;letter-spacing:.08em;margin-bottom:6px;">${label}</div>
      <div style="font-size:12px;color:#3a3a3f;margin-bottom:8px;">日主 <b style="color:${ELEMENT_META[r.dayMaster.element].color}">${r.dayMaster.gan}</b>${r.dayMaster.element} · 生肖${r.pillars[0].zhi}</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          ${r.pillars
            .map(
              (p, i) => `<td style="text-align:center;padding:4px 2px;border-top:1px solid #ebe7dc;">
            <div style="font-size:9px;color:#9a968c;">${['年', '月', '日', '时'][i]}柱</div>
            <div style="font-size:18px;font-weight:600;line-height:1.15;"><b style="color:${ELEMENT_META[p.ganEl].color}">${p.gan}</b><b style="color:${ELEMENT_META[p.zhiEl].color}">${p.zhi}</b></div>
            <div style="font-size:9px;color:#6b6a66;">${esc(p.shiShen)}</div>
            <div style="font-size:10px;color:#6b6a66;">${p.hidden.map((h) => h.gan).join(' ')}</div>
            <div style="font-size:9px;color:#9a968c;">${esc(p.naYin)}</div>
          </td>`
            )
            .join('')}
        </tr>
      </table>
      <div style="margin-top:8px;font-size:9.5px;color:#6b6a66;line-height:1.7;">大运：${r.luck
        .slice(0, 8)
        .map((l) => `${l.ganZhi}（${l.startAge}）`)
        .join(' · ')}</div>
    </div>`;

  const dims = res.dims
    .map(
      (d) => `<div class="pdf-card" style="border:1px solid #e4e1d8;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:600;color:#1b1b1f;">${esc(d.title)}
          <span style="float:right;font-size:11px;padding:1px 8px;border-radius:10px;background:#f2eee2;color:#8a6a2e;">${d.tag} · ${d.score}</span>
        </div>
        <div style="font-size:12px;color:#3a3a3f;margin-top:4px;">${esc(d.text)}</div>
      </div>`
    )
    .join('');

  const html = `
    <h1 style="font-size:28px;letter-spacing:.4em;text-align:center;margin:0 0 4px;font-weight:700;">合盘 · 双人</h1>
    <div style="text-align:center;color:#6b6a66;font-size:11.5px;letter-spacing:.08em;margin-bottom:14px;">以双方八字参合 · 只作参考</div>
    <div class="pdf-card" style="display:flex;align-items:center;gap:16px;background:#f7f4ea;border:1px solid #e4e1d8;border-radius:10px;padding:14px 18px;margin-bottom:14px;">
      <div style="font-size:46px;font-weight:700;color:#a67c2e;line-height:1;">${res.score}</div>
      <div>
        <div style="font-size:14px;letter-spacing:.05em;">${esc(res.level)}</div>
        <div style="font-size:11px;color:#6b6a66;">综合契合度</div>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px;">${side(a, '本命 · 你')}${side(b, '对方')}</div>
    <div style="margin-bottom:12px;">${dims}</div>
    <div style="border:1px solid #e4e1d8;border-radius:8px;padding:12px 14px;">
      ${res.paragraphs.map((p) => `<p style="margin:6px 0;font-size:12px;color:#3a3a3f;text-align:justify;">${esc(p)}</p>`).join('')}
    </div>
    <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e4e1d8;color:#8a877e;font-size:10px;text-align:center;">合盘为传统命理参考，非确定结论；感情贵在经营与体谅。</div>`;

  await renderPdf(html, filename, 1.9);
}
