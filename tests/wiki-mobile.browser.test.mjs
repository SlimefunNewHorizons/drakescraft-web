// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/wiki-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const payload = '<img src=x onerror="window.wikiInjected=true">';
const items = Array.from({ length: 50 }, (_, i) => ({
  i: `QUANTUM_${i}`, n: `Quantum ${String(i).padStart(2, '0')}`, c: i % 2,
  m: 'enhanced_crafting_table', l: payload, o: 2,
  r: [{ s: 'PART', a: 2 }, { m: 'IRON_INGOT' }, ...Array(7).fill(null)],
}));
const meta = {
  gen: 'fixture', items: 51, addons: 2, cats: 2, rec: 50,
  C: [['fixture:parts', 'Parts'], ['fixture:machines', 'Machines']],
  A: [
    { s: 'quantum', n: `Quantum ${payload}`, c: 50, sh: 1, cats: [[0, 25], [1, 25]], f: [], tm: [], rc: 50 },
    { s: 'parts', n: 'Fixture Parts', c: 1, sh: 1, cats: [[0, 1]], f: [], tm: [], rc: 0 },
  ],
};
const data = {
  'meta.json': meta,
  's/q.json': [...items.map(it => [it.i, it.n, 0, it.c, 0]), ['PART', 'Quantum part', 1, 0, 0]],
  's/z.json': [],
  'a/quantum-0.json': { items, refs: { PART: ['Quantum part', 'parts', 0] } },
  'a/parts-0.json': { items: [{ i: 'PART', n: 'Quantum part', c: 0, m: 'no recipe' }], refs: {} },
};

test('wiki mobile: real ES/EN markup and renderer with isolated fixture data', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 90000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path.startsWith('/assets/sfwiki/')) {
        const body = data[path.slice('/assets/sfwiki/'.length)];
        res.writeHead(body ? 200 : 404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(body ?? {}));
      }
      if (['/wiki-slimefun.html', '/wiki-slimefun-en.html'].includes(path)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        // Keep the actual document and local styles; isolate this renderer from global scripts.
        const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace('</body>', '<script src="/scripts/sfwiki.js"></script></body>');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      }
      if (path !== '/scripts/sfwiki.js' && !/^\/styles\/[\w-]+\.css$/.test(path)
        && path !== '/vendor/bootstrap/bootstrap.min.css') {
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
  let browser, failures = 0;
  try {
    browser = await chromium.launch({ headless: true });
    for (const width of [375, 393, 412]) {
      for (const lang of ['es', 'en']) {
        await t.test(`${lang} at ${width}px: search, filters, pagination and recipe navigation`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          await context.route('**/*', route => {
            const req = route.request();
            return req.url().startsWith(`${origin}/`) && ['GET', 'HEAD'].includes(req.method()) ? route.continue() : route.abort();
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.name));
          const url = `${origin}/wiki-slimefun${lang === 'en' ? '-en' : ''}.html`;
          const count = n => page.waitForFunction(n => document.querySelectorAll('#sfw-view .sfw-card').length === n, n);
          try {
            assert.equal((await page.goto(url, { waitUntil: 'domcontentloaded' })).status(), 200);
            await count(2);
            assert.equal(await page.evaluate(() => {
              const localStyles = [...document.querySelectorAll('link[rel="stylesheet"]')]
                .filter(link => new URL(link.href).origin === location.origin);
              return localStyles.length > 0 && localStyles.every(link => link.sheet?.cssRules.length > 0);
            }), true, 'local stylesheets must load with nonempty rules');
            await page.locator('#sfw-fa').fill('parts');
            await count(1);
            assert.equal(await page.locator('#sfw-ag strong').textContent(), 'Fixture Parts');
            await page.locator('#sfw-fa').fill('');
            await count(2);
            assert.ok((await page.locator('#sfw-ag strong').first().textContent()).includes(payload));
            assert.equal(await page.locator('#sfw-ag img').count(), 0);
            await page.locator('#sfw-q').fill('quántum');
            await count(48);
            const more = page.locator('.sfw-more button');
            assert.equal(await more.textContent(), lang === 'en' ? 'Show more' : 'Mostrar más');
            await more.click();
            await count(51);
            assert.ok(await more.isHidden());
            await page.locator('#sfw-a').selectOption('quantum');
            await count(48);
            await more.click();
            await count(50);
            assert.deepEqual(await page.locator('.sfw-card .sfw-badge').allTextContents(), Array(50).fill(meta.A[0].n));
            assert.ok(await page.locator('#sfw-c').isEnabled());
            await page.locator('#sfw-c').selectOption('1');
            await count(25);
            assert.equal(await page.locator('.sfw-card small').allTextContents().then(a => a.every(x => x === 'Machines')), true);
            await page.locator('#sfw-q').fill('zzz');
            await count(0);
            await page.waitForFunction(() => document.querySelector('.sfw-stat')?.textContent.includes(document.documentElement.lang === 'en' ? 'No results' : 'Sin resultados'));
            await page.goto(`${url}#/i/quantum/0/QUANTUM_0`, { waitUntil: 'domcontentloaded' });
            await page.locator('.sfw-recipe').waitFor();
            assert.equal(await page.locator('.sfw-slot').count(), 9);
            assert.equal(await page.locator('.sfw-lore').textContent(), payload);
            assert.equal(await page.locator('#sfw-view img').count(), 0);
            assert.equal(await page.evaluate(() => window.wikiInjected), undefined);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            assert.equal(await page.locator('.sfw-recipe a em').textContent(), 'x2');
            if (process.env.AUDIT_ARTIFACT_DIR) {
              await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
              await page.locator('#sfw-view').screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `wiki-fixture-${lang}-${width}.png`), animations: 'disabled', timeout: 10000 });
            }
            await page.locator('.sfw-recipe a').click();
            await page.waitForFunction(() => document.querySelector('.sfw-h')?.textContent === 'Quantum part');
            assert.ok(await page.locator('#sfw-view').textContent().then(x => x.includes(lang === 'en' ? 'No recipe registered' : 'Sin receta registrada')));
            await page.locator('#sfw-view > p a').first().click();
            await count(1);
            assert.deepEqual(errors, []);
          } catch (error) {
            failures++; throw error;
          } finally {
            await context.close();
          }
        });
        if (failures >= 2 || t.signal.aborted) return;
      }
    }
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
