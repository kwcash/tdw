'use strict';
// Progress to and from a file, and the feedback link (version 12). Run: node test/progress.test.js
const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path');
const E = require('../out/engine.js'); const R = require('../out/record.js'); const H = require('./shim-harness.js');
const ROOT = path.join(__dirname, '..');
const HELP = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/help.json'), 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const tests = []; const ok = (name, fn) => tests.push([name, fn]);

// A save with a little of everything: finished runs with codes, a live run, a guided run, a forecast and a read hint.
async function busy(file = 'content/era3.json') {
  const g = H.load(file);
  const a = await g.api('/runs', { mode: 'free', opId: g.C.ops.find((o) => !o.hidden).id }); await H.playOut(g, a.run.id);
  if ((g.C.guides || []).length) { const gd = await g.api('/runs', { mode: 'guide', guide: g.C.guides[0].id }); await H.playOut(g, gd.run.id); }
  const arc = g.C.arcs[0]; const n0 = await g.api('/runs', { mode: 'arc', arcId: arc.id, node: 0 }); await H.playOut(g, n0.run.id);
  await g.api('/runs', { mode: 'free', opId: g.C.ops.filter((o) => !o.hidden)[1].id });
  if (g.C.forecast) await g.api('/forecast', { id: 'TC1', p: 30 });
  await g.api('/hints', { id: 'factions' });
  return g;
}
const snapshot = async (g) => ({
  progress: await g.api('/progress'), records: (await g.api('/records')).records,
  codex: (await g.api('/codex')).cards.map((c) => [c.code, c.seen, c.captured]), arcs: (await g.api('/arcs')).arcs,
  hints: (await g.api('/hints')).seen, forecasts: (await g.api('/forecast/mine')).forecasts, live: (await g.api('/runs/live')).runs,
});

ok('saving to a file gives the whole save, named for this build', async () => {
  const g = await busy();
  const { file } = await g.api('/demo/export');
  assert.strictEqual(file.format, 'tdw-progress'); assert.strictEqual(file.version, 1); assert.strictEqual(file.build, 'tdw-2026-1');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(file.exported));
  assert.deepStrictEqual(file.save, g.save());
});

ok('loading a file first shows what it holds and changes nothing', async () => {
  const g = await busy(); const { file } = await g.api('/demo/export');
  const fresh = H.load('content/era3.json'); const before = await snapshot(fresh);
  const r = await fresh.api('/demo/import', { file });
  assert.strictEqual(r.applied, false);
  const p = (await g.api('/progress')).progress;
  assert.deepStrictEqual([r.summary.level, r.summary.xp, r.summary.played, r.summary.won, r.summary.captured], [p.level, p.xp, p.played, p.won, p.codexCaptured]);
  assert.strictEqual(r.summary.records, (await g.api('/records')).records.length);
  assert.strictEqual(r.summary.forecasts, 1);
  assert.deepStrictEqual(r.summary, (await g.api('/demo/summary')).summary, 'the page shows the same summary for the save it holds');
  assert.deepStrictEqual(await snapshot(fresh), before);
});

ok('applying a file brings back the progress, the records, the codex, the arcs, the forecasts and the hints', async () => {
  const g = await busy(); const { file } = await g.api('/demo/export');
  const fresh = H.load('content/era3.json');
  const r = await fresh.api('/demo/import', { file, apply: true });
  assert.strictEqual(r.applied, true);
  assert.deepStrictEqual(await snapshot(fresh), await snapshot(g));
  const ctx = R.makeCtx(E, fresh.C);
  for (const rec of (await fresh.api('/records')).records) assert.ok(R.verify(rec.code, ctx).ok, rec.code.slice(0, 30));
  const live = (await fresh.api('/runs/live')).runs[0];
  const d = await H.playOut(fresh, live.id); assert.ok(d.view.over, 'the live run resumes and finishes');
  // the file survives a reload of the page
  const again = H.load('content/era3.json', { storage: fresh.storage });
  assert.strictEqual((await again.api('/progress')).progress.played, (await fresh.api('/progress')).progress.played);
});

