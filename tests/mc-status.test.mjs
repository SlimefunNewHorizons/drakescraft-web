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
  for (const [nombre, respuesta] of [
    ['sin respuesta', Buffer.alloc(0)],
    ['paquete incompleto', Buffer.from([10, 0, 8, 123])],
  ]) {
    test(`${entry}: cierre TCP ${nombre} activa respaldo HTTP`, async t => {
      const puerto = await fixture(t, socket => {
        socket.once('data', () => socket.end(respuesta));
      });
      const http = t.mock.method(globalThis, 'fetch', async () => ({
        ok: true,
        json: async () => ({ online: true, players: { online: 2, max: 100 } }),
      }));
      const { estadoServidor } = await import(`${entry}?test=eof-${nombre}`);
      let timer;
      t.after(() => clearTimeout(timer));
      const estado = await Promise.race([
        estadoServidor('127.0.0.1', puerto),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error('Consulta pendiente tras cierre TCP')), 1000);
        }),
      ]);
      assert.equal(estado.maximo, 100);
      assert.equal(estado.jugadores, 2);
      assert.equal(estado.maximoFuente, 'mcsrvstat');
      assert.equal(http.mock.callCount(), 1);
    });
  }

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

  test(`${entry}: no reutiliza el máximo anunciado de otro destino`, async t => {
    const conexiones = [0, 0];
    const puertos = [];
    for (const [i, maximo] of [2027, 100].entries()) {
      puertos.push(await fixture(t, socket => {
        conexiones[i]++;
        socket.once('data', () => {
          const json = Buffer.from(JSON.stringify({ players: { online: i, max: maximo } }));
          socket.end(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json]));
        });
      }));
    }
    t.mock.method(globalThis, 'fetch', () => { throw Error('HTTP inesperado'); });
    const { estadoServidor } = await import(`${entry}?test=destinos`);
    const primero = await estadoServidor('127.0.0.1', puertos[0]);
    const segundo = await estadoServidor('127.0.0.1', puertos[1]);
    assert.equal(primero.maximo, 2027);
    assert.equal(segundo.maximo, 100);
    assert.equal(segundo.jugadores, 1);
    assert.equal(segundo.maximoFuente, 'server-list-ping');
    assert.deepEqual(await estadoServidor('127.0.0.1', puertos[1]), segundo);
    assert.deepEqual(conexiones, [1, 1]);
    assert.equal((await estadoServidor('127.0.0.1', puertos[0])).maximo, 2027);
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
