// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/commands-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = ['guia-comandos', 'guia-comandos-en'];
const scripts = new Set(['/scripts/guia.js', '/scripts/site.js', '/vendor/bootstrap/bootstrap.bundle.min.js']);

test('commands mobile: actual search, modality controls and advertised search URLs', {
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
        // Keep full page/layout and the actual search/navigation code; omit unrelated effects and remote styles.
        const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => {
          if (/type="application\/ld\+json"/.test(tag)) return tag;
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
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let failures = 0;
  try {
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [375, 393, 412]) {
      for (const slug of pages) {
        await t.test(`${slug} ${width}px: search, empty result and recovery`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          const row = { slug, width };
          observations.push(row);
          const errors = [], failedAssets = [];
          try {
            await context.route('**/*', route => {
              const request = route.request(), url = new URL(request.url());
              const allowed = url.origin === origin && request.method() === 'GET'
                && (pages.some(page => url.pathname === `/${page}.html`) || scripts.has(url.pathname)
                  || /^\/(?:styles\/|vendor\/bootstrap\/bootstrap\.min\.css|assets\/)/.test(url.pathname));
              return allowed ? route.continue() : route.abort();
            });
            const page = await context.newPage();
            page.on('pageerror', error => errors.push(error.name));
            page.on('response', response => {
              const path = new URL(response.url()).pathname;
              if ((path.endsWith('.css') || scripts.has(path)) && response.status() !== 200) failedAssets.push(path);
            });
            const response = await page.goto(`${origin}/${slug}.html`, { waitUntil: 'load' });
            assert.equal(response.status(), 200);
            const input = page.locator('#guide-q');
            const rows = page.locator('.guide-row');
            const codes = () => page.locator('.guide-row:visible > code').allTextContents();
            await page.waitForFunction(() => document.querySelector('#guide-count').textContent.trim());
            const total = await rows.count();
            assert.ok(total > 20, 'use the actual command catalog');
            assert.equal((await codes()).length, total, 'all commands initially visible');
            const box = await input.boundingBox();
            assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1 && box.height >= 24, 'search fits the mobile viewport');
            await input.tap();
            assert.equal(await input.evaluate(el => el === document.activeElement), true);
            row.searches = [];
            for (const query of ['/spawn', '  /SPÁWN  ', slug.endsWith('-en') ? '/spawn point' : '/spawn aparición']) {
              await input.fill(query);
              const found = await codes();
              assert.ok(found.includes('/spawn'), `find spawn with ${query}`);
              assert.equal(await page.locator('#guide-empty').isVisible(), false);
              const count = await page.locator('#guide-count').textContent();
              assert.equal(Number(count.match(/\d+/)?.[0]), found.length, 'counter matches visible commands');
              row.searches.push({ query, count: found.length });
            }
            for (const query of ['zz_no_such_command_796', '<img src=x onerror="window.guideInjected=true">']) {
              await input.fill(query);
              assert.equal((await codes()).length, 0);
              assert.equal(await page.locator('#guide-empty').isVisible(), true);
              assert.equal(await page.evaluate(() => window.guideInjected === true), false);
              assert.equal(await page.locator('#guide-count img, #guide-empty img').count(), 0);
            }
            await input.fill('');
            assert.equal((await codes()).length, total, 'clearing the query restores the whole catalog');
            assert.equal(await page.locator('#guide-empty').isVisible(), false);
            row.total = total;
            row.viewport = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
            assert.ok(row.viewport.scroll <= row.viewport.width + 1, 'no document overflow');
            if (slug.endsWith('-en')) {
              const selected = page.locator('#modality-selector [data-mod="clasico"]');
              await selected.tap();
              row.modality = await page.evaluate(() => ({
                pressed: document.querySelector('#modality-selector [data-mod="clasico"]').getAttribute('aria-pressed'),
                active: [...document.querySelectorAll('#modality-selector [aria-pressed="true"]')].map(el => el.dataset.mod),
                spawnVisible: [...document.querySelectorAll('.guide-row')].some(el => el.querySelector(':scope > code')?.textContent === '/spawn'
                  && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden'),
                excluded: [...document.querySelectorAll('.guide-row')].filter(el => {
                  const css = getComputedStyle(el), box = el.getBoundingClientRect();
                  return box.width > 0 && box.height > 0 && css.display !== 'none' && css.visibility !== 'hidden'
                    && !(el.dataset.mod || '').split(',').includes('clasico');
                }).map(el => el.querySelector('code')?.textContent),
              }));
              if (process.env.AUDIT_ARTIFACT_DIR) {
                await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
                await page.locator('#modality-selector').screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `commands-modality-${width}.png`), timeout: 15000 });
              }
              // Filtering/search must compose in either order and clearing must retain the chosen mode.
              await input.fill('/survival');
              row.intersection = { otherMode: await codes() };
              await input.fill('');
              row.intersection.clearedClassic = await codes();
              row.intersection.classicStillPressed = await selected.getAttribute('aria-pressed');
              await input.fill('/spawn');
              row.intersection.shared = await codes();
              await page.locator('#modality-selector [data-mod="all"]').tap();
              row.intersection.afterAll = await codes();
              await input.fill('');
              row.intersection.restored = (await codes()).length;
              const advertised = await page.locator('script[type="application/ld+json"]').allTextContents();
              assert.ok(advertised.some(text => text.includes('guia-comandos-en.html?q={search_term_string}')), 'the page advertises query-string search');
              await page.goto(`${origin}/${slug}.html?q=%2Fspawn`, { waitUntil: 'load' });
              await page.waitForFunction(() => document.querySelector('#guide-count').textContent.trim());
              row.deepLink = { input: await input.inputValue(), codes: await codes() };
            }
            assert.deepEqual(failedAssets, [], 'all required styles and scripts loaded');
            assert.deepEqual(errors, [], 'no uncaught JavaScript errors');
          } catch (error) {
            failures++;
            row.failure = { name: error.name, message: error.message };
            throw error;
          } finally {
            await context.close();
          }
        });
        if (failures >= 2) break;
      }
      if (failures >= 2) break;
    }
    await t.test('all three English modality selectors apply Classic and exclude other modes', () => {
      const english = observations.filter(row => row.slug.endsWith('-en'));
      assert.equal(english.length, 3, 'measure all widths');
      assert.deepEqual(english.map(row => ({ width: row.width, ...row.modality })),
        [375, 393, 412].map(width => ({ width, pressed: 'true', active: ['clasico'], spawnVisible: true, excluded: [] })));
    });
    await t.test('all three advertised search URLs hydrate the input and filter results', () => {
      const english = observations.filter(row => row.slug.endsWith('-en'));
      assert.equal(english.length, 3, 'measure all widths');
      assert.ok(english.every(row => row.deepLink?.input === '/spawn'
        && row.deepLink.codes.includes('/spawn') && row.deepLink.codes.length < row.total),
      'q=/spawn must load the requested search instead of the complete catalog');
    });
    await t.test('modality and query combine without losing shared commands or recovery', () => {
      const english = observations.filter(row => row.slug.endsWith('-en'));
      assert.equal(english.length, 3, 'measure all widths');
      assert.ok(english.every(row => row.intersection?.otherMode.length === 0
        && row.intersection.classicStillPressed === 'true'
        && row.intersection.clearedClassic.includes('/spawn') && !row.intersection.clearedClassic.includes('/survival')
        && row.intersection.clearedClassic.length < row.total && row.intersection.shared.includes('/spawn')
        && row.intersection.restored === row.total), 'Classic excludes /survival, keeps /spawn, and All plus clear restores the catalog');
      for (const row of english) assert.deepEqual(row.intersection.afterAll, row.intersection.shared, 'All retains the current text search');
    });
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'commands-mobile.json'), JSON.stringify(observations, null, 2) + '\n');
    }
  }
});