ok('a file from another build, a later version or no game at all is refused', async () => {
  const g1 = await busy('content/era1.json'); const { file } = await g1.api('/demo/export');
  const g3 = H.load('content/era3.json');
  await assert.rejects(g3.api('/demo/import', { file }), /another build/);
  await assert.rejects(g3.api('/demo/import', { file: { ...file, build: 'tdw-2026-1', version: 2 } }), /newer version/);
  for (const bad of [null, 'text', [], {}, { format: 'other' }, { ...file, format: 'tdw-save' }, { ...file, build: 'tdw-2026-1', save: null }, { ...file, build: 'tdw-2026-1', save: { v: 2 } }]) {
    await assert.rejects(g3.api('/demo/import', { file: bad }), /not a TDW progress file|holds no progress/, JSON.stringify(bad).slice(0, 60));
  }
  assert.strictEqual((await g3.api('/progress')).progress.played, 0);
});

ok('an edited file loads only what this build knows, and nothing in it can break the game', async () => {
  const g = await busy(); const { file } = await g.api('/demo/export');
  const evil = clone(file); const s = evil.save;
  const anyRun = Object.values(s.runs)[0];
  s.runs['9001'] = { ...clone(anyRun), id: 9001, op_id: 'Z999' };
  s.runs['9002'] = { ...clone(anyRun), id: 9002, mode: 'hack' };
  s.runs['9003'] = { ...clone(anyRun), id: 9003, tier: 9 };
  s.runs['9004'] = { ...clone(anyRun), id: 9004, stars: 99, score: 'x', code: '<img src=x onerror=alert(1)>' };
  s.runs['9005'] = { ...clone(anyRun), id: 9005, status: 'live', state: null };
  s.runs['abc'] = clone(anyRun);
  s.runs['9006'] = { ...clone(anyRun), id: 1 };
  s.xp = 1e15; s.won = -4; s.played = 'many';
  s.codex = JSON.parse('{"__proto__":{"polluted":1},"S1":{"seen":1,"captured":1},"S99":{"seen":1}}');
  s.unlocks = JSON.parse('{"__proto__":{"polluted":1},"lens:Time":5,"evil:x":1,"tutorial":1}');
  s.arcs = { 'no-such-arc': { 0: 3 }, [file.save.arcs && Object.keys(file.save.arcs)[0] || 'x']: { 0: 7, 99: 3 } };
  s.hints = ['factions', 'nope', '__proto__'];
  s.forecasts = { TC1: { p: 150, at: 1 }, R5: { p: 40, at: 2 } };
  s.extra = { anything: true };
  const fresh = H.load('content/era3.json');
  await fresh.api('/demo/import', { file: evil, apply: true });
  assert.strictEqual(({}).polluted, undefined, 'no prototype pollution');
  const runs = fresh.save().runs;
  for (const id of ['9001', '9002', '9003', '9005', 'abc', '9006']) assert.strictEqual(runs[id], undefined, id);
  assert.strictEqual(runs['9004'].stars, null); assert.strictEqual(runs['9004'].score, null); assert.strictEqual(runs['9004'].code, null);
  const sv = fresh.save();
  assert.ok(sv.xp <= 1e9 && sv.won === 0 && sv.played === 0);
  assert.deepStrictEqual(Object.keys(sv.codex), ['S1']); assert.deepStrictEqual(Object.keys(sv.unlocks).sort(), ['lens:Time', 'tutorial']);
  assert.ok(!('no-such-arc' in sv.arcs)); for (const a of Object.values(sv.arcs)) for (const st of Object.values(a)) assert.ok(st >= 0 && st <= 3);
  assert.deepStrictEqual(sv.hints, ['factions']); assert.deepStrictEqual(Object.keys(sv.forecasts), ['R5']); assert.strictEqual(sv.extra, undefined);
  // every page the save feeds still answers
  for (const p of ['/progress', '/records', '/codex', '/arcs', '/hints', '/forecast/mine', '/runs/live', '/guides', '/daily', '/ops']) await fresh.api(p);
});

