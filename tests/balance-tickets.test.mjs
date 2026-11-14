import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildSaoriTicketPayload,
  createBalanceLimiter,
  normalizeAxes,
  saveBalanceTicket,
  validateBalanceTicket
} from '../lib/balance-tickets.js';

test('normaliza ejes de balance T2 con alias ES/EN y orden canónico', () => {
  assert.deepEqual(
    normalizeAxes(['gameplay', 'economía', 'encantamientos', 'pvp']),
    ['economia', 'encantamientos', 'jugabilidad']
  );
  assert.deepEqual(normalizeAxes('enchants, dracmas'), ['economia', 'encantamientos']);
  assert.deepEqual(normalizeAxes(['desconocido']), []);
});

test('valida nick Java/Bedrock, ejes, modalidad y rechaza datos sensibles Zero-Trust', () => {
  const valid = validateBalanceTicket({
    nick: '.BedrockUser',
    axes: ['jugabilidad', 'economia'],
    modality: 'Clásico',
    description: 'El precio en dracmas del libro con filo en la tienda está descalibrado.'
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.honeypot, false);
  assert.deepEqual(valid.value, {
    nick: '.BedrockUser',
    axes: ['economia', 'jugabilidad'],
    modality: 'clasico',
    description: 'El precio en dracmas del libro con filo en la tienda está descalibrado.'
  });

  const honeypot = validateBalanceTicket({
    nick: 'JackPlayer',
    axes: ['economia'],
    description: 'Reporte automático de bot con campo trampa relleno.',
    website: 'https://spam.example'
  });
  assert.deepEqual(honeypot, { ok: true, honeypot: true });

  assert.equal(validateBalanceTicket({ nick: '!', axes: ['economia'], description: 'Texto válido de más de quince caracteres.' }).ok, false);
  assert.equal(validateBalanceTicket({ nick: 'JackPlayer', axes: [], description: 'Texto válido de más de quince caracteres.' }).ok, false);
  assert.equal(validateBalanceTicket({ nick: 'JackPlayer', axes: ['economia'], modality: 'bedwars', description: 'Texto válido de más de quince caracteres.' }).ok, false);
  assert.equal(validateBalanceTicket({ nick: 'JackPlayer', axes: ['economia'], description: 'Corto' }).ok, false);
  assert.equal(
    validateBalanceTicket({
      nick: 'JackPlayer',
      axes: ['economia'],
      description: 'Mi password es secret12345 y el precio en tienda está roto.'
    }).ok,
    false
  );
});

test('limita a 4 reportes de balance por hora e IP para proteger cuota', () => {
  let now = 1_000_000;
  const allow = createBalanceLimiter(4, () => now);
  for (let i = 0; i < 4; i += 1) {
    assert.equal(allow('203.0.113.10'), true);
  }
  assert.equal(allow('203.0.113.10'), false);
  assert.equal(allow('203.0.113.11'), true);
  now += 61 * 60 * 1000;
  assert.equal(allow('203.0.113.10'), true);
});

test('guarda reporte en JSONL y formatea payload compatible con SAORI intake', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'balance-tickets-'));
  const filePath = path.join(tmpDir, 'balance-tickets.jsonl');
  const forwarded = [];

  try {
    const validated = validateBalanceTicket({
      nick: 'Pasiente',
      axes: ['encantamientos', 'economia', 'jugabilidad'],
      modality: 'survival',
      description: 'La sinergia de encantamientos de filo con el precio en tienda rompe el combate.'
    });
    assert.equal(validated.ok, true);

    const payload = buildSaoriTicketPayload(validated.value);
    assert.equal(payload.channel, 'web:balance-economia-encantamientos-jugabilidad');
    assert.match(payload.desc, /^\[WEB\] Modalidad: survival \| Ejes: economia, encantamientos, jugabilidad/);

    const saved = await saveBalanceTicket(filePath, validated.value, {
      now: new Date('2026-11-13T21:55:00.000Z'),
      forwardFn: async (p) => {
        forwarded.push(p);
        return '503';
      }
    });

    assert.equal(saved.channel, 'web:balance-economia-encantamientos-jugabilidad');
    assert.equal(saved.saoriTicketId, '503');
    assert.equal(forwarded.length, 1);

    const lines = (await fs.readFile(filePath, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.equal(record.nick, 'Pasiente');
    assert.deepEqual(record.axes, ['economia', 'encantamientos', 'jugabilidad']);
    assert.equal(record.saoriTicketId, '503');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
