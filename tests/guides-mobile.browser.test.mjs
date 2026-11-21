// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/guides-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL(process.env.GUIDE_TEST_MIRROR === '1' ? '../web/' : '../', import.meta.url));
const pages = ['guia', 'guide-en', 'guia-plugins-en'];
const scripts = new Set(['/scripts/guia.js', '/scripts/site.js', '/vendor/bootstrap/bootstrap.bundle.min.js']);

test('general guides and plugin encyclopedia: mobile search, filters and disclosure controls', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const observations = [];
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      if (pages.some(slug => path === `/${slug}.html`)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => {
          const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
          return src && scripts.has(new URL(src, 'http://localhost/').pathname) ? tag : '';
        }).replace(/<link\b[^>]*>/gi, tag => /\bhref="https?:\/\//.test(tag) ? '' : tag);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html); return;
      }
      if (!scripts.has(path) && !/^\/(?:styles\/[\w-]+\.css|vendor\/bootstrap\/bootstrap\.min\.css|assets\/(?:[\w-]+\/)*[\w.-]+\.(?:webp|png|svg|woff2?))$/.test(path)) {
        res.writeHead(404).end(); return;
      }
      res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'text/javascript'
        : path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.png') ? 'image/png'
        : path.endsWith('.webp') ? 'image/webp' : 'font/woff2');
      res.end(await readFile(join(root, path.slice(1))));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [375, 393, 412]) {
      for (const slug of pages) {
        await t.test(`${slug} ${width}px`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          const row = { slug, width, errors: [], failedAssets: [] };
          observations.push(row);
          try {
            await context.route('**/*', route => {
              const url = new URL(route.request().url());
              return url.origin === origin && route.request().method() === 'GET' ? route.continue() : route.abort();
            });
            const page = await context.newPage();
            page.on('pageerror', error => row.errors.push(error.name));
            page.on('response', response => {
              const path = new URL(response.url()).pathname;
              if ((path.endsWith('.css') || scripts.has(path)) && response.status() !== 200) row.failedAssets.push(path);
            });
            assert.equal((await page.goto(`${origin}/${slug}.html`, { waitUntil: 'load' })).status(), 200);
            const input = page.locator('#guide-q');
            await input.tap();
            assert.equal(await input.evaluate(el => el === document.activeElement), true);
            const visibleRows = () => page.locator('.guide-row:visible').count();
            if (slug !== 'guia-plugins-en') {
              row.total = await page.locator('.guide-row').count();
              assert.ok(row.total > 100, 'use the real general guide catalog');
              assert.equal(await visibleRows(), row.total);
              row.categories = [];
              for (const button of await page.locator('.guide-filters button').all()) {
                const category = await button.getAttribute('data-filter');
                await button.tap();
                const visible = await visibleRows();
                assert.ok(visible > 0, `${category} has usable results`);
                assert.equal(await button.getAttribute('aria-pressed'), 'true');
                assert.equal(await page.locator('.guide-filters [aria-pressed="true"]').count(), 1);
                if (category !== 'all') {
                  assert.deepEqual(await page.locator('.guide-row:visible').evaluateAll(rows =>
                    [...new Set(rows.map(el => el.closest('.guide-section').dataset.cat))]), [category]);
                }
                row.categories.push({ category, visible });
              }
              await page.locator('.guide-filters [data-filter="all"]').tap();
              await input.fill('/spawn');
              assert.ok(await visibleRows() > 0 && await visibleRows() < row.total);
              assert.ok((await page.locator('.guide-row:visible > code').allTextContents()).includes('/spawn'));
              await input.fill('zz_no_such_guide_796');
              assert.equal(await visibleRows(), 0);
              assert.equal(await page.locator('#guide-empty').isVisible(), true);
              row.editorial = await page.locator('.guide-section').evaluateAll(sections => sections
                .filter(el => !el.querySelector('.guide-row')).map(el => ({ id: el.id, hidden: getComputedStyle(el).display === 'none' })));
              assert.ok(['modalidades', 'servidor'].every(id => row.editorial.some(section => section.id === id)));
              assert.ok(row.editorial.every(section => !section.hidden), 'editorial sections remain available while searching');
              await input.fill('');
              assert.equal(await visibleRows(), row.total);
              assert.equal(await page.locator('#guide-empty').isVisible(), false);
            } else {
              // Collect all widths before the contract assertion, even when the existing renderer exits early.
              const cards = page.locator('.guide-accordion');
              row.total = await cards.count();
              assert.equal(row.total, 14, 'actual encyclopedia contains fourteen components');
              await page.locator('#btn-collapse-all').tap();
              row.openAfterCollapse = await page.locator('.guide-accordion[open]').count();
              await page.locator('#btn-expand-all').tap();
              row.openAfterExpand = await page.locator('.guide-accordion[open]').count();
              await input.fill('  DRÁKES-CORE.JAR  ');
              row.positiveSearch = await page.locator('.guide-accordion:visible summary').allTextContents();
              await input.fill('zz_no_such_guide_796');
              row.noMatch = { visible: await page.locator('.guide-accordion:visible').count(), empty: await page.locator('#guide-empty').isVisible() };
              await input.fill('');
              const category = page.locator('.guide-filters [data-filter="islas"]');
              await category.tap();
              row.filtered = { pressed: await category.getAttribute('aria-pressed'), categories: await page.locator('.guide-accordion:visible').evaluateAll(cards => cards.map(card => card.dataset.cat)) };
              await page.locator('.guide-filters [data-filter="all"]').tap();
              row.restored = await page.locator('.guide-accordion:visible').count();
              row.counter = await page.locator('#guide-count').textContent();
            }
            row.viewport = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
            assert.ok(row.viewport.scroll <= row.viewport.client + 1, 'no document overflow');
            assert.deepEqual(row.errors, []);
            assert.deepEqual(row.failedAssets, []);
            if (process.env.AUDIT_ARTIFACT_DIR) {
              await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
              await input.scrollIntoViewIfNeeded();
              await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `${slug}-${width}.png`), timeout: 10000 });
            }
          } finally { await context.close(); }
        });
      }
    }
    await t.test('encyclopedia controls operate on components without command rows at all widths', () => {
      const plugins = observations.filter(row => row.slug === 'guia-plugins-en');
      assert.equal(plugins.length, 3);
      assert.ok(plugins.every(row => row.positiveSearch.length === 1 && row.positiveSearch[0].includes('drakes-core.jar')),
        'component search accepts case, accents and outer whitespace');
      assert.deepEqual(plugins.map(row => ({ width: row.width, collapse: row.openAfterCollapse, expand: row.openAfterExpand,
        noMatch: row.noMatch, filtered: row.filtered, restored: row.restored, counter: row.counter })),
      [375, 393, 412].map(width => ({ width, collapse: 0, expand: 14,
        noMatch: { visible: 0, empty: true }, filtered: { pressed: 'true', categories: ['islas'] }, restored: 14, counter: '14 / 14' })));
    });
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'guides-mobile.json'), JSON.stringify(observations, null, 2) + '\n');
    }
  }
});
