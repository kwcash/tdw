'use strict';
// The standing rules that a test can check. ../RULES.md numbers every rule and names the check for each. Run: node test/rules.test.js
const assert = require('node:assert'); const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const E = require('../out/engine.js');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const FILES = { base: 'content/base.json', era1: 'content/era1.json', era2: 'content/era2.json', era3: 'content/era3.json' };
const BUILDS = Object.fromEntries(Object.entries(FILES).map(([b, f]) => [b, json(f)]));
const HELP = json('src/help.json');
const sha = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const tests = []; const ok = (id, name, fn) => tests.push([id, name, fn]);
// Every string under a value, with the path where it sits.
function strings(v, where = '', out = []) {
  if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${where}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, where ? `${where}.${k}` : k, out);
  else if (typeof v === 'string') out.push([where, v]);
  return out;
}
const sentences = (t) => t.split(/(?<=[.!?])\s+/);
// Everything a player can read, in every build.
const ALL = () => [...Object.entries(BUILDS).flatMap(([b, C]) => strings(C).map(([w, t]) => [`${b} ${w}`, t])), ...strings(HELP).map(([w, t]) => [`help ${w}`, t])];

ok('R1', 'no sentence makes the Chinese people the actor of a hostile act, and every footer says ancestry is not loyalty', () => {
  const HOSTILE = /^(attack|attacks|attacked|steal|steals|stole|spy|spies|spied|infiltrate|infiltrates|infiltrated|threaten|threatens|threatened|target|targets|targeted|run|runs|ran|plan|plans|planned|seek|seeks|sought|control|controls|controlled|seize|seizes|seized|coerce|coerces|coerced|subvert|subverts|subverted|recruit|recruits|recruited)$/;
  const bad = [];
  for (const [w, t] of ALL()) for (const s of sentences(t)) {
    const m = /\b(?:the Chinese people|Chinese people|the Chinese|ethnic Chinese|the people of China|Chinese citizens|Chinese students|the diaspora)\s+(\w+)/i.exec(s);
    if (m && HOSTILE.test(m[1])) bad.push(`${w}: ${s}`);
  }
  assert.deepStrictEqual(bad, []);
  // The base build takes its footer from orig/index.html, and the three eras set their own in mkpkg.py.
  assert.ok(read('orig/index.html').includes('Ancestry is not loyalty.'));
  const feet = read('mkpkg.py').split('\n').filter((l) => /foot1=/.test(l) && !/foot1=None/.test(l));
  assert.strictEqual(feet.length, 3);
  for (const f of feet) assert.ok(f.includes('Ancestry is not loyalty.'), f);
});

ok('R2', 'the twelve domains are fixed and in their order', () => {
  assert.deepStrictEqual(E.DOMAINS, ['Kinetic', 'Economic', 'Financial', 'Information', 'Psychological', 'Legal', 'Association', 'Cyber', 'Cultural', 'AI and Cognitive', 'Biological', 'Data and Surveillance']);
  for (const [b, C] of Object.entries(BUILDS)) for (const o of C.ops) for (const d of [o.spine, ...(o.theater || [])]) assert.ok(E.DOMAINS.includes(d), `${b} ${o.id} ${d}`);
});

ok('R3', 'no sentence about Xinjiang or the camps gives a count of people', () => {
  const bad = [];
  for (const [w, t] of ALL()) for (const s of sentences(t)) {
    if (!/Xinjiang|Uyghur|Uighur|re-?education|internment camp|detention camp|vocational (skills )?(education|training) cent/i.test(s)) continue;
    const plain = s.replace(/\]\([^)]*\)/g, ']');
    if (/\b\d{1,3}(,\d{3})+\b|\b\d+(\.\d+)?\s*(million|thousand|percent)|%|\b(millions?|thousands?|hundreds of)\b|\bone in (ten|five|three)\b/i.test(plain)) bad.push(`${w}: ${s}`);
  }
  assert.deepStrictEqual(bad, []);
});

