// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/metrics-mobile.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const inertNick = '<img src=x onerror="window.metricsInjected=true">';
const players = Array.from({ length: 27 }, (_, i) => ({
  nick: i === 0 ? inertNick : `Fixture_${i}`, nuevo: i === 0,
  pais: 'CL', pais_nombre: 'Chile', bandera: 'CL', dias: 3,
  primera: '2026-11-01', ultima: '2026-11-14', franja: '18:00–22:00',
}));
const metrics = {
  generado: '2026-11-14T12:00:00Z',
  frases: { mes: 'Fixture mensual', semana: 'Fixture semanal' },
  hoy: { pico: 12, jugadores: [inertNick] }, ayer: { pico: 9 }, nuevos: [inertNick],
  semana: { pico_medio: 8 },
  mes: { pico_medio: 7, pico_maximo: 12, jugadores_distintos: 27,
    franja_habitual: '18:00–22:00', por_hora: { 18: 5, 19: 12 } },
  historico: { '2026-11-13': 9, '2026-11-14': 12 },
  paises: [{ iso: 'CL', nombre: 'Chile', bandera: 'CL', jugadores: 27 }],
  jugadores: players,
};

test('metrics mobile: real markup, styles and renderers with synthetic API data', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ headless: true });
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/metricas' || path === '/api/edge-metrics') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(path === '/api/metricas' ? metrics : {
          edge_network: { status: 'operational', edge_cache_ratio: '90%' },
        }));
      }
      if (['/metricas.html', '/metricas-en.html'].includes(path)) {
        const source = await readFile(join(root, path.slice(1)), 'utf8');
        // Let Chromium parse the actual markup, including malformed closing tags.
        // Remove unrelated scripts and remote fonts without synthesizing a main.
        const document = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
          .replace(/<link\b[^>]*>/g, tag => /href="https?:/.test(tag) ? '' : tag)
          .replace('</body>', `<script src="/scripts/metricas${path.includes('-en') ? '-en' : ''}.js"></script></body>`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(document);
      }
      if (!/^\/scripts\/metricas(?:-en)?\.js$/.test(path)
        && !/^\/styles\/[\w-]+\.css$/.test(path)
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
  let failures = 0;
  try {
    for (const width of [375, 393, 412]) {
      for (const lang of ['es', 'en']) {
        await t.test(`${lang} ${width}px: table expansion, safe text and API failure`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
          context.setDefaultTimeout(5000);
          await context.route('**/*', route => {
            const req = route.request();
            return req.url().startsWith(`${origin}/`) && ['GET', 'HEAD'].includes(req.method()) ? route.continue() : route.abort();
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.name));
          const url = `${origin}/metricas${lang === 'en' ? '-en' : ''}.html`;
          try {
            assert.equal((await page.goto(url, { waitUntil: 'domcontentloaded' })).status(), 200);
            await page.waitForFunction(() => document.querySelectorAll('#tabla-jugadores tbody tr').length === 25);
            assert.equal(await page.locator('#horas .hora').count(), 24);
            assert.equal(await page.locator('#dias .dia').count(), 2);
            assert.equal(await page.locator('#nicks-hoy .nick').textContent(), inertNick);
            assert.equal(await page.locator('#tabla-jugadores tbody tr:first-child .jug__nick img').count(), 0);
            assert.equal(await page.evaluate(() => window.metricsInjected), undefined);
            const more = page.locator('#jugadores-mas');
            await more.click();
            assert.equal(await page.locator('#tabla-jugadores tbody tr').count(), 27);
            await more.click();
            assert.equal(await page.locator('#tabla-jugadores tbody tr').count(), 25);
            const layout = await page.evaluate(() => {
              const scroll = document.querySelector('.tabla-jugadores__scroll');
              return { viewport: document.documentElement.clientWidth,
                document: document.documentElement.scrollWidth,
                tableContainer: scroll.getBoundingClientRect().width,
                overflowX: getComputedStyle(scroll).overflowX };
            });
            assert.ok(layout.document <= width + 1, `document overflow: ${JSON.stringify(layout)}`);
            assert.ok(layout.tableContainer <= width + 1, 'wide table stays inside the viewport');
            assert.match(layout.overflowX, /auto|scroll/, 'table has its own horizontal scroller');
            if (process.env.AUDIT_ARTIFACT_DIR) {
              await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
              await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `metrics-${lang}-${width}.png`), animations: 'disabled', timeout: 15000 });
            }
            await context.route('**/api/metricas', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => /Metrics are not available|todavía no se han generado/.test(document.querySelector('#frase-mes').textContent));
            assert.equal(await page.locator('#tabla-jugadores tbody tr').count(), 0, 'failed request cannot retain the previous player table');
            assert.equal(await more.isVisible(), false);
            assert.deepEqual(errors, []);
          } catch (error) {
            failures++;
            throw error;
          } finally {
            await context.close();
          }
        });
        if (t.signal.aborted || failures >= 2) return;
      }
    }
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
