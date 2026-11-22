// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/hero-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

test('solar hero: real ES/EN markup, canvas pixels and reduced motion at mobile widths', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 150000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      if (['/index.html', '/index-en.html'].includes(path)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        const hero = source.match(/<header class="(?:op-hero|home-hero)">[\s\S]*?<\/header>/)?.[0];
        assert.ok(hero, 'extract the actual hero without rewriting its structure');
        const styles = [...source.matchAll(/<link\b[^>]*>/g)].map(m => m[0])
          .filter(tag => /rel="stylesheet"/.test(tag) && /href="(?!https?:\/\/)/.test(tag));
        const scripts = [...source.matchAll(/<script\b[^>]*src="[^"]*\/hero-orbit\.js[^\"]*"[^>]*><\/script>/g)].map(m => m[0]);
        const body = source.match(/<body\b[^>]*>/)?.[0];
        assert.ok(body);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`<!doctype html><html lang="${path.includes('-en') ? 'en' : 'es'}">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styles.join('\n')}${body}<main>${hero}</main>${scripts.join('\n')}</body></html>`);
      }
      // Only public hero resources. No APIs, other scripts or arbitrary filesystem reads.
      if (!/^\/(?:(?:styles|css)\/[\w-]+\.css|vendor\/bootstrap\/bootstrap\.min\.css|scripts\/hero-orbit\.js|assets\/(?:[\w-]+\/)*[\w.-]+\.(?:webp|png|svg|woff2?))$/.test(path)) {
        res.writeHead(404).end(); return;
      }
      const content = await readFile(join(root, path.slice(1)));
      const mime = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'text/javascript'
        : path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.png') ? 'image/png'
        : path.endsWith('.webp') ? 'image/webp' : 'font/woff2';
      res.setHeader('Content-Type', mime);
      res.end(content);
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const report = [];
  let failures = 0;
  try {
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const lang of ['es', 'en']) {
      for (const width of [375, 393, 412]) {
        for (const motion of ['reduce', 'no-preference']) {
          await t.test(`${lang.toUpperCase()} ${width}px ${motion}: painted canvas and usable controls`, async () => {
            const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: motion });
            context.setDefaultTimeout(5000);
            const errors = [], failedResources = [];
            try {
              await context.route('**/*', route => route.request().url().startsWith(`${origin}/`) && route.request().method() === 'GET' ? route.continue() : route.abort());
              const page = await context.newPage();
              page.on('pageerror', error => errors.push(error.name));
              page.on('response', response => { if (response.status() >= 400) failedResources.push(new URL(response.url()).pathname); });
              const response = await page.goto(`${origin}/${lang === 'en' ? 'index-en.html' : 'index.html'}`, { waitUntil: 'load' });
              assert.equal(response.status(), 200);
              const canvas = page.locator('.op-stage.has-orbit [data-emblem]');
              await canvas.waitFor({ state: 'visible' });
              await canvas.scrollIntoViewIfNeeded();
              await page.waitForFunction(() => document.querySelector('.op-stage__logo')?.naturalWidth > 0);
              await page.waitForTimeout(300); // Let image, resize and intersection observers finish.
              const pixels = () => canvas.evaluate(el => {
                const data = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
                let hash = 2166136261, painted = 0;
                for (let i = 0; i < data.length; i++) {
                  hash = Math.imul(hash ^ data[i], 16777619);
                  if (i % 4 === 3 && data[i] > 0) painted++;
                }
                return { hash: hash >>> 0, painted, width: el.width, height: el.height };
              });
              const before = await pixels();
              await page.waitForTimeout(250);
              const after = await pixels();
              assert.ok(before.width > 100 && before.height > 100);
              assert.ok(before.painted > 1000, 'canvas must contain rendered pixels');
              assert.equal(before.hash === after.hash, motion === 'reduce', 'reduced motion stays still; normal motion animates');
              assert.equal(await canvas.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
              // Bedrock intentionally starts disabled until its separate API script runs.
              const controls = page.locator('header button:not(:disabled):not([aria-disabled="true"]), header a:not([aria-disabled="true"])');
              assert.ok(await controls.count() >= 3);
              for (const control of await controls.all()) {
                await control.scrollIntoViewIfNeeded();
                assert.ok(await control.evaluate(el => {
                  const box = el.getBoundingClientRect();
                  return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
                }), 'hero must not cover the controls');
              }
              assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
              assert.deepEqual(errors, []);
              assert.deepEqual(failedResources, [], 'all local fixture resources must load');
              report.push({ lang, width, motion, before, after, errors, failedResources });
              if (process.env.AUDIT_ARTIFACT_DIR) {
                await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
                await canvas.scrollIntoViewIfNeeded();
                await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `hero-${lang}-${width}-${motion}.png`), animations: 'disabled', timeout: 10000 });
              }
            } catch (error) {
              failures++;
              throw error;
            } finally {
              await context.close();
            }
          });
          if (failures >= 2 || t.signal.aborted) return;
        }
      }
    }
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'hero-report.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
});
