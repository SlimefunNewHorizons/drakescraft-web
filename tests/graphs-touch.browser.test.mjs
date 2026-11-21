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
            for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture']) {
              document.addEventListener(name, event => {
                if (event.target.classList.contains('sg-canvas')) window.__touchAudit.events.push({
                  type: event.type, id: event.pointerId, x: event.clientX, y: event.clientY,
                  pointerType: event.pointerType, trusted: event.isTrusted,
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
          const nextDraw = async before => {
            await page.waitForFunction(n => window.__touchAudit.draws > n, before.draws);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          };
          const reset = async () => {
            const before = await snapshot();
            // Fixture setup: invoke the real reset handler without relying on
            // compatibility clicks synthesized immediately after CDP multitouch.
            await page.locator('.sg-tool-btn').nth(3).evaluate(el => el.click());
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

          const beforeClear = await snapshot();
          await canvas.dblclick();
          await nextDraw(beforeClear);
          assert.doesNotMatch(await page.locator('.sg-inspector').textContent(), /Center touch fixture/);
          const beforePinch = await snapshot();
          await touch('touchStart', [point(1, -30), point(2, 30)]);
          for (const distance of [40, 50, 60, 70]) {
            await touch('touchMove', [point(1, -distance), point(2, distance)]);
          }
          await nextDraw(beforePinch);
          const pinched = await snapshot();
          // mvp[15] is camera distance for this renderer; rotations do not change it.
          row.pinch = { beforeDistance: beforePinch.matrix[15], afterDistance: pinched.matrix[15],
            matrixChanged: JSON.stringify(beforePinch.matrix) !== JSON.stringify(pinched.matrix),
            viewportScale: await page.evaluate(() => visualViewport.scale) };
          assert.ok(row.pinch.afterDistance < row.pinch.beforeDistance, 'spreading fingers zooms in');
          assert.deepEqual(pinched.matrix.slice(0, 12), beforePinch.matrix.slice(0, 12), 'pinch does not rotate the camera');
          await touch('touchMove', [point(1, -15), point(2, 15)]);
          await nextDraw(pinched);
          const contracted = await snapshot();
          assert.ok(contracted.matrix[15] > pinched.matrix[15], 'bringing fingers together zooms out');
          assert.deepEqual(contracted.matrix.slice(0, 12), beforePinch.matrix.slice(0, 12));
          row.checks.push('pinch-both-directions-without-rotation');

          // A third finger must not hijack the active pair or select a node.
          await touch('touchStart', [point(1, -15), point(2, 15), point(3, 0, 40)]);
          await touch('touchMove', [point(1, -15), point(2, 15), point(3, 20, 60)]);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.deepEqual((await snapshot()).matrix, contracted.matrix, 'third-finger movement leaves the camera unchanged');
          // Chromium's legacy CDP touch backend ends the IDs supplied here;
          // an empty list ends all IDs. Omitting IDs from touchMove keeps them down.
          // Require real pointerup events so a backend change cannot pass silently.
          const downs = (await snapshot()).events.filter(e => e.type === 'pointerdown' && e.pointerType === 'touch').slice(-3);
          await touch('touchEnd', [point(1, -15)]);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const afterLift = await snapshot();
          assert.deepEqual(afterLift.matrix, contracted.matrix, 'replacing a pinch contact must not jump the camera');
          await touch('touchMove', [point(2, 15), point(3, 35, 85)]);
          await nextDraw(afterLift);
          const replaced = await snapshot();
          assert.ok(replaced.matrix[15] < contracted.matrix[15], 'the replacement pair continues pinch zoom');
          assert.deepEqual(replaced.matrix.slice(0, 12), contracted.matrix.slice(0, 12), 'the replacement pair does not rotate');
          await touch('touchEnd', [point(3, 35, 85)]);
          const released = (await snapshot()).events.filter(e => e.type === 'pointerup').slice(-2);
          assert.deepEqual(released.map(e => e.id), [downs[0].id, downs[2].id], 'only the lifted contacts are released');
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const remaining = await snapshot();
          assert.deepEqual(remaining.matrix, replaced.matrix, 'lifting fingers must not jump the camera');
          await touch('touchMove', [point(2, 35, 12)]);
          await nextDraw(remaining);
          const resumed = await snapshot();
          assert.notDeepEqual(resumed.matrix.slice(0, 12), remaining.matrix.slice(0, 12), 'remaining finger resumes rotation');
          assert.equal(resumed.matrix[15], remaining.matrix[15], 'remaining finger does not zoom');
          await touch('touchEnd');
          assert.doesNotMatch(await page.locator('.sg-inspector').textContent(), /Center touch fixture/, 'multitouch must not pin a node');
          await reset();
          await touch('touchStart', [point(1)]);
          await touch('touchMove', [point(1, 20, 12)]);
          await page.waitForFunction(matrix => JSON.stringify(window.__touchAudit.matrix.slice(0, 12)) !== JSON.stringify(matrix), beforePinch.matrix.slice(0, 12));
          assert.deepEqual((await snapshot()).matrix.slice(0, 12), resumed.matrix.slice(0, 12), 'resumed rotation matches the same single-finger displacement without a jump');
          await touch('touchEnd');
          row.checks.push('three-fingers-and-resumed-single-drag');

          await reset();
          await touch('touchStart', [point(1, -3), point(2, 3)]);
          await touch('touchMove', [point(1, -140), point(2, 140)]);
          await page.waitForFunction(() => Math.abs(window.__touchAudit.matrix[15] - 1.1) < 0.00001);
          const lower = await snapshot();
          await touch('touchMove', [point(1, -0.5), point(2, 0.5)]);
          await page.waitForFunction(() => Math.abs(window.__touchAudit.matrix[15] - 6.5) < 0.00001);
          row.limits = { near: lower.matrix[15], far: (await snapshot()).matrix[15] };
          await touch('touchCancel');
          const cancelledPinch = await snapshot();
          await page.mouse.move(x, y); await page.mouse.down();
          await page.mouse.move(x + 30, y + 15); await page.mouse.up();
          await nextDraw(cancelledPinch);
          assert.notDeepEqual((await snapshot()).matrix.slice(0, 12), cancelledPinch.matrix.slice(0, 12), 'cancelling a pinch releases both contacts for a mouse drag');
          row.checks.push('pinch-respects-wheel-limits');

          // Release real pointer capture while contact is still present; a subsequent
          // mouse drag and a fresh touch must both work without stale touch state.
          await reset();
          await touch('touchStart', [point(1)]);
          const pending = await snapshot();
          const pendingId = pending.events.filter(e => e.type === 'pointerdown').at(-1).id;
          // Pointer capture is pending until the next pointer event. Commit it
          // before requesting its loss, rather than cancelling a pending capture.
          await touch('touchMove', [point(1, 1)]);
          await page.waitForFunction(({ id, start }) => window.__touchAudit.events.slice(start).some(e => e.type === 'gotpointercapture' && e.id === id), { id: pendingId, start: pending.events.length });
          await page.waitForFunction(matrix => JSON.stringify(window.__touchAudit.matrix) !== JSON.stringify(matrix), pending.matrix);
          const captured = await snapshot();
          const capturedId = captured.events.filter(e => e.type === 'pointerdown').at(-1).id;
          await page.mouse.move(x + 45, y + 20); await page.mouse.down();
          await page.mouse.move(x + 65, y + 30); await page.mouse.up();
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.deepEqual((await snapshot()).matrix, captured.matrix, 'mouse input cannot hijack active touch');
          await canvas.evaluate((el, id) => el.releasePointerCapture(id), capturedId);
          await touch('touchMove', [point(1, 25, 10)]);
          await page.waitForFunction(({ id, start }) => window.__touchAudit.events.slice(start).some(e => e.type === 'lostpointercapture' && e.id === id), { id: capturedId, start: captured.events.length });
          await touch('touchEnd');
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.deepEqual((await snapshot()).matrix, captured.matrix, 'lost capture clears drag state');
          const beforeMouse = await snapshot();
          await page.mouse.move(x, y); await page.mouse.down();
          await page.mouse.move(x + 30, y + 15); await page.mouse.up();
          await nextDraw(beforeMouse);
          assert.notDeepEqual((await snapshot()).matrix, beforeMouse.matrix, 'mouse drag still rotates after lost capture');
          await reset();
          await touch('touchStart', [point(1)]); await touch('touchEnd');
          await page.waitForFunction(() => document.querySelector('.sg-inspector').textContent.includes('Center touch fixture'));
          row.checks.push('lost-capture-mouse-drag-and-fresh-tap');

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
          row.events = await context.pages()[0]?.evaluate(() => window.__touchAudit?.events).catch(() => []);
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
