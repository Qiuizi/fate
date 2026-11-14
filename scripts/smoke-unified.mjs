import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:5173';
let failed = 0;
const expect = (name, cond, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ' ' + extra}`);
  if (!cond) failed += 1;
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('CONSOLE: ' + m.text().slice(0, 180)); });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });

await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 500));
expect('首页三个模块卡', (await page.$$('.portal-card')).length === 3);
expect('顶栏三个模块页签', (await page.$$('.uni-tab')).length === 3);

const clickTab = async (text) => {
  await page.evaluate((t) => [...document.querySelectorAll('.uni-tab')].find((n) => n.textContent?.includes(t))?.click(), text);
  await new Promise((r) => setTimeout(r, 500));
};

await clickTab('八字');
expect('八字页无自身顶栏', (await page.$$('.uni-view:not([hidden]) header.topbar')).length === 0);
expect('八字表单存在', !!(await page.$('.form-wrap .btn-primary')));
await page.click('.form-wrap .btn-primary');
await new Promise((r) => setTimeout(r, 1800));
expect('八字排盘出结果', !!(await page.$('.result')));
await page.click('.uni-history');
await new Promise((r) => setTimeout(r, 300));
expect('历史弹窗可打开', !!(await page.$('.hm-overlay')));
await page.click('.hm-close');
await new Promise((r) => setTimeout(r, 200));

await clickTab('易经');
await new Promise((r) => setTimeout(r, 900));
expect('易经页出现', !!(await page.$('.yijing-module .card')));
await page.click('.yijing-module .go');
await new Promise((r) => setTimeout(r, 900));
const reading = await page.evaluate(() => ({
  text: document.querySelector('.yijing-module')?.textContent || '',
  rows: document.querySelectorAll('.yijing-module table tbody tr').length,
  passes: document.querySelectorAll('.yijing-module .pass').length,
}));
expect('起卦出取辞', reading.text.includes('取辞') && reading.passes > 0);
expect('纳甲有十二行（本卦+之卦）', reading.rows >= 12, `got ${reading.rows}`);
expect('用神与冲合出现', reading.text.includes('用神与冲合'));

await page.evaluate(() => [...document.querySelectorAll('.yijing-module .tabs button')].find((n) => n.textContent?.includes('六十四卦'))?.click());
await new Promise((r) => setTimeout(r, 400));
expect('六十四卦图', (await page.$$('.yijing-module .atlas button')).length === 64);

await clickTab('紫微');
await new Promise((r) => setTimeout(r, 2200));
const frame = page.frames().find((f) => f.url().includes('/ziwei/index.html'));
expect('紫微 iframe 已加载', !!frame, page.frames().map((f) => f.url()).join(','));
if (frame) {
  await frame.waitForSelector('.hero-title, .bazi-card, .ziwei-form', { timeout: 8000 }).catch(() => {});
  const zi = await frame.evaluate(() => ({
    text: document.body.innerText.slice(0, 120),
    ownHeader: !!document.querySelector('header.topbar'),
    title: document.title,
  }));
  expect('紫微内容渲染', zi.text.includes('紫微') || zi.text.includes('输入生辰'), zi.text);
  expect('紫微嵌入时隐藏自身顶栏', !zi.ownHeader);
}

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await clickTab('易经');
await new Promise((r) => setTimeout(r, 500));
const mobile = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  nav: document.querySelectorAll('.uni-tab').length,
}));
expect('移动端无横向溢出', mobile.overflow <= 0, `overflow ${mobile.overflow}`);

expect('无页面错误', errors.length === 0, errors.join(' | '));
await browser.close();
process.exit(failed ? 1 : 0);
