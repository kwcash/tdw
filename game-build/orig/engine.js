/* TDW Operations engine.
 * A deterministic turn-based board game over the twelve domains. The opponent runs the method with
 * stratagem cards, the player answers with Detect, Disrupt and Defend, and the operation's dimension
 * sets the physics. Pure data in and out, seeded randomness, runs in Node and the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TDWEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;

  // ---------- the board ----------
  const DOMAINS = ['Kinetic', 'Economic', 'Financial', 'Information', 'Psychological', 'Legal', 'Association', 'Cyber', 'Cultural', 'AI and Cognitive', 'Biological', 'Data and Surveillance'];
  const SHORT = { Kinetic: 'KIN', Economic: 'ECO', Financial: 'FIN', Information: 'INF', Psychological: 'PSY', Legal: 'LEG', Association: 'ASC', Cyber: 'CYB', Cultural: 'CUL', 'AI and Cognitive': 'AIC', Biological: 'BIO', 'Data and Surveillance': 'DAT' };
  // Topology: the links pressure travels along.
  const LINKS = [
    ['Kinetic', 'Cyber'], ['Kinetic', 'Economic'], ['Kinetic', 'Legal'], ['Economic', 'Financial'], ['Economic', 'Legal'],
    ['Economic', 'Biological'], ['Economic', 'Association'], ['Financial', 'Legal'], ['Financial', 'Data and Surveillance'],
    ['Information', 'Psychological'], ['Information', 'Cultural'], ['Information', 'AI and Cognitive'], ['Information', 'Cyber'],
    ['Psychological', 'Cultural'], ['Psychological', 'AI and Cognitive'], ['Legal', 'Association'], ['Association', 'Cultural'],
    ['Cyber', 'Data and Surveillance'], ['AI and Cognitive', 'Data and Surveillance'], ['Biological', 'Data and Surveillance'],
  ];
  const ADJ = {};
  DOMAINS.forEach((d) => { ADJ[d] = []; });
  LINKS.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });

  const STAGES = ['Attract', 'Accommodate', 'Control', 'Extract', 'Consume'];
  const STAGE_TEXT = {
    Attract: 'It offers money, markets, prestige or talent. The host feels opportunity.',
    Accommodate: 'It makes access conditional on silence. The host feels prudence.',
    Control: 'It places its law and its people inside. The host feels routine compliance.',
    Extract: 'It takes knowledge, capital and data. The host feels nothing, or revenue.',
    Consume: 'It leaves the host weaker and dependent. The operation has won.',
  };
  const GROUPS = ['Superiority', 'Confrontation', 'Attack', 'Confusion', 'Control', 'Desperation'];
  const MAX_P = 5;
  const MAX_S = 3;
  const MAX_SLOPE = 3;

  // ---------- the ten dimensions: the physics of an operation ----------
  const DIMENSIONS = {
    Time: { tier: 'Contest', rule: 'The clock runs 10 turns. From turn 6, every domain at 3 or more pressure pays the opponent 1 extra leverage.', counter: 'Build shields early. They last.' },
    Entropy: { tier: 'Substrate', rule: 'Each turn ends with 1 pressure of noise in a random unshielded domain.', counter: 'Your first Detect each turn reveals a second card.' },
    Topology: { tier: 'Substrate', rule: 'A card that pushes a domain to 2 or more pressure spills 1 into its hottest linked domain.', counter: 'Defending a hub with 4 links also shields its hottest neighbor.' },
    Asymmetry: { tier: 'Contest', rule: 'A third of the opponent\'s cards arrive face-down. You cannot disrupt what you cannot attribute.', counter: 'Detect before you strike.' },
    Agency: { tier: 'Gate', rule: 'Three domains start gated with 1 pressure already inside. You hold no authority there until you spend 1 action to open the gate, and the opponent works where you cannot.', counter: 'Open the gates you will need, early.' },
    Resonance: { tier: 'Move', rule: 'A card that lands in a domain already at 2 or more pressure adds 1 more, and the opponent aims where the host is already strained.', counter: 'Keep domains below 2.' },
    Phase: { tier: 'Move', rule: 'The opponent holds back a card on most turns, then fires three extra together on turns 3, 6 and 9.', counter: 'Pre-authorize. A Defend on the turn before a burst adds 2 shields.' },
    Gradient: { tier: 'Move', rule: 'The opponent cuts slopes. Half of every hit becomes a slope that adds pressure each turn.', counter: 'Disrupt a domain to remove its slopes. Remove the incentive and the behavior stops.' },
    Criticality: { tier: 'Contest', rule: 'Two domains bear the load, and the opponent aims at them. If one falls, the operation jumps a whole lifecycle stage.', counter: 'Harden the load-bearing domains first.' },
    Coherence: { tier: 'Multiplier', rule: 'Coherence multiplies. Your actions each turn equal 2 plus your coherence, and the opponent gains leverage when its cards pull one way.', counter: 'Chain your moves. Detect then Disrupt the same card, and defend where the blow lands.' },
  };

  // Passive loadouts, one per dimension. Unlocked by winning an operation of that dimension.
  const LENSES = {
    Time: { name: 'Long horizon', text: 'Defend on turns 1 to 3 adds 2 shields.' },
    Entropy: { name: 'Order at home', text: 'Opponent cards cannot cut your actions or your coherence.' },
    Topology: { name: 'Mesh', text: 'Every Defend also shields the hottest linked domain.' },
    Asymmetry: { name: 'Attribution', text: 'Your first Detect each turn is free.' },
    Agency: { name: 'Open door', text: 'Gates and locks do not bind you.' },
    Resonance: { name: 'Same frequency', text: 'Detecting a card reveals every card of its group.' },
    Phase: { name: 'Pre-authorized', text: 'Your first Disrupt each turn costs 1 less.' },
    Gradient: { name: 'Flatten the slope', text: 'Disrupting a domain removes all its slopes and 2 pressure.' },
    Criticality: { name: 'Harden the nodes', text: 'Shields on load-bearing domains and the lever absorb 2 each.' },
    Coherence: { name: 'One aim', text: 'Start at 3 coherence. Coherence never falls below 2.' },
  };

  // One-shot fixes, one per TOGAF layer. Unlocked by level.
  const DOCTRINES = {
    data: { layer: 'Data', name: 'Twin things, not people', text: 'Reveal every card this turn.' },
    principles: { layer: 'Principles', name: 'Pre-authorize', text: 'Every Disrupt costs 1 this turn.' },
    technology: { layer: 'Technology', name: 'Zero trust gate', text: 'Pick a domain. It takes no pressure this turn.', needsDomain: true },
    application: { layer: 'Application', name: 'Discovery loop', text: 'Gain 2 actions this turn.' },
    business: { layer: 'Business', name: 'Map the dependency', text: 'Expose the opponent\'s lever at no risk.' },
    governance: { layer: 'Governance', name: 'One owner of the lifecycle', text: 'The opponent loses 3 leverage.' },
  };

  // ---------- the Thirty-Six Stratagems ----------
  // face: 'up' shows the card, 'masked' shows a threat but hides the card, 'down' hides everything.
  // aim: how the opponent picks a target. amt: pressure delivered. w: base draw weight.
  const CARDS = {
    S1: { name: 'deceive the heavens to cross the sea', face: 'down', aim: 'theater', amt: 2, text: 'Arrives face-down. Lands 2 pressure where you are not looking.' },
    S2: { name: 'besiege Wei to rescue Zhao', face: 'up', aim: 'strong', amt: 1, text: 'Hits your best-shielded domain. Removes 1 shield, then adds 1 pressure.' },
    S3: { name: 'kill with a borrowed knife', face: 'up', aim: 'theater', amt: 2, proxy: true, text: 'A proxy delivers 2 pressure. Disrupting a proxy costs 1 more.' },
    S4: { name: 'wait at ease for the weary enemy', face: 'up', aim: 'none', amt: 0, text: 'The opponent rests. Next turn it plays one more card.' },
    S5: { name: 'loot a burning house', face: 'up', aim: 'hot', amt: 1, text: 'Strikes the domain in worst shape. 2 pressure if it already holds 3 or more, else 1.' },
    S6: { name: 'make a sound in the east, strike in the west', face: 'masked', aim: 'weak', amt: 2, text: 'Shows one target and strikes another for 2. Detect shows the real one.' },
    S7: { name: 'create something from nothing', face: 'up', aim: 'cold', amt: 2, text: 'Invents a problem. 2 pressure in a quiet domain.' },
    S8: { name: 'openly repair the gallery roads and march secretly through Chencang', face: 'up', aim: 'theater', amt: 1, text: 'An open move for 1 draws the eye while a hidden one strikes for 2.' },
    S9: { name: 'watch the fire from across the river', face: 'up', aim: 'none', amt: 0, text: 'Waits while you burn. Gains 1 leverage for each domain at 3 or more pressure, up to 3.' },
    S10: { name: 'hide a knife behind a smile', face: 'up', aim: 'theater', amt: 0, offer: { ap: 2, slope: 1 }, text: 'A friendly deal. Accept for 2 extra actions now. The knife is a slope of 1 in this domain.' },
    S11: { name: 'sacrifice the plum tree to preserve the peach', face: 'up', aim: 'spine', amt: 2, text: 'Gives up ground elsewhere and moves up to 2 pressure onto its lever.' },
    S12: { name: 'take the opportunity to pilfer a goat', face: 'up', aim: 'open', amt: 1, text: 'Takes what is left unguarded. 1 pressure and 1 leverage in a domain with no shield.' },
    S13: { name: 'stomp the grass to scare the snake', face: 'up', aim: 'theater', amt: 1, text: 'A probe. 1 pressure now, and next turn every card aims at your weakest shields.' },
    S14: { name: 'borrow a corpse to resurrect the soul', face: 'up', aim: 'none', amt: 1, text: 'Revives the last stratagem you disrupted. It returns next turn.' },
    S15: { name: 'lure the tiger down the mountain', face: 'up', aim: 'strong', amt: 1, text: 'Draws a shield away from your strongest domain, then adds 1 pressure there.' },
    S16: { name: 'let the enemy off in order to catch them', face: 'up', aim: 'theater', amt: 3, text: 'A lull. Removes 1 pressure now, then strikes the same domain for 3 next turn.' },
    S17: { name: 'cast a brick to attract jade', face: 'up', aim: 'none', amt: 0, offer: { ap: 1, reveal: true, leverage: 2 }, text: 'A small gift. Accept for 1 action and a look at every card this turn. The opponent banks 2 leverage.' },
    S18: { name: 'capture the ringleader to disband the bandits', face: 'up', aim: 'strong', amt: 1, text: 'Goes for your command. You lose 2 coherence, and your strongest domain takes 1 pressure.' },
    S19: { name: 'remove the firewood from under the pot', face: 'up', aim: 'strong', amt: 0, text: 'Removes every shield in its target.' },
    S20: { name: 'muddy the waters to catch the fish', face: 'down', aim: 'theater', amt: 1, text: 'Face-down. 1 pressure, and next turn you have 1 less action.' },
    S21: { name: 'slough off the cicada\'s golden shell', face: 'up', aim: 'theater', amt: 2, text: '2 pressure. Disrupt it and it sheds its shell and lands 1 pressure elsewhere.' },
    S22: { name: 'shut the door to catch the thief', face: 'up', aim: 'theater', amt: 1, text: '1 pressure. Disrupt anything aimed at this domain this turn and the door shuts for 2 more.' },
    S23: { name: 'befriend a distant state while attacking a neighbor', face: 'up', aim: 'theater', amt: 2, text: '2 pressure here while it eases 1 pressure in a distant domain.' },
    S24: { name: 'borrow the road to conquer Guo', face: 'up', aim: 'theater', amt: 1, text: 'Passes through. 1 pressure here and 1 in every unshielded linked domain.' },
    S25: { name: 'replace the beams with rotten timbers', face: 'down', aim: 'strong', amt: 2, text: 'Face-down. Turns up to 2 of your shields in its target into pressure.' },
    S26: { name: 'point at the mulberry while cursing the locust', face: 'up', aim: 'theater', amt: 2, text: 'Makes an example. 2 pressure here, and every linked domain loses 1 shield.' },
    S27: { name: 'feign madness without losing balance', face: 'down', aim: 'theater', amt: 2, text: 'Face-down and erratic. 1 to 3 pressure in a theater domain.' },
    S28: { name: 'lure the enemy onto the roof and remove the ladder', face: 'up', aim: 'theater', amt: 1, text: '1 pressure, and you cannot disrupt in this domain for 2 turns.' },
    S29: { name: 'deck the tree with false blossoms', face: 'masked', aim: 'theater', amt: 1, text: 'Two fake threats and one real one for 1. Detect tells them apart.' },
    S30: { name: 'make the host and the guest exchange places', face: 'up', aim: 'hot', amt: 1, text: 'Takes over from inside. At 2 or more pressure, your shields there turn to pressure and a slope sets in.' },
    S31: { name: 'the beauty trap, run on money', face: 'up', aim: 'theater', amt: 0, offer: { ap: 3, slope: 2 }, text: 'Money now. Accept for 3 extra actions. The price is a slope of 2 in this domain.' },
    S32: { name: 'the empty fortress', face: 'masked', aim: 'theater', amt: 0, text: 'A fearsome threat of 4 with nothing behind it. Shield against it and the opponent banks 1 leverage.' },
    S33: { name: 'sow discord among the enemy', face: 'up', aim: 'none', amt: 0, text: 'Sets your lanes against each other. You lose 2 coherence.' },
    S34: { name: 'inflict injury on yourself to win trust', face: 'up', aim: 'hot', amt: 0, text: 'Pulls back 2 pressure to look reasonable and banks 2 leverage.' },
    S35: { name: 'chain the stratagems', face: 'up', aim: 'none', amt: 0, text: 'The next stratagem this turn resolves twice.' },
    S36: { name: 'if all else fails, retreat', face: 'up', aim: 'strong', amt: 0, text: 'Withdraws from where you hold, then returns next turn with one more card.' },
  };
  Object.keys(CARDS).forEach((code) => {
    const n = Number(code.slice(1));
    CARDS[code].num = n;
    CARDS[code].group = GROUPS[Math.floor((n - 1) / 6)];
  });
  const CODES = Object.keys(CARDS);

  // Stratagems each dimension favors.
  const DIM_AFFINITY = {
    Time: ['S4', 'S9', 'S16'], Entropy: ['S20', 'S27', 'S29'], Topology: ['S23', 'S24', 'S26'], Asymmetry: ['S1', 'S3', 'S6', 'S25'],
    Agency: ['S3', 'S28', 'S30'], Resonance: ['S7', 'S10', 'S26'], Phase: ['S6', 'S8', 'S35'], Gradient: ['S10', 'S26', 'S30', 'S31'],
    Criticality: ['S5', 'S18', 'S19'], Coherence: ['S18', 'S33', 'S35'],
  };
  // Difficulty by tier. cards: the opponent's base hand, one more from fromTurn on, one more at each listed stage.
  const TUNING = {
    consume: [24, 22, 20, 20, 19, 18],
    cards: [
      { base: 2, fromTurn: 6, at: [2] }, { base: 2, fromTurn: 4, at: [1] }, { base: 2, fromTurn: 3, at: [1] },
      { base: 3, fromTurn: 7, at: [2] }, { base: 3, fromTurn: 6, at: [2] }, { base: 3, fromTurn: 4, at: [2] },
    ],
    asymFrac: 0.34, burstCards: 3, burstAmp: 0, resonanceAt: 2, resAim: 2, critShield: 1, critAim: 2, gateAim: 3, gateStart: 1, spillAt: 2,
  };
  const STAGE_START = { Attract: 0, Accommodate: 1, Control: 2, Extract: 3, Consume: 4, Defense: 1, Mirror: 1, Doctrine: 2 };

  // ---------- seeded randomness (mulberry32 over state.rng) ----------
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function rnd(S) {
    S.rng = (S.rng + 0x6D2B79F5) >>> 0;
    let t = S.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const randInt = (S, n) => Math.floor(rnd(S) * n);
  function pickWeighted(S, items, weightOf) {
    const w = items.map(weightOf);
    const total = w.reduce((a, x) => a + x, 0);
    if (total <= 0) return items.length ? items[randInt(S, items.length)] : null;
    let r = rnd(S) * total;
    for (let i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  }

  // ---------- dates on the time track ----------
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateLabels(when, n) {
    const [ya, ma] = when.start;
    const [yb, mb] = when.end;
    let a = ya * 12 + ((ma || 1) - 1);
    let b = yb * 12 + ((mb || (ma ? ma : 12)) - 1);
    if (!ma && !mb && ya === yb) b = a + 3 * (n - 1); // a single year runs quarter by quarter
    if (b - a < n - 1) b = a + (n - 1);
    const yearly = b - a >= 12 * (n - 1) * 0.75;
    const out = [];
    for (let i = 0; i < n; i++) {
      const m = Math.round(a + ((b - a) * i) / (n - 1));
      const y = Math.floor(m / 12);
      out.push(yearly ? String(y) : `${MON[m % 12]} ${y}`);
    }
    return out;
  }

  // ---------- setup ----------
  function newGame(op, cfg = {}) {
    const tier = Math.max(1, Math.min(6, Number(cfg.tier || op.tier || 3)));
    const dim = op.dimension;
    const world = op.world || null;
    let maxTurns = cfg.maxTurns || (dim === 'Time' ? 10 : 8);
    let consumeAt = TUNING.consume[tier - 1];
    if (world === 'Long Grind') { maxTurns += 1; consumeAt += 2; }
    if (world === 'Unwinding') consumeAt -= 2;
    const theater = op.theater.filter((d) => DOMAINS.includes(d));
    const S = {
      v: VERSION, seed: String(cfg.seed ?? 'tdw'), rng: 0, tier, dim, world, mode: cfg.mode || 'free',
      op: { id: op.id, title: op.title, opponent: op.opponent || 'The Party', dimension: dim, stage: op.stage, world, kind: op.kind, label: op.label, stratagems: op.stratagems.filter((c) => CARDS[c]), theater, spine: op.spine },
      lens: LENSES[cfg.lens] ? cfg.lens : null,
      doctrine: DOCTRINES[cfg.doctrine] ? { code: cfg.doctrine, used: false } : null,
      turn: 1, maxTurns, dates: dateLabels(op.when || { start: [2026, null], end: [2026, null] }, maxTurns),
      ap: 0, coherence: cfg.lens === 'Coherence' ? 3 : 1, leverage: 0, consumeAt, stage: 0,
      board: {}, intents: [], nextId: 1, scheduled: [], tempo: 0, apPenalty: 0, probe: false,
      lever: { named: null, exposed: false, correct: null }, lastDisrupted: null,
      flags: {}, history: [], seen: [], captured: [], log: [], over: null,
      stats: { detects: 0, disrupts: 0, defends: 0, absorbed: 0, offersTaken: 0, capturedDomains: 0 },
    };
    S.rng = hashSeed(`${S.seed}|${op.id}|${tier}`);
    for (const d of DOMAINS) S.board[d] = { p: 0, s: 0, slope: 0, gated: false, lock: 0, critical: false, theater: theater.includes(d) };
    // Criticality: the lever always bears load. The dimension adds the best-linked theater domain.
    S.board[op.spine].critical = true;
    if (dim === 'Criticality') {
      const second = theater.filter((d) => d !== op.spine).sort((x, y) => ADJ[y].length - ADJ[x].length)[0]
        || DOMAINS.filter((d) => d !== op.spine).sort((x, y) => ADJ[y].length - ADJ[x].length)[0];
      S.board[second].critical = true;
      S.board[second].shownCritical = true;
      S.board[op.spine].shownCritical = true;
    }
    // Agency: three gated domains, theater first.
    if (dim === 'Agency') {
      const pool = theater.filter((d) => d !== op.spine).concat(DOMAINS.filter((d) => !theater.includes(d)));
      for (let i = 0; i < 3 && pool.length; i++) { const d = pool.splice(i < 2 ? 0 : randInt(S, pool.length), 1)[0]; S.board[d].gated = true; S.board[d].p += TUNING.gateStart; }
    }
    // The opponent arrives first at higher tiers.
    if (tier >= 2) S.board[op.spine].p = 1;
    if (tier >= 3) theater.forEach((d) => { S.board[d].p = Math.max(S.board[d].p, 1); });
    if (tier >= 5) S.board[op.spine].p = 2;
    S.leverage = tier === 1 ? 0 : Math.min(4, STAGE_START[op.stage] ?? 1);
    S.stage = stageOf(S);
    log(S, `${S.op.opponent} opens the operation. ${STAGE_TEXT[STAGES[S.stage]]}`);
    startTurn(S, []);
    return S;
  }

  // ---------- helpers ----------
  const thresholds = (S) => [0.25, 0.5, 0.75, 1].map((f) => Math.ceil(S.consumeAt * f));
  function stageOf(S) { const t = thresholds(S); let s = 0; while (s < 4 && S.leverage >= t[s]) s++; return s; }
  function log(S, text) { S.log.push({ t: S.turn, text }); if (S.log.length > 80) S.log.splice(0, S.log.length - 80); }
  const cardLabel = (code) => `Stratagem ${CARDS[code].num}, ${CARDS[code].name}`;
  const isBurst = (S, turn) => S.dim === 'Phase' && turn % 3 === 0;
  function mark(list, code) { if (CARDS[code] && !list.includes(code)) list.push(code); }
  const hasLens = (S, l) => S.lens === l;
  function apFor(S) {
    if (S.dim === 'Coherence') return Math.min(7, 2 + S.coherence);
    return 3 + Math.floor(S.coherence / 2);
  }
  function addCoherence(S, n, ev, why) {
    const floor = hasLens(S, 'Coherence') ? 2 : 0;
    const before = S.coherence;
    S.coherence = Math.max(floor, Math.min(5, S.coherence + n));
    if (S.coherence !== before) ev.push({ k: 'coh', n: S.coherence - before, total: S.coherence, why });
  }
  function addLeverage(S, n, ev, why) {
    const before = S.leverage;
    S.leverage = Math.max(0, S.leverage + n);
    if (S.leverage !== before) ev.push({ k: 'leverage', n: S.leverage - before, total: S.leverage, why });
  }

  // ---------- the opponent's turn: plan intents ----------
  // Cards the opponent plays per turn: a base, plus one more at each listed lifecycle stage.
  function cardCount(S) {
    const t = TUNING.cards[S.tier - 1];
    let k = t.base + t.at.filter((st) => S.stage >= st).length + (S.turn >= t.fromTurn ? 1 : 0);
    k += S.tempo; S.tempo = 0;
    if (S.dim === 'Phase') k = isBurst(S, S.turn) ? k + TUNING.burstCards : Math.max(1, k - 1);
    if (S.world === 'Runaway' && S.stage >= 2) k += 1;
    return k;
  }

  function posture(S) {
    const expected = S.consumeAt * (S.turn / S.maxTurns) * 0.8;
    return S.leverage >= expected ? 'ahead' : 'behind';
  }

  function drawCode(S, played) {
    const post = posture(S);
    const sig = S.op.stratagems;
    const aff = DIM_AFFINITY[S.dim] || [];
    const shields = DOMAINS.reduce((a, d) => a + S.board[d].s, 0);
    const offerTaken = played.some((c) => CARDS[c].offer);
    return pickWeighted(S, CODES, (code) => {
      const c = CARDS[code];
      let w = 1;
      if (sig.includes(code)) w *= 6;
      if (aff.includes(code)) w *= 2;
      if (c.offer) w *= S.stage === 0 ? 2 : S.stage === 1 ? 1 : 0.4;
      if (offerTaken && c.offer) w = 0;
      if (c.group === 'Superiority' || c.group === 'Control') w *= post === 'ahead' ? 1.5 : 1;
      if (c.group === 'Desperation') w *= post === 'behind' && S.turn >= 4 ? 2 : 0.4;
      if (S.world === 'Unwinding' && c.group === 'Desperation') w *= 3;
      if (c.group === 'Confusion' && shields >= 5) w *= 1.5;
      if (c.group === 'Attack' || c.group === 'Control') w *= S.stage >= 2 ? 1.3 : 1;
      if (c.aim === 'strong' && shields === 0 && code !== 'S18') w *= 0.2;
      if (code === 'S14' && !S.lastDisrupted) w *= 0.3;
      if (code === 'S9' && !DOMAINS.some((d) => S.board[d].p >= 3)) w *= 0.3;
      if (played.includes(code)) w *= 0.3;
      return w;
    });
  }

  function aimAt(S, aim, exclude = []) {
    const B = S.board;
    const doms = DOMAINS.filter((d) => !exclude.includes(d));
    const th = (d) => (d === S.op.spine ? 4 : B[d].theater ? 3 : 1) * (S.dim === 'Criticality' && B[d].critical ? TUNING.critAim : 1) * (S.dim === 'Agency' && B[d].gated ? TUNING.gateAim : 1) * (S.dim === 'Resonance' ? 1 + B[d].p * TUNING.resAim : 1);
    const pickBy = (score) => {
      const best = Math.max(...doms.map(score));
      const top = doms.filter((d) => score(d) === best);
      return pickWeighted(S, top, th);
    };
    if (S.probe && aim !== 'none' && aim !== 'spine') aim = 'weak';
    switch (aim) {
      case 'spine': return exclude.includes(S.op.spine) ? pickWeighted(S, doms, th) : S.op.spine;
      case 'hot': return pickBy((d) => B[d].p * 10 + (B[d].p < MAX_P ? 1 : 0));
      case 'cold': { const c = doms.filter((d) => B[d].p === 0); return c.length ? pickWeighted(S, c, th) : pickWeighted(S, doms, th); }
      case 'strong': return pickBy((d) => B[d].s * 10 + (B[d].theater ? 1 : 0));
      case 'weak': { const c = doms.filter((d) => B[d].theater && B[d].p < MAX_P); const pool = c.length ? c : doms; const min = Math.min(...pool.map((d) => B[d].s)); return pickWeighted(S, pool.filter((d) => B[d].s === min), (d) => 1 + B[d].p); }
      case 'open': { const c = doms.filter((d) => B[d].s === 0 && B[d].p < MAX_P); return c.length ? pickWeighted(S, c, th) : pickWeighted(S, doms, th); }
      default: return pickWeighted(S, doms.filter((d) => B[d].p < MAX_P).length ? doms.filter((d) => B[d].p < MAX_P) : doms, th);
    }
  }

  function makeIntent(S, code, over = {}) {
    const c = CARDS[code];
    const it = { id: S.nextId++, code, target: null, shown: null, amount: c.amt, shownAmount: c.amt, face: c.face, revealed: false, cancelled: false, fake: false, ...over };
    if (it.face === 'up') it.shown = it.target;
    return it;
  }

  function spawn(S, code, played) {
    const c = CARDS[code];
    const out = [];
    const targetOf = (aim, excl) => (aim === 'none' ? null : aimAt(S, aim, excl));
    if (code === 'S6') {
      const real = targetOf('weak');
      const fakeT = aimAt(S, 'theater', [real]);
      out.push(makeIntent(S, code, { target: real, shown: fakeT, shownAmount: 2 }));
    } else if (code === 'S8') {
      const openT = targetOf('theater');
      out.push(makeIntent(S, code, { target: openT, shown: openT }));
      out.push(makeIntent(S, code, { target: aimAt(S, 'theater', [openT]), face: 'down', amount: 2, companion: true }));
    } else if (code === 'S29') {
      const real = targetOf('theater');
      const f1 = aimAt(S, 'theater', [real]);
      const f2 = aimAt(S, 'any', [real, f1]);
      const trio = [
        makeIntent(S, code, { target: real, shown: real, shownAmount: 2 }),
        makeIntent(S, code, { target: f1, shown: f1, amount: 0, shownAmount: 2, fake: true }),
        makeIntent(S, code, { target: f2, shown: f2, amount: 0, shownAmount: 2, fake: true }),
      ];
      // Shuffle so the real one is not always first.
      const base = Math.min(...trio.map((t) => t.id));
      for (let i = trio.length - 1; i > 0; i--) { const j = randInt(S, i + 1); [trio[i], trio[j]] = [trio[j], trio[i]]; }
      trio.forEach((t, i) => { t.id = base + i; });
      out.push(...trio);
    } else if (code === 'S32') {
      const t = targetOf('theater');
      out.push(makeIntent(S, code, { target: t, shown: t, amount: 0, shownAmount: 4 }));
    } else if (code === 'S27') {
      const t = targetOf('theater');
      out.push(makeIntent(S, code, { target: t, amount: 1 + randInt(S, 3) }));
    } else if (c.offer) {
      out.push(makeIntent(S, code, { target: c.aim === 'none' ? null : targetOf(c.aim), offer: true }));
      out[0].shown = out[0].target;
    } else {
      const t = targetOf(c.aim);
      out.push(makeIntent(S, code, { target: t }));
      if (out[0].face === 'up') out[0].shown = t;
    }
    if (code === 'S5') out[0].amount = out[0].shownAmount = S.board[out[0].target].p >= 3 ? 2 : 1;
    if (S.dim === 'Phase' && isBurst(S, S.turn) && TUNING.burstAmp) out.forEach((it) => { if (it.amount > 0) { it.amount += TUNING.burstAmp; it.shownAmount += TUNING.burstAmp; } });
    return out;
  }

  function planParty(S) {
    const played = [];
    const due = S.scheduled.filter((x) => x.turn === S.turn);
    S.scheduled = S.scheduled.filter((x) => x.turn !== S.turn);
    for (const x of due) {
      const it = makeIntent(S, x.code, { target: x.target, shown: x.target, amount: x.amount, shownAmount: x.amount, face: 'up', scheduled: x.why });
      if (x.why === 'revived' && CARDS[x.code].face !== 'up') { it.face = CARDS[x.code].face; it.shown = CARDS[x.code].face === 'masked' ? it.target : null; }
      S.intents.push(it);
    }
    const k = cardCount(S);
    for (let i = 0; i < k; i++) {
      const code = drawCode(S, played);
      played.push(code);
      S.intents.push(...spawn(S, code, played));
    }
    if (S.world === 'Machine Mandate' && S.turn >= 2) S.intents.push(...spawn(S, 'S1', played));
    S.probe = false;
    if (S.dim === 'Asymmetry') {
      for (const it of S.intents) if (it.face === 'up' && !it.offer && !it.scheduled && rnd(S) < TUNING.asymFrac) { it.face = 'down'; it.shown = null; }
    }
    for (const it of S.intents) { it.attributed = it.face === 'up'; if (it.face === 'down') it.shown = null; }
  }

  function startTurn(S, ev) {
    S.flags = { chain: false, absorbed: false, leverRight: false, disruptedIn: [], shieldedNow: [], freeDetect: hasLens(S, 'Asymmetry') ? 1 : 0, freeDisrupt: hasLens(S, 'Phase') ? 1 : 0, entropyBonus: S.dim === 'Entropy' ? 1 : 0, preauth: false, zeroTrust: null, acts: [] };
    S.intents = [];
    planParty(S);
    S.ap = Math.max(1, apFor(S) - S.apPenalty);
    S.apPenalty = 0;
    ev.push({ k: 'turn', turn: S.turn, date: S.dates[S.turn - 1], burst: isBurst(S, S.turn) });
  }

  // ---------- pressure ----------
  function shieldPower(S, d) {
    const B = S.board[d];
    if (hasLens(S, 'Criticality') && B.critical) return 2;
    if (S.dim === 'Criticality' && B.critical) return TUNING.critShield;
    return 1;
  }

  // Deliver n pressure into d through its shields. src names the cause for the log.
  function press(S, d, n, ev, src, opts = {}) {
    if (n <= 0 || !d) return 0;
    const B = S.board[d];
    if (S.flags.zeroTrust === d) { ev.push({ k: 'blocked', d, n, src }); return 0; }
    if (S.dim === 'Resonance' && opts.card && B.p >= TUNING.resonanceAt) n += 1;
    let absorbed = 0;
    const power = shieldPower(S, d);
    while (n > 0 && B.s > 0) { const take = Math.min(n, power); n -= take; absorbed += take; B.s -= 1; }
    if (absorbed) { S.flags.absorbed = true; S.stats.absorbed += absorbed; }
    const before = B.p;
    const room = MAX_P - B.p;
    const landed = Math.min(n, room);
    B.p += landed;
    ev.push({ k: 'press', d, n: landed, absorbed, src });
    if (before < MAX_P && B.p === MAX_P) captureDomain(S, d, ev);
    // Overflow and Topology spill travel one link, never further.
    if (!opts.spill) {
      const over = n - landed;
      if (over > 0) spill(S, d, ev, 1);
      else if (S.dim === 'Topology' && opts.card && landed >= 1 && B.p >= TUNING.spillAt) spill(S, d, ev, 1);
    }
    return landed;
  }

  function spill(S, d, ev, n) {
    const links = ADJ[d].filter((x) => S.board[x].p < MAX_P);
    if (!links.length) return;
    const top = Math.max(...links.map((x) => S.board[x].p));
    const to = pickWeighted(S, links.filter((x) => S.board[x].p === top), () => 1);
    ev.push({ k: 'spill', from: d, to, n });
    press(S, to, n, ev, 'spill', { spill: true });
  }

  function captureDomain(S, d, ev) {
    S.stats.capturedDomains += 1;
    ev.push({ k: 'capture', d });
    log(S, `${d} falls. ${S.op.opponent} holds it.`);
    if (S.dim === 'Criticality' && S.board[d].critical) {
      const t = thresholds(S);
      const next = t.find((x) => x > S.leverage);
      if (next != null) { addLeverage(S, next - S.leverage, ev, 'cascade'); log(S, `${d} bore the load. The collapse cascades a full stage.`); }
    } else if (d === S.op.spine) {
      addLeverage(S, 3, ev, 'lever captured');
      log(S, `${d} was the lever. The opponent banks 3 leverage.`);
    }
  }

  function addSlope(S, d, n, ev) {
    if (!d || n <= 0) return;
    const B = S.board[d];
    const before = B.slope;
    B.slope = Math.min(MAX_SLOPE, B.slope + n);
    if (B.slope > before) ev.push({ k: 'slope', d, n: B.slope - before, total: B.slope });
  }

  // A card's hit. Gradient turns half of it into a slope.
  function hit(S, d, n, ev, code) {
    if (n <= 0) return 0;
    if (S.dim === 'Gradient' && n >= 2) {
      const sl = Math.floor(n / 2);
      addSlope(S, d, sl, ev);
      n -= sl;
    }
    return press(S, d, n, ev, code, { card: true });
  }

  function drain(S, d, n, ev, code) {
    const B = S.board[d];
    const k = Math.min(B.s, n);
    if (k > 0) { B.s -= k; ev.push({ k: 'drain', d, n: k, src: code }); }
    return k;
  }

  // ---------- resolve one card ----------
  function resolveIntent(S, it, ev) {
    const code = it.code;
    const B = S.board;
    const T = it.target;
    const opp = S.op.opponent;
    if (it.fake) { ev.push({ k: 'fizzle', id: it.id, code }); return; }
    ev.push({ k: 'resolve', id: it.id, code, target: T });
    switch (code) {
      case 'S2': drain(S, T, 1, ev, code); hit(S, T, 1, ev, code); break;
      case 'S4': S.tempo += 1; break;
      case 'S9': { const n = Math.min(3, DOMAINS.filter((d) => B[d].p >= 3).length); addLeverage(S, n, ev, code); break; }
      case 'S11': {
        const src = DOMAINS.filter((d) => d !== S.op.spine && B[d].p > 0).sort((a, b) => B[a].p - B[b].p)[0];
        if (src) { const k = Math.min(2, B[src].p); B[src].p -= k; ev.push({ k: 'ease', d: src, n: k }); hit(S, S.op.spine, k, ev, code); } else hit(S, S.op.spine, 1, ev, code);
        break;
      }
      case 'S12': hit(S, T, 1, ev, code); addLeverage(S, 1, ev, code); break;
      case 'S13': hit(S, T, 1, ev, code); S.probe = true; break;
      case 'S14':
        if (S.lastDisrupted && S.lastDisrupted !== 'S14') S.scheduled.push({ turn: S.turn + 1, code: S.lastDisrupted, target: aimAt(S, CARDS[S.lastDisrupted].aim === 'none' ? 'theater' : CARDS[S.lastDisrupted].aim), amount: Math.max(1, CARDS[S.lastDisrupted].amt), why: 'revived' });
        else hit(S, aimAt(S, 'theater'), 1, ev, code);
        break;
      case 'S15': {
        if (B[T].s > 0) {
          const to = DOMAINS.filter((d) => d !== T && B[d].s < MAX_S).sort((a, b) => B[a].p - B[b].p)[0];
          B[T].s -= 1; if (to) B[to].s += 1;
          ev.push({ k: 'lure', from: T, to });
        }
        hit(S, T, 1, ev, code); break;
      }
      case 'S16':
        if (it.scheduled) { hit(S, T, it.amount, ev, code); break; }
        if (B[T].p > 0) { B[T].p -= 1; ev.push({ k: 'ease', d: T, n: 1 }); }
        S.scheduled.push({ turn: S.turn + 1, code, target: T, amount: 3, why: 'the catch' });
        break;
      case 'S18': if (!hasLens(S, 'Entropy')) addCoherence(S, -2, ev, code); hit(S, T, 1, ev, code); break;
      case 'S19': drain(S, T, MAX_S, ev, code); break;
      case 'S20': hit(S, T, it.amount, ev, code); if (!hasLens(S, 'Entropy')) S.apPenalty += 1; break;
      case 'S22': hit(S, T, it.amount, ev, code); break;
      case 'S23': {
        hit(S, T, it.amount, ev, code);
        const far = DOMAINS.filter((d) => d !== T && !ADJ[T].includes(d) && B[d].p > 0);
        if (far.length) { const d = far[randInt(S, far.length)]; B[d].p -= 1; ev.push({ k: 'ease', d, n: 1 }); }
        break;
      }
      case 'S24': hit(S, T, 1, ev, code); ADJ[T].filter((d) => B[d].s === 0).forEach((d) => press(S, d, 1, ev, code, { spill: true })); break;
      case 'S25': { const k = drain(S, T, 2, ev, code); if (k) press(S, T, k, ev, code, { card: true }); break; }
      case 'S26': hit(S, T, it.amount, ev, code); ADJ[T].forEach((d) => drain(S, d, 1, ev, code)); break;
      case 'S28': hit(S, T, it.amount, ev, code); B[T].lock = Math.max(B[T].lock, 2); ev.push({ k: 'lock', d: T, turns: 2 }); break;
      case 'S30':
        if (B[T].p >= 2) { const k = B[T].s; B[T].s = 0; if (k) { ev.push({ k: 'drain', d: T, n: k, src: code }); press(S, T, k, ev, code, { card: true }); } addSlope(S, T, 1, ev); }
        else hit(S, T, 1, ev, code);
        break;
      case 'S32':
        if (S.flags.shieldedNow.includes(T)) { addLeverage(S, 1, ev, code); log(S, `The threat on ${T} was the empty fortress. Your shields answered a bluff.`); }
        break;
      case 'S33': if (!hasLens(S, 'Entropy')) addCoherence(S, -2, ev, code); break;
      case 'S34': { const k = Math.min(2, B[T].p); B[T].p -= k; if (k) ev.push({ k: 'ease', d: T, n: k }); addLeverage(S, 2, ev, code); break; }
      case 'S35': S.chainNext = (S.chainNext || 0) + 1; break;
      case 'S36': { const k = Math.min(2, B[T].p); B[T].p -= k; if (k) ev.push({ k: 'ease', d: T, n: k }); S.tempo += 1; break; }
      default: hit(S, T, it.amount, ev, code); // S1 S3 S5 S6 S7 S8 S21 S27 S29 and revived cards
    }
    mark(S.seen, code);
    const where = T ? ` on ${T}` : '';
    const feint = code === 'S6' && it.shown && it.shown !== T && !it.revealed ? ` The threat on ${it.shown} was a feint.` : '';
    log(S, `${opp} runs ${cardLabel(code)}${where}.${feint}`);
  }

  // ---------- the player's actions ----------
  // Only the twelve domain names reach the board. Anything else, such as "__proto__", is refused.
  function domainOf(S, d) {
    if (typeof d !== 'string' || !DOMAINS.includes(d)) throw new Error('No such domain.');
    return S.board[d];
  }
  function findIntent(S, id) { return S.intents.find((x) => x.id === Number(id) && !x.cancelled && !x.done); }
  const blocked = (S, d) => !hasLens(S, 'Agency') && S.board[d].gated;
  const locked = (S, d) => !hasLens(S, 'Agency') && S.board[d].lock > 0;

  function disruptCost(S, it, d) {
    let c = 2;
    if (S.flags.preauth) c = 1;
    else if (S.flags.freeDisrupt > 0) c = 1;
    if (it && CARDS[it.code].proxy && !it.fake) c += 1;
    const aimed = it ? it.target : d;
    if (S.lever.exposed && aimed === S.op.spine) c -= 1;
    return Math.max(1, c);
  }

  function reveal(S, it, ev) {
    if (it.revealed) return;
    it.revealed = true;
    it.attributed = true;
    it.shown = it.target;
    it.shownAmount = it.amount;
    if (!it.fake) mark(S.seen, it.code);
    ev.push({ k: 'reveal', id: it.id, code: it.code, target: it.target, amount: it.amount, fake: !!it.fake });
  }

  // Everything the player may do right now, with its cost. The client and the bots both read this.
  function options(S) {
    if (S.over) return { intents: {}, domains: {}, name: false, doctrine: false, end: false };
    const docOk = !!(S.doctrine && !S.doctrine.used && !(S.doctrine.code === 'business' && S.lever.exposed));
    const o = { intents: {}, domains: {}, name: !S.lever.named && !S.lever.exposed, doctrine: docOk, end: true };
    const detectCost = S.flags.freeDetect > 0 ? 0 : 1;
    for (const it of S.intents) {
      if (it.cancelled || it.done) continue;
      const x = {};
      if (it.offer) { x.accept = true; }
      else {
        if (!it.revealed && it.face !== 'up' && S.ap >= detectCost) x.detect = detectCost;
        const known = it.face === 'up' || it.revealed;
        const t = it.target;
        if (known && t && !blocked(S, t) && !locked(S, t)) { const c = disruptCost(S, it); if (S.ap >= c) x.disrupt = c; }
        else if (known && !t) { const c = disruptCost(S, it); if (S.ap >= c) x.disrupt = c; }
      }
      o.intents[it.id] = x;
    }
    for (const d of DOMAINS) {
      const B = S.board[d];
      const x = {};
      if (B.gated && !hasLens(S, 'Agency')) { if (S.ap >= 1) x.open = 1; }
      else {
        if (B.s < MAX_S && S.ap >= 1) x.defend = 1;
        if ((B.p > 0 || B.slope > 0) && !locked(S, d)) { const c = disruptCost(S, null, d); if (S.ap >= c) x.disrupt = c; }
      }
      o.domains[d] = x;
    }
    return o;
  }

  function act(S, action) {
    if (S.over) throw new Error('The operation is over.');
    const ev = [];
    const a = action || {};
    const spend = (n) => { if (S.ap < n) throw new Error('Not enough actions.'); S.ap -= n; };
    switch (a.type) {
      case 'detect': {
        const it = findIntent(S, a.intent);
        if (!it || it.offer) throw new Error('No such card.');
        if (it.revealed || it.face === 'up') throw new Error('That card is already known.');
        const cost = S.flags.freeDetect > 0 ? 0 : 1;
        spend(cost);
        if (cost === 0) S.flags.freeDetect -= 1;
        reveal(S, it, ev);
        if (it.companion) { /* the Chencang march is exposed */ }
        if (S.flags.entropyBonus > 0) {
          S.flags.entropyBonus -= 1;
          const more = S.intents.filter((x) => !x.revealed && x.face !== 'up' && !x.cancelled && !x.offer);
          if (more.length) reveal(S, more[randInt(S, more.length)], ev);
        }
        if (hasLens(S, 'Resonance') && !it.fake) {
          S.intents.filter((x) => !x.revealed && !x.cancelled && !x.offer && !x.fake && CARDS[x.code].group === CARDS[it.code].group).forEach((x) => reveal(S, x, ev));
        }
        S.stats.detects += 1; S.flags.acts.push('detect');
        log(S, it.fake ? `Detect exposes a false blossom on ${it.target}. Nothing stands behind it.` : `Detect names ${cardLabel(it.code)}${it.target ? `, aimed at ${it.target}` : ''}.`);
        break;
      }
      case 'disrupt': {
        if (a.intent != null) {
          const it = findIntent(S, a.intent);
          if (!it || it.offer) throw new Error('No such card.');
          if (!(it.face === 'up' || it.revealed)) throw new Error('You cannot disrupt a card you have not attributed. Detect it first.');
          if (it.target && (blocked(S, it.target) || locked(S, it.target))) throw new Error(`You hold no authority in ${it.target} right now.`);
          const cost = disruptCost(S, it);
          spend(cost);
          if (!S.flags.preauth && S.flags.freeDisrupt > 0) S.flags.freeDisrupt -= 1;
          if (it.target) S.flags.disruptedIn.push(it.target);
          S.stats.disrupts += 1; S.flags.acts.push('disrupt');
          if (it.revealed && !it.fake) S.flags.chain = true;
          if (it.code === 'S21' && !it.fake && !it.escaped) {
            const to = aimAt(S, 'any', [it.target]);
            it.escaped = true; it.target = to; it.shown = to; it.amount = 1; it.shownAmount = 1;
            ev.push({ k: 'escape', id: it.id, code: it.code, to });
            log(S, `${cardLabel('S21')} sheds its shell and slips toward ${to}.`);
          } else {
            it.cancelled = true;
            ev.push({ k: 'cancel', id: it.id, code: it.code, fake: !!it.fake });
            if (!it.fake) { mark(S.seen, it.code); mark(S.captured, it.code); S.lastDisrupted = it.code; }
            log(S, it.fake ? `You struck a false blossom. It held nothing.` : `Disrupt answers ${cardLabel(it.code)}. The card is captured.`);
          }
        } else {
          const d = a.domain;
          const B = domainOf(S, d);
          if (blocked(S, d) || locked(S, d)) throw new Error(`You hold no authority in ${d} right now.`);
          if (B.p <= 0 && B.slope <= 0) throw new Error('Nothing to disrupt there.');
          const cost = disruptCost(S, null, d);
          spend(cost);
          if (!S.flags.preauth && S.flags.freeDisrupt > 0) S.flags.freeDisrupt -= 1;
          S.flags.disruptedIn.push(d);
          S.stats.disrupts += 1; S.flags.acts.push('disrupt');
          const hadSlope = B.slope;
          const hadP = B.p;
          if (hasLens(S, 'Gradient')) { B.slope = 0; B.p = Math.max(0, B.p - 2); }
          else if (S.dim === 'Gradient' && B.slope > 0) B.slope = 0;
          else { const ks = Math.min(2, B.slope); B.slope -= ks; B.p = Math.max(0, B.p - (2 - ks)); }
          ev.push({ k: 'clear', d, slope: hadSlope - B.slope, p: hadP - B.p });
          log(S, `Disrupt clears ${d}.`);
        }
        break;
      }
      case 'defend': {
        const d = a.domain;
        const B = domainOf(S, d);
        if (blocked(S, d)) throw new Error(`${d} is gated. Open the gate first.`);
        if (B.s >= MAX_S) throw new Error(`${d} already holds ${MAX_S} shields.`);
        spend(1);
        let n = 1;
        if (hasLens(S, 'Time') && S.turn <= 3) n = 2;
        if (S.dim === 'Phase' && isBurst(S, S.turn + 1)) n = 2;
        const before = B.s;
        B.s = Math.min(MAX_S, B.s + n);
        S.flags.shieldedNow.push(d);
        ev.push({ k: 'shield', d, n: B.s - before, total: B.s });
        const mesh = (S.dim === 'Topology' && ADJ[d].length >= 4) || hasLens(S, 'Topology');
        if (mesh) {
          const nb = ADJ[d].filter((x) => S.board[x].s < MAX_S && !blocked(S, x)).sort((x, y) => S.board[y].p - S.board[x].p)[0];
          if (nb) { S.board[nb].s += 1; ev.push({ k: 'shield', d: nb, n: 1, total: S.board[nb].s, mesh: true }); }
        }
        S.stats.defends += 1; S.flags.acts.push('defend');
        break;
      }
      case 'open': {
        const d = a.domain;
        const B = domainOf(S, d);
        if (!B.gated) throw new Error('That gate is open.');
        spend(1);
        B.gated = false;
        ev.push({ k: 'open', d });
        S.flags.acts.push('open');
        log(S, `You open the gate on ${d}. The authority to act there is yours.`);
        break;
      }
      case 'accept': {
        const it = findIntent(S, a.intent);
        if (!it || !it.offer) throw new Error('No such offer.');
        const o = CARDS[it.code].offer;
        it.done = true;
        S.ap += o.ap || 0;
        if (o.slope) addSlope(S, it.target, o.slope, ev);
        if (o.leverage) addLeverage(S, o.leverage, ev, it.code);
        if (o.reveal) S.intents.forEach((x) => { if (!x.cancelled && !x.offer) reveal(S, x, ev); });
        mark(S.seen, it.code);
        S.stats.offersTaken += 1;
        ev.push({ k: 'offer', id: it.id, code: it.code, accepted: true });
        log(S, `You accept ${cardLabel(it.code)}. The invitation is open.`);
        break;
      }
      case 'name': {
        if (S.lever.named || S.lever.exposed) throw new Error('You already named the lever.');
        const d = a.domain;
        domainOf(S, d);
        S.lever.named = d;
        const right = d === S.op.spine;
        S.lever.correct = right;
        if (right) {
          S.lever.exposed = true;
          addLeverage(S, -2, ev, 'lever named');
          S.flags.leverRight = true;
          log(S, `You name ${d} as the lever. You are right. Every Disrupt aimed there costs 1 less.`);
        } else {
          addCoherence(S, -1, ev, 'wrong lever');
          addLeverage(S, 2, ev, 'wrong lever');
          log(S, `You name ${d} as the lever. You are wrong, and the opponent reads your hand.`);
        }
        ev.push({ k: 'name', d, correct: right });
        break;
      }
      case 'doctrine': {
        if (!S.doctrine || S.doctrine.used) throw new Error('No doctrine card to play.');
        const code = S.doctrine.code;
        if (code === 'business' && S.lever.exposed) throw new Error('The lever is already exposed.');
        if (code === 'technology' && !(typeof a.domain === 'string' && DOMAINS.includes(a.domain))) throw new Error('Pick a domain for the gate.');
        S.doctrine.used = true;
        if (code === 'data') S.intents.forEach((x) => { if (!x.cancelled && !x.offer) reveal(S, x, ev); });
        if (code === 'principles') S.flags.preauth = true;
        if (code === 'technology') S.flags.zeroTrust = a.domain;
        if (code === 'application') S.ap += 2;
        if (code === 'business') { S.lever.exposed = true; S.lever.named = S.op.spine; S.lever.correct = true; S.flags.leverRight = true; addLeverage(S, -2, ev, 'lever mapped'); }
        if (code === 'governance') addLeverage(S, -3, ev, code);
        ev.push({ k: 'doctrine', code, d: a.domain || null });
        log(S, `Doctrine: ${DOCTRINES[code].name}. ${DOCTRINES[code].text}`);
        break;
      }
      case 'end': return endTurn(S);
      default: throw new Error('Unknown action.');
    }
    return ev;
  }

  // ---------- end of turn ----------
  function endTurn(S) {
    const ev = [];
    const unspent = S.ap;
    // Locks wear off before new cards land, so a lock set this turn binds the next two turns.
    for (const d of DOMAINS) if (S.board[d].lock > 0) S.board[d].lock -= 1;
    S.history.push({ turn: S.turn, acts: S.flags.acts.slice(), unspent });
    S.chainNext = 0;
    const groups = [];
    for (const it of S.intents) {
      if (it.cancelled || it.done) continue;
      if (it.offer) { ev.push({ k: 'offer', id: it.id, code: it.code, accepted: false }); continue; }
      const times = S.chainNext > 0 ? 2 : 1;
      if (times === 2) S.chainNext -= 1;
      for (let i = 0; i < times; i++) resolveIntent(S, it, ev);
      if (!it.fake) groups.push(CARDS[it.code].group);
      it.done = true;
      if (S.over) break;
    }
    if (S.chainNext > 0) { addLeverage(S, 1, ev, 'S35'); S.chainNext = 0; }
    // Shut the door: a disrupt in a trapped domain springs it.
    for (const it of S.intents) {
      if (it.code === 'S22' && !it.fake && S.flags.disruptedIn.includes(it.target)) { press(S, it.target, 2, ev, 'trap'); log(S, `The door shuts on ${it.target} for 2 more.`); }
    }
    // Slopes pay out every turn.
    for (const d of DOMAINS) if (S.board[d].slope > 0) press(S, d, S.board[d].slope, ev, 'slope');
    // Noise.
    if (S.dim === 'Entropy' || S.world === 'Unwinding' || S.world === 'Runaway') {
      const open = DOMAINS.filter((d) => S.board[d].s === 0 && S.board[d].p < MAX_P);
      if (open.length) press(S, open[randInt(S, open.length)], 1, ev, 'noise');
    }
    // Coherence of the opponent's hand.
    if (S.dim === 'Coherence' && groups.length >= 2 && groups.every((g) => g === groups[0])) addLeverage(S, 1, ev, 'one aim');
    // Leverage from held ground.
    let gain = 0;
    for (const d of DOMAINS) {
      const p = S.board[d].p;
      if (p >= MAX_P) gain += 2; else if (p >= 3) gain += 1;
      if (p >= 3 && S.dim === 'Time' && S.turn >= 6) gain += 1;
      if (d === S.op.spine && p >= 3 && !S.lever.exposed) gain += 1;
    }
    addLeverage(S, gain, ev, 'held ground');
    // Stage.
    const prev = S.stage;
    S.stage = stageOf(S);
    if (S.stage !== prev) { ev.push({ k: 'stage', stage: S.stage, name: STAGES[S.stage] }); if (S.stage > prev) log(S, `The operation reaches ${STAGES[S.stage]}. ${STAGE_TEXT[STAGES[S.stage]]}`); }
    if (S.stage >= 4) { finish(S, 'loss', 'consumed', ev); return ev; }
    // Coherence.
    const good = S.flags.chain || S.flags.absorbed || S.flags.leverRight;
    const bad = unspent >= 2 || ev.some((e) => e.k === 'capture');
    if (good && !bad) addCoherence(S, 1, ev, 'coherent turn');
    else if (bad && !good) addCoherence(S, -1, ev, unspent >= 2 ? 'idle actions' : 'domain lost');
    // Decisive win: the lever named, then emptied.
    const spine = S.board[S.op.spine];
    if (S.lever.exposed && S.turn >= 4 && spine.p === 0 && spine.slope === 0 && S.stage <= 1 && !DOMAINS.some((d) => S.board[d].p >= MAX_P)) {
      log(S, `The lever on ${S.op.spine} is cut. The operation collapses.`);
      finish(S, 'win', 'lever', ev); return ev;
    }
    if (S.turn >= S.maxTurns) { log(S, 'The clock runs out. You held the line.'); finish(S, 'win', 'held', ev); return ev; }
    S.turn += 1;
    startTurn(S, ev);
    return ev;
  }

  function finish(S, outcome, reason, ev) {
    const win = outcome === 'win';
    const frac = S.leverage / S.consumeAt;
    const decisive = reason === 'lever';
    const stars = !win ? 0 : decisive || frac < 0.4 ? 3 : frac < 0.75 ? 2 : 1;
    const turns = S.turn;
    const score = win
      ? 1000 + 100 * (S.maxTurns - turns) + 25 * Math.max(0, S.consumeAt - S.leverage) + 30 * S.coherence + 50 * S.captured.length + (decisive ? 200 : 0) + (S.lever.correct ? 100 : 0) + 100 * (S.tier - 1)
      : 60 * turns + 10 * S.captured.length;
    S.over = { outcome, reason, stars, score, turns, leverage: S.leverage, consumeAt: S.consumeAt, stage: STAGES[Math.min(S.stage, 4)], captured: S.captured.slice(), seen: S.seen.slice(), spine: S.op.spine, leverCorrect: S.lever.correct };
    ev.push({ k: 'over', ...S.over });
  }

  // ---------- what the player may see ----------
  function view(S) {
    const opt = options(S);
    const intents = S.intents.filter((it) => !it.done || it.cancelled).map((it) => {
      const known = it.face === 'up' || it.revealed;
      const base = { id: it.id, face: it.revealed ? 'up' : it.face, cancelled: it.cancelled, offer: !!it.offer, options: opt.intents[it.id] || {} };
      if (it.face === 'down' && !it.revealed) return base;
      const out = { ...base, target: it.revealed ? it.target : it.shown, amount: it.revealed ? it.amount : it.shownAmount, scheduled: it.scheduled || null, escaped: !!it.escaped };
      if (known) { const c = CARDS[it.code]; Object.assign(out, { code: it.code, num: c.num, name: c.name, group: c.group, text: c.text, proxy: !!c.proxy, fake: it.revealed ? !!it.fake : undefined, offerTerms: c.offer || null }); }
      return out;
    });
    const board = DOMAINS.map((d) => {
      const B = S.board[d];
      return { d, short: SHORT[d], p: B.p, s: B.s, slope: B.slope, gated: B.gated, lock: B.lock, theater: B.theater, critical: !!B.shownCritical || (S.lever.exposed && d === S.op.spine), lever: S.lever.exposed && d === S.op.spine, links: ADJ[d], options: opt.domains[d] || {} };
    });
    return {
      v: S.v, mode: S.mode,
      op: { id: S.op.id, title: S.op.title, opponent: S.op.opponent, dimension: S.dim, world: S.world, stage: S.op.stage, label: S.op.label, kind: S.op.kind, theater: S.op.theater, signature: S.op.stratagems },
      rule: DIMENSIONS[S.dim], lens: S.lens ? { code: S.lens, ...LENSES[S.lens] } : null,
      doctrine: S.doctrine ? { ...S.doctrine, ...DOCTRINES[S.doctrine.code] } : null,
      tier: S.tier, turn: S.turn, maxTurns: S.maxTurns, dates: S.dates, bursts: S.dim === 'Phase' ? [3, 6, 9].filter((t) => t <= S.maxTurns) : [],
      ap: S.ap, coherence: S.coherence, leverage: S.leverage, consumeAt: S.consumeAt, thresholds: thresholds(S), stage: S.stage, stageName: STAGES[Math.min(S.stage, 4)],
      board, intents, lever: { named: S.lever.named, exposed: S.lever.exposed, correct: S.lever.correct },
      can: { name: opt.name, doctrine: opt.doctrine, end: opt.end }, apPenaltyNext: S.apPenalty,
      log: S.log.slice(-30), history: S.history, over: S.over, spine: S.over ? S.op.spine : undefined,
    };
  }

  // Spoiler-free result grid for sharing.
  function shareGrid(S) {
    const sq = { detect: '🟦', disrupt: '🟥', defend: '🟩', open: '🟨' };
    return S.history.map((h) => (h.acts.map((a) => sq[a] || '🟨').join('') + '⬜'.repeat(Math.min(3, h.unspent))).slice(0, 16) || '⬜').join('\n');
  }

  function cardList() { return CODES.map((c) => ({ code: c, ...CARDS[c] })); }

  // Test hook: put one stratagem on the table as the opponent would.
  function forceCard(S, code) {
    const made = spawn(S, code, []);
    for (const it of made) { it.attributed = it.face === 'up'; if (it.face === 'down') it.shown = null; }
    S.intents.push(...made);
    return made;
  }

  return { VERSION, TUNING, DOMAINS, SHORT, LINKS, ADJ, STAGES, STAGE_TEXT, GROUPS, DIMENSIONS, LENSES, DOCTRINES, CARDS, CODES, hashSeed, dateLabels, newGame, act, view, options, shareGrid, cardList, forceCard };
});
