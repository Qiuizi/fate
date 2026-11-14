/* E2E 冒烟测试：需先启动 dev 服务器（默认 http://127.0.0.1:5173）
 * 用法：pnpm test:e2e   （可用 BASE 覆盖地址，CHROME_PATH 覆盖浏览器路径）
 */
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:5173';

let failed = 0;
const expect = (name, cond, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ' ' + extra}`);
  if (!cond) failed++;
};

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const errs = [];
const p = await b.newPage();
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
  await p.evaluate(() => [...document.querySelectorAll('.compat-bar button')][0].click());
  await new Promise((r) => setTimeout(r, 900));

  // 历史
  await p.evaluate(() => document.querySelector('.uni-history').click());
  await new Promise((r) => setTimeout(r, 250));
  const hm = await p.evaluate(() => ({ panel: !!document.querySelector('.hm-panel'), tools: document.querySelectorAll('.hm-tool').length }));
  expect('历史面板+备份工具', hm.panel && hm.tools === 3, `tools ${hm.tools}`);
  await p.evaluate(() => document.querySelector('.hm-close').click());

  expect('无控制台报错', errs.length === 0, JSON.stringify(errs.slice(0, 3)));

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
