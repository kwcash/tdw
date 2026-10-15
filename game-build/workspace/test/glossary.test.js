'use strict';
// The glossary and the links to it from each panel (version 11). Run: node test/glossary.test.js
const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process');
const E = require('../out/engine.js'); const H = require('./shim-harness.js');
const ROOT = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const HELP = read('src/help.json'); const GL = HELP.glossary;
const BUNDLE = fs.readFileSync(path.join(ROOT, 'out/game.js'), 'utf8');
const BUILDS = { base: 'content/base.json', era1: 'content/era1.json', era2: 'content/era2.json', era3: 'content/era3.json' };
const WHEN = ['always', 'factions', 'legit', 'leaders', 'pacts', 'multi', 'holdings', 'reach', 'selfact', 'watch', 'world', 'forecast', 'guides'];
const term = (id) => GL.find((g) => g.id === id);
const tests = []; const ok = (name, fn) => tests.push([name, fn]);
function prose(where, t) {
  assert.ok(typeof t === 'string' && t.trim(), `${where}: empty`);
  assert.ok(!/[:;—]/.test(t), `${where}: colon, semicolon or em dash in "${t}"`);
  for (const s of t.split(/(?<=[.!?])\s+/)) {
    assert.ok(!/^(It is|There are)\b/.test(s), `${where}: opens with It is or There are: ${s}`);
    assert.ok((s.match(/,/g) || []).length <= 2, `${where}: more than two commas: ${s}`);
  }
}
// What each condition needs, read straight from a content file. The shim must count the same things.
function expectCounts(C) {
  const ops = C.ops.filter((o) => !o.hidden); const rs = C.ruleset || {};
  const legit = (o) => !!(o.rules && o.rules.legitimacy !== undefined ? o.rules.legitimacy : rs.legitimacy);
  const multi = (o) => Array.isArray(o.factions) && o.factions.length > 2;
  return {
    multi: ops.filter(multi).length,
    legit: ops.filter(legit).length,
    leaders: ops.filter((o) => (o.cadres || []).length).length,
    pacts: ops.filter((o) => (o.pacts || []).length).length,
    factions: ops.filter((o) => multi(o) || legit(o) || (o.pacts || []).length).length,
    holdings: ops.filter((o) => (o.holdings || []).length).length,
    reach: ops.filter((o) => (o.reach || []).length).length,
    watch: ops.filter((o) => o.kind === 'watch').length,
    world: ops.filter((o) => o.world).length,
  };
}

ok('the glossary keeps the house style', () => {
  const r = cp.spawnSync('python3', [path.join(ROOT, 'test/lint-strict.py'), path.join(ROOT, 'src/help.json')], { encoding: 'utf8' });
  assert.strictEqual(r.stdout.trim().split('\n').pop(), '0 style failures');
  for (const g of GL) { prose(`${g.id}.term`, g.term); prose(`${g.id}.text`, g.text); }
  for (const k of ['glossTitle', 'glossIntro', 'glossFilter', 'glossNone', 'glossSee', 'glossLink', 'glossName', 'glossOpen', 'glossCountOne', 'glossCountMany']) prose(k, HELP.ui[k]);
  assert.ok(HELP.ui.glossCountOne.includes('{n}') && HELP.ui.glossCountMany.includes('{n}'));
  assert.ok(HELP.ui.glossName.includes('{term}'));
});

ok('every term has a unique id and a known condition, and its links resolve', () => {
  assert.ok(GL.length >= 40);
  assert.strictEqual(new Set(GL.map((g) => g.id)).size, GL.length);
  assert.strictEqual(new Set(GL.map((g) => g.term.toLowerCase())).size, GL.length);
  const how = new Set(HELP.how.map((s) => s.id).concat(['factions', 'dimensions', 'groups']));
  for (const g of GL) {
    assert.ok(/^[a-z0-9]+$/.test(g.id), g.id);
    assert.ok(WHEN.includes(g.when), `${g.id} ${g.when}`);
    for (const s of g.see) assert.ok(term(s) && s !== g.id, `${g.id} sees ${s}`);
    if (g.how) assert.ok(how.has(g.how), `${g.id} how ${g.how}`);
  }
});

