// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/events-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const events = ['BOOST', 'RUSH_MINING', 'SUPPLY_DROP', 'COMBO', 'GALA', 'BOOST'].map((kind, i) => ({
  day: i + 1, kind, time: '20:00', duration_minutes: 30,
  phase: i === 4 ? 'cumple_owner' : i === 5 ? 'semana_cumple' : 'normal',
  name_es: `Evento ficticio ${i + 1}`, name_en: `Synthetic event ${i + 1}`,
  summary_es: 'Descripción de prueba con palabras normales para comprobar los saltos de línea en una pantalla pequeña. '.repeat(3),
  summary_en: 'Test description with ordinary words to check wrapping on a small screen. '.repeat(3),
  reward_es: 'Recompensa ficticia sin entrega', reward_en: 'Synthetic reward without delivery',
}));
const active = { ok: true, status: 'active', events, todayEvent: events[2], currentDay: 3, isNovember: true };
// Benign markup only: detect DOM interpretation without executing scripts or loading resources.
const markup = field => `<b data-event-fixture="${field}">Synthetic ${field}</b>`;
const markedEvent = { ...events[0], ...Object.fromEntries(
  ['name_es', 'name_en', 'summary_es', 'summary_en', 'reward_es', 'reward_en'].map(field => [field, markup(field)]),
) };
const markedActive = { ...active, events: [markedEvent], todayEvent: markedEvent, currentDay: 1 };

