'use strict';
// Guided runs, first-use hints and the help text (version 9). Run: node test/guide.test.js
const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process');
const E = require('../out/engine.js'); const R = require('../out/record.js'); const B = require('./bots.js'); const H = require('./shim-harness.js');
const ROOT = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const HELP = read('parts/help.json'); const GUIDES = read('content/guides.json').guides;
const C = { base: read('content/base.json'), era1: read('content/era1.json'), era2: read('content/era2.json'), era3: read('content/era3.json') };
const reg = (c) => ({ factions: c.factions, cadres: c.cadres, pacts: c.pacts, ruleset: c.ruleset });
const clone = (x) => JSON.parse(JSON.stringify(x));
const WHEN = new Set(['start', 'consuming', 'yielded', 'unused', 'priced', 'barred']);
const tests = []; const ok = (name, fn) => tests.push([name, fn]);

// The house style for prose the player reads. lint-strict.py checks most of it. This adds colons and semicolons.
function prose(where, t) {
  assert.ok(typeof t === 'string' && t.trim(), `${where}: empty`);
  assert.ok(!/[:;—]/.test(t), `${where}: colon, semicolon or em dash in "${t}"`);
  for (const s of t.split(/(?<=[.!?])\s+/)) {
    assert.ok(!/^(It is|There are)\b/.test(s), `${where}: opens with It is or There are: ${s}`);
    assert.ok((s.match(/,/g) || []).length <= 2, `${where}: more than two commas: ${s}`);
  }
}
function walkText(where, v, skip, out = []) {
  if (Array.isArray(v)) v.forEach((x, i) => walkText(`${where}[${i}]`, x, skip, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (!skip.has(k)) walkText(`${where}.${k}`, x, skip, out); }
  else if (typeof v === 'string') out.push([where, v]);
  return out;
}
function lint(file) { const r = cp.spawnSync('python3', [path.join(ROOT, 'test/lint-strict.py'), path.join(ROOT, file)], { encoding: 'utf8' }); return r.stdout.trim().split('\n').pop(); }
// Plays a guide with a bot through the engine and returns the actions.
function playGuide(g, c, policy) {
  const op = c.ops.find((o) => o.id === g.op);
  let S = E.newGame(op, { seed: g.seed, tier: g.tier, mode: 'guide', maxTurns: g.turns, registry: reg(c) });
  const p = B.policy(policy); const log = []; let n = 0;
  while (!S.over && n++ < 400) { const a = p(S); const s2 = clone(S); try { E.act(s2, a); S = s2; log.push(a); } catch { E.act(S, { type: 'end' }); log.push({ type: 'end' }); } }
  return { S, log };
}
const guideCode = (ctx, g, log, over = {}) => R.makeCode(ctx, { opId: g.op, tier: g.tier, seed: g.seed, lens: null, doctrine: null, mode: 'guide', maxTurns: g.turns, actions: log, ...over });

// ---------- the help text ----------
ok('the help text keeps the house style, with no colon or semicolon in prose', () => {
  assert.strictEqual(lint('parts/help.json'), '0 style failures');
  for (const [w, t] of walkText('help', HELP, new Set(['note', 'schema', 'id', 'when', 'how', 'guide', 'email']))) prose(w, t);
});

ok('the How to play page gains Tiers, Holdings, Reach and permits, and Forecast, and every panel has a hint', () => {
  assert.deepStrictEqual(HELP.how.map((s) => s.id), ['tiers', 'holdings', 'reach', 'forecast']);
  assert.deepStrictEqual(HELP.how.map((s) => s.when), ['always', 'holdings', 'reach', 'forecast']);
  for (const s of HELP.how) assert.ok(s.title && s.intro && s.items.length >= 2 && s.items.every((x) => x.label && x.text), s.id);
  // The Forecast page has no hint, because its own intro says the same. It links to its How to play section.
  assert.deepStrictEqual(Object.keys(HELP.hints).sort(), ['factions', 'holdings', 'leaders', 'reach', 'tier7']);
  // A hint links to a new section or to an existing one: factions, dimensions or groups.
  const ids = new Set(HELP.how.map((s) => s.id).concat(['factions', 'dimensions', 'groups']));
  for (const [k, h] of Object.entries(HELP.hints)) assert.ok(h.how === null || ids.has(h.how), k);
  const gids = new Set(GUIDES.map((g) => g.id));
  for (const s of HELP.how) if (s.guide) assert.ok(gids.has(s.guide), s.id);
});

ok('the bundle carries the help text exactly as written', () => {
  const g = fs.readFileSync(path.join(ROOT, 'out/game.js'), 'utf8');
  const m = /\n {2}const HELP = (\{.*\});\n/.exec(g);
  assert.ok(m, 'no HELP in the bundle');
  assert.deepStrictEqual(JSON.parse(m[1]), HELP);
});

// ---------- the guides in the content ----------
ok('each guide plays a shipped operation that has the panel it teaches', () => {
  for (const [b, c] of Object.entries(C)) {
    const want = GUIDES.filter((g) => g.build === b).map(({ build, ...g }) => g);
    if (!want.length) { assert.strictEqual(c.guides, undefined, b); continue; }
    assert.deepStrictEqual(c.guides, want, b);
    for (const g of c.guides) {
      const op = c.ops.find((o) => o.id === g.op);
      assert.ok(op && !op.hidden, g.id);
      assert.ok((op[g.id] || []).length > 0, `${g.op} has no ${g.id}`);
      assert.ok(Number.isInteger(g.tier) && g.tier >= 1 && g.tier <= 7, g.id);
      assert.ok(Number.isInteger(g.turns) && g.turns >= 4 && g.turns <= 8, g.id);
      assert.ok(/^guide-[a-z]+$/.test(g.seed), g.id);
      assert.strictEqual(new Set(g.steps.map((s) => s.id)).size, g.steps.length, g.id);
      const holdingIds = (op.holdings || []).map((h) => h.id);
      for (const s of g.steps) {
        const w = s.when;
        const good = WHEN.has(w) || (w && Object.keys(w).length === 1 && ((Number.isInteger(w.turn) && w.turn >= 1 && w.turn <= g.turns) || holdingIds.includes(w.consuming) || holdingIds.includes(w.yielded)));
        assert.ok(good, `${g.id} ${s.id} ${JSON.stringify(w)}`);
      }
    }
  }
  assert.deepStrictEqual(GUIDES.map((g) => [g.id, g.build, g.op]), [['holdings', 'era1', 'E011'], ['reach', 'era3', 'W017']]);
});

ok('guide titles, blurbs and steps keep the house style', () => {
  for (const g of GUIDES) for (const [w, t] of walkText(g.id, { title: g.title, blurb: g.blurb, steps: g.steps.map((s) => s.text) }, new Set())) prose(w, t);
});

ok('adding the guides changed no operation, arc, daily pool or registry in either content file', () => {
  for (const b of ['era1', 'era3']) {
    const before = read(`content/${b}.before9.json`); const now = clone(C[b]); delete now.guides; delete now.difficulty;
    assert.deepStrictEqual(now, before, b);
  }
  const shipped = read('content/era3.shipped-1014.json');
  for (const id of ['W017', 'W018']) assert.strictEqual(JSON.stringify(C.era3.ops.find((o) => o.id === id)), JSON.stringify(shipped.ops.find((o) => o.id === id)), id);
});

// ---------- result codes ----------
ok('a guided run makes a code that verifies as mode guide and replays the same twice', () => {
  for (const [b, policy] of [['era1', 'yield1'], ['era3', 'reach-all']]) {
    const c = C[b]; const g = c.guides[0]; const ctx = R.makeCtx(E, c);
    const { S, log } = playGuide(g, c, policy);
    assert.ok(S.over, b);
    const code = guideCode(ctx, g, log);
    assert.ok(code.startsWith(`TDW1~${g.op}~${g.tier}~${g.seed}~-~-~guide~${g.turns}~`), code.slice(0, 60));
    const v1 = R.verify(code, ctx); const v2 = R.verify(code, ctx);
    assert.ok(v1.ok, v1.error); assert.deepStrictEqual(v1.summary, v2.summary);
    assert.strictEqual(v1.summary.mode, 'guide'); assert.strictEqual(v1.summary.maxTurns, g.turns); assert.strictEqual(v1.summary.score, S.over.score);
    assert.ok(R.report(v1, ctx).changes.length >= 1);
  }
});

ok('a guide code refuses another tier, seed, clock, operation, lens or doctrine', () => {
  const c = C.era1; const g = c.guides[0]; const ctx = R.makeCtx(E, c);
  const { log } = playGuide(g, c, 'yield1');
  for (const over of [{ tier: 2 }, { seed: 'guide-other' }, { maxTurns: 7 }, { maxTurns: null }, { lens: 'Asymmetry' }, { doctrine: 'data' }, { opId: 'E010' }]) {
    const v = R.verify(guideCode(ctx, g, log, over), ctx);
    assert.ok(!v.ok && /guided run/.test(v.error), JSON.stringify(over) + ' ' + v.error);
  }
  const v2 = R.verify(guideCode(R.makeCtx(E, C.era2), g, log), R.makeCtx(E, C.era2));
  assert.ok(!v2.ok, 'a build without the guide must refuse its code');
  const v3 = R.verify(guideCode(ctx, g, log, { mode: 'free', maxTurns: g.turns }), ctx);
  assert.ok(v3.ok, 'the same actions as a free run with a short clock stay a free run: ' + v3.error);
});

// ---------- the demo shim ----------
ok('the shim starts a guided run at the guide\'s tier, seed and clock, with no lens or doctrine', async () => {
  const g = H.load('content/era1.json');
  const d = await g.api('/runs', { mode: 'guide', guide: 'holdings', tier: 7, lens: 'Asymmetry', doctrine: 'data' });
  assert.strictEqual(d.run.mode, 'guide'); assert.strictEqual(d.run.guide, 'holdings'); assert.strictEqual(d.run.tier, 1); assert.strictEqual(d.run.opId, 'E011');
  assert.strictEqual(d.view.maxTurns, 6); assert.strictEqual(d.view.lens, null); assert.strictEqual(d.view.doctrine, null);
  assert.ok(d.view.holdings && d.view.holdings.length === 2);
  await assert.rejects(g.api('/runs', { mode: 'guide', guide: 'reach' }), /No such guided run/);
  await assert.rejects(H.load('content/era2.json').api('/runs', { mode: 'guide', guide: 'holdings' }), /No such guided run/);
  const again = await g.api('/runs', { mode: 'guide', guide: 'holdings' });
  assert.notStrictEqual(again.run.id, d.run.id);
  assert.strictEqual(g.save().runs[d.run.id], undefined, 'starting a guide again abandons the live one');
});

ok('finishing a guided run marks it done, grants no lens, and its code verifies', async () => {
  for (const [file, gid, lens] of [['content/era1.json', 'holdings', 'Criticality'], ['content/era3.json', 'reach', 'Agency']]) {
    const g = H.load(file); const c = g.C;
    const d0 = await g.api('/runs', { mode: 'guide', guide: gid });
    const d = await H.playOut(g, d0.run.id);
    assert.ok(d.view.over && d.code, gid);
    const v = R.verify(d.code, R.makeCtx(E, c));
    assert.ok(v.ok, v.error); assert.strictEqual(v.summary.mode, 'guide');
    const p = await g.api('/progress');
    assert.deepStrictEqual(p.guidesDone, [gid]);
    assert.ok(!p.progress.lenses.includes(lens) || lens === 'Asymmetry', 'a guided run grants no lens');
    assert.ok(g.save().unlocks['guide:' + gid]);
    const recs = (await g.api('/records')).records;
    assert.strictEqual(recs[0].mode, 'guide'); assert.strictEqual(recs[0].code, d.code);
    const list = (await g.api('/guides')).guides;
    assert.deepStrictEqual(list.map((x) => [x.id, x.done]), [[gid, true]]);
  }
});

ok('the run keeps the coach steps a player dismissed, so a reset or a new run starts the coach again', async () => {
  const g = H.load('content/era1.json');
  const d = await g.api('/runs', { mode: 'guide', guide: 'holdings' });
  assert.deepStrictEqual(d.run.coach, []);
  assert.deepStrictEqual((await g.api(`/runs/${d.run.id}/coach`, { step: 'h-start' })).coach, ['h-start']);
  assert.deepStrictEqual((await g.api(`/runs/${d.run.id}/coach`, { step: 'h-start' })).coach, ['h-start']);
  assert.deepStrictEqual((await g.api(`/runs/${d.run.id}/coach`, { step: 'h-cost' })).coach, ['h-start', 'h-cost']);
  assert.deepStrictEqual((await g.api('/runs/' + d.run.id)).run.coach, ['h-start', 'h-cost']);
  await assert.rejects(g.api(`/runs/${d.run.id}/coach`, { step: 'r-start' }), /No such step/);
  await assert.rejects(g.api(`/runs/${d.run.id}/coach`, { step: '__proto__' }), /No such step/);
  const free = await g.api('/runs', { mode: 'free', opId: 'E001' });
  await assert.rejects(g.api(`/runs/${free.run.id}/coach`, { step: 'h-start' }), /No such guided run/);
  assert.deepStrictEqual(free.run.coach, []);
  await g.api('/demo/reset', {});
  const again = await g.api('/runs', { mode: 'guide', guide: 'holdings' });
  assert.strictEqual(again.run.id, d.run.id, 'a reset starts the run ids again');
  assert.deepStrictEqual(again.run.coach, [], 'and the coach starts again with them');
});

ok('the briefing knows when its guided run is done, so the card offering it goes', async () => {
  const g = H.load('content/era3.json');
  for (const id of ['W017', 'W018', 'W019']) { const b = await g.api('/ops/' + id); assert.deepStrictEqual([b.op.guide, b.guideDone], ['reach', false], id); }
  assert.deepStrictEqual([(await g.api('/ops/W001')).op.guide, (await g.api('/ops/W001')).guideDone], [null, false]);
  const d = await g.api('/runs', { mode: 'guide', guide: 'reach' }); await H.playOut(g, d.run.id);
  assert.strictEqual((await g.api('/ops/W018')).guideDone, true);
});

ok('meta lists the guides of the build and counts the operations with each panel', async () => {
  const m1 = await H.load('content/era1.json').api('/game/meta');
  assert.deepStrictEqual(m1.guides.map((x) => [x.id, x.op, x.opTitle, x.tier, x.turns]), [['holdings', 'E011', 'The Manchurian Trap', 1, 6]]);
  assert.ok(m1.guides[0].steps.length >= 4 && m1.guides[0].title && m1.guides[0].blurb);
  assert.deepStrictEqual([m1.counts.holdings, m1.counts.reach], [1, 0]);
  const m3 = await H.load('content/era3.json').api('/game/meta');
  assert.deepStrictEqual(m3.guides.map((x) => x.id), ['reach']); assert.deepStrictEqual([m3.counts.holdings, m3.counts.reach], [0, 3]);
  for (const f of ['content/base.json', 'content/era2.json']) {
    const m = await H.load(f).api('/game/meta');
    assert.deepStrictEqual(m.guides, []); assert.deepStrictEqual([m.counts.holdings, m.counts.reach], [0, 0]);
  }
});

ok('first-use hints live in the save, survive a reload and clear with the progress', async () => {
  const g = H.load('content/era3.json');
  assert.deepStrictEqual((await g.api('/hints')).seen, []);
  assert.deepStrictEqual((await g.api('/hints', { id: 'reach' })).seen, ['reach']);
  assert.deepStrictEqual((await g.api('/hints', { id: 'reach' })).seen, ['reach']);
  await assert.rejects(g.api('/hints', { id: 'nope' }), /No such hint/);
  await assert.rejects(g.api('/hints', { id: 'forecast' }), /No such hint/);
  await assert.rejects(g.api('/hints', { id: '__proto__' }), /No such hint/);
  const g2 = H.load('content/era3.json', { storage: g.storage });
  assert.deepStrictEqual((await g2.api('/hints')).seen, ['reach']);
  await g2.api('/demo/reset', {});
  assert.deepStrictEqual((await g2.api('/hints')).seen, []);
});

ok('a save from the previous build loads and plays, and the old build still reads a new save', async () => {
  const old = H.load('content/era1.json', { bundle: path.join(ROOT, 'out/game.v8.js') });
  const r = await old.api('/runs', { mode: 'free', opId: 'E011' });
  const done = await H.playOut(old, r.run.id);
  const nu = H.load('content/era1.json', { storage: old.storage });
  const p = await nu.api('/progress');
  assert.deepStrictEqual(p.guidesDone, []); assert.strictEqual(p.progress.played, 1);
  assert.deepStrictEqual((await nu.api('/hints')).seen, []);
  const recs = (await nu.api('/records')).records;
  assert.strictEqual(recs[0].code, done.code); assert.ok(R.verify(recs[0].code, R.makeCtx(E, C.era1)).ok);
  const gd = await nu.api('/runs', { mode: 'guide', guide: 'holdings' }); await H.playOut(nu, gd.run.id); await nu.api('/hints', { id: 'holdings' });
  const back = H.load('content/era1.json', { storage: nu.storage, bundle: path.join(ROOT, 'out/game.v8.js') });
  const pb = await back.api('/progress');
  assert.strictEqual(pb.progress.played, 2);
  assert.ok((await back.api('/records')).records.some((x) => x.code === done.code));
  const fr = await back.api('/runs', { mode: 'free', opId: 'E001' }); assert.strictEqual(fr.run.mode, 'free');
});

// ---------- the engine stays put ----------
ok('the engine part of the bundle is byte for byte the version 8 engine', () => {
  const g = fs.readFileSync(path.join(ROOT, 'out/game.js'), 'utf8');
  const e8 = fs.readFileSync(path.join(ROOT, 'out/engine.v8.js'), 'utf8');
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'out/engine.js'), 'utf8'), e8);
  assert.strictEqual(g.slice(0, g.indexOf('/* TDW demo shim.')).trimEnd() + '\n', e8);
});

(async () => {
  let n = 0;
  for (const [name, fn] of tests) {
    try { await fn(); n++; } catch (e) { console.log('FAIL', name); console.log(e.message); process.exit(1); }
  }
  console.log(`OK: ${n} guide, hint and help tests passed`);
})();
