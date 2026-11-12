import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { cleanDevice, cleanVersion, createLimiter, isZip, prune, saveReport } from '../lib/launcher-reports.js';

const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(40)]);

test('solo acepta .zip reales', () => {
  assert.equal(isZip(zip), true);
  assert.equal(isZip(Buffer.from('{"a":1}')), false);
  assert.equal(isZip('texto'), false);
  assert.equal(isZip(Buffer.alloc(10)), false);
});

test('limpia cabeceras de dispositivo y version', () => {
  assert.equal(cleanDevice('A1B2C3D4E5F60718'), 'a1b2c3d4e5f60718');
  assert.equal(cleanDevice('../../etc/passwd'), 'anon');
  assert.equal(cleanDevice(undefined), 'anon');
  assert.equal(cleanVersion('0.6.0'), '0.6.0');
  assert.equal(cleanVersion('0.6.0; rm -rf /'), 'x');
});

test('limita a 6 reportes por hora y IP', () => {
  let now = 0;
  const allow = createLimiter(6, () => now);
  for (let i = 0; i < 6; i += 1) assert.equal(allow('1.2.3.4'), true);
  assert.equal(allow('1.2.3.4'), false);
  assert.equal(allow('5.6.7.8'), true);
  now += 61 * 60 * 1000;
  assert.equal(allow('1.2.3.4'), true);
});

test('guarda sin permitir rutas fuera del directorio y limpia lo viejo', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'launcher-reports-'));
  const name = await saveReport(dir, zip, { device: cleanDevice('../x'), version: cleanVersion('0.6.0') });
  assert.match(name, /^\d{4}-\d{2}-\d{2}T[\d-]+Z_anon_v0\.6\.0\.zip$/);
  assert.deepEqual(await fs.readdir(dir), [name]);
  const old = new Date(Date.now() - 40 * 24 * 3600 * 1000);
  await fs.utimes(path.join(dir, name), old, old);
  assert.equal(await prune(dir), 1);
  assert.deepEqual(await fs.readdir(dir), []);
  await fs.rm(dir, { recursive: true, force: true });
});
