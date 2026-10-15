'use strict';
// Runs the demo shim from a bundle in Node, so tests can call the same /api routes the browser page calls.
// Usage: const H = require('./shim-harness.js'); const g = H.load('content/era1.json'); await g.api('/runs', { mode: 'free', opId: 'E001' });
// The shim keeps its save in a fake localStorage. Pass { storage } to start from a save, and read g.storage to inspect it.
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const E = require('../out/engine.js'); const R = require('../out/record.js');
const ROOT = path.join(__dirname, '..');

function shimSource(bundle) {
  const g = fs.readFileSync(bundle, 'utf8');
  const a = g.indexOf('/* TDW demo shim.');
  const b = g.indexOf("'use strict';\n/* TDW Strategic Game client.");
  if (a < 0 || b < a) throw new Error('No demo shim in ' + bundle);
  return g.slice(a, b);
}

function load(contentPath, opt = {}) {
  const text = fs.readFileSync(path.resolve(ROOT, contentPath), 'utf8');
  const C = JSON.parse(text);
  const storage = opt.storage || new Map();
  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => { storage.set(k, String(v)); },
    removeItem: (k) => { storage.delete(k); },
    key: (i) => [...storage.keys()][i] ?? null,
    get length() { return storage.size; },
  };
  const ctx = { console, JSON, Math, Date, Map, Set, URL, URLSearchParams, Response, Promise, Uint8Array, Error, Object, Array, Number, String, setTimeout, crypto: globalThis.crypto, localStorage };
  ctx.self = ctx;
  ctx.document = { getElementById: (id) => (id === 'tdw-content' ? { textContent: text } : null) };
  ctx.TDWEngine = E;
  ctx.TDWRecord = { ...R, page: () => R.makeCtx(E, C) };
  vm.createContext(ctx);
  vm.runInContext(shimSource(opt.bundle || path.join(ROOT, 'out/game.js')), ctx, { filename: 'shim.js' });
  async function call(p, body) {
    const init = body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) };
    const res = await ctx.TDW_FETCH('/api' + p, init);
    const data = await res.json();
    if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e; }
    return data;
  }
  return { api: call, storage, C, key: C.storageKey || 'tdw-demo-1', save: () => JSON.parse(storage.get(C.storageKey || 'tdw-demo-1') || 'null') };
}

// Plays a run to the end through the shim. pick(view) returns the next action, or null to end the turn.
async function playOut(g, runId, pick = () => null, cap = 400) {
  let d = await g.api('/runs/' + runId);
  let n = 0;
  while (!d.view.over && n++ < cap) {
    const a = pick(d.view) || { type: 'end' };
    try { d = await g.api(`/runs/${runId}/act`, { action: a }); } catch { d = await g.api(`/runs/${runId}/act`, { action: { type: 'end' } }); }
  }
  return d;
}

module.exports = { load, playOut, shimSource };
