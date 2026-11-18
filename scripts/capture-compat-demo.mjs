/* 介绍页合盘截图（先启动 dev，可用 BASE / CHROME_PATH / OUT 覆盖）。 */
import puppeteer from 'puppeteer-core';
import { DEMO_PARTNER, DEMO_QUERY } from './demo-birth.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const OUT = process.env.OUT || 'docs/assets/11-compat-result-d.png';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`${BASE}/?${DEMO_QUERY}`, { waitUntil: 'networkidle2' });
  await page.click('.compat-btn');
  await page.waitForSelector('.compat-setup');

  const partner = new URLSearchParams(DEMO_PARTNER);
  const gender = partner.get('g') === 'female' ? '坤造 · 女' : '乾造 · 男';
  await page.locator(`.compat-setup ::-p-text(${gender})`).click();
  for (const [selector, value] of [
    ['.w-year input', partner.get('y')],
    ['.w-month input', partner.get('m')],
    ['.w-day input', partner.get('d')],
    ['.cm-num:nth-of-type(1)', partner.get('h')],
    ['.cm-num:nth-of-type(2)', partner.get('mi')],
  ]) {
    await page.locator(`.compat-setup ${selector}`).fill(value);
    await page.keyboard.press('Tab');
  }
  await page.click('.cm-run');
  await page.waitForSelector('.cm-sides');
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    await document.fonts.ready;
  });
  await page.screenshot({ path: OUT });
  console.log(`已生成：${OUT}`);
} finally {
  await browser.close();
}
