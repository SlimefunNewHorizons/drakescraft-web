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

test('mobile audit covers English guide, votes and events by default and at every supported width', { timeout: 120000 }, async () => {
  const output = await mkdtemp(join(tmpdir(), 'drakes-mobile-english-'));
  const englishPages = ['guide-en.html', 'vote-en.html', 'events-en.html'];
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><body><p>English route fixture</p></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let child;
  try {
    // Check real document names without executing their APIs or third-party scripts.
    for (const page of englishPages) {
      assert.match(await readFile(new URL(`../${page}`, import.meta.url), 'utf8'), /<html\b[^>]*lang="en"/i);
    }
    const runAudit = async (name, widths, selectedPages) => {
      const target = join(output, name);
      const env = { ...process.env, AUDIT_WIDTHS: widths, AUDIT_SCREENSHOTS: '0' };
      delete env.AUDIT_PAGES;
      delete env.AUDIT_STRICT_TEXT;
      if (selectedPages) env.AUDIT_PAGES = selectedPages;
      child = spawn(process.execPath, [auditor, `http://127.0.0.1:${server.address().port}`, target], { env, stdio: 'ignore' });
      const code = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { child.kill(); reject(new Error('English route audit did not finish')); }, 75000);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', code => { clearTimeout(timer); resolve(code); });
      });
      assert.equal(code, 0);
      return JSON.parse(await readFile(join(target, 'report.json'), 'utf8'));
    };
    const defaults = await runAudit('default', '375');
    assert.equal(defaults.complete, true);
    for (const page of englishPages) {
      assert.equal(defaults.results.filter(row => row.page === page).length, 1, `${page} is covered by default`);
      assert.equal(requests.filter(url => url === `/${page}`).length, 1);
    }
    const selected = await runAudit('selected', '375,393,412', 'guide-en,vote-en,events-en');
    assert.equal(selected.complete, true);
    assert.deepEqual(selected.results.map(row => ({ page: row.page, width: row.width, status: row.status })),
      [375, 393, 412].flatMap(width => englishPages.map(page => ({ page, width, status: 200 }))));
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

test('mobile audit fails visible text below 12px and excludes transparent ancestors', { timeout: 40000 }, async () => {
  const output = await mkdtemp(join(tmpdir(), 'drakes-mobile-type-'));
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const content = req.url === '/terms.html'
      ? '<p style="font-size:11px">Small visible text</p>'
      : req.url === '/terms-en.html'
        ? '<section style="opacity:0"><p style="font-size:10px">Hidden text</p></section>'
        : '<p style="font-size:12px">Threshold text</p>';
    res.end(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width"><body>${content}</body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let child;
  try {
    const runAudit = async (strictText, widths, pages = 'terms,terms-en,apoya') => {
      const target = join(output, strictText ? 'strict' : 'default');
      const env = { ...process.env, AUDIT_PAGES: pages, AUDIT_WIDTHS: widths, AUDIT_SCREENSHOTS: '0' };
      delete env.AUDIT_STRICT_TEXT;
      if (strictText) env.AUDIT_STRICT_TEXT = '1';
      child = spawn(process.execPath, [auditor, `http://127.0.0.1:${server.address().port}`, target], { env, stdio: 'ignore' });
      const code = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { child.kill(); reject(new Error('typography audit did not finish')); }, 22000);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', code => { clearTimeout(timer); resolve(code); });
      });
      return { code, report: JSON.parse(await readFile(join(target, 'report.json'), 'utf8')) };
    };
    const { code, report } = await runAudit(true, '375,393,412');
    assert.equal(report.strictText, true);
    assert.equal(report.minTextSize, 12);
    assert.equal(report.complete, true);
    assert.equal(report.results.length, 9);
    const counts = report.results.map(row => ({ page: row.page, width: row.width, count: row.smallTextCount }));
    assert.deepEqual({ code, counts }, {
      code: 1,
      counts: [375, 393, 412].flatMap(width => [
        { page: 'terms.html', width, count: 1 },
        { page: 'terms-en.html', width, count: 0 },
        { page: 'apoya.html', width, count: 0 },
      ]),
    });
    for (const row of report.results) {
      assert.equal(row.status, 200);
      assert.deepEqual(row.errors, []);
      assert.deepEqual(row.cspViolations, []);
      assert.ok(row.scrollWidth <= row.viewport + 1);
      assert.deepEqual(row.smallText, row.page === 'terms.html'
        ? [{ selector: 'p', fontSize: '11px' }] : []);
    }
    const ordinary = await runAudit(false, '375');
    assert.equal(ordinary.code, 0, 'the existing informative mode stays successful for small text');
    assert.equal(ordinary.report.strictText, false);
    assert.equal(ordinary.report.complete, true);
    assert.equal(ordinary.report.results.length, 3);
    assert.deepEqual(ordinary.report.results.map(row => row.smallTextCount), [1, 0, 0]);
    const clean = await runAudit(true, '375', 'terms-en,apoya');
    assert.equal(clean.code, 0, 'strict mode succeeds when all visible text meets the threshold');
    assert.equal(clean.report.complete, true);
    assert.equal(clean.report.results.length, 2);
    assert.deepEqual(clean.report.results.map(row => row.smallTextCount), [0, 0]);
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

test('mobile audit records CSP violations without copying policy or URL parameters', { timeout: 20000 }, async () => {
  const output = await mkdtemp(join(tmpdir(), 'drakes-mobile-csp-'));
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'");
    res.end(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width">
      <body><p>CSP fixture</p>
      <script>throw new Error('blocked inline script executed')</script>
      <script src="/blocked.js?private=fixture-value"></script>
      <script src="https://blocked.invalid/external.js?private=fixture-value"></script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let child;
  try {
    child = spawn(process.execPath, [auditor, `http://127.0.0.1:${server.address().port}`, output], {
      env: { ...process.env, AUDIT_PAGES: 'terms', AUDIT_WIDTHS: '375', AUDIT_SCREENSHOTS: '0' },
      stdio: 'ignore',
    });
    const code = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('CSP audit did not finish')); }, 12000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(code, 1, 'enforced CSP must fail the audit');
    const raw = await readFile(join(output, 'report.json'), 'utf8');
    const report = JSON.parse(raw);
    assert.equal(report.complete, true);
    assert.equal(report.results.length, 1);
    const row = report.results[0];
    assert.deepEqual(row.errors, [], 'CSP prevented the inline script from running');
    assert.equal(row.cspViolations.length, 3);
    assert.deepEqual(new Set(row.cspViolations.map(v => v.blockedResource)), new Set(['inline', 'same-origin', 'https://blocked.invalid']));
    for (const violation of row.cspViolations) {
      assert.equal(violation.directive, 'script-src-elem');
      assert.equal(violation.disposition, 'enforce');
    }
    assert.equal(raw.includes('fixture-value'), false, 'URL query must stay out of the report');
    assert.equal(raw.includes('blocked.js'), false, 'resource paths must stay out of the report');
    assert.equal(raw.includes('external.js'), false, 'external resource paths must stay out of the report');
    assert.equal(raw.includes('default-src'), false, 'policy must stay out of the report');
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
