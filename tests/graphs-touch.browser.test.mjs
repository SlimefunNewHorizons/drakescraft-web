// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/graphs-touch.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

test('WebGL touch: selection, drag, cancellation and pinch at mobile widths', {
  skip: !process.env.PLAYWRIGHT_MODULE, timeout: 90000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const source = await readFile(new URL('../scripts/grafos.js', import.meta.url));
  const styles = await readFile(new URL('../styles/grafos.css', import.meta.url));
  const graph = Buffer.alloc(44);
  graph.write('DGR1'); graph.writeUInt32LE(2, 4); graph.writeUInt32LE(1, 8); graph.writeUInt32LE(1, 12);
  graph.writeInt16LE(16000, 26);
  graph.set([0, 1, 0, 0, 1, 1, 0, 0], 32); graph.writeUInt16LE(1, 42);
  const meta = { graphs: [{ id: 'labs', title: 'Touch fixture', file: 'fixture.bin', nodes: 2, edges: 1, public: true, labels: 'fixture.lbl' }] };
  const server = createServer((req, res) => {
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (req.url === '/grafos.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); }
    else if (req.url === '/grafos.css') { res.setHeader('Content-Type', 'text/css'); res.end(styles); }
    else if (req.url === '/assets/grafos/meta.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(meta)); }
    else if (req.url === '/assets/grafos/fixture.bin') res.end(graph);
    else if (req.url === '/assets/grafos/fixture.lbl') res.end('Center touch fixture\nSecond touch fixture');
    else if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="/grafos.css">
        <div data-grafos data-sets="labs"></div><script src="/grafos.js"></script></html>`);
    } else res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let failures = 0;
  const report = [];
  try {
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const width of [375, 393, 412]) {
      await t.test(`${width}px: trusted touch controls and pinch observation`, async () => {
        const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
        context.setDefaultTimeout(5000);
        const row = { width, errors: [], events: [], checks: [] };
        report.push(row);
        try {
          await context.route('**/*', route => route.request().url().startsWith(`${origin}/`) && route.request().method() === 'GET' ? route.continue() : route.abort());
          await context.addInitScript(() => {
            window.__touchAudit = { draws: 0, matrix: null, events: [] };
            for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
              const original = Type.prototype.uniformMatrix4fv;
              Type.prototype.uniformMatrix4fv = function (...args) {
                const result = Reflect.apply(original, this, args);
                if (this.canvas.classList.contains('sg-canvas')) {
                  window.__touchAudit.draws++;
                  window.__touchAudit.matrix = Array.from(args[2]);
                }
                return result;
              };
            }
            for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
              document.addEventListener(name, event => {
                if (event.target.classList.contains('sg-canvas')) window.__touchAudit.events.push({
                  type: event.type, pointerType: event.pointerType, trusted: event.isTrusted,
                });
              }, true);
            }
          });
          const page = await context.newPage();
          page.on('pageerror', error => row.errors.push(error.name));
          await page.goto(origin, { waitUntil: 'load' });
          await page.waitForFunction(() => window.__touchAudit.draws > 0);
          const canvas = page.locator('.sg-canvas');
          const box = await canvas.boundingBox();
          const x = box.x + box.width / 2, y = box.y + box.height / 2;
          const cdp = await context.newCDPSession(page);
          const point = (id, dx = 0, dy = 0) => ({ id, x: x + dx, y: y + dy, radiusX: 1, radiusY: 1, force: 1 });
          const touch = (type, touchPoints = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
          const snapshot = () => page.evaluate(() => structuredClone(window.__touchAudit));
          const nextDraw = before => page.waitForFunction(n => window.__touchAudit.draws > n, before.draws);
          const reset = async () => {
            const before = await snapshot();
            await page.locator('.sg-tool-btn').nth(3).tap();
            await nextDraw(before);
          };

          await touch('touchStart', [point(1)]); await touch('touchEnd');
          await page.waitForFunction(() => document.querySelector('.sg-inspector').textContent.includes('Center touch fixture'));
          row.checks.push('touch-selects-center');
          const initial = await snapshot();
          await touch('touchStart', [point(1)]);
          await touch('touchMove', [point(1, 40, 20)]);
          await nextDraw(initial);
          const dragged = await snapshot();
          assert.notDeepEqual(dragged.matrix, initial.matrix, 'one-finger drag changes the camera');
          await touch('touchEnd');
          row.checks.push('touch-drag');

          await touch('touchStart', [point(1)]); await touch('touchCancel');
          // Hover after cancellation must not continue a stale drag. Mouse is intentional here.
          await reset();
          const cancelled = await snapshot();
          await page.mouse.move(x + 50, y + 25);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.deepEqual((await snapshot()).matrix, cancelled.matrix, 'cancelled gesture must release drag state');
          row.checks.push('cancel-clears-drag');

          await reset();
          const beforePinch = await snapshot();
          await touch('touchStart', [point(1, -30), point(2, 30)]);
          for (const distance of [40, 50, 60, 70]) {
            await touch('touchMove', [point(1, -distance), point(2, distance)]);
          }
          await touch('touchEnd');
          await nextDraw(beforePinch);
          const pinched = await snapshot();
          // mvp[15] is camera distance for this renderer; rotations do not change it.
          row.pinch = { beforeDistance: beforePinch.matrix[15], afterDistance: pinched.matrix[15],
            matrixChanged: JSON.stringify(beforePinch.matrix) !== JSON.stringify(pinched.matrix),
            viewportScale: await page.evaluate(() => visualViewport.scale) };

          await reset();
          const beforeWheel = await snapshot();
          await canvas.hover(); await page.mouse.wheel(0, -120);
          await page.waitForFunction(distance => window.__touchAudit.matrix[15] !== distance, beforeWheel.matrix[15]);
          const wheeled = await snapshot();
          row.wheel = { beforeDistance: beforeWheel.matrix[15], afterDistance: wheeled.matrix[15] };
          assert.ok(row.wheel.afterDistance < row.wheel.beforeDistance, 'wheel positive control changes camera distance');
          row.checks.push('wheel-zoom-control');
          row.events = (await snapshot()).events;
          for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
            assert.ok(row.events.some(event => event.type === type && event.pointerType === 'touch' && event.trusted), `${type} must come from browser touch input`);
          }
          assert.deepEqual(row.errors, []);
          assert.equal(await canvas.evaluate(el => getComputedStyle(el).touchAction), 'none');
          assert.equal(row.pinch.viewportScale, 1, 'the page itself did not zoom');
          if (process.env.AUDIT_ARTIFACT_DIR) {
            await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
            await page.screenshot({ path: join(process.env.AUDIT_ARTIFACT_DIR, `graph-touch-${width}.png`) });
          }
        } catch (error) {
          failures++; row.failure = error.name; throw error;
        } finally {
          await context.close();
        }
      });
      if (failures >= 2 || t.signal.aborted) return;
    }
    await t.test('pinch spread zooms the graph camera at all three widths', () => {
      assert.equal(report.length, 3);
      const unchanged = report.filter(row => !(row.pinch?.afterDistance < row.pinch?.beforeDistance));
      assert.deepEqual(unchanged.map(row => row.width), [], 'two-finger spread must reduce camera distance, like the wheel control');
    });
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (process.env.AUDIT_ARTIFACT_DIR) {
      await mkdir(process.env.AUDIT_ARTIFACT_DIR, { recursive: true });
      await writeFile(join(process.env.AUDIT_ARTIFACT_DIR, 'graphs-touch-report.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
});
