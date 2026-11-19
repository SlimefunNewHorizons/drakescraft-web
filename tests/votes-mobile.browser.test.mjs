// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/votes-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const inertName = '<img src=x onerror="window.voteInjected=true">';
const sites = [
  { id: 'fixture-ready', name: inertName, enabled: true, url: 'https://votes.invalid/ready' },
  { id: 'fixture-wait', name: 'Cooldown fixture', enabled: true, url: 'https://votes.invalid/wait', cooldown_hours: 2 },
  { id: 'fixture-disabled', name: 'Disabled fixture', enabled: false, url: 'https://votes.invalid/off' },
  { id: 'fixture-placeholder', name: 'Placeholder fixture', enabled: true, url: 'https://example.invalid/unconfigured' },
  { id: 'fixture-empty', name: 'Missing URL fixture', enabled: true, url: '' },
];

test('votes mobile: real ES/EN renderer, local cooldown and unavailable listings', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      const path = new URL(req.url, 'http://localhost').pathname;
      if (['/votar.html', '/vote-en.html'].includes(path)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        const main = source.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
        const body = source.match(/<body\b[^>]*>/)?.[0];
        const renderer = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
          .filter(match => match[1].includes('fetch("/assets/vote-sites.json"'));
        assert.ok(main && body);
        assert.equal(renderer.length, 1, 'serve the original inline renderer');
        const styles = [...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*>/g)]
          .map(match => match[0]).filter(tag => tag.startsWith('<style')
            || /rel="stylesheet"/.test(tag) && /href="(?!https?:\/\/)/.test(tag));
        const lang = path === '/votar.html' ? 'es' : 'en';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`<!doctype html><html lang="${lang}"><head><meta name="viewport" content="width=device-width">${styles.join('')}</head>${body}${main}${renderer[0][0]}</body></html>`);
      }
      if (!/^\/styles\/[\w-]+\.css$/.test(path) && path !== '/vendor/bootstrap/bootstrap.min.css') {
        res.writeHead(404).end(); return;
      }
      res.setHeader('Content-Type', 'text/css');
      res.end(await readFile(join(root, path.slice(1))));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const report = [];
  let browser, failures = 0;
  try {
    browser = await chromium.launch({ headless: true });
    for (const width of [375, 393, 412]) {
      for (const lang of ['es', 'en']) {
        await t.test(`${lang} at ${width}px: links, persistence, countdown and fetch failures`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          await context.route('**/*', route => {
            const request = route.request();
            return request.url().startsWith(`${origin}/`) && request.method() === 'GET' ? route.continue() : route.abort();
          });
          await context.addInitScript(() => {
            if (!sessionStorage.getItem('fixture-seeded')) {
              localStorage.setItem('dc_vote_nick', '.FixtureOnly');
              // Init-script ordering relative to Playwright's clock is unspecified.
              localStorage.setItem('dc_vote_fixture-wait', String(Date.UTC(2026, 10, 1)));
              sessionStorage.setItem('fixture-seeded', 'true');
            }
          });
          const page = await context.newPage();
          await page.clock.install({ time: new Date('2026-11-01T00:00:00Z') });
          const errors = [];
          page.on('pageerror', error => errors.push(error.name));
          let mode = 'active';
          await context.route('**/assets/vote-sites.json', route => mode === 'network' ? route.abort('failed') : route.fulfill({
            status: mode === 'unavailable' ? 503 : 200, contentType: 'application/json',
            body: mode === 'invalid' ? '{' : mode === 'unavailable' ? '<html>Unavailable</html>' : JSON.stringify({ sites }),
          }));
          const url = `${origin}/${lang === 'es' ? 'votar' : 'vote-en'}.html`;
          const ready = lang === 'es' ? 'Listo para votar' : 'Ready to vote';
          const soon = lang === 'es' ? 'Próximamente' : 'Coming soon';
          const wait = lang === 'es' ? 'Disponible en' : 'Available in';
          try {
            assert.equal((await page.goto(url, { waitUntil: 'domcontentloaded' })).status(), 200);
            await page.waitForFunction(() => document.querySelectorAll('.vt-card').length === 5);
            const cards = page.locator('.vt-card');
            assert.equal(await cards.nth(0).locator('h3').textContent(), inertName);
            assert.equal(await cards.locator('img').count(), 0);
            assert.equal(await page.evaluate(() => window.voteInjected), undefined);
            assert.equal(await page.locator('#vt-nick').inputValue(), '.FixtureOnly');
            assert.equal(await cards.nth(0).locator('.vt-st').textContent(), ready);
            assert.match(await cards.nth(1).locator('.vt-st').textContent(), new RegExp(`^${wait} 2h 0m$`));
            for (let i = 0; i < sites.length; i++) {
              const link = cards.nth(i).locator('a');
              if (i < 2) {
                assert.equal(await link.getAttribute('href'), sites[i].url);
                assert.equal(await link.getAttribute('target'), '_blank');
                assert.match(await link.getAttribute('rel'), /\bnoopener\b/);
              } else {
                assert.equal(await link.getAttribute('href'), null);
                assert.equal(await link.getAttribute('aria-disabled'), 'true');
                assert.equal(await cards.nth(i).locator('.vt-st').textContent(), soon);
              }
            }
            const layout = await page.evaluate(() => {
              const styles = [...document.querySelectorAll('link[rel="stylesheet"]')];
              return { width: document.documentElement.scrollWidth,
                stylesLoaded: styles.length > 0 && styles.every(link => link.sheet?.cssRules.length > 0),
                buttonHeights: [...document.querySelectorAll('.vt-card a')].map(a => a.getBoundingClientRect().height) };
            });
            assert.ok(layout.stylesLoaded, 'local styles must load');
            assert.ok(layout.width <= width + 1, `horizontal overflow: ${JSON.stringify(layout)}`);
            assert.ok(layout.buttonHeights.every(height => height >= 44), 'vote buttons need 44px height');
            await page.locator('#vt-nick').fill('  FixtureChanged  ');
            assert.equal(await page.evaluate(() => localStorage.getItem('dc_vote_nick')), 'FixtureChanged');
            // Exercise the click listener without invoking link navigation or opening a popup.
            await cards.nth(0).locator('a').evaluate(link => link.dispatchEvent(new Event('click')));
            await page.waitForFunction(() => document.querySelector('.vt-card .vt-st').classList.contains('wait'));
            assert.match(await cards.nth(0).locator('.vt-st').textContent(), new RegExp(`^${wait} 24h 0m$`));
            assert.equal(context.pages().length, 1);
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.querySelectorAll('.vt-card').length === 5);
            assert.equal(await page.locator('#vt-nick').inputValue(), 'FixtureChanged');
            assert.match(await cards.nth(0).locator('.vt-st').textContent(), new RegExp(`^${wait} 24h 0m$`));
            if (process.env.AUDIT_ARTIFACT_DIR) {
              await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
              await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `votes-${lang}-${width}.png`), animations: 'disabled', timeout: 15000 });
            }
            await page.clock.fastForward(60000);
            assert.equal(await cards.nth(1).locator('.vt-st').textContent(), `${wait} 1h 59m`, 'interval must decrease the countdown');
            assert.equal(await cards.nth(0).locator('.vt-st').textContent(), `${wait} 23h 59m`);
            await page.clock.fastForward(119 * 60000);
            assert.equal(await cards.nth(1).locator('.vt-st').textContent(), ready, 'expired cooldown must become available');
            for (mode of ['invalid', 'network', 'unavailable']) {
              await page.reload({ waitUntil: 'domcontentloaded' });
              await page.waitForFunction(() => document.querySelector('#vt-sites').textContent === '...');
              assert.equal(await cards.count(), 0, `${mode} must not show vote links`);
            }
            assert.deepEqual(errors, []);
            report.push({ width, lang, ...layout, checks: ['links', 'disabled', 'inert-name', 'cooldown', 'cooldown-decrease', 'cooldown-expiry', 'nick-persistence', 'invalid-json', 'network-error', '503-html-body'] });
          } catch (error) { failures++; throw error; }
          finally { await context.close(); }
        });
        if (t.signal.aborted || failures >= 2) return;
      }
    }
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'votes-report.json'), JSON.stringify({ complete: report.length === 6 && !failures, results: report }, null, 2) + '\n');
    }
  }
});
