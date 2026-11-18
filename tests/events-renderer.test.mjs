import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const pages = ['eventos.html', 'events-en.html', 'web/eventos.html', 'web/events-en.html'];
async function renderer(page) {
  const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).filter(script => script.includes('async function loadEvents()'));
  assert.equal(scripts.length, 1);
  return scripts[0].replace(/\r\n/g, '\n');
}

for (const page of pages) {
  test(`${page}: HTTP errors are rejected before JSON parsing or DOM changes`, async () => {
    const source = await renderer(page);
    for (const status of [400, 401, 404, 429, 500, 503]) {
      let jsonReads = 0;
      let domWrites = 0;
      const errors = [];
      const context = {
        fetch: async () => ({ ok: false, status, json() { jsonReads++; throw new Error('must not parse'); } }),
        document: { querySelectorAll() { domWrites++; throw new Error('must not reveal schedule'); } },
        console: { error: (...args) => errors.push(args) },
      };
      runInNewContext(source, context);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(jsonReads, 0, `HTTP ${status}`);
      assert.equal(domWrites, 0, `HTTP ${status}`);
      assert.deepEqual(errors, []);
    }
  });

  test(`${page}: text escaping preserves symbols without creating markup`, async () => {
    const source = await renderer(page);
    const context = {
      fetch: async () => ({ ok: true, json: async () => ({ ok: false }) }),
      console: { error() { assert.fail('unexpected renderer error'); } },
    };
    runInNewContext(source, context);
    assert.equal(context.eventText(`<b title="'">A & B</b>`), '&lt;b title=&quot;&#39;&quot;&gt;A &amp; B&lt;/b&gt;');
    assert.equal(context.eventText('&lt;b&gt;'), '&amp;lt;b&amp;gt;');
    assert.equal(context.eventText('RUSH_MINING'), 'RUSH_MINING');
    assert.equal(context.eventText(3), '3');
    assert.equal(context.eventText(null), '');
    assert.equal(context.eventText(undefined), '');
    await new Promise(resolve => setImmediate(resolve));
  });
}

test('root and web copies execute the same renderer for each language', async () => {
  for (const page of pages.slice(0, 2)) {
    assert.equal(await renderer(page), await renderer(`web/${page}`));
  }
});
