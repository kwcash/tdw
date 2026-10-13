'use strict';
// Holdings and acts against one's own position (Revision 33). Run: node test/holdings.test.js
const assert = require('node:assert');
const E = require('../out/engine.js'); const R = require('../out/record.js'); const B = require('./bots.js');
const C1 = require('../content/era1.json'); const C3 = require('../content/era3.json');
const reg = (C) => ({ factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset });
const clone = (x) => JSON.parse(JSON.stringify(x));
const op11 = C1.ops.find((o) => o.id === 'E011');
const fresh = (op = op11, C = C1, seed = 'h1') => E.newGame(op, { seed, tier: op.tier, registry: reg(C) });
let n = 0; const ok = (name, fn) => { fn(); n++; };

ok('an operation without holdings carries no holding state, option or view field', () => {
  const op = C3.ops.find((o) => o.id === 'W002'); const S = fresh(op, C3);
  assert.strictEqual(S.holdings, undefined);
  assert.strictEqual(E.options(S).yield, undefined);
  assert.strictEqual(E.view(S).holdings, undefined);
  assert.strictEqual(E.view(S).can.yield, undefined);
});

ok('the view lists the holdings with their cost, denial and state', () => {
  const v = E.view(fresh());
  assert.deepStrictEqual(v.holdings.map((h) => [h.id, h.cost, h.denial, h.consuming, h.active, h.canYield]), [['manchuria', 2, 1, true, true, true], ['south', 1, 2, false, true, true]]);
  assert.strictEqual(v.holdings[0].yieldLegitimacy, -2);
  assert.ok(v.can.yield.manchuria === 1 && v.can.yield.south === 1);
});

ok('each live holding costs its holder every turn, shields first, and only a consuming one is an act against itself', () => {
  const S = fresh(); const e0 = S.domainState.Economic.shields.KMT;
  const ev = E.act(S, { type: 'end' });
  const up = ev.filter((e) => e.k === 'upkeep');
  assert.deepStrictEqual(up.map((e) => [e.id, e.n, e.consuming]), [['manchuria', 2, true], ['south', 1, false]]);
  const selfs = ev.filter((e) => e.k === 'self');
  assert.strictEqual(selfs.length, 1); assert.deepStrictEqual([selfs[0].f, selfs[0].type, selfs[0].why, selfs[0].n], ['KMT', 'overextension', 'Manchuria', 2]);
  assert.ok(ev.some((e) => e.k === 'drain' && e.src === 'holding' && e.d === 'Kinetic'));
  assert.ok(S.domainState.Economic.shields.KMT <= e0);
});

ok('with no shields left the cost lands as pressure', () => {
  const S = fresh(); S.domainState.Kinetic.shields.KMT = 0;
  const p0 = S.domainState.Kinetic.pressure.KMT;
  const ev = E.act(S, { type: 'end' });
  assert.ok(ev.some((e) => e.k === 'press' && e.d === 'Kinetic' && e.src === 'holding'));
  assert.ok(S.domainState.Kinetic.pressure.KMT > p0);
});

ok('a holding denies the rival part of its gain from held ground', () => {
  const gainOf = (live) => {
    const S = fresh(); S.holdings.forEach((h) => { h.active = live; h.cost = 0; });
    S.domainState.Association.pressure.KMT = 3; S.domainState.Cultural.pressure.KMT = 3; S.domainState.Legal.pressure.KMT = 3;
    const ev = E.act(S, { type: 'end' });
    return ev.filter((e) => e.k === 'leverage' && e.why === 'held ground').reduce((x, e) => x + e.n, 0);
  };
  const withD = gainOf(true); const without = gainOf(false);
  assert.ok(without > 0 && withD < without, `denied ${withD} against ${without}`);
});

ok('giving up a holding costs 1 action and its stated price, ends its cost and its denial, and cannot be repeated', () => {
  const S = fresh(); const ap0 = S.ap; const l0 = S.ledger.KMT.legitimacy;
  const ev = E.act(S, { type: 'yield', holding: 'manchuria' });
  assert.strictEqual(S.ap, ap0 - 1);
  assert.strictEqual(S.ledger.KMT.legitimacy, l0 - 2);
  assert.ok(ev.some((e) => e.k === 'yield' && e.id === 'manchuria'));
  assert.strictEqual(E.view(S).holdings[0].active, false);
  assert.throws(() => E.act(S, { type: 'yield', holding: 'manchuria' }), /already gave up/);
  assert.throws(() => E.act(S, { type: 'yield', holding: 'nowhere' }), /No such holding/);
  const next = E.act(S, { type: 'end' });
  assert.ok(!next.some((e) => e.k === 'upkeep' && e.id === 'manchuria') && !next.some((e) => e.k === 'self'));
});

ok('giving up with no action left is refused', () => {
  const S = fresh(); S.ap = 0;
  assert.throws(() => E.act(S, { type: 'yield', holding: 'south' }), /Not enough actions/);
});

