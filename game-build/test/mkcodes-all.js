'use strict';
// Plays many operations of every build to the end and records each result code with its result.
// Usage: node test/mkcodes-all.js > codes.all.json     (run it on the build you want to protect)
const path = require('node:path');
const E = require('../out/engine.js'); const R = require('../out/record.js'); const B = require('./bots.js');
const clone = (x) => JSON.parse(JSON.stringify(x));
const out = {};
for (const f of ['base', 'era1', 'era2', 'era3']) {
  const C = require(path.resolve(__dirname, '..', 'content', f + '.json'));
  const ctx = R.makeCtx(E, C); const REG = { factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset };
  const ops = C.ops.filter((o) => !o.hidden); const pick = f === 'base' ? ops.filter((_, i) => i % 5 === 0) : ops;
  for (const op of pick) for (const bot of ['tuner', 'mixer']) for (const seed of ['p1', 'p2']) {
    let S = E.newGame(op, { seed, tier: op.tier || 3, registry: REG }); const log = []; let g = 0;
    let x = E.hashSeed(seed + bot + op.id); const r = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    while (!S.over && g++ < 400) {
      let a = bot === 'tuner' ? B.tunerBot(S) : B.randomBot(S, r);
      if (bot === 'mixer' && r() < 0.3) { const ids = Object.keys(E.options(S).assign || {}); if (ids.length) a = { type: 'assign', cadre: ids[Math.floor(r() * ids.length)], domain: E.DOMAINS[Math.floor(r() * 12)] }; }
      S = clone(S); try { E.act(S, a); log.push(a); } catch { E.act(S, { type: 'end' }); log.push({ type: 'end' }); }
    }
    if (!S.over) continue;
    const code = R.makeCode(ctx, { opId: op.id, tier: op.tier || 3, seed, lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: log });
    const v = R.verify(code, ctx);
    if (!v.ok) throw new Error(op.id + ' ' + v.error);
    (out[f] = out[f] || []).push({ id: op.id, bot, seed, code, outcome: v.summary.outcome, score: v.summary.score, turns: v.summary.turns, stars: v.summary.stars });
  }
}
console.log(JSON.stringify(out));
