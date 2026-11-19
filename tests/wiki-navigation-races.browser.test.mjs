// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/wiki-navigation-races.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const addon = slug => ({ s: slug, n: `Fixture ${slug}`, c: 1, sh: 1, cats: [[0, 1]], f: [], tm: [], rc: 0 });
const item = slug => ({ i: slug.toUpperCase(), n: `Fixture item ${slug}`, c: 0, m: 'no recipe' });
const metadata = { gen: 'fixture', items: 2, addons: 2, cats: 1, rec: 0,
  C: [['fixture:parts', 'Parts']], A: ['slow', 'fast'].map(addon) };

test('wiki mobile: outdated loads cannot replace the current route', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      const path = new URL(req.url, 'http://localhost').pathname;
      if (['/wiki-slimefun.html', '/wiki-slimefun-en.html'].includes(path)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace('</body>', '<script src="/scripts/sfwiki.js"></script></body>');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
        return;
      }
      if (path === '/assets/sfwiki/meta.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(metadata)); return;
      }
      if (path === '/assets/sfwiki/a/fast-0.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ items: [item('fast')], refs: {} })); return;
      }
      if (path !== '/scripts/sfwiki.js' && !/^\/styles\/[\w-]+\.css$/.test(path)
        && path !== '/vendor/bootstrap/bootstrap.min.css') { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript');
      res.end(await readFile(join(root, path.slice(1))));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser, failures = 0;
  const report = [];
  try {
    browser = await chromium.launch({ headless: true });
    for (const width of [375, 393, 412]) {
      for (const lang of ['es', 'en']) {
        await t.test(`${lang} ${width}px: controlled success and late HTTP errors`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          const row = { width, lang, cases: [], errors: [] };
          report.push(row);
          try {
            await context.route('**/*', route => route.request().url().startsWith(`${origin}/`)
              && route.request().method() === 'GET' ? route.continue() : route.abort());
            const page = await context.newPage();
            page.on('pageerror', error => row.errors.push(error.name));
            await page.addInitScript(() => {
              const original = window.fetch;
              window.__slowSettled = 0;
              window.fetch = async (...args) => {
                const response = await Reflect.apply(original, window, args);
                if (String(args[0]).endsWith('/a/slow-0.json')) {
                  const json = response.json.bind(response);
                  // A macrotask follows J's rejection or JSON completion and its DOM write.
                  const done = () => setTimeout(() => { window.__slowSettled++; }, 0);
                  if (!response.ok) done();
                  else response.json = async () => { try { return await json(); } finally { done(); } };
                }
                return response;
              };
            });
            const url = `${origin}/wiki-slimefun${lang === 'en' ? '-en' : ''}.html`;
            for (const kind of ['addon', 'item']) {
              for (const status of [200, 503]) {
                let release;
                const gate = new Promise(resolve => { release = resolve; });
                const slowRoute = async route => {
                  await gate;
                  await route.fulfill({ status, contentType: 'application/json',
                    body: JSON.stringify({ items: [item('slow')], refs: {} }) });
                };
                await page.route('**/assets/sfwiki/a/slow-0.json', slowRoute);
                try {
                  assert.equal((await page.goto(url, { waitUntil: 'domcontentloaded' })).status(), 200);
                  await page.locator('#sfw-ag .sfw-card').first().waitFor();
                  assert.equal(await page.evaluate(() => {
                    const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
                      .filter(link => new URL(link.href).origin === location.origin);
                    return links.length > 0 && links.every(link => link.sheet?.cssRules.length > 0);
                  }), true);
                  const slowHash = kind === 'addon' ? '#/a/slow' : '#/i/slow/0/SLOW';
                  const fastHash = kind === 'addon' ? '#/a/fast' : '#/i/fast/0/FAST';
                  const pending = page.waitForRequest(request => request.url().endsWith('/a/slow-0.json'));
                  await page.evaluate(hash => { location.hash = hash; }, slowHash);
                  // Observe the actual blocked request before starting the newer navigation.
                  await pending;
                  await page.evaluate(hash => { location.hash = hash; }, fastHash);
                  await page.waitForFunction(kind => kind === 'addon'
                    ? document.querySelector('#sfw-view .sfw-card strong')?.textContent === 'Fixture item fast'
                    : document.querySelector('#sfw-view .sfw-h')?.textContent === 'Fixture item fast', kind);
                  const before = await page.locator('#sfw-view').innerHTML();
                  release();
                  await page.waitForFunction(() => window.__slowSettled === 1);
                  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                  const after = await page.locator('#sfw-view').innerHTML();
                  const state = { kind, status, currentHash: await page.evaluate(() => location.hash),
                    preserved: before === after, errorVisible: await page.locator('#sfw-view .sfw-err').count(),
                    overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) };
                  row.cases.push(state);
                  assert.equal(state.currentHash, fastHash);
                  assert.ok(state.overflow <= 1);
                  if (status === 200) assert.equal(state.preserved, true, 'a late success must be discarded');
                } finally {
                  release();
                  await page.unroute('**/assets/sfwiki/a/slow-0.json', slowRoute);
                }
              }
              const slowHash = kind === 'addon' ? '#/a/slow' : '#/i/slow/0/SLOW';
              const currentFailure = route => route.fulfill({ status: 503, contentType: 'application/json',
                body: JSON.stringify({ items: [item('slow')], refs: {} }) });
              await page.route('**/assets/sfwiki/a/slow-0.json', currentFailure);
              try {
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                await page.locator('#sfw-ag .sfw-card').first().waitFor();
                await page.evaluate(hash => { location.hash = hash; }, slowHash);
                await page.locator('#sfw-view .sfw-err').waitFor();
                assert.equal(await page.locator('#sfw-view .sfw-err').count(), 1, 'a current failure must remain visible');
                if (kind === 'addon') assert.equal(await page.locator('#sfw-view .sfw-h').textContent(), 'Fixture slow');
                row.cases.push({ kind, currentFailure: true, errorVisible: 1 });
              } finally {
                await page.unroute('**/assets/sfwiki/a/slow-0.json', currentFailure);
              }
              const retry = route => route.fulfill({ status: 200, contentType: 'application/json',
                body: JSON.stringify({ items: [item('slow')], refs: {} }) });
              await page.route('**/assets/sfwiki/a/slow-0.json', retry);
              try {
                await page.evaluate(() => { location.hash = '#/'; });
                await page.locator('#sfw-ag .sfw-card').first().waitFor();
                await page.evaluate(hash => { location.hash = hash; }, slowHash);
                await page.waitForFunction(kind => kind === 'addon'
                  ? document.querySelector('#sfw-view .sfw-card strong')?.textContent === 'Fixture item slow'
                  : document.querySelector('#sfw-view .sfw-h')?.textContent === 'Fixture item slow', kind);
                assert.equal(await page.locator('#sfw-view .sfw-err').count(), 0, 'a successful retry must replace the error');
                assert.equal(await page.evaluate(() => location.hash), slowHash);
                row.cases.push({ kind, retry: true, errorVisible: 0 });
              } finally {
                await page.unroute('**/assets/sfwiki/a/slow-0.json', retry);
              }
            }
            assert.deepEqual(row.errors, []);
          } catch (error) {
            failures++; row.failure = error.name; throw error;
          } finally { await context.close(); }
        });
        if (failures >= 2 || t.signal.aborted) return;
      }
    }
    await t.test('a late HTTP failure must also preserve the newer route', () => {
      assert.equal(report.length, 6, 'both languages must run at all three widths');
      for (const row of report) {
        assert.equal(row.cases.length, 8, 'both routes need late success/error, current error and retry coverage');
        assert.deepEqual(row.errors, []);
      }
      const changed = report.flatMap(row => row.cases.filter(state => state.status === 503 && !state.preserved)
        .map(state => ({ width: row.width, lang: row.lang, ...state })));
      assert.deepEqual(changed, [], 'an outdated request must not overwrite the current view with an error');
    });
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'wiki-navigation-races-report.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
});
