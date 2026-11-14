// Read-only browser audit. Install Playwright outside the production image.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.argv[2] || 'http://127.0.0.1:8080');
const output = resolve(process.argv[3] || 'mobile-audit');
if (!['http:', 'https:'].includes(base.protocol)) throw new Error('HTTP(S) base required');
const pages = [
  'temporada-2', 'temporada-2-en', 'guia', 'guia-comandos', 'guia-comandos-en',
  'guia-slimefun', 'guia-slimefun-en', 'guia-rangos', 'guia-rangos-en',
  'guia-poderes', 'guia-poderes-en', 'guia-plugins', 'guia-plugins-en',
  'wiki-slimefun', 'wiki-slimefun-en', 'votar', 'terms', 'terms-en', 'eventos',
  'apoya', 'apoya-en', 'metricas', 'metricas-en', 'store', 'index-en', 'saori',
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const width of [375, 393, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    // No forms, clicks, checkout, or requests that can write server state.
    await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    for (const slug of pages) {
      const page = await context.newPage();
      const errors = [];
      let cspErrors = 0;
      page.on('pageerror', error => errors.push(error.name));
      page.on('console', message => {
        if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) cspErrors++;
      });
      const row = { page: `${slug}.html`, width };
      try {
        const response = await page.goto(new URL(row.page, base).href, { waitUntil: 'load', timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(800);
        Object.assign(row, await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const label = el => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].slice(0, 2).map(c => `.${c}`).join('')}`;
          const visible = el => {
            const box = el.getBoundingClientRect(), css = getComputedStyle(el);
            return box.width > 0 && box.height > 0 && css.visibility === 'visible' && css.display !== 'none' && Number(css.opacity) !== 0;
          };
          const elements = [...document.body.querySelectorAll('*')].filter(visible);
          const smallText = elements.filter(el => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12);
          return {
            viewport,
            scrollWidth: document.documentElement.scrollWidth,
            overflow: elements.filter(el => {
              const box = el.getBoundingClientRect();
              return box.right > viewport + 1 || box.left < -1;
            }).slice(0, 25).map(label),
            smallTextCount: smallText.length,
            smallText: smallText.slice(0, 25).map(el => ({ selector: label(el), fontSize: getComputedStyle(el).fontSize })),
            canvases: [...document.querySelectorAll('canvas')].map(el => ({ selector: label(el), width: el.width, height: el.height, visible: visible(el) })),
            news: !!document.querySelector('#novedades'),
          };
        }));
        row.status = response?.status();
        row.errors = errors;
        row.cspErrors = cspErrors;
        await page.screenshot({ path: resolve(output, `${slug}-${width}.png`), animations: 'disabled', timeout: 15000 });
      } catch (error) {
        row.failure = error.name;
      }
      results.push(row);
      await page.close();
      console.log(JSON.stringify({ page: row.page, width, status: row.status, overflow: row.scrollWidth > row.viewport + 1, smallText: row.smallText?.length, failure: row.failure }));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const report = { base: base.href, generated: new Date().toISOString(), browser: 'Chromium', results };
await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
if (results.some(r => r.failure || r.status !== 200 || r.scrollWidth > r.viewport + 1 || r.errors.length || r.cspErrors)) process.exitCode = 1;
