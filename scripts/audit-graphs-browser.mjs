// Read-only public WebGL audit; artifacts stay outside the repository.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.argv[2] || 'http://127.0.0.1:8080');
assert.ok(['http:', 'https:'].includes(base.protocol), 'HTTP(S) base required');
const output = resolve(process.argv[3] || 'graphs-audit');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { base: base.origin, generated: new Date().toISOString(), complete: false, results: [] };
const checkpoint = () => writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
let failures = 0;
try {
  for (const width of [375, 393, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    // Observe the actual draw, before Chromium discards the drawing buffer.
    await context.addInitScript(() => {
      window.__graphAudit = { draws: 0, indexedDraws: 0, matrices: [], samples: [], contexts: [] };
      for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
        for (const name of ['drawArrays', 'drawElements', 'uniformMatrix4fv']) {
          const original = Type.prototype[name];
          Type.prototype[name] = function (...args) {
            const result = Reflect.apply(original, this, args);
            if (!this.canvas.classList.contains('sg-canvas')) return result;
            const audit = window.__graphAudit;
            if (name === 'uniformMatrix4fv') {
              audit.matrices.push(Array.from(args[2], value => Math.round(value * 100000)));
              if (audit.matrices.length > 8) audit.matrices.shift();
            } else if (name === 'drawElements') {
              audit.indexedDraws++;
            } else {
              audit.draws++;
              audit.contexts = [this.getParameter(this.VERSION), this.isContextLost()];
              const pixels = new Uint8Array(32 * 32 * 4);
              this.readPixels(Math.max(0, Math.floor(this.drawingBufferWidth / 2) - 16), Math.max(0, Math.floor(this.drawingBufferHeight / 2) - 16), 32, 32, this.RGBA, this.UNSIGNED_BYTE, pixels);
              let colored = 0;
              const colors = new Set();
              for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i + 3] && (pixels[i] || pixels[i + 1] || pixels[i + 2])) colored++;
                colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`);
              }
              audit.samples.push({ colored, colors: colors.size, error: this.getError() });
              if (audit.samples.length > 8) audit.samples.shift();
            }
            return result;
          };
        }
      }
    });
    const page = await context.newPage();
    const row = { width, errors: [], cspErrors: 0, checks: [], phase: 'navigation' };
    report.results.push(row);
    page.on('pageerror', error => row.errors.push({
      name: error.name,
      symbol: error.name === 'ReferenceError' ? error.message.match(/^([A-Za-z_$][\w$]*) is not defined$/)?.[1] : undefined,
      source: error.stack?.match(/\/scripts\/([A-Za-z0-9_.-]+\.js)(?:\?[^\s)]*)?:(\d+):(\d+)/)?.slice(1),
    }));
    page.on('console', message => {
      if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) row.cspErrors++;
    });
    try {
      const response = await page.goto(new URL('/saori.html', base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      row.status = response.status();
      assert.equal(row.status, 200);
      row.phase = 'canvas-visibility';
      const canvas = page.locator('[data-grafos] canvas.sg-canvas').first();
      await canvas.scrollIntoViewIfNeeded({ timeout: 10000 });
      row.phase = 'first-draw';
      await checkpoint();
      await page.waitForFunction(() => window.__graphAudit.draws > 0, null, { timeout: 30000 });
      const stats = () => page.evaluate(() => structuredClone(window.__graphAudit));
      const initial = await stats();
      assert.ok(initial.samples.some(sample => sample.colored > 0 && sample.colors > 1), 'WebGL must draw colored pixels');
      assert.ok(initial.samples.every(sample => sample.error === 0), 'WebGL must not report GL errors');
      assert.equal(initial.contexts[1], false, 'context must remain available');
      row.checks.push('colored-pixels', 'no-gl-errors', 'context-available');
      row.initial = initial;
      row.phase = 'controls';
      const tools = page.locator('[data-grafos] .sg-tool-btn');
      const toolLabel = await tools.nth(0).textContent();
      await tools.nth(0).click();
      assert.notEqual(await tools.nth(0).textContent(), toolLabel);
      row.checks.push('edge-control');
      const before = await stats();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 20, { steps: 5 });
      await page.mouse.up();
      await page.waitForFunction(draws => window.__graphAudit.draws > draws, before.draws, { timeout: 10000 });
      const dragged = await stats();
      assert.notDeepEqual(dragged.matrices.at(-1), before.matrices.at(-1), 'drag must change the projection');
      row.checks.push('drag-projection');
      await page.mouse.wheel(0, -120);
      await page.waitForFunction(draws => window.__graphAudit.draws > draws, dragged.draws, { timeout: 10000 });
      const zoomed = await stats();
      assert.notDeepEqual(zoomed.matrices.at(-1), dragged.matrices.at(-1), 'wheel must change the projection');
      row.checks.push('zoom-projection');
      const tabs = page.locator('[data-grafos] .sg-tab');
      await tabs.nth(1).click();
      await page.waitForFunction(() => document.querySelector('.sg-canvas')?.getAttribute('aria-label')?.startsWith('Galaxia Star'), null, { timeout: 30000 });
      await page.waitForFunction(draws => window.__graphAudit.draws > draws, zoomed.draws, { timeout: 10000 });
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
      row.checks.push('galaxy-tab');
      const resetBefore = await stats();
      await tools.nth(3).click();
      await page.waitForFunction(draws => window.__graphAudit.draws > draws, resetBefore.draws, { timeout: 10000 });
      row.checks.push('reset-draw');
      row.final = await stats();
      assert.ok(row.final.samples.every(sample => sample.error === 0));
      row.phase = 'screenshot';
      await checkpoint();
      await canvas.screenshot({ path: resolve(output, `graph-${width}.png`), animations: 'disabled', timeout: 45000 });
      row.screenshot = `graph-${width}.png`;
      row.phase = 'javascript-errors';
      assert.deepEqual(row.errors, []);
      row.phase = 'complete';
    } catch (error) {
      row.failure = error.name;
      row.reason = error instanceof assert.AssertionError ? error.message : 'Browser operation failed; inspect the last completed check';
      failures++;
    } finally {
      await context.close();
      await checkpoint();
    }
    console.log(JSON.stringify({ width, checks: row.checks, failure: row.failure, cspErrors: row.cspErrors }));
    if (failures >= 2) break;
  }
} finally {
  await browser.close();
  report.complete = report.results.length === 3 && failures === 0;
  await checkpoint();
}
if (!report.complete || report.results.some(row => row.cspErrors || row.errors.length)) process.exitCode = 1;
