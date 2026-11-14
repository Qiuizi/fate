/* 竖排命书 → 整本长图（取 srcdoc 生成独立页面，逐页截图后纵向拼接）
 * 用法：pnpm export:vbook   （QUERY / OUT / BASE / CHROME_PATH 可覆盖）
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:5173';
const QUERY = process.env.QUERY || 'y=1986&m=5&d=29&h=10&mi=30&g=male';
const OUT = process.env.OUT || 'shots/vbook-long.png';
const PAGE_SEL = '.vcover, .vfrontis, .vpreface, .vtoc, .vspread';
const FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
try {
  // 1) 打开应用并取得竖排命书的 HTML
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/?${QUERY}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
  await page.evaluate(() => document.querySelector('.showcase-btn').click());
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.showcase-tabs button')];
    btns.find((x) => x.textContent.includes('竖排'))?.click();
  });
  await new Promise((r) => setTimeout(r, 700));
  let bookHtml = await page.evaluate(() => document.querySelector('.showcase iframe')?.getAttribute('srcdoc') || '');
  if (!bookHtml) throw new Error('未取到竖排命书 HTML');
  bookHtml = bookHtml.replace('<head>', '<head>' + FONT_LINK);

  // 2) 独立页面渲染（主文档，截图坐标正确）
  const bp = await browser.newPage();
  await bp.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.6 });
  await bp.setContent(bookHtml, { waitUntil: 'load' });
  try {
    await bp.evaluate(() => document.fonts && document.fonts.ready);
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 800));

  const pages = await bp.$$(PAGE_SEL);
  console.log('页数：', pages.length);
  const images = [];
  for (const h of pages) {
    const buf = await h.screenshot({ type: 'png' });
    images.push('data:image/png;base64,' + Buffer.from(buf).toString('base64'));
  }

  // 3) 纵向拼接
  const sp = await browser.newPage();
  const imgsHtml = images.map((src) => `<img src="${src}" style="display:block;width:1123px;" />`).join('');
  await sp.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#e9e3d4}img{display:block;margin:0 auto}</style></head>
     <body><div style="width:1123px;margin:0 auto;">${imgsHtml}</div></body></html>`,
    { waitUntil: 'load' }
  );
  await new Promise((r) => setTimeout(r, 400));
  const outDir = OUT.replace(/[\\/][^\\/]+$/, '');
  if (outDir && !fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await sp.setViewport({ width: 1123, height: 800, deviceScaleFactor: 1 });
  await sp.screenshot({ path: OUT, fullPage: true });
  console.log('已生成：', OUT, `（${pages.length} 页拼接）`);
} finally {
  await browser.close();
}