ok('a live run is rebuilt from its seed and moves, never taken from the file, so a doctored board cannot reach the page', async () => {
  const g = H.load('content/era1.json');
  const d0 = await g.api('/runs', { mode: 'free', opId: 'E011', tier: 4 });
  await g.api(`/runs/${d0.run.id}/act`, { action: { type: 'end' } });
  await g.api(`/runs/${d0.run.id}/act`, { action: { type: 'yield', holding: 'manchuria' } });
  const honest = clone((await g.api('/runs/' + d0.run.id)).view);
  const { file } = await g.api('/demo/export');
  const evil = clone(file); const st = evil.save.runs[String(d0.run.id)].state;
  st.tier = '<img src=x onerror=alert(1)>'; st.over = { outcome: 'win', stars: 1, score: '<b>x</b>' };
  for (const f of Object.keys(st.ledger)) st.ledger[f].tempo = 1e9;
  st.factions.push('__proto__'); st.intents.push({ id: 999, code: 'S99' });
  const fresh = H.load('content/era1.json');
  await fresh.api('/demo/import', { file: evil, apply: true });
  const v = (await fresh.api('/runs/' + d0.run.id)).view;
  assert.deepStrictEqual(v, honest, 'the rebuilt board matches the honest one');
  const after = await fresh.api(`/runs/${d0.run.id}/act`, { action: { type: 'end' } });
  assert.ok(after.view.turn === 3 && ({}).chain === undefined);
  // a live run with no moves on record, or with a move the engine refuses, cannot be rebuilt and goes
  const bad = clone(file); bad.save.runs[String(d0.run.id)].log = [{ type: 'yield', holding: 'nope' }];
  const f2 = H.load('content/era1.json'); await f2.api('/demo/import', { file: bad, apply: true });
  assert.strictEqual(f2.save().runs[String(d0.run.id)], undefined);
  const none = clone(file); delete none.save.runs[String(d0.run.id)].log;
  const f3 = H.load('content/era1.json'); await f3.api('/demo/import', { file: none, apply: true });
  assert.strictEqual(f3.save().runs[String(d0.run.id)], undefined);
});

ok('finished runs keep their result code and no board, and every run must fit the rules of its mode', async () => {
  const g = await busy('content/era1.json'); const { file } = await g.api('/demo/export');
  const fresh = H.load('content/era1.json'); await fresh.api('/demo/import', { file, apply: true });
  for (const r of Object.values(fresh.save().runs)) if (r.status !== 'live') assert.strictEqual(r.state, undefined, `run ${r.id} keeps a board`);
  const s = clone(file); const done = Object.values(s.save.runs).find((r) => r.status === 'won' || r.status === 'lost');
  const add = (id, over) => { s.save.runs[String(id)] = { ...clone(done), id, ...over }; };
  add(8001, { mode: 'arc', arc_id: 'gone-arc', arc_node: 0 });
  add(8002, { mode: 'arc', arc_id: g.C.arcs[0].id, arc_node: 50 });
  add(8003, { mode: 'arc', arc_id: g.C.arcs[0].id, arc_node: 0, op_id: g.C.arcs[0].nodes[1] });
  add(8004, { mode: 'daily', day: '2026-10-01', seed: 'daily:2026-10-02', tier: 3 });
  add(8005, { mode: 'tutorial', op_id: 'E001', seed: 'tutorial', tier: 1 });
  add(8006, { mode: 'guide', guide: 'holdings', op_id: 'E011', seed: 'guide-other', tier: 1 });
  add(8007, { mode: 'challenge', seed: 'NOT-OK' });
  s.save.arcs = { [g.C.arcs[0].id]: { 0: 3, '00': 3, '01': 2, 1: 2 } };
  s.save.forecasts = { TC1: { p: 30, at: 1e16 }, R5: { p: 40, at: 1700000000000 } };
  const f2 = H.load('content/era1.json'); await f2.api('/demo/import', { file: s, apply: true });
  for (const id of [8001, 8002, 8003, 8004, 8005, 8006, 8007]) assert.strictEqual(f2.save().runs[String(id)], undefined, `run ${id}`);
  assert.deepStrictEqual(f2.save().arcs[g.C.arcs[0].id], { 0: 3, 1: 2 });
  assert.deepStrictEqual(Object.keys(f2.save().forecasts), ['R5']);
  const arcs = (await f2.api('/arcs')).arcs[0]; assert.ok(arcs.cleared <= arcs.nodes);
});

