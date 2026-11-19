import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

for (const prefix of ['', 'web/']) {
  test(`${prefix}Edge endpoint reports unavailable without measured telemetry`, async () => {
    const source = await read(`${prefix}server.js`);
    const start = source.indexOf("app.get('/api/edge-metrics'");
    const end = source.indexOf("\napp.get('/api/mcstatus'", start);
    assert.ok(start >= 0 && end > start);
    let handler;
    runInNewContext(source.slice(start, end), {
      app: { get(route, callback) { assert.equal(route, '/api/edge-metrics'); handler = callback; } },
    }, { timeout: 1000 });
    const headers = {};
    let status;
    const response = await handler({}, {
      code(value) { status = value; },
      header(key, value) { headers[key] = value; },
    });
    assert.equal(status, 503);
    assert.equal(headers['cache-control'], 'no-store');
    assert.equal(response.edge_network.status, 'unknown');
    assert.equal(response.edge_network.edge_cache_ratio, null);
    assert.ok(response.error);
    for (const pop of response.edge_network.primary_pops) {
      assert.equal(pop.latency_ms, null);
      assert.equal(pop.status, 'unknown');
    }
    for (const modality of response.minecraft_infrastructure.modalities) assert.equal(modality.status, 'unknown');
  });

  for (const lang of ['', '-en']) {
    const unknown = lang ? 'NO DATA' : 'SIN DATOS';
    const operational = lang ? 'OPERATIONAL' : 'OPERATIVO';
    const maintenance = lang ? 'UNDER MAINTENANCE' : 'EN MANTENIMIENTO';
    test(`${prefix}metrics${lang}: initial HTML has no measured Edge values`, async () => {
      const html = await read(`${prefix}metricas${lang}.html`);
      assert.ok(html.includes(`id="edge-status" data-state="unknown">${unknown}</span>`));
      assert.ok(html.includes('id="edge-cache-ratio">—</span>'));
    });

    for (const [name, edge, expectedStatus, expectedRatio] of [
      ['healthy', { status: 'operational', edge_cache_ratio: '81.2%' }, operational, '81.2%'],
      ['zero ratio', { status: 'maintenance', edge_cache_ratio: '0%' }, maintenance, '0%'],
      ['full ratio', { status: 'operational', edge_cache_ratio: '100%' }, operational, '100%'],
      ['missing network', undefined, unknown, '—'],
      ['null network', null, unknown, '—'],
      ['array network', [], unknown, '—'],
      ['unknown status', { status: 'bogus', edge_cache_ratio: '12%' }, unknown, '12%'],
      ['missing ratio', { status: 'operational' }, operational, '—'],
      ['numeric ratio', { status: 'operational', edge_cache_ratio: 95.4 }, operational, '—'],
      ['object ratio', { status: 'operational', edge_cache_ratio: {} }, operational, '—'],
      ['overflow ratio', { status: 'operational', edge_cache_ratio: '100.1%' }, operational, '—'],
      ['negative ratio', { status: 'operational', edge_cache_ratio: '-1%' }, operational, '—'],
      ['HTML ratio', { status: 'operational', edge_cache_ratio: '<b>95%</b>' }, operational, '—'],
      ['HTTP failure', 'http-error', unknown, '—'],
      ['JSON failure', 'json-error', unknown, '—'],
      ['network failure', 'network-error', unknown, '—'],
    ]) {
      test(`${prefix}metrics${lang}: ${name}`, async () => {
        const elements = new Map(['horas', 'frase-mes', 'edge-status', 'edge-cache-ratio']
          .map(id => [id, { textContent: 'old value', dataset: {} }]));
        const source = await read(`${prefix}scripts/metricas${lang}.js`);
        runInNewContext(source, {
          document: { getElementById: id => elements.get(id) || null },
          fetch: async url => {
            if (url === '/api/metricas') return { ok: false };
            assert.equal(url, '/api/edge-metrics');
            if (edge === 'network-error') throw new Error('fixture');
            return { ok: edge !== 'http-error', json: async () => {
              if (edge === 'json-error') throw new SyntaxError('fixture');
              return { edge_network: edge };
            } };
          },
        }, { timeout: 1000 });
        // The synchronous loading state must clear stale success before fetch resolves.
        assert.equal(elements.get('edge-status').textContent, unknown);
        assert.equal(elements.get('edge-cache-ratio').textContent, '—');
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(elements.get('edge-status').textContent, expectedStatus);
        assert.equal(elements.get('edge-cache-ratio').textContent, expectedRatio);
        assert.equal(elements.get('edge-status').dataset.state,
          expectedStatus === operational ? 'operational' : expectedStatus === maintenance ? 'maintenance' : 'unknown');
      });
    }
  }
}
