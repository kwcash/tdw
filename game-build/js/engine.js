/* TDW Operations engine, version 2.
 * A deterministic turn-based board game over the twelve domains. Pure data in and out, seeded randomness,
 * plain ES6, runs in Node and the browser.
 *
 * Version 2 generalizes the single host and single opponent to any number of factions.
 *   state.factions   the faction ids, in turn order
 *   state.ledger     one ledger entry per faction: legitimacy, leverage, stage and its profile
 *   state.domainState[domain] = { pressure: {faction: n}, shields: {faction: n}, slopes: {faction: n}, from: {...} }
 *   state.cadres     leaders attached to domains, whose modifiers change AP costs and physics
 *   state.pacts      truces between factions, such as a United Front
 * A standard two-faction operation (no `factions` on the op) plays exactly as version 1 did. The same seed, the
 * same actions and the same events come out. state.board stays as a read/write view of the player's slice, and
 * a version 1 state saved in a browser upgrades in place the first time the engine touches it. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TDWEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 2;

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

  // ======================================================================
  // Version 2 tables
  // ======================================================================
  // Legitimacy is an opt-in rule layer. An operation turns it on with rules.legitimacy, or the content's
  // ruleset does. Off, the ledger still carries a number but nothing reads it, so version 1 operations play unchanged.
  const LEGIT = {
    start: 60, max: 100, spikeBelow: 25, severeBelow: 10,
    // Legitimacy a faction loses when one of these stratagems resolves: the proxy, high-entropy and dishonorable cards.
    cost: { S3: 6, S5: 4, S7: 4, S12: 3, S20: 5, S21: 5, S27: 3, S31: 7 },
    // Defensive and restraint moves give some back.
    restore: { S4: 2, S34: 2, S36: 2 },
    // What the player pays to accept a bargain the opponent offers.
    acceptCost: { S10: 2, S17: 1, S31: 4 },
    exposed: 0.5,       // share of a card's cost lost when the player disrupts it, or declines an offer, before it lands
    cleanTurn: 1,       // an actor that played no costed card this turn
    captured: 4,        // a faction loses this when an aggressor takes one of its domains
    coherentTurn: 2,    // the player's coherent turn
    leverRight: 2, leverWrong: 3,
    cohToLegit: 3,      // one point of coherence lost to an AI faction costs this much legitimacy
  };
  // Cards an actor may aim at another AI faction. The rest act on the player's own resources, such as coherence and offers.
  const AI_TARGETABLE = new Set(['S1', 'S2', 'S3', 'S5', 'S6', 'S7', 'S8', 'S11', 'S12', 'S13', 'S15', 'S16', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24', 'S25', 'S26', 'S27', 'S28', 'S29', 'S30']);
  const ID_RE = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
  const FORBIDDEN_ID = new Set(['constructor', 'prototype', 'hasOwnProperty', 'toString', 'valueOf', 'toJSON']);

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // ======================================================================
  // State shape: building it, migrating it, and the player's view of it
  // ======================================================================
  function blankDomain(factions, theater) {
    const D = { pressure: {}, shields: {}, slopes: {}, from: {}, slopeBy: {}, gated: false, lock: 0, critical: false, theater };
    for (const f of factions) { D.pressure[f] = 0; D.shields[f] = 0; D.slopes[f] = 0; D.from[f] = {}; }
    return D;
  }

  // state.board[d] reads and writes the player's slice of state.domainState[d], so code and tests written
  // against version 1 keep working. It is not enumerable, so it never reaches a saved state.
  const BOARD_PROPS = ['gated', 'lock', 'critical', 'shownCritical', 'theater'];
  const FACADE = new WeakMap();
  function makeBoard(S) {
    const board = {};
    for (const d of DOMAINS) {
      const D = S.domainState[d];
      const acc = {
        p: { get: () => D.pressure[S.player], set: (x) => { D.pressure[S.player] = x; }, enumerable: true },
        s: { get: () => D.shields[S.player], set: (x) => { D.shields[S.player] = x; }, enumerable: true },
        slope: { get: () => D.slopes[S.player], set: (x) => { D.slopes[S.player] = x; }, enumerable: true },
      };
      for (const k of BOARD_PROPS) acc[k] = { get: () => D[k], set: (x) => { D[k] = x; }, enumerable: true };
      board[d] = Object.defineProperties({}, acc);
    }
    return board;
  }

  function mergeLegit(base, over) {
    const out = { ...base, cost: { ...base.cost }, restore: { ...base.restore }, acceptCost: { ...base.acceptCost } };
    for (const [k, v] of Object.entries(over || {})) {
      if (['cost', 'restore', 'acceptCost'].includes(k)) out[k] = { ...out[k], ...(v || {}) };
      else if (typeof v === 'number') out[k] = v;
    }
    return out;
  }

  // Upgrade a version 1 state in place. Its single board becomes the player's slice and its opponent becomes the one AI faction.
  function migrate(S) {
    const old = S.board;
    const actor = 'opponent';
    S.v = VERSION;
    S.player = 'player';
    S.factions = ['player', actor];
    S.ledger = {
      player: { id: 'player', name: 'You', short: 'YOU', control: 'player', active: true, legitimacy: LEGIT.start, leverage: 0, stage: 0, tempo: 0, probe: false, chain: 0, focus: [], power: {}, affinity: {}, hostility: {}, traits: {}, signature: null, spine: null, handShare: null, start: {}, blurb: '' },
      [actor]: { id: actor, name: (S.op && S.op.opponent) || 'The Party', short: 'OPP', control: 'ai', active: true, legitimacy: LEGIT.start, leverage: S.leverage || 0, stage: S.stage || 0, tempo: S.tempo || 0, probe: !!S.probe, chain: S.chainNext || 0, focus: [], power: {}, affinity: {}, hostility: {}, traits: {}, signature: null, spine: null, handShare: null, start: {}, blurb: '' },
    };
    S.domainState = {};
    for (const d of DOMAINS) {
      const b = (old && old[d]) || { p: 0, s: 0, slope: 0, gated: false, lock: 0, critical: false, theater: false };
      const D = blankDomain(S.factions, !!b.theater);
      D.pressure.player = b.p || 0; D.shields.player = b.s || 0; D.slopes.player = b.slope || 0;
      if (b.p) D.from.player[actor] = b.p;
      if (b.slope) D.slopeBy.player = actor;
      D.gated = !!b.gated; D.lock = b.lock || 0; D.critical = !!b.critical;
      if (b.shownCritical) D.shownCritical = true;
      S.domainState[d] = D;
    }
    S.cadres = []; S.pacts = []; S.script = [];
    S.rules = { legitimacy: false, legit: mergeLegit(LEGIT, {}), handScale: 1 };
    for (const it of S.intents || []) { if (!it.by) it.by = actor; if (!it.victim) it.victim = 'player'; }
    for (const x of S.scheduled || []) { if (!x.by) x.by = actor; if (!x.victim) x.victim = 'player'; }
    S.primary = actor;
    delete S.tempo; delete S.probe; delete S.chainNext;
    // Replace the enumerable v1 board with the façade below.
    delete S.board;
  }

  function attach(S) {
    if (!S || typeof S !== 'object') throw new Error('No game state.');
    if (!S.domainState) migrate(S);
    if (!FACADE.has(S) || FACADE.get(S) !== S.board) {
      const b = makeBoard(S);
      Object.defineProperty(S, 'board', { value: b, enumerable: false, writable: true, configurable: true });
      FACADE.set(S, b);
    }
    return S;
  }

  // ======================================================================
  // Small accessors
  // ======================================================================
  const actorsOf = (S) => S.factions.filter((f) => S.ledger[f].control === 'ai' && S.ledger[f].active !== false);
  const nameOf = (S, id) => (id && S.ledger[id] ? S.ledger[id].name : 'The opponent');
  function joinNames(names) { return names.length <= 1 ? (names[0] || '') : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`; }
  const hasLens = (S, l) => S.lens === l;
  const thresholds = (S) => [0.25, 0.5, 0.75, 1].map((f) => Math.ceil(S.consumeAt * f));
  const stageFor = (S, lev) => { const t = thresholds(S); let s = 0; while (s < 4 && lev >= t[s]) s++; return s; };
  function log(S, text) { S.log.push({ t: S.turn, text }); if (S.log.length > 80) S.log.splice(0, S.log.length - 80); }
  const cardLabel = (code) => `Stratagem ${CARDS[code].num}, ${CARDS[code].name}`;
  const isBurst = (S, turn) => S.dim === 'Phase' && turn % 3 === 0;
  function mark(list, code) { if (CARDS[code] && !list.includes(code)) list.push(code); }

  function leaderOf(S) {
    let best = null;
    for (const f of S.factions) {
      const L = S.ledger[f];
      if (L.control !== 'ai') continue;
      if (best === null || L.leverage > S.ledger[best].leverage) best = f;
    }
    return best || S.factions.find((f) => f !== S.player);
  }
  function syncLeverage(S) {
    let m = 0;
    for (const f of S.factions) if (S.ledger[f].control === 'ai' && S.ledger[f].leverage > m) m = S.ledger[f].leverage;
    S.leverage = m;
  }
  function syncStage(S) {
    let m = 0;
    for (const f of S.factions) if (S.ledger[f].control === 'ai' && S.ledger[f].stage > m) m = S.ledger[f].stage;
    S.stage = m;
  }

  // ---- pressure attribution. from[victim][aggressor] says whose cards put the pressure there. ----
  // Pressure written without an aggressor (noise, a test setting the board) is simply unattributed, so the
  // sum of from[victim] never exceeds pressure[victim]. normFrom trims any excess, largest source first.
  function normFrom(S, v, d) {
    const D = S.domainState[d];
    const f = { ...(D.from[v] || {}) };
    let total = 0;
    for (const k of Object.keys(f)) total += f[k];
    let excess = total - D.pressure[v];
    while (excess > 0) {
      let top = null;
      for (const k of Object.keys(f)) if (f[k] > 0 && (top === null || f[k] > f[top])) top = k;
      if (top === null) break;
      const cut = Math.min(excess, f[top]);
      f[top] -= cut; excess -= cut;
    }
    for (const k of Object.keys(f)) if (f[k] <= 0) delete f[k];
    return f;
  }
  function syncFrom(S, v, d) { S.domainState[d].from[v] = normFrom(S, v, d); }
  function attribute(S, v, d, n, by) {
    if (!by || n <= 0) return;
    const D = S.domainState[d];
    D.from[v] = normFrom(S, v, d);
    D.from[v][by] = (D.from[v][by] || 0) + n;
    D.from[v] = normFrom(S, v, d);
  }
  function topAggressor(S, v, d) {
    const f = normFrom(S, v, d);
    let best = null; let bv = 0;
    for (const a of S.factions) { const n = f[a] || 0; if (n > bv && S.ledger[a].control === 'ai') { bv = n; best = a; } }
    return best || leaderOf(S);
  }
  // Take n pressure off a domain. The attribution trims on its own.
  function ease(S, v, d, n, ev) {
    const D = S.domainState[d];
    const k = Math.min(n, D.pressure[v]);
    if (k <= 0) return 0;
    D.pressure[v] -= k;
    syncFrom(S, v, d);
    if (ev) ev.push({ k: 'ease', d, n: k, f: v });
    return k;
  }

  // ======================================================================
  // Cadres: leaders attached to domains
  // ======================================================================
  const liveCadres = (S) => S.cadres.filter((c) => c.active !== false && !(c.lock > 0));
  const cadresAt = (S, d) => liveCadres(S).filter((c) => c.domain === d);

  // ======================================================================
  // Physics. Every rule that turns state into a number lives here as a pure function:
  // no random draws and no writes. calcPhysics gathers them into one snapshot.
  // ======================================================================
  function shieldPowerOf(S, v, d) {
    const D = S.domainState[d];
    let p = 1;
    if (v === S.player) {
      if (hasLens(S, 'Criticality') && D.critical) p = 2;
      else if (S.dim === 'Criticality' && D.critical) p = TUNING.critShield;
    }
    for (const c of cadresAt(S, d)) if (c.faction === v && c.mods && c.mods.shield) p += c.mods.shield;
    return p;
  }

  function apFor(S) {
    let ap = S.dim === 'Coherence' ? Math.min(7, 2 + S.coherence) : 3 + Math.floor(S.coherence / 2);
    for (const c of liveCadres(S)) {
      const m = c.mods && c.mods.ap;
      if (m && c.faction === S.player && S.domainState[c.domain].pressure[S.player] >= (m.when || 0)) ap += m.delta;
    }
    return ap;
  }

  function disruptCost(S, it, d) {
    let c = 2;
    if (S.flags.preauth) c = 1;
    else if (S.flags.freeDisrupt > 0) c = 1;
    if (it && CARDS[it.code].proxy && !it.fake) c += 1;
    const aimed = it ? it.target : d;
    if (S.lever.exposed && aimed === S.op.spine) c -= 1;
    for (const k of cadresAt(S, aimed)) {
      const m = k.mods && k.mods.disrupt;
      if (!m) continue;
      if (!(k.faction === S.player || (it && it.by === k.faction))) continue;
      if (m.groups && !(it && m.groups.includes(CARDS[it.code].group))) continue;
      if (m.codes && !(it && m.codes.includes(it.code))) continue;
      c += m.delta;
    }
    return Math.max(1, c);
  }

  // Extra pressure a card delivers: the faction's strength in that domain, plus any leader placed there.
  function powerOf(S, a, code, d) {
    if (!d) return 0;
    let n = (S.ledger[a].power && S.ledger[a].power[d]) || 0;
    for (const c of cadresAt(S, d)) {
      const m = c.mods && c.mods.cardPower;
      if (m && c.faction === a && (!m.codes || m.codes.includes(code))) n += m.delta;
    }
    return n;
  }
  function slopeCapFor(S, v, d) {
    let cap = MAX_SLOPE;
    for (const c of cadresAt(S, d)) if (c.faction === v && c.mods && c.mods.slopeCap != null) cap = Math.min(cap, c.mods.slopeCap);
    return cap;
  }
  const slopeBonusFor = (S, v, d) => ((S.ledger[v].traits.slopeProne || []).includes(d) ? 1 : 0);

  // Leverage each actor will bank at the end of this turn from ground it holds against the player.
  // Holdings (Revision 33). A holding costs its holder every turn and denies the rival part of its gain.
  // It is consuming where its cost is more than its denial. Giving one up can raise what the others cost (couples),
  // and keeping one can raise what the others cost while it stands (strains).
  const holdingsOf = (S) => S.holdings || [];
  const liveHoldings = (S) => holdingsOf(S).filter((h) => h.active);
  const holdingCost = (S, h) => Math.min(3, h.cost + (h.raised || 0) + liveHoldings(S).filter((o) => o !== h && o.strains.includes(h.id)).length);
  const isConsuming = (S, h) => holdingCost(S, h) > h.denial;
  const denialOf = (S, a) => liveHoldings(S).reduce((x, h) => x + (!h.denies || h.denies === a ? h.denial : 0), 0);
  function leverageFlow(S) {
    const gain = {};
    for (const a of actorsOf(S)) gain[a] = 0;
    for (const d of DOMAINS) {
      const p = S.domainState[d].pressure[S.player];
      let g = 0;
      if (p >= MAX_P) g += 2; else if (p >= 3) g += 1;
      if (p >= 3 && S.dim === 'Time' && S.turn >= 6) g += 1;
      if (d === S.op.spine && p >= 3 && !S.lever.exposed) g += 1;
      if (g) { const a = topAggressor(S, S.player, d); gain[a] = (gain[a] || 0) + g; }
    }
    for (const a of Object.keys(gain)) if (gain[a]) gain[a] = Math.max(0, gain[a] - denialOf(S, a));
    return gain;
  }
  function cadreLegitFlow(S) {
    const out = {};
    for (const f of S.factions) out[f] = 0;
    for (const c of liveCadres(S)) if (c.mods && c.mods.legitimacy) out[c.faction] += c.mods.legitimacy;
    return out;
  }
  const due = (S, e) => !e.every || S.turn % e.every === 0;
  // What legitimacy will move by at the end of this turn from standing effects: leaders, and any pact in force.
  function legitimacyFlow(S) {
    const out = cadreLegitFlow(S);
    for (const p of S.pacts) if (p.active) for (const e of p.perTurn || []) if (e.type === 'legitimacy' && due(S, e)) out[e.faction] = (out[e.faction] || 0) + e.n;
    return out;
  }
  function entropyState(S, f) {
    if (!S.rules.legitimacy) return 'stable';
    const l = S.ledger[f].legitimacy;
    return l < S.rules.legit.severeBelow ? 'severe' : l < S.rules.legit.spikeBelow ? 'spike' : 'stable';
  }
  const truceBetween = (S, a, b) => S.pacts.some((p) => p.active && p.truce && p.members.includes(a) && p.members.includes(b));

  function calcPhysics(S) {
    attach(S);
    const shieldPower = {}; const heat = {}; const domainDisrupt = {};
    for (const d of DOMAINS) {
      shieldPower[d] = {}; heat[d] = {};
      for (const f of S.factions) { shieldPower[d][f] = shieldPowerOf(S, f, d); heat[d][f] = S.domainState[d].pressure[f]; }
      domainDisrupt[d] = disruptCost(S, null, d);
    }
    const intentDisrupt = {};
    for (const it of S.intents) if (!it.cancelled && !it.done && !it.offer && (it.victim || S.player) === S.player) intentDisrupt[it.id] = disruptCost(S, it);
    const truces = [];
    for (const p of S.pacts) if (p.active && p.truce) truces.push({ id: p.id, members: p.members.slice(), against: p.against || null });
    const entropy = {};
    for (const f of S.factions) entropy[f] = entropyState(S, f);
    const modifiers = [];
    if (S.lens) modifiers.push({ source: 'lens', name: S.lens });
    modifiers.push({ source: 'dimension', name: S.dim });
    if (S.world) modifiers.push({ source: 'world', name: S.world });
    for (const c of liveCadres(S)) modifiers.push({ source: 'cadre', id: c.id, faction: c.faction, domain: c.domain, mods: c.mods || {} });
    return {
      turn: S.turn, dimension: S.dim, world: S.world,
      limits: { pressure: MAX_P, shields: MAX_S, slope: MAX_SLOPE },
      shieldPower, heat, domainDisrupt, intentDisrupt, ap: apFor(S),
      leverageFlow: leverageFlow(S), legitimacyFlow: legitimacyFlow(S), entropy, truces, modifiers,
    };
  }

  // ======================================================================
  // Setup
  // ======================================================================
  function checkId(id) {
    if (typeof id !== 'string' || !ID_RE.test(id) || FORBIDDEN_ID.has(id)) throw new Error(`Bad id "${id}".`);
    return id;
  }

  function buildFactions(op, cfg) {
    const reg = cfg.registry || {};
    const raw = Array.isArray(op.factions) && op.factions.length ? op.factions : null;
    let defs;
    if (!raw) {
      defs = [{ id: 'player', name: 'You', short: 'YOU', control: 'player' }, { id: 'opponent', name: op.opponent || 'The Party', short: 'OPP', control: 'ai' }];
    } else {
      defs = raw.map((s) => {
        const base = typeof s === 'string' ? { id: s } : s;
        return { ...((reg.factions && reg.factions[checkId(base.id)]) || {}), ...base };
      });
    }
    if (defs.length < 2) throw new Error('An operation needs at least two factions.');
    const ids = defs.map((f) => checkId(f.id));
    if (new Set(ids).size !== ids.length) throw new Error('Faction ids must be unique.');
    const playerId = op.player || (defs.find((f) => f.control === 'player') || defs[0]).id;
    if (!ids.includes(playerId)) throw new Error(`The player faction "${playerId}" is not in this operation.`);

    const ruleset = reg.ruleset || {};
    const opRules = op.rules || {};
    const rules = {
      legitimacy: !!(opRules.legitimacy !== undefined ? opRules.legitimacy : ruleset.legitimacy),
      legit: mergeLegit(mergeLegit(LEGIT, ruleset.legit), opRules.legit),
      handScale: Number(opRules.handScale != null ? opRules.handScale : (ruleset.handScale != null ? ruleset.handScale : 1)) || 1,
    };
    const ledger = {};
    for (const f of defs) {
      ledger[f.id] = {
        id: f.id, name: f.name || f.id, short: f.short || f.id.slice(0, 3).toUpperCase(), blurb: f.blurb || '',
        control: f.id === playerId ? 'player' : 'ai', active: true,
        legitimacy: clamp(f.legitimacy != null ? f.legitimacy : rules.legit.start, 0, rules.legit.max),
        leverage: 0, stage: 0, tempo: 0, probe: false, chain: 0,
        focus: (f.focus || []).filter((d) => DOMAINS.includes(d)), power: { ...(f.power || {}) }, affinity: { ...(f.affinity || {}) },
        hostility: { ...(f.hostility || {}) }, traits: clone(f.traits || {}), signature: f.signature ? f.signature.filter((c) => CARDS[c]) : null,
        spine: DOMAINS.includes(f.spine) ? f.spine : null, handShare: typeof f.handShare === 'number' ? f.handShare : null, start: clone(f.start || {}),
      };
    }
    const cadres = [];
    for (const raw1 of op.cadres || []) {
      const base = typeof raw1 === 'string' ? { id: raw1 } : raw1;
      const def = { ...((reg.cadres && reg.cadres[checkId(base.id)]) || {}), ...base };
      if (!ledger[def.faction] || !DOMAINS.includes(def.domain)) continue;
      cadres.push({ id: def.id, name: def.name || def.id, role: def.role || 'Leader', faction: def.faction, domain: def.domain, mods: clone(def.mods || {}), fixed: !!def.fixed, blurb: def.blurb || '', active: true, lock: 0, moved: false });
    }
    const pacts = [];
    for (const raw1 of op.pacts || []) {
      const base = typeof raw1 === 'string' ? { id: raw1 } : raw1;
      const def = { ...((reg.pacts && reg.pacts[checkId(base.id)]) || {}), ...base };
      const members = (def.members || []).filter((m) => ledger[m]);
      if (members.length < 2) continue;
      pacts.push({ id: def.id, name: def.name || def.id, members, against: ledger[def.against] ? def.against : null, truce: def.truce !== false, active: !!def.active, broken: false, formWhen: def.formWhen || null, breakWhen: def.breakWhen || null, onForm: clone(def.onForm || []), onBreak: clone(def.onBreak || []), perTurn: clone(def.perTurn || []), formText: def.formText || '', breakText: def.breakText || '' });
    }
    return { ids, ledger, player: playerId, primary: ids.find((i) => i !== playerId), rules, cadres, pacts, script: clone(op.script || []) };
  }

  function newGame(op, cfg = {}) {
    const tier = Math.max(1, Math.min(6, Number(cfg.tier || op.tier || 3)));
    const dim = op.dimension;
    const world = op.world || null;
    let maxTurns = cfg.maxTurns || (dim === 'Time' ? 10 : 8);
    let consumeAt = TUNING.consume[tier - 1];
    if (world === 'Long Grind') { maxTurns += 1; consumeAt += 2; }
    if (world === 'Unwinding') consumeAt -= 2;
    if (op.consumeAdj) consumeAt += Number(op.consumeAdj) || 0;
    const theater = op.theater.filter((d) => DOMAINS.includes(d));
    const F = buildFactions(op, cfg);
    const S = {
      v: VERSION, seed: String(cfg.seed ?? 'tdw'), rng: 0, tier, dim, world, mode: cfg.mode || 'free',
      op: { id: op.id, title: op.title, opponent: op.opponent || 'The Party', dimension: dim, stage: op.stage, world, kind: op.kind, label: op.label, stratagems: op.stratagems.filter((c) => CARDS[c]), theater, spine: op.spine },
      lens: LENSES[cfg.lens] ? cfg.lens : null,
      doctrine: DOCTRINES[cfg.doctrine] ? { code: cfg.doctrine, used: false } : null,
      turn: 1, maxTurns, dates: dateLabels(op.when || { start: [2026, null], end: [2026, null] }, maxTurns),
      ap: 0, coherence: cfg.lens === 'Coherence' ? 3 : 1, leverage: 0, consumeAt, stage: 0,
      player: F.player, primary: F.primary, factions: F.ids, ledger: F.ledger, domainState: {}, cadres: F.cadres, pacts: F.pacts, script: F.script, rules: F.rules,
      intents: [], nextId: 1, scheduled: [], apPenalty: 0,
      lever: { named: null, exposed: false, correct: null }, lastDisrupted: null,
      flags: {}, history: [], seen: [], captured: [], log: [], over: null,
      stats: { detects: 0, disrupts: 0, defends: 0, absorbed: 0, offersTaken: 0, capturedDomains: 0 },
    };
    S.rng = hashSeed(`${S.seed}|${op.id}|${tier}`);
    // Holdings, when the operation has them. An operation without them carries no extra state.
    if (Array.isArray(op.holdings) && op.holdings.length) {
      S.holdings = op.holdings.map((h) => ({ id: h.id, name: h.name || h.id, domain: h.domain, cost: clamp(Math.round(h.cost || 0), 0, 3), denial: clamp(Math.round(h.denial || 0), 0, 3), couples: (h.couples || []).slice(), strains: (h.strains || []).slice(), raised: 0, denies: h.denies || null, text: h.text || '', yieldText: h.yieldText || '', onYield: clone(h.onYield || []), active: true }));
    }
    for (const d of DOMAINS) S.domainState[d] = blankDomain(S.factions, theater.includes(d));
    attach(S);
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
    // Each faction's own opening position.
    for (const f of S.factions) {
      const st = S.ledger[f].start || {};
      for (const [d, n] of Object.entries(st.shields || {})) if (DOMAINS.includes(d)) S.domainState[d].shields[f] = clamp(Math.round(n), 0, MAX_S);
      for (const [d, n] of Object.entries(st.pressure || {})) if (DOMAINS.includes(d)) S.domainState[d].pressure[f] = Math.max(S.domainState[d].pressure[f], clamp(Math.round(n), 0, MAX_P));
    }
    const base = tier === 1 ? 0 : Math.min(4, STAGE_START[op.stage] ?? 1);
    for (const a of actorsOf(S)) S.ledger[a].leverage = a === S.primary ? base : Math.floor(base / 2);
    syncLeverage(S);
    for (const a of actorsOf(S)) S.ledger[a].stage = stageFor(S, S.ledger[a].leverage);
    syncStage(S);
    const acts = actorsOf(S);
    log(S, acts.length === 1
      ? `${nameOf(S, acts[0])} opens the operation. ${STAGE_TEXT[STAGES[S.stage]]}`
      : `${joinNames(acts.map((a) => nameOf(S, a)))} open the operation. ${STAGE_TEXT[STAGES[S.stage]]}`);
    startTurn(S, []);
    return S;
  }

  // ======================================================================
  // Effects: the small vocabulary scripts, pacts and traits share
  // ======================================================================
  function addCoherence(S, n, ev, why) {
    const floor = hasLens(S, 'Coherence') ? 2 : 0;
    const before = S.coherence;
    S.coherence = Math.max(floor, Math.min(5, S.coherence + n));
    if (S.coherence !== before) ev.push({ k: 'coh', n: S.coherence - before, total: S.coherence, why });
  }
  function addLeverage(S, n, ev, why, who) {
    const a = who && S.ledger[who] && S.ledger[who].control === 'ai' ? who : leaderOf(S);
    const L = S.ledger[a];
    const before = L.leverage;
    L.leverage = Math.max(0, L.leverage + n);
    syncLeverage(S);
    if (L.leverage !== before) ev.push({ k: 'leverage', n: L.leverage - before, total: L.leverage, why, by: a });
  }
  function addLegitimacy(S, f, n, ev, why) {
    if (!S.rules.legitimacy || !n) return 0;
    const L = S.ledger[f];
    if (!L) return 0;
    const before = L.legitimacy;
    L.legitimacy = clamp(L.legitimacy + n, 0, S.rules.legit.max);
    if (L.legitimacy !== before) ev.push({ k: 'legit', f, n: L.legitimacy - before, total: L.legitimacy, why });
    return L.legitimacy - before;
  }
  function hurtCohesion(S, v, n, ev, why) {
    if (v === S.player) {
      if (hasLens(S, 'Entropy')) return;
      addCoherence(S, -(n + (S.ledger[v].traits.coherenceHit || 0)), ev, why);
    } else addLegitimacy(S, v, -n * S.rules.legit.cohToLegit, ev, why);
  }

  function applyEffect(S, e, ev) {
    if (!e || typeof e !== 'object') return;
    const f = e.faction;
    switch (e.type) {
      case 'legitimacy': { const got = addLegitimacy(S, f, e.n, ev, e.why || 'event'); if (e.self && got) ev.push({ k: 'self', f, type: e.self, why: e.selfWhy || e.why || 'event', n: got }); break; }
      case 'shield': if (S.ledger[f] && DOMAINS.includes(e.domain)) { const D = S.domainState[e.domain]; const before = D.shields[f]; D.shields[f] = clamp(before + e.n, 0, MAX_S); if (D.shields[f] !== before) ev.push({ k: 'shield', d: e.domain, n: D.shields[f] - before, total: D.shields[f], f, event: true }); } break;
      case 'dropShields': if (S.ledger[f] && DOMAINS.includes(e.domain)) { const D = S.domainState[e.domain]; const k = D.shields[f]; D.shields[f] = 0; if (k) ev.push({ k: 'drain', d: e.domain, n: k, src: e.why || 'event', f }); } break;
      case 'pressure': if (S.ledger[f] && DOMAINS.includes(e.domain)) press(S, f, e.domain, e.n, ev, e.why || 'event', { spill: true, by: S.ledger[e.by] ? e.by : null }); break;
      case 'slope': if (S.ledger[f] && DOMAINS.includes(e.domain)) addSlope(S, f, e.domain, e.n, ev, S.ledger[e.by] ? e.by : null); break;
      case 'coherence': addCoherence(S, e.n, ev, e.why || 'event'); break;
      case 'leverage': addLeverage(S, e.n, ev, e.why || 'event', f); break;
      case 'tempo': if (S.ledger[f]) S.ledger[f].tempo += e.n; break;
      case 'pact': { const p = S.pacts.find((x) => x.id === e.id); if (p) setPact(S, p, e.set === 'active', ev, 'event'); break; }
      case 'cadre': {
        const c = S.cadres.find((x) => x.id === e.id);
        if (!c) break;
        if (e.set === 'lock') c.lock = Math.max(c.lock, e.turns || 1);
        else if (e.set === 'remove') c.active = false;
        else if (e.set === 'restore') { c.active = true; c.lock = 0; }
        else if (e.set === 'move' && DOMAINS.includes(e.domain)) c.domain = e.domain;
        ev.push({ k: 'cadre', id: c.id, name: c.name, set: e.set });
        break;
      }
      case 'log': if (e.text) log(S, e.text); break;
      default: break;
    }
  }

  function condMet(S, c) {
    if (!c || typeof c !== 'object' || !Object.keys(c).length) return false;
    if (c.all) return c.all.every((x) => condMet(S, x));
    if (c.any) return c.any.some((x) => condMet(S, x));
    if (c.turn != null && S.turn < c.turn) return false;
    if (c.turnBefore != null && S.turn >= c.turnBefore) return false;
    for (const key of ['leverage', 'stage', 'legitimacy']) {
      const t = c[key];
      if (!t) continue;
      const L = S.ledger[t.faction];
      if (!L) return false;
      if (t.gte != null && L[key] < t.gte) return false;
      if (t.lt != null && L[key] >= t.lt) return false;
    }
    return true;
  }

  function setPact(S, p, on, ev, why) {
    if (!!p.active === on) return;
    p.active = on;
    if (!on) p.broken = true;
    ev.push({ k: 'pact', id: p.id, name: p.name, active: on, why: why || null });
    log(S, on ? (p.formText || `${p.name} takes effect.`) : (p.breakText || `${p.name} breaks.`));
    for (const e of (on ? p.onForm : p.onBreak) || []) applyEffect(S, e, ev);
  }

  // Scripted turns and pact changes, run before the actors plan so the new state shapes their targets.
  function runTimeline(S, ev) {
    for (const e of S.script) {
      if (e.turn !== S.turn) continue;
      ev.push({ k: 'script', turn: S.turn, text: e.text || '' });
      if (e.text) log(S, e.text);
      for (const x of e.effects || []) applyEffect(S, x, ev);
    }
    for (const p of S.pacts) {
      if (!p.active && !p.broken && p.formWhen && condMet(S, p.formWhen)) setPact(S, p, true, ev, 'conditions met');
      else if (p.active && p.breakWhen && condMet(S, p.breakWhen)) setPact(S, p, false, ev, 'conditions met');
    }
  }

  // ======================================================================
  // The actors' turn: choose a victim, draw a card, aim it
  // ======================================================================
  function posture(S, a) {
    const expected = S.consumeAt * (S.turn / S.maxTurns) * 0.8;
    return S.ledger[a].leverage >= expected ? 'ahead' : 'behind';
  }

  function handShareOf(S, a) {
    const L = S.ledger[a];
    const scale = S.rules.handScale || 1;
    if (L.handShare != null) return L.handShare * scale;
    const n = actorsOf(S).length;
    return (n > 1 ? Math.max(0.4, 1.35 / n) : 1) * scale;
  }
  // Cards an actor plays per turn: a base, plus one more at each listed lifecycle stage.
  function cardCount(S, a) {
    const L = S.ledger[a];
    const t = TUNING.cards[S.tier - 1];
    let k = t.base + t.at.filter((st) => L.stage >= st).length + (S.turn >= t.fromTurn ? 1 : 0);
    k += L.tempo; L.tempo = 0;
    if (S.dim === 'Phase') k = isBurst(S, S.turn) ? k + TUNING.burstCards : Math.max(1, k - 1);
    if (S.world === 'Runaway' && L.stage >= 2) k += 1;
    const share = handShareOf(S, a);
    if (share !== 1) {
      // A scaled hand is a fraction of a card more often than not. Round it by chance, so that difficulty moves
      // smoothly with the scale instead of jumping a whole card at a time. The draw uses the seeded generator.
      const x = k * share; const f = Math.floor(x);
      k = Math.max(1, f + (rnd(S) < x - f ? 1 : 0));
    }
    return k;
  }

  const shieldsOf = (S, v) => DOMAINS.reduce((x, d) => x + S.domainState[d].shields[v], 0);
  function spineOf(S, v) {
    if (v === S.player) return S.op.spine;
    const L = S.ledger[v];
    if (L.spine) return L.spine;
    let best = null; let bs = -1;
    for (const d of DOMAINS) if (S.domainState[d].shields[v] > bs) { bs = S.domainState[d].shields[v]; best = d; }
    return best;
  }
  const isTheater = (S, v, d) => (v === S.player ? !!S.domainState[d].theater : S.ledger[v].focus.includes(d));

  function victimsOf(S, a) { return S.factions.filter((f) => f !== a && S.ledger[f].active !== false && !truceBetween(S, a, f)); }
  function hostilityOf(S, a, f) { const h = S.ledger[a].hostility[f]; return h != null ? h : (f === S.player ? 3 : 1); }
  function pickVictim(S, a) {
    const c = victimsOf(S, a);
    if (c.length === 0) return null;
    if (c.length === 1) return c[0];
    return pickWeighted(S, c, (f) => hostilityOf(S, a, f));
  }

  function drawCode(S, a, v, played) {
    const L = S.ledger[a];
    const post = posture(S, a);
    const sig = L.signature || S.op.stratagems;
    const aff = DIM_AFFINITY[S.dim] || [];
    const shields = shieldsOf(S, v);
    const toPlayer = v === S.player;
    const offerTaken = played.some((c) => CARDS[c].offer);
    return pickWeighted(S, CODES, (code) => {
      const c = CARDS[code];
      if (!toPlayer && !AI_TARGETABLE.has(code)) return 0;
      let w = 1;
      if (sig.includes(code)) w *= 6;
      if (aff.includes(code)) w *= 2;
      if (L.affinity[code]) w *= L.affinity[code];
      if (c.offer) w *= L.stage === 0 ? 2 : L.stage === 1 ? 1 : 0.4;
      if (offerTaken && c.offer) w = 0;
      if (c.group === 'Superiority' || c.group === 'Control') w *= post === 'ahead' ? 1.5 : 1;
      if (c.group === 'Desperation') w *= post === 'behind' && S.turn >= 4 ? 2 : 0.4;
      if (S.world === 'Unwinding' && c.group === 'Desperation') w *= 3;
      if (c.group === 'Confusion' && shields >= 5) w *= 1.5;
      if (c.group === 'Attack' || c.group === 'Control') w *= L.stage >= 2 ? 1.3 : 1;
      if (c.aim === 'strong' && shields === 0 && code !== 'S18') w *= 0.2;
      if (code === 'S14' && !S.lastDisrupted) w *= 0.3;
      if (code === 'S9' && !DOMAINS.some((d) => S.domainState[d].pressure[v] >= 3)) w *= 0.3;
      if (played.includes(code)) w *= 0.3;
      return w;
    });
  }

  function aimAt(S, a, v, aim, exclude = []) {
    const B = S.domainState;
    const P = (d) => B[d].pressure[v];
    const Sh = (d) => B[d].shields[v];
    const doms = DOMAINS.filter((d) => !exclude.includes(d));
    const spine = spineOf(S, v);
    const toPlayer = v === S.player;
    const th = (d) => (d === spine ? 4 : isTheater(S, v, d) ? 3 : 1)
      * (toPlayer && S.dim === 'Criticality' && B[d].critical ? TUNING.critAim : 1)
      * (toPlayer && S.dim === 'Agency' && B[d].gated ? TUNING.gateAim : 1)
      * (S.dim === 'Resonance' ? 1 + P(d) * TUNING.resAim : 1);
    const pickBy = (score) => {
      const best = Math.max(...doms.map(score));
      const top = doms.filter((d) => score(d) === best);
      return pickWeighted(S, top, th);
    };
    if (S.ledger[a].probe && aim !== 'none' && aim !== 'spine') aim = 'weak';
    switch (aim) {
      case 'spine': return exclude.includes(spine) ? pickWeighted(S, doms, th) : spine;
      case 'hot': return pickBy((d) => P(d) * 10 + (P(d) < MAX_P ? 1 : 0));
      case 'cold': { const c = doms.filter((d) => P(d) === 0); return c.length ? pickWeighted(S, c, th) : pickWeighted(S, doms, th); }
      case 'strong': return pickBy((d) => Sh(d) * 10 + (isTheater(S, v, d) ? 1 : 0));
      case 'weak': { const c = doms.filter((d) => isTheater(S, v, d) && P(d) < MAX_P); const pool = c.length ? c : doms; const min = Math.min(...pool.map((d) => Sh(d))); return pickWeighted(S, pool.filter((d) => Sh(d) === min), (d) => 1 + P(d)); }
      case 'open': { const c = doms.filter((d) => Sh(d) === 0 && P(d) < MAX_P); return c.length ? pickWeighted(S, c, th) : pickWeighted(S, doms, th); }
      default: return pickWeighted(S, doms.filter((d) => P(d) < MAX_P).length ? doms.filter((d) => P(d) < MAX_P) : doms, th);
    }
  }

  function makeIntent(S, code, a, v, over = {}) {
    const c = CARDS[code];
    const it = { id: S.nextId++, code, target: null, shown: null, amount: c.amt, shownAmount: c.amt, face: c.face, revealed: false, cancelled: false, fake: false, by: a, victim: v, ...over };
    if (it.face === 'up') it.shown = it.target;
    return it;
  }

  function spawn(S, code, played, a, v) {
    const c = CARDS[code];
    const out = [];
    const targetOf = (aim, excl) => (aim === 'none' ? null : aimAt(S, a, v, aim, excl));
    const mk = (over) => makeIntent(S, code, a, v, over);
    if (code === 'S6') {
      const real = targetOf('weak');
      const fakeT = aimAt(S, a, v, 'theater', [real]);
      out.push(mk({ target: real, shown: fakeT, shownAmount: 2 }));
    } else if (code === 'S8') {
      const openT = targetOf('theater');
      out.push(mk({ target: openT, shown: openT }));
      out.push(mk({ target: aimAt(S, a, v, 'theater', [openT]), face: 'down', amount: 2, companion: true }));
    } else if (code === 'S29') {
      const real = targetOf('theater');
      const f1 = aimAt(S, a, v, 'theater', [real]);
      const f2 = aimAt(S, a, v, 'any', [real, f1]);
      const trio = [
        mk({ target: real, shown: real, shownAmount: 2 }),
        mk({ target: f1, shown: f1, amount: 0, shownAmount: 2, fake: true }),
        mk({ target: f2, shown: f2, amount: 0, shownAmount: 2, fake: true }),
      ];
      // Shuffle so the real one is not always first.
      const base = Math.min(...trio.map((t) => t.id));
      for (let i = trio.length - 1; i > 0; i--) { const j = randInt(S, i + 1); [trio[i], trio[j]] = [trio[j], trio[i]]; }
      trio.forEach((t, i) => { t.id = base + i; });
      out.push(...trio);
    } else if (code === 'S32') {
      const t = targetOf('theater');
      out.push(mk({ target: t, shown: t, amount: 0, shownAmount: 4 }));
    } else if (code === 'S27') {
      const t = targetOf('theater');
      out.push(mk({ target: t, amount: 1 + randInt(S, 3) }));
    } else if (c.offer) {
      out.push(mk({ target: c.aim === 'none' ? null : targetOf(c.aim), offer: true }));
      out[0].shown = out[0].target;
    } else {
      const t = targetOf(c.aim);
      out.push(mk({ target: t }));
      if (out[0].face === 'up') out[0].shown = t;
    }
    if (code === 'S5') out[0].amount = out[0].shownAmount = S.domainState[out[0].target].pressure[v] >= 3 ? 2 : 1;
    if (S.dim === 'Phase' && isBurst(S, S.turn) && TUNING.burstAmp) out.forEach((it) => { if (it.amount > 0) { it.amount += TUNING.burstAmp; it.shownAmount += TUNING.burstAmp; } });
    // Strength in the target domain, and any leader placed there, add to a real hit.
    for (const it of out) { const b = powerOf(S, a, code, it.target); if (b && it.amount > 0) { it.amount += b; it.shownAmount += b; } }
    // A card aimed at another faction is public. The player watches it and cannot answer it.
    if (v !== S.player) for (const it of out) { it.face = 'up'; it.shown = it.target; it.shownAmount = it.amount; it.public = true; }
    return out;
  }

  function planActors(S) {
    const dueAll = S.scheduled.filter((x) => x.turn === S.turn);
    S.scheduled = S.scheduled.filter((x) => x.turn !== S.turn);
    for (const a of actorsOf(S)) {
      const L = S.ledger[a];
      const played = [];
      for (const x of dueAll.filter((y) => (y.by || S.primary) === a)) {
        const it = makeIntent(S, x.code, a, x.victim || S.player, { target: x.target, shown: x.target, amount: x.amount, shownAmount: x.amount, face: 'up', scheduled: x.why });
        if (x.why === 'revived' && CARDS[x.code].face !== 'up') { it.face = CARDS[x.code].face; it.shown = CARDS[x.code].face === 'masked' ? it.target : null; }
        S.intents.push(it);
      }
      const k = cardCount(S, a);
      for (let i = 0; i < k; i++) {
        const v = pickVictim(S, a);
        if (!v) break;
        const code = drawCode(S, a, v, played);
        played.push(code);
        S.intents.push(...spawn(S, code, played, a, v));
      }
      if (S.world === 'Machine Mandate' && S.turn >= 2 && a === S.primary) S.intents.push(...spawn(S, 'S1', played, a, S.player));
      L.probe = false;
    }
    if (S.dim === 'Asymmetry') {
      for (const it of S.intents) if (it.victim === S.player && it.face === 'up' && !it.offer && !it.scheduled && rnd(S) < TUNING.asymFrac) { it.face = 'down'; it.shown = null; }
    }
    for (const it of S.intents) { it.attributed = it.face === 'up'; if (it.face === 'down') it.shown = null; }
  }

  function startTurn(S, ev) {
    S.flags = { chain: false, absorbed: false, leverRight: false, disruptedIn: [], shieldedNow: [], freeDetect: hasLens(S, 'Asymmetry') ? 1 : 0, freeDisrupt: hasLens(S, 'Phase') ? 1 : 0, entropyBonus: S.dim === 'Entropy' ? 1 : 0, preauth: false, zeroTrust: null, acts: [], costly: {} };
    S.intents = [];
    runTimeline(S, ev);
    planActors(S);
    S.ap = Math.max(1, apFor(S) - S.apPenalty);
    S.apPenalty = 0;
    ev.push({ k: 'turn', turn: S.turn, date: S.dates[S.turn - 1], burst: isBurst(S, S.turn) });
  }

  // ======================================================================
  // Pressure
  // ======================================================================
  // Deliver n pressure to faction v in domain d, through that faction's shields. src names the cause for the log.
  function press(S, v, d, n, ev, src, opts = {}) {
    if (n <= 0 || !d) return 0;
    const D = S.domainState[d];
    const isP = v === S.player;
    if (isP && S.flags.zeroTrust === d) { ev.push({ k: 'blocked', d, n, src }); return 0; }
    if (S.dim === 'Resonance' && opts.card && D.pressure[v] >= TUNING.resonanceAt) n += 1;
    let absorbed = 0;
    const power = shieldPowerOf(S, v, d);
    while (n > 0 && D.shields[v] > 0) { const take = Math.min(n, power); n -= take; absorbed += take; D.shields[v] -= 1; }
    if (absorbed && isP) { S.flags.absorbed = true; S.stats.absorbed += absorbed; }
    const before = D.pressure[v];
    const room = MAX_P - D.pressure[v];
    const landed = Math.min(n, room);
    D.pressure[v] += landed;
    attribute(S, v, d, landed, opts.by);
    ev.push({ k: 'press', d, n: landed, absorbed, src, f: v, by: opts.by || null });
    if (before < MAX_P && D.pressure[v] === MAX_P) captureDomain(S, v, d, ev, opts.by);
    // Overflow and Topology spill travel one link, never further.
    if (!opts.spill) {
      const over = n - landed;
      if (over > 0) spill(S, v, d, ev, 1, opts.by);
      else if (S.dim === 'Topology' && opts.card && landed >= 1 && D.pressure[v] >= TUNING.spillAt) spill(S, v, d, ev, 1, opts.by);
    }
    return landed;
  }

  function spill(S, v, d, ev, n, by) {
    const links = ADJ[d].filter((x) => S.domainState[x].pressure[v] < MAX_P);
    if (!links.length) return;
    const top = Math.max(...links.map((x) => S.domainState[x].pressure[v]));
    const to = pickWeighted(S, links.filter((x) => S.domainState[x].pressure[v] === top), () => 1);
    ev.push({ k: 'spill', from: d, to, n, f: v });
    press(S, v, to, n, ev, 'spill', { spill: true, by });
  }

  function captureDomain(S, v, d, ev, by) {
    const taker = by && S.ledger[by] && S.ledger[by].control === 'ai' ? by : leaderOf(S);
    if (v !== S.player) {
      ev.push({ k: 'seize', d, f: v, by: taker });
      log(S, `${d} falls to ${nameOf(S, taker)}. ${nameOf(S, v)} loses it.`);
      addLegitimacy(S, v, -S.rules.legit.captured, ev, `${d} lost`);
      S.ledger[v].tempo -= 1;
      return;
    }
    S.stats.capturedDomains += 1;
    ev.push({ k: 'capture', d, f: v, by: taker });
    log(S, `${d} falls. ${nameOf(S, taker)} holds it.`);
    addLegitimacy(S, v, -S.rules.legit.captured, ev, `${d} lost`);
    if (S.dim === 'Criticality' && S.domainState[d].critical) {
      const t = thresholds(S);
      const next = t.find((x) => x > S.ledger[taker].leverage);
      if (next != null) { addLeverage(S, next - S.ledger[taker].leverage, ev, 'cascade', taker); log(S, `${d} bore the load. The collapse cascades a full stage.`); }
    } else if (d === S.op.spine) {
      addLeverage(S, 3, ev, 'lever captured', taker);
      log(S, `${d} was the lever. The opponent banks 3 leverage.`);
    }
  }

  function addSlope(S, v, d, n, ev, by) {
    if (!d || n <= 0) return;
    const D = S.domainState[d];
    const before = D.slopes[v];
    D.slopes[v] = Math.min(slopeCapFor(S, v, d), D.slopes[v] + n + slopeBonusFor(S, v, d));
    if (by) D.slopeBy[v] = by;
    if (D.slopes[v] > before) ev.push({ k: 'slope', d, n: D.slopes[v] - before, total: D.slopes[v], f: v });
  }

  // A card's hit. Gradient turns half of it into a slope.
  function hit(S, v, d, n, ev, code, by) {
    if (n <= 0) return 0;
    if (S.dim === 'Gradient' && n >= 2) {
      const sl = Math.floor(n / 2);
      addSlope(S, v, d, sl, ev, by);
      n -= sl;
    }
    return press(S, v, d, n, ev, code, { card: true, by });
  }

  function drain(S, v, d, n, ev, code) {
    const D = S.domainState[d];
    const k = Math.min(D.shields[v], n);
    if (k > 0) { D.shields[v] -= k; ev.push({ k: 'drain', d, n: k, src: code, f: v }); }
    return k;
  }

  // ======================================================================
  // Resolve one card (applyStratagem)
  // ======================================================================
  function legitimacyOnPlay(S, it, ev) {
    if (!S.rules.legitimacy || it.fake) return;
    const R = S.rules.legit;
    const cost = R.cost[it.code];
    if (cost) { addLegitimacy(S, it.by, -cost, ev, `plays ${cardLabel(it.code)}`); S.flags.costly[it.by] = true; }
    const back = R.restore[it.code];
    if (back) addLegitimacy(S, it.by, back, ev, `${cardLabel(it.code)} restores trust`);
  }

  function applyStratagem(S, it, ev) {
    attach(S);
    const code = it.code;
    const a = it.by || S.primary;
    const v = it.victim || S.player;
    const T = it.target;
    const B = S.domainState;
    const L = S.ledger[a];
    const toPlayer = v === S.player;
    if (it.fake) { ev.push({ k: 'fizzle', id: it.id, code }); return; }
    ev.push({ k: 'resolve', id: it.id, code, target: T, by: a, victim: v });
    switch (code) {
      case 'S2': drain(S, v, T, 1, ev, code); hit(S, v, T, 1, ev, code, a); break;
      case 'S4': L.tempo += 1; break;
      case 'S9': { const n = Math.min(3, DOMAINS.filter((d) => B[d].pressure[v] >= 3).length); addLeverage(S, n, ev, code, a); break; }
      case 'S11': {
        const spine = spineOf(S, v);
        const src = DOMAINS.filter((d) => d !== spine && B[d].pressure[v] > 0).sort((x, y) => B[x].pressure[v] - B[y].pressure[v])[0];
        if (src) { const k = Math.min(2, B[src].pressure[v]); ease(S, v, src, k, ev); hit(S, v, spine, k, ev, code, a); } else hit(S, v, spine, 1, ev, code, a);
        break;
      }
      case 'S12': hit(S, v, T, 1, ev, code, a); addLeverage(S, 1, ev, code, a); break;
      case 'S13': hit(S, v, T, 1, ev, code, a); L.probe = true; break;
      case 'S14':
        if (S.lastDisrupted && S.lastDisrupted !== 'S14') S.scheduled.push({ turn: S.turn + 1, code: S.lastDisrupted, target: aimAt(S, a, v, CARDS[S.lastDisrupted].aim === 'none' ? 'theater' : CARDS[S.lastDisrupted].aim), amount: Math.max(1, CARDS[S.lastDisrupted].amt), why: 'revived', by: a, victim: v });
        else hit(S, v, aimAt(S, a, v, 'theater'), 1, ev, code, a);
        break;
      case 'S15': {
        if (B[T].shields[v] > 0) {
          const to = DOMAINS.filter((d) => d !== T && B[d].shields[v] < MAX_S).sort((x, y) => B[x].pressure[v] - B[y].pressure[v])[0];
          B[T].shields[v] -= 1; if (to) B[to].shields[v] += 1;
          ev.push({ k: 'lure', from: T, to, f: v });
        }
        hit(S, v, T, 1, ev, code, a); break;
      }
      case 'S16':
        if (it.scheduled) { hit(S, v, T, it.amount, ev, code, a); break; }
        if (B[T].pressure[v] > 0) ease(S, v, T, 1, ev);
        S.scheduled.push({ turn: S.turn + 1, code, target: T, amount: 3, why: 'the catch', by: a, victim: v });
        break;
      case 'S18': hurtCohesion(S, v, 2, ev, code); hit(S, v, T, 1, ev, code, a); break;
      case 'S19': drain(S, v, T, MAX_S, ev, code); break;
      case 'S20': hit(S, v, T, it.amount, ev, code, a); if (toPlayer) { if (!hasLens(S, 'Entropy')) S.apPenalty += 1; } else S.ledger[v].tempo -= 1; break;
      case 'S22': hit(S, v, T, it.amount, ev, code, a); break;
      case 'S23': {
        hit(S, v, T, it.amount, ev, code, a);
        const far = DOMAINS.filter((d) => d !== T && !ADJ[T].includes(d) && B[d].pressure[v] > 0);
        if (far.length) { const d = far[randInt(S, far.length)]; ease(S, v, d, 1, ev); }
        break;
      }
      case 'S24': hit(S, v, T, 1, ev, code, a); ADJ[T].filter((d) => B[d].shields[v] === 0).forEach((d) => press(S, v, d, 1, ev, code, { spill: true, by: a })); break;
      case 'S25': { const k = drain(S, v, T, 2, ev, code); if (k) press(S, v, T, k, ev, code, { card: true, by: a }); break; }
      case 'S26': hit(S, v, T, it.amount, ev, code, a); ADJ[T].forEach((d) => drain(S, v, d, 1, ev, code)); break;
      case 'S28': hit(S, v, T, it.amount, ev, code, a); if (toPlayer) { B[T].lock = Math.max(B[T].lock, 2); ev.push({ k: 'lock', d: T, turns: 2 }); } break;
      case 'S30':
        if (B[T].pressure[v] >= 2) { const k = B[T].shields[v]; B[T].shields[v] = 0; if (k) { ev.push({ k: 'drain', d: T, n: k, src: code, f: v }); press(S, v, T, k, ev, code, { card: true, by: a }); } addSlope(S, v, T, 1, ev, a); }
        else hit(S, v, T, 1, ev, code, a);
        break;
      case 'S32':
        if (S.flags.shieldedNow.includes(T)) { addLeverage(S, 1, ev, code, a); log(S, `The threat on ${T} was the empty fortress. Your shields answered a bluff.`); }
        break;
      case 'S33': hurtCohesion(S, v, 2, ev, code); break;
      case 'S34': { const k = Math.min(2, B[T].pressure[v]); if (k) ease(S, v, T, k, ev); addLeverage(S, 2, ev, code, a); break; }
      case 'S35': L.chain += 1; break;
      case 'S36': { const k = Math.min(2, B[T].pressure[v]); if (k) ease(S, v, T, k, ev); L.tempo += 1; break; }
      default: hit(S, v, T, it.amount, ev, code, a); // S1 S3 S5 S6 S7 S8 S21 S27 S29 and revived cards
    }
    if (toPlayer) mark(S.seen, code);
    legitimacyOnPlay(S, it, ev);
    const where = T ? ` on ${T}` : '';
    const feint = code === 'S6' && it.shown && it.shown !== T && !it.revealed ? ` The threat on ${it.shown} was a feint.` : '';
    const aim = !toPlayer && T ? ` against ${nameOf(S, v)}` : '';
    log(S, `${nameOf(S, a)} runs ${cardLabel(code)}${where}${aim}.${feint}`);
  }

  // ======================================================================
  // The player's actions
  // ======================================================================
  // Only the twelve domain names reach the board. Anything else, such as "__proto__", is refused.
  function domainOf(S, d) {
    if (typeof d !== 'string' || !DOMAINS.includes(d)) throw new Error('No such domain.');
    return S.board[d];
  }
  const mine = (S, it) => (it.victim || S.player) === S.player;
  function findIntent(S, id) { return S.intents.find((x) => x.id === Number(id) && !x.cancelled && !x.done && mine(S, x)); }
  const blocked = (S, d) => !hasLens(S, 'Agency') && S.board[d].gated;
  const locked = (S, d) => !hasLens(S, 'Agency') && S.board[d].lock > 0;

  function reveal(S, it, ev) {
    if (it.revealed) return;
    it.revealed = true;
    it.attributed = true;
    it.shown = it.target;
    it.shownAmount = it.amount;
    if (!it.fake) mark(S.seen, it.code);
    ev.push({ k: 'reveal', id: it.id, code: it.code, target: it.target, amount: it.amount, fake: !!it.fake, by: it.by });
  }

  // Everything the player may do right now, with its cost. The client and the bots both read this.
  function options(S) {
    attach(S);
    if (S.over) return { intents: {}, domains: {}, assign: {}, name: false, doctrine: false, end: false };
    const docOk = !!(S.doctrine && !S.doctrine.used && !(S.doctrine.code === 'business' && S.lever.exposed));
    const o = { intents: {}, domains: {}, assign: {}, name: !S.lever.named && !S.lever.exposed, doctrine: docOk, end: true };
    const detectCost = S.flags.freeDetect > 0 ? 0 : 1;
    for (const it of S.intents) {
      if (it.cancelled || it.done) continue;
      const x = {};
      if (!mine(S, it)) { o.intents[it.id] = x; continue; }
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
    for (const c of S.cadres) if (c.faction === S.player && c.active !== false && !c.fixed && !(c.lock > 0) && !c.moved && S.ap >= 1) o.assign[c.id] = 1;
    if (holdingsOf(S).length) { o.yield = {}; for (const h of liveHoldings(S)) if (S.ap >= 1) o.yield[h.id] = 1; }
    return o;
  }

  function act(S, action) {
    attach(S);
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
          const more = S.intents.filter((x) => mine(S, x) && !x.revealed && x.face !== 'up' && !x.cancelled && !x.offer);
          if (more.length) reveal(S, more[randInt(S, more.length)], ev);
        }
        if (hasLens(S, 'Resonance') && !it.fake) {
          S.intents.filter((x) => mine(S, x) && !x.revealed && !x.cancelled && !x.offer && !x.fake && CARDS[x.code].group === CARDS[it.code].group).forEach((x) => reveal(S, x, ev));
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
            const to = aimAt(S, it.by, it.victim || S.player, 'any', [it.target]);
            it.escaped = true; it.target = to; it.shown = to; it.amount = 1; it.shownAmount = 1;
            ev.push({ k: 'escape', id: it.id, code: it.code, to });
            log(S, `${cardLabel('S21')} sheds its shell and slips toward ${to}.`);
          } else {
            it.cancelled = true;
            ev.push({ k: 'cancel', id: it.id, code: it.code, fake: !!it.fake });
            if (!it.fake) {
              mark(S.seen, it.code); mark(S.captured, it.code); S.lastDisrupted = it.code;
              const c = S.rules.legit.cost[it.code];
              if (S.rules.legitimacy && c) addLegitimacy(S, it.by, -Math.ceil(c * S.rules.legit.exposed), ev, `${cardLabel(it.code)} exposed`);
            }
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
          syncFrom(S, S.player, d);
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
      case 'assign': {
        const c = S.cadres.find((x) => x.id === a.cadre);
        if (!c || c.faction !== S.player || c.active === false) throw new Error('No such leader.');
        if (c.fixed) throw new Error(`${c.name} cannot be moved.`);
        if (c.lock > 0) throw new Error(`${c.name} cannot act right now.`);
        if (c.moved) throw new Error(`${c.name} already moved this turn.`);
        const d = a.domain;
        domainOf(S, d);
        if (c.domain === d) throw new Error(`${c.name} already leads ${d}.`);
        spend(1);
        const from = c.domain;
        c.domain = d; c.moved = true;
        ev.push({ k: 'assign', cadre: c.id, from, to: d });
        S.flags.acts.push('assign');
        log(S, `${c.name} moves from ${from} to ${d}.`);
        break;
      }
      case 'accept': {
        const it = findIntent(S, a.intent);
        if (!it || !it.offer) throw new Error('No such offer.');
        const o = CARDS[it.code].offer;
        it.done = true;
        S.ap += o.ap || 0;
        if (o.slope) addSlope(S, S.player, it.target, o.slope, ev, it.by);
        if (o.leverage) addLeverage(S, o.leverage, ev, it.code, it.by);
        if (o.reveal) S.intents.forEach((x) => { if (mine(S, x) && !x.cancelled && !x.offer) reveal(S, x, ev); });
        mark(S.seen, it.code);
        S.stats.offersTaken += 1;
        ev.push({ k: 'offer', id: it.id, code: it.code, accepted: true });
        if (S.rules.legitimacy) {
          addLegitimacy(S, S.player, -(S.rules.legit.acceptCost[it.code] || 0), ev, `accepts ${cardLabel(it.code)}`);
          const c = S.rules.legit.cost[it.code];
          if (c) { addLegitimacy(S, it.by, -c, ev, `offers ${cardLabel(it.code)}`); S.flags.costly[it.by] = true; }
        }
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
          addLegitimacy(S, S.player, S.rules.legit.leverRight, ev, 'lever named');
          log(S, `You name ${d} as the lever. You are right. Every Disrupt aimed there costs 1 less.`);
        } else {
          addCoherence(S, -1, ev, 'wrong lever');
          addLeverage(S, 2, ev, 'wrong lever');
          addLegitimacy(S, S.player, -S.rules.legit.leverWrong, ev, 'wrong lever');
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
        if (code === 'data') S.intents.forEach((x) => { if (mine(S, x) && !x.cancelled && !x.offer) reveal(S, x, ev); });
        if (code === 'principles') S.flags.preauth = true;
        if (code === 'technology') S.flags.zeroTrust = a.domain;
        if (code === 'application') S.ap += 2;
        if (code === 'business') { S.lever.exposed = true; S.lever.named = S.op.spine; S.lever.correct = true; S.flags.leverRight = true; addLeverage(S, -2, ev, 'lever mapped'); }
        if (code === 'governance') addLeverage(S, -3, ev, code);
        ev.push({ k: 'doctrine', code, d: a.domain || null });
        log(S, `Doctrine: ${DOCTRINES[code].name}. ${DOCTRINES[code].text}`);
        break;
      }
      case 'yield': {
        const h = holdingsOf(S).find((x) => x.id === a.holding);
        if (!h) throw new Error('No such holding.');
        if (!h.active) throw new Error(`You already gave up ${h.name}.`);
        spend(1);
        const was = holdingCost(S, h);
        h.active = false;
        for (const id of h.couples) { const o2 = holdingsOf(S).find((x) => x.id === id && x.active); if (o2) o2.raised = (o2.raised || 0) + 1; }
        for (const e of h.onYield || []) applyEffect(S, e, ev);
        ev.push({ k: 'yield', id: h.id, name: h.name, d: h.domain, cost: was, denial: h.denial });
        S.flags.acts.push('yield');
        log(S, h.yieldText || `You give up ${h.name}. It no longer costs you and no longer denies the rival.`);
        break;
      }
      case 'end': return endTurn(S);
      default: throw new Error('Unknown action.');
    }
    return ev;
  }

  // ======================================================================
  // End of turn: resolve the cards, then evaluate the turn
  // ======================================================================
  function endTurn(S) {
    attach(S);
    const ev = [];
    const unspent = S.ap;
    // Locks wear off before new cards land, so a lock set this turn binds the next two turns.
    for (const d of DOMAINS) if (S.domainState[d].lock > 0) S.domainState[d].lock -= 1;
    for (const c of S.cadres) { if (c.lock > 0) c.lock -= 1; c.moved = false; }
    S.history.push({ turn: S.turn, acts: S.flags.acts.slice(), unspent });
    for (const f of S.factions) S.ledger[f].chain = 0;
    const groups = {};
    for (const it of S.intents) {
      if (it.cancelled || it.done) continue;
      if (it.offer) {
        ev.push({ k: 'offer', id: it.id, code: it.code, accepted: false });
        if (S.rules.legitimacy && S.rules.legit.cost[it.code]) {
          addLegitimacy(S, it.by, -Math.ceil(S.rules.legit.cost[it.code] * S.rules.legit.exposed), ev, `${cardLabel(it.code)} declined`);
          S.flags.costly[it.by] = true;
        }
        continue;
      }
      const L = S.ledger[it.by || S.primary];
      const times = L.chain > 0 ? 2 : 1;
      if (times === 2) L.chain -= 1;
      for (let i = 0; i < times; i++) applyStratagem(S, it, ev);
      if (!it.fake) (groups[it.by || S.primary] = groups[it.by || S.primary] || []).push(CARDS[it.code].group);
      it.done = true;
      if (S.over) break;
    }
    for (const a of actorsOf(S)) if (S.ledger[a].chain > 0) { addLeverage(S, 1, ev, 'S35', a); S.ledger[a].chain = 0; }
    // Shut the door: a disrupt in a trapped domain springs it.
    for (const it of S.intents) {
      if (it.code === 'S22' && !it.fake && mine(S, it) && S.flags.disruptedIn.includes(it.target)) { press(S, S.player, it.target, 2, ev, 'trap', { by: it.by }); log(S, `The door shuts on ${it.target} for 2 more.`); }
    }
    return evaluateTurn(S, ev, unspent, groups);
  }

  // The evaluation phase: standing effects, the ledgers, the stage, and whether the operation is decided.
  function evaluateTurn(S, ev = [], unspent = S.ap, groups = {}) {
    attach(S);
    // Slopes pay out every turn.
    for (const v of S.factions) for (const d of DOMAINS) {
      const D = S.domainState[d];
      if (D.slopes[v] > 0) press(S, v, d, D.slopes[v], ev, 'slope', { by: D.slopeBy[v] || null });
    }
    // Runaway slopes grow on their own: inflation feeds itself.
    for (const v of S.factions) {
      const t = S.ledger[v].traits.runaway;
      if (!t) continue;
      for (const d of t.domains || []) {
        const D = S.domainState[d];
        if (D && D.slopes[v] > 0 && S.turn % (t.every || 2) === 0) addSlope(S, v, d, 1, ev, D.slopeBy[v] || null);
      }
    }
    // Noise.
    if (S.dim === 'Entropy' || S.world === 'Unwinding' || S.world === 'Runaway') {
      const open = DOMAINS.filter((d) => S.board[d].s === 0 && S.board[d].p < MAX_P);
      if (open.length) press(S, S.player, open[randInt(S, open.length)], 1, ev, 'noise');
    }
    // Corruption: control rots. A faction prone to it loses a shield in its listed domains, and once none are left it bleeds pressure.
    for (const v of S.factions) {
      const t = S.ledger[v].traits.corruption;
      if (!t || S.turn % (t.every || 1) !== 0) continue;
      const listed = (t.domains || []).filter((d) => S.domainState[d]);
      const held = listed.filter((d) => S.domainState[d].shields[v] > 0);
      if (held.length) { const d = held[randInt(S, held.length)]; S.domainState[d].shields[v] -= 1; ev.push({ k: 'drain', d, n: 1, src: 'corruption', f: v }); }
      else {
        const open = listed.filter((d) => S.domainState[d].pressure[v] < MAX_P);
        if (open.length) press(S, v, open[randInt(S, open.length)], t.n || 1, ev, 'corruption', { by: null });
      }
    }
    // A pact in force pays out each turn: shared credit, a creeping slope, whatever its terms say.
    for (const p of S.pacts) if (p.active) for (const e of p.perTurn || []) if (due(S, e)) applyEffect(S, e, ev);
    // Holdings: each live one costs its holder. Shields go first and then pressure.
    for (const h of liveHoldings(S)) {
      const cost = holdingCost(S, h);
      if (!cost) continue;
      const D = S.domainState[h.domain];
      const take = Math.min(cost, D.shields[S.player]);
      if (take) { D.shields[S.player] -= take; ev.push({ k: 'drain', d: h.domain, n: take, src: 'holding', f: S.player }); }
      if (cost > take) press(S, S.player, h.domain, cost - take, ev, 'holding', { by: null });
      const consuming = isConsuming(S, h);
      ev.push({ k: 'upkeep', id: h.id, name: h.name, d: h.domain, n: cost, denial: h.denial, consuming });
      if (consuming) ev.push({ k: 'self', f: S.player, type: 'overextension', why: h.name, n: cost });
      log(S, consuming ? `Holding ${h.name} costs ${cost} this turn and denies ${h.denial}.` : `Holding ${h.name} costs ${cost} this turn.`);
    }
    // Internal friction: a faction that cannot act as one loses coherence on a schedule.
    const fr = S.ledger[S.player].traits.friction;
    if (fr && S.turn % (fr.every || 3) === 0 && !hasLens(S, 'Entropy')) addCoherence(S, -(fr.n || 1), ev, 'internal friction');
    // Coherence of the opponent's hand.
    if (S.dim === 'Coherence') for (const a of actorsOf(S)) { const g = groups[a] || []; if (g.length >= 2 && g.every((x) => x === g[0])) addLeverage(S, 1, ev, 'one aim', a); }
    // Legitimacy: a clean turn recovers a little, a leader may add or cost some, and a faction in disgrace comes apart from inside.
    if (S.rules.legitimacy) {
      const R = S.rules.legit;
      for (const a of actorsOf(S)) if (!S.flags.costly[a]) addLegitimacy(S, a, R.cleanTurn, ev, 'clean turn');
      const flow = cadreLegitFlow(S);
      for (const f of S.factions) if (flow[f]) addLegitimacy(S, f, flow[f], ev, 'standing');
      for (const c of liveCadres(S)) if (c.mods && c.mods.self && c.mods.legitimacy < 0) ev.push({ k: 'self', f: c.faction, type: c.mods.self, why: c.name, n: c.mods.legitimacy });
      for (const f of S.factions) {
        const state = entropyState(S, f);
        if (state === 'stable') continue;
        const L = S.ledger[f];
        const n = state === 'severe' ? 2 : 1;
        const open = DOMAINS.filter((d) => S.domainState[d].shields[f] === 0 && S.domainState[d].pressure[f] < MAX_P);
        const pool = open.length ? open : DOMAINS.filter((d) => S.domainState[d].pressure[f] < MAX_P);
        ev.push({ k: 'spike', f, n, legitimacy: L.legitimacy });
        log(S, `${L.name} loses its grip. Its own institutions fail, and the strain lands where it holds least.`);
        if (pool.length) press(S, f, pool[randInt(S, pool.length)], n, ev, 'entropy spike', { by: null });
        if (f !== S.player) L.tempo -= 1;
      }
    }
    // Leverage from held ground.
    const gain = leverageFlow(S);
    for (const a of Object.keys(gain)) addLeverage(S, gain[a], ev, 'held ground', a);
    // Stage.
    const prev = S.stage;
    for (const a of actorsOf(S)) S.ledger[a].stage = stageFor(S, S.ledger[a].leverage);
    syncStage(S);
    if (S.stage !== prev) { ev.push({ k: 'stage', stage: S.stage, name: STAGES[S.stage] }); if (S.stage > prev) log(S, `The operation reaches ${STAGES[S.stage]}. ${STAGE_TEXT[STAGES[S.stage]]}`); }
    if (S.stage >= 4) { finish(S, 'loss', 'consumed', ev); return ev; }
    // AI factions raise a shield where they are hit hardest.
    for (const f of S.factions) {
      if (S.ledger[f].control !== 'ai') continue;
      let best = null; let bp = 1;
      for (const d of DOMAINS) { const D = S.domainState[d]; if (D.pressure[f] > bp && D.shields[f] < MAX_S) { bp = D.pressure[f]; best = d; } }
      if (best) S.domainState[best].shields[f] += 1;
    }
    // Coherence.
    const good = S.flags.chain || S.flags.absorbed || S.flags.leverRight;
    const bad = unspent >= 2 || ev.some((e) => e.k === 'capture');
    if (good && !bad) { addCoherence(S, 1, ev, 'coherent turn'); addLegitimacy(S, S.player, S.rules.legit.coherentTurn, ev, 'coherent turn'); }
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
    const by = outcome === 'loss' ? actorsOf(S).filter((a) => S.ledger[a].stage >= 4).sort((x, y) => S.ledger[y].leverage - S.ledger[x].leverage)[0] || leaderOf(S) : null;
    S.over = { outcome, reason, stars, score, turns, leverage: S.leverage, consumeAt: S.consumeAt, stage: STAGES[Math.min(S.stage, 4)], captured: S.captured.slice(), seen: S.seen.slice(), spine: S.op.spine, leverCorrect: S.lever.correct, consumedBy: by };
    ev.push({ k: 'over', ...S.over });
  }

  // ======================================================================
  // What the player may see
  // ======================================================================
  function view(S) {
    attach(S);
    const opt = options(S);
    const intents = S.intents.filter((it) => !it.done || it.cancelled).map((it) => {
      const known = it.face === 'up' || it.revealed;
      const base = { id: it.id, face: it.revealed ? 'up' : it.face, cancelled: it.cancelled, offer: !!it.offer, options: opt.intents[it.id] || {} };
      if (it.face === 'down' && !it.revealed) return base;
      const out = { ...base, target: it.revealed ? it.target : it.shown, amount: it.revealed ? it.amount : it.shownAmount, scheduled: it.scheduled || null, escaped: !!it.escaped, by: it.by, victim: it.victim || S.player };
      if (known) { const c = CARDS[it.code]; Object.assign(out, { code: it.code, num: c.num, name: c.name, group: c.group, text: c.text, proxy: !!c.proxy, fake: it.revealed ? !!it.fake : undefined, offerTerms: c.offer || null, legitCost: S.rules.legitimacy ? (S.rules.legit.cost[it.code] || 0) : 0 }); }
      return out;
    });
    const board = DOMAINS.map((d) => {
      const B = S.board[d];
      return { d, short: SHORT[d], p: B.p, s: B.s, slope: B.slope, gated: B.gated, lock: B.lock, theater: B.theater, critical: !!B.shownCritical || (S.lever.exposed && d === S.op.spine), lever: S.lever.exposed && d === S.op.spine, links: ADJ[d], options: opt.domains[d] || {} };
    });
    const boards = {};
    for (const f of S.factions) boards[f] = DOMAINS.map((d) => { const D = S.domainState[d]; return { d, p: D.pressure[f], s: D.shields[f], slope: D.slopes[f], from: normFrom(S, f, d) }; });
    const factions = S.factions.map((f) => {
      const L = S.ledger[f];
      return { id: f, name: L.name, short: L.short, blurb: L.blurb, control: L.control, player: f === S.player, legitimacy: L.legitimacy, entropy: entropyState(S, f), leverage: L.leverage, stage: L.stage, stageName: STAGES[Math.min(L.stage, 4)], focus: L.focus };
    });
    return {
      v: S.v, mode: S.mode,
      op: { id: S.op.id, title: S.op.title, opponent: S.op.opponent, dimension: S.dim, world: S.world, stage: S.op.stage, label: S.op.label, kind: S.op.kind, theater: S.op.theater, signature: S.op.stratagems },
      rule: DIMENSIONS[S.dim], lens: S.lens ? { code: S.lens, ...LENSES[S.lens] } : null,
      doctrine: S.doctrine ? { ...S.doctrine, ...DOCTRINES[S.doctrine.code] } : null,
      tier: S.tier, turn: S.turn, maxTurns: S.maxTurns, dates: S.dates, bursts: S.dim === 'Phase' ? [3, 6, 9].filter((t) => t <= S.maxTurns) : [],
      ap: S.ap, coherence: S.coherence, leverage: S.leverage, consumeAt: S.consumeAt, thresholds: thresholds(S), stage: S.stage, stageName: STAGES[Math.min(S.stage, 4)],
      board, intents, lever: { named: S.lever.named, exposed: S.lever.exposed, correct: S.lever.correct },
      can: { name: opt.name, doctrine: opt.doctrine, end: opt.end, assign: opt.assign, ...(opt.yield ? { yield: opt.yield } : {}) }, apPenaltyNext: S.apPenalty,
      log: S.log.slice(-30), history: S.history, over: S.over, spine: S.over ? S.op.spine : undefined,
      player: S.player, factions, boards, multi: S.factions.length > 2,
      cadres: S.cadres.filter((c) => c.active !== false).map((c) => ({ id: c.id, name: c.name, role: c.role, faction: c.faction, domain: c.domain, locked: c.lock > 0, mine: c.faction === S.player, movable: !!opt.assign[c.id], mods: c.mods, blurb: c.blurb })),
      pacts: S.pacts.map((p) => ({ id: p.id, name: p.name, members: p.members, against: p.against, active: p.active, broken: p.broken })),
      rules: { legitimacy: S.rules.legitimacy, spikeBelow: S.rules.legit.spikeBelow },
      ...(S.holdings ? { holdings: S.holdings.map((h) => ({ id: h.id, name: h.name, domain: h.domain, cost: holdingCost(S, h), baseCost: h.cost, denial: h.denial, consuming: isConsuming(S, h), active: h.active, couples: h.couples, strains: h.strains, text: h.text, canYield: !!(opt.yield && opt.yield[h.id]), yieldLegitimacy: h.onYield.filter((e) => e.type === 'legitimacy' && e.faction === S.player).reduce((x, e) => x + e.n, 0) })) } : {}),
    };
  }

  // Spoiler-free result grid for sharing.
  function shareGrid(S) {
    const sq = { detect: '🟦', disrupt: '🟥', defend: '🟩', open: '🟨' };
    return S.history.map((h) => (h.acts.map((a) => sq[a] || '🟨').join('') + '⬜'.repeat(Math.min(3, h.unspent))).slice(0, 16) || '⬜').join('\n');
  }

  function cardList() { return CODES.map((c) => ({ code: c, ...CARDS[c] })); }

  // Test hook: put one stratagem on the table as the opponent would.
  function forceCard(S, code, opts = {}) {
    attach(S);
    const a = opts.by || S.primary;
    const v = opts.victim || S.player;
    const made = spawn(S, code, [], a, v);
    for (const it of made) { it.attributed = it.face === 'up'; if (it.face === 'down') it.shown = null; }
    S.intents.push(...made);
    return made;
  }

  // Authoring check. Returns a list of problems, empty when the operation is sound.
  function validate(op, registry = {}) {
    const bad = [];
    const reg = registry || {};
    const SELF_TYPES = ['predation on own base', 'overextension', 'purge of own capacity', 'breach of own legitimating rule', 'withdrawal of own commitment'];
    if (!op || typeof op !== 'object') return ['not an operation'];
    if (!DIMENSIONS[op.dimension]) bad.push(`unknown dimension ${op.dimension}`);
    if (op.kind != null && !['catalog', 'futures', 'watch'].includes(op.kind)) bad.push(`unknown kind ${op.kind}`);
    if (op.kind === 'watch') {
      if (!['open', 'settled'].includes(op.status)) bad.push('a watch operation needs status open or settled');
      if (typeof op.settleOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(op.settleOn) || Number.isNaN(Date.parse(op.settleOn))) bad.push('a watch operation needs a settleOn date');
    }
    if (!DOMAINS.includes(op.spine)) bad.push(`unknown spine ${op.spine}`);
    for (const d of op.theater || []) if (!DOMAINS.includes(d)) bad.push(`unknown theater domain ${d}`);
    for (const c of op.stratagems || []) if (!CARDS[c]) bad.push(`unknown stratagem ${c}`);
    const ids = [];
    for (const s of op.factions || []) {
      const id = typeof s === 'string' ? s : s && s.id;
      if (typeof id !== 'string' || !ID_RE.test(id) || FORBIDDEN_ID.has(id)) { bad.push(`bad faction id ${id}`); continue; }
      ids.push(id);
      const def = { ...((reg.factions && reg.factions[id]) || {}), ...(typeof s === 'string' ? {} : s) };
      if (!(reg.factions && reg.factions[id]) && typeof s === 'string') bad.push(`faction ${id} is not in the registry`);
      for (const d of [...(def.focus || []), ...Object.keys((def.start || {}).shields || {}), ...Object.keys((def.start || {}).pressure || {}), ...Object.keys(def.power || {})]) if (!DOMAINS.includes(d)) bad.push(`faction ${id} names unknown domain ${d}`);
      for (const c of Object.keys(def.affinity || {}).concat(def.signature || [])) if (!CARDS[c]) bad.push(`faction ${id} names unknown stratagem ${c}`);
    }
    if (op.factions && op.factions.length) {
      if (op.factions.length < 2) bad.push('fewer than two factions');
      if (op.player && !ids.includes(op.player)) bad.push(`player faction ${op.player} is not in the operation`);
      if (new Set(ids).size !== ids.length) bad.push('duplicate faction ids');
    }
    for (const c of op.cadres || []) {
      const id = typeof c === 'string' ? c : c.id;
      const def = { ...((reg.cadres && reg.cadres[id]) || {}), ...(typeof c === 'string' ? {} : c) };
      if (!(reg.cadres && reg.cadres[id]) && typeof c === 'string') bad.push(`cadre ${id} is not in the registry`);
      if (op.factions && !ids.includes(def.faction)) bad.push(`cadre ${id} belongs to ${def.faction}, who is not in this operation`);
      if (!DOMAINS.includes(def.domain)) bad.push(`cadre ${id} sits in unknown domain ${def.domain}`);
      if (def.mods && def.mods.self != null && !SELF_TYPES.includes(def.mods.self)) bad.push(`cadre ${id} names an unknown self-act type ${def.mods.self}`);
    }
    for (const p of op.pacts || []) {
      const id = typeof p === 'string' ? p : p.id;
      const def = { ...((reg.pacts && reg.pacts[id]) || {}), ...(typeof p === 'string' ? {} : p) };
      if (!(reg.pacts && reg.pacts[id]) && typeof p === 'string') bad.push(`pact ${id} is not in the registry`);
      for (const m of def.members || []) if (op.factions && !ids.includes(m)) bad.push(`pact ${id} names ${m}, who is not in this operation`);
    }
    const effectOk = (e, where) => {
      if (!e || typeof e !== 'object') { bad.push(`${where}: effect is not an object`); return; }
      if (!['legitimacy', 'shield', 'dropShields', 'pressure', 'slope', 'coherence', 'leverage', 'tempo', 'pact', 'cadre', 'log'].includes(e.type)) bad.push(`${where}: unknown effect ${e.type}`);
      if (e.domain != null && !DOMAINS.includes(e.domain)) bad.push(`${where}: unknown domain ${e.domain}`);
      if (e.faction != null && op.factions && !ids.includes(e.faction)) bad.push(`${where}: faction ${e.faction} is not in the operation`);
      if (e.self != null && !SELF_TYPES.includes(e.self)) bad.push(`${where}: unknown self-act type ${e.self}`);
    };
    for (const s of op.script || []) { if (!Number.isInteger(s.turn) || s.turn < 1) bad.push('script entry needs a turn'); (s.effects || []).forEach((e) => effectOk(e, `script turn ${s.turn}`)); }
    for (const p of op.pacts || []) { const def = { ...((reg.pacts && reg.pacts[typeof p === 'string' ? p : p.id]) || {}), ...(typeof p === 'string' ? {} : p) }; for (const k of ['onForm', 'onBreak', 'perTurn']) (def[k] || []).forEach((e) => effectOk(e, `pact ${def.id} ${k}`)); }
    const hids = [];
    for (const h of op.holdings || []) {
      if (!h || typeof h.id !== 'string' || !ID_RE.test(h.id) || FORBIDDEN_ID.has(h.id)) { bad.push(`bad holding id ${h && h.id}`); continue; }
      if (hids.includes(h.id)) bad.push(`duplicate holding id ${h.id}`);
      hids.push(h.id);
      if (!DOMAINS.includes(h.domain)) bad.push(`holding ${h.id} sits in unknown domain ${h.domain}`);
      for (const k of ['cost', 'denial']) if (!Number.isInteger(h[k]) || h[k] < 0 || h[k] > 3) bad.push(`holding ${h.id} needs a ${k} from 0 to 3`);
      if (h.denies != null && !ids.includes(h.denies)) bad.push(`holding ${h.id} denies ${h.denies}, who is not in this operation`);
      (h.onYield || []).forEach((e) => effectOk(e, `holding ${h.id} onYield`));
    }
    for (const h of op.holdings || []) for (const k of ['couples', 'strains']) for (const c of h[k] || []) if (!hids.includes(c) || c === h.id) bad.push(`holding ${h.id} ${k} an unknown holding ${c}`);
    return bad;
  }

  return { VERSION, TUNING, LEGIT, DOMAINS, SHORT, LINKS, ADJ, STAGES, STAGE_TEXT, GROUPS, DIMENSIONS, LENSES, DOCTRINES, CARDS, CODES, AI_TARGETABLE, hashSeed, dateLabels, newGame, act, view, options, shareGrid, cardList, forceCard, attach, calcPhysics, evaluateTurn, applyStratagem, validate };
});
