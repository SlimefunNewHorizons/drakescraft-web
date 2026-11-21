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
  for (const caso of ['longitud anunciada', 'respuesta recibida', 'cabecera incompleta']) {
    test(`${entry}: limita bytes TCP con ${caso} excesiva`, async t => {
      const encode = valor => {
        const bytes = [];
        do {
          const parte = valor & 0x7f;
          valor >>>= 7;
          bytes.push(parte | (valor ? 0x80 : 0));
        } while (valor);
        return Buffer.from(bytes);
      };
      let conexion;
      t.after(() => conexion?.destroy());
      const puerto = await fixture(t, socket => {
        conexion = socket;
        socket.on('error', () => {}); // El lector puede cerrar durante la escritura.
        socket.once('data', () => {
          if (caso === 'longitud anunciada') {
            socket.write(encode(1024 * 1024 + 1));
          } else if (caso === 'cabecera incompleta') {
            socket.write(Buffer.alloc(1024 * 1024 + 1, 0x80));
          } else {
            const json = Buffer.from(JSON.stringify({
              players: { online: 4, max: 2027 }, description: 'x'.repeat(1024 * 1024),
            }));
            const cuerpo = Buffer.concat([Buffer.from([0]), encode(json.length), json]);
            socket.end(Buffer.concat([encode(cuerpo.length), cuerpo]));
          }
        });
      });
      const http = t.mock.method(globalThis, 'fetch', async () => ({
        ok: true, json: async () => ({ online: true, players: { online: 2, max: 100 } }),
      }));
      const { estadoServidor } = await import(`${entry}?test=limite-${caso}`);
      let timer;
      t.after(() => clearTimeout(timer));
      const estado = await Promise.race([
        estadoServidor('127.0.0.1', puerto),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error('No rechaza la respuesta TCP excesiva')), 1500);
        }),
      ]);
      assert.equal(estado.maximoFuente, 'mcsrvstat');
      assert.equal(estado.maximo, 100);
      assert.equal(http.mock.callCount(), 1);
    });
  }

  test(`${entry}: acepta exactamente 1 MiB de respuesta TCP`, async t => {
    const encode3 = valor => Buffer.from([
      (valor & 0x7f) | 0x80, ((valor >>> 7) & 0x7f) | 0x80, valor >>> 14,
    ]);
    const base = { players: { online: 4, max: 2027 }, description: '' };
    const relleno = 1024 * 1024 - 7 - Buffer.byteLength(JSON.stringify(base));
    const puerto = await fixture(t, socket => {
      socket.once('data', () => {
        const json = Buffer.from(JSON.stringify({ ...base, description: 'x'.repeat(relleno) }));
        const cuerpo = Buffer.concat([Buffer.from([0]), encode3(json.length), json]);
        const respuesta = Buffer.concat([encode3(cuerpo.length), cuerpo]);
        assert.equal(respuesta.length, 1024 * 1024);
        socket.end(respuesta);
      });
    });
    const http = t.mock.method(globalThis, 'fetch', () => { throw Error('HTTP inesperado'); });
    const { estadoServidor } = await import(`${entry}?test=limite-valido`);
    const estado = await estadoServidor('127.0.0.1', puerto);
    assert.equal(estado.maximoFuente, 'server-list-ping');
    assert.equal(estado.maximo, 2027);
    assert.equal(estado.motd.length, relleno);
    assert.equal(http.mock.callCount(), 0);
  });

  test(`${entry}: limita el plazo total TCP aunque sigan llegando bytes`, async t => {
    let conexion;
    let goteo;
    t.after(() => { clearInterval(goteo); conexion?.destroy(); });
    const puerto = await fixture(t, socket => {
      conexion = socket;
      socket.once('data', () => {
        // Longitud incompleta: cada byte evita el timeout de inactividad.
        socket.write(Buffer.from([0x80]));
        goteo = setInterval(() => socket.write(Buffer.from([0x80])), 60);
        socket.once('close', () => clearInterval(goteo));
      });
    });
    const http = t.mock.method(globalThis, 'fetch', async () => ({
      ok: true, json: async () => ({ online: true, players: { online: 2, max: 100 } }),
    }));
    const { estadoServidor } = await import(`${entry}?test=plazo-total`);
    let timer;
    t.after(() => clearTimeout(timer));
    const estado = await Promise.race([
      estadoServidor('127.0.0.1', puerto),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('TCP sigue pendiente pese al plazo total')), 4500);
      }),
    ]);
    assert.equal(estado.maximoFuente, 'mcsrvstat');
    assert.equal(estado.maximo, 100);
    assert.equal(http.mock.callCount(), 1);
  });

  test(`${entry}: acepta longitudes VarInt válidas de dos bytes`, async t => {
    const motd = 'Servidor '.repeat(30);
    const puerto = await fixture(t, socket => {
      socket.once('data', () => {
        const json = Buffer.from(JSON.stringify({ players: { online: 4, max: 2027 }, description: motd }));
        const cuerpo = Buffer.concat([
          Buffer.from([0, (json.length & 0x7f) | 0x80, json.length >>> 7]), json,
        ]);
        socket.end(Buffer.concat([
          Buffer.from([(cuerpo.length & 0x7f) | 0x80, cuerpo.length >>> 7]), cuerpo,
        ]));
      });
    });
    const http = t.mock.method(globalThis, 'fetch', () => { throw Error('HTTP inesperado'); });
    const { estadoServidor } = await import(`${entry}?test=varint-valido`);
    const estado = await estadoServidor('127.0.0.1', puerto);
    assert.equal(estado.maximoFuente, 'server-list-ping');
    assert.equal(estado.maximo, 2027);
    assert.equal(estado.motd, motd.trim());
    assert.equal(http.mock.callCount(), 0);
  });

  for (const caso of ['longitud desbordada', 'ID desbordado', 'ID de seis bytes', 'longitud JSON desbordada']) {
    test(`${entry}: rechaza VarInt con ${caso} sin publicar el ping`, async t => {
      const puerto = await fixture(t, socket => {
        socket.once('data', () => {
          const json = Buffer.from(JSON.stringify({ players: { online: 4, max: 2027 } }));
          const id = caso === 'ID desbordado' ? Buffer.from([0x80, 0x80, 0x80, 0x80, 0x10])
            : caso === 'ID de seis bytes' ? Buffer.from([0x80, 0x80, 0x80, 0x80, 0x80, 0])
            : Buffer.from([0]);
          const largoJson = caso === 'longitud JSON desbordada'
            ? Buffer.from([json.length | 0x80, 0x80, 0x80, 0x80, 0x10]) : Buffer.from([json.length]);
          const cuerpo = Buffer.concat([id, largoJson, json]);
          const largo = caso === 'longitud desbordada'
            ? Buffer.from([cuerpo.length | 0x80, 0x80, 0x80, 0x80, 0x10]) : Buffer.from([cuerpo.length]);
          socket.end(Buffer.concat([largo, cuerpo]));
        });
      });
      const http = t.mock.method(globalThis, 'fetch', async () => ({
        ok: true, json: async () => ({ online: true, players: { online: 2, max: 100 } }),
      }));
      const { estadoServidor } = await import(`${entry}?test=varint-${caso}`);
      const estado = await estadoServidor('127.0.0.1', puerto);
      assert.equal(estado.maximoFuente, 'mcsrvstat');
      assert.equal(estado.maximo, 100);
      assert.equal(estado.jugadores, 2);
      assert.equal(http.mock.callCount(), 1);
    });
  }

  for (const [nombre, players] of [
    ['sin conteos', undefined],
    ['jugadores negativos', { online: -1, max: 100 }],
    ['máximo negativo', { online: 1, max: -100 }],
    ['jugadores como texto', { online: '4', max: 100 }],
    ['máximo como texto', { online: 4, max: '100' }],
    ['jugadores fraccionarios', { online: 1.5, max: 100 }],
    ['máximo fuera del rango seguro', { online: 4, max: 1e20 }],
  ]) {
    test(`${entry}: TCP con ${nombre} usa conteos del respaldo`, async t => {
      const puerto = await fixture(t, socket => {
        socket.once('data', () => {
          const json = Buffer.from(JSON.stringify({ players }));
          assert.ok(json.length < 126);
          socket.end(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json]));
        });
      });
      const http = t.mock.method(globalThis, 'fetch', async () => ({
        ok: true, json: async () => ({ online: true, players: { online: 2, max: 100 } }),
      }));
      const { estadoServidor } = await import(`${entry}?test=counts-${nombre}`);
      const estado = await estadoServidor('127.0.0.1', puerto);
      assert.equal(estado.maximoFuente, 'mcsrvstat');
      assert.equal(estado.jugadores, 2);
      assert.equal(estado.maximo, 100);
      assert.equal(http.mock.callCount(), 1);
    });
  }

  test(`${entry}: respaldo inválido no publica mediciones ni disponibilidad`, async t => {
    const puerto = await fixture(t, socket => socket.once('data', () => socket.end()));
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => null }));
    for (const [i, payload] of [
      null,
      { online: 'false', players: { online: 2, max: 100 } },
      { online: true, players: { online: 2, max: '100' } },
      { online: true, players: { online: -2, max: 100 } },
      { online: true },
    ].entries()) {
      globalThis.fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => payload }));
      const { estadoServidor } = await import(`${entry}?test=http-schema-${i}`);
      const estado = await estadoServidor('127.0.0.1', puerto);
      assert.equal(estado.enLinea, false);
      assert.equal(estado.maximoFuente, null);
    }
  });

  test(`${entry}: MOTD con text inválido conserva el ping sin lanzar excepción`, async t => {
    const puerto = await fixture(t, socket => {
      socket.once('data', () => {
        const json = Buffer.from(JSON.stringify({
          players: { online: 101, max: 100 }, description: { text: 7, extra: ['Servidor'] },
        }));
        assert.ok(json.length < 126);
        socket.end(Buffer.concat([Buffer.from([json.length + 2, 0, json.length]), json]));
      });
    });
    const http = t.mock.method(globalThis, 'fetch', () => { throw Error('HTTP inesperado'); });
    const { estadoServidor } = await import(`${entry}?test=motd-type`);
    const estado = await estadoServidor('127.0.0.1', puerto);
    assert.equal(estado.motd, 'Servidor');
    assert.equal(estado.jugadores, 101);
    assert.equal(estado.maximo, 100);
    assert.equal(estado.maximoFuente, 'server-list-ping');
    assert.equal(http.mock.callCount(), 0);
  });

  for (const caso of ['id incorrecto', 'JSON fuera del paquete', 'bytes sobrantes']) {
    test(`${entry}: rechaza ${caso} y consulta respaldo HTTP`, async t => {
      const puerto = await fixture(t, socket => {
        socket.once('data', () => {
          const json = Buffer.from(JSON.stringify({ players: { online: 4, max: 2027 } }));
          const extra = caso === 'bytes sobrantes' ? Buffer.from([0]) : Buffer.alloc(0);
          const cuerpo = Buffer.concat([
            Buffer.from([caso === 'id incorrecto' ? 1 : 0,
              json.length + (caso === 'JSON fuera del paquete' ? 1 : 0)]),
            json, extra,
          ]);
          socket.end(Buffer.concat([Buffer.from([cuerpo.length]), cuerpo]));
        });
      });
      const http = t.mock.method(globalThis, 'fetch', async () => ({
        ok: true,
        json: async () => ({ online: true, players: { online: 2, max: 100 } }),
      }));
      const { estadoServidor } = await import(`${entry}?test=frame-${caso}`);
      const estado = await estadoServidor('127.0.0.1', puerto);
      assert.equal(estado.maximoFuente, 'mcsrvstat');
      assert.equal(estado.maximo, 100);
      assert.equal(estado.jugadores, 2);
      assert.equal(http.mock.callCount(), 1);
    });
  }

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
