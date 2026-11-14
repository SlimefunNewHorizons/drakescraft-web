// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/graphs-picking.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

test('WebGL hover and click inspect a real node at each mobile width', { timeout: 45000 }, async () => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const source = await readFile(new URL('../scripts/grafos.js', import.meta.url));
  // Two nodes and one edge in the public DGR1 format; node zero is at screen center.
  const graph = Buffer.alloc(44);
  graph.write('DGR1');
  graph.writeUInt32LE(2, 4);
  graph.writeUInt32LE(1, 8);
  graph.writeUInt32LE(1, 12);
  graph.writeInt16LE(16000, 26);
  graph.set([0, 1, 0, 0, 1, 1, 0, 0], 32);
  graph.writeUInt16LE(1, 42);
  const meta = { graphs: [{ id: 'labs', title: 'Fixture', file: 'fixture.bin', nodes: 2, edges: 1, public: true, labels: 'fixture.lbl' }] };
  const server = createServer((req, res) => {
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (req.url === '/grafos.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); }
    else if (req.url === '/assets/grafos/meta.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(meta)); }
    else if (req.url === '/assets/grafos/fixture.bin') res.end(graph);
    else if (req.url === '/assets/grafos/fixture.lbl') res.end('Center fixture\nSecond fixture');
    else {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width">
        <style>.sg-stage{height:380px}.sg-canvas{width:100%;height:100%;display:block}.sg-tip{position:absolute}</style>
        <div data-grafos data-sets="labs"></div><script src="/grafos.js"></script></html>`);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const width of [375, 393, 412]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push({ name: error.name, message: error.message }));
        await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('.sg-canvas')?.getAttribute('aria-label')?.startsWith('Fixture:'));
        const canvas = page.locator('.sg-canvas');
        const box = await canvas.boundingBox();
        const center = { x: box.width / 2, y: box.height / 2 };
        await canvas.hover({ position: center });
        await page.waitForTimeout(50);
        assert.deepEqual(errors, [], `hover at ${width}px must not throw`);
        await page.waitForFunction(() => !document.querySelector('.sg-tip').hidden);
        assert.match(await page.locator('.sg-inspector').textContent(), /Center fixture|Símbolo #0/);
        await canvas.click({ position: center });
        await page.mouse.move(0, 0);
        assert.match(await page.locator('.sg-inspector').textContent(), /Center fixture|Símbolo #0/, 'click must keep the inspected node pinned after leaving');
        assert.deepEqual(errors, [], `click at ${width}px must not throw`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