ok('couples raise what the others cost after a concession, and strains raise it while a holding stands', () => {
  const op = clone(op11);
  op.holdings = [
    { id: 'a', name: 'A', domain: 'Kinetic', cost: 1, denial: 0, couples: ['b'], strains: ['c'] },
    { id: 'b', name: 'B', domain: 'Economic', cost: 1, denial: 2 },
    { id: 'c', name: 'C', domain: 'Financial', cost: 1, denial: 2 },
  ];
  assert.deepStrictEqual(E.validate(op, reg(C1)), []);
  const S = fresh(op);
  let v = E.view(S).holdings; assert.deepStrictEqual(v.map((h) => h.cost), [1, 1, 2]);   // c is strained by a
  E.act(S, { type: 'yield', holding: 'a' });
  v = E.view(S).holdings; assert.deepStrictEqual(v.map((h) => [h.active, h.cost]), [[false, 1], [true, 2], [true, 1]]);   // b is raised by the concession, c is relieved
});

ok('validate names the faults in a holding', () => {
  const bad = clone(op11); bad.holdings = [{ id: 'a', domain: 'Nope', cost: 5, denial: -1, couples: ['zz'], denies: 'Ghost', onYield: [{ type: 'legitimacy', faction: 'KMT', n: -1, self: 'bogus' }] }, { id: 'a', domain: 'Kinetic', cost: 1, denial: 1 }];
  const p = E.validate(bad, reg(C1)).join(' | ');
  for (const frag of ['unknown domain Nope', 'needs a cost', 'needs a denial', 'unknown holding zz', 'who is not in this operation', 'unknown self-act type bogus', 'duplicate holding id a']) assert.ok(p.includes(frag), frag + ' in ' + p);
  assert.deepStrictEqual(E.validate(op11, reg(C1)), []);
});

ok('acts against one\'s own position named in the content are recorded for both sides', () => {
  const op = C1.ops.find((o) => o.id === 'E009');
  const S = fresh(op, C1); let seen = [];
  for (let g = 0; !S.over && g < 200; g++) { let ev; try { ev = E.act(S, B.tunerBot(S)); } catch { ev = E.act(S, { type: 'end' }); } seen = seen.concat(ev.filter((e) => e.k === 'self')); }
  const kmt = seen.filter((e) => e.f === 'KMT').map((e) => e.type);
  assert.ok(kmt.includes('predation on own base'), JSON.stringify(seen));
  const ops7 = C1.ops.find((o) => o.id === 'E001'); const S2 = fresh(ops7, C1); let jp = [];
  for (let g = 0; !S2.over && g < 200; g++) { let ev; try { ev = E.act(S2, B.tunerBot(S2)); } catch { ev = E.act(S2, { type: 'end' }); } jp = jp.concat(ev.filter((e) => e.k === 'self' && e.f === 'Imperial_Japan')); }
  assert.ok(jp.length === 0 || jp.every((e) => e.type === 'breach of own legitimating rule'));
});

ok('a code with a yield action verifies, replays the same twice, and the report types the acts for each side', () => {
  const ctx = R.makeCtx(E, C1);
  const S = fresh(); const log = []; let g = 0; let S1 = S;
  while (!S1.over && g++ < 400) {
    const a = g === 1 ? { type: 'yield', holding: 'manchuria' } : B.tunerBot(S1);
    S1 = clone(S1); try { E.act(S1, a); log.push(a); } catch { E.act(S1, { type: 'end' }); log.push({ type: 'end' }); }
  }
  const code = R.makeCode(ctx, { opId: 'E011', tier: op11.tier, seed: 'h1', lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: log });
  assert.ok(code.includes('~ymanchuria.'), code.slice(0, 120));
  const v1 = R.verify(code, ctx); const v2 = R.verify(code, ctx);
  assert.ok(v1.ok, v1.error); assert.deepStrictEqual(v1.summary, v2.summary); assert.strictEqual(v1.summary.score, S1.over.score);
  assert.deepStrictEqual(R.decodeAction(E, 'ymanchuria'), { type: 'yield', holding: 'manchuria' });
  const rep = R.report(v1, ctx);
  assert.deepStrictEqual(rep.own.sides.map((s) => s.id), ['KMT', 'CCP']);
  assert.ok(rep.holdings.find((h) => h.id === 'manchuria').gaveUpOn === 1);
  assert.ok(rep.changes.some((c) => /gave up Manchuria on turn 1/.test(c)), JSON.stringify(rep.changes));
  for (const f of v1.frames) for (const e of f.ev) R.describe(e, ctx);
  // a run that holds to the end pays, and says so
  let S3 = fresh(); const log3 = []; g = 0;
  while (!S3.over && g++ < 400) { const a = B.tunerBot(S3); S3 = clone(S3); try { E.act(S3, a); log3.push(a); } catch { E.act(S3, { type: 'end' }); log3.push({ type: 'end' }); } }
  const v3 = R.verify(R.makeCode(ctx, { opId: 'E011', tier: op11.tier, seed: 'h1', lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: log3 }), ctx);
  assert.ok(v3.ok);
  const rep3 = R.report(v3, ctx);
  assert.ok(rep3.own.sides[0].acts.some((a) => a.type === 'overextension' && a.why === 'Manchuria'));
  assert.ok(rep3.holdings[0].paid > 0 && rep3.holdings[0].gaveUpOn === null);
});

ok('state with holdings survives a JSON round trip mid-game', () => {
  const a = fresh(); const b = clone(a);
  E.act(a, { type: 'yield', holding: 'manchuria' }); E.act(b, { type: 'yield', holding: 'manchuria' });
  const ea = E.act(a, { type: 'end' }); const eb = E.act(clone(b), { type: 'end' });
  assert.deepStrictEqual(ea, eb);
});

console.log(`OK: ${n} holding and self-act tests passed`);
