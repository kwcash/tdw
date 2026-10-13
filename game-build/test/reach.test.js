'use strict';
// Permits and reach moves (Revision 38) and the evidence behind them. Run: node test/reach.test.js
const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process');
const E = require('../out/engine.js'); const R = require('../out/record.js'); const B = require('./bots.js');
const C3 = require('../content/era3.json'); const C1 = require('../content/era1.json');
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, '../band/cards.json'), 'utf8')).cards;
const reg = (C) => ({ factions: C.factions, cadres: C.cadres, pacts: C.pacts, ruleset: C.ruleset });
const clone = (x) => JSON.parse(JSON.stringify(x));
const w17 = C3.ops.find((o) => o.id === 'W017'); const w18 = C3.ops.find((o) => o.id === 'W018');
const fresh = (op = w17, seed = 'r1') => E.newGame(op, { seed, tier: op.tier, registry: reg(C3) });
let n = 0; const ok = (name, fn) => { fn(); n++; };

ok('an operation without reach moves carries no reach state, option or view field', () => {
  const S = E.newGame(C3.ops.find((o) => o.id === 'W001'), { seed: 'x', tier: 1, registry: reg(C3) });
  assert.strictEqual(S.reach, undefined); assert.strictEqual(E.options(S).reach, undefined);
  assert.strictEqual(E.view(S).reach, undefined); assert.strictEqual(E.view(S).can.reach, undefined);
});

ok('the view lists every move with its permit, and a barred move is listed but cannot be used', () => {
  const v = E.view(fresh());
  assert.strictEqual(v.reach.length, w17.reach.length);
  const by = Object.fromEntries(v.reach.map((m) => [m.id, m]));
  for (const id of ['handover', 'family', 'jurisdiction', 'station']) { assert.strictEqual(by[id].permit, 'barred'); assert.strictEqual(by[id].canUse, false); assert.ok(by[id].evidence.length >= 2); assert.ok(!(id in v.can.reach)); }
  assert.strictEqual(by.ancestry.permit, 'priced'); assert.strictEqual(by.ancestry.price, 8); assert.ok(v.can.reach.ancestry === 'priced');
  for (const id of ['name_crime', 'protect', 'designate', 'pre_authorize']) assert.ok(v.can.reach[id] === 'free');
});

ok('a barred move throws and changes nothing', () => {
  const S = fresh(); const before = JSON.stringify(S);
  assert.throws(() => E.act(S, { type: 'reach', move: 'handover' }), /closed to you/);
  assert.strictEqual(JSON.stringify(S), before);
  assert.throws(() => E.act(S, { type: 'reach', move: 'nope' }), /No such move/);
});

ok('a free move applies its effects, costs its actions and can be used once', () => {
  const S = fresh(); const ap0 = S.ap; const sh0 = S.domainState.Legal.shields.USA_Allies; const lv0 = S.ledger.PRC_State.leverage;
  const ev = E.act(S, { type: 'reach', move: 'designate' });
  assert.strictEqual(S.ap, ap0 - 1); assert.strictEqual(S.domainState.Legal.shields.USA_Allies, sh0 + 1);
  assert.ok(ev.some((e) => e.k === 'reach' && e.id === 'designate' && e.permit === 'free'));
  assert.ok(S.ledger.PRC_State.leverage <= lv0);
  assert.throws(() => E.act(S, { type: 'reach', move: 'designate' }), /already used/);
  assert.strictEqual(E.options(S).reach.designate, undefined);
});

ok('a priced move works, costs legitimacy, is an act against the actor\'s own position, and helps the rival', () => {
  const S = fresh(); S.domainState.Association.pressure.USA_Allies = 3; const L0 = S.ledger.USA_Allies.legitimacy; const lv0 = S.ledger.PRC_State.leverage;
  const ev = E.act(S, { type: 'reach', move: 'ancestry' });
  assert.strictEqual(S.ledger.USA_Allies.legitimacy, L0 - 8);
  const self = ev.filter((e) => e.k === 'self'); assert.strictEqual(self.length, 1);
  assert.deepStrictEqual([self[0].f, self[0].type, self[0].why], ['USA_Allies', 'breach of own legitimating rule', 'ancestry screening']);
  assert.ok(ev.some((e) => e.k === 'slope' && e.d === 'Association'));
  assert.ok(ev.some((e) => e.k === 'ease'));
  assert.ok(S.ledger.PRC_State.leverage >= lv0 - 1);
});

