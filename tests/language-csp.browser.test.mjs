// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/language-csp.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve, extname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const policy = (await readFile(join(root, 'server.js'), 'utf8')).match(/'Content-Security-Policy',\s*"([^"]+)"/)[1];
const pages = ['temporada-2.html', 'temporada-2-en.html'];
const scripts = new Set(['/scripts/site.js', '/vendor/bootstrap/bootstrap.bundle.min.js']);

test('native language flow respects the shipped CSP at mobile widths', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  let variant = 'scripts/site.js';
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Security-Policy', policy);
      if (pages.includes(path.slice(1))) {
        // Keep real markup/CSS and navigation; isolate unrelated scripts/services.
        const html = (await readFile(file, 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => {
          const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
          return src && scripts.has(new URL(src, 'http://localhost').pathname) ? tag : '';
        }).replace(/<link\b[^>]*>/gi, tag => /\bhref="https?:\/\//.test(tag) ? '' : tag);
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return;
      }
      res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[extname(file)] || 'application/octet-stream');
      res.end(await readFile(path === '/scripts/site.js' ? join(root, variant) : file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const report = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const source of ['scripts/site.js', 'web/scripts/site.js']) {
      variant = source;
      for (const width of [375, 393, 412]) {
        await t.test(`${source} ${width}px: banner, native English, return, legacy choice and Spanish browser`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-US', reducedMotion: 'reduce' });
          context.setDefaultTimeout(6000);
          const row = { source, width, errors: [], translationRequests: [], violations: [], navigations: 0 };
          report.push(row);
          try {
            await context.route('**/*', route => {
              const url = new URL(route.request().url());
              return url.origin === origin && route.request().method() === 'GET'
                && (route.request().resourceType() !== 'script' || scripts.has(url.pathname))
                ? route.continue() : route.abort();
            });
            await context.exposeBinding('recordCsp', (_source, event) => row.violations.push(event));
            await context.addInitScript(() => document.addEventListener('securitypolicyviolation', e => {
              window.recordCsp({ directive: e.effectiveDirective, blocked: e.blockedURI });
            }));
            const page = await context.newPage();
            page.on('pageerror', e => row.errors.push(e.name));
            page.on('request', req => { if (/translate\.google/.test(req.url())) row.translationRequests.push(req.url()); });
            const visit = async slug => {
              const response = await page.goto(`${origin}/${slug}`, { waitUntil: 'load' });
              row.navigations++; assert.equal(response.status(), 200);
            };
            await visit('temporada-2.html');
            assert.equal(await page.locator('html').getAttribute('lang'), 'es');
            await page.locator('#dk-lang-translate').tap();
            await page.waitForURL(`${origin}/temporada-2-en.html`);
            await page.waitForLoadState('load'); row.navigations++;
            assert.equal(await page.locator('html').getAttribute('lang'), 'en');
            assert.equal(await page.locator('#dk-lang-banner, #google_translate_element').count(), 0);
            await page.locator('#nav-toggle').tap();
            await page.locator('#nav-lang-toggle').tap();
            await page.waitForURL(`${origin}/temporada-2.html`);
            await page.waitForLoadState('load'); row.navigations++;
            assert.equal(await page.locator('html').getAttribute('lang'), 'es');
            assert.equal(await page.evaluate(() => localStorage.getItem('drakes_lang_choice')), null);
            assert.ok(!(await context.cookies()).some(c => c.name === 'googtrans'));
            await page.locator('#dk-lang-dismiss').tap();
            assert.equal(await page.evaluate(() => localStorage.getItem('drakes_lang_dismissed')), 'true');
            // A real legacy cookie triggers migration, then is removed before English loads.
            await page.evaluate(() => { document.cookie = 'googtrans=/es/en; path=/;'; });
            await visit('temporada-2.html');
            await page.waitForURL(`${origin}/temporada-2-en.html`);
            await page.waitForLoadState('load'); row.navigations++;
            assert.ok(!(await context.cookies()).some(c => c.name === 'googtrans'));
            assert.equal(await page.locator('html').getAttribute('lang'), 'en');
            // Migration also supports the old localStorage-only preference.
            await page.evaluate(() => localStorage.setItem('drakes_lang_choice', 'en'));
            await visit('temporada-2.html');
            await page.waitForURL(`${origin}/temporada-2-en.html`);
            await page.waitForLoadState('load'); row.navigations++;
            assert.equal(await page.locator('html').getAttribute('lang'), 'en');
            assert.equal(await page.locator('#google_translate_element').count(), 0);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            if (process.env.AUDIT_ARTIFACT_DIR) {
              await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
              await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `language-${source.startsWith('web/') ? 'copy' : 'root'}-${width}.png`) });
            }
            const spanish = await browser.newContext({ viewport: { width, height: 844 }, locale: 'es-CL' });
            try {
              await spanish.route('**/*', route => {
                const u = new URL(route.request().url());
                return u.origin === origin && route.request().method() === 'GET'
                  && (route.request().resourceType() !== 'script' || scripts.has(u.pathname)) ? route.continue() : route.abort();
              });
              const esPage = await spanish.newPage();
              await esPage.goto(`${origin}/temporada-2.html`, { waitUntil: 'load' }); row.navigations++;
              assert.equal(await esPage.locator('html').getAttribute('lang'), 'es');
              assert.equal(await esPage.locator('#dk-lang-banner').count(), 0);
            } finally { await spanish.close(); }
            assert.deepEqual(row.errors, []);
            assert.deepEqual(row.translationRequests, []);
            assert.deepEqual(row.violations, []);
          } finally { await context.close(); }
        });
        if (t.signal.aborted) return;
      }
    }
  } finally {
    await browser?.close(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'language-csp-report.json'), JSON.stringify({ policy, report }, null, 2) + '\n');
    }
  }
});
