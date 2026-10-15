'use strict';
// Replay verification with the version 2 engine: every finished game must produce a code that verifies and
// reproduces the live result, for legacy operations and for faction operations with leader moves.
const path = require('node:path');
const assert = require('node:assert');
const E = require('../out/engine.js');
const R = require('../out/record.js');
const SM = require('./bots.js');
const clone = (x) => JSON.parse(JSON.stringify(x));
const load = (f) => require(path.resolve(__dirname, '..', f));

function run(C, op, bot, seed, tier) {
  const reg = { factions: C.factions || {}, cadres: C.cadres || {}, pacts: C.pacts || {}, ruleset: C.ruleset || {} };
  let S = E.newGame(op, { seed, tier, registry: reg });
  const log = [];
  let x = E.hashSeed(seed + 'bot'); const r = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const memo = {}; let g = 0;
  while (!S.over && g++ < 400) {
    let a = bot === 'random' ? SM.randomBot(S, r) : bot === 'mixer' ? SM.randomBot(S, r) : SM.greedyBot(S);
    if (bot === 'mixer' && r() < 0.35) { const ids = Object.keys(E.options(S).assign || {}); if (ids.length) a = { type: 'assign', cadre: ids[Math.floor(r() * ids.length)], domain: E.DOMAINS[Math.floor(r() * 12)] }; }
    S = clone(S); // the live shim stores and reloads state each action
    try { E.act(S, a); log.push(a); } catch { E.act(S, { type: 'end' }); log.push({ type: 'end' }); }
  }
  return { S, log, reg };
}

let n = 0; let assigns = 0;
for (const [file, bots] of [['content/base.json', ['random', 'greedy', 'mixer']], ['content/era1.json', ['random', 'greedy', 'mixer']], ['content/era2.json', ['random', 'greedy', 'mixer']], ['content/era3.json', ['random', 'greedy', 'mixer']]]) {
  const C = load(file);
  const ctx = R.makeCtx(E, C);
  const ops = C.ops.filter((o) => !o.hidden).slice(0, file.includes('base') ? 25 : 99);
  for (const op of ops) for (const bot of bots) for (const seed of ['r1', 'r2']) {
    const { S, log } = run(C, op, bot, seed, op.tier || 3);
    if (!S.over) continue;
    const code = R.makeCode(ctx, { opId: op.id, tier: op.tier || 3, seed, lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: log });
    const v = R.verify(code, ctx);
    assert.ok(v.ok, `${op.id} ${bot} ${seed}: ${v.error}`);
    assert.strictEqual(v.summary.score, S.over.score, `${op.id} score`);
    assert.strictEqual(v.summary.outcome, S.over.outcome);
    assert.strictEqual(v.summary.turns, S.over.turns);
    // tamper: flip one char in the middle of the action list; must not verify (or must change nothing legal)
    const bad = code.replace(/~([^~]*)~[^~]*$/, (m, a) => '~' + a + '~zzzz');
    assert.ok(!R.verify(bad, ctx).ok, 'bad checksum accepted');
    // report and describe never throw and describe covers events
    const rep = R.report(v, ctx); assert.ok(rep.changes.length >= 1);
    for (const f of v.frames) for (const e of f.ev) R.describe(e, ctx);
    assigns += log.filter((a) => a.type === 'assign').length;
    n++;
  }
}
console.log(`OK: ${n} games round-tripped through result codes (${assigns} leader moves among them)`);