ok('the rival\'s scripted acts carry mirror tags, so the report can count what was closed to the player', () => {
  const ids = new Set(); const p = B.policy('reach-free');
  for (let i = 0; i < 40; i++) { const S = fresh(w17, 'm' + i); let g = 0; while (!S.over && g++ < 300) { let ev; try { ev = E.act(S, p(S)); } catch { ev = E.act(S, { type: 'end' }); } for (const e of ev) if (e.k === 'mirror') ids.add(e.id); } }
  for (const id of ['handover', 'family', 'jurisdiction', 'station']) assert.ok(ids.has(id), id + ' ' + [...ids]);
  const S = fresh(); const early = E.act(S, { type: 'end' }).concat(E.act(S, { type: 'end' }));
  assert.ok(early.some((e) => e.k === 'mirror' && e.id === 'handover'));
});

ok('a code with reach actions verifies, replays the same twice, and the report lists what was closed', () => {
  const ctx = R.makeCtx(E, C3); const p = B.policy('reach-all'); let S1 = fresh(); const log = []; let g = 0;
  while (!S1.over && g++ < 400) { const a = p(S1); const s2 = clone(S1); try { E.act(s2, a); S1 = s2; log.push(a); } catch { E.act(S1, { type: 'end' }); log.push({ type: 'end' }); } }
  assert.ok(log.some((a) => a.type === 'reach'));
  const code = R.makeCode(ctx, { opId: 'W017', tier: w17.tier, seed: 'r1', lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: log });
  assert.ok(/~r[a-z_]+\./.test(code), code.slice(0, 160));
  const v1 = R.verify(code, ctx); const v2 = R.verify(code, ctx);
  assert.ok(v1.ok, v1.error); assert.deepStrictEqual(v1.summary, v2.summary); assert.strictEqual(v1.summary.score, S1.over.score);
  assert.deepStrictEqual(R.decodeAction(E, 'rdesignate'), { type: 'reach', move: 'designate' });
  const rep = R.report(v1, ctx);
  assert.deepStrictEqual(rep.reach.filter((m) => m.permit === 'barred').map((m) => m.id).sort(), ['family', 'handover', 'jurisdiction', 'station']);
  assert.ok(rep.reach.filter((m) => m.permit === 'barred').some((m) => m.mirror > 0));
  assert.ok(rep.reach.every((m) => m.evidence.length >= 1));
  for (const f of v1.frames) for (const e of f.ev) R.describe(e, ctx);
});

ok('a barred move in an action list makes the code fail to verify', () => {
  const ctx = R.makeCtx(E, C3);
  const code = R.makeCode(ctx, { opId: 'W017', tier: w17.tier, seed: 'r1', lens: null, doctrine: null, mode: 'free', maxTurns: null, actions: [{ type: 'reach', move: 'handover' }, { type: 'end' }] });
  assert.ok(!R.verify(code, ctx).ok);
});