test('events mobile: calendar states, HTTP errors and literal API text with real renderer', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      if (['/eventos.html', '/events-en.html'].includes(path)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        const main = source.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
        const body = source.match(/<body\b[^>]*>/)?.[0];
        const renderer = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
          .filter(match => match[1].includes('async function loadEvents()'));
        assert.ok(main && body);
        assert.equal(renderer.length, 1, 'exercise the real inline renderer without other scripts');
        const styles = [...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*>/g)]
          .map(match => match[0]).filter(tag => tag.startsWith('<style')
            || /rel="stylesheet"/.test(tag) && /href="(?!https?:\/\/)/.test(tag));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`<!doctype html><html lang="${path.includes('-en') ? 'en' : 'es'}">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styles.join('\n')}${body}${main}${renderer[0][0]}</body></html>`);
      }
      if (!/^\/styles\/[\w-]+\.css$/.test(path) && path !== '/vendor/bootstrap/bootstrap.min.css') { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', 'text/css');
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
      for (const lang of ['es', 'en']) {
        await t.test(`${lang} ${width}px: cancellation, API errors and active layout`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          const row = { width, lang, states: [], errors: [], failedStyles: [] };
          report.push(row);
          try {
            await context.route('**/*', route => route.request().url().startsWith(`${origin}/`)
              && route.request().method() === 'GET' ? route.continue() : route.abort());
            const page = await context.newPage();
            page.on('pageerror', error => row.errors.push(error.name));
            page.on('response', response => {
              if (new URL(response.url()).pathname.endsWith('.css') && response.status() !== 200) row.failedStyles.push(response.status());
            });
            // Synchronize on renderer completion, including its catch path, without a fixed delay.
            await page.addInitScript(() => {
              const fetchOriginal = window.fetch;
              window.__eventsSettled = 0;
              window.fetch = async (...args) => {
                const response = await Reflect.apply(fetchOriginal, window, args);
                const jsonOriginal = response.json.bind(response);
                const settled = () => setTimeout(() => { window.__eventsSettled = 1; }, 0);
                // A renderer that rejects HTTP errors before parsing JSON must also finish this fixture.
                if (!response.ok) settled();
                response.json = async () => {
                  try { return await jsonOriginal(); }
                  finally { settled(); }
                };
                return response;
              };
            });
            for (const state of ['cancelled', 'unavailable', 'invalid-json', 'active', 'http-error-active', 'markup']) {
              const data = state === 'markup' ? markedActive : ['active', 'http-error-active'].includes(state)
                ? active : state === 'cancelled' ? { ...active, status: 'cancelled' } : { ok: false };
              await page.route('**/api/eventos', route => route.fulfill({
                status: ['unavailable', 'http-error-active'].includes(state) ? 503 : 200,
                contentType: 'application/json', body: state === 'invalid-json' ? '{invalid' : JSON.stringify(data),
              }));
              const response = await page.goto(`${origin}/${lang === 'en' ? 'events-en' : 'eventos'}.html`, { waitUntil: 'domcontentloaded' });
              assert.equal(response.status(), 200);
              await page.waitForFunction(() => window.__eventsSettled === 1);
              assert.equal(await page.locator('link[rel="stylesheet"]').count(), lang === 'en' ? 6 : 8);
              assert.equal(await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
                .every(link => link.sheet?.cssRules.length > 0)), true, 'all actual local styles must load');
              const cards = page.locator('#calendar-grid .event-card');
              const schedule = page.locator('[data-event-schedule]');
              assert.equal(await schedule.count(), 5, 'the cancellation check must cover the actual schedule nodes');
              const observation = { state, cards: await cards.count(),
                visibleSchedule: await schedule.evaluateAll(nodes => nodes.filter(node => !node.hidden && getComputedStyle(node).display !== 'none').length),
                markupNodes: await page.locator('[data-event-fixture]').count(),
              };
              if (state === 'markup') {
                // The textContent paths provide a positive control for this same payload.
                assert.equal(await page.locator('#today-title').textContent(), `${lang === 'en' ? 'Day' : 'Día'} 1: ${markup(`name_${lang}`)}`);
                assert.equal(await page.locator('#today-desc').textContent(), markup(`summary_${lang}`));
                assert.equal(await page.locator('#today-title [data-event-fixture], #today-desc [data-event-fixture]').count(), 0);
                observation.literalFields = await page.evaluate(() => {
                  const card = document.querySelector('.event-card');
                  return [card?.querySelector('h3')?.textContent, card?.querySelector('p')?.textContent,
                    card?.lastElementChild?.textContent, document.querySelector('#today-reward').textContent];
                });
                observation.markupFields = await page.locator('[data-event-fixture]').evaluateAll(nodes => nodes.map(node => node.dataset.eventFixture));
              } else if (state === 'http-error-active') {
                observation.todayTitle = await page.locator('#today-title').textContent();
              } else if (state !== 'active') {
                assert.equal(await cards.count(), 0);
                assert.equal(await schedule.evaluateAll(nodes => nodes.every(node => node.hidden && getComputedStyle(node).display === 'none')), true);
                assert.match(await page.locator('#today-title').textContent(), lang === 'en' ? /cancelled/i : /cancelado/i);
              } else {
                assert.equal(await cards.count(), events.length);
                assert.equal(await schedule.evaluateAll(nodes => nodes.every(node => !node.hidden && getComputedStyle(node).display !== 'none')), true);
                assert.equal(await page.locator('#today-title').textContent(), `${lang === 'en' ? 'Day' : 'Día'} 3: ${events[2][`name_${lang}`]}`);
                assert.equal(await page.locator('#today-desc').textContent(), events[2][`summary_${lang}`]);
                assert.ok((await page.locator('#today-reward').textContent()).includes(events[2][`reward_${lang}`]));
                assert.equal(await page.locator('.event-card--active').count(), 1);
                assert.equal(await page.locator('.event-card--birthday').count(), 1);
                assert.equal(await page.locator('.event-card--gala').count(), 1);
                for (const badge of ['boost', 'rush', 'drop', 'combo', 'gala']) {
                  assert.ok(await page.locator(`.event-badge--${badge}`).count() > 0);
                }
                assert.deepEqual(await cards.locator('h3').allTextContents(), events.map(event => event[`name_${lang}`]));
              }
              const layout = await page.evaluate(() => {
                const box = document.querySelector('#evento-hoy');
                const parent = box.getBoundingClientRect();
                const title = document.querySelector('#today-title').getBoundingClientRect();
                const css = getComputedStyle(box, '::before');
                const border = getComputedStyle(box);
                const number = (style, property) => parseFloat(style[property]) || 0;
                const extraWidth = css.boxSizing === 'border-box' ? 0
                  : number(css, 'paddingLeft') + number(css, 'paddingRight') + number(css, 'borderLeftWidth') + number(css, 'borderRightWidth');
                const extraHeight = css.boxSizing === 'border-box' ? 0
                  : number(css, 'paddingTop') + number(css, 'paddingBottom') + number(css, 'borderTopWidth') + number(css, 'borderBottomWidth');
                const right = parent.right - number(border, 'borderRightWidth') - number(css, 'right');
                const top = parent.top + number(border, 'borderTopWidth') + number(css, 'top');
                const badge = { right, top, left: right - number(css, 'width') - extraWidth, bottom: top + number(css, 'height') + extraHeight };
                const titleBadgeOverlap = Math.max(0, Math.min(title.right, badge.right) - Math.max(title.left, badge.left))
                  * Math.max(0, Math.min(title.bottom, badge.bottom) - Math.max(title.top, badge.top));
                return {
                  document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
                  cardWidths: [...document.querySelectorAll('.event-card')].map(card => Math.round(card.getBoundingClientRect().width)),
                  titleBadgeOverlap: Math.round(titleBadgeOverlap),
                };
              });
              row.states.push({ ...observation, ...layout });
              assert.ok(layout.document <= layout.viewport + 1, `horizontal overflow: ${JSON.stringify(layout)}`);
              if (process.env.AUDIT_ARTIFACT_DIR && ['cancelled', 'active'].includes(state)) {
                await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
                await page.locator(state === 'active' ? '#calendar-grid' : '#evento-hoy').scrollIntoViewIfNeeded();
                await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `events-${lang}-${width}-${state}.png`), animations: 'disabled', timeout: 10000 });
              }
              await page.unroute('**/api/eventos');
            }
            assert.deepEqual(row.errors, []);
            assert.deepEqual(row.failedStyles, []);
          } catch (error) {
            failures++;
            row.failure = error.name;
            throw error;
          } finally {
            await context.close();
          }
        });
        if (failures >= 2 || t.signal.aborted) return;
      }
    }
    // Collect all widths/languages before checking defects; keep every observation in the report.
    // #814: HTTP status must take precedence over an apparently successful JSON body.
    await t.test('HTTP503 must not activate a calendar even with an active JSON body', () => {
      const observations = report.map(row => ({ width: row.width, lang: row.lang,
        ...row.states.find(state => state.state === 'http-error-active') }));
      assert.equal(observations.length, 6);
      assert.ok(observations.every(row => row.state === 'http-error-active'
        && row.cards === 0 && row.visibleSchedule === 0), JSON.stringify(observations));
    });
    // #815: API fields must remain text in both the cards and today's reward.
    await t.test('event names, descriptions and rewards remain literal text', () => {
      const observations = report.map(row => ({ width: row.width, lang: row.lang,
        ...row.states.find(state => state.state === 'markup') }));
      assert.equal(observations.length, 6);
      assert.ok(observations.every(row => row.state === 'markup' && row.cards === 1
        && row.markupNodes === 0 && row.literalFields?.length === 4
        && row.literalFields[0] === markup(`name_${row.lang}`)
        && row.literalFields[1] === markup(`summary_${row.lang}`)
        && row.literalFields.slice(2).every(text => text?.includes(markup(`reward_${row.lang}`)))), JSON.stringify(observations));
    });
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'events-report.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
});
