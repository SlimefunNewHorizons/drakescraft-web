// Opt-in: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/mobile-audit.browser.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const auditor = fileURLToPath(new URL('../scripts/audit-mobile.mjs', import.meta.url));

test('mobile audit measures DOM despite a pending image and isolates page storage', { timeout: 20000 }, async () => {
  const output = await mkdtemp(join(tmpdir(), 'drakes-mobile-fixture-'));
  let pendingImages = 0;
  const server = createServer((req, res) => {
    if (req.url === '/pending.png') {
      pendingImages++;
      return; // Simulate a resource that never completes the window load event.
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width">
      <body><p>Fixture</p><script>
        if (localStorage.getItem('visited')) throw new Error('storage leaked between pages');
        localStorage.setItem('visited', '1');
      </script><img src="/pending.png" width="1" height="1"></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let child;
  try {
    child = spawn(process.execPath, [auditor, `http://127.0.0.1:${server.address().port}`, output], {
      env: { ...process.env, AUDIT_PAGES: 'saori-en,grafos', AUDIT_WIDTHS: '375', AUDIT_SCREENSHOTS: '0' },
      stdio: 'ignore',
    });
    const code = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('auditor waited for a pending resource')); }, 12000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(code, 0);
    const report = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'));
    assert.equal(report.complete, true);
    assert.equal(report.results.length, 2);
    assert.equal(pendingImages, 2, 'both pages exercised the pending resource');
    for (const row of report.results) {
      assert.equal(row.phase, 'complete');
      assert.equal(row.status, 200);
      assert.deepEqual(row.errors, [], 'storage must not leak into the second page');
      assert.equal(row.viewport, 375);
    }
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
    }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(output, { recursive: true, force: true });
  }
});