ok('every panel on the board links to a term, and every link names a term that exists', () => {
  const used = [...new Set([...BUNDLE.matchAll(/\bgl\('([a-z0-9]+)'/g)].map((m) => m[1]))];
  for (const id of used) assert.ok(term(id), `the bundle links to ${id}, which the glossary lacks`);
  for (const id of ['lifecycle', 'actions', 'coherence', 'lever', 'dimension', 'doctrine', 'faction', 'leader', 'holding', 'reach', 'elsewhere', 'card', 'domain', 'code', 'codex', 'forecast', 'watch']) assert.ok(used.includes(id), `no panel links to ${id}`);
  // A link inside a heading would join the heading's name, so the links sit beside the headings.
  assert.ok(!/<h[1-3][^>]*>[^<]*\$\{gl\(/.test(BUNDLE), 'a glossary link sits inside a heading');
  // On the board a term opens over the board. No glossary link there opens a second tab, which would hold a second copy of the save.
  assert.ok(!/href="#\/glossary[^"]*"[^>]*target="_blank"/.test(BUNDLE));
});

ok('the terms agree with the engine', () => {
  for (const s of E.STAGES) assert.ok(term('lifecycle').text.includes(s), s);
  assert.ok(term('legitimacy').text.includes(`Below ${E.LEGIT.spikeBelow}`) && term('entropy').text.includes(`below ${E.LEGIT.spikeBelow}`));
  assert.ok(term('legitimacy').text.includes(`0 to ${E.LEGIT.max}`));
  assert.ok(/opens at 2 pressure/.test(term('tier7').text));
  assert.strictEqual(E.DOMAINS.length, 12); assert.ok(term('domain').text.includes(`from ${E.DOMAINS[0]} to ${E.DOMAINS[11]}`));
  assert.strictEqual(Object.keys(E.DIMENSIONS).length, 10); assert.ok(/one of ten/.test(term('dimension').text));
  assert.strictEqual(E.CODES.length, 36); assert.ok(/36 stratagems/.test(term('codex').text));
  assert.ok(term('difficulty').text.includes(`${read('difficulty/difficulty.json').seeds} games`));
  assert.ok(/40 percent/.test(term('stars').text) && /before Extract/.test(term('stars').text));
  for (const [id, n] of [['detect', 1], ['defend', 1], ['disrupt', 2]]) assert.ok(term(id).text.startsWith(`Costs ${n} action`), id);
});

ok('the shim counts what decides which terms each build shows', async () => {
  for (const f of Object.values(BUILDS)) {
    const C = read(f); const m = await H.load(f).api('/game/meta'); const want = expectCounts(C);
    for (const [k, v] of Object.entries(want)) assert.strictEqual(m.counts[k], v, `${f} ${k}`);
  }
  const m1 = await H.load(BUILDS.era1).api('/game/meta'); const m0 = await H.load(BUILDS.base).api('/game/meta');
  assert.ok(m1.counts.holdings === 1 && m1.counts.leaders > 0 && m0.counts.legit === 0 && m0.counts.watch === 0);
});

ok('the bundle carries the glossary and a route for it', () => {
  assert.ok(/route\(\/\^\\\/glossary/.test(BUNDLE), 'no glossary route');
  const m = /\n {2}const HELP = (\{.*\});\n/.exec(BUNDLE);
  assert.deepStrictEqual(JSON.parse(m[1]).glossary, GL);
});

(async () => {
  let n = 0;
  for (const [name, fn] of tests) {
    try { await fn(); n++; } catch (e) { console.log('FAIL', name); console.log(e.message); process.exit(1); }
  }
  console.log(`OK: ${n} glossary tests passed`);
})();
