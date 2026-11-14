// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/news-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const payload = '<img src=x onerror="window.newsInjected=true">';
const body = `${payload}\n${'A long technical update with **bold text** and `item_id`. '.repeat(30)}`;
const fixtures = ['servidor', 'red', 'github'].map((tipo, i) => ({
  id: `fixture-${i}`, tipo, fecha: `2026-11-${String(13 - i * 4).padStart(2, '0')}T12:00:00Z`,
  titulo: `Actualización ${tipo}`, titulo_en: `Update ${tipo}`,
  cuerpo: body, cuerpo_en: body, fuente_url: 'https://example.invalid/update',
}));

test('news mobile: real page markup, styles and renderer without external services', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 60000,
}, async t => {
  assert.ok(fixtures.every(entry => Number.isFinite(Date.parse(entry.fecha))), 'fixtures must contain valid ISO dates');
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ headless: true });
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/data/novedades.json') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(fixtures));
      }
      if (['/novedades.html', '/novedades-en.html'].includes(path)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        const main = source.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
        assert.ok(main, 'use the real news page structure');
        const styles = [...source.matchAll(/<link\b[^>]*>/g)].map(m => m[0])
          .filter(tag => /rel="stylesheet"/.test(tag) && /href="\//.test(tag));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`<!doctype html><html lang="${path.includes('-en') ? 'en' : 'es'}">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styles.join('\n')}<body>${main}<script src="/scripts/novedades.js"></script></body></html>`);
      }
      // Serve only the renderer and its real local CSS; never expose arbitrary files.
      if (path !== '/scripts/novedades.js' && !/^\/styles\/[\w-]+\.css$/.test(path)) {
        res.writeHead(404); return res.end();
      }
      res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript');
      res.end(await readFile(join(root, path.slice(1))));
    } catch {
      res.writeHead(500); res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let failures = 0;
  try {
    for (const width of [375, 393, 412]) {
      for (const lang of ['es', 'en']) {
        await t.test(`${lang} at ${width}px: filters, expansion and inert external text`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          await context.route('**/*', route => {
            const req = route.request();
            return req.url().startsWith(`${origin}/`) && ['GET', 'HEAD'].includes(req.method()) ? route.continue() : route.abort();
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.name));
          try {
            const response = await page.goto(`${origin}/novedades${lang === 'en' ? '-en' : ''}.html`, { waitUntil: 'domcontentloaded' });
            assert.equal(response.status(), 200);
            await page.waitForFunction(() => document.querySelectorAll('.pt-item').length === 3);
            const chips = page.locator('[data-news-filter] button');
            assert.equal(await chips.count(), 4);
            assert.equal(await chips.first().textContent(), lang === 'en' ? 'All' : 'Todo');
            assert.equal(await page.locator('.pt-week').count(), 2, 'group entries by their actual week');
            for (const tipo of ['servidor', 'red', 'github']) {
              const chip = page.locator(`[data-news-filter] button[data-tipo="${tipo}"]`);
              await chip.click();
              assert.equal(await page.locator('.pt-item').count(), 1);
              assert.equal(await page.locator('.pt-item').getAttribute('data-tipo'), tipo);
              assert.equal(await chip.getAttribute('aria-pressed'), 'true');
              assert.equal(await page.locator('[data-news-filter] [aria-pressed="true"]').count(), 1);
              const card = page.locator('.pt-item');
              assert.equal(await card.locator('h3').textContent(), `${lang === 'en' ? 'Update' : 'Actualización'} ${tipo}`);
              assert.equal(await card.locator('.pt-body img').count(), 0);
              assert.ok((await card.locator('.pt-body').textContent()).includes(payload));
              assert.equal(await page.evaluate(() => window.newsInjected), undefined);
              const toggle = card.locator('.pt-toggle');
              await toggle.waitFor({ state: 'visible' });
              assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
              const collapsed = await card.locator('.pt-body').evaluate(el => el.clientHeight);
              await toggle.click();
              assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
              assert.equal(await toggle.textContent(), lang === 'en' ? 'Show less' : 'Ver menos');
              assert.ok(await card.locator('.pt-body').evaluate(el => el.clientHeight) > collapsed);
              await toggle.click();
              assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
              assert.equal(await toggle.textContent(), lang === 'en' ? 'Show more' : 'Ver más');
              const link = card.locator('.pt-src');
              assert.equal(await link.getAttribute('rel'), 'noopener');
              assert.equal(await link.getAttribute('href'), 'https://example.invalid/update');
            }
            await chips.first().click();
            assert.equal(await page.locator('.pt-item').count(), 3, 'All restores the complete feed');
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            assert.deepEqual(errors, []);
            if (process.env.AUDIT_ARTIFACT_DIR) {
              await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
              await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `news-fixture-${lang}-${width}.png`), animations: 'disabled', timeout: 10000 });
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
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
