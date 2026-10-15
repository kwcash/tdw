'use strict';
// Approximate difficulty on each operation and tier (version 10). Run: node test/difficulty.test.js
const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process');
const D = require('../difficulty/build_difficulty.js'); const H = require('./shim-harness.js');
const ROOT = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const TABLE = read('difficulty/difficulty.json'); const HELP = read('parts/help.json');
const BUILDS = { base: 'content/base.json', era1: 'content/era1.json', era2: 'content/era2.json', era3: 'content/era3.json' };
const tests = []; const ok = (name, fn) => tests.push([name, fn]);
const bandOf = (rate) => HELP.ui.difficulty.bands.find((b) => rate >= b.min);

ok('the table covers every operation a player can pick, in every build, with seven shares from 0 to 100', () => {
  assert.strictEqual(TABLE.seeds, 400);
  for (const [b, f] of Object.entries(BUILDS)) {
    const C = read(f);
    const pick = C.ops.filter((o) => !o.hidden).map((o) => o.id).sort();
    assert.deepStrictEqual(Object.keys(TABLE.builds[b]).sort(), pick, b);
    for (const [id, r] of Object.entries(TABLE.builds[b])) assert.ok(r.length === 7 && r.every((x) => Number.isInteger(x) && x >= 0 && x <= 100), `${b} ${id}`);
    assert.deepStrictEqual(C.difficulty, { seeds: TABLE.seeds, rates: TABLE.builds[b] }, `${b} content carries its table`);
  }
});

ok('the table is current: the engine, the bot, the builder and every operation match what it was built from', () => {
  const stale = [];
  const now = D.inputs();
  for (const k of ['engine', 'bots', 'builder']) if (now[k] !== TABLE.inputs[k]) stale.push(k);
  for (const [b, f] of Object.entries(BUILDS)) {
    const fp = D.fingerprints(read(f)); const was = TABLE.fingerprints[b];
    if (fp.registry !== was.registry) stale.push(`${b} registry`);
    for (const [id, h] of Object.entries(fp.ops)) if (was.ops[id] !== h) stale.push(`${b} ${id}`);
    for (const id of Object.keys(was.ops)) if (!(id in fp.ops)) stale.push(`${b} ${id} gone`);
  }
  assert.deepStrictEqual(stale, [], 'rebuild with node difficulty/build_difficulty.js, then python3 difficulty/add_difficulty.py');
});

ok('a sample replayed now gives the same shares', () => {
  for (const [b, f] of Object.entries(BUILDS)) {
    const C = read(f); const ops = C.ops.filter((o) => !o.hidden);
    const op = ops.find((o) => o.holdings || o.reach) || ops[ops.length - 1];
    assert.strictEqual(D.winRate(op, C, 4, TABLE.seeds), TABLE.builds[b][op.id][3], `${b} ${op.id} T4`);
  }
});

ok('a label never eases as the tier rises, and the band operations stay rare wins at their record tier', () => {
  const band = (r) => HELP.ui.difficulty.bands.findIndex((b) => r >= b.min);
  for (const rates of Object.values(TABLE.builds)) for (const [id, r] of Object.entries(rates)) {
    for (let t = 1; t < 7; t++) {
      assert.ok(band(r[t]) >= band(r[t - 1]), `${id} reads easier at Tier ${t + 1} than at Tier ${t}`);
      assert.ok(r[t] <= r[t - 1] + 5, `${id} rises more than 5 points from Tier ${t} to Tier ${t + 1}`);
    }
  }
  for (const id of ['W017', 'W018', 'W019']) assert.ok(TABLE.builds.era3[id][6] < 10, id);
});

ok('the labels cover every share, read from easiest to hardest, and keep the house style', () => {
  const bands = HELP.ui.difficulty.bands;
  assert.ok(bands.length >= 4);
  for (let i = 1; i < bands.length; i++) assert.ok(bands[i].min < bands[i - 1].min);
  assert.strictEqual(bands[bands.length - 1].min, 0);
  for (const b of bands) assert.ok(/^[A-Z][a-z]+( [a-z]+)?$/.test(b.label), b.label);
  const r = cp.spawnSync('python3', [path.join(ROOT, 'test/lint-strict.py'), path.join(ROOT, 'parts/help.json')], { encoding: 'utf8' });
  assert.strictEqual(r.stdout.trim().split('\n').pop(), '0 style failures');
  for (const k of ['note', 'won']) assert.ok(typeof HELP.ui.difficulty[k] === 'string' && !/[:;—]/.test(HELP.ui.difficulty[k]), k);
  // The sentence gives the share itself, so it cannot disagree with the label.
  assert.ok(HELP.ui.difficulty.won.includes('{n} percent'));
  assert.ok(/scripted/.test(HELP.ui.difficulty.note) && /People may do better or worse/.test(HELP.ui.difficulty.note));
});

ok('the shim hands the shares to the operations list, the briefing, the arcs and the daily', async () => {
  for (const [b, f] of Object.entries(BUILDS)) {
    const g = H.load(f); const rates = TABLE.builds[b];
    const list = (await g.api('/ops')).ops;
    for (const o of list) assert.deepStrictEqual(o.diff, rates[o.id], `${b} ${o.id}`);
    const one = list[list.length - 1];
    assert.deepStrictEqual((await g.api('/ops/' + one.id)).op.diff, rates[one.id]);
    const arcs = (await g.api('/arcs')).arcs;
    const nodes = (await g.api('/arcs/' + arcs[0].id)).nodes;
    for (const n of nodes) assert.strictEqual(n.diff, rates[n.id][n.tier - 1], `${b} arc ${n.id}`);
    const daily = await g.api('/daily');
    assert.deepStrictEqual(daily.op.diff, rates[daily.op.id]);
  }
});

ok('adding the table changed no operation, arc, daily pool or registry', () => {
  const allowed = ['guides', 'difficulty'];
  for (const [b, before] of [['era1', 'content/era1.before9.json'], ['era3', 'content/era3.before9.json']]) {
    const now = read(BUILDS[b]); for (const k of allowed) delete now[k];
    assert.deepStrictEqual(now, read(before), b);
  }
  const shipped = read('content/era3.shipped-1014.json'); const C3 = read(BUILDS.era3);
  for (const id of ['W017', 'W018']) assert.strictEqual(JSON.stringify(C3.ops.find((o) => o.id === id)), JSON.stringify(shipped.ops.find((o) => o.id === id)), id);
  // The base and 2030 files as shipped on 14 October, fingerprinted before the table went in.
  const SHIPPED = { base: '99ccc8171d72aa29c658c320d8721e28a2a2b9aff809d2a4843718dbd01820ac', era2: '5b4a69efeff96cd778127c4ea7f6419f26b088cfd630b6d2fcd515aa478a48e6' };
  for (const b of ['base', 'era2']) {
    const raw = fs.readFileSync(path.join(ROOT, BUILDS[b]), 'utf8');
    assert.ok(!raw.startsWith('{\n'), `${b} keeps its compact layout`);
    const now = JSON.parse(raw); for (const k of allowed) delete now[k];
    assert.strictEqual(require('node:crypto').createHash('sha256').update(JSON.stringify(now)).digest('hex'), SHIPPED[b], b);
  }
});

(async () => {
  let n = 0;
  for (const [name, fn] of tests) {
    try { await fn(); n++; } catch (e) { console.log('FAIL', name); console.log(e.message); process.exit(1); }
  }
  console.log(`OK: ${n} difficulty tests passed`);
})();
