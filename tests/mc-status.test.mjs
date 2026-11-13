import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import test from 'node:test';

// Solo loopback y HTTP simulado: estas pruebas nunca consultan Dallas.
async function fixture(t, responder) {
  const server = net.createServer(responder);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return server.address().port;
}

for (const entry of ['../lib/mc-status.js', '../web/lib/mc-status.js']) {
  test(`${entry}: máximo del ping y caché, sin confundirlo con capacidad`, async t => {
    let conexiones = 0;
    const puerto = await fixture(t, socket => {
      conexiones++;
      socket.once('data', () => {
        const json = Buffer.from(JSON.stringify({ players: { online: 0, max: 2027 } }));
        assert.ok(json.length < 126);
        socket.end(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json]));
      });
    });
    t.mock.method(globalThis, 'fetch', () => { throw Error('HTTP inesperado'); });
    const { estadoServidor } = await import(`${entry}?test=ping`);
    const estado = await estadoServidor('127.0.0.1', puerto);
    assert.equal(estado.enLinea, true);
    assert.equal(estado.jugadores, 0);
    assert.equal(estado.maximo, 2027);
    assert.equal(estado.maximoFuente, 'server-list-ping');
    assert.deepEqual(await estadoServidor('127.0.0.1', puerto), estado);
    assert.equal(conexiones, 1);
  });

  test(`${entry}: respaldo HTTP y ausencia de medición`, async t => {
    // Liberar el puerto fuerza ECONNREFUSED sin conexiones externas.
    const cerrado = net.createServer();
    cerrado.listen(0, '127.0.0.1');
    await once(cerrado, 'listening');
    const puertoCerrado = cerrado.address().port;
    await new Promise(resolve => cerrado.close(resolve));
    t.mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ online: true, players: { online: 3, max: 2027 } }),
    }));
    const fallback = await import(`${entry}?test=http`);
    const estado = await fallback.estadoServidor('127.0.0.1', puertoCerrado);
    assert.equal(estado.maximo, 2027);
    assert.equal(estado.maximoFuente, 'mcsrvstat');
    assert.equal(estado.jugadores, 3);
    globalThis.fetch.mock.mockImplementation(async () => { throw Error('sin fuente'); });
    const offline = await import(`${entry}?test=offline`);
    const sinDatos = await offline.estadoServidor('127.0.0.1', puertoCerrado);
    assert.equal(sinDatos.enLinea, false);
    assert.equal(sinDatos.maximoFuente, null);
  });
}