ok('state with reach moves survives a JSON round trip mid-game', () => {
  const a = fresh(); E.act(a, { type: 'reach', move: 'protect' }); const b = clone(a);
  const p = B.policy('reach-free'); for (let i = 0; i < 40 && !a.over; i++) { const act = p(a); try { E.act(a, act); } catch { E.act(a, { type: 'end' }); } try { E.act(b, act); } catch { E.act(b, { type: 'end' }); } }
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

ok('validate refuses bad reach moves and bad mirror tags', () => {
  const bad = (f) => { const o = clone(w17); f(o); return E.validate(o, reg(C3)); };
  const msg = (r) => JSON.stringify(r);
  assert.ok(/not free, priced or barred/.test(msg(bad((o) => { o.reach[0].permit.USA_Allies = 'maybe'; }))));
  assert.ok(/names no price/.test(msg(bad((o) => { delete o.reach.find((m) => m.id === 'ancestry').pricedEffects; }))));
  assert.ok(/evidence without a card id/.test(msg(bad((o) => { o.reach[0].evidence = [{ id: 'x', line: 'y' }]; }))));
  assert.ok(/mirrors an unknown reach move/.test(msg(bad((o) => { o.script[0].effects[0].mirror = 'nope'; }))));
  assert.ok(/unknown domain/.test(msg(bad((o) => { o.reach[0].domain = 'Space'; }))));
  assert.ok(/not in this operation/.test(msg(bad((o) => { o.reach[0].permit.Mars = 'free'; }))));
  assert.ok(/duplicate reach id/.test(msg(bad((o) => { o.reach[1].id = o.reach[0].id; }))));
});

ok('every move cites reviewed cards, copies the card line unchanged, and fits its permit', () => {
  const by = Object.fromEntries(cards.map((c) => [c.id, c]));
  const NEED = { barred: ['constraint', 'guardrail'], priced: ['democracy_record', 'guardrail'], free: ['lawful_tool', 'constraint'] };
  for (const op of [w17, w18]) for (const m of op.reach) {
    assert.ok(m.evidence.length >= 1, m.id);
    for (const x of m.evidence) { assert.ok(by[x.id], x.id); assert.strictEqual(x.line, by[x.id].claim); }
    const sides = m.evidence.map((x) => by[x.id].side); const p = m.permit.USA_Allies;
    assert.ok(sides.some((s) => NEED[p].includes(s)), `${op.id} ${m.id} ${p}`);
    if (p === 'barred') assert.ok(sides.includes('party'), `${op.id} ${m.id}`);
  }
});

ok('the band operations sit at tier 6, outside the daily and every arc, and no old operation changed', () => {
  assert.deepStrictEqual([w17.tier, w17.band, w18.tier, w18.band], [6, 'asymmetry', 6, 'asymmetry']);
  assert.ok(!C3.daily.includes('W017') && !C3.daily.includes('W018'));
  for (const a of C3.arcs) assert.ok(!a.nodes.includes('W017') && !a.nodes.includes('W018'));
  const before = require('../content/era3.before7.json');
  for (const o of before.ops) assert.strictEqual(JSON.stringify(C3.ops.find((x) => x.id === o.id)), JSON.stringify(o), o.id);
});

ok('the rules hold in the band text, the Party and never a people, and no banned figure', () => {
  const text = JSON.stringify([w17, w18]);
  assert.ok(!/the Chinese (people )?(are|have|will)|Chinese (students|scholars|citizens|nationals) (are|steal|spy)/i.test(text));
  assert.ok(!/Xinjiang|Uyghur|Uighur/i.test(text));
  assert.ok(!/KMT|DPP|TPP/.test(text));
});

ok('the card validator refuses a people as actor, an individual, a Xinjiang figure and a missing source', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ev-')); const f = path.join(dir, 'c.json');
  const base = { id: 'EV-001', side: 'party', act: 'x', actor: 'the Party-state', claim: 'A claim.', class: 'F', source: 'Article 7, a statute.' };
  const run = (c) => { fs.writeFileSync(f, JSON.stringify({ cards: [Object.assign({}, base, c)] })); return cp.spawnSync('python3', ['-I', path.join(__dirname, '../band/build_evidence.py'), f, dir]); };
  assert.strictEqual(run({}).status, 0);
  assert.notStrictEqual(run({ claim: 'The Chinese people are spies.' }).status, 0);
  assert.notStrictEqual(run({ claim: 'Mr. Smith did it.' }).status, 0);
  assert.notStrictEqual(run({ claim: 'Xinjiang held 1000000 people.' }).status, 0);
  assert.notStrictEqual(run({ source: '' }).status, 0);
  assert.notStrictEqual(run({ class: 'I', source: 'A note.' }).status, 0);
  assert.notStrictEqual(run({ class: 'X' }).status, 0);
});

ok('the notes importer marks drafts and lists the problems', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nt-')); const nf = path.join(dir, 'n.md'); const of = path.join(dir, 'o.jsonl');
  fs.writeFileSync(nf, 'claim: A fine claim.\nsource: A source, 2026.\nclass: F\n---\nclaim: The Chinese people are spies.\nsource: none\nclass: F\n');
  const r = cp.spawnSync('python3', ['-I', path.join(__dirname, '../band/import_notes.py'), nf, of]); assert.strictEqual(r.status, 0, String(r.stderr));
  const rows = fs.readFileSync(of, 'utf8').trim().split('\n').map(JSON.parse);
  assert.strictEqual(rows.length, 2); assert.ok(rows.every((x) => x.status === 'draft')); assert.strictEqual(rows[0].problems.length, 0); assert.ok(rows[1].problems.length >= 1);
});

console.log(`OK: ${n} reach and evidence tests passed`);
