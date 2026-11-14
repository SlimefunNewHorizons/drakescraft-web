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
  'saori-en', 'grafos', 'novedades', 'novedades-en',
];
const selectedPages = process.env.AUDIT_PAGES ? process.env.AUDIT_PAGES.split(',') : pages;
const widths = process.env.AUDIT_WIDTHS ? process.env.AUDIT_WIDTHS.split(',').map(Number) : [375, 393, 412];
if (selectedPages.some(slug => !pages.includes(slug)) || widths.some(width => ![375, 393, 412].includes(width))) throw new Error('Unknown audit page or width');
const screenshots = process.env.AUDIT_SCREENSHOTS !== '0';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
let failures = 0;
const saveReport = complete => writeFile(resolve(output, 'report.json'), JSON.stringify({ base: base.href, generated: new Date().toISOString(), browser: 'Chromium', screenshots, complete, results }, null, 2) + '\n');
try {
  audit: for (const width of widths) {
    for (const slug of selectedPages) {
      // Each document starts without another page's cookies, storage or WebGL scene.
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      // No forms, clicks, checkout, or requests that can write server state.
      await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      let cspErrors = 0;
      page.on('pageerror', error => errors.push(error.name));
      page.on('console', message => {
        if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) cspErrors++;
      });
      const row = { page: `${slug}.html`, width, phase: 'navigation', timings: {} };
      results.push(row);
      const started = performance.now();
      const phase = name => { row.timings[row.phase] = Math.round(performance.now() - started); row.phase = name; };
      try {
        const response = await page.goto(new URL(row.page, base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        row.status = response?.status();
        phase('fonts');
        await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000 });
        phase('settle');
        await page.waitForTimeout(800);
        phase('measure');
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
            readyState: document.readyState,
            scrollWidth: document.documentElement.scrollWidth,
            overflow: elements.filter(el => {
              const box = el.getBoundingClientRect();
              return box.right > viewport + 1 || box.left < -1;
            }).slice(0, 25).map(label),
            smallTextCount: smallText.length,
            smallText: smallText.slice(0, 25).map(el => ({ selector: label(el), fontSize: getComputedStyle(el).fontSize })),
            canvases: [...document.querySelectorAll('canvas')].map(el => ({ selector: label(el), width: el.width, height: el.height, visible: visible(el) })),
            news: !!document.querySelector('#novedades'),
            newsCards: document.querySelectorAll('[data-news-list] .pt-item').length,
            solarHero: !!document.querySelector('.op-stage [data-emblem]'),
            graphViewers: document.querySelectorAll('[data-grafos]').length,
            language: document.documentElement.lang,
            languageBanner: !!document.querySelector('#dk-lang-banner'),
          };
        }));
        row.errors = [...errors];
        row.cspErrors = cspErrors;
        phase('screenshot');
        // Keep DOM evidence even if Chromium stalls while capturing a frame.
        await saveReport(false);
        if (screenshots) {
          await page.screenshot({ path: resolve(output, `${slug}-${width}.png`), animations: 'disabled', timeout: 45000 });
          row.screenshot = `${slug}-${width}.png`;
        }
        phase('complete');
      } catch (error) {
        failures++;
        row.failure = error.name;
        row.failurePhase = row.phase;
        row.captureLog = (error.message.split('Call log:')[1] || '').split('\n').map(line => line.trim()).filter(line => /^- (taking page screenshot|waiting for fonts to load|fonts loaded|disabled all CSS animations)/.test(line));
      } finally {
        await context.close();
      }
      await saveReport(false);
      console.log(JSON.stringify({ page: row.page, width, status: row.status, overflow: row.scrollWidth > row.viewport + 1, smallText: row.smallTextCount, failure: row.failure }));
      if (failures >= 2) {
        break audit;
      }
    }
  }
} finally {
  await browser.close();
}
await saveReport(results.length === selectedPages.length * widths.length && failures < 2);
if (results.some(r => r.failure || r.status !== 200 || r.scrollWidth > r.viewport + 1 || r.errors.length || r.cspErrors)) process.exitCode = 1;
