// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/events-heading.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const documents = ['eventos.html', 'events-en.html', 'web/eventos.html', 'web/events-en.html'];

test('event heading: badge stays above cancelled and long titles in both document copies', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      const path = new URL(req.url, 'http://localhost').pathname.slice(1);
      if (documents.includes(path)) {
        const source = await readFile(join(root, path), 'utf8');
        // Keep the complete document and local styles; no API, global JS or remote fonts.
        const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
          .replace(/<link\b[^>]*href="https?:\/\/[^>]*>/g, '');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      } else if (/^(web\/)?styles\/[\w-]+\.css$/.test(path)
        || /^(web\/)?vendor\/bootstrap\/bootstrap.min.css$/.test(path)) {
        res.setHeader('Content-Type', 'text/css');
        res.end(await readFile(join(root, path)));
      } else res.writeHead(404).end();
    } catch { res.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  let browser, failures = 0;
  try {
    browser = await chromium.launch({ headless: true });
    for (const width of [375, 393, 412, 1280]) {
      for (const document of documents) {
        await t.test(`${document} at ${width}px`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          try {
            await context.route('**/*', route => route.request().url().startsWith(`${origin}/`)
              && route.request().method() === 'GET' ? route.continue() : route.abort());
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.name));
            assert.equal((await page.goto(`${origin}/${document}`, { waitUntil: 'load' })).status(), 200);
            const originalTitle = await page.locator('#today-title').textContent();
            assert.match(originalTitle, /cancel(?:ado|led)/i);
            assert.ok(await page.locator('link[rel="stylesheet"]').count() > 0);
            assert.equal(await page.evaluate(() => [...window.document.querySelectorAll('link[rel="stylesheet"]')]
              .every(link => link.sheet?.cssRules.length > 0)), true, 'load every local stylesheet');
            for (const scale of [1, 2]) {
              for (const state of ['cancelled', 'long-title']) {
                await page.evaluate(({ scale, state, originalTitle }) => {
                  window.document.documentElement.style.fontSize = `${scale * 100}%`;
                  window.document.querySelector('#today-title').textContent = state === 'cancelled'
                    ? originalTitle : `${window.document.documentElement.lang === 'en' ? 'Day 30: Synthetic event' : 'Día 30: Evento ficticio'} — ${'Slimefun '.repeat(12)}`;
                }, { scale, state, originalTitle });
                const layout = await page.evaluate(() => {
                  const box = window.document.querySelector('#evento-hoy');
                  const rect = box.getBoundingClientRect();
                  const parent = getComputedStyle(box);
                  const badge = getComputedStyle(box, '::before');
                  const title = window.document.querySelector('#today-title').getBoundingClientRect();
                  const px = (css, key) => parseFloat(css[key]) || 0;
                  const extra = badge.boxSizing === 'border-box' ? 0
                    : px(badge, 'paddingTop') + px(badge, 'paddingBottom') + px(badge, 'borderTopWidth') + px(badge, 'borderBottomWidth');
                  const top = rect.top + px(parent, 'borderTopWidth') + (badge.position === 'absolute'
                    ? px(badge, 'top') : px(parent, 'paddingTop') + px(badge, 'marginTop'));
                  return { gap: title.top - top - px(badge, 'height') - extra,
                    badgeWidth: px(badge, 'width'), titleHeight: title.height,
                    boxWidth: rect.width, documentWidth: window.document.documentElement.scrollWidth };
                });
                results.push({ document, width, scale, state, ...layout });
                assert.ok(layout.gap >= 1, `badge overlaps heading: ${JSON.stringify(layout)}`);
                assert.ok(layout.badgeWidth > 0 && layout.badgeWidth < layout.boxWidth, 'badge fits its container');
                if (scale === 1) assert.ok(layout.documentWidth <= width + 1, 'no horizontal document overflow at normal size');
                if (state === 'long-title') assert.ok(layout.titleHeight > 40, 'exercise a multiline heading');
                if (process.env.AUDIT_ARTIFACT_DIR && scale === 1 && state === 'cancelled') {
                  await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
                  await page.locator('#evento-hoy').scrollIntoViewIfNeeded();
                  await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR,
                    `${document.replaceAll('/', '-')}-${width}.png`), animations: 'disabled', timeout: 10000 });
                }
              }
            }
            assert.deepEqual(errors, []);
          } catch (error) { failures++; throw error; }
          finally { await context.close(); }
        });
        if (failures >= 2 || t.signal.aborted) return;
      }
    }
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'events-heading-report.json'),
        JSON.stringify({ complete: results.length === 64 && failures === 0, results }, null, 2) + '\n');
    }
  }
});