ok('a big save keeps its live runs and its newest runs, and the error names only builds it knows', async () => {
  const g = await busy('content/era3.json'); const { file } = await g.api('/demo/export');
  const s = clone(file); const done = Object.values(s.save.runs).find((r) => r.status === 'won' || r.status === 'lost');
  for (let i = 0; i < 5100; i++) s.save.runs[String(10000 + i)] = { ...clone(done), id: 10000 + i };
  delete s.save.runs[String(done.id)]; s.save.seq = 20000;
  const f2 = H.load('content/era3.json'); const r = await f2.api('/demo/import', { file: s, apply: true });
  const ids = Object.keys(f2.save().runs).map(Number);
  assert.ok(ids.length <= 5000 && ids.includes(15099) && !ids.includes(10000), 'the newest runs stay');
  assert.ok(Object.values(f2.save().runs).some((x) => x.status === 'live'), 'the live run stays');
  assert.strictEqual(r.summary.played, s.save.played);
  for (const b of ['constructor', '__proto__', 'toString']) await assert.rejects(f2.api('/demo/import', { file: { ...file, build: b } }), /a build this one does not know/, b);
});

ok('the page says when this browser keeps nothing, a second tab sees a load at once, and the break timer keeps counting', async () => {
  const g = H.load('content/era3.json');
  assert.strictEqual((await g.api('/demo/summary')).persist, true);
  const shut = H.load('content/era3.json', { blocked: true });
  assert.strictEqual((await shut.api('/demo/summary')).persist, false, 'a browser that blocks storage is reported');
  assert.strictEqual((await shut.api('/demo/import', { file: (await shut.api('/demo/export')).file, apply: true })).persist, false);
  await g.api('/heartbeat', { seconds: 60 });
  const busyOne = await busy(); const { file } = await busyOne.api('/demo/export');
  // tab B writes the file while tab A holds the old save in memory
  const tabB = H.load('content/era3.json', { storage: g.storage }); await tabB.api('/demo/import', { file, apply: true });
  g.fire('storage', { key: g.key });
  await g.api('/heartbeat', { seconds: 30 });
  assert.strictEqual(JSON.parse(g.storage.get(g.key)).played, file.save.played, 'tab A does not write its old copy over the load');
  const day = new Date().toISOString().slice(0, 10);
  assert.ok((JSON.parse(g.storage.get(g.key)).activity || {})[day] >= 60, 'the minutes played today carry over the load');
});

ok('a save written by the previous release saves to a file and loads back whole', async () => {
  const old = H.load('content/era1.json', { bundle: path.join(ROOT, 'baselines/bundles/game.v11.js') });
  const r = await old.api('/runs', { mode: 'free', opId: 'E011' }); await H.playOut(old, r.run.id);
  const nu = H.load('content/era1.json', { storage: old.storage });
  const { file } = await nu.api('/demo/export');
  const fresh = H.load('content/era1.json'); await fresh.api('/demo/import', { file, apply: true });
  assert.deepStrictEqual(await snapshot(fresh), await snapshot(nu));
});

ok('the feedback link stays hidden until the owner gives an address', () => {
  const f = HELP.ui.feedback;
  assert.ok(f && typeof f.email === 'string');
  if (f.email) assert.ok(/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(f.email), 'the address must be a plain email address');
  else assert.strictEqual(f.email, '', 'no address yet');
  for (const k of ['label', 'subject', 'intro']) assert.ok(typeof f[k] === 'string' && f[k] && !/[:;—]/.test(f[k]), k);
});

(async () => {
  let n = 0;
  for (const [name, fn] of tests) {
    try { await fn(); n++; } catch (e) { console.log('FAIL', name); console.log(e.message); process.exit(1); }
  }
  console.log(`OK: ${n} progress file and feedback tests passed`);
})();