ok('R5', 'no Taiwanese party, party list, candidate or opinion poll appears outside the two registered exceptions', () => {
  // Both exceptions shipped before the register. RULES.md flags them for the owner's decision.
  const EXCEPT = new Set(['base F032', 'era3 W011']);
  const PARTY = /Kuomintang|\bKMT\b|Democratic Progressive|\bDPP\b|Taiwan People's Party|\bTPP\b|New Power Party|party list/i;
  const bad = [];
  const check = (where, t) => {
    for (const s of sentences(t)) {
      const party = PARTY.test(s) || (/Nationalist Party/.test(s) && /Taiwan|20[12]\d/.test(s));
      const vote = (/Taiwanese|Taiwan's/.test(s) && /\bcandidates?\b/i.test(s)) || (/Taiwan/.test(s) && /opinion polls?|\bpolling\b|\bsurvey of voters/i.test(s));
      if (party || vote) bad.push(`${where}: ${s}`);
    }
  };
  for (const [b, C] of Object.entries(BUILDS)) {
    if (b === 'era1') continue; // The 1931 build plays the Kuomintang of 1931 to 1949 as a historical faction.
    for (const o of C.ops) if (!EXCEPT.has(`${b} ${o.id}`)) for (const [w, t] of strings(o)) check(`${b} ${o.id} ${w}`, t);
    const rest = { ...C }; delete rest.ops;
    for (const [w, t] of strings(rest)) check(`${b} ${w}`, t);
  }
  for (const [w, t] of strings(HELP)) check(`help ${w}`, t);
  assert.deepStrictEqual(bad, []);
  // The exceptions stay as they are until the owner decides.
  assert.ok(/Kuomintang/.test(JSON.stringify(BUILDS.base.ops.find((o) => o.id === 'F032'))));
  assert.ok(/Nationalist Party/.test(JSON.stringify(BUILDS.era3.ops.find((o) => o.id === 'W011'))));
});

ok('R7', 'scenario CW-3 stays out', () => {
  const bad = ALL().filter(([, t]) => /\bCW-?3\b|family member taken hostage|hostage[^.]*leader's (son|daughter|wife|husband|family)/i.test(t));
  assert.deepStrictEqual(bad.map(([w]) => w), []);
});

ok('R8', 'nothing after 12 October 2026 counts as record', () => {
  // Calendar entries on or before the cutoff are record. Later ones must say they are scheduled.
  for (const c of BUILDS.era3.calendar) {
    if (c.date > '2026-10-12') assert.strictEqual(c.kind, 'scheduled', c.date);
    else assert.ok(c.date >= '2026', c.date);
  }
  // A catalog operation may run into a scheduled month, but no operation begins after the cutoff.
  for (const o of BUILDS.era3.ops) {
    const [y, m] = o.when.start;
    assert.ok(y < 2026 || (y === 2026 && (m == null || m <= 10)), `${o.id} starts after the cutoff`);
  }
  // Only the watch and the summit season run past October. The watch settles by the owner's decision in SETTLE_WATCH.md.
  const late = BUILDS.era3.ops.filter((o) => o.when.end[0] === 2026 && o.when.end[1] > 10).map((o) => o.id);
  assert.deepStrictEqual(late, ['W011', 'W013']);
  assert.strictEqual(BUILDS.era3.ops.find((o) => o.id === 'W013').kind, 'watch');
});

ok('R9', 'the game makes no network call and loads no outside file', () => {
  const g = read('out/game.js');
  assert.strictEqual((g.match(/\bfetch\(/g) || []).length, 1, 'only the forecast loader fetches');
  for (const api of ['XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'importScripts', 'new Worker', 'import(']) assert.ok(!g.includes(api), api);
  // The forecast loader reads two files that ship in the 2026 folder.
  const fc = BUILDS.era3.forecast;
  for (const u of [fc.data, fc.results]) assert.ok(/^assets\/[\w.-]+\.json(\?v=\d+)?$/.test(u), u);
  for (const b of ['base', 'era1', 'era2']) assert.strictEqual(BUILDS[b].forecast, undefined, b);
  // The page loads only its own stylesheet and inline scripts.
  const page = read('orig/index.html');
  assert.ok(!/<script[^>]+src=/i.test(page));
  for (const m of page.matchAll(/<link[^>]+href="([^"]+)"/gi)) assert.ok(!/^(https?:)?\/\//.test(m[1]), m[1]);
});

ok('R10', 'the daily pools do not change', () => {
  const PINS = {
    base: ['fe6b275c86ebe40c', null, 'e6bd4ad0d2ce8305'],
    era1: ['3d699733452580b9', 'tdw-1931-1', '37c8309731eba220'],
    era2: ['fbd83a2bcb1dd279', 'tdw-2030-1', 'abaec86511407c8f'],
    era3: ['5e53c5e0cc6858b8', 'tdw-2026-1', 'ec0f851d8ee5d49d'],
  };
  for (const [b, C] of Object.entries(BUILDS)) assert.strictEqual(sha([C.daily || null, C.dailyEpoch || null]), PINS[b][0], b);
});

ok('R11', 'each build keeps its own save key', () => {
  const keys = Object.values(BUILDS).map((C) => C.storageKey || 'tdw-demo-1');
  assert.deepStrictEqual(keys, ['tdw-demo-1', 'tdw-1931-1', 'tdw-2030-1', 'tdw-2026-1']);
  assert.strictEqual(new Set(keys).size, 4);
});

ok('R13', 'the shipped operations match their pins, and W017 and W018 match the 14 October file byte for byte', () => {
  const PINS = { base: 'e6bd4ad0d2ce8305', era1: '37c8309731eba220', era2: 'abaec86511407c8f', era3: 'ec0f851d8ee5d49d' };
  const now = Object.fromEntries(Object.entries(BUILDS).map(([b, C]) => [b, sha(C.ops)]));
  assert.deepStrictEqual(now, PINS, 'an operation changed. Change a pin only in a deliberate, tested step, and say so in the changelog.');
  const shipped = json('content/era3.shipped-1014.json');
  for (const id of ['W017', 'W018']) assert.strictEqual(JSON.stringify(BUILDS.era3.ops.find((o) => o.id === id)), JSON.stringify(shipped.ops.find((o) => o.id === id)), id);
});

ok('R15', 'the notes say that scores and labels are readings', () => {
  assert.ok(/reading/.test(read('DIFFICULTY_NOTES.md')));
  assert.ok(/scripted/.test(HELP.ui.difficulty.note) && /People may do better or worse/.test(HELP.ui.difficulty.note));
  assert.ok(/reading of its evidence/.test(HELP.glossary.find((t) => t.id === 'permit').text));
});

ok('register', 'RULES.md numbers every rule once and names a check that exists and runs', () => {
  const reg = read('../RULES.md');
  const rows = [...reg.matchAll(/^\| (R\d+) \| ([^|]+) \| ([^|]+) \|$/gm)].map((m) => ({ id: m[1], rule: m[2].trim(), check: m[3].trim() }));
  assert.deepStrictEqual(rows.map((r) => r.id), rows.map((_, i) => `R${i + 1}`), 'numbered R1, R2 and so on with no gap');
  const checks = read('run_checks.sh');
  for (const r of rows) {
    assert.ok(r.check.length > 0, r.id);
    for (const [, f] of r.check.matchAll(/`test\/([\w.-]+)`/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, 'test', f)), `${r.id} names test/${f}, which does not exist`);
      if (/\.test\.js$/.test(f)) assert.ok(checks.includes(f.replace(/\.js$/, '')), `${r.id} names test/${f}, which run_checks.sh does not run`);
      else assert.ok(checks.includes(f), `${r.id} names test/${f}, which run_checks.sh does not run`);
    }
  }
  // Each rule this file tests is in the register under the same number.
  for (const [id] of tests) if (id !== 'register') assert.ok(rows.some((r) => r.id === id && r.check.includes('rules.test.js')), `${id} is tested here but RULES.md does not say so`);
});

(async () => {
  let n = 0;
  for (const [id, name, fn] of tests) {
    try { await fn(); n++; } catch (e) { console.log('FAIL', id, name); console.log(e.message); process.exit(1); }
  }
  console.log(`OK: ${n} rules tests passed`);
})();
