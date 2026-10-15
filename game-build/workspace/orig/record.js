/* TDW record. Result codes, replay verification, replay frames and the after-action report.
 * The engine is deterministic: the same operation, tier, seed, loadout and actions always produce the same game.
 * A result code carries those inputs. Verification replays them and reads the result from the engine,
 * so no one can post a score without a legal line of play that earns it.
 * Pure functions over the engine and the content. Runs in Node and in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TDWRecord = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PREFIX = 'TDW1';
  const SEP = '~';
  const IDX = '0123456789ab';
  const MODES = ['free', 'daily', 'arc', 'challenge', 'tutorial'];
  const SEED_RE = /^[A-Za-z0-9:_-]{1,40}$/;
  const CHALLENGE_RE = /^([CF]\d{3})~([1-6])~([a-z0-9]{6,16})$/;

  // ---------- context ----------
  function makeCtx(E, C) {
    return { E, ops: C.ops, byId: new Map(C.ops.map((o) => [o.id, o])), epoch: C.dailyEpoch || '2026-09-30' };
  }
  let pageCtx = null;
  function page() {
    if (!pageCtx) pageCtx = makeCtx(self.TDWEngine, JSON.parse(document.getElementById('tdw-content').textContent));
    return pageCtx;
  }

  const fail = (message) => { throw new Error(message); };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const cardName = (E, code) => (E.CARDS[code] ? `S${E.CARDS[code].num}, ${E.CARDS[code].name}` : code);

  // ---------- the daily rule, shared with the game ----------
  function dayNumber(ctx, day) {
    return Math.max(1, Math.floor((Date.parse(day + 'T00:00:00Z') - Date.parse(ctx.epoch + 'T00:00:00Z')) / 86400000) + 1);
  }
  function dailyOp(ctx, day) {
    const n = dayNumber(ctx, day);
    const L = ctx.ops.length;
    return ctx.ops[(((n * 37) % L) + L) % L];
  }

  // ---------- actions <-> tokens ----------
  const domChar = (E, d) => { const i = E.DOMAINS.indexOf(d); if (i < 0) fail('Unknown domain.'); return IDX[i]; };
  const idNum = (n) => { if (!Number.isInteger(n) || n < 0 || n > 9999) fail('Bad card id.'); return String(n); };

  function encodeAction(E, a) {
    switch (a.type) {
      case 'detect': return 'd' + idNum(a.intent);
      case 'disrupt': return a.intent != null ? 'x' + idNum(a.intent) : 'X' + domChar(E, a.domain);
      case 'defend': return 'f' + domChar(E, a.domain);
      case 'open': return 'o' + domChar(E, a.domain);
      case 'accept': return 'a' + idNum(a.intent);
      case 'name': return 'n' + domChar(E, a.domain);
      case 'doctrine': return a.domain ? 'k' + domChar(E, a.domain) : 'k';
      case 'end': return 'e';
      default: return fail('Unknown action.');
    }
  }
  function decodeAction(E, tok) {
    const m = /^([dxafonXk])(\d{1,4}|[0-9ab])?$/.exec(tok) || (tok === 'e' ? ['e', 'e', undefined] : null);
    if (!m) fail('The code holds an action the game does not know.');
    const t = m[1];
    const arg = m[2];
    const dom = () => { const i = IDX.indexOf(arg); if (arg == null || arg.length !== 1 || i < 0) fail('The code names an unknown domain.'); return E.DOMAINS[i]; };
    const id = () => { if (arg == null || !/^\d+$/.test(arg)) fail('The code is missing a card id.'); return Number(arg); };
    switch (t) {
      case 'd': return { type: 'detect', intent: id() };
      case 'x': return { type: 'disrupt', intent: id() };
      case 'X': return { type: 'disrupt', domain: dom() };
      case 'f': return { type: 'defend', domain: dom() };
      case 'o': return { type: 'open', domain: dom() };
      case 'a': return { type: 'accept', intent: id() };
      case 'n': return { type: 'name', domain: dom() };
      case 'k': return arg == null ? { type: 'doctrine' } : { type: 'doctrine', domain: dom() };
      default: return { type: 'end' };
    }
  }

  // ---------- codes ----------
  const checkOf = (E, body) => (E.hashSeed(body) >>> 0).toString(36);

  function makeCode(ctx, r) {
    const E = ctx.E;
    const body = [PREFIX, r.opId, r.tier, r.seed, r.lens || '-', r.doctrine || '-', r.mode || 'free', r.maxTurns || '-', r.actions.map((a) => encodeAction(E, a)).join('.')].join(SEP);
    return body + SEP + checkOf(E, body);
  }

  function parseCode(text, ctx) {
    const E = ctx.E;
    const raw = String(text == null ? '' : text).replace(/\s+/g, '');
    const p = raw.split(SEP);
    if (p[0] !== PREFIX) fail('This is not a TDW result code. It starts with TDW1.');
    if (p.length !== 10) fail('The code is incomplete. Copy the whole code.');
    const body = p.slice(0, 9).join(SEP);
    if (checkOf(E, body) !== p[9].toLowerCase()) fail('The code has a typo or a missing piece. Copy it again.');
    const [, opId, tier, seed, lens, doctrine, mode, maxTurns, acts] = p;
    if (!/^[CF]\d{3}$/.test(opId)) fail('The code names no valid operation.');
    if (!/^[1-6]$/.test(tier)) fail('The code names no valid tier.');
    if (!SEED_RE.test(seed)) fail('The code holds a bad seed.');
    if (lens !== '-' && !/^[A-Za-z]{3,20}$/.test(lens)) fail('The code names no valid lens.');
    if (doctrine !== '-' && !/^[a-z]{3,20}$/.test(doctrine)) fail('The code names no valid doctrine card.');
    if (!MODES.includes(mode)) fail('The code names no valid mode.');
    if (maxTurns !== '-' && !/^\d{1,2}$/.test(maxTurns)) fail('The code holds a bad clock.');
    if (!acts) fail('The code holds no actions.');
    const toks = acts.split('.');
    if (toks.length > 400) fail('The code holds too many actions.');
    return {
      opId, tier: Number(tier), seed, lens: lens === '-' ? null : lens, doctrine: doctrine === '-' ? null : doctrine,
      mode, maxTurns: maxTurns === '-' ? undefined : Number(maxTurns), actions: toks.map((t) => decodeAction(E, t)),
    };
  }

  // ---------- replay ----------
  function snapshot(E, S) {
    return {
      turn: S.turn, ap: S.ap, coherence: S.coherence, leverage: S.leverage, consumeAt: S.consumeAt, stage: S.stage,
      board: E.DOMAINS.map((d) => { const b = S.board[d]; return { d, short: E.SHORT[d], p: b.p, s: b.s, slope: b.slope, gated: !!b.gated, lock: b.lock, theater: !!b.theater, critical: !!b.critical }; }),
      lever: { named: S.lever.named, correct: S.lever.correct, exposed: S.lever.exposed },
      over: S.over ? Object.assign({}, S.over) : null,
    };
  }
  function handOf(E, S) {
    return S.intents.map((it) => {
      const c = E.CARDS[it.code];
      return { id: it.id, code: it.code, label: c ? `S${c.num}, ${c.name}` : it.code, group: c ? c.group : '', face: it.face, target: it.target || null, amount: it.amount || 0, fake: !!it.fake, offer: !!it.offer };
    });
  }
  function labelOf(E, S, a) {
    const it = a.intent != null ? S.intents.find((x) => x.id === a.intent) : null;
    const what = it ? `${cardName(E, it.code)}${it.fake ? ' (a decoy)' : ''}${it.target ? ` aimed at ${it.target}` : ''}` : 'a card';
    switch (a.type) {
      case 'detect': return `Detect ${what}`;
      case 'disrupt': return a.intent != null ? `Disrupt ${what}` : `Disrupt ${a.domain}`;
      case 'defend': return `Defend ${a.domain}`;
      case 'open': return `Open the gate on ${a.domain}`;
      case 'accept': return `Accept ${what}`;
      case 'name': return `Name ${a.domain} as the lever`;
      case 'doctrine': return `Play the doctrine card${a.domain ? ` on ${a.domain}` : ''}`;
      default: return `End turn ${S.turn}`;
    }
  }

  // Replays the actions. Clones the state before each action, as the live game does when it stores a run.
  function replay(meta, ctx) {
    const E = ctx.E;
    const op = ctx.byId.get(meta.opId);
    if (!op) fail('This operation is not in this version of the game.');
    if (meta.lens && !E.LENSES[meta.lens]) fail('The code names a lens this game does not have.');
    if (meta.doctrine && !E.DOCTRINES[meta.doctrine]) fail('The code names a doctrine card this game does not have.');
    let S = E.newGame(op, { seed: meta.seed, tier: meta.tier, lens: meta.lens, doctrine: meta.doctrine, mode: meta.mode, maxTurns: meta.maxTurns });
    const frames = [{ i: 0, turn: 1, kind: 'open', label: 'The operation opens', ev: [], snap: snapshot(E, S), hand: handOf(E, S) }];
    for (let i = 0; i < meta.actions.length; i++) {
      const a = meta.actions[i];
      S = clone(S);
      const turn = S.turn;
      const label = labelOf(E, S, a);
      let ev;
      try { ev = E.act(S, a); } catch (e) { return fail(`Action ${i + 1} is not legal: ${e.message}`); }
      const f = { i: i + 1, turn, kind: a.type, label, ev, snap: snapshot(E, S) };
      if (a.type === 'end' && !S.over) f.hand = handOf(E, S);
      frames.push(f);
    }
    if (!S.over) fail('The record stops before the operation ends.');
    return { S, frames };
  }

  // Rules the code must meet for its mode.
  function checkMode(meta, ctx) {
    const E = ctx.E;
    if (meta.mode === 'challenge' && (meta.lens || meta.doctrine)) fail('A challenge allows no lens and no doctrine card.');
    if (meta.mode === 'tutorial' && (meta.lens || meta.doctrine || meta.opId !== 'C001' || meta.tier !== 1 || meta.seed !== 'tutorial')) fail('This is not the boot camp operation.');
    if (meta.mode === 'daily') {
      const m = /^daily:(\d{4}-\d{2}-\d{2})$/.exec(meta.seed);
      if (!m || Number.isNaN(Date.parse(m[1] + 'T00:00:00Z'))) fail('A daily code needs a daily seed.');
      if (meta.tier !== 3) fail('The daily runs at Tier 3.');
      if (dailyOp(ctx, m[1]).id !== meta.opId) fail('That was not the operation of the day it claims.');
    }
    if (meta.mode !== 'daily' && /^daily:/.test(meta.seed)) fail('Only a daily code may use a daily seed.');
    return E;
  }

  function summarize(meta, ctx, S) {
    const op = ctx.byId.get(meta.opId);
    const o = S.over;
    return {
      opId: meta.opId, title: op.title, fullTitle: op.fullTitle || op.title, opponent: op.opponent || 'The Party', dimension: op.dimension,
      tier: meta.tier, seed: meta.seed, lens: meta.lens, doctrine: meta.doctrine, mode: meta.mode,
      outcome: o.outcome, reason: o.reason, stars: o.stars, score: o.score, turns: o.turns, maxTurns: S.maxTurns,
      leverage: o.leverage, consumeAt: o.consumeAt, stage: o.stage, leverCorrect: o.leverCorrect, spine: o.spine, captured: o.captured.length,
      actions: meta.actions.length,
    };
  }

  // Returns { ok:true, meta, summary, S, frames } or { ok:false, error }.
  function verify(text, ctx) {
    try {
      const meta = parseCode(text, ctx);
      checkMode(meta, ctx);
      const { S, frames } = replay(meta, ctx);
      return { ok: true, meta, summary: summarize(meta, ctx, S), S, frames };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ---------- events in plain sentences, for the replay ----------
  function describe(e, ctx) {
    const E = ctx.E;
    const card = (c) => cardName(E, c);
    const src = (w) => SRC[w] || (E.CARDS[w] ? card(w) : String(w));
    const sgn = (n) => (n > 0 ? '+' + n : String(n));
    switch (e.k) {
      case 'turn': return `Turn ${e.turn}${e.date ? ', ' + e.date : ''}.`;
      case 'reveal': return `Revealed: ${card(e.code)}${e.target ? ` at ${e.target}` : ''}${e.fake ? ', a decoy' : ''}.`;
      case 'resolve': return `${card(e.code)} lands${e.target ? ` on ${e.target}` : ''}.`;
      case 'fizzle': return `${card(e.code)} was a decoy and did nothing.`;
      case 'press': return e.n > 0 || e.absorbed > 0 ? `${e.d} takes ${e.n} pressure from ${src(e.src)}${e.absorbed ? `, and shields absorb ${e.absorbed}` : ''}.` : null;
      case 'drain': return `${e.d} loses ${e.n} shield${e.n > 1 ? 's' : ''} to ${src(e.src)}.`;
      case 'blocked': return `${e.d} blocks ${e.n} pressure.`;
      case 'shield': return `${e.d} gains ${e.n} shield${e.n > 1 ? 's' : ''}${e.mesh ? ' through the mesh' : ''}.`;
      case 'cancel': return e.fake ? 'A decoy takes the blow.' : `${card(e.code)} is disrupted and captured.`;
      case 'escape': return `${card(e.code)} sheds its shell and slips toward ${e.to}.`;
      case 'clear': return `${e.d} clears ${e.p} pressure${e.slope ? ` and ${e.slope} slope` : ''}.`;
      case 'slope': return `${e.d} takes a slope of ${e.total}.`;
      case 'spill': return `Pressure spills from ${e.from} to ${e.to}.`;
      case 'capture': return `${e.d} falls.`;
      case 'leverage': return `Leverage ${sgn(e.n)}, ${WHY[e.why] || (E.CARDS[e.why] ? card(e.why) : e.why)}.`;
      case 'stage': return `The operation reaches ${e.name}.`;
      case 'coh': return `Coherence ${sgn(e.n)}, ${e.why}.`;
      case 'ease': return `${e.d} eases by ${e.n}.`;
      case 'lure': return `A shield is drawn from ${e.from} to ${e.to}.`;
      case 'lock': return `${e.d} is locked for ${e.turns} turns.`;
      case 'open': return `The gate on ${e.d} opens.`;
      case 'offer': return `${card(e.code)} ${e.accepted ? 'is accepted' : 'passes unanswered'}.`;
      case 'name': return `The lever is named as ${e.d}, and the guess is ${e.correct ? 'right' : 'wrong'}.`;
      case 'doctrine': return `The doctrine card is played${e.d ? ` on ${e.d}` : ''}.`;
      case 'over': return e.outcome === 'win' ? `The operation ends. ${e.reason === 'lever' ? 'The lever is cut' : 'The line holds'}.` : 'The operation reaches Consume.';
      default: return null;
    }
  }

  // ---------- two results on the same seed ----------
  function sameSeed(a, b) { return a.opId === b.opId && a.tier === b.tier && a.seed === b.seed; }
  function compare(a, b) {
    const same = sameSeed(a.summary, b.summary);
    let winner = 'tie';
    if (a.summary.score !== b.summary.score) winner = a.summary.score > b.summary.score ? 'a' : 'b';
    return { same, winner };
  }

  // ---------- challenge seeds ----------
  function parseChallenge(text) {
    const m = CHALLENGE_RE.exec(String(text || '').trim());
    return m ? { opId: m[1], tier: Number(m[2]), seed: m[3] } : null;
  }
  const challengeKey = (c) => `${c.opId}${SEP}${c.tier}${SEP}${c.seed}`;

  // ---------- after-action report ----------
  const WHY = {
    'held ground': 'Domains held at 3 or more pressure', 'lever named': 'Lever named', 'wrong lever': 'A wrong lever named',
    'lever mapped': 'Lever mapped', 'lever captured': 'The lever fell', cascade: 'A load-bearing domain fell', 'one aim': 'Cards pulling one way', governance: 'Governance doctrine',
  };
  const SRC = { slope: 'Slopes', noise: 'Entropy noise', spill: 'Spill from a full domain', trap: 'The door that shut' };

  function report(res, ctx, opts) {
    const E = ctx.E;
    const You = opts && opts.third ? 'The player' : 'You';
    const { S, frames, summary } = res;
    const whyLabel = (w) => WHY[w] || (E.CARDS[w] ? cardName(E, w) : String(w));
    const srcLabel = (w) => SRC[w] || (E.CARDS[w] ? cardName(E, w) : String(w));

    const gain = {}; const relief = {}; const turnGain = {}; const turnCauses = {};
    const press = {}; const byDomain = {}; const captures = [];
    for (const f of frames) {
      for (const e of f.ev) {
        if (e.k === 'leverage') {
          if (e.n > 0) {
            gain[e.why] = (gain[e.why] || 0) + e.n;
            turnGain[f.turn] = (turnGain[f.turn] || 0) + e.n;
            (turnCauses[f.turn] = turnCauses[f.turn] || {})[e.why] = ((turnCauses[f.turn] || {})[e.why] || 0) + e.n;
          } else relief[e.why] = (relief[e.why] || 0) - e.n;
        } else if (e.k === 'press' && e.n > 0) {
          press[e.src] = (press[e.src] || 0) + e.n;
          const dm = (byDomain[e.d] = byDomain[e.d] || {});
          dm[e.src] = (dm[e.src] || 0) + e.n;
        } else if (e.k === 'capture') {
          captures.push({ turn: f.turn, d: e.d, from: Object.entries(byDomain[e.d] || {}).sort((x, y) => y[1] - x[1])[0] });
        }
      }
    }
    const rank = (m, label) => Object.entries(m).sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ key: k, label: label(k), n }));
    const ledger = rank(gain, whyLabel);
    const totalGain = ledger.reduce((a, x) => a + x.n, 0);
    const pressure = rank(press, srcLabel);
    const reliefList = rank(relief, whyLabel);

    const worst = Object.entries(turnGain).sort((x, y) => y[1] - x[1])[0];
    const worstTurn = worst ? { turn: Number(worst[0]), gain: worst[1], causes: rank(turnCauses[worst[0]] || {}, whyLabel).slice(0, 3) } : null;

    const curve = [{ turn: 0, leverage: frames[0].snap.leverage }];
    for (const f of frames) if (f.kind === 'end') curve.push({ turn: f.turn, leverage: f.snap.leverage });

    const nameFrame = frames.find((f) => f.ev.some((e) => e.k === 'name'));
    const named = nameFrame ? { turn: nameFrame.turn, d: nameFrame.ev.find((e) => e.k === 'name').d, correct: !!nameFrame.ev.find((e) => e.k === 'name').correct } : null;
    const idleTurns = S.history.filter((h) => h.unspent >= 2);
    const idle = S.history.reduce((a, h) => a + h.unspent, 0);

    // Up to two changes, each tied to a number in this run.
    const changes = [];
    const lost = summary.outcome !== 'win';
    if (!S.lever.named && (lost || summary.stars < 3)) {
      changes.push(`${You} never named the lever. It was ${summary.spine}. A right guess cuts 2 leverage and makes every Disrupt there cost 1 less.`);
    }
    if (captures.length) {
      const c = captures[0];
      changes.push(`${c.d} fell on turn ${c.turn}${c.from ? `, mostly from ${srcLabel(c.from[0])}` : ''}. A shield there on the turn before absorbs a hit.`);
    }
    if (idleTurns.length) {
      changes.push(`${You} ended turn${idleTurns.length > 1 ? 's' : ''} ${idleTurns.map((h) => h.turn).join(', ')} with 2 or more actions unspent. Idle actions lower coherence, and coherence buys actions.`);
    }
    const held = gain['held ground'] || 0;
    if (totalGain >= 6 && held / totalGain >= 0.5) {
      changes.push(`${Math.round((100 * held) / totalGain)}% of the opponent's leverage came from domains left at 3 or more pressure. Disrupt the hottest domain before it reaches 3.`);
    }
    if (!changes.length) changes.push(lost ? 'No single fault stands out in this run.' : 'This line held cleanly. Raise the tier.');

    return {
      summary, ledger, totalGain, relief: reliefList, pressure, absorbed: S.stats.absorbed, worstTurn, curve, captures, named, idle, idleTurns,
      stats: { detects: S.stats.detects, disrupts: S.stats.disrupts, defends: S.stats.defends }, changes: changes.slice(0, 2),
    };
  }

  return { PREFIX, makeCtx, page, makeCode, parseCode, verify, replay, report, describe, compare, sameSeed, parseChallenge, challengeKey, dailyOp, dayNumber, encodeAction, decodeAction };
});
