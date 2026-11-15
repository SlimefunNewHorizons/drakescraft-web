// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/navigation-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = ['terms', 'terms-en', 'apoya', 'apoya-en', 'temporada-2', 'temporada-2-en'];
const scripts = new Set(['/scripts/site.js', '/vendor/bootstrap/bootstrap.bundle.min.js']);

test('mobile navigation: real terms, support and season menus respond to touch and keyboard', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      if (pages.some(slug => path === `/${slug}.html`)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        // Retain complete document/layout; isolate the two existing navigation implementations.
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
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let failures = 0;
  const report = [];
  try {
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [375, 393, 412]) {
      for (const slug of pages) {
        await t.test(`${slug} ${width}px: tap, Enter, Space and reachable links`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'es-CL' });
          context.setDefaultTimeout(5000);
          const errors = [], failedStyles = [];
          try {
            await context.route('**/*', route => {
              const url = new URL(route.request().url());
              const allowed = url.origin === origin && route.request().method() === 'GET'
                && (pages.some(page => url.pathname === `/${page}.html`) || scripts.has(url.pathname)
                  || /^\/(?:styles\/|vendor\/bootstrap\/bootstrap\.min\.css|assets\/)/.test(url.pathname));
              return allowed ? route.continue() : route.abort();
            });
            const page = await context.newPage();
            page.on('pageerror', error => errors.push(error.name));
            page.on('response', response => {
              if (new URL(response.url()).pathname.endsWith('.css') && response.status() !== 200) failedStyles.push(response.status());
            });
            const response = await page.goto(`${origin}/${slug}.html`, { waitUntil: 'load' });
            assert.equal(response.status(), 200);
            const toggle = page.locator('nav .navbar-toggler, nav #nav-toggle');
            assert.equal(await toggle.count(), 1, 'one menu toggle in the actual page');
            const controls = await toggle.getAttribute('aria-controls');
            assert.ok(controls);
            const menu = page.locator(`[id="${controls}"]`);
            assert.equal(await menu.count(), 1, 'aria-controls identifies exactly one menu');
            const glyphs = controls === 'nav-menu' ? await toggle.locator('span').evaluateAll(spans => spans.map(span => {
              const box = span.getBoundingClientRect();
              return { width: box.width, height: box.height };
            })) : null;
            const state = async open => {
              await page.waitForFunction(({ controls, open }) => {
                const toggle = document.querySelector('nav .navbar-toggler, nav #nav-toggle');
                const menu = document.getElementById(controls);
                const box = menu.getBoundingClientRect();
                return toggle.getAttribute('aria-expanded') === String(open)
                  && (getComputedStyle(menu).display !== 'none' && box.height > 0) === open
                  && !menu.classList.contains('collapsing');
              }, { controls, open });
            };
            await state(false);
            await toggle.tap();
            await state(true);
            const links = menu.locator('a');
            const count = await links.count();
            assert.ok(count >= 8, 'menu contains its navigation links');
            const dimensions = [];
            for (const link of await links.all()) {
              await link.scrollIntoViewIfNeeded();
              await link.focus();
              const measured = await link.evaluate(el => {
                const box = el.getBoundingClientRect();
                return { width: box.width, height: box.height, left: box.left, right: box.right,
                  focused: document.activeElement === el,
                  reachable: el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) };
              });
              assert.equal(measured.focused, true, 'each link accepts keyboard focus');
              assert.equal(measured.reachable, true, 'each scrolled link is unobscured at its center');
              assert.ok(measured.left >= -1 && measured.right <= width + 1, 'links stay inside the mobile viewport');
              dimensions.push(measured);
            }
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'document has no horizontal overflow with menu open');
            assert.ok(await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.length > 0 && links.every(link => link.sheet && link.sheet.cssRules.length > 0)), 'all local stylesheets are loaded');
            await toggle.scrollIntoViewIfNeeded();
            await toggle.focus();
            await page.keyboard.press('Enter');
            await state(false);
            await page.keyboard.press('Space');
            await state(true);
            if (process.env.AUDIT_ARTIFACT_DIR) {
              await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
              await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `${slug}-${width}-menu.png`), animations: 'disabled' });
            }
            await toggle.tap();
            await state(false);
            assert.deepEqual(errors, []);
            assert.deepEqual(failedStyles, []);
            report.push({ page: slug, width, controls, glyphs, links: count, dimensions, errors, failedStyles });
          } catch (error) {
            failures++;
            report.push({ page: slug, width, failure: error.name, errors, failedStyles });
            throw error;
          } finally {
            await context.close();
          }
        });
        if (failures >= 2 || t.signal.aborted) return;
      }
    }
    // Separate visual requirement: a working invisible button must not pass as a visible menu.
    await t.test('legacy hamburger bars retain nonzero dimensions at all widths', () => {
      const legacy = report.filter(row => row.controls === 'nav-menu');
      assert.equal(legacy.length, 9, 'three English pages at three widths');
      const collapsed = legacy.filter(row => row.glyphs.length !== 3 || row.glyphs.some(glyph => glyph.width < 12 || glyph.height < 1));
      assert.deepEqual(collapsed.map(row => `${row.page}:${row.width}`), [], 'the real mobile CSS must not collapse the three hamburger bars');
    });
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'navigation-report.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
});
