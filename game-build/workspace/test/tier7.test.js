'use strict';
// Tier 7. Tiers 1 to 6 must play exactly as before. Run: node test/tier7.test.js
const assert = require('node:assert');
const E = require('../out/engine.js'); const E7 = require('../out/engine.v7.js'); const R = require('../out/record.js'); const B = require('./bots.js');
const sets = { base: require('../content/base.json'), era1: require('../content/era1.json'), era2: require('../content/era2.json'), era3: require('../content/era3.json') };
const reg = (C) => ({ factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset });
let n = 0; const ok = (name, fn) => { fn(); n++; };
function play(Eng, op, C, tier, seed, bot) {
  const S = Eng.newGame(op, { seed, tier, registry: reg(C) }); let g = 0;
  while (!S.over && g++ < 400) { let a; try { a = bot(S); } catch { a = { type: 'end' }; } try { Eng.act(S, a); } catch { Eng.act(S, { type: 'end' }); } }
  return S;
}
ok('tiers 1 to 6 play exactly as they did before Tier 7, game by game, in every content set', () => {
  let games = 0;
  for (const [name, C] of Object.entries(sets)) {
    const ops = C.ops.filter((o) => !o.band && !(o.id.startsWith('C') && Number(o.id.slice(1)) % 6 !== 0));
    for (const op of ops) for (const tier of [1, 3, 5, 6]) {
      const seed = `eq-${op.id}-${tier}`;
      const a = play(E, op, C, tier, seed, B.tunerBot); const b = play(E7, op, C, tier, seed, B.tunerBot);
      assert.strictEqual(JSON.stringify(a), JSON.stringify(b), `${name} ${op.id} tier ${tier}`); games++;
    }
  }
  assert.ok(games > 200, String(games));
});

ok('tier 7 has its own settings and a larger hand from turn 3', () => {
  const op = sets.era3.ops.find((o) => o.id === 'W006');
  const s6 = E.newGame(op, { seed: 's', tier: 6, registry: reg(sets.era3) }); const s7 = E.newGame(op, { seed: 's', tier: 7, registry: reg(sets.era3) });
  assert.strictEqual(s7.tier, 7); assert.strictEqual(s6.consumeAt - s7.consumeAt, 1);
  for (const d of op.theater) assert.ok(s7.board[d].p >= 2, d);
  const cards = (S, upTo) => { let k = 0; while (S.turn <= upTo && !S.over) { E.act(S, { type: 'end' }); } return S.intents.length; };
  assert.ok(cards(E.newGame(op, { seed: 's', tier: 7, registry: reg(sets.era3) }), 3) > cards(E.newGame(op, { seed: 's', tier: 6, registry: reg(sets.era3) }), 3));
});

ok('a tier above 7 is held at 7 and a tier of 0 falls back to the operation', () => {
  const op = sets.era3.ops.find((o) => o.id === 'W006');
  assert.strictEqual(E.newGame(op, { seed: 's', tier: 9, registry: reg(sets.era3) }).tier, 7);
  assert.strictEqual(E.newGame(op, { seed: 's', tier: 0, registry: reg(sets.era3) }).tier, op.tier);
});

ok('a tier 7 result code verifies and replays the same twice, and a tier 8 code is refused', () => {
  const C = sets.era3; const ctx = R.makeCtx(E, C); const op = C.ops.find((o) => o.id === 'W006');
  const S = E.newGame(op, { seed: 'k1', tier: 7, registry: reg(C) }); const log = []; let g = 0;
  while (!S.over && g++ < 400) { const a = B.tunerBot(S); try { E.act(S, a); log.push(a); } catch { E.act(S, { type: 'end' }); log.push({ type: 'end' }); } }
  const code = R.makeCode(ctx, { opId: 'W006', tier: 7, seed: 'k1', lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: log });
  assert.ok(code.startsWith('TDW1~W006~7~k1~'));
  const v1 = R.verify(code, ctx); const v2 = R.verify(code, ctx);
  assert.ok(v1.ok, v1.error); assert.deepStrictEqual(v1.summary, v2.summary); assert.strictEqual(v1.summary.tier, 7); assert.strictEqual(v1.summary.score, S.over.score);
  const bad = R.verify(code.replace('~W006~7~', '~W006~8~'), ctx); assert.ok(!bad.ok);
});

ok('a tier 7 challenge link parses and a tier 8 link does not', () => {
  assert.deepStrictEqual(R.parseChallenge('W006~7~abcdef'), { opId: 'W006', tier: 7, seed: 'abcdef' });
  assert.strictEqual(R.parseChallenge('W006~8~abcdef'), null);
  assert.deepStrictEqual(R.parseChallenge('W006~6~abcdef'), { opId: 'W006', tier: 6, seed: 'abcdef' });
});

ok('tier 7 is harder than tier 6 for the tuner bot on every operation sampled', () => {
  const C = sets.era3; const rate = (op, tier) => { let w = 0; for (let i = 0; i < 80; i++) { const S = play(E, op, C, tier, 'h' + i, B.tunerBot); if (S.over.outcome === 'win') w++; } return w; };
  for (const id of ['W002', 'W006', 'W011']) { const op = C.ops.find((o) => o.id === id); assert.ok(rate(op, 7) < rate(op, 6), id); }
});

ok('the band operations sit at tier 7, the tier selector in the build offers seven, and no old operation changed', () => {
  const C = sets.era3; for (const id of ['W017', 'W018']) { const o = C.ops.find((x) => x.id === id); assert.strictEqual(o.tier, 7); assert.strictEqual(o.band, 'asymmetry'); }
  const before = require('../content/era3.before7.json'); for (const o of before.ops) assert.strictEqual(JSON.stringify(C.ops.find((x) => x.id === o.id)), JSON.stringify(o), o.id);
});

console.log(`OK: ${n} tier 7 tests passed`);
