'use strict';
// Forecast data and rules. Run: node test/forecast.test.js [dir with forecasts.json]
const assert = require('node:assert'); const crypto = require('node:crypto'); const fs = require('node:fs'); const path = require('node:path');
const dir = process.argv[2] || path.join(__dirname, '../forecast/out');
const D = JSON.parse(fs.readFileSync(path.join(dir, 'forecasts.json'), 'utf8')); const Rz = JSON.parse(fs.readFileSync(path.join(dir, 'forecast-results.json'), 'utf8'));
// A small CSV reader with quoted fields, so the check compares against the cells and not the raw file.
function cells(t) { const out = []; let f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',' || c === '\n') { out.push(f); f = ''; } else if (c !== '\r') f += c; } out.push(f); return new Set(out); }
const csv = cells(fs.readFileSync(path.join(__dirname, '../forecast/ledger_snapshot_2026-10-12.csv'), 'utf8'));
let n = 0; const ok = (name, fn) => { fn(); n++; };
ok('every claim text matches its own check value and is in the registered ledger unchanged', () => {
  for (const it of D.items) {
    assert.strictEqual(crypto.createHash('sha256').update(it.text, 'utf8').digest('hex'), it.sha256, it.id);
    assert.ok(csv.has(it.text), `${it.id} text is not in the ledger snapshot`);
    assert.ok(csv.has(it.registered_utc), it.id);
  }
});
ok('ids are unique, dates are valid and probabilities are strictly between 0 and 1', () => {
  const ids = new Set();
  for (const it of D.items) {
    assert.ok(!ids.has(it.id)); ids.add(it.id);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(it.check_by) && !isNaN(Date.parse(it.check_by)), it.id);
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(it.registered_utc), it.id);
    assert.ok(it.reference_p > 0 && it.reference_p < 1, it.id);
    if (it.book_p != null) assert.ok(it.book_p > 0 && it.book_p < 1 && /Z$/.test(it.book_utc), it.id); else assert.strictEqual(it.type, 'failure');
  }
});
ok('nothing registered after 12 October 2026 and nothing that is a phase review', () => {
  for (const it of D.items) { assert.ok(it.registered_utc < '2026-10-13', it.id); assert.ok(!/^P-C/.test(it.id)); }
});
ok('the standing rules hold, no Taiwanese party, poll or candidate and no disease event', () => {
  const bad = /KMT|DPP|TPP|Kuomintang|Progressive Party|Taiwanese only|opinion poll|plague|laborator|anti-plague|Irkutsk/i;
  for (const it of D.items) assert.ok(!bad.test(JSON.stringify(it)), it.id);
  for (const id of ['R6', 'TS2', 'TS4', 'TS7', 'FW1', 'FW2', 'RW-P1', 'RW-P2', 'IR4', 'C11-F2']) assert.ok(!D.items.some((x) => x.id === id), id);
});
ok('claims that carry counting rules in the registered records show them', () => {
  for (const id of ['TC1', 'TC2', 'TS8', 'TS9', 'TS10', 'RCH1', 'BR1', 'BR2', 'BR3', 'BL-RU1', 'BL-RU2', 'BL-RU3', 'BL-IR1', 'BL-IR2', 'BL-IR3']) { const it = D.items.find((x) => x.id === id); assert.ok(it && it.rules && it.rules_from, id); }
});
ok('the shipped results file is well formed and has no result for a claim that does not exist', () => {
  const ids = new Set(D.items.map((x) => x.id));
  for (const [id, r] of Object.entries(Rz.rows)) { assert.ok(ids.has(id), id); assert.ok(['true', 'false', 'void'].includes(r.result)); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.scored_on)); if (r.evidence) assert.ok(/^https:\/\//.test(r.evidence)); }
});
ok('the content block names both files and the claim count', () => {
  const C = require('../content/era3.json');
  assert.strictEqual(C.forecast.count, D.items.length); assert.ok(/^assets\/forecasts\.json/.test(C.forecast.data)); assert.strictEqual(C.forecast.results, 'assets/forecast-results.json');
});
console.log(`OK: ${n} forecast data tests passed (${D.items.length} claims, first due ${D.items[0].check_by})`);
