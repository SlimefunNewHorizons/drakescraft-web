import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import test from 'node:test';

function varInt(value) {
  const bytes = [];
  do {
    const byte = value & 0x7f;
    value >>>= 7;
    bytes.push(byte | (value ? 0x80 : 0));
  } while (value);
  return Buffer.from(bytes);
}

// TCP loopback y HTTP simulado; no hay acceso a Dallas ni a terceros.
for (const entry of ['../lib/mc-status.js', '../web/lib/mc-status.js']) {
  for (const [name, version, expected] of [
    ['objeto', { name: 'inventada' }, null],
    ['numero', 262, null],
    ['lista', ['26.2'], null],
    ['vacia', '   ', null],
    ['valida', 'Purpur 26.2', 'Purpur 26.2'],
  ]) {
    for (const source of ['TCP', 'HTTP']) {
      test(`${entry}: version ${name} via ${source}`, async t => {
        const server = net.createServer(socket => {
          socket.once('data', () => {
            if (source === 'HTTP') return socket.end();
            const json = Buffer.from(JSON.stringify({
              players: { online: 0, max: 2027 }, version: { name: version },
            }));
            const body = Buffer.concat([Buffer.from([0]), varInt(json.length), json]);
            socket.end(Buffer.concat([varInt(body.length), body]));
          });
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        t.after(() => new Promise(resolve => server.close(resolve)));
        const http = t.mock.method(globalThis, 'fetch', async () => ({
          ok: true, json: async () => ({ online: true, players: { online: 0, max: 100 }, version }),
        }));
        const { estadoServidor } = await import(`${entry}?textos=${source}-${name}`);
        const result = await estadoServidor('127.0.0.1', server.address().port);
        assert.equal(result.version, expected);
        assert.equal(result.enLinea, true);
        assert.equal(result.maximo, source === 'TCP' ? 2027 : 100);
        assert.equal(http.mock.callCount(), source === 'TCP' ? 0 : 1);
      });
    }
  }

  for (const [name, clean, expected] of [
    ['objeto', { text: 'no es texto limpio' }, 'DrakesCraft · Servidor Oficial'],
    ['lista mixta', ['§aDrakesCraft', { secret: 'no publicar' }, 42, null, '26.2'], 'DrakesCraft 26.2'],
    ['vacio', '  ', 'DrakesCraft · Servidor Oficial'],
    ['texto', '§aDrakesCraft 26.2', 'DrakesCraft 26.2'],
  ]) {
    test(`${entry}: MOTD HTTP ${name}`, async t => {
      const server = net.createServer(socket => socket.once('data', () => socket.end()));
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      t.after(() => new Promise(resolve => server.close(resolve)));
      t.mock.method(globalThis, 'fetch', async () => ({
        ok: true, json: async () => ({ online: true, players: { online: 0, max: 100 }, motd: { clean } }),
      }));
      const { estadoServidor } = await import(`${entry}?motd-http=${name}`);
      const result = await estadoServidor('127.0.0.1', server.address().port);
      assert.equal(result.motd, expected);
      assert.equal(result.maximoFuente, 'mcsrvstat');
    });
  }
}
