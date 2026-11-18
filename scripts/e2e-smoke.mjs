/* E2E 冒烟测试：需先启动 dev 服务器（默认 http://127.0.0.1:5173）
 * 用法：pnpm test:e2e   （可用 BASE 覆盖地址，CHROME_PATH 覆盖浏览器路径）
 */
import puppeteer from 'puppeteer-core';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:5173';

let failed = 0;
const expect = (name, cond, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ' ' + extra}`);
  if (!cond) failed++;
};

const downloadDir = mkdtempSync(path.join(tmpdir(), 'fate-e2e-'));
async function waitForFile(namePrefix, ext, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const f = readdirSync(downloadDir).find((x) => x.startsWith(namePrefix) && x.endsWith(ext));
    if (f && statSync(path.join(downloadDir, f)).size > 0) return { name: f, text: readFileSync(path.join(downloadDir, f), 'utf8') };
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}
async function waitForPdf(namePrefix, timeoutMs = 60000) {
  const end = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < end) {
    const files = readdirSync(downloadDir).filter(
      (f) => f.startsWith(namePrefix) && f.toLowerCase().endsWith('.pdf')
    );
    if (files.length) {
      const full = path.join(downloadDir, files[0]);
      const size = statSync(full).size;
      if (size > 0 && size === last) return { name: files[0], size };
      last = size;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const errs = [];
await b.defaultBrowserContext().overridePermissions(new URL(BASE).origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
const p = await b.newPage();
const cdp = await p.createCDPSession();
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });
p.on('pageerror', (e) => errs.push('PAGE:' + e.message));
p.on('console', (m) => {
  if (m.type() === 'error') errs.push('CONSOLE:' + m.text().slice(0, 160));
});
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });

try {
  await p.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 600));
  await p.evaluate(() => [...document.querySelectorAll('.uni-tab')].find((n) => n.textContent?.includes('八字'))?.click());
  await new Promise((r) => setTimeout(r, 500));
  const input = await p.evaluate(() => ({
    year: !!document.querySelector('.dfield.w-year .ti'),
    chips: document.querySelectorAll('.chip').length,
    submit: !!document.querySelector('.btn-primary'),
  }));
  expect('输入页：年份可输入', input.year);
  expect('输入页：12 时辰', input.chips === 12, `got ${input.chips}`);

  await p.evaluate(() => document.querySelector('.form-wrap .btn-primary').click());
  await new Promise((r) => setTimeout(r, 1500));
  const res = await p.evaluate(() => ({
    result: !!document.querySelector('.result'),
    secs: ['sec-pillars', 'sec-luck', 'sec-classics', 'sec-params', 'sec-receipt'].filter((id) => document.getElementById(id)).length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect('结果页渲染', res.result);
  expect('结果页 5 章节', res.secs === 5, `got ${res.secs}`);
  expect('结果页无横向溢出', res.overflow <= 0, `overflow ${res.overflow}`);

  // 下钻
  for (const [col, idx] of [[0, 1], [1, 2], [2, 1], [3, 1], [4, 2]]) {
    await p.evaluate((c, i) => { const col = document.querySelectorAll('.tf-col')[c]; col.querySelectorAll('.tf-item')[i]?.click(); }, col, idx);
    await new Promise((r) => setTimeout(r, 110));
  }
  const drill = await p.evaluate(() => ({ cols: document.querySelectorAll('.tf-col').length, hour: !!document.querySelector('.hour-detail'), period: !!document.querySelector('.period-detail') }));
  expect('时间轴 5 列', drill.cols === 5, `got ${drill.cols}`);
  expect('流时细论', drill.hour);
  expect('流年/流月联动断语', drill.period);

  // 古籍断语
  await p.evaluate(() => document.querySelectorAll('.ct-chip')[2]?.click());
  await new Promise((r) => setTimeout(r, 200));
  const cl = await p.evaluate(() => ({ sec: !!document.querySelector('.classic-sec'), btns: document.querySelectorAll('.vbook-bar .ref-link').length }));
  expect('断语点击展开', cl.sec);
  expect('命书导出按钮', cl.btns >= 2, `got ${cl.btns}`);

  // 命书 PDF 导出：html2pdf 需真实文档流高度，不能只有一页白纸（旧问题约 3KB）
  await p.evaluate(() =>
    [...document.querySelectorAll('.vbook-bar .ref-link')].find((x) => x.textContent?.includes('下载命书PDF'))?.click()
  );
  const bookPdf = await waitForPdf('命书');
  expect('命书 PDF 下载 > 50KB', !!bookPdf && bookPdf.size > 50 * 1024, JSON.stringify(bookPdf));

  // 导出菜单层级
  await p.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 120));
  await p.evaluate(() => document.querySelector('.export-btn').click());
  await new Promise((r) => setTimeout(r, 150));
  const ex = await p.evaluate(() => {
    const pop = document.querySelector('.export-pop');
    if (!pop) return { ok: false };
    const btns = [...pop.querySelectorAll('button')];
    const rb = Number(getComputedStyle(document.querySelector('.result-bar')).zIndex || 0);
    const nav = Number(getComputedStyle(document.querySelector('.sec-nav')).zIndex || 0);
    return { ok: btns.length >= 2, z: rb > nav };
  });
  expect('导出菜单两项且在最上层', ex.ok && ex.z);
  await p.evaluate(() => document.body.click());

  // 复制给 AI：剪贴板里的提示词 + JSON 必须与页面上显示的盘一致
  const shown = await p.evaluate(() => ({
    glyphs: [...document.querySelectorAll('.pg .pg-gan .glyph')].map((g) => g.firstChild?.textContent?.trim() || ''),
    shi: [...document.querySelectorAll('.pg .pg-head .shi')].map((x) => x.textContent?.trim()),
    luck: [...document.querySelectorAll('.tf-col:first-child .tf-item .tf-gz')].map((x) => x.textContent?.trim()),
  }));
  const openExport = async () => {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.evaluate(() => { if (!document.querySelector('.export-pop')) document.querySelector('.export-btn').click(); });
    await new Promise((r) => setTimeout(r, 150));
  };
  // 先下载 .json 作为数据基准，再核对剪贴板（精简版）与 .md（完整版）
  await openExport();
  await p.evaluate(() => document.querySelector('.export-pop .ai-json').click());
  const jsonFile = await waitForFile('八字AI解读', '.json');
  let aiJson = null;
  try { aiJson = JSON.parse(jsonFile.text); } catch {}
  const ps = aiJson ? Object.values(aiJson.pillars) : [];
  expect('命盘数据 .json：四柱与页面一致', ps.map((x) => x.stem).concat(ps.map((x) => x.branch)).join() === shown.glyphs.join(), `${ps.map((x) => x.ganZhi)} vs ${shown.glyphs}`);
  expect('命盘数据 .json：十神与大运与页面一致', !!aiJson && ps.map((x) => x.tenGod).join() === shown.shi.join() && aiJson.luck.pillars.map((l) => l.ganZhi).join() === shown.luck.join(), `${shown.shi} / ${shown.luck}`);
  await openExport();
  await p.evaluate(() => navigator.clipboard.writeText(''));
  await p.evaluate(() => document.querySelector('.export-pop .ai-copy').click());
  await new Promise((r) => setTimeout(r, 400));
  const aiText = (await p.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'); // Windows 剪贴板读回为 CRLF
  const toastAi = await p.evaluate(() => document.querySelector('.toast')?.textContent || '');
  const facts = ps.map((x) => x.ganZhi).concat(aiJson ? aiJson.luck.pillars.map((l) => l.ganZhi) : []);
  expect('复制给 AI：精简提示词含规则与全部四柱大运、不附 JSON', aiText.includes('不要重新排盘') && aiText.includes('## 我想问') && !aiText.includes('```json') && facts.length > 4 && facts.every((x) => aiText.includes(x)) && toastAi.includes('已复制给 AI'), `${aiText.length} ${toastAi}`);
  await openExport();
  await p.evaluate(() => document.querySelector('.export-pop .ai-copy-private').click());
  await new Promise((r) => setTimeout(r, 400));
  const privText = (await p.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'); // Windows 剪贴板读回为 CRLF
  const civil = aiJson?.subject?.input?.civilTime || '';
  expect('复制给 AI · 隐去生辰：不含出生日期时刻、保留四柱', !!civil && !privText.includes(civil.slice(0, 10)) && !privText.includes(civil.slice(11)) && ps.every((x) => privText.includes(x.ganZhi)), civil);
  await openExport();
  await p.evaluate(() => document.querySelector('.export-pop .ai-md').click());
  const mdFile = await waitForFile('八字AI解读', '.md');
  let mdJson = null;
  try { mdJson = JSON.parse((mdFile.text.match(/```json\n([\s\S]*?)\n```/) || [])[1]); } catch {}
  expect('AI 提示词 .md（完整版）：同一提示词并附与 .json 一致的数据', !!mdFile && mdFile.text.startsWith(aiText.split('## 计算口径')[0]) && JSON.stringify(mdJson) === JSON.stringify(aiJson), JSON.stringify({ md: mdFile?.name, json: jsonFile?.name }));

  // 展演
  await p.evaluate(() => document.querySelector('.showcase-btn').click());
  await new Promise((r) => setTimeout(r, 250));
  await p.evaluate(() => [...document.querySelectorAll('.showcase-tabs button')].find((x) => x.textContent.includes('竖排'))?.click());
  await new Promise((r) => setTimeout(r, 500));
  const sc = await p.evaluate(() => ({ tabs: document.querySelectorAll('.showcase-tabs button').length, len: (document.querySelector('.showcase iframe')?.getAttribute('srcdoc') || '').length }));
  expect('展演 3 标签', sc.tabs === 3, `got ${sc.tabs}`);
  expect('展演竖排命书加载', sc.len > 1000, `len ${sc.len}`);
  await p.evaluate(() => document.querySelector('.showcase-close').click());

  // 合盘
  await p.evaluate(() => document.querySelector('.compat-btn').click());
  await new Promise((r) => setTimeout(r, 900));
  await p.evaluate(() => document.querySelector('.cm-run').click());
  await new Promise((r) => setTimeout(r, 500));
  const cp = await p.evaluate(() => ({ page: !!document.querySelector('.compat-page'), dims: document.querySelectorAll('.cp-dim').length, ims: document.querySelectorAll('.im').length, lucks: !!document.querySelector('.cm-lucks') }));
  expect('合盘页渲染', cp.page);
  expect('合盘 7 维评分', cp.dims >= 7, `got ${cp.dims}`);
  expect('合盘双方对照', cp.ims === 2, `got ${cp.ims}`);
  expect('合盘大运同步', cp.lucks);
  await p.evaluate(() => navigator.clipboard.writeText(''));
  await p.evaluate(() => document.querySelector('.compat-bar .result-actions .cm-ai').click());
  await new Promise((r) => setTimeout(r, 400));
  const cmText = (await p.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'); // Windows 剪贴板读回为 CRLF
  const cmLabel = await p.evaluate(() => document.querySelector('.compat-bar .result-actions .cm-ai')?.textContent || '');
  expect('合盘复制给 AI：含双方命盘、隐去生辰', cmText.includes('八字合盘解读') && ps.every((x) => cmText.includes(x.ganZhi)) && !!civil && !cmText.includes(civil.slice(0, 10)) && cmLabel.includes('已复制'), cmLabel);

  // 合盘 PDF 导出：同样断言不是空白小文件
  await p.evaluate(() =>
    [...document.querySelectorAll('.cm-actions button')].find((x) => x.textContent?.includes('导出PDF'))?.click()
  );
  const compatPdf = await waitForPdf('合盘报告');
  expect('合盘 PDF 下载 > 50KB', !!compatPdf && compatPdf.size > 50 * 1024, JSON.stringify(compatPdf));

  await p.evaluate(() => [...document.querySelectorAll('.compat-bar button')][0].click());
  await new Promise((r) => setTimeout(r, 900));

  // 历史
  await p.evaluate(() => document.querySelector('.uni-history').click());
  await new Promise((r) => setTimeout(r, 250));
  const hm = await p.evaluate(() => ({ panel: !!document.querySelector('.hm-panel'), tools: document.querySelectorAll('.hm-tool').length }));
  expect('历史面板+备份工具', hm.panel && hm.tools === 3, `tools ${hm.tools}`);
  await p.evaluate(() => document.querySelector('.hm-close').click());

  expect('无控制台报错', errs.length === 0, JSON.stringify(errs.slice(0, 3)));

  // 表单：时、分可填 00；夏令时「减 1 小时」跨日时日期一起退回
  const pf = await b.newPage();
  pf.on('pageerror', (e) => errs.push('PAGE:' + e.message));
  await pf.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  await pf.goto(BASE + '/?mod=bazi', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 600));
  const typeInto = async (sel, val) => {
    const h = await pf.$(sel);
    await h.click();
    await pf.keyboard.down('Control');
    await pf.keyboard.press('KeyA');
    await pf.keyboard.up('Control');
    await pf.keyboard.press('Backspace');
    await h.type(String(val));
    await pf.keyboard.press('Enter');
    await pf.mouse.click(5, 5);
    await new Promise((r) => setTimeout(r, 150));
  };
  const setForm = async (y, m, d, hh, mi) => {
    await typeInto('.form-card .w-year input', y);
    await typeInto('.form-card .w-month input', m);
    await typeInto('.form-card .w-day input', d);
    await typeInto('.form-card .w-h input', hh);
    await typeInto('.form-card .w-mi input', mi);
  };
  const formVals = () =>
    pf.evaluate(() => ['.w-year', '.w-month', '.w-day', '.w-h', '.w-mi'].map((q) => document.querySelector(`.form-card ${q} input`)?.value).join('|'));
  await setForm(2000, 1, 1, '00', '00');
  expect('表单时、分可填 00', (await formVals()) === '2000|01|01|00|00', await formVals());
  await pf.evaluate(() => document.querySelector('.form-wrap .btn-primary').click());
  await new Promise((r) => setTimeout(r, 1200));
  const zeroRes = await pf.evaluate(() => document.querySelector('.result')?.innerText || '');
  expect('00:00 能正常排盘', /2000-01-01 00:00/.test(zeroRes), zeroRes.slice(0, 160));

  await pf.goto(BASE + '/?mod=bazi', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 600));
  await setForm(1988, 6, 15, '00', '30');
  const dstHint = await pf.evaluate(() => [...document.querySelectorAll('.form-card .cm-hint')].some((x) => x.textContent.includes('夏令时')));
  expect('1988-06-15 00:30 出现夏令时提示', dstHint);
  await pf.evaluate(() => [...document.querySelectorAll('.form-card .cm-hint button')].find((x) => x.textContent.includes('减 1 小时'))?.click());
  await new Promise((r) => setTimeout(r, 300));
  expect('减 1 小时跨日退到 1988-06-14 23:30', (await formVals()) === '1988|06|14|23|30', await formVals());
  const adjusted = await pf.evaluate(() => [...document.querySelectorAll('.form-card .cm-hint')].some((x) => x.textContent.includes('已按标准时间调整')));
  expect('调整后提示变为「已按标准时间调整」', adjusted);
  await pf.close();

  // 手机端
  const pm = await b.newPage();
  await pm.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await pm.goto(BASE + '/?y=1986&m=5&d=29&h=10&mi=30&g=male', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 500));
  const mob = await pm.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect('手机端无横向溢出', mob <= 0, `overflow ${mob}`);
} catch (e) {
  failed++;
  console.error('E2E 异常：', e.message);
} finally {
  await b.close();
}

if (failed) {
  console.error(`\nE2E 失败 ${failed} 项`);
  process.exit(1);
} else {
  console.log('\nE2E 全部通过 ✓');
}
