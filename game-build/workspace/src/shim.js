/* TDW demo shim. The single-page demo has no server, so this script answers the client's
 * /api calls in the browser through window.TDW_FETCH. It runs the same engine over the same content and mirrors the
 * rules in lib/ops.js: runs, the daily, campaign arcs, the codex, unlocks and levels.
 * Progress lives in this browser's storage, with an in-memory fallback. Accounts, shared
 * boards, challenges and the study modes need the full game and answer 404 here. */
(function () {
  'use strict';
  const E = self.TDWEngine;
  const C = JSON.parse(document.getElementById('tdw-content').textContent);
  const OPS = C.ops;
  const ARCS = C.arcs;
  // Version 2 content may define factions, leaders, pacts and a ruleset. Absent, every operation plays as a two-faction one.
  const REG = { factions: C.factions || {}, cadres: C.cadres || {}, pacts: C.pacts || {}, ruleset: C.ruleset || {} };
  const opById = new Map(OPS.map((o) => [o.id, o]));
  const arcById = new Map(ARCS.map((a) => [a.id, a]));
  const foundIn = {};
  for (const o of OPS) for (const c of o.stratagems) (foundIn[c] = foundIn[c] || []).push(o.id);
  self.TDW_DEMO = true;

  // ---------- rules shared with lib/ops.js ----------
  const DAY_ONE = Date.parse((C.dailyEpoch || '2026-09-30') + 'T00:00:00Z');
  const DAILY_TIER = 3;
  const TITLES = [[17, 'Doctrine Master'], [12, 'Commander'], [8, 'Strategist'], [5, 'Analyst'], [3, 'Operative'], [1, 'Recruit']];
  const DOCTRINE_LEVEL = { data: 1, principles: 2, technology: 3, application: 4, business: 5, governance: 6 };
  const FREE_LENS = 'Asymmetry';
  const xpForLevel = (L) => 75 * L * (L - 1);
  function levelOf(xp) { let L = 1; while (xp >= xpForLevel(L + 1)) L++; return L; }
  const titleOf = (L) => TITLES.find(([min]) => L >= min)[1];
  const today = () => new Date().toISOString().slice(0, 10);
  const dayNumber = (day) => Math.max(1, Math.floor((Date.parse(day + 'T00:00:00Z') - DAY_ONE) / 86400000) + 1);
  const arcTier = (arc, i) => (arc.nodes.length <= 1 ? 1 : 1 + Math.round((5 * i) / (arc.nodes.length - 1)));
  // The daily draws from content.daily when the build names a pool, and from every operation otherwise.
  const DAILY_POOL = (C.daily || []).map((id) => opById.get(id)).filter((o) => o && o.kind !== 'watch');
  // Guided runs. Each one plays a shipped operation at the guide's tier, seed and clock. The content names them.
  const GUIDES = (C.guides || []).filter((g) => opById.has(g.op));
  const guideById = new Map(GUIDES.map((g) => [g.id, g]));
  const guideFor = (o) => (o.holdings && o.holdings.length && guideById.has('holdings') ? 'holdings' : o.reach && o.reach.length && guideById.has('reach') ? 'reach' : null);
  const guideOut = (g) => ({ id: g.id, title: g.title, blurb: g.blurb, op: g.op, opTitle: opById.get(g.op).title, tier: g.tier, turns: g.turns, steps: g.steps });
  // Approximate difficulty. The share of games a scripted player wins at Tier 1 to Tier 7. The content carries the table.
  const DIFF = (C.difficulty && C.difficulty.rates) || {};
  const diffOf = (id) => DIFF[id] || null;
  // First-use hints, one per panel. The save keeps the ones the player has read.
  const HINT_IDS = ["factions", "leaders", "holdings", "reach", "tier7"];
  function dailyOp(day) { const P = DAILY_POOL.length ? DAILY_POOL : OPS; const n = dayNumber(day); return P[(((n * 37) % P.length) + P.length) % P.length]; }
  function randomHex(bytes) {
    const a = new Uint8Array(bytes);
    try { crypto.getRandomValues(a); } catch { for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256); }
    return [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  // ---------- storage ----------
  // Each build keeps its own progress, so builds hosted on one domain do not read each other's saves.
  const KEY = C.storageKey || 'tdw-demo-1';
  const KEEP_STATES = 12;
  const blank = () => ({ v: 1, user: null, seq: 0, runs: {}, xp: 0, won: 0, played: 0, days: 0, lastDaily: null, codex: {}, unlocks: {}, arcs: {}, activity: {} });
  let db = null;
  let persist = true;
  function load() {
    if (db) return db;
    try { const raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch { db = null; persist = false; }
    if (!db || db.v !== 1) db = blank();
    return db;
  }
  // Finished runs keep their board for a while, then only their result.
  function trim(keep) {
    let cut = 0;
    const done = Object.values(db.runs).filter((r) => r.status !== 'live' && r.state).sort((a, b) => b.id - a.id);
    for (const r of done.slice(keep)) { delete r.state; cut++; }
    for (const r of Object.values(db.runs)) if (r.status === 'abandoned') { delete db.runs[r.id]; cut++; }
    return cut;
  }
  // Blocked storage keeps everything in memory for the session. Full storage sheds old boards first.
  function save() {
    trim(KEEP_STATES);
    if (!persist) return;
    try { localStorage.setItem(KEY, JSON.stringify(db)); return; } catch { /* full */ }
    if (trim(1)) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* memory only */ } }
  }

  const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
  function need() {
    const d = load();
    if (!d.user) { d.user = { id: 1, username: 'guest_' + randomHex(4) }; save(); }
    return d.user;
  }
  const publicUser = (u) => ({ id: u.id, username: u.username, isAdmin: false, isMinor: true, isGuest: true, profilePublic: false, dailyLimitMin: null, researchConsent: false, tier: 1 });

  // ---------- players ----------
  const has = (key) => !!load().unlocks[key];
  function loadout() {
    const d = load();
    const L = levelOf(d.xp);
    const lenses = Object.keys(E.LENSES).filter((k) => k === FREE_LENS || has('lens:' + k));
    const doctrines = Object.keys(E.DOCTRINES).filter((k) => DOCTRINE_LEVEL[k] <= L);
    return { lenses, doctrines, level: L };
  }
  function progress() {
    const d = load();
    const L = levelOf(d.xp);
    const cx = Object.values(d.codex);
    return {
      xp: d.xp, level: L, title: titleOf(L), levelFloor: xpForLevel(L), nextLevel: xpForLevel(L + 1),
      won: d.won, played: d.played, daysPlayed: d.days,
      codexSeen: cx.filter((x) => x.seen).length, codexCaptured: cx.filter((x) => x.captured).length, ...loadout(),
    };
  }
  const runs = () => Object.values(load().runs);
  function bestOf(opId) {
    let best = null;
    for (const r of runs()) if (r.op_id === opId && r.status === 'won' && (!best || r.stars > best.stars || (r.stars === best.stars && r.score > best.score))) best = { stars: r.stars, score: r.score };
    return best;
  }

  // ---------- briefs (never the lever) ----------
  function factionsOf(o) {
    if (!Array.isArray(o.factions) || !o.factions.length) return null;
    const defs = o.factions.map((f) => { const id = typeof f === 'string' ? f : f.id; return { id, ...(REG.factions[id] || {}), ...(typeof f === 'string' ? {} : f) }; });
    const player = o.player || (defs.find((f) => f.control === 'player') || defs[0]).id;
    return defs.map((f) => ({ id: f.id, name: f.name || f.id, short: f.short || f.id, player: f.id === player, blurb: f.blurb || '' }));
  }
  // A watch operation plays the record up to its last source and marks its subject as not yet settled.
  function watchOf(o) { return o && o.kind === 'watch' ? { status: o.status === 'settled' ? 'settled' : 'open', settleOn: o.settleOn || null } : null; }
  function brief(o, withBest) {
    return {
      watch: watchOf(o),
      factions: factionsOf(o),
      id: o.id, kind: o.kind, title: o.title, label: o.label, tier: o.tier, band: o.band || null, dimension: o.dimension, rule: E.DIMENSIONS[o.dimension],
      stage: o.stage, opponent: o.opponent, theater: o.theater, world: o.world, arc: o.arc, brief: o.brief,
      signature: o.stratagems.map((c) => ({ code: c, num: E.CARDS[c].num, name: E.CARDS[c].name, group: E.CARDS[c].group })),
      guide: guideFor(o), diff: diffOf(o.id),
      best: withBest ? bestOf(o.id) : null,
    };
  }
  const debrief = (o) => ({ record: o.record, reading: o.reading, coreEvent: o.coreEvent || null, gap: o.gap, gapText: o.gapText, fix: o.fix, spine: o.spine, fullTitle: o.fullTitle });

  // What decides which glossary terms a build shows. Each count mirrors the panel it explains.
  const PICK = OPS.filter((o) => !o.hidden);
  const legitOf = (o) => !!(o.rules && o.rules.legitimacy !== undefined ? o.rules.legitimacy : REG.ruleset.legitimacy);
  const multiOf = (o) => Array.isArray(o.factions) && o.factions.length > 2;
  const META = {
    domains: E.DOMAINS, short: E.SHORT, links: E.LINKS, stages: E.STAGES, stageText: E.STAGE_TEXT, groups: E.GROUPS,
    dimensions: E.DIMENSIONS, lenses: E.LENSES, doctrines: E.DOCTRINES, doctrineLevel: DOCTRINE_LEVEL,
    cards: E.cardList().map((c) => ({ code: c.code, num: c.num, name: c.name, group: c.group, text: c.text, face: c.face, offer: c.offer || null, proxy: !!c.proxy })),
    copy: C.copy || null,
    forecast: C.forecast || null,
    counts: { ops: OPS.filter((o) => !o.hidden).length, arcs: ARCS.length, multi: OPS.filter((o) => Array.isArray(o.factions) && o.factions.length > 2).length, holdings: OPS.filter((o) => !o.hidden && Array.isArray(o.holdings) && o.holdings.length).length, reach: OPS.filter((o) => !o.hidden && Array.isArray(o.reach) && o.reach.length).length, legit: PICK.filter(legitOf).length, leaders: PICK.filter((o) => (o.cadres || []).length).length, pacts: PICK.filter((o) => (o.pacts || []).length).length, factions: PICK.filter((o) => multiOf(o) || legitOf(o) || (o.pacts || []).length).length, watch: PICK.filter((o) => o.kind === 'watch').length, world: PICK.filter((o) => o.world).length },
    guides: GUIDES.map(guideOut),
    build: KEY,
  };

  // ---------- runs ----------
  function shareText(run, S) {
    const o = opById.get(run.op_id);
    const head = run.mode === 'daily' ? `TDW Daily #${dayNumber(run.day)} · ${o.title}` : `TDW · ${o.title}`;
    const st = '★'.repeat(S.over.stars) + '☆'.repeat(3 - S.over.stars);
    const line = S.over.outcome === 'win'
      ? `${S.over.reason === 'lever' ? 'Cut the lever' : 'Held the line'} ${st} · stopped at ${S.over.stage}`
      : `Consumed on turn ${S.over.turns} of ${S.maxTurns}`;
    return `${head}\n${line} · score ${S.over.score}\n${E.shareGrid(S)}`;
  }
  // The result code for a finished run. It never blocks play: any fault returns null.
  function codeOf(run) {
    const R = self.TDWRecord;
    if (!R || !Array.isArray(run.log) || !run.log.length) return null;
    try {
      const ctx = R.page();
      const code = R.makeCode(ctx, { opId: run.op_id, tier: run.tier, seed: run.seed, lens: run.lens, doctrine: run.doctrine, mode: run.mode, maxTurns: run.maxTurns, actions: run.log });
      return R.verify(code, ctx).ok ? code : null;
    } catch { return null; }
  }
  const challengeOf = (run) => (run.mode === 'challenge' ? `${run.op_id}~${run.tier}~${run.seed}` : null);
  function runOut(run) {
    const S = run.state;
    const o = opById.get(run.op_id);
    return {
      run: { id: run.id, mode: run.mode, opId: run.op_id, tier: run.tier, day: run.day, dayNumber: run.day ? dayNumber(run.day) : null, arcId: run.arc_id, arcNode: run.arc_node, challenge: challengeOf(run), guide: run.guide || null, coach: run.mode === 'guide' && Array.isArray(run.coach) ? run.coach.slice() : [], watch: watchOf(o), status: run.status, scored: !!run.scored, score: run.score, stars: run.stars, xp: run.xp },
      brief: brief(o, false), view: E.view(S), debrief: S.over ? debrief(o) : null,
      share: S.over ? shareText(run, S) : null, code: S.over ? run.code || null : null,
    };
  }
  function loadRun(id) {
    const run = load().runs[Number(id)];
    if (!run) fail(404, 'No such run');
    if (!run.state) fail(404, 'This run is archived. Its result still counts.');
    return run;
  }
  function startRun(body) {
    need();
    const d = load();
    const mode = body.mode || 'free';
    const lo = loadout();
    let lens = body.lens || null;
    let doctrine = body.doctrine || null;
    if (lens && !lo.lenses.includes(lens)) fail(403, 'That lens is still locked.');
    if (doctrine && !lo.doctrines.includes(doctrine)) fail(403, 'That doctrine card is still locked.');
    let op; let seed; let tier; let day = null; let arcId = null; let arcNode = null; let scored = 1; let maxTurns; let guide = null;
    if (mode === 'daily') {
      day = today();
      op = dailyOp(day); seed = `daily:${day}`; tier = DAILY_TIER;
      if (runs().some((r) => r.mode === 'daily' && r.day === day && r.scored && (r.status === 'won' || r.status === 'lost'))) scored = 0;
      const live = runs().filter((r) => r.mode === 'daily' && r.day === day && r.status === 'live').sort((a, b) => b.id - a.id)[0];
      if (live) return live;
    } else if (mode === 'arc') {
      const arc = arcById.get(String(body.arcId || ''));
      if (!arc) fail(404, 'No such arc');
      const node = Number(body.node);
      if (!Number.isInteger(node) || node < 0 || node >= arc.nodes.length) fail(400, 'No such step in this arc');
      if (node > 0 && (d.arcs[arc.id] || {})[node - 1] == null) fail(403, 'Clear the step before this one first.');
      op = opById.get(arc.nodes[node]); seed = randomHex(6); tier = arcTier(arc, node); arcId = arc.id; arcNode = node;
    } else if (mode === 'tutorial') {
      op = opById.get(C.tutorial || 'C001'); seed = 'tutorial'; tier = 1; lens = null; doctrine = null; maxTurns = 6;
    } else if (mode === 'guide') {
      const gd = guideById.get(String(body.guide || ''));
      if (!gd) fail(404, 'No such guided run in this build.');
      op = opById.get(gd.op); seed = gd.seed; tier = gd.tier; lens = null; doctrine = null; maxTurns = gd.turns; guide = gd.id;
    } else if (mode === 'free') {
      op = opById.get(String(body.opId || ''));
      if (!op) fail(404, 'No such operation');
      seed = randomHex(6);
      tier = Math.max(1, Math.min(7, Number(body.tier) || op.tier));
    } else if (mode === 'challenge') {
      // A challenge is a link that fixes the operation, tier and seed. Both players start from the same opening, with no loadout.
      const cid = String(body.opId || ''); const ctier = Number(body.tier); const cseed = String(body.seed || '');
      if (!/^[A-Z]\d{3}$/.test(cid) || !(ctier >= 1 && ctier <= 7) || !/^[a-z0-9]{6,16}$/.test(cseed)) fail(400, 'This challenge link is not valid.');
      op = opById.get(cid);
      if (!op) fail(404, 'No such operation');
      seed = cseed; tier = ctier; lens = null; doctrine = null;
      const same = (r) => r.mode === 'challenge' && r.op_id === cid && r.tier === ctier && r.seed === cseed;
      if (runs().some((r) => same(r) && (r.status === 'won' || r.status === 'lost'))) scored = 0;
      const live = runs().filter((r) => same(r) && r.status === 'live').sort((a, b) => b.id - a.id)[0];
      if (live) return live;
    } else fail(400, 'Unknown mode');
    // One live run per mode at a time; starting another abandons the old one.
    for (const r of runs()) if (r.mode === mode && r.status === 'live') r.status = 'abandoned';
    const S = E.newGame(op, { seed, tier, lens, doctrine, mode, maxTurns, registry: REG });
    const id = ++d.seq;
    // log holds every accepted action. With the seed it lets anyone replay the run and verify the result.
    const run = { id, mode, op_id: op.id, seed, tier, lens, doctrine, day, arc_id: arcId, arc_node: arcNode, state: S, scored, status: 'live', score: null, stars: null, turns: null, xp: null, created: Date.now(), maxTurns: maxTurns || null, log: [], code: null, ...(guide ? { guide } : {}) };
    d.runs[id] = run;
    save();
    return run;
  }

  function finalize(run, S) {
    const d = load();
    const win = S.over.outcome === 'win';
    const beforeLevel = levelOf(d.xp);
    const newCaptures = S.over.captured.filter((c) => !(d.codex[c] && d.codex[c].captured));
    const newSeen = S.over.seen.filter((c) => !d.codex[c]);
    for (const c of S.over.seen) d.codex[c] = { seen: 1, captured: d.codex[c] ? d.codex[c].captured : 0 };
    for (const c of S.over.captured) d.codex[c] = { seen: 1, captured: 1 };
    const xp = win ? 100 + 25 * S.over.stars + 10 * run.tier + 10 * newCaptures.length : 25 + 5 * S.over.turns + 5 * newCaptures.length;
    const firstDaily = run.mode === 'daily' && run.scored && d.lastDaily !== run.day;
    d.xp += xp; d.won += win ? 1 : 0; d.played += 1;
    if (firstDaily) { d.days += 1; d.lastDaily = run.day; }
    Object.assign(run, { status: win ? 'won' : 'lost', score: S.over.score, stars: S.over.stars, turns: S.over.turns, xp, finished: Date.now() });
    const newUnlocks = [];
    const grant = (key) => { if (!d.unlocks[key]) { d.unlocks[key] = Date.now(); newUnlocks.push(key); } };
    if (run.mode === 'guide' && run.guide) grant('guide:' + run.guide);
    if (win) {
      if (run.mode !== 'tutorial' && run.mode !== 'guide') grant('lens:' + S.dim);
      if (run.mode === 'arc') {
        const ap = (d.arcs[run.arc_id] = d.arcs[run.arc_id] || {});
        ap[run.arc_node] = Math.max(ap[run.arc_node] || 0, S.over.stars);
        if (Object.keys(ap).length >= arcById.get(run.arc_id).nodes.length) grant('arc:' + run.arc_id);
      }
      if (run.mode === 'tutorial') grant('tutorial');
    }
    const caps = new Set(Object.keys(d.codex).filter((c) => d.codex[c].captured));
    for (const g of E.GROUPS) if (E.CODES.filter((c) => E.CARDS[c].group === g).every((c) => caps.has(c))) grant('group:' + g);
    if (caps.size === 36) grant('codex:all');
    const after = levelOf(d.xp);
    const newDoctrines = Object.entries(DOCTRINE_LEVEL).filter(([, L]) => L > beforeLevel && L <= after).map(([k]) => 'doctrine:' + k);
    return { xp, level: after, levelUp: after > beforeLevel, title: titleOf(after), newUnlocks: newUnlocks.concat(newDoctrines), newCaptures, newSeen };
  }

  function arcProgress() { return load().arcs; }

  // ---------- routes ----------
  const R = [];
  const on = (method, re, fn) => R.push([method, re, fn]);

  on('GET', /^\/api\/me$/, () => ({ user: load().user ? publicUser(load().user) : null }));
  on('POST', /^\/api\/guest$/, () => { const u = need(); return { user: { id: u.id, username: u.username, isGuest: true } }; });
  on('GET', /^\/api\/taxonomy$/, () => C.taxonomy);
  on('GET', /^\/api\/game\/meta$/, () => META);
  on('POST', /^\/api\/heartbeat$/, (m, q, body) => {
    const d = load();
    const day = today();
    d.activity = { [day]: ((d.activity || {})[day] || 0) + Math.max(0, Math.min(90, Number(body.seconds) | 0)) };
    save();
    const mins = Math.floor(d.activity[day] / 60);
    return { minutesToday: mins, overLimit: false, breakPrompt: mins >= 60 };
  });

  on('GET', /^\/api\/ops$/, () => {
    const best = {};
    for (const r of runs()) if (r.status === 'won') best[r.op_id] = Math.max(best[r.op_id] || 0, r.stars);
    return { ops: OPS.filter((o) => !o.hidden).map((o) => ({ id: o.id, kind: o.kind, title: o.title, label: o.label, tier: o.tier, band: o.band || null, dimension: o.dimension, arc: o.arc, world: o.world, watch: watchOf(o), stars: best[o.id] ?? null, diff: diffOf(o.id) })) };
  });
  on('GET', /^\/api\/ops\/([A-Za-z0-9]+)$/, (m, q) => {
    const o = opById.get(m[1]);
    if (!o) fail(404, 'No such operation');
    const out = { op: brief(o, true), loadout: load().user ? loadout() : null };
    out.guideDone = !!(out.op.guide && has('guide:' + out.op.guide));
    const arc = arcById.get(String(q.arc || ''));
    const node = Number(q.node);
    if (arc && arc.nodes[node] === o.id) out.arcTier = arcTier(arc, node);
    return out;
  });

  on('POST', /^\/api\/runs$/, (m, q, body) => runOut(startRun(body || {})));
  on('GET', /^\/api\/runs\/live$/, () => {
    need();
    const live = runs().filter((r) => r.status === 'live').sort((a, b) => b.id - a.id).slice(0, 5);
    return { runs: live.map((r) => ({ id: r.id, mode: r.mode, op_id: r.op_id, arc_id: r.arc_id, arc_node: r.arc_node, day: r.day, title: opById.get(r.op_id).title })) };
  });
  on('GET', /^\/api\/runs\/(\d+)$/, (m) => { need(); return runOut(loadRun(m[1])); });
  on('POST', /^\/api\/runs\/(\d+)\/abandon$/, (m) => {
    need();
    const run = load().runs[Number(m[1])];
    if (!run) fail(404, 'No such run');
    if (run.status === 'live') { run.status = 'abandoned'; save(); }
    return { ok: true };
  });
  on('POST', /^\/api\/runs\/(\d+)\/act$/, (m, q, body) => {
    need();
    const run = loadRun(m[1]);
    if (run.status !== 'live') fail(409, 'This operation is over.');
    const action = (body && body.action) || {};
    const clean = { type: String(action.type || '') };
    if (action.intent != null) clean.intent = Number(action.intent);
    if (action.domain != null) clean.domain = String(action.domain);
    if (action.cadre != null) clean.cadre = String(action.cadre);
    if (action.holding != null) clean.holding = String(action.holding);
    if (action.move != null) clean.move = String(action.move);
    const S = JSON.parse(JSON.stringify(run.state));
    let events;
    try { events = E.act(S, clean); } catch (e) { fail(400, e.message); }
    run.state = S;
    // Runs begun before the log existed have none, and carry no code.
    if (Array.isArray(run.log)) run.log.push(clean);
    const rewards = S.over ? finalize(run, S) : null;
    if (S.over) { run.code = codeOf(run); if (run.code) delete run.log; }
    const out = { ...runOut(run), events, rewards };
    save();
    return out;
  });

  on('GET', /^\/api\/daily$/, () => {
    const day = today();
    const o = dailyOp(day);
    const mine = load().user ? runs().filter((r) => r.mode === 'daily' && r.day === day && r.scored).sort((a, b) => a.id - b.id)[0] : null;
    const done = mine && mine.status !== 'live' && mine.status !== 'abandoned';
    return {
      day, number: dayNumber(day), op: brief(o, true), tier: DAILY_TIER,
      mine: mine && mine.status !== 'abandoned' ? { id: mine.id, status: mine.status, score: mine.score, stars: mine.stars, turns: mine.turns } : null,
      board: done ? [{ rank: 1, name: 'You', score: mine.score, stars: mine.stars, outcome: mine.status, me: true }] : [],
      stats: { players: done ? 1 : 0, winRate: done ? (mine.status === 'won' ? 100 : 0) : null },
    };
  });

  // The player's finished runs that carry a verifiable code, newest first.
  on('GET', /^\/api\/records$/, () => {
    need();
    const done = runs().filter((r) => (r.status === 'won' || r.status === 'lost') && r.code).sort((a, b) => b.id - a.id).slice(0, 40);
    return {
      records: done.map((r) => ({ id: r.id, mode: r.mode, opId: r.op_id, title: opById.get(r.op_id).title, tier: r.tier, day: r.day, dayNumber: r.day ? dayNumber(r.day) : null, status: r.status, score: r.score, stars: r.stars, seed: r.seed, code: r.code, challenge: challengeOf(r), watch: watchOf(opById.get(r.op_id)) })),
    };
  });

  on('GET', /^\/api\/calendar$/, () => ({ calendar: C.calendar || [], note: C.calendarNote || '' }));

  // Forecast mode. The player's own probabilities live here. The claims and the results are static files the page reads.
  on('GET', /^\/api\/forecast\/mine$/, () => ({ forecasts: load().forecasts || {} }));
  on('POST', /^\/api\/forecast$/, (m, q, body) => {
    const id = String((body && body.id) || '');
    const p = Number(body && body.p);
    if (!/^[A-Za-z0-9-]{1,24}$/.test(id)) fail(400, 'No such claim.');
    if (!Number.isInteger(p) || p < 1 || p > 99) fail(400, 'Enter a whole number from 1 to 99.');
    const d = load();
    d.forecasts = d.forecasts || {};
    if (d.forecasts[id]) fail(409, 'This forecast is locked. It cannot be changed.');
    d.forecasts[id] = { p, at: Date.now() };
    save();
    return { forecast: d.forecasts[id] };
  });

  on('GET', /^\/api\/arcs$/, () => {
    const prog = arcProgress();
    return {
      arcs: ARCS.map((a) => {
        const p = prog[a.id] || {};
        return { id: a.id, name: a.name, blurb: a.blurb, span: a.span, nodes: a.nodes.length, cleared: Object.keys(p).length, stars: Object.values(p).reduce((s, x) => s + x, 0) };
      }),
    };
  });
  on('GET', /^\/api\/arcs\/([a-z-]+)$/, (m) => {
    const a = arcById.get(m[1]);
    if (!a) fail(404, 'No such arc');
    const p = arcProgress()[a.id] || {};
    return {
      arc: { id: a.id, name: a.name, blurb: a.blurb, span: a.span },
      nodes: a.nodes.map((id, i) => {
        const o = opById.get(id);
        return { index: i, id, title: o.title, label: o.label, kind: o.kind, tier: arcTier(a, i), diff: (diffOf(id) || [])[arcTier(a, i) - 1] ?? null, dimension: o.dimension, stars: p[i] ?? null, open: i === 0 || p[i - 1] != null };
      }),
    };
  });

  on('GET', /^\/api\/codex$/, () => {
    need();
    const d = load();
    return {
      cards: META.cards.map((c) => ({ ...c, seen: !!(d.codex[c.code] && d.codex[c.code].seen), captured: !!(d.codex[c.code] && d.codex[c.code].captured), foundIn: (foundIn[c.code] || []).slice(0, 6).map((id) => ({ id, title: opById.get(id).title, label: opById.get(id).label })) })),
      groups: E.GROUPS.map((g) => ({ name: g, done: has('group:' + g) })),
      progress: progress(),
      badges: Object.keys(d.unlocks).filter((k) => k.startsWith('arc:') || k.startsWith('group:') || k === 'codex:all'),
    };
  });
  on('GET', /^\/api\/progress$/, () => { need(); return { progress: progress(), tutorialDone: has('tutorial'), guidesDone: GUIDES.filter((g) => has('guide:' + g.id)).map((g) => g.id) }; });
  // ---------- version 12: progress to and from a file ----------
  // The file holds this build's save as it stands. Loading one checks every field and keeps only what this build knows,
  // so a file from another build, an edited file or a file from a later version cannot break the game.
  const FILE_FORMAT = 'tdw-progress';
  const BUILD_NAMES = { 'tdw-demo-1': 'the base game', 'tdw-1931-1': 'the 1931 build', 'tdw-2030-1': 'the 2030 build', 'tdw-2026-1': 'the 2026 build' };
  const RUN_MODES = ['free', 'daily', 'arc', 'challenge', 'tutorial', 'guide'];
  const RUN_STATUS = ['live', 'won', 'lost', 'abandoned'];
  const DAY_OK = /^\d{4}-\d{2}-\d{2}$/;
  const SEED_OK = /^[A-Za-z0-9:_-]{1,40}$/;
  const CODE_OK = /^TDW1~[A-Za-z0-9:_~.-]{10,4000}$/;
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const ownKey = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const nat = (x, max = 1e9) => (Number.isInteger(x) && x >= 0 && x <= max ? x : 0);
  const intIn = (x, lo, hi) => (Number.isInteger(x) && x >= lo && x <= hi ? x : null);
  // A run must fit the rules of its mode, as startRun sets them.
  function fitsMode(r) {
    switch (r.mode) {
      case 'daily': return typeof r.day === 'string' && DAY_OK.test(r.day) && r.seed === `daily:${r.day}` && r.tier === DAILY_TIER && dailyOp(r.day).id === r.op_id;
      case 'tutorial': return r.op_id === (C.tutorial || 'C001') && r.seed === 'tutorial' && r.tier === 1;
      case 'guide': { const gd = typeof r.guide === 'string' ? guideById.get(r.guide) : null; return !!gd && gd.op === r.op_id && gd.seed === r.seed && gd.tier === r.tier; }
      case 'arc': { const arc = typeof r.arc_id === 'string' ? arcById.get(r.arc_id) : null; return !!arc && Number.isInteger(r.arc_node) && arc.nodes[r.arc_node] === r.op_id; }
      case 'challenge': return /^[a-z0-9]{6,16}$/.test(r.seed);
      default: return true;
    }
  }
  // The same shape the act route gives an action before the engine sees it.
  function cleanAction(a) {
    const c = { type: String(a.type || '') };
    if (a.intent != null) c.intent = Number(a.intent);
    if (a.domain != null) c.domain = String(a.domain);
    if (a.cadre != null) c.cadre = String(a.cadre);
    if (a.holding != null) c.holding = String(a.holding);
    if (a.move != null) c.move = String(a.move);
    return c;
  }
  function cleanRun(id, r) {
    if (!isObj(r) || r.id !== id || !RUN_MODES.includes(r.mode) || !RUN_STATUS.includes(r.status) || typeof r.op_id !== 'string' || !opById.has(r.op_id)) return null;
    if (typeof r.seed !== 'string' || !SEED_OK.test(r.seed) || intIn(r.tier, 1, 7) == null || !fitsMode(r)) return null;
    const out = {
      id, mode: r.mode, op_id: r.op_id, seed: r.seed, tier: r.tier,
      lens: typeof r.lens === 'string' && ownKey(E.LENSES, r.lens) ? r.lens : null,
      doctrine: typeof r.doctrine === 'string' && ownKey(E.DOCTRINES, r.doctrine) ? r.doctrine : null,
      day: r.mode === 'daily' ? r.day : null,
      arc_id: r.mode === 'arc' ? r.arc_id : null, arc_node: r.mode === 'arc' ? r.arc_node : null,
      scored: r.scored ? 1 : 0, status: r.status,
      score: intIn(r.score, -100000, 100000), stars: intIn(r.stars, 0, 3), turns: intIn(r.turns, 0, 99), xp: intIn(r.xp, 0, 100000),
      created: intIn(r.created, 0, 1e14), maxTurns: intIn(r.maxTurns, 1, 99),
      code: typeof r.code === 'string' && CODE_OK.test(r.code) ? r.code : null,
    };
    if (r.finished != null) out.finished = intIn(r.finished, 0, 1e14);
    if (r.mode === 'guide') {
      out.guide = r.guide;
      const steps = guideById.get(r.guide).steps.map((x) => x.id);
      if (Array.isArray(r.coach)) out.coach = r.coach.filter((x) => steps.includes(x));
    }
    if (out.status !== 'live') return out;
    // A live run keeps no board from the file. The game builds it again from the seed and replays the moves on record,
    // as the result code does, so a doctored board never reaches the page. A run whose moves do not replay goes.
    if (!Array.isArray(r.log) || r.log.length > 400) return null;
    try {
      let S = E.newGame(opById.get(out.op_id), { seed: out.seed, tier: out.tier, lens: out.lens, doctrine: out.doctrine, mode: out.mode, maxTurns: out.maxTurns || undefined, registry: REG });
      const log = [];
      for (const a of r.log) {
        if (!isObj(a)) return null;
        const c = cleanAction(a);
        S = JSON.parse(JSON.stringify(S));
        E.act(S, c);
        log.push(c);
        if (S.over) return null;
      }
      out.state = JSON.parse(JSON.stringify(S)); out.log = log;
    } catch { return null; }
    return out;
  }
  function cleanSave(s) {
    if (!isObj(s) || s.v !== 1) fail(400, 'This file holds no progress this game can read.');
    const d = blank();
    if (isObj(s.user) && typeof s.user.username === 'string' && /^[A-Za-z0-9_]{3,24}$/.test(s.user.username)) d.user = { id: 1, username: s.user.username };
    // Live runs come first, the newest one of each mode, and then the newest finished runs, up to 5000 in all.
    if (isObj(s.runs)) {
      const ids = Object.keys(s.runs).filter((k) => /^[1-9]\d{0,6}$/.test(k)).map(Number).sort((x, y) => y - x);
      const live = new Set(); let kept = 0;
      for (const pass of ['live', 'done']) for (const id of ids) {
        if (kept >= 5000) break;
        const r = s.runs[String(id)];
        if (!isObj(r) || (pass === 'live') !== (r.status === 'live')) continue;
        if (pass === 'live' && live.has(r.mode)) continue;
        const c = cleanRun(id, r);
        if (c) { d.runs[id] = c; kept++; if (pass === 'live') live.add(c.mode); }
      }
    }
    d.seq = Math.max(nat(s.seq, 1e7), 0, ...Object.keys(d.runs).map(Number));
    for (const k of ['xp', 'won', 'played', 'days']) d[k] = nat(s[k]);
    d.lastDaily = typeof s.lastDaily === 'string' && DAY_OK.test(s.lastDaily) ? s.lastDaily : null;
    if (isObj(s.codex)) for (const [c, x] of Object.entries(s.codex)) if (E.CODES.includes(c) && isObj(x)) d.codex[c] = { seen: x.seen ? 1 : 0, captured: x.captured ? 1 : 0 };
    if (isObj(s.unlocks)) for (const [k, t] of Object.entries(s.unlocks)) if (/^(?:(?:lens|doctrine|arc|group|codex|guide):[A-Za-z0-9 _-]{1,40}|tutorial)$/.test(k) && Number.isFinite(t)) d.unlocks[k] = t;
    if (isObj(s.arcs)) for (const [a, nodes] of Object.entries(s.arcs)) {
      if (!arcById.has(a) || !isObj(nodes)) continue;
      const n = arcById.get(a).nodes.length; const keep = {};
      for (const [i, st] of Object.entries(nodes)) if (/^(?:0|[1-9]\d?)$/.test(i) && Number(i) < n && intIn(st, 0, 3) != null) keep[i] = st;
      d.arcs[a] = keep;
    }
    if (isObj(s.forecasts)) {
      d.forecasts = {};
      for (const [id, f] of Object.entries(s.forecasts)) if (/^[A-Za-z0-9-]{1,24}$/.test(id) && isObj(f) && intIn(f.p, 1, 99) != null && intIn(f.at, 0, Date.now() + 86400000) != null) d.forecasts[id] = { p: f.p, at: f.at };
    }
    if (Array.isArray(s.hints)) d.hints = s.hints.filter((h) => HINT_IDS.includes(h));
    return d;
  }
  function summaryOf(d) {
    const L = levelOf(d.xp); const cx = Object.values(d.codex);
    const done = Object.values(d.runs).filter((r) => (r.status === 'won' || r.status === 'lost') && r.code);
    return { level: L, title: titleOf(L), xp: d.xp, played: d.played, won: d.won, captured: cx.filter((x) => x.captured).length, records: done.length, forecasts: Object.keys(d.forecasts || {}).length, arcs: Object.keys(d.arcs).length };
  }
  // Another tab that writes the save sends a storage event. This tab drops its copy and reads the save again before it writes.
  if (typeof self.addEventListener === 'function') self.addEventListener('storage', (e) => { if (!e || e.key === KEY || e.key === null) db = null; });
  on('GET', /^\/api\/demo\/summary$/, () => ({ summary: summaryOf(load()), persist }));
  on('GET', /^\/api\/demo\/export$/, () => ({ file: { format: FILE_FORMAT, version: 1, build: KEY, era: C.era || null, exported: new Date().toISOString(), save: JSON.parse(JSON.stringify(load())) } }));
  on('POST', /^\/api\/demo\/import$/, (m, q, body) => {
    const f = body && body.file;
    if (!isObj(f) || f.format !== FILE_FORMAT || !(Number.isInteger(f.version) && f.version >= 1)) fail(400, 'This is not a TDW progress file.');
    if (f.version > 1) fail(400, 'This file comes from a newer version of the game. Update this build first.');
    if (f.build !== KEY) fail(400, `This file holds progress for another build of the game. It comes from ${typeof f.build === 'string' && ownKey(BUILD_NAMES, f.build) ? BUILD_NAMES[f.build] : 'a build this one does not know'}.`);
    const clean = cleanSave(f.save);
    if (body.apply !== true) return { summary: summaryOf(clean), applied: false, persist };
    // The minutes played today stay with this browser, so the break prompt keeps counting.
    clean.activity = isObj(load().activity) ? load().activity : {};
    db = clean;
    save();
    return { summary: summaryOf(db), applied: true, persist };
  });

  on('POST', /^\/api\/demo\/reset$/, () => { db = blank(); try { localStorage.removeItem(KEY); } catch { /* memory only */ } return { ok: true }; });

  // Coach steps a player dismissed in a guided run. The run keeps them, so they go when the run goes.
  on('POST', /^\/api\/runs\/(\d+)\/coach$/, (m, q, body) => {
    need();
    const run = load().runs[Number(m[1])];
    const gd = run && run.mode === 'guide' ? guideById.get(run.guide) : null;
    if (!gd) fail(404, 'No such guided run');
    const step = String((body && body.step) || '');
    if (!gd.steps.some((x) => x.id === step)) fail(400, 'No such step.');
    run.coach = (Array.isArray(run.coach) ? run.coach : []).filter((x) => gd.steps.some((y) => y.id === x));
    if (!run.coach.includes(step)) run.coach.push(step);
    save();
    return { coach: run.coach.slice() };
  });
  on('GET', /^\/api\/guides$/, () => ({ guides: GUIDES.map((g) => ({ ...guideOut(g), done: has('guide:' + g.id) })) }));
  const hintsOf = (d) => (Array.isArray(d.hints) ? d.hints.filter((h) => HINT_IDS.includes(h)) : []);
  on('GET', /^\/api\/hints$/, () => ({ seen: hintsOf(load()) }));
  on('POST', /^\/api\/hints$/, (m, q, body) => {
    const id = String((body && body.id) || '');
    if (!HINT_IDS.includes(id)) fail(400, 'No such hint.');
    const d = load();
    d.hints = hintsOf(d);
    if (!d.hints.includes(id)) d.hints.push(id);
    save();
    return { seen: d.hints.slice() };
  });

  function handle(method, url, body) {
    const u = new URL(url, 'http://demo.invalid');
    const q = Object.fromEntries(u.searchParams);
    for (const [mth, re, fn] of R) {
      if (mth !== method) continue;
      const m = re.exec(u.pathname);
      if (m) return fn(m, q, body);
    }
    fail(404, 'This part of TDW needs the full game.');
  }

  // The client's api() helper calls this in place of fetch. Global fetch stays untouched.
  const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  self.TDW_FETCH = async function (input, init) {
    const url = String(input);
    const method = ((init && init.method) || 'GET').toUpperCase();
    let body = {};
    if (init && init.body) { try { body = JSON.parse(init.body); } catch { return json(400, { error: 'Bad JSON' }); } }
    await new Promise((r) => setTimeout(r, 0));
    try { return json(200, handle(method, url, body)); } catch (e) { return json(e.status || 500, { error: e.status ? e.message : 'Something broke in the demo. Reload to continue.' }); }
  };
})();

