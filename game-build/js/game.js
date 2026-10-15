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
    consume: [24, 22, 20, 20, 19, 18, 17],
    cards: [
      { base: 2, fromTurn: 6, at: [2] }, { base: 2, fromTurn: 4, at: [1] }, { base: 2, fromTurn: 3, at: [1] },
      { base: 3, fromTurn: 7, at: [2] }, { base: 3, fromTurn: 6, at: [2] }, { base: 3, fromTurn: 4, at: [2] },
      { base: 3, fromTurn: 3, at: [1, 2] },
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
  // Reach moves (Revision 38). A move is an act with a strong effect, and each faction holds a permit for it.
  // Free acts anyone may take. A priced act works but costs the actor legitimacy and counts as an act against its own position.
  // A barred act is closed to the actor. The board still lists it, with the evidence for why it is closed.
  const reachOf = (S) => S.reach || [];
  const permitOf = (S, m) => m.permit[S.player] || 'free';
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
    const tier = Math.max(1, Math.min(7, Number(cfg.tier || op.tier || 3)));
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
    // Reach moves, when the operation has them. An operation without them carries no extra state.
    if (Array.isArray(op.reach) && op.reach.length) {
      S.reach = op.reach.map((m) => ({ id: m.id, name: m.name || m.id, domain: m.domain, text: m.text || '', log: m.log || '', permit: Object.assign({}, m.permit || {}), limit: clamp(Math.round(m.limit || 1), 1, 3), ap: clamp(Math.round(m.ap || 1), 1, 2), effects: (m.effects || []).map((e) => Object.assign({}, e)), pricedEffects: (m.pricedEffects || []).map((e) => Object.assign({}, e)), evidence: (m.evidence || []).map((x) => Object.assign({}, x)), used: 0 }));
    }
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
    if (tier >= 7) theater.forEach((d) => { S.board[d].p = Math.max(S.board[d].p, 2); });
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
    if (e.mirror) ev.push({ k: 'mirror', id: e.mirror, f });
    switch (e.type) {
      case 'ease': if (S.ledger[f] && DOMAINS.includes(e.domain)) ease(S, f, e.domain, e.n, ev); break;
      case 'unslope': if (S.ledger[f] && DOMAINS.includes(e.domain)) { const D = S.domainState[e.domain]; const k = Math.min(e.n, D.slopes[f]); if (k > 0) { D.slopes[f] -= k; ev.push({ k: 'unslope', d: e.domain, n: k, f }); } } break;
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
    if (reachOf(S).length) { o.reach = {}; for (const m of reachOf(S)) { const p = permitOf(S, m); if (p !== 'barred' && m.used < m.limit && S.ap >= m.ap) o.reach[m.id] = p; } }
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
      case 'reach': {
        const m = reachOf(S).find((x) => x.id === a.move);
        if (!m) throw new Error('No such move.');
        const p = permitOf(S, m);
        if (p === 'barred') throw new Error(`${m.name} is closed to you.`);
        if (m.used >= m.limit) throw new Error(`You already used ${m.name}.`);
        spend(m.ap);
        m.used++;
        for (const e of m.effects) applyEffect(S, e, ev);
        if (p === 'priced') for (const e of m.pricedEffects) applyEffect(S, e, ev);
        ev.push({ k: 'reach', id: m.id, name: m.name, d: m.domain, permit: p });
        S.flags.acts.push('reach');
        log(S, m.log || `You use ${m.name}.${p === 'priced' ? ' It has a price.' : ''}`);
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
      can: { name: opt.name, doctrine: opt.doctrine, end: opt.end, assign: opt.assign, ...(opt.yield ? { yield: opt.yield } : {}), ...(opt.reach ? { reach: opt.reach } : {}) }, apPenaltyNext: S.apPenalty,
      log: S.log.slice(-30), history: S.history, over: S.over, spine: S.over ? S.op.spine : undefined,
      player: S.player, factions, boards, multi: S.factions.length > 2,
      cadres: S.cadres.filter((c) => c.active !== false).map((c) => ({ id: c.id, name: c.name, role: c.role, faction: c.faction, domain: c.domain, locked: c.lock > 0, mine: c.faction === S.player, movable: !!opt.assign[c.id], mods: c.mods, blurb: c.blurb })),
      pacts: S.pacts.map((p) => ({ id: p.id, name: p.name, members: p.members, against: p.against, active: p.active, broken: p.broken })),
      rules: { legitimacy: S.rules.legitimacy, spikeBelow: S.rules.legit.spikeBelow },
      ...(S.reach ? { reach: S.reach.map((m) => ({ id: m.id, name: m.name, domain: m.domain, text: m.text, permit: permitOf(S, m), limit: m.limit, used: m.used, ap: m.ap, canUse: !!(opt.reach && opt.reach[m.id]), price: m.pricedEffects.filter((e) => e.type === 'legitimacy').reduce((x, e) => x - e.n, 0), evidence: m.evidence })) } : {}),
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
      if (!['legitimacy', 'shield', 'dropShields', 'pressure', 'slope', 'coherence', 'leverage', 'tempo', 'pact', 'cadre', 'log', 'ease', 'unslope'].includes(e.type)) bad.push(`${where}: unknown effect ${e.type}`);
      if (e.domain != null && !DOMAINS.includes(e.domain)) bad.push(`${where}: unknown domain ${e.domain}`);
      if (e.faction != null && op.factions && !ids.includes(e.faction)) bad.push(`${where}: faction ${e.faction} is not in the operation`);
      if (e.self != null && !SELF_TYPES.includes(e.self)) bad.push(`${where}: unknown self-act type ${e.self}`);
    };
    for (const s of op.script || []) { if (!Number.isInteger(s.turn) || s.turn < 1) bad.push('script entry needs a turn'); (s.effects || []).forEach((e) => effectOk(e, `script turn ${s.turn}`)); }
    for (const p of op.pacts || []) { const def = { ...((reg.pacts && reg.pacts[typeof p === 'string' ? p : p.id]) || {}), ...(typeof p === 'string' ? {} : p) }; for (const k of ['onForm', 'onBreak', 'perTurn']) (def[k] || []).forEach((e) => effectOk(e, `pact ${def.id} ${k}`)); }
    const rids = [];
    for (const m of op.reach || []) {
      if (!m || typeof m.id !== 'string' || !ID_RE.test(m.id) || FORBIDDEN_ID.has(m.id)) { bad.push(`bad reach id ${m && m.id}`); continue; }
      if (rids.includes(m.id)) bad.push(`duplicate reach id ${m.id}`);
      rids.push(m.id);
      if (!DOMAINS.includes(m.domain)) bad.push(`reach ${m.id} sits in unknown domain ${m.domain}`);
      for (const [f, p] of Object.entries(m.permit || {})) {
        if (!ids.includes(f)) bad.push(`reach ${m.id} gives a permit to ${f}, who is not in this operation`);
        if (!['free', 'priced', 'barred'].includes(p)) bad.push(`reach ${m.id} permit ${p} is not free, priced or barred`);
      }
      if (m.limit != null && !(Number.isInteger(m.limit) && m.limit >= 1 && m.limit <= 3)) bad.push(`reach ${m.id} needs a limit from 1 to 3`);
      if (m.ap != null && !(Number.isInteger(m.ap) && m.ap >= 1 && m.ap <= 2)) bad.push(`reach ${m.id} needs 1 or 2 actions`);
      (m.effects || []).forEach((e) => effectOk(e, `reach ${m.id}`));
      (m.pricedEffects || []).forEach((e) => effectOk(e, `reach ${m.id} price`));
      if (Object.values(m.permit || {}).includes('priced') && !(m.pricedEffects || []).length) bad.push(`reach ${m.id} is priced and names no price`);
      for (const x of m.evidence || []) if (!x || !/^EV-\d{3}$/.test(x.id || '') || !x.line) bad.push(`reach ${m.id} has evidence without a card id and a line`);
    }
    for (const s of op.script || []) for (const e of s.effects || []) if (e.mirror != null && !rids.includes(e.mirror)) bad.push(`script turn ${s.turn} mirrors an unknown reach move ${e.mirror}`);
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

'use strict';
/* TDW Strategic Game client. Plain JavaScript, no build step. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const main = $('#main');
  const state = { me: null, tax: null, viewStart: Date.now() };
  const DEMO = !!window.TDW_DEMO;

  // ---------- utilities ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Minimal safe markdown: escape first, then links to http(s) and bold.
  function md(s) {
    return esc(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  async function api(path, body) {
    const opt = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TDW': '1' }, body: JSON.stringify(body) };
    // The single-page demo supplies its own transport; the server build uses fetch.
    const res = await (window.TDW_FETCH || fetch)('/api' + path, { credentials: 'same-origin', ...opt });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e; }
    return data;
  }
  function html(strings, ...vals) { return strings.reduce((a, s, i) => a + s + (i < vals.length ? vals[i] : ''), ''); }
  function render(h) { main.innerHTML = h; applyWidths(); main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  // CSP blocks inline style attributes, so bar widths are set through the DOM.
  function applyWidths(root = main) { $$('[data-w]', root).forEach((el) => { el.style.width = Math.max(0, Math.min(100, Number(el.dataset.w))) + '%'; }); }
  const errorBox = (e) => `<p class="err" role="alert">${esc(e.message || e)}</p>`;
  const stratName = (code) => { const s = state.tax?.stratagems.find((x) => x.code === code); return s ? `${code}, ${s.name}` : code; };
  const tierTitle = (t) => state.tax?.tiers.find((x) => x.tier === t)?.title || '';
  const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);

  function bind(sel, ev, fn, root = main) { $$(sel, root).forEach((el) => el.addEventListener(ev, fn)); }
  function segmented(name, options, value) {
    return `<div class="seg" role="group" aria-label="${esc(name)}">${options.map(([v, l]) => `<button type="button" data-seg="${esc(name)}" data-v="${esc(v)}" aria-pressed="${v === value}">${esc(l)}</button>`).join('')}</div>`;
  }
  function wireSeg(onChange) {
    bind('[data-seg]', 'click', (e) => {
      const b = e.currentTarget;
      $$(`[data-seg="${b.dataset.seg}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onChange(b.dataset.seg, b.dataset.v);
    });
  }

  // ---------- navigation ----------
  function nav() {
    const u = state.me;
    if (DEMO) {
      const cur0 = '#/' + (location.hash.slice(2).split('/')[0] || '');
      $('#nav').innerHTML = [['#/', 'Home'], ['#/ops', 'Play'], ['#/arcs', 'Campaign'], ['#/codex', 'Codex'], ['#/records', 'Records']].concat(state.meta && state.meta.forecast ? [['#/forecast', 'Forecast']] : [], [['#/how', 'How to play']])
        .map(([h, l]) => `<a href="${h}" class="${h === cur0 ? 'on' : ''}">${l}</a>`).join('');
      return;
    }
    const main1 = [['#/', 'Home'], ['#/ops', 'Play'], ['#/arcs', 'Campaign'], ['#/codex', 'Codex'], ['#/boards', 'Boards']];
    const more = u && !u.isGuest
      ? [['#/how', 'How to play'], ['#/study', 'Study hall'], ['#/cases', 'Season 1 cases'], ['#/futures', 'Season 2 futures'], ['#/crew', 'Crew'], ['#/settings', 'Settings']].concat(u.isAdmin ? [['#/admin', 'Admin']] : []).concat([['#/logout', 'Sign out']])
      : u ? [['#/how', 'How to play'], ['#/register', 'Save progress'], ['#/login', 'Sign in'], ['#/logout', 'Leave guest session']] : [['#/how', 'How to play'], ['#/login', 'Sign in'], ['#/register', 'Create account']];
    const cur = '#/' + (location.hash.slice(2).split('/')[0] || '');
    const link = ([h, l]) => `<a href="${h}" class="${h === cur ? 'on' : ''}">${l}</a>`;
    $('#nav').innerHTML = (u ? main1 : [['#/', 'Home'], ['#/boards', 'Boards']]).map(link).join('')
      + `<details class="more"><summary aria-label="More">More</summary><div class="menu">${more.map(link).join('')}</div></details>`;
    $$('#nav .menu a').forEach((a) => a.addEventListener('click', () => { const d = $('#nav details'); if (d) d.open = false; }));
  }

  const routes = [];
  const route = (re, fn, priority = 0) => routes.push([re, fn, priority]);
  async function go() {
    let h = location.hash.slice(1) || '/';
    // Extract query string if present
    const qIdx = h.indexOf('?');
    const query = new URLSearchParams(qIdx >= 0 ? h.slice(qIdx + 1) : '');
    if (qIdx >= 0) h = h.slice(0, qIdx);

    if (h[0] !== '/') {
      // A plain anchor. Top-level names route (a host may keep only bare tokens), and the skip link stays put.
      if (/^(daily|ops|arcs|codex|how)$/.test(h)) h = '/' + h;
      else if (state.routed) return;
      else h = '/';
    }
    state.routed = true;
    state.viewStart = Date.now();
    nav();
    document.body.classList.toggle('wide', /^\/(play|op)\//.test(h));

    // Handle challenge acceptance from query string
    if (query.has('challenge') && h === '/play') {
      const code = query.get('challenge').toUpperCase();
      try {
        await api(`/api/challenge/${code}/accept`);
      } catch (e) {
        console.warn('Challenge accept:', e.message);
        // Continue anyway - they can still start the game
      }
      // Redirect to play with challenge code
      location.hash = '#/play?challenge=' + code;
      return;
    }
    for (const [re, fn] of routes.slice().sort((a, b) => (b[2] || 0) - (a[2] || 0))) {
      const m = re.exec(h);
      if (m) {
        try { await fn(...m.slice(1)); } catch (e) {
          if (e.status === 401) { location.hash = '#/login'; return; }
          render(`<div class="card">${errorBox(e)}<p><a href="#/">Back home</a></p></div>`);
        }
        return;
      }
    }
    render('<p>Page not found. <a href="#/">Go home</a>.</p>');
  }
  const needLogin = () => { if (!state.me) { location.hash = '#/login'; throw Object.assign(new Error('Sign in first'), { status: 401 }); } };

  // ---------- home and auth ----------
  route(/^\/study$/, async () => {
    if (!state.me) { location.hash = '#/'; return; }
    const d = await api('/dashboard');
    state.me = d.user;
    const s = d.stats;
    const t = s.tier;
    const played = s.playedByTier[t] || 0;
    const domains = Object.entries(s.domains);
    const cal = s.calibration;
    const moves = ['Detect', 'Disrupt', 'Defend'];
    const heatDomains = state.tax.domains.filter((dn) => moves.some((m) => s.heatmap[m] && s.heatmap[m][dn] != null));
    render(html`
      <h1>Welcome back, ${esc(d.user.username)}</h1>
      <div class="grid">
        <div class="card">
          <div class="label">Tier ${t}</div>
          <h2>${esc(tierTitle(t))}</h2>
          ${t < 6 ? `<p class="small">${played} of ${s.unlockAt} cases played to open Tier ${t + 1}.</p><div class="bar"><i data-w="${pct(played, s.unlockAt)}"></i></div>` : '<p class="small">Every tier is open.</p>'}
          <p><a class="btn primary" href="#/cases">Play a case</a></p>
        </div>
        <div class="card">
          <div class="label">Record</div>
          <p class="score">${s.total}</p>
          <p class="small muted">${s.plays} scored decisions · average ${s.average ?? '-'}</p>
          <p><a class="btn" href="#/futures">Season 2 futures</a></p>
        </div>
        <div class="card">
          <div class="label">Forecasts</div>
          <p class="score">${s.forecasts.avg ?? '-'}</p>
          <p class="small muted">Average Brier points on ${s.forecasts.resolved} resolved questions · ${s.forecasts.houseWins} House wins</p>
          <p class="small">${d.crew ? `Crew <a href="#/crew">${esc(d.crew.name)}</a> (${esc(d.crew.role)})` : '<a href="#/crew">Join or start a crew</a>'}</p>
        </div>
      </div>
      <div class="card">
        <h2>Domain radar</h2>
        <p class="small muted">Average score on cases that involve each domain. Weak bars point to the cases to play next.</p>
        ${domains.map(([dn, v]) => `<div class="dbar"><span>${esc(dn)}</span><div class="bar"><i data-w="${v.avg ?? 0}"></i></div><span>${v.avg ?? '-'}</span></div>`).join('')}
      </div>
      <div class="card">
        <h2>Calibration</h2>
        <p class="small muted">Average score by the confidence you stated. Scores should rise with confidence.</p>
        <table><tr><th>Confidence</th><th>Decisions</th><th>Average</th></tr>
        ${['low', 'medium', 'high'].map((k) => `<tr><td>${k}</td><td>${cal[k].n}</td><td>${cal[k].avg ?? '-'}</td></tr>`).join('')}</table>
      </div>
      ${heatDomains.length ? `<div class="card"><h2>Move heatmap</h2><p class="small muted">Average futures score by move and spine domain.</p><div class="scroll"><table><tr><th>Move</th>${heatDomains.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>
        ${moves.map((m) => `<tr><td>${m}</td>${heatDomains.map((dn) => `<td>${s.heatmap[m]?.[dn] ?? ''}</td>`).join('')}</tr>`).join('')}</table></div></div>` : ''}
      ${s.forecasts.items.length ? `<div class="card"><h2>Resolved forecasts</h2><div class="scroll"><table><tr><th>Scenario</th><th>You</th><th>Outcome</th><th>Points</th><th>House</th></tr>
        ${s.forecasts.items.map((f) => `<tr><td><a href="#/future/${esc(f.id)}">${esc(f.id)}</a></td><td>${f.prob}%</td><td>${esc(f.outcome)}</td><td>${f.total}</td><td>${f.house}${f.beat ? ' · beat' : ''}</td></tr>`).join('')}</table></div></div>` : ''}
    `);
  });

  route(/^\/login$/, async () => {
    render(html`<div class="card"><h1>Sign in</h1><form id="f">
      <label for="u">Username</label><input id="u" autocomplete="username" required>
      <label for="p">Password</label><input id="p" type="password" autocomplete="current-password" required>
      <div id="msg"></div><p><button class="primary" type="submit">Sign in</button></p></form>
      <p class="small">New here? <a href="#/register">Create an account</a>.</p></div>`);
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const d = await api('/login', { username: $('#u').value, password: $('#p').value }); state.me = d.user; location.hash = '#/'; }
      catch (err) { $('#msg').innerHTML = errorBox(err); }
    });
  });

  route(/^\/register$/, async () => {
    const y = new Date().getFullYear();
    const upgrading = state.me && state.me.isGuest;
    render(html`<div class="card"><h1>${upgrading ? 'Save your progress' : 'Create an account'}</h1>${upgrading ? '<p class="small">Your guest progress, codex and rank move to the new account.</p>' : ''}<form id="f">
      <label for="u">Username</label><input id="u" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+">
      <p class="small muted">3 to 20 letters, numbers or underscores. Do not use your real name.</p>
      <label for="p">Password</label><input id="p" type="password" autocomplete="new-password" required minlength="10">
      <label for="b">Birth year</label><input id="b" type="number" inputmode="numeric" min="${y - 110}" max="${y}" required>
      <p class="small muted">Players must be 13 or older. Players under 18 start with a private profile. The game stores no real name, location or contacts.</p>
      <div id="msg"></div><p><button class="primary" type="submit">Create account</button></p></form></div>`);
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const d = await api('/register', { username: $('#u').value, password: $('#p').value, birthYear: Number($('#b').value) }); state.me = d.user; location.hash = '#/'; }
      catch (err) { $('#msg').innerHTML = errorBox(err); }
    });
  });

  route(/^\/logout$/, async () => { await api('/logout', {}); state.me = null; location.hash = '#/'; });

  // ---------- catalog ----------
  route(/^\/cases(?:\/(\d))?$/, async (tierArg) => {
    needLogin();
    const d = await api('/catalog');
    const show = Number(tierArg || d.tier);
    const cases = d.cases.filter((c) => c.tier === show);
    render(html`
      <h1>Season 1 · Catalog cases</h1>
      <p class="small muted">You hold Tier ${d.tier}, ${esc(tierTitle(d.tier))}. A tier opens after ${d.unlockAt} cases in the tier below. Replays teach but only your first play scores.</p>
      <div class="tabs">${[1, 2, 3, 4, 5, 6].map((t) => `<button type="button" data-tier="${t}" aria-pressed="${t === show}" ${t > d.tier ? 'disabled' : ''}>Tier ${t}</button>`).join('')}</div>
      <div class="card list">${cases.map((c) => c.locked
        ? `<a class="item locked" href="#/cases/${show}" aria-disabled="true"><span>${c.num}. ${esc(c.title)}</span><span>Locked</span></a>`
        : `<a class="item" href="#/case/${c.num}"><span>${c.num}. ${esc(c.title)}</span><span class="${c.best != null ? 'best' : 'muted'}">${c.best != null ? c.best : 'Play'}</span></a>`).join('')}</div>`);
    bind('[data-tier]', 'click', (e) => { location.hash = '#/cases/' + e.currentTarget.dataset.tier; });
  });

  route(/^\/case\/(\d+)$/, async (num) => {
    needLogin();
    const d = await api('/catalog/' + num);
    if (d.prior) return renderCaseReveal(d.case, d.prior, true);
    const c = d.case;
    const pick = { domains: [], spine: null, stratagem: '', confidence: '' };
    const groups = [...new Set(state.tax.stratagems.map((s) => s.group))];
    render(html`
      <p class="small"><a href="#/cases/${c.tier}">Tier ${c.tier}</a> · Case ${c.num}</p>
      <h1>${esc(c.title)}</h1>
      <div class="card prose"><div class="label">Cold open</div><p>${md(c.cold_open)}</p></div>
      <div class="card">
        <h2>1. Name the domains</h2>
        <p class="small muted">Pick the two or three domains that decided this case.</p>
        <div class="chips" id="doms">${state.tax.domains.map((dn) => `<button type="button" class="chip" data-d="${esc(dn)}" aria-pressed="false">${esc(dn)}</button>`).join('')}</div>
        <div id="spineBox" hidden><h3>Which one is the spine?</h3><div class="chips" id="spine"></div></div>
      </div>
      ${c.withStratagem ? `<div class="card"><h2>2. Name the stratagem</h2>
        <label for="strat">Stratagem the Party ran</label>
        <select id="strat"><option value="">Choose one</option>${groups.map((g) => `<optgroup label="${esc(g)}">${state.tax.stratagems.filter((s) => s.group === g).map((s) => `<option value="${s.code}">${s.code}, ${esc(s.name)}</option>`).join('')}</optgroup>`).join('')}</select></div>` : ''}
      <div class="card"><h2>${c.withStratagem ? '3' : '2'}. How sure are you?</h2>${segmented('confidence', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], '')}</div>
      <div id="msg"></div>
      <p><button class="primary" id="go" disabled>Lock it in</button></p>`);
    const update = () => {
      $$('#doms .chip').forEach((b) => b.setAttribute('aria-pressed', String(pick.domains.includes(b.dataset.d))));
      if (!pick.domains.includes(pick.spine)) pick.spine = null;
      $('#spineBox').hidden = pick.domains.length < 2;
      $('#spine').innerHTML = pick.domains.map((dn) => `<button type="button" class="chip" data-s="${esc(dn)}" aria-pressed="${dn === pick.spine}">${esc(dn)}</button>`).join('');
      bind('[data-s]', 'click', (e) => { pick.spine = e.currentTarget.dataset.s; update(); }, $('#spine'));
      $('#go').disabled = !(pick.domains.length && pick.confidence && (!c.withStratagem || pick.stratagem));
    };
    bind('#doms .chip', 'click', (e) => {
      const dn = e.currentTarget.dataset.d;
      if (pick.domains.includes(dn)) pick.domains = pick.domains.filter((x) => x !== dn);
      else if (pick.domains.length < 3) pick.domains.push(dn);
      update();
    });
    if (c.withStratagem) $('#strat').addEventListener('change', (e) => { pick.stratagem = e.target.value; update(); });
    wireSeg((_, v) => { pick.confidence = v; update(); });
    $('#go').addEventListener('click', async () => {
      $('#go').disabled = true;
      try {
        const r = await api(`/catalog/${c.num}/play`, { ...pick, spine: pick.spine || (pick.domains.length === 1 ? pick.domains[0] : null), seconds: Math.round((Date.now() - state.viewStart) / 1000) });
        renderCaseReveal(r.case, r.play, false, r.tier);
      } catch (err) { $('#msg').innerHTML = errorBox(err); $('#go').disabled = false; }
    });
  });

  function renderCaseReveal(c, play, earlier, tier) {
    const b = play.breakdown;
    const next = c.num < 120 ? c.num + 1 : null;
    render(html`
      <p class="small"><a href="#/cases/${c.tier}">Tier ${c.tier}</a> · Case ${c.num}</p>
      <h1>${esc(c.title)}</h1>
      <div class="card">
        <div class="row spread"><div><div class="label">${earlier ? 'Your scored play' : 'Score'}</div><div class="score">${play.score}</div></div>
        <div class="small">Domains ${b.domainPts} · Spine ${b.spinePts}${b.stratOn ? ` · Stratagem ${b.stratPts}` : ''} · Calibration ${b.calibration >= 0 ? '+' : ''}${b.calibration}</div></div>
        <h3>Domains</h3>
        <div class="chips">${state.tax.domains.filter((dn) => c.domains.includes(dn) || (play.domains || []).includes(dn)).map((dn) => {
          const inCase = c.domains.includes(dn); const picked = (play.domains || []).includes(dn);
          return `<span class="chip ${picked ? (inCase ? 'hit' : 'miss') : ''}">${esc(dn)}${dn === c.spine ? ' (spine)' : ''}${picked ? '' : ' · missed'}</span>`;
        }).join('')}</div>
        ${b.stratOn ? `<p class="small">You named ${esc(stratName(play.stratagem))}. The case runs ${c.stratagems.map((s) => esc(stratName(s))).join(' and ')}.</p>` : c.stratagems.length ? `<p class="small muted">Stratagem in play: ${c.stratagems.map((s) => esc(stratName(s))).join(' and ')}. Stratagem calls score from Tier 3.</p>` : ''}
        ${tier && tier > c.tier && !earlier ? `<p class="best">Tier ${tier} is open.</p>` : ''}
      </div>
      <div class="card prose">
        <div class="label">Cold open</div><p>${md(c.cold_open)}</p>
        <div class="label">Documented</div><p>${md(c.documented)}</p>
        <div class="label">Argued</div><p>${md(c.argued)}</p>
        <div class="label">The gap</div><p>${md(c.gap_text)}</p>
        <div class="label">The fix</div><p>${md(c.fix)}</p>
        ${c.work ? `<div class="label">Where you could work on it</div><p>${md(c.work)}</p>` : ''}
        <p><span class="tag">${esc(c.stage)}</span><span class="tag">${esc(c.dimension)}</span><span class="tag">Gap ${esc(c.gap)}</span></p>
      </div>
      <p class="row">${next ? `<a class="btn primary" href="#/case/${next}">Next case</a>` : ''}<a class="btn" href="#/cases/${c.tier}">All Tier ${c.tier} cases</a></p>`);
  }

  // ---------- futures ----------
  route(/^\/futures(?:\/(\d))?$/, async (hArg) => {
    needLogin();
    const d = await api('/futures');
    const h = Number(hArg || 1);
    const names = { 1: 'Now, 2026 to 2028', 2: 'Near, 2029 to 2035', 3: 'Far, 2036 to 2051' };
    render(html`
      <h1>Season 2 · Futures</h1>
      ${d.open ? '' : '<p class="err">Season 2 opens at Tier 6.</p>'}
      <p class="small muted">Each scenario scores your move once. Its forecast stays open until an admin resolves it against the named source, and you can update it until then.</p>
      <div class="tabs">${[1, 2, 3].map((x) => `<button type="button" data-h="${x}" aria-pressed="${x === h}">${names[x]}</button>`).join('')}</div>
      <div class="card list">${d.scenarios.filter((s) => s.horizon === h).map((s) => `<a class="item" href="#/future/${s.id}"><span><b>${s.id}</b> ${esc(s.title)}<br><span class="small muted">${esc(s.arc)}${s.world ? ' · ' + esc(s.world) : ''} · resolves by ${s.resolvesBy}</span></span>
        <span class="small">${s.score != null ? `<span class="best">${s.score}</span>` : 'Play'}${s.forecast != null ? `<br>${s.forecast}%` : ''}${s.status !== 'open' ? `<br>${esc(s.status)}` : ''}</span></a>`).join('')}</div>`);
    bind('[data-h]', 'click', (e) => { location.hash = '#/futures/' + e.currentTarget.dataset.h; });
  });

  route(/^\/future\/(F\d{3})$/, async (id) => {
    needLogin();
    const d = await api('/futures/' + id);
    const s = d.scenario;
    const pick = { move: d.prior?.move || '', confidence: '' };
    const revealed = !!d.prior;
    const moves = ['Detect', 'Disrupt', 'Defend'];
    render(html`
      <p class="small"><a href="#/futures/${s.horizon}">Horizon ${s.horizon}</a> · ${esc(s.id)} · ${esc(s.window)}${s.world ? ' · World ' + esc(s.world) : ''}</p>
      <h1>${esc(s.title)}</h1>
      <div class="card prose">
        <div class="label">Cold open</div><p>${md(s.cold_open)}</p>
        <div class="label">Baseline</div><p>${md(s.baseline)}</p>
        <div class="label">Core event</div><p>${md(s.core_event)}</p>
        <div class="label">Signposts</div><p>${md(s.signposts)}</p>
      </div>
      <div class="card">
        <h2>${revealed ? 'Your move' : 'Make your move'}</h2>
        <div class="moves">${moves.map((m) => `<button type="button" class="move ${m}" data-m="${m}" aria-pressed="${pick.move === m}" ${revealed ? 'disabled' : ''}>
          <b>${m}${revealed ? ` · <span class="pts">${s.moves[m].score}</span>${m === s.best ? ' · <span class="best">best play</span>' : ''}` : ''}</b><span>${md(s.moves[m].text)}</span></button>`).join('')}</div>
        ${revealed ? `<p><span class="label">Scored</span> <span class="score">${d.prior.score}</span></p>` : `<h3>How sure are you?</h3>${segmented('confidence', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], '')}
        <div id="msg"></div><p><button class="primary" id="go" disabled>Lock it in</button></p>`}
      </div>
      ${revealed ? revealFuture(s) : ''}
      <div class="card" id="fc"></div>`);
    renderForecast(s);
    if (!revealed) {
      const update = () => { $$('.move').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === pick.move))); $('#go').disabled = !(pick.move && pick.confidence); };
      bind('.move', 'click', (e) => { pick.move = e.currentTarget.dataset.m; update(); });
      wireSeg((_, v) => { pick.confidence = v; update(); });
      $('#go').addEventListener('click', async () => {
        $('#go').disabled = true;
        try { await api(`/futures/${s.id}/play`, { ...pick, seconds: Math.round((Date.now() - state.viewStart) / 1000) }); go(); }
        catch (err) { $('#msg').innerHTML = errorBox(err); $('#go').disabled = false; }
      });
    }
  });

  function revealFuture(s) {
    return html`<div class="card prose">
      <div class="label">The play</div><p>${md(s.play)}</p>
      <div class="label">Ancestor lesson</div><p>${md(s.ancestor_lesson)}</p>
      <p class="small">Ancestors: ${s.ancestors.map((a) => `<a href="#/case/${a.num}">${a.num}. ${esc(a.title || '')}</a>`).join(' · ')}</p>
      <div class="label">The gap</div><p>${md(s.gap_text)}</p>
      <div class="label">The fix</div><p>${md(s.fix)}</p>
      ${s.work ? `<div class="label">Where you could work on it</div><p>${md(s.work)}</p>` : ''}
      <p><span class="tag">${esc(s.stage)}</span><span class="tag">${esc(s.dimension)}</span><span class="tag">${s.stratagem === 'none' ? 'No stratagem' : esc(stratName(s.stratagem))}</span><span class="tag">Gap ${esc(s.gap)}</span>
      ${s.domains.map((dn) => `<span class="tag ${dn === s.spine ? 'strong' : ''}">${esc(dn)}</span>`).join('')}</p>
      <p class="small muted">House estimate for the core event: ${esc(s.house_term)}, ${s.house} percent${s.world ? ', inside this world' : ''}. Impact ${s.impact} of 5.</p>
    </div>`;
  }

  function renderForecast(s) {
    const f = s.forecast;
    const box = $('#fc');
    const open = f.status === 'open';
    const val = f.mine ?? 50;
    box.innerHTML = html`<h2>Forecast</h2><p><b>${md(f.question)}</b></p><p class="small muted">${md(f.source)}</p>
      ${open ? `<div class="slider"><input type="range" id="prob" min="1" max="99" value="${val}" aria-label="Your probability"><output id="pv">${val}%</output></div>
      <div id="fmsg"></div><p><button class="primary" id="fgo">${f.mine != null ? 'Update forecast' : 'Submit forecast'}</button></p>` : `<p>Status: <b>${esc(f.status)}</b>${f.mine != null ? ` · your forecast ${f.mine}%` : ''}</p>`}
      ${f.house != null ? `<p class="small">House: ${f.house}%. Beat the House on Brier points and earn 10 more.</p>` : '<p class="small muted">The House estimate appears after your first forecast.</p>'}
      ${f.updatedAt ? `<p class="small muted">Last updated ${esc(f.updatedAt)} UTC</p>` : ''}`;
    if (!open) return;
    $('#prob').addEventListener('input', (e) => { $('#pv').textContent = e.target.value + '%'; });
    $('#fgo').addEventListener('click', async () => {
      try { const r = await api(`/futures/${s.id}/forecast`, { prob: Number($('#prob').value) }); s.forecast = { ...s.forecast, ...r.forecast }; renderForecast(s); }
      catch (err) { $('#fmsg').innerHTML = errorBox(err); }
    });
  }

  // ---------- leaderboards ----------
  route(/^\/boards(?:\/(.+))?$/, async (bArg) => {
    const board = decodeURIComponent(bArg || 'daily');
    const d = await api('/leaderboard/' + encodeURIComponent(board));
    const tabs = [['daily', 'Today'], ['xp', 'Rank'], ['mastery', 'Study'], ['forecast', 'Forecast'], ['crew', 'Crews']];
    const cols = {
      daily: [['name', 'Player'], ['score', 'Score'], ['stars', 'Stars']],
      xp: [['name', 'Player'], ['level', 'Level'], ['title', 'Title'], ['xp', 'XP'], ['won', 'Won']],
      mastery: [['name', 'Player'], ['total', 'Total'], ['avg', 'Average'], ['plays', 'Plays']],
      forecast: [['name', 'Player'], ['avg', 'Brier avg'], ['resolved', 'Resolved'], ['houseWins', 'House wins']],
      crew: [['name', 'Crew'], ['score', 'Score'], ['members', 'Members']],
    }[board] || [['name', 'Player'], ['avg', 'Average'], ['plays', 'Plays']];
    render(html`<h1>Leaderboards</h1>
      <div class="tabs">${tabs.map(([k, l]) => `<button type="button" data-b="${k}" aria-pressed="${k === board}">${l}</button>`).join('')}</div>
      <label for="dom">Domain boards</label><select id="dom"><option value="">Choose a domain</option>${state.tax.domains.map((dn) => `<option ${dn === board ? 'selected' : ''}>${esc(dn)}</option>`).join('')}</select>
      <div class="card scroll">${d.rows.length ? `<table><tr><th>#</th>${cols.map(([, l]) => `<th>${l}</th>`).join('')}</tr>
        ${d.rows.map((x) => `<tr class="${x.me ? 'me' : ''}"><td>${x.rank}</td>${cols.map(([k]) => `<td>${esc(x[k])}${k === 'name' && x.specialist ? ' · specialist' : ''}</td>`).join('')}</tr>`).join('')}</table>` : '<p class="muted">No entries yet.</p>'}</div>
      <p class="small muted">Players with private profiles appear by number. Crews need three members to rank. Domain boards need three plays on cases with that spine.</p>`);
    bind('[data-b]', 'click', (e) => { location.hash = '#/boards/' + e.currentTarget.dataset.b; });
    $('#dom').addEventListener('change', (e) => { if (e.target.value) location.hash = '#/boards/' + encodeURIComponent(e.target.value); });
  });

  // ---------- crew ----------
  route(/^\/crew$/, async () => {
    needLogin();
    const d = await api('/crew');
    const c = d.crew;
    if (!c) {
      render(html`<h1>Crews</h1><p>A crew holds three to six players. The crew score is the harmonic mean of member averages times 1.1, so every member has to play.</p>
        <div class="grid"><div class="card"><h2>Start a crew</h2><label for="n">Crew name</label><input id="n" maxlength="30"><p><button class="primary" id="mk">Create</button></p></div>
        <div class="card"><h2>Join a crew</h2><label for="code">Invite code</label><input id="code" maxlength="8" autocapitalize="characters"><p><button id="jn">Join</button></p></div></div><div id="msg"></div>`);
      $('#mk').addEventListener('click', async () => { try { await api('/crew/create', { name: $('#n').value }); go(); } catch (e) { $('#msg').innerHTML = errorBox(e); } });
      $('#jn').addEventListener('click', async () => { try { await api('/crew/join', { code: $('#code').value }); go(); } catch (e) { $('#msg').innerHTML = errorBox(e); } });
      return;
    }
    const captain = c.captainId === state.me.id;
    render(html`<h1>${esc(c.name)}</h1>
      <div class="card"><div class="row spread"><div><div class="label">Crew score</div><div class="score">${c.score}</div></div>
      <div class="small">Invite code <b>${esc(c.inviteCode)}</b><br>${c.memberCount} of 6 members</div></div>
      ${c.memberCount < 3 ? '<p class="small muted">Crews rank once they have three members.</p>' : ''}</div>
      <div class="card scroll"><table><tr><th>Member</th><th>Role</th><th>Average</th><th>Plays</th>${captain ? '<th></th>' : ''}</tr>
      ${c.members.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td>${m.avg ?? '-'}</td><td>${m.plays}</td>${captain ? `<td>${m.id !== state.me.id ? `<select data-role="${m.id}" aria-label="Role for ${esc(m.name)}"><option value="">Change</option><option value="strategist">Strategist</option><option value="analyst">Analyst</option><option value="member">Member</option><option value="captain">Make captain</option><option value="remove">Remove</option></select>` : ''}</td>` : ''}</tr>`).join('')}</table></div>
      <p class="small muted">Crew chat is not part of this version. Use the invite code only with people you know.</p>
      <div id="msg"></div><p><button id="lv">Leave crew</button></p>`);
    bind('[data-role]', 'change', async (e) => {
      const v = e.target.value; if (!v) return;
      try { await api('/crew/role', v === 'remove' ? { userId: Number(e.target.dataset.role), remove: true } : { userId: Number(e.target.dataset.role), role: v }); go(); }
      catch (err) { $('#msg').innerHTML = errorBox(err); }
    });
    $('#lv').addEventListener('click', async () => { if (confirm('Leave this crew?')) { await api('/crew/leave', {}); go(); } });
  });

  // ---------- settings ----------
  route(/^\/settings$/, async () => {
    needLogin();
    const u = (await api('/me')).user;
    render(html`<h1>Settings</h1>
      <div class="card"><h2>Profile</h2>
        <label class="inline"><input type="checkbox" id="pub" ${u.profilePublic ? 'checked' : ''}> Show my username on leaderboards</label>
        ${u.isMinor ? '' : `<label class="inline"><input type="checkbox" id="res" ${u.researchConsent ? 'checked' : ''}> Include my anonymized decisions in published research</label>`}
        <label for="lim">Daily time limit in minutes (blank for none)</label><input id="lim" type="number" min="10" max="600" value="${u.dailyLimitMin ?? ''}">
        <p><button class="primary" id="save">Save</button></p><div id="m1"></div></div>
      <div class="card"><h2>Password</h2><label for="cp">Current password</label><input id="cp" type="password" autocomplete="current-password">
        <label for="np">New password</label><input id="np" type="password" autocomplete="new-password" minlength="10"><p><button id="pw">Change password</button></p><div id="m2"></div></div>
      <div class="card"><h2>Delete account</h2><p class="small">This removes your account, plays, forecasts and crew membership for good.</p>
        <label for="dp">Password</label><input id="dp" type="password" autocomplete="current-password"><p><button id="del">Delete my account</button></p><div id="m3"></div></div>`);
    $('#save').addEventListener('click', async () => {
      try {
        const body = { profilePublic: $('#pub').checked, dailyLimitMin: $('#lim').value === '' ? null : Number($('#lim').value) };
        if ($('#res')) body.researchConsent = $('#res').checked;
        state.me = (await api('/settings', body)).user; $('#m1').innerHTML = '<p class="best">Saved.</p>';
      } catch (e) { $('#m1').innerHTML = errorBox(e); }
    });
    $('#pw').addEventListener('click', async () => {
      try { await api('/settings', { currentPassword: $('#cp').value, newPassword: $('#np').value }); $('#m2').innerHTML = '<p class="best">Password changed.</p>'; }
      catch (e) { $('#m2').innerHTML = errorBox(e); }
    });
    $('#del').addEventListener('click', async () => {
      if (!confirm('Delete your account for good?')) return;
      try { await api('/delete-account', { password: $('#dp').value }); state.me = null; location.hash = '#/'; }
      catch (e) { $('#m3').innerHTML = errorBox(e); }
    });
  });

  // ---------- admin ----------
  route(/^\/admin$/, async () => {
    needLogin();
    const d = await api('/admin/overview');
    render(html`<h1>Admin</h1>
      <div class="grid">${[['Players', d.users], ['Plays', d.plays], ['Forecasts', d.forecasts], ['Crews', d.crews]].map(([l, n]) => `<div class="card"><div class="label">${l}</div><div class="score">${n}</div></div>`).join('')}</div>
      <p><a class="btn" href="/api/admin/export.csv">Export research CSV</a> <span class="small muted">Consenting adults only, identities hashed.</span></p>
      <h2>Resolve forecasts</h2>
      <p class="small muted">Mark yes or no only against the named source, and record that source in the note. Closed stops new forecasts without scoring. Void removes a question from scoring.</p>
      <div class="card scroll"><table><tr><th>ID</th><th>Question</th><th>House</th><th>Crowd</th><th>Status</th></tr>
      ${d.questions.map((q) => `<tr><td><a href="#/future/${q.id}">${q.id}</a><br><span class="small muted">by ${q.year}</span></td><td>${md(q.question)}<br><span class="small muted">${md(q.source)}</span></td><td>${q.house}%</td><td>${q.crowd ?? '-'}${q.n ? ` (${q.n})` : ''}</td>
        <td><select data-q="${q.id}">${['open', 'closed', 'yes', 'no', 'void'].map((s) => `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <input data-note="${q.id}" placeholder="Source and date" value="${esc(q.note)}"><button data-save="${q.id}">Save</button><div data-msg="${q.id}"></div></td></tr>`).join('')}</table></div>`);
    bind('[data-save]', 'click', async (e) => {
      const id = e.currentTarget.dataset.save;
      const out = $(`[data-msg="${id}"]`);
      try { await api('/admin/resolve', { id, status: $(`[data-q="${id}"]`).value, note: $(`[data-note="${id}"]`).value }); out.innerHTML = '<span class="best">Saved</span>'; }
      catch (err) { out.innerHTML = errorBox(err); }
    });
  });

  // ---------- time on task ----------
  let lastBeat = Date.now();
  setInterval(async () => {
    const now = Date.now();
    const secs = Math.round((now - lastBeat) / 1000);
    lastBeat = now;
    if (!state.me || document.visibilityState !== 'visible') return;
    try {
      const r = await api('/heartbeat', { seconds: Math.min(secs, 90) });
      const b = $('#banner');
      if (r.overLimit) { b.textContent = 'You reached the daily limit you set. Scored play is paused until tomorrow.'; b.hidden = false; }
      else if (r.breakPrompt) { b.textContent = `You have played ${r.minutesToday} minutes today. Time for a break.`; b.hidden = false; }
      else b.hidden = true;
    } catch { /* offline */ }
  }, 60000);

  // ---------- shared with game.js ----------
  window.TDW = { $, $$, esc, md, api, html, render, applyWidths, errorBox, bind, segmented, wireSeg, route, go, nav, state, needLogin, main };

  // ---------- boot ----------
  (async function boot() {
    try {
      const [me, tax, meta] = await Promise.all([api('/me'), api('/taxonomy'), api('/game/meta')]);
      state.me = me.user; state.tax = tax; state.meta = meta;
    } catch (e) { render(errorBox(e)); return; }
    // game.js registers its routes after this script runs. Wait for every script before the first route.
    if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
    window.addEventListener('hashchange', go);
    if (DEMO) {
      // Route in-page links directly, whatever the host frame does with anchors.
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#/"]');
        if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const to = a.getAttribute('href');
        if (location.hash === to) go(); else location.hash = to;
      }, true);
    }
    go();
  })();
})();

'use strict';
/* TDW Operations: the board game client. Talks to the server, which holds every game state. */
(function () {
  const T = window.TDW;
  if (!T) return;
  const { $, $$, esc, md, api, html, render, applyWidths, errorBox, bind, route, state, needLogin } = T;
  // The single-page demo runs without a server. It keeps progress in this browser and hides accounts and challenges.
  const DEMO = !!window.TDW_DEMO;
  // Help text shared by every build. It comes from parts/help.json.
  const HELP = {"schema":1,"note":"Player-facing help text shared by all four builds. patch-v9.py embeds it in the bundle. The house style applies, and test/guide.test.js checks it.","how":[{"id":"tiers","when":"always","title":"Tiers","intro":"Tier sets the difficulty. The record sets a tier for each operation, and free play lets you pick another.","items":[{"label":"Tiers 1 to 6","text":"Higher tiers are harder on the whole. Each step up shortens the clock to Consume, enlarges the opponent's base hand or starts the opponent with more pressure. From Tier 2 the opponent starts with pressure on the lever. From Tier 3 it starts on every domain in play."},{"label":"Tier 7","text":"Tier 7 sits above Tier 6. The clock to Consume runs one point shorter than at Tier 6. A fourth card joins the opponent's hand from turn 3, and every domain in play opens at 2 pressure. On most operations a scripted player rarely wins it."},{"label":"Where tiers apply","text":"Free play offers every tier. The campaign climbs from Tier 1 to Tier 6 along each arc. The daily runs at Tier 3. A win scores 100 more for each tier you climb."},{"label":"Difficulty labels","text":"Each tier of each operation carries a label from Gentle to Brutal. The label reads the share of 400 games a simple scripted player won at that tier. People may do better or worse."}]},{"id":"holdings","when":"holdings","title":"Holdings","intro":"Some operations give your side ground it must pay to keep. The Holdings panel lists each one.","items":[{"label":"Cost and denial","text":"A holding charges you its cost every turn. The cost comes off your shields in its domain first and then lands as pressure. While you keep a holding it denies the rival part of its leverage."},{"label":"Consuming","text":"A holding turns consuming when its cost is more than what it denies. Every turn you keep a consuming holding counts as an act against your own position."},{"label":"Giving one up","text":"Give up a holding for 1 action. It stops costing you and stops denying the rival. Some holdings cost legitimacy to give up. You cannot take a holding back."}],"guide":"holdings"},{"id":"reach","when":"reach","title":"Reach and permits","intro":"Some operations list acts with a strong effect. Each act carries a permit for your side, and the Reach panel shows it.","items":[{"label":"Open","text":"An open act works at no price. Use it for the actions it names, up to its limit."},{"label":"Has a price","text":"A priced act works but costs your side legitimacy. The game counts it as an act against your own position, and it often helps the rival."},{"label":"Closed to you","text":"A closed act stays open to the rival and barred to your side. The panel still lists it. Open Why to read the evidence cards behind the permit."},{"label":"The report","text":"When the run ends the report counts each closed act the rival used. Permits are the game's reading of the evidence and not a count of anything."}],"guide":"reach"},{"id":"forecast","when":"forecast","title":"Forecast","intro":"The Forecast page lists claims from the book's prediction ledger. The ledger dated each claim before anyone knew how it would resolve.","items":[{"label":"Your forecast","text":"Enter your chance that a claim holds, from 1 to 99 percent. Lock it before the check date. A locked forecast cannot change."},{"label":"The score","text":"When the result is in the game scores you with the Brier score. The score is the square of the miss, so lower is better. You see the book's own probability and a cheap reference answer beside yours."},{"label":"Where results come from","text":"The site owner copies each result from the project's scoring log. The page only mirrors that log. A few claims prove little."}]}],"hints":{"factions":{"text":"This panel shows every side in the operation. Each rival banks its own leverage toward Consume. Legitimacy falls with some acts and recovers on a coherent turn. Below the marked line a faction suffers an entropy spike.","how":"factions"},"leaders":{"text":"A leader stands in one domain and changes the rules there. Read the line under each name. Move each of yours once a turn for 1 action.","how":"factions"},"holdings":{"text":"Each holding costs you every turn and keeps some leverage from the rival. A holding marked consuming costs more than it denies. Give it up when it stops paying.","how":"holdings"},"reach":{"text":"Each act here carries a permit for your side. Open acts cost nothing extra. Priced acts work and cost legitimacy. Closed acts stay barred to you, and Why shows the evidence.","how":"reach"},"tier7":{"text":"You are playing Tier 7, the top tier. Every domain in play opens at 2 pressure and the opponent's hand grows sooner. On most operations a scripted player rarely wins here.","how":"tiers"}},"ui":{"hintOk":"Got it","hintMore":"More in How to play","guideStart":"Try the guided run","guideLabel":"Guided run","guideHome":"Guided run","guideOp":"Learn the panel first","guideNext":"Play the full operation","forecastHow":"How forecasts score","difficulty":{"bands":[{"min":85,"label":"Gentle"},{"min":60,"label":"Fair"},{"min":35,"label":"Hard"},{"min":10,"label":"Very hard"},{"min":0,"label":"Brutal"}],"won":"A scripted player won {n} percent of its games at this tier.","note":"Each label reads the share of games a simple scripted player won. People may do better or worse."},"glossTitle":"Glossary","glossIntro":"The terms the board and its panels use. A term shows here when this build has the rule behind it.","glossFilter":"Filter the terms","glossNone":"No term matches.","glossSee":"See also","glossLink":"Glossary","glossName":"{term}, in the glossary","glossCountOne":"{n} term","glossCountMany":"{n} terms","glossOpen":"Open the glossary","progress":{"title":"Your progress","link":"Save or load your progress","intro":"Your progress lives in this browser only. Save it to a file to keep a copy or to carry it to another browser.","now":"In this browser now","save":"Save my progress to a file","saved":"Check your downloads for the file.","load":"Load progress from a file","loadNote":"Loading a file replaces the progress in this browser. Save a copy first if you want to keep it.","holds":"The file holds","replace":"Replace my progress with this file","replaceAgain":"Tap again to replace your progress","loaded":"Progress loaded.","tooBig":"This file is too large to be a TDW progress file.","notFile":"This is not a TDW progress file.","clear":"Clear my progress","clearAgain":"Tap again to clear everything","cleared":"Progress cleared.","rows":{"level":"Level","xp":"Experience points","played":"Operations played","won":"Operations won","captured":"Stratagems captured","records":"Result codes","forecasts":"Forecasts locked","arcs":"Campaign arcs with a step won"},"noStore":"This browser keeps no progress after you close the page. Save to a file before you leave."},"feedback":{"email":"","label":"Send feedback by email","subject":"TDW feedback","intro":"Tell us what worked and what did not. Name the operation and the tier if you can."}},"glossary":[{"id":"actions","term":"Actions","when":"always","text":"Each move costs actions, shown as blue dots on the board. Most operations give 3 a turn and 1 more for every 2 points of coherence. Two or more left unspent at the end of a turn can cost coherence.","see":["coherence","detect","disrupt","defend"]},{"id":"domain","term":"Domain","when":"always","text":"One of the twelve fields the contest runs through, from Kinetic to Data and Surveillance. Each domain holds pressure and shields. Bold outlines mark the domains in play.","see":["pressure","shield","lever","gated","load","lock"]},{"id":"pressure","term":"Pressure","when":"always","text":"Strain on a domain, from 0 to 5. At 3 or more the domain pays the opponent 1 leverage each turn. At 5 the domain falls and pays 2.","see":["leverage","shield","slope"]},{"id":"shield","term":"Shield","when":"always","text":"A shield absorbs 1 pressure. Defend adds one for 1 action.","see":["defend","pressure"]},{"id":"slope","term":"Slope","when":"always","text":"Pressure that grows by itself each turn until you clear it. Disrupt on the domain clears slopes before pressure.","see":["disrupt","offer"]},{"id":"leverage","term":"Leverage","when":"always","text":"What the opponent banks from domains under strain. Leverage moves the operation along its lifecycle toward Consume.","see":["lifecycle","consume"]},{"id":"lifecycle","term":"Lifecycle","when":"always","text":"The five stages of an operation. Attract leads to Accommodate, then Control and Extract, and last to Consume.","see":["leverage","consume"]},{"id":"consume","term":"Consume","when":"always","text":"The last stage. The opponent wins when the operation reaches Consume before the clock runs out.","see":["lifecycle"]},{"id":"lever","term":"Lever","when":"always","text":"The one domain an operation turns on. You may name it once. A right guess cuts leverage by 2 and makes Disrupts there cost 1 less. A wrong guess gives the opponent 2 and costs coherence.","see":["domain","stars"]},{"id":"coherence","term":"Coherence","when":"always","text":"How well your side acts as one, from 0 to 5. A turn with a shield that absorbs a hit, a Disrupt on a card you detected or a right lever raises it by 1. A turn with two idle actions or a fallen domain lowers it by 1. A turn with both changes nothing.","see":["actions"]},{"id":"detect","term":"Detect","when":"always","text":"Costs 1 action and reveals a hidden card.","see":["facedown","unattributed"]},{"id":"disrupt","term":"Disrupt","when":"always","text":"Costs 2 actions, and 1 less at a named lever. On a card you can name it cancels the card and captures it for your codex. On a domain it clears slopes and then pressure.","see":["codex","slope"]},{"id":"defend","term":"Defend","when":"always","text":"Costs 1 action and adds a shield to a domain.","see":["shield"]},{"id":"card","term":"Stratagem card","when":"always","text":"A move the opponent aims at a domain. The card lands when you end the turn unless you disrupt it.","see":["disrupt","codex","proxy"]},{"id":"facedown","term":"Face-down card","when":"always","text":"A card that shows nothing. Detect it before you answer it.","see":["detect"]},{"id":"unattributed","term":"Unattributed card","when":"always","text":"A card that shows a threat and hides its name. The threat may be a feint.","see":["detect","decoy"]},{"id":"decoy","term":"Decoy","when":"always","text":"A false card that holds nothing. Detect shows it for what it is.","see":["detect"]},{"id":"offer","term":"Offer","when":"always","text":"A card that pays you now and costs you now or later. Leave it and it passes.","see":["slope"]},{"id":"gated","term":"Gated domain","when":"always","text":"A domain where you hold no authority yet, marked GATED. Spend 1 action to open the gate before you act there.","see":["domain","dimension"]},{"id":"load","term":"Load-bearing domain","when":"always","text":"A domain the operation leans on, marked LOAD. Under Criticality the opponent aims there more often. A fall there moves the operation a full stage.","see":["lever","dimension"]},{"id":"dimension","term":"Dimension","when":"always","text":"The physics an operation runs under, one of ten. Each dimension changes one rule and names a counter.","see":["lens"],"how":"dimensions"},{"id":"lens","term":"Lens","when":"always","text":"An optional bonus tied to one dimension. Attribution, the Asymmetry lens, is open from the start. Win an operation under a dimension to unlock its lens. Boot camp and guided runs unlock none.","see":["dimension"],"how":"dimensions"},{"id":"doctrine","term":"Doctrine card","when":"always","text":"A card you may play once per operation. Each one unlocks at a level.","see":[]},{"id":"tier","term":"Tier","when":"always","text":"The difficulty of a run, from 1 to 7. The record sets a tier for each operation, and free play lets you pick another.","see":["tier7","difficulty"],"how":"tiers"},{"id":"tier7","term":"Tier 7","when":"always","text":"The top tier, above Tier 6. Every domain in play opens at 2 pressure.","see":["tier","difficulty"],"how":"tiers"},{"id":"difficulty","term":"Difficulty label","when":"always","text":"A label from Gentle to Brutal on each operation and tier. The label reads the share of 400 games a simple scripted player won there. People may do better or worse.","see":["tier"],"how":"tiers"},{"id":"stars","term":"Stars","when":"always","text":"One star means you held the line. Two mean the operation stopped before Extract. Three mean you cut the lever or kept leverage under 40 percent.","see":["lever","lifecycle"]},{"id":"faction","term":"Faction","when":"factions","text":"A side in an operation. Each faction has its own pressure and shields in every domain.","see":["legitimacy","pact","elsewhere"],"how":"factions"},{"id":"legitimacy","term":"Legitimacy","when":"legit","text":"A faction's standing, from 0 to 100. Some acts cost it and a coherent turn restores it. Below 25 a faction suffers an entropy spike.","see":["entropy","faction"],"how":"factions"},{"id":"entropy","term":"Entropy spike","when":"legit","text":"What a faction suffers below 25 legitimacy. Its own domains start to come apart.","see":["legitimacy"],"how":"factions"},{"id":"leader","term":"Leader","when":"leaders","text":"A figure or an office that stands in one domain and changes the rules there. Move each of yours once a turn for 1 action.","see":["faction"],"how":"factions"},{"id":"pact","term":"Pact","when":"pacts","text":"An agreement between factions. Members do not target each other while it holds. Some pacts stand against a third faction.","see":["faction"],"how":"factions"},{"id":"elsewhere","term":"Elsewhere","when":"multi","text":"Cards aimed at the other factions. You cannot answer them, but they shift the balance between the others.","see":["faction"],"how":"factions"},{"id":"holding","term":"Holding","when":"holdings","text":"Ground your side pays to keep. A holding costs you every turn and denies the rival part of its leverage.","see":["consuming","selfact"],"how":"holdings"},{"id":"consuming","term":"Consuming holding","when":"holdings","text":"A holding whose cost is more than what it denies. Each turn you keep it counts as an act against your own position.","see":["holding","selfact"],"how":"holdings"},{"id":"selfact","term":"Act against your own position","when":"selfact","text":"A move that weakens the side that makes it. The report lists each one with its type.","see":["consuming","permit"]},{"id":"reach","term":"Reach","when":"reach","text":"An act with a strong effect that carries a permit for your side.","see":["permit","evidence"],"how":"reach"},{"id":"permit","term":"Permit","when":"reach","text":"Open, priced or closed. Open acts cost nothing extra. Priced acts cost legitimacy. Closed acts stay barred to you. Each permit is the game's reading of its evidence cards.","see":["reach","evidence"],"how":"reach"},{"id":"evidence","term":"Evidence card","when":"reach","text":"A card that states one claim in the game's own words, with an id such as EV-001. The project keeps the source for each card, and some still wait for a check.","see":["permit"],"how":"reach"},{"id":"band","term":"Asymmetry band","when":"reach","text":"The three 2026 operations whose acts carry permits. The rival acts with no court, no press and no vote in the way. Some acts are closed to your side and some carry a price. They play at Tier 7 on the record.","see":["reach","tier7"],"how":"reach"},{"id":"watch","term":"Watch","when":"watch","text":"An operation on a subject that has not settled yet. It plays the record up to its last source.","see":[]},{"id":"forecast","term":"Forecast","when":"forecast","text":"Your chance, from 1 to 99 percent, that a dated claim holds. Lock it before the check date.","see":["brier","reference"],"how":"forecast"},{"id":"brier","term":"Brier score","when":"forecast","text":"The square of the miss between your chance and the result. Lower is better.","see":["forecast"],"how":"forecast"},{"id":"reference","term":"Cheap reference answer","when":"forecast","text":"A plain guess from a stated basis, such as a base rate. The game scores it beside you and the book.","see":["brier"],"how":"forecast"},{"id":"code","term":"Result code","when":"always","text":"A line that holds the seed and every action of a run. The game replays it to check the score.","see":["replay","challenge"]},{"id":"replay","term":"Replay","when":"always","text":"A finished run played back step by step from its result code.","see":["code"]},{"id":"challenge","term":"Challenge link","when":"always","text":"A link that fixes the operation, the tier and the seed, so two players face the same opening.","see":["code"]},{"id":"daily","term":"Daily","when":"always","text":"One operation for every player each day, at Tier 3. Your first finished run of the day counts.","see":[]},{"id":"arc","term":"Campaign arc","when":"always","text":"A chain of operations that climbs from Tier 1 to Tier 6. Win one to open the next.","see":["tier"]},{"id":"codex","term":"Codex","when":"always","text":"Your collection of the 36 stratagems. Disrupt a card to capture it.","see":["disrupt","card"],"how":"groups"},{"id":"bootcamp","term":"Boot camp","when":"always","text":"Six turns at The Gate at Canton in 1784 that teach the board.","see":["guide"]},{"id":"guide","term":"Guided run","when":"guides","text":"A short run of one operation at Tier 1 with coach steps. Each one teaches one panel.","see":["bootcamp"]},{"id":"lock","term":"Locked domain","when":"always","text":"A domain marked LOCK, where you cannot disrupt until the count runs out. One stratagem card sets the lock.","see":["disrupt","domain"]},{"id":"proxy","term":"Proxy card","when":"always","text":"A card marked PROXY, delivered through a third party. Disrupting it costs 1 more action. Where legitimacy is in play the faction that plays it loses some.","see":["card","legitimacy"]},{"id":"world","term":"World","when":"world","text":"A setting some operations run in, shown after the tier. Long Grind adds a turn and moves Consume 2 points later, and Unwinding moves it 2 sooner. Runaway and Machine Mandate feed the opponent's hand.","see":["consume","card"]}]};

  // ---------- icons ----------
  const ICON = {
    Kinetic: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
    Economic: '<path d="M3 21V11l5 3v-3l5 3v-3l5 3V5h3v16z"/>',
    Financial: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    Information: '<path d="M12 12v10M8 22h8"/><circle cx="12" cy="10" r="2"/><path d="M7.8 5.8a6 6 0 0 0 0 8.4M16.2 5.8a6 6 0 0 1 0 8.4M4.9 2.9a10 10 0 0 0 0 14.2M19.1 2.9a10 10 0 0 1 0 14.2"/>',
    Psychological: '<path d="M9 21v-3a7 7 0 1 1 8-7l2 4h-2v3a2 2 0 0 1-2 2h-2"/><path d="M11 9a2 2 0 1 1 2 2"/>',
    Legal: '<path d="M12 3v18M6 21h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    Association: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M11 7.3 6.2 15.8M13 7.3l4.8 8.5M7.5 18h9"/>',
    Cyber: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><rect x="10" y="10" width="4" height="4"/>',
    Cultural: '<path d="M4 4h16v7a8 8 0 0 1-16 0z"/><path d="M8 9h2M14 9h2M9 14c1.5 1.5 4.5 1.5 6 0"/>',
    'AI and Cognitive': '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="12" r="2.5"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M7.5 7.5l3 3M16.5 7.5l-3 3M7.5 16.5l3-3M16.5 16.5l-3-3"/>',
    Biological: '<path d="M7 2c0 5 10 5 10 10S7 17 7 22M17 2c0 5-10 5-10 10s10 5 10 10"/><path d="M8.5 6h7M8.5 18h7M10 12h4"/>',
    'Data and Surveillance': '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  // Soft hyphens let long domain names break cleanly on narrow tiles.
  const TILE_NAME = { Economic: 'Eco&shy;nomic', Financial: 'Finan&shy;cial', Information: 'Infor&shy;mation', Psychological: 'Psycho&shy;logical', Association: 'Asso&shy;ciation', 'AI and Cognitive': 'AI and Cog&shy;nitive', Biological: 'Bio&shy;logical', 'Data and Surveillance': 'Data and Sur&shy;veil&shy;lance' };
  const tileName = (d) => TILE_NAME[d] || esc(d);
  const icon = (d, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[d] || ''}</svg>`;
  const shieldSvg = '<svg class="sh" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>';
  const stars = (n, cls = '') => `<span class="stars ${cls}" aria-label="${n} of 3 stars">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span>`;
  const meta = () => state.meta;
  const card = (code) => meta().cards.find((c) => c.code === code);
  const cardName = (code) => { const c = card(code); return c ? `S${c.num}, ${c.name}` : code; };
  const MODE = { daily: 'Daily operation', arc: 'Campaign', challenge: 'Challenge', tutorial: 'Boot camp', guide: 'Guided run', free: 'Operation' };
  const kindLabel = (k) => (k === 'catalog' ? 'History' : k === 'watch' ? 'Watch' : 'Futures');
  const fmtDay = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const watchChip = (w) => (w ? `<span class="chip2 watch ${w.status === 'settled' ? 'settled' : 'open'}">${w.status === 'settled' ? 'Settled' + (w.settleOn ? ' ' + esc(fmtDay(w.settleOn)) : '') : 'Watch: not yet settled'}</span>` : '');
  const watchNote = (w) => (w ? `<p class="small muted watchnote">${w.status === 'settled' ? 'This watch has settled.' : 'A watch plays the record up to its last source. The subject is not yet settled.'}${w.settleOn ? ` ${w.status === 'settled' ? 'It settled' : 'It settles'} on ${esc(fmtDay(w.settleOn))}.` : ''}</p>` : '');

  // ---------- the next 120 days ----------
  // Shows the entries that end on or after the viewer's local date and start within 120 days. A month-only date shows through that month.
  function calendarHtml(c) {
    const items = (c && c.calendar) || [];
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 120);
    const first = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
    const last = (s) => { const [y, m, d] = s.split('-').map(Number); return d ? new Date(y, m - 1, d) : new Date(y, m, 0); };
    const rows = items.filter((e) => last(e.end || e.date) >= today && first(e.date) <= horizon).sort((a, b) => first(a.date) - first(b.date));
    if (!rows.length) return '';
    const dm = (dt) => dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const when = (e) => (e.date.length === 7 ? first(e.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : e.end ? `${dm(first(e.date))} to ${dm(first(e.end))}` : dm(first(e.date)));
    const KIND = { window: 'Window', scheduled: 'Scheduled', record: 'Record' };
    return `<section class="cal card" aria-labelledby="calh"><h2 id="calh">Next 120 days</h2>
      <ol class="cal-list">${rows.map((e) => `<li class="cal-item ${esc(e.kind)}"><time class="cal-when" datetime="${esc(e.date)}">${esc(when(e))}</time><span class="cal-label">${esc(e.label)}</span><span class="cal-meta"><span class="chip2">${esc(KIND[e.kind] || e.kind)}</span><a class="cal-src" href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">Source<span class="sr"> for ${esc(e.label)}</span></a></span></li>`).join('')}</ol>
      <p class="small muted">${esc((c && c.note) || 'Dates are scheduled or expected. Nothing here is a prediction.')}</p></section>`;
  }
  // Text a build may override through content.copy. The defaults are the original wording.
  const copy = () => ({
    hero: 'Every operation comes from the record, from the Canton gate in 1784 to the futures of 2051.',
    arcsLabel: '1784 to 2051', arcsTitle: 'Fourteen campaign arcs',
    arcsText: 'Taiwan, the war for the mind, the long arm and more, from documented history into the scenarios ahead.',
    opsNote: '120 from the historical record and 100 from the futures set. Tier sets the difficulty.',
    arcsNote: 'Fourteen arcs. Each runs from the historical record into the futures set, one operation at a time. Win an operation to open the next.',
    ...((meta() && meta().copy) || {}),
  });
  const counts = () => ({ ops: 220, arcs: 14, multi: 0, ...((meta() && meta().counts) || {}) });

  // ---------- small helpers ----------
  function toast(text) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = text;
    el.className = 'toast show';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'toast'; }, 2600);
  }
  // Browser storage for small conveniences. It may be blocked, so memory backs it up for the session.
  const memo = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch { /* blocked */ } return k in memo ? memo[k] : d; },
    set(k, v) { memo[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  async function ensureSession() {
    if (state.me) return state.me;
    await api('/guest', {});
    state.me = (await api('/me')).user;
    T.nav();
    return state.me;
  }
  async function startRun(body) {
    await ensureSession();
    const d = await api('/runs', body);
    location.hash = '#/play/' + d.run.id;
  }
  function selectShare() {
    const pre = $('pre.share');
    if (!pre) return false;
    const r = document.createRange(); r.selectNodeContents(pre);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return true;
  }
  async function shareText(text, url) {
    const full = url && !DEMO ? `${text}\n${url}` : text;
    if (navigator.share && !DEMO) { try { await navigator.share({ text: full }); return; } catch { /* dismissed */ } }
    try { await navigator.clipboard.writeText(full); toast('Copied. Paste it anywhere.'); } catch { toast(selectShare() ? 'Selected. Copy it from the grid.' : 'Select the text and copy it.'); }
  }
  function unlockLabel(k) {
    const [kind, v] = k.split(':');
    if (kind === 'lens') return `Lens unlocked: ${meta().lenses[v]?.name || v}`;
    if (kind === 'doctrine') return `Doctrine unlocked: ${meta().doctrines[v]?.name || v}`;
    if (kind === 'arc') return 'Arc complete';
    if (kind === 'group') return `Group mastered: ${v}`;
    if (kind === 'codex') return 'Codex complete';
    if (kind === 'guide') return 'Guided run complete';
    return null;
  }
  const qs = (h) => Object.fromEntries(new URLSearchParams((h.split('?')[1]) || ''));

  // ---------- version 9: first-use hints, guided runs and the new How to play sections ----------
  // A hint shows once per panel. The save keeps the ones the player has read, so they clear with the progress.
  const hintState = { seen: null };
  async function loadHints() {
    if (!hintState.seen) { try { hintState.seen = (await api('/hints')).seen; } catch { hintState.seen = []; } }
    return hintState.seen;
  }
  async function markHint(id) {
    if (!hintState.seen) hintState.seen = [];
    if (!hintState.seen.includes(id)) hintState.seen.push(id);
    try { hintState.seen = (await api('/hints', { id })).seen; } catch { /* kept in memory for this visit */ }
  }
  // The link goes only to a section this build's How to play page shows.
  const howHas = (id) => (id === 'factions' ? counts().multi > 0 : id === 'dimensions' || id === 'groups' || HELP.how.some((s) => s.id === id && howOn()[s.when]));
  function hintHtml(id) {
    const h = HELP.hints[id];
    if (!h || !hintState.seen || hintState.seen.includes(id)) return '';
    return `<aside class="hint" role="note" aria-label="Tip"><p id="hint-${esc(id)}">${esc(h.text)}</p><div class="row"><button type="button" class="hintok" data-hint="${esc(id)}" aria-describedby="hint-${esc(id)}">${esc(HELP.ui.hintOk)}</button>${h.how && howHas(h.how) ? `<a href="#/how?s=${esc(h.how)}" >${esc(HELP.ui.hintMore)}</a>` : ''}</div></aside>`;
  }
  // The board shows one hint at a time, for the first panel in play whose hint is unread. Boot camp and guided runs have their own coach.
  function boardHint(v, mode) {
    if (mode === 'tutorial' || mode === 'guide' || !hintState.seen) return null;
    const on = { factions: !!factionsHtml(v), leaders: !!(v.cadres && v.cadres.length), holdings: !!(v.holdings && v.holdings.length), reach: !!(v.reach && v.reach.length), tier7: v.tier >= 7 };
    return ['factions', 'leaders', 'holdings', 'reach', 'tier7'].find((k) => on[k] && !hintState.seen.includes(k)) || null;
  }
  const guides = () => (meta() && meta().guides) || [];
  const guideOf = (id) => guides().find((x) => x.id === id) || null;
  function guideCards(done) {
    return guides().filter((x) => !(done || []).includes(x.id)).map((x) => `<div class="card feature"><div class="label">${esc(HELP.ui.guideHome)}</div><div class="big">${esc(x.title)}</div><p class="small">${esc(x.blurb)}</p><button type="button" data-guide="${esc(x.id)}">${esc(HELP.ui.guideStart)}</button></div>`).join('');
  }
  function guideOpCard(id, done) {
    const x = done ? null : guideOf(id);
    return x ? `<div class="card guidecard"><div class="label">${esc(HELP.ui.guideOp)}</div><p class="small">${esc(x.blurb)}</p><button type="button" data-guide="${esc(x.id)}">${esc(HELP.ui.guideStart)}</button></div>` : '';
  }
  function wireGuides() {
    bind('[data-guide]', 'click', (e) => {
      const b = e.currentTarget; b.disabled = true;
      startRun({ mode: 'guide', guide: b.dataset.guide }).catch((err) => { toast(err.message); b.disabled = false; });
    });
  }
  // A guide step shows when its condition holds and the player has not dismissed it in this run.
  const GUIDE_WHEN = {
    start: () => true,
    consuming: (v) => (v.holdings || []).some((h) => h.active && h.consuming),
    yielded: (v) => (v.holdings || []).some((h) => !h.active),
    unused: (v) => !!(v.reach && v.reach.length) && v.reach.every((m) => !m.used) && v.reach.some((m) => m.canUse && m.permit === 'free'),
    priced: (v) => (v.reach || []).some((m) => m.permit === 'priced' && m.canUse),
    barred: (v) => (v.reach || []).some((m) => m.permit === 'barred'),
  };
  // A condition is a name above, a turn ({ turn: 2 }), or the state of one holding ({ consuming: id } or { yielded: id }).
  const holdingIn = (v, id) => (v.holdings || []).find((h) => h.id === id);
  function stepOk(w, v) {
    if (!w || typeof w !== 'object') return !!(GUIDE_WHEN[w] && GUIDE_WHEN[w](v));
    if (w.turn != null) return v.turn >= Number(w.turn);
    if (w.consuming) { const h = holdingIn(v, w.consuming); return !!(h && h.active && h.consuming); }
    if (w.yielded) { const h = holdingIn(v, w.yielded); return !!(h && !h.active); }
    return false;
  }
  // The run keeps the steps the player has dismissed, so a reset or a new run starts the coach again.
  const guideSeen = () => (G.data && Array.isArray(G.data.run.coach) ? G.data.run.coach : []);
  async function markGuideStep(id) {
    G.data.run.coach = guideSeen().concat([id]);
    try { G.data.run.coach = (await api(`/runs/${G.id}/coach`, { step: id })).coach; } catch { /* kept in memory for this visit */ }
  }
  function guideCoachHtml(v) {
    const x = guideOf(G.data.run.guide);
    if (!x) return '';
    const seen = guideSeen();
    const step = x.steps.find((s) => !seen.includes(s.id) && stepOk(s.when, v));
    if (!step) return '';
    const n = seen.filter((id) => x.steps.some((s) => s.id === id)).length + 1;
    return `<div class="coach" role="note"><div class="ctext" id="coachtext"><span class="label">${esc(HELP.ui.guideLabel)} · step ${n}</span>${esc(step.text)}</div><button id="coachok" data-c="${esc(step.id)}" aria-describedby="coachtext">${esc(HELP.ui.hintOk)}</button></div>`;
  }
  // After a dismissal the next note takes focus. It scrolls to the middle of the screen, clear of the sticky header and end bar.
  function focusNext(sel) {
    const nx = $(sel);
    if (!nx) return;
    nx.focus({ preventScroll: true });
    (nx.closest('.hint, .coach') || nx).scrollIntoView({ block: 'center' });
  }
  // ---------- version 10: approximate difficulty ----------
  // A label for the share of games a scripted player wins. The bands and the words live in parts/help.json.
  const DIFFX = HELP.ui.difficulty;
  const diffLabel = (rate) => { const b = rate == null ? null : DIFFX.bands.find((x) => rate >= x.min); return b ? b.label : ''; };
  // The sentence gives the share itself, so it can never disagree with the label beside it.
  const diffSentence = (rate) => (rate == null ? '' : DIFFX.won.replace('{n}', String(rate)));
  const diffNote = () => `<p class="small muted diffnote">${esc(DIFFX.note)}</p>`;
  const diffLine = (rates, t) => (rates && rates[t - 1] != null ? `Tier ${t} · ${esc(diffLabel(rates[t - 1]))}. ${esc(diffSentence(rates[t - 1]))}` : '');
  // ---------- version 11: the glossary ----------
  // A term shows when this build has the rule behind it. The words live in parts/help.json.
  const GLOSS_ON = {
    always: () => true, factions: () => counts().factions > 0, legit: () => counts().legit > 0, leaders: () => counts().leaders > 0,
    pacts: () => counts().pacts > 0, multi: () => counts().multi > 0, holdings: () => counts().holdings > 0, reach: () => counts().reach > 0,
    selfact: () => counts().holdings > 0 || counts().reach > 0, watch: () => counts().watch > 0, world: () => counts().world > 0,
    forecast: () => !!(meta() && meta().forecast), guides: () => guides().length > 0,
  };
  const glossTerms = () => HELP.glossary.filter((x) => GLOSS_ON[x.when] && GLOSS_ON[x.when]());
  // A small link from a panel to its term. On the board it is a button that opens the term over the board, so the run never unloads.
  // Elsewhere it is a link to the glossary page. A second tab is avoided on purpose: two open copies of the game would overwrite one save.
  function gl(id, onBoard) {
    const x = glossTerms().find((y) => y.id === id);
    if (!x) return '';
    const name = esc(HELP.ui.glossName.replace('{term}', x.term));
    return onBoard ? `<button type="button" class="gl" data-gl="${esc(id)}" aria-label="${name}">?</button>` : `<a class="gl" href="#/glossary?t=${esc(id)}" aria-label="${name}">?</a>`;
  }
  const countText = (n) => (n === 1 ? HELP.ui.glossCountOne : HELP.ui.glossCountMany).replace('{n}', String(n));
  function termSheet(id, back) {
    const terms = glossTerms(); const x = terms.find((y) => y.id === id);
    if (!x) return;
    const named = Object.fromEntries(terms.map((y) => [y.id, y.term]));
    const see = x.see.filter((s) => named[s]);
    const done = () => { closeSheet(); if (back && back.isConnected) back.focus(); };
    openSheet(`<h3 id="termh">${esc(x.term)}</h3><p>${esc(x.text)}</p>${see.length ? `<p class="small">${esc(HELP.ui.glossSee)} ${see.map((s) => `<button type="button" class="linkish" data-see="${esc(s)}">${esc(named[s])}</button>`).join(' ')}</p>` : ''}<div class="acts"><button type="button" data-do="close">Close</button><a class="btn" href="#/glossary?t=${esc(id)}" data-go>${esc(HELP.ui.glossOpen)}</a></div>`,
      (sheet) => {
        sheet.setAttribute('aria-labelledby', 'termh');
        bind('[data-see]', 'click', (e) => termSheet(e.currentTarget.dataset.see, back), sheet);
        bind('[data-do="close"]', 'click', done, sheet);
        bind('[data-go]', 'click', () => closeSheet(), sheet);
      });
  }
  // One listener serves every term button, on the board and in the replay.
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button[data-gl]'); if (b) termSheet(b.dataset.gl, b); });
  const howOn = () => ({ always: true, holdings: counts().holdings > 0, reach: counts().reach > 0, forecast: !!(meta() && meta().forecast) });
  function howToc() {
    const on = howOn();
    const items = (counts().multi ? [['factions', 'More than two factions']] : []).concat(HELP.how.filter((s) => on[s.when]).map((s) => [s.id, s.title]), [['dimensions', 'The ten dimensions'], ['groups', 'The six stratagem groups']]);
    return `<nav class="howtoc" aria-label="On this page">${items.map(([id, t]) => `<a href="#/how?s=${esc(id)}">${esc(t)}</a>`).join('')}</nav>`;
  }
  function howSections() {
    const on = howOn();
    return HELP.how.filter((s) => on[s.when]).map((s) => {
      const x = s.guide ? guideOf(s.guide) : null;
      return `<h2 id="how-${esc(s.id)}" tabindex="-1">${esc(s.title)}</h2><p class="small muted">${esc(s.intro)}</p><div class="tiles2">${s.items.map((it) => `<div class="card"><div class="label">${esc(it.label)}</div><p class="small">${esc(it.text)}</p></div>`).join('')}</div>${x ? `<p class="row"><button type="button" data-guide="${esc(x.id)}">${esc(HELP.ui.guideStart)}</button><span class="small muted">${esc(x.blurb)}</span></p>` : ''}`;
    }).join('');
  }

  // ---------- home ----------
  route(/^\/(\?.*)?$/, async () => {
    const me = state.me;
    if (!me) return renderWelcome();
    const [prog, daily, live, arcs, calData] = await Promise.all([api('/progress'), api('/daily'), api('/runs/live'), api('/arcs'), api('/calendar')]);
    const p = prog.progress;
    const pctToNext = Math.round((100 * (p.xp - p.levelFloor)) / Math.max(1, p.nextLevel - p.levelFloor));
    const dm = daily.mine;
    const topArcs = arcs.arcs.slice().sort((a, b) => b.cleared - a.cleared).slice(0, 3);
    render(html`
      <div class="hero">
        <div class="kicker">Daily #${daily.number} · ${esc(daily.op.dimension)}</div>
        <h1>${esc(daily.op.title)}</h1>
        <p>${esc(daily.op.opponent)} · ${esc(daily.op.label)}. ${esc(daily.op.rule.rule)}</p>
        <div class="row">
          ${dm && dm.status !== 'live' ? `<span class="stars">${'★'.repeat(dm.stars || 0)}${'☆'.repeat(3 - (dm.stars || 0))}</span><span>Score ${dm.score}</span><a class="btn" href="#/daily">Today's board</a>` : `<button class="primary" id="daily">${dm ? 'Resume the daily' : 'Play the daily'}</button>`}
        </div>
      </div>
      ${calendarHtml(calData)}
      ${fcHomeCard()}
      ${!prog.tutorialDone ? `<div class="card feature"><div class="label">New here</div><div class="big">Boot camp</div><p class="small">Six turns at The Gate at Canton, 1784. Learn the board, the cards and the lever in three minutes.</p><button class="primary" id="boot">Start boot camp</button></div>` : guideCards(prog.guidesDone)}
      ${DEMO ? '<div class="card"><p class="small">You are playing the demo. Progress stays in this browser. The full game adds accounts, shared boards and friend challenges.</p></div>'
        : me.isGuest ? `<div class="card"><p class="small">You are playing as a guest. <a href="#/register">Create an account</a> to keep your rank, codex and campaign on any device.</p></div>` : ''}
      <div class="tiles2">
        <div class="card">
          <div class="levelbar"><div class="levelbadge">${p.level}</div><div><div class="label">${esc(p.title)}</div><div class="small muted">${p.xp} XP · ${p.won} won of ${p.played}</div></div></div>
          <div class="bar"><i data-w="${pctToNext}"></i></div>
          <p class="small muted">${p.nextLevel - p.xp} XP to level ${p.level + 1}.</p>
        </div>
        <div class="card">
          <div class="label">Codex</div>
          <div class="big">${p.codexCaptured} of 36</div>
          <p class="small muted">stratagems captured · ${p.codexSeen} seen · ${p.lenses.length} of 10 lenses</p>
          <a class="btn" href="#/codex">Open the codex</a>
        </div>
        ${live.runs.length ? `<div class="card"><div class="label">In progress</div>${live.runs.map((r) => `<p><a href="#/play/${r.id}">${esc(r.title)}</a> <span class="small muted">${esc(MODE[r.mode] || r.mode)}</span></p>`).join('')}</div>` : ''}
      </div>
      <h2>Campaign</h2>
      <div class="tiles2">${topArcs.map((a) => `<a class="card feature" href="#/arc/${a.id}"><div class="label">${esc(a.span)}</div><div class="big">${esc(a.name)}</div><p class="small">${esc(a.blurb)}</p><div class="progress"><i data-w="${Math.round((100 * a.cleared) / a.nodes)}"></i></div><p class="small muted">${a.cleared} of ${a.nodes} operations</p></a>`).join('')}</div>
      <p><a class="btn" href="#/arcs">All ${counts().arcs} arcs</a> <a class="btn" href="#/ops">All ${counts().ops} operations</a> <button id="quick">Quick play</button> <a class="btn" href="#/how">How to play</a> <a class="btn" href="#/glossary">${esc(HELP.ui.glossLink)}</a>${DEMO ? ` <a class="btn" href="#/progress">${esc(HELP.ui.progress.title)}</a>` : ''}</p>
    `);
    const d = $('#daily'); if (d) d.addEventListener('click', () => startRun({ mode: 'daily' }).catch((e) => toast(e.message)));
    const b = $('#boot'); if (b) b.addEventListener('click', () => startRun({ mode: 'tutorial' }).catch((e) => toast(e.message)));
    $('#quick').addEventListener('click', () => quickPlay(p.level));
    wireGuides();
  }, 10);

  async function quickPlay(level) {
    const all = (await api('/ops')).ops;
    const cap = Math.min(6, 1 + Math.floor((level || 1) / 2));
    const pool = all.filter((o) => o.tier <= cap);
    const o = pool[Math.floor(Math.random() * pool.length)];
    location.hash = '#/op/' + o.id;
  }

  async function renderWelcome() {
    const calData = await api('/calendar');
    render(html`
      <div class="hero">
        <div class="kicker">Total Domain War</div>
        <h1>Twelve domains. Thirty-six stratagems. One lever.</h1>
        <p>An opponent runs the method against a host, one stratagem at a time. You see its cards, detect the hidden ones, disrupt what you can name and shield what you cannot. ${esc(copy().hero)}</p>
        <div class="row"><button class="primary" id="go">Play now</button><a class="btn" href="#/how">How to play</a>${DEMO ? '' : '<a class="btn" href="#/login">Sign in</a>'}</div>
        <p class="small">No account needed to start. Five to eight minutes a game.</p>
      </div>
      ${calendarHtml(calData)}
      ${fcHomeCard()}
      <div class="tiles2">
        <div class="card"><div class="label">Every day</div><div class="big">The daily operation</div><p class="small">Everyone gets the same operation. Post your result grid without spoilers.</p></div>
        <div class="card"><div class="label">${esc(copy().arcsLabel)}</div><div class="big">${esc(copy().arcsTitle)}</div><p class="small">${esc(copy().arcsText)}</p></div>
        <div class="card"><div class="label">Collect</div><div class="big">The stratagem codex</div><p class="small">Disrupt a stratagem to capture it. Master all 36 and unlock lenses for each dimension.</p></div>
        ${DEMO ? '<div class="card"><div class="label">Ten rule sets</div><div class="big">The dimensions</div><p class="small">Each operation runs under the dimension its record proves. Asymmetry hides cards, Topology spills pressure and Phase fires bursts.</p></div>'
          : '<div class="card"><div class="label">Compete</div><div class="big">Challenge a friend</div><p class="small">Send a link. You both face the same opening and compare scores.</p></div>'}
      </div>
    `);
    $('#go').addEventListener('click', async () => {
      try { await ensureSession(); const prog = await api('/progress'); await startRun({ mode: prog.tutorialDone ? 'daily' : 'tutorial' }); } catch (e) { toast(e.message); }
    });
  }

  // ---------- operation browser ----------
  route(/^\/ops(\?.*)?$/, async (q) => {
    const f = qs(location.hash);
    const all = (await api('/ops')).ops;
    const calData = await api('/calendar');
    const dims = Object.keys(meta().dimensions);
    let list = all;
    if (f.kind) list = list.filter((o) => o.kind === f.kind);
    if (f.tier) list = list.filter((o) => o.tier === Number(f.tier));
    if (f.dim) list = list.filter((o) => o.dimension === f.dim);
    if (f.q) list = list.filter((o) => o.title.toLowerCase().includes(f.q.toLowerCase()));
    render(html`
      <h1>Operations</h1>
      <p class="small muted">${esc(copy().opsNote)} ${esc(DIFFX.note)}</p>
      ${calendarHtml(calData)}
      <div class="filters">
        <select id="kind" aria-label="Kind"><option value="">History and futures</option><option value="catalog" ${f.kind === 'catalog' ? 'selected' : ''}>History</option><option value="futures" ${f.kind === 'futures' ? 'selected' : ''}>Futures</option><option value="watch" ${f.kind === 'watch' ? 'selected' : ''}>Watch</option></select>
        <select id="tier" aria-label="Tier"><option value="">All tiers</option>${[1, 2, 3, 4, 5, 6, 7].map((t) => `<option ${String(t) === f.tier ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select id="dim" aria-label="Dimension"><option value="">All dimensions</option>${dims.map((d) => `<option ${d === f.dim ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <input id="q" placeholder="Search titles" value="${esc(f.q || '')}" aria-label="Search">
      </div>
      <div class="card list oplist">${list.map((o) => `<a class="item" href="#/op/${o.id}"><span><b>${esc(o.title)}</b><br><span class="meta">${kindLabel(o.kind)} · ${esc(o.label)} · ${esc(o.dimension)}${o.world ? ' · ' + esc(o.world) : ''}${o.watch ? ' · ' + watchChip(o.watch) : ''}</span></span><span>${o.stars != null ? stars(o.stars, 'small') : ''}${o.band ? '<span class="chip2 band">Asymmetry band</span>' : ''}<span class="chip2 diff">T${o.tier}${o.diff ? ' · ' + esc(diffLabel(o.diff[o.tier - 1])) : ''}</span></span></a>`).join('') || '<p class="muted">Nothing matches.</p>'}</div>
    `);
    const upd = () => {
      const p = new URLSearchParams();
      for (const id of ['kind', 'tier', 'dim', 'q']) { const v = $('#' + id).value; if (v) p.set(id, v); }
      location.hash = '#/ops' + (p.toString() ? '?' + p : '');
    };
    ['kind', 'tier', 'dim'].forEach((id) => $('#' + id).addEventListener('change', upd));
    $('#q').addEventListener('change', upd);
  }, 10);

  // ---------- briefing and loadout ----------
  route(/^\/op\/([A-Z]\d{3})(\?.*)?$/, async (id) => {
    const f = qs(location.hash);
    const d = await api('/ops/' + id + (f.mode === 'arc' ? `?arc=${encodeURIComponent(f.arc || '')}&node=${encodeURIComponent(f.node || '')}` : ''));
    const o = d.op;
    const lo = d.loadout || { lenses: ['Asymmetry'], doctrines: ['data'], level: 1 };
    const pick = { lens: null, doctrine: null, tier: o.tier };
    const mode = f.mode === 'arc' ? 'arc' : 'free';
    const lensOk = Object.entries(meta().lenses).filter(([k]) => lo.lenses.includes(k));
    const lensRows = lensOk.map(([k, l]) => `<button type="button" class="choice" data-lens="${k}" aria-pressed="false"><span><b>${esc(l.name)} <span class="chip2">${esc(k)}</span></b><small>${esc(l.text)}</small></span></button>`).join('')
      + (lensOk.length < 10 ? `<p class="small muted">${10 - lensOk.length} more lenses unlock as you win operations in each dimension.${o.dimension && !lo.lenses.includes(o.dimension) ? ` Win this one to unlock <b>${esc(meta().lenses[o.dimension].name)}</b>.` : ''}</p>` : '');
    const docOk = Object.entries(meta().doctrines).filter(([k]) => lo.doctrines.includes(k));
    const nextDoc = Object.entries(meta().doctrines).find(([k]) => !lo.doctrines.includes(k));
    const docRows = docOk.map(([k, x]) => `<button type="button" class="choice" data-doc="${k}" aria-pressed="false"><span><b>${esc(x.name)} <span class="chip2">${esc(x.layer)}</span></b><small>${esc(x.text)}</small></span></button>`).join('')
      + (nextDoc ? `<p class="small muted">Next at level ${meta().doctrineLevel[nextDoc[0]]}: ${esc(nextDoc[1].name)}.</p>` : '');
    render(html`
      <p class="small"><a href="${mode === 'arc' ? '#/arc/' + esc(f.arc) : '#/ops'}">${mode === 'arc' ? 'Back to the arc' : 'All operations'}</a></p>
      <div class="kicker">${kindLabel(o.kind)} · ${esc(o.label)}${o.arc ? ' · ' + esc(o.arc) : ''}</div>
      <h1>${esc(o.title)}</h1>
      ${o.watch ? `<p>${watchChip(o.watch)}</p>${watchNote(o.watch)}` : ''}
      <div class="brief-grid">
        <div>
          <div class="card prose"><div class="label">Cold open</div><p>${md(o.brief)}</p>
            <p><span class="chip2">Opponent: ${esc(o.opponent)}</span>${(o.factions || []).map((f) => `<span class="chip2">${esc(f.short)}${f.player ? ' · you' : ''}</span>`).join('')}<span class="chip2">Stage on record: ${esc(o.stage)}</span>${o.world ? `<span class="chip2">World: ${esc(o.world)}</span>` : ''}</p>
            <div class="label">Domains in play</div><p class="pill-row">${o.theater.map((t) => `<span class="chip2">${icon(t, 'ic')} ${esc(t)}</span>`).join('')}</p>
            <p class="small muted">One of these is the lever the operation turns on. Watch where the cards land, then name it.</p>
          </div>
          ${mode === 'free' && o.guide ? guideOpCard(o.guide, d.guideDone) : ''}
          ${o.band ? '<div class="card bandnote"><div class="label">Asymmetry band</div><p>The rival acts on its own population and its own firms with no court, no press and no vote in the way. Your side holds the same kinds of power under law. Some acts are closed to you and some carry a price. The board lists each one with its source.</p><p class="small muted">A scripted player wins this operation rarely at Tier 7. The score is the game\'s reading and not a count.</p></div>' : ''}
          <div class="card rulebox"><div class="label">The physics · ${esc(o.dimension)} · ${esc(o.rule.tier)}</div><p><b>${esc(o.rule.rule)}</b></p><p class="small">Counter: ${esc(o.rule.counter)}</p></div>
          <div class="card"><div class="label">Intelligence</div><p class="small">The record ties this operation to ${o.signature.map((s) => `<b>Stratagem ${s.num}, ${esc(s.name)}</b>`).join(' and ')}. Expect to see it often.</p></div>
        </div>
        <div>
          ${mode === 'free' ? `<div class="card"><div class="label">Difficulty</div><div class="seg" role="group" aria-label="Tier">${[1, 2, 3, 4, 5, 6, 7].map((t) => `<button type="button" data-tier="${t}" aria-pressed="${t === o.tier}"${o.diff ? ` aria-label="T${t}, ${esc(diffLabel(o.diff[t - 1]))}"` : ''}>T${t}</button>`).join('')}</div>${o.diff ? `<p class="small" id="tierdiff" aria-live="polite">${diffLine(o.diff, o.tier)}</p>${diffNote()}` : ''}<p class="small muted">The record sets Tier ${o.tier}.${o.tier < 7 ? ' Tier 7 is harder than any tier on the record.' : ''}</p></div>` : `<div class="card"><div class="label">Difficulty</div><p>${o.diff ? diffLine(o.diff, d.arcTier || o.tier) : `Tier ${d.arcTier || o.tier}`}</p>${o.diff ? diffNote() : ''}<p class="small muted">Campaign difficulty climbs from Tier 1 to Tier 6 along the arc.</p></div>`}
          <div class="card"><div class="label">Lens · optional</div><div class="loadout">${lensRows}</div></div>
          <div class="card"><div class="label">Doctrine card · optional, once per operation</div><div class="loadout">${docRows}</div></div>
          ${o.best ? `<p>Your best: ${stars(o.best.stars)} · ${o.best.score}</p>` : ''}
          <p><button class="primary" id="start">Start the operation</button></p>
        </div>
      </div>
    `);
    bind('[data-tier]', 'click', (e) => { const td = $('#tierdiff'); if (td) td.innerHTML = diffLine(o.diff, Number(e.currentTarget.dataset.tier)); });
    bind('[data-tier]', 'click', (e) => { pick.tier = Number(e.currentTarget.dataset.tier); $$('[data-tier]').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); });
    bind('[data-lens]', 'click', (e) => { const k = e.currentTarget.dataset.lens; pick.lens = pick.lens === k ? null : k; $$('[data-lens]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lens === pick.lens))); });
    bind('[data-doc]', 'click', (e) => { const k = e.currentTarget.dataset.doc; pick.doctrine = pick.doctrine === k ? null : k; $$('[data-doc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.doc === pick.doctrine))); });
    wireGuides();
    $('#start').addEventListener('click', async () => {
      $('#start').disabled = true;
      try {
        const body = mode === 'arc' ? { mode, arcId: f.arc, node: Number(f.node), lens: pick.lens, doctrine: pick.doctrine } : { mode, opId: o.id, tier: pick.tier, lens: pick.lens, doctrine: pick.doctrine };
        await startRun(body);
      } catch (e) { toast(e.message); $('#start').disabled = false; }
    });
  }, 10);

  // ---------- the board ----------
  const G = { id: null, data: null, sel: null, feed: [], flashes: {}, flipped: new Set(), busy: false, rewards: null, lastLog: 0 };
  const COACH = [
    { id: 'board', text: 'Twelve domains make the board. Bold outlines mark the domains in play. Red bars show pressure. At 3 or more, a domain pays the opponent leverage every turn.' },
    { id: 'cards', text: 'The opponent\'s cards sit above the board. Each names a stratagem and the domain it hits when you end the turn.' },
    { id: 'defend', text: 'Tap a domain and choose Defend. Each shield absorbs 1 pressure. You get a few actions each turn, shown as blue dots.' },
    { id: 'disrupt', text: 'Disrupt cancels a card you can see for 2 actions and captures it for your codex.' },
    { id: 'hidden', when: (v) => v.intents.some((i) => i.face !== 'up' && !i.cancelled), text: 'A face-down or unattributed card cannot be disrupted. Detect it first. You cannot answer what you cannot name.' },
    { id: 'offer', when: (v) => v.intents.some((i) => i.offer && !i.cancelled), text: 'An offer pays you now and costs you later. The method needs an invitation.' },
    { id: 'end', text: 'When your actions are spent, end the turn. The cards land, the lifecycle bar moves, and the next turn begins.' },
    { id: 'lever', when: (v) => v.turn >= 2 && v.can.name, text: 'Every operation turns on one lever. Watch where the cards keep landing, then tap that domain and name it. Right: leverage drops and Disrupts there cost less. Wrong: the opponent gains.' },
    { id: 'stage', when: (v) => v.stage >= 1, text: 'The lifecycle bar climbs from Attract to Consume as the opponent banks leverage. Keep it short of Consume until the clock runs out.' },
  ];

  route(/^\/play\/(\d+)$/, async (id) => {
    needLogin();
    Object.assign(G, { id: Number(id), sel: null, feed: [], flashes: {}, flipped: new Set(), rewards: null });
    G.data = await api('/runs/' + id);
    G.lastLog = G.data.view.log.length;
    await loadHints();
    drawBoard();
  }, 10);

  function coachHtml(v) {
    if (G.data.run.mode === 'guide') return guideCoachHtml(v);
    if (G.data.run.mode !== 'tutorial') return '';
    const seen = store.get('tdw-coach', []);
    const step = COACH.find((c) => !seen.includes(c.id) && (!c.when || c.when(v)));
    if (!step) return '';
    return `<div class="coach" role="note"><div class="ctext">${esc(step.text)}</div><button id="coachok" data-c="${step.id}">Got it</button></div>`;
  }


  // ---------- version 2: factions, legitimacy, leaders and pacts ----------
  // Everything here shows only when the operation has more than two factions, uses legitimacy, or places leaders.
  const factionOf = (id) => ((G.data && G.data.view.factions) || []).find((f) => f.id === id);
  const factionName = (id) => { const f = factionOf(id); return f ? f.name : id; };
  const factionShort = (id) => { const f = factionOf(id); return f ? f.short : id; };
  const v2 = (v) => v.multi || (v.rules && v.rules.legitimacy) || (v.cadres && v.cadres.length) || (v.pacts && v.pacts.length);
  const isMine = (v, it) => !it.victim || it.victim === v.player;

  function modsText(m) {
    const out = [];
    if (!m) return '';
    if (m.disrupt) { const d = m.disrupt; const what = d.codes ? d.codes.map((c) => 'S' + c.slice(1)).join(' and ') : d.groups ? d.groups.join(' and ').toLowerCase() + ' cards' : 'cards'; out.push(`Disrupting ${what} here costs ${d.delta > 0 ? '+' : ''}${d.delta}`); }
    if (m.shield) out.push(`Each shield here absorbs ${1 + m.shield}`);
    if (m.ap) out.push(`${m.ap.delta > 0 ? '+' : ''}${m.ap.delta} action${Math.abs(m.ap.delta) === 1 ? '' : 's'} a turn${m.ap.when ? ' while this domain is under pressure' : ''}`);
    if (m.cardPower) out.push(`Its cards land +${m.cardPower.delta} here`);
    if (m.legitimacy) out.push(`${m.legitimacy > 0 ? '+' : ''}${m.legitimacy} legitimacy a turn`);
    if (m.slopeCap != null) out.push(`Slopes here stop at ${m.slopeCap}`);
    return out.length ? out.join('. ') + '.' : '';
  }

  function factionsHtml(v, hint) {
    if (!v2(v) || !(v.multi || v.rules.legitimacy || v.pacts.length)) return '';
    const leg = v.rules.legitimacy;
    const pacts = v.pacts.map((p) => `<span class="pactchip ${p.active ? 'on' : p.broken ? 'broken' : ''}">${esc(p.name)} · ${p.active ? 'in force' : p.broken ? 'broken' : 'not yet'}</span>`).join('');
    const cells = v.factions.map((f) => {
      const lg = leg ? `<div class="lg" role="img" aria-label="Legitimacy ${f.legitimacy} of 100${f.entropy !== 'stable' ? ', in an entropy spike' : ''}"><div class="lg-track"><div class="lg-fill ${f.entropy}" data-w="${f.legitimacy}"></div><span class="lg-line" data-left="${v.rules.spikeBelow}"></span></div><div class="small">Legitimacy ${f.legitimacy}${f.entropy !== 'stable' ? ' · <b class="err">entropy spike</b>' : ''}</div></div>` : '';
      const lv = f.player ? '' : `<div class="small muted">Leverage ${f.leverage} of ${v.consumeAt} · ${esc(f.stageName)}</div>`;
      return `<div class="fx ${f.player ? 'you' : ''}"><div class="fx-name"><b>${esc(f.name)}</b>${f.player ? ' <span class="chip2">You</span>' : ''}</div>${f.blurb ? `<div class="small muted">${esc(f.blurb)}</div>` : ''}${lv}${lg}</div>`;
    }).join('');
    return `<section class="factions" aria-label="Factions"><div class="fx-head"><span class="label">Factions ${gl('faction', true)}</span>${pacts}</div>${hint === 'factions' ? hintHtml('factions') : ''}<div class="fx-grid">${cells}</div></section>`;
  }

  function cadresHtml(v, hint) {
    if (!v.cadres || !v.cadres.length) return '';
    const rows = v.cadres.map((c) => {
      const mv = c.mine && c.movable ? `<button type="button" data-cadre="${esc(c.id)}">Move · 1 action</button>` : '';
      return `<li class="cadre ${c.mine ? 'mine' : 'theirs'} ${c.locked ? 'locked' : ''}"><div><b>${esc(c.name)}</b> <span class="small muted">${esc(c.role)} · ${esc(factionShort(c.faction))}</span></div><div class="small">${icon(c.domain)} ${esc(c.domain)}${c.locked ? ' · out of action' : ''}</div><div class="small muted">${esc(modsText(c.mods))}</div>${mv}</li>`;
    }).join('');
    return `<section class="cadres" aria-label="Leaders"><div class="label">Leaders ${gl('leader', true)}</div>${hint === 'leaders' ? hintHtml('leaders') : ''}<ul>${rows}</ul></section>`;
  }

  function reachHtml(v, hint) {
    if (!v.reach || !v.reach.length) return '';
    const STATE = { barred: 'Closed to you', priced: 'Has a price', free: 'Open' };
    const rows = v.reach.map((m) => {
      const st = m.used >= m.limit && m.permit !== 'barred' ? 'Used' : STATE[m.permit];
      const ev = m.evidence && m.evidence.length ? `<details class="rv-ev"><summary>Why</summary><ul>${m.evidence.map((x) => `<li><b>${esc(x.id)}</b> ${esc(x.line)}</li>`).join('')}</ul></details>` : '';
      const price = m.permit === 'priced' ? `<div class="small">Costs ${m.price} legitimacy and counts as an act against your own position.</div>` : '';
      return `<li class="reach ${esc(m.permit)} ${m.used >= m.limit ? 'gone' : ''}"><div><b>${esc(m.name)}</b> <span class="chip2 rstate">${esc(st)}</span></div><div class="small">${icon(m.domain)} ${esc(m.domain)}</div><div class="small muted">${esc(m.text)}</div>${price}${ev}${m.canUse ? `<button type="button" data-reach="${esc(m.id)}">Use · ${m.ap} action${m.ap > 1 ? 's' : ''}</button>` : ''}</li>`;
    }).join('');
    return `<section class="reachbox" aria-label="Reach"><div class="label">Reach ${gl('reach', true)}</div>${hint === 'reach' ? hintHtml('reach') : ''}<ul>${rows}</ul><p class="small muted">An act marked closed is open to the rival and barred to you. Each one lists the evidence behind that.</p></section>`;
  }

  function holdingsHtml(v, hint) {
    if (!v.holdings || !v.holdings.length) return '';
    const rows = v.holdings.map((h) => {
      const state = !h.active ? 'given up' : h.consuming ? 'consuming' : 'sustainable';
      const raised = h.active && h.cost > h.baseCost ? ` · cost up ${h.cost - h.baseCost}` : '';
      return `<li class="holding ${h.active ? '' : 'gone'} ${h.active && h.consuming ? 'consuming' : ''}"><div><b>${esc(h.name)}</b> <span class="chip2 hstate">${state}</span></div><div class="small">${icon(h.domain)} ${esc(h.domain)} · costs ${h.cost} a turn${raised} · denies ${h.denial}</div>${h.text ? `<div class="small muted">${esc(h.text)}</div>` : ''}${h.canYield ? `<button type="button" data-yield="${esc(h.id)}">Give up · 1 action</button>` : ''}</li>`;
    }).join('');
    return `<section class="holdings" aria-label="Holdings"><div class="label">Holdings ${gl('holding', true)}</div>${hint === 'holdings' ? hintHtml('holdings') : ''}<ul>${rows}</ul><p class="small muted">A holding costs you every turn and keeps some leverage from the rival. A holding is consuming when its cost is more than what it denies.</p></section>`;
  }

  function elsewhereHtml(v) {
    const els = v.intents.filter((i) => !isMine(v, i) && !i.cancelled && i.code);
    if (!els.length) return '';
    return `<div class="elsewhere"><div class="label">Elsewhere · aimed at the other factions ${gl('elsewhere', true)}</div><ul>${els.map((i) => `<li>${esc(factionName(i.by))} runs <b>S${i.num}, ${esc(i.name)}</b> on ${esc(i.target || 'a domain')} against ${esc(factionName(i.victim))}${i.amount ? ` (${i.amount})` : ''}.</li>`).join('')}</ul><p class="small muted">You cannot answer these. They shift the balance between the others.</p></div>`;
  }

  function fboardsHtml(v) {
    if (!v.multi) return '';
    const blocks = v.factions.map((f) => {
      const cells = v.boards[f.id].map((b) => `<div class="mini ${b.p >= 5 ? 'cap' : b.p >= 3 ? 'hot' : ''}" role="img" aria-label="${esc(b.d)}: pressure ${b.p}, ${b.s} shields${b.slope ? `, slope ${b.slope}` : ''}"><span class="mn">${esc(meta().short[b.d])}</span><span class="mp">${b.p}</span><span class="ms">${b.s ? '▲' + b.s : ''}</span></div>`).join('');
      return `<div class="fb"><div class="small"><b>${esc(f.name)}</b>${f.player ? ' (you)' : ''}</div><div class="minigrid">${cells}</div></div>`;
    }).join('');
    return `<details class="fboards"><summary>Every faction's board</summary>${gl('faction', true)}<p class="small muted">Digits are pressure. Triangles are shields. Pressure shows who holds the strain, and 3 or more pays the faction that put it there.</p>${blocks}</details>`;
  }

  function incomingMap(v) {
    const m = {};
    for (const it of v.intents) {
      if (it.cancelled || it.offer || !it.target || (it.victim && it.victim !== v.player)) continue;
      const x = (m[it.target] = m[it.target] || { n: 0, unsure: false });
      x.n += it.amount || 0;
      if (!it.code) x.unsure = true;
    }
    return m;
  }

  function lifecycleHtml(v) {
    const names = meta().stages;
    const pct = Math.min(100, Math.round((100 * v.leverage) / v.consumeAt));
    const ticks = v.thresholds.slice(0, 3).map((t) => `<span class="lc-tick" data-left="${(100 * t) / v.consumeAt}"></span>`).join('');
    return `<div class="lifecycle" aria-label="Lifecycle: ${esc(v.stageName)}, leverage ${v.leverage} of ${v.consumeAt}">
      <div class="lc-head"><span>Lifecycle · <b>${esc(v.stageName)}</b> ${gl('lifecycle', true)}</span><span>Leverage ${v.leverage} / ${v.consumeAt}</span></div>
      <div class="lc-track"><div class="lc-zones"></div><div class="lc-fill" data-w="${pct}"></div>${ticks}</div>
      <div class="lc-stages">${names.slice(0, 4).map((n, i) => `<span class="${i === v.stage ? 'on' : ''}">${n}</span>`).join('')}</div>
      <div class="small muted">${esc(meta().stageText[v.stageName] || '')}</div>
    </div>`;
  }

  function actBtn(kind, cost, extra = '') {
    const label = { detect: 'Detect', disrupt: 'Disrupt', defend: 'Defend', accept: 'Accept' }[kind];
    const c = cost == null ? '' : cost === 0 ? ' · free' : ` · ${cost}`;
    return `<button type="button" class="btn-${kind}" data-act="${kind}" ${extra} ${cost == null && kind !== 'accept' ? 'disabled' : ''}>${label}${c}</button>`;
  }

  function cardHtml(it) {
    const o = it.options || {};
    const flip = G.flipped.has(it.id) ? ' flip' : '';
    if (it.face === 'down') {
      return `<div class="icard down${flip}" data-id="${it.id}"><div class="num">FACE-DOWN</div><div class="nm">Unknown card</div><div class="tx">No name, no target. Detect it before you can answer it.</div><div class="acts">${actBtn('detect', o.detect)}</div></div>`;
    }
    if (!it.code) {
      return `<div class="icard masked${flip}" data-id="${it.id}"><div class="num">UNATTRIBUTED</div><div class="nm">A threat without a name</div><div class="aim">${icon(it.target)} ${esc(it.target)} <span class="amt">${it.amount}</span></div><div class="tx">It may be a feint or a bluff. Detect before you answer.</div><div class="acts">${actBtn('detect', o.detect)}</div></div>`;
    }
    const cls = ['icard', 'g-' + it.group, it.offer ? 'offer' : '', it.cancelled ? 'cancelled' : '', it.fake ? 'fake' : ''].join(' ') + flip;
    const aim = it.target ? `<div class="aim">${icon(it.target)} ${esc(it.target)}${it.amount ? ` <span class="amt">${it.amount}</span>` : ''}</div>` : '';
    const tag = it.offer ? 'OFFER' : it.scheduled === 'the catch' ? 'THE CATCH' : it.scheduled === 'revived' ? 'REVIVED' : it.escaped ? 'ESCAPED' : it.group.toUpperCase();
    let acts = '';
    if (it.cancelled) acts = '<div class="small best">Disrupted and captured</div>';
    else if (it.fake) acts = '<div class="small muted">A false blossom. It holds nothing.</div>';
    else if (it.offer) acts = `<div class="acts">${actBtn('accept', null)}</div><div class="small muted">Leave it and it passes.</div>`;
    else acts = `<div class="acts">${o.detect != null ? actBtn('detect', o.detect) : ''}${actBtn('disrupt', o.disrupt)}</div>`;
    return `<div class="${cls}" data-id="${it.id}"><div class="num">S${it.num} · ${tag}${it.proxy ? ' · PROXY' : ''}${G.data.view.multi && it.by ? ' · ' + esc(factionShort(it.by)) : ''}${it.legitCost ? ` · −${it.legitCost} LEGIT` : ''}</div><div class="nm">${esc(it.name)}</div>${aim}<div class="tx">${esc(it.text)}</div>${acts}</div>`;
  }

  function tileHtml(b, inc) {
    const cls = ['tile', b.theater ? 'theater' : '', b.p >= 5 ? 'captured' : '', G.sel === b.d ? 'sel' : '', G.flashes[b.d] || ''].join(' ');
    const badges = [b.lever ? '<span class="badge lever">LEVER</span>' : '', b.critical && !b.lever ? '<span class="badge crit">LOAD</span>' : '', b.gated ? '<span class="badge gate">GATED</span>' : '', b.lock ? `<span class="badge">LOCK ${b.lock}</span>` : ''].join('');
    const pips = [0, 1, 2, 3, 4].map((i) => `<span class="pp ${i < b.p ? 'on' : ''}"></span>`).join('');
    const sh = shieldSvg.repeat(b.s);
    const x = inc[b.d];
    const label = `${b.d}: pressure ${b.p} of 5, ${b.s} shields${b.slope ? `, slope ${b.slope}` : ''}${x ? `, ${x.n} incoming` : ''}${b.gated ? ', gated' : ''}`;
    return `<button type="button" class="${cls}" data-d="${esc(b.d)}" aria-label="${esc(label)}">
      <span class="badges">${badges}</span>
      <span class="row1">${icon(b.d)}</span>
      <span class="dn">${tileName(b.d)}</span>
      <span class="srow">${sh}${b.slope ? `<span class="slope">↗+${b.slope}</span>` : ''}${x ? `<span class="inc">${x.unsure ? '?' : ''}⚠${x.n}</span>` : ''}</span>
      <span class="ppips">${pips}</span>
    </button>`;
  }

  function drawBoard() {
    const d = G.data;
    const v = d.view;
    if (v.over) return drawResult();
    const inc = incomingMap(v);
    const opp = v.op.opponent;
    const leverHtml = v.lever.exposed
      ? `<div><b>${esc(v.lever.named)}</b> <span class="best">named</span></div><div class="small muted">Disrupts aimed there cost 1 less.</div>`
      : v.lever.named ? `<div><b>${esc(v.lever.named)}</b> <span class="err">wrong</span></div><div class="small muted">The real lever is still hidden.</div>`
        : `<button type="button" id="namelever">Name the lever</button>`;
    const doc = v.doctrine;
    const hint = boardHint(v, d.run.mode);
    render(html`
      ${coachHtml(v)}
      <div class="hud">
        <div class="hud-top">
          <div><div class="kicker">${esc(MODE[d.run.mode] || 'Operation')}${d.run.dayNumber ? ' #' + d.run.dayNumber : ''}${d.run.scored ? '' : ' · practice'}</div><h1>${esc(v.op.title)}</h1>
            ${d.run.watch ? `<div>${watchChip(d.run.watch)} ${gl('watch', true)}</div>` : ''}
            <div class="hud-sub">${esc(opp)} · ${esc(v.op.label)} · Tier ${v.tier}${v.op.world ? ' · ' + esc(v.op.world) : ''}${v.lens ? ' · Lens: ' + esc(v.lens.name) : ''}</div></div>
          <div class="turnbox"><div class="date">${esc(v.dates[v.turn - 1])}</div><div class="tn">Turn ${v.turn} of ${v.maxTurns} · <a href="#/how" target="_blank" rel="noopener">How to play</a> · <a href="#/glossary">${esc(HELP.ui.glossLink)}</a></div></div>
        </div>
        <div class="timetrack" aria-hidden="true">${v.dates.map((dt, i) => `<span class="t ${i + 1 < v.turn ? 'done' : i + 1 === v.turn ? 'now' : ''} ${v.bursts.includes(i + 1) ? 'burst' : ''}" title="${esc(dt)}"></span>`).join('')}</div>
        ${lifecycleHtml(v)}
        <div class="res">
          <div class="meter"><div class="lbl">Actions ${gl('actions', true)}</div><div class="pips">${Array.from({ length: Math.max(v.ap, 3) }, (_, i) => `<span class="pip ap ${i < v.ap ? 'on' : ''}"></span>`).join('')}</div><div class="small">${v.ap} left${v.apPenaltyNext ? ` · next turn −${v.apPenaltyNext}` : ''}</div></div>
          <div class="meter"><div class="lbl">Coherence ${gl('coherence', true)}</div><div class="pips">${[0, 1, 2, 3, 4].map((i) => `<span class="pip coh ${i < v.coherence ? 'on' : ''}"></span>`).join('')}</div><div class="small">${v.op.dimension === 'Coherence' ? 'Actions = 2 + coherence' : `+${Math.floor(v.coherence / 2)} action${Math.floor(v.coherence / 2) === 1 ? '' : 's'} a turn`}</div></div>
          <div class="meter"><div class="lbl">Lever ${gl('lever', true)}</div>${leverHtml}</div>
          <div class="meter"><div class="lbl">Physics ${gl('dimension', true)}</div><div><b>${esc(v.op.dimension)}</b></div><button type="button" id="rule">The rule</button></div>
          ${doc ? `<div class="meter"><div class="lbl">Doctrine · ${esc(doc.layer)} ${gl('doctrine', true)}</div>${doc.used ? `<div class="small muted">${esc(doc.name)} spent</div>` : `<button type="button" id="doctrine" ${v.can.doctrine ? '' : 'disabled'}>${esc(doc.name)}</button>`}</div>` : ''}
        </div>
      </div>
      ${hint === 'tier7' ? hintHtml('tier7') : ''}${factionsHtml(v, hint)}${cadresHtml(v, hint)}${holdingsHtml(v, hint)}${reachHtml(v, hint)}
      ${G.feed.length ? `<div class="feed" aria-live="polite">${G.feed.map((f, i) => `<p class="${f.cls || ''}" data-delay="${i}">${esc(f.text)}</p>`).join('')}</div>` : ''}
      <div class="hand-head"><div class="headrow"><h2>Cards in play</h2>${gl('card', true)}</div><span class="small muted">${esc(opp)} · they land when you end the turn</span></div>
      <div class="hand">${v.intents.filter((i) => isMine(v, i)).map(cardHtml).join('') || '<p class="muted">No cards aimed at you this turn.</p>'}</div>
      ${elsewhereHtml(v)}
      <div class="headrow"><h2>The board</h2>${gl('domain', true)}</div>
      <div class="board">${v.board.map((b) => tileHtml(b, inc)).join('')}</div>
      ${fboardsHtml(v)}
      <p class="small muted">Bold outline: domains in play. Red bars: pressure. Shields absorb 1 pressure each. ⚠ marks what is aimed at a domain this turn.</p>
      <details class="log"><summary>Operation log</summary><ol>${v.log.slice().reverse().map((l) => `<li><span class="small muted">T${l.t}</span> ${esc(l.text)}</li>`).join('')}</ol></details>
      <div class="endbar"><button type="button" class="primary endbtn" id="end">End turn ${v.turn}</button>${v.ap >= 2 ? `<span class="warn">${v.ap} actions unspent</span>` : ''}</div>
    `);
    $$('.lc-tick, .lg-line').forEach((el) => { el.style.left = el.dataset.left + '%'; });
    $$('.feed p').forEach((el) => { el.style.animationDelay = (Number(el.dataset.delay) * 0.18) + 's'; });
    const ok = $('#coachok');
    if (ok) ok.addEventListener('click', async () => {
      if (d.run.mode === 'guide') await markGuideStep(ok.dataset.c); else { const seen = store.get('tdw-coach', []); seen.push(ok.dataset.c); store.set('tdw-coach', seen); }
      drawBoard(); focusNext('#coachok');
    });
    bind('.hintok', 'click', async (e) => { await markHint(e.currentTarget.dataset.hint); drawBoard(); focusNext('.hintok'); });
    bind('.tile', 'click', (e) => openTile(e.currentTarget.dataset.d));
    bind('.icard [data-act]', 'click', (e) => {
      const id = Number(e.currentTarget.closest('.icard').dataset.id);
      const kind = e.currentTarget.dataset.act;
      act(kind === 'accept' ? { type: 'accept', intent: id } : { type: kind, intent: id });
    });
    $('#end').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (v.ap >= 2 && !btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.textContent = `Tap again to end with ${v.ap} unspent`;
        btn.classList.add('armed');
        const w = btn.nextElementSibling; if (w) w.textContent = 'Idle actions cost coherence.';
        setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = `End turn ${v.turn}`; btn.classList.remove('armed'); } }, 4000);
        return;
      }
      act({ type: 'end' });
    });
    $('#rule').addEventListener('click', () => openSheet(`<h3>${esc(v.op.dimension)} · ${esc(v.rule.tier)}</h3><p><b>${esc(v.rule.rule)}</b></p><p>Counter: ${esc(v.rule.counter)}</p>${v.lens ? `<p class="small">Your lens, ${esc(v.lens.name)}: ${esc(v.lens.text)}</p>` : ''}<p class="small muted">The ten dimensions are the physics of an operation. Coherence multiplies, Agency gates, Topology and Entropy describe the ground, Time, Asymmetry and Criticality describe the contest, and Phase, Gradient and Resonance describe the move.</p>`));
    bind('[data-reach]', 'click', (e) => {
      const id = e.currentTarget.dataset.reach;
      const m = v.reach.find((x) => x.id === id);
      const price = m.permit === 'priced' ? `<p class="small">This act has a price. It costs ${m.price} legitimacy and counts as an act against your own position.</p>` : '';
      openSheet(`<h3>${esc(m.name)}</h3><p class="small">${esc(m.text)}</p>${price}<div class="acts"><button type="button" class="primary" data-yes>Use it · ${m.ap} action${m.ap > 1 ? 's' : ''}</button><button type="button" data-do="close">Not now</button></div>`,
        (sheet) => { bind('[data-yes]', 'click', () => { closeSheet(); act({ type: 'reach', move: id }); }, sheet); bind('[data-do="close"]', 'click', closeSheet, sheet); });
    });
    bind('[data-yield]', 'click', (e) => {
      const id = e.currentTarget.dataset.yield;
      const h = v.holdings.find((x) => x.id === id);
      const price = h.yieldLegitimacy < 0 ? ` Giving it up costs ${-h.yieldLegitimacy} legitimacy.` : '';
      const ties = h.couples && h.couples.length ? ` It also raises what ${h.couples.map((c) => (v.holdings.find((x) => x.id === c) || { name: c }).name).join(' and ')} costs.` : '';
      openSheet(`<h3>Give up ${esc(h.name)}</h3><p class="small">It stops costing ${h.cost} a turn and stops denying ${h.denial}.${esc(price)}${esc(ties)} It cannot be taken back.</p><div class="acts"><button type="button" class="primary" data-yes>Give it up · 1 action</button><button type="button" data-do="close">Keep it</button></div>`,
        (sheet) => { bind('[data-yes]', 'click', () => { closeSheet(); act({ type: 'yield', holding: id }); }, sheet); bind('[data-do="close"]', 'click', closeSheet, sheet); });
    });
    bind('[data-cadre]', 'click', (e) => {
      const id = e.currentTarget.dataset.cadre;
      const c = v.cadres.find((x) => x.id === id);
      openSheet(`<h3>Move ${esc(c.name)}</h3><p class="small">${esc(c.name)} now leads ${esc(c.domain)}. A leader acts only where it stands. Moving costs 1 action, once a turn.</p><div class="acts">${v.board.filter((b) => b.d !== c.domain).map((b) => `<button type="button" data-ct="${esc(b.d)}">${icon(b.d)} ${esc(b.d)} <small>pressure ${b.p}</small></button>`).join('')}</div>`,
        (sheet) => bind('[data-ct]', 'click', (ev) => { closeSheet(); act({ type: 'assign', cadre: id, domain: ev.currentTarget.dataset.ct }); }, sheet));
    });
    const nl = $('#namelever');
    if (nl) nl.addEventListener('click', () => openLeverSheet(v));
    const dc = $('#doctrine');
    if (dc) dc.addEventListener('click', () => {
      if (doc.needsDomain) openSheet(`<h3>${esc(doc.name)}</h3><p>${esc(doc.text)}</p><div class="acts">${v.board.filter((b) => b.theater || b.p > 0).map((b) => `<button type="button" data-zt="${esc(b.d)}">${icon(b.d)} ${esc(b.d)}</button>`).join('')}</div>`, (sheet) => bind('[data-zt]', 'click', (e) => { closeSheet(); act({ type: 'doctrine', domain: e.currentTarget.dataset.zt }); }, sheet));
      else act({ type: 'doctrine' });
    });
    setTimeout(() => { G.flashes = {}; G.flipped.clear(); }, 1200);
  }

  function openLeverSheet(v) {
    openSheet(`<h3>Name the lever</h3><p class="small">Which domain does this operation turn on? Right: leverage drops by 2 and every Disrupt aimed there costs 1 less. Wrong: coherence falls and the opponent gains 2 leverage. You get one guess.</p>
      <div class="acts">${v.board.filter((b) => b.theater).map((b) => `<button type="button" data-lev="${esc(b.d)}">${icon(b.d)} ${esc(b.d)} <small>pressure ${b.p}</small></button>`).join('')}</div>`, (sheet) => bind('[data-lev]', 'click', (e) => { closeSheet(); act({ type: 'name', domain: e.currentTarget.dataset.lev }); }, sheet));
  }

  function openTile(dn) {
    const v = G.data.view;
    const b = v.board.find((x) => x.d === dn);
    G.sel = dn;
    const o = b.options || {};
    const aimed = v.intents.filter((i) => i.target === dn && !i.cancelled && !i.offer);
    const rows = [];
    if (o.open != null) rows.push(`<button type="button" data-do="open"><span>Open the gate</span><small>${o.open} action · you hold no authority here yet</small></button>`);
    if (o.defend != null) rows.push(`<button type="button" class="btn-defend" data-do="defend"><span>Defend</span><small>1 action · adds a shield</small></button>`);
    if (o.disrupt != null) rows.push(`<button type="button" class="btn-disrupt" data-do="disrupt"><span>Disrupt</span><small>${o.disrupt} actions · ${b.slope ? 'clears slopes, then pressure' : 'removes 2 pressure'}</small></button>`);
    if (v.can.name && b.theater) rows.push(`<button type="button" data-do="name"><span>Name as the lever</span><small>free · one guess</small></button>`);
    const links = b.links.map((l) => esc(l)).join(', ');
    openSheet(`<h3>${icon(dn)} ${esc(dn)}</h3>
      <p class="small">Pressure ${b.p} of 5 · ${b.s} shield${b.s === 1 ? '' : 's'}${b.slope ? ` · slope ${b.slope} a turn` : ''}${b.theater ? ' · in play' : ''}${b.critical ? ' · load-bearing' : ''}${b.gated ? ' · gated' : ''}${b.lock ? ` · locked ${b.lock} turn${b.lock === 1 ? '' : 's'}` : ''}</p>
      ${aimed.length ? `<p class="small"><b>Aimed here:</b> ${aimed.map((i) => i.code ? `${esc(cardName(i.code))} (${i.amount})` : `an unattributed threat (${i.amount})`).join('; ')}</p>` : ''}
      <p class="small muted">Linked to ${links}.</p>
      <div class="acts">${rows.join('') || '<p class="muted">Nothing you can do here right now.</p>'}<button type="button" data-do="close">Close</button></div>`,
    (sheet) => bind('[data-do]', 'click', (e) => {
      const k = e.currentTarget.dataset.do;
      closeSheet();
      if (k === 'close') { G.sel = null; drawBoard(); return; }
      if (k === 'name') { act({ type: 'name', domain: dn }); return; }
      act({ type: k, domain: dn });
    }, sheet));
  }

  function openSheet(inner, wire) {
    closeSheet();
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', () => { closeSheet(); G.sel = null; });
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.innerHTML = inner + (inner.includes('data-do="close"') ? '' : '<div class="acts"><button type="button" class="sheetclose">Close</button></div>');
    document.body.append(scrim, sheet);
    const c = sheet.querySelector('.sheetclose');
    if (c) c.addEventListener('click', closeSheet);
    if (wire) wire(sheet);
    const first = sheet.querySelector('button');
    if (first) first.focus();
    document.addEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeSheet(); }
  function closeSheet() { $$('.sheet, .scrim').forEach((x) => x.remove()); document.removeEventListener('keydown', escClose); }

  function feedFrom(events, before, after) {
    const out = [];
    const newLog = after.log.filter((l) => l.t === before.turn).slice(-8);
    const seenText = new Set(before.log.map((l) => `${l.t}|${l.text}`));
    for (const l of newLog) if (!seenText.has(`${l.t}|${l.text}`)) out.push({ text: l.text });
    const prev = Object.fromEntries(before.board.map((b) => [b.d, b]));
    const changes = [];
    for (const b of after.board) {
      const p0 = prev[b.d];
      const dp = b.p - p0.p;
      const ds = b.s - p0.s;
      if (dp || ds) changes.push(`${b.d} ${dp > 0 ? '+' + dp : dp < 0 ? dp : ''}${dp ? ' pressure' : ''}${dp && ds ? ', ' : ''}${ds ? `${ds > 0 ? '+' : ''}${ds} shield${Math.abs(ds) === 1 ? '' : 's'}` : ''}`);
    }
    if (changes.length) out.push({ text: changes.join(' · ') + '.' });
    const lev = events.filter((e) => e.k === 'leverage').reduce((a, e) => a + e.n, 0);
    if (lev) out.push({ text: `Leverage ${lev > 0 ? '+' + lev : lev}, now ${after.leverage} of ${after.consumeAt}.`, cls: lev > 0 ? '' : 't-good' });
    for (const e of events) {
      if (e.k === 'capture') out.push({ text: `${e.d} falls.`, cls: 't-cap' });
      if (e.k === 'stage') out.push({ text: `The operation enters ${e.name}.`, cls: 't-cap' });
      if (e.k === 'coh') out.push({ text: `Coherence ${e.n > 0 ? 'rises' : 'falls'} to ${e.total}${e.why ? ` (${e.why})` : ''}.`, cls: e.n > 0 ? 't-good' : '' });
      if (e.k === 'turn') out.push({ text: `Turn ${e.turn} begins · ${e.date}${e.burst ? ' · burst turn' : ''}.` });
    }
    const lg = {};
    for (const e of events) if (e.k === 'legit' && e.f) lg[e.f] = (lg[e.f] || 0) + e.n;
    const lgs = Object.entries(lg).filter(([, n]) => n).map(([f, n]) => `${factionShort(f)} ${n > 0 ? '+' + n : n}`);
    if (lgs.length) out.push({ text: `Legitimacy · ${lgs.join(' · ')}.`, cls: 't-good' });
    return out.slice(0, 16);
  }

  async function act(action) {
    if (G.busy) return;
    G.busy = true;
    const before = G.data.view;
    try {
      const r = await api(`/runs/${G.id}/act`, { action });
      for (const e of r.events) {
        if (e.k === 'press' && e.n > 0) G.flashes[e.d] = 'flash-press';
        if (e.k === 'press' && e.absorbed > 0 && !e.n) G.flashes[e.d] = 'flash-shield';
        if (e.k === 'shield') G.flashes[e.d] = 'flash-shield';
        if (e.k === 'clear') G.flashes[e.d] = 'flash-clear';
        if (e.k === 'capture') { G.flashes[e.d] = 'flash-capture'; if (navigator.vibrate) navigator.vibrate(60); }
        if (e.k === 'reveal') G.flipped.add(e.id);
      }
      G.feed = action.type === 'end' ? feedFrom(r.events, before, r.view) : r.events.some((e) => e.k === 'escape') ? [{ text: `${cardName('S21')} slips away.` }] : [];
      if (action.type !== 'end' && action.type !== 'defend') G.sel = null;
      if (r.rewards) G.rewards = r.rewards;
      G.data = r;
      drawBoard();
      if (action.type === 'end' && !r.view.over) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast(e.message);
    } finally {
      G.busy = false;
    }
  }

  // ---------- result ----------
  function drawResult() {
    const d = G.data;
    const v = d.view;
    const o = v.over;
    const win = o.outcome === 'win';
    const rw = G.rewards;
    const db = d.debrief || {};
    const run = d.run;
    const head = win ? (o.reason === 'lever' ? 'Lever cut' : 'Held the line') : 'Consumed';
    const unlocks = rw ? rw.newUnlocks.map(unlockLabel).filter(Boolean) : [];
    const next = run.mode === 'arc' ? `<a class="btn primary" href="#/arc/${esc(run.arcId)}">Back to the arc</a>`
      : run.mode === 'daily' ? '<a class="btn primary" href="#/daily">Today\'s board</a>'
        : run.mode === 'challenge' ? (DEMO ? '<a class="btn primary" href="#/records">Compare in Records</a>' : `<a class="btn primary" href="#/c/${esc(run.challenge)}">Opponent's score</a>`)
          : run.mode === 'guide' ? `<a class="btn primary" href="#/op/${esc(run.opId)}">${esc(HELP.ui.guideNext)}</a>`
          : run.mode === 'tutorial' ? (state.me && state.me.isGuest && !DEMO ? '<a class="btn primary" href="#/register">Save your progress</a>' : '<a class="btn primary" href="#/daily">Play the daily</a>')
            : `<a class="btn primary" href="#/op/${esc(run.opId)}">Play again</a>`;
    render(html`
      <div class="result ${win ? '' : 'loss'}">
        <div class="kicker">${esc(MODE[run.mode] || 'Operation')}${run.dayNumber ? ' #' + run.dayNumber : ''} · ${esc(v.op.title)}</div>
        ${run.watch ? `<div>${watchChip(run.watch)}</div>${watchNote(run.watch)}` : ''}
        <h1>${head}</h1>
        ${stars(o.stars)}
        <p class="score">${o.score}</p>
        <p class="muted">${win ? `The operation stopped at ${esc(o.stage)} with ${o.leverage} of ${o.consumeAt} leverage.` : `${o.consumedBy && v.multi ? esc(factionName(o.consumedBy)) + ' reached Consume' : 'The operation reached Consume'} on turn ${o.turns}.`} The lever was <b>${esc(o.spine)}</b>${o.leverCorrect === true ? ', and you named it' : o.leverCorrect === false ? '. You named another domain' : ''}.</p>
        ${rw ? `<p>+${rw.xp} XP · Level ${rw.level}, ${esc(rw.title)}${rw.levelUp ? ' · <b>Level up</b>' : ''}</p>` : run.xp ? `<p>+${run.xp} XP</p>` : ''}
        ${!run.scored ? '<p class="small muted">Practice run. Your first result today stands.</p>' : ''}
        <p>${unlocks.map((u) => `<span class="unlock">${esc(u)}</span>`).join('')}${rw ? rw.newCaptures.map((c) => `<span class="unlock">Captured ${esc(cardName(c))}</span>`).join('') : ''}</p>
        <div class="row"><button type="button" class="primary" id="share">Share result</button><button type="button" id="challenge">Challenge a friend</button>${next}</div>
      </div>
      <div class="card"><div class="label">Your result grid</div><pre class="share">${esc(d.share || '')}</pre><p class="small muted">Blue: Detect. Red: Disrupt. Green: Defend. White: actions left unused.</p></div>
      ${DEMO ? recordCards(d) : ''}
      <div class="card prose">
        <div class="label">What the record says · ${esc(db.fullTitle || v.op.title)}</div>
        <p>${md(db.record || '')}</p>
        ${db.coreEvent ? `<p><b>Core event.</b> ${md(db.coreEvent)}</p>` : ''}
        <p><b>The reading.</b> ${md(db.reading || '')}</p>
        <p><b>The gap.</b> ${md(db.gapText || '')}</p>
        <p><b>The fix.</b> ${md(db.fix || '')}</p>
      </div>
      <p class="row"><a class="btn" href="#/">Home</a><a class="btn" href="#/codex">Codex</a><a class="btn" href="#/ops">More operations</a></p>
    `);
    const url = run.mode === 'daily' ? `${location.origin}/#/daily` : run.challenge ? `${location.origin}/#/c/${run.challenge}` : location.origin;
    $('#share').addEventListener('click', () => shareText(d.share, url));
    if (DEMO) { wireRecordCards(d); $('#challenge').addEventListener('click', () => openChallengeSheet(run, v.op.title)); }
    else $('#challenge').addEventListener('click', async () => {
      try {
        // Create new async challenge (1v1)
        const ch = await api('/api/challenge/create', { opId: run.opId, tier: run.tier });
        const shareUrl = `${location.origin}/#/play?challenge=${ch.code}`;

        // Show modal with copy link and email options
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
          <div class="modal">
            <div class="modal-header">
              <h2>Challenge a friend</h2>
              <button class="modal-close" type="button">✕</button>
            </div>
            <div class="modal-body">
              <p>Share this link with your friend to challenge them to the same operation.</p>
              <div class="form-group">
                <label>Share link:</label>
                <div class="input-row">
                  <input type="text" readonly value="${shareUrl}" id="challenge-link">
                  <button type="button" id="copy-challenge">Copy</button>
                </div>
              </div>
              <p class="small muted">Or share the text below:</p>
              <div class="form-group">
                <textarea readonly id="challenge-text">Challenge me: ${v.op.title}\n${shareUrl}</textarea>
              </div>
              <button type="button" class="primary" id="send-challenge">Done</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('#send-challenge').addEventListener('click', closeModal);
        modal.querySelector('#copy-challenge').addEventListener('click', () => {
          const link = modal.querySelector('#challenge-link');
          link.select();
          try { document.execCommand('copy'); toast('Link copied!'); } catch { selectShare(link); }
        });
      } catch (e) { toast(e.message); }
    });
  }

  // ---------- daily ----------
  // ---------- leaderboard ----------
  route(/^\/leaderboard(\?.*)?$/, async () => {
    const lb = await api('/leaderboard');
    const top = lb.entries || [];
    const you = lb.yourRank || null;
    render(html`
      <h1>Challenge Rankings</h1>
      <p class="small muted">Weekly leaderboard. Win challenges to climb the ranks.</p>
      ${you ? `<div class="card"><div class="label">Your rank</div><div class="rank-badge"><div class="rank">#${you.rank}</div><div class="stats">${you.wins} wins · ${you.losses} losses · Rating ${you.rating}</div></div></div>` : '<div class="card"><p class="small muted">Win a challenge to appear on the leaderboard.</p></div>'}
      <div class="card scroll">
        <table>
          <tr><th>#</th><th>Player</th><th>Level</th><th>Record</th><th>Rating</th></tr>
          ${top.map((x) => `<tr class="${you?.userId === x.userId ? 'me' : ''}"><td>${x.rank}</td><td>${esc(x.username)}</td><td>L${x.level}</td><td>${x.wins}–${x.losses}</td><td>${x.rating}</td></tr>`).join('')}
        </table>
      </div>
    `);
  });

  route(/^\/daily$/, async () => {
    const d = await api('/daily');
    const o = d.op;
    const m = d.mine;
    render(html`
      <div class="hero">
        <div class="kicker">Daily #${d.number} · ${esc(d.day)} · Tier ${d.tier}${o.diff ? ' · ' + esc(diffLabel(o.diff[d.tier - 1])) : ''}</div>
        <h1>${esc(o.title)}</h1>
        <p>${md(o.brief)}</p>
        <p class="pill-row"><span class="chip2">${esc(o.opponent)}</span><span class="chip2">${esc(o.label)}</span><span class="chip2 dimchip">${esc(o.dimension)}</span></p>
        ${o.diff ? diffNote() : ''}
        <div class="row">${m && m.status !== 'live' ? `${stars(m.stars || 0)} <span>Score ${m.score}</span> <button id="again">Practice again</button>` : `<button class="primary" id="play">${m ? 'Resume' : 'Play today\'s operation'}</button>`}</div>
      </div>
      ${DEMO ? '<div class="card"><div class="label">Today</div><p>Everyone on the full game plays this operation today, and a shared board ranks the results. The demo keeps your result in this browser. A new operation starts at midnight UTC.</p></div>'
        : `<div class="card"><div class="label">Today</div><p>${d.stats.players} player${d.stats.players === 1 ? '' : 's'}${d.stats.winRate != null ? ` · ${d.stats.winRate}% held the line` : ''}. A new operation starts at midnight UTC.</p></div>`}
      <h2>${DEMO ? 'Your result' : 'Today\'s board'}</h2>
      <div class="card scroll">${d.board.length ? `<table><tr><th>#</th><th>Player</th><th>Result</th><th>Score</th></tr>${d.board.map((x) => `<tr class="${x.me ? 'me' : ''}"><td>${x.rank}</td><td>${esc(x.name)}</td><td>${stars(x.stars || 0, 'small')}</td><td>${x.score}</td></tr>`).join('')}</table>` : '<p class="muted">No finished runs yet. Be first.</p>'}</div>
      <p class="small muted">${DEMO ? 'Your first finished run of the day counts. Later runs are practice.' : 'Guests and private profiles do not appear on the board. Your first finished run of the day counts.'}</p>
    `);
    const p = $('#play'); if (p) p.addEventListener('click', () => startRun({ mode: 'daily' }).catch((e) => toast(e.message)));
    const a = $('#again'); if (a) a.addEventListener('click', () => startRun({ mode: 'daily' }).catch((e) => toast(e.message)));
  }, 10);

  // ---------- campaign ----------
  route(/^\/arcs$/, async () => {
    const d = await api('/arcs');
    render(html`
      <h1>Campaign</h1>
      <p class="small muted">${esc(copy().arcsNote)}</p>
      <div class="tiles2">${d.arcs.map((a) => `<a class="card feature" href="#/arc/${a.id}"><div class="label">${esc(a.span)}</div><div class="big">${esc(a.name)}</div><p class="small">${esc(a.blurb)}</p><div class="progress"><i data-w="${Math.round((100 * a.cleared) / a.nodes)}"></i></div><p class="small muted">${a.cleared} of ${a.nodes} · ${a.stars} ★</p></a>`).join('')}</div>
    `);
    $$('.progress i').forEach((el) => { el.style.width = el.dataset.w + '%'; });
  }, 10);

  route(/^\/arc\/([a-z-]+)$/, async (id) => {
    const d = await api('/arcs/' + id);
    render(html`
      <p class="small"><a href="#/arcs">All arcs</a></p>
      <div class="kicker">${esc(d.arc.span)}</div>
      <h1>${esc(d.arc.name)}</h1>
      <p>${esc(d.arc.blurb)}</p>
      ${d.nodes.some((n) => n.diff != null) ? diffNote() : ''}
      <div class="arcline">${d.nodes.map((n) => {
        const st = n.stars != null ? 'cleared' : n.open ? 'open' : 'locked';
        const inner = `<span><span class="yr">${esc(n.label)}</span><br><b>${esc(n.title)}</b><br><span class="small muted">${kindLabel(n.kind)} · Tier ${n.tier}${n.diff != null ? ' · ' + esc(diffLabel(n.diff)) : ''} · ${esc(n.dimension)}</span></span><span>${n.stars != null ? stars(n.stars, 'small') : n.open ? '<span class="chip2">Play</span>' : '<span class="chip2">Locked</span>'}</span>`;
        return `<div class="arcnode ${st}">${n.open ? `<a class="item" href="#/op/${n.id}?mode=arc&arc=${esc(d.arc.id)}&node=${n.index}">${inner}</a>` : `<div class="item">${inner}</div>`}</div>`;
      }).join('')}</div>
    `);
  }, 10);

  // ---------- forecasts ----------
  // The player enters a probability on a dated claim before it resolves. The claim, its time stamp and the book's own probability
  // come from the registered ledger and are shown as registered. The results come from a small file the site owner copies from
  // the project's scoring log. Nothing here reaches the network except those two files.
  const brier = (p, o) => (p - o) * (p - o);
  const dueOf = (it) => Date.parse(it.check_by + 'T00:00:00Z');
  const pctOf = (x) => `${Math.round(x * 100)}%`;
  const isoMin = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  function fcState(it, mine, res, now) {
    if (res && res[it.id]) return 'resolved';
    if (mine[it.id]) return 'locked';
    return now >= dueOf(it) ? 'closed' : 'open';
  }
  // Scores use only the claims you locked and that have a result other than void. Each mean carries its own count.
  function fcSummary(items, mine, res) {
    const out = { locked: 0, resolved: 0, you: { n: 0, sum: 0 }, book: { n: 0, sum: 0 }, ref: { n: 0, sum: 0 } };
    for (const it of items) {
      const m = mine[it.id]; if (!m) continue;
      out.locked++;
      const r = res[it.id];
      if (!r || r.result === 'void') continue;
      const o = r.result === 'true' ? 1 : 0;
      out.resolved++;
      out.you.n++; out.you.sum += brier(m.p / 100, o);
      out.ref.n++; out.ref.sum += brier(it.reference_p, o);
      if (it.book_p != null) { out.book.n++; out.book.sum += brier(it.book_p, o); }
    }
    for (const k of ['you', 'book', 'ref']) out[k].mean = out[k].n ? out[k].sum / out[k].n : null;
    return out;
  }
  window.TDWForecast = { brier, fcSummary, fcState };
  async function fcSha(text) {
    try {
      if (!(window.crypto && crypto.subtle)) return null;
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch { return null; }
  }
  async function fcLoad() {
    const cfg = meta().forecast;
    const get = async (url, opt) => { const r = await fetch(url, opt); if (!r.ok) throw new Error(`The file ${url.split('?')[0]} did not load (${r.status}).`); return r.json(); };
    const data = await get(cfg.data);
    let results = { rows: {} }; let missing = false;
    try { results = await get(cfg.results, { cache: 'no-cache' }); } catch { missing = true; }
    const mine = (await api('/forecast/mine')).forecasts;
    const hashes = await Promise.all(data.items.map((it) => fcSha(it.text)));
    data.items.forEach((it, i) => { it.hashOk = hashes[i] == null ? null : hashes[i] === it.sha256; });
    return { cfg, items: data.items, results: results.rows || {}, missing, mine };
  }
  function fcHomeCard() {
    const f = meta().forecast;
    return f ? `<div class="card feature"><div class="label">Forecast</div><p>${f.count} dated claims from the record. Enter your own chance on each before it resolves, then see how you score.</p><a class="btn" href="#/forecast">Open the forecasts</a></div>` : '';
  }
  const FC_SHOW = 8;
  const RESULT_TEXT = { true: 'Held', false: 'Did not hold', void: 'Void' };
  function fcCard(it, st, mine, res) {
    const m = mine[it.id]; const r = res[it.id];
    const hash = it.hashOk == null ? '' : it.hashOk ? `<span class="fc-hash ok">Text check ${esc(it.sha256.slice(0, 8))}</span>` : '<span class="fc-hash bad" role="alert">This text does not match its registered check value. Do not rely on it.</span>';
    const stLabel = { open: 'Open', locked: 'Locked', closed: 'Closed', resolved: r ? RESULT_TEXT[r.result] : '' }[st];
    const reveal = st !== 'open';
    const rules = it.rules ? `<details class="fc-rules"><summary>Counting rules</summary><p>${esc(it.rules)}</p><p class="small muted">As registered in ${esc(it.rules_from)}.</p></details>` : '';
    let body = '';
    if (st === 'open') {
      body = `<div class="fc-form"><label for="fp-${esc(it.id)}">Your chance that this holds, in percent</label>
        <div class="row"><input id="fp-${esc(it.id)}" type="number" min="1" max="99" step="1" inputmode="numeric" data-fp="${esc(it.id)}" autocomplete="off"><button type="button" class="primary" data-lock="${esc(it.id)}">Lock my forecast</button></div>
        <p class="small muted" data-fmsg="${esc(it.id)}">The book's probability and the reference answer show after you lock. A locked forecast cannot change.</p></div>`;
    }
    const lead = m ? Math.floor((dueOf(it) - m.at) / 86400000) : null;
    const yours = m ? `<p class="fc-yours">You said <b>${m.p}%</b> on ${esc(isoMin(m.at))}${lead != null && lead >= 0 ? `, ${lead} day${lead === 1 ? '' : 's'} before the check date` : ''}.</p>` : st === 'closed' ? '<p class="fc-yours muted">You did not forecast this one before the check date.</p>' : '';
    const book = reveal ? `<div class="fc-ref"><p>${it.book_p != null ? `The book gave <b>${pctOf(it.book_p)}</b>, registered ${esc(it.book_utc)}.` : 'The book gave no probability for this claim. It is a failure criterion.'} The cheap reference answer was <b>${pctOf(it.reference_p)}</b>. Its basis was ${esc(it.reference_source)}</p></div>` : '';
    let scored = '';
    if (r) {
      const link = /^https:\/\//.test(r.evidence || '') ? ` <a href="${esc(r.evidence)}" target="_blank" rel="noopener noreferrer">Evidence<span class="sr"> for ${esc(it.id)}</span></a>` : '';
      scored = `<div class="fc-res"><p><b>${esc(RESULT_TEXT[r.result])}.</b> Scored ${esc(r.scored_on)}.${link}</p>${r.note ? `<p class="small">${esc(r.note)}</p>` : ''}${r.history && r.history.length ? '<p class="small muted">This result was corrected. The earlier entries are on file.</p>' : ''}`;
      if (r.result !== 'void') {
        const o = r.result === 'true' ? 1 : 0;
        const row = (who, p) => `<tr><td>${who}</td><td>${pctOf(p)}</td><td>${brier(p, o).toFixed(3)}</td></tr>`;
        scored += `<table class="fc-score"><tr><th>Who</th><th>Said</th><th>Brier</th></tr>${m ? row('You', m.p / 100) : ''}${it.book_p != null ? row('The book', it.book_p) : ''}${row('Cheap reference', it.reference_p)}</table>`;
      }
      scored += '</div>';
    }
    return `<article class="card fc fc-${st}" id="fc-${esc(it.id)}"><div class="fc-head"><b>${esc(it.id)}</b><span class="chip2">${esc(it.type)}</span><span class="chip2 fc-st">${esc(stLabel)}</span></div>
      <p class="fc-text">${esc(it.text)}</p>
      <p class="small muted">Registered <time datetime="${esc(it.registered_utc)}">${esc(it.registered_utc)}</time>. Check by ${esc(it.check_by)}. ${hash}</p>
      ${rules}${body}${yours}${book}${scored}</article>`;
  }
  function fcSummaryHtml(s) {
    const f = (x) => (x.mean == null ? 'none yet' : x.mean.toFixed(3));
    if (!s.locked) return '<section class="card" aria-labelledby="fcs"><h2 id="fcs">Your forecasts</h2><p class="muted">You have locked none. Pick a claim, enter a chance and lock it.</p></section>';
    return `<section class="card" aria-labelledby="fcs"><h2 id="fcs">Your forecasts</h2><p>You locked ${s.locked}. ${s.resolved} ${s.resolved === 1 ? 'has' : 'have'} a result.</p>
      ${s.resolved ? `<table class="fc-score"><tr><th>Mean Brier score</th><th>Claims</th><th>Mean</th></tr><tr><td>You</td><td>${s.you.n}</td><td>${f(s.you)}</td></tr>${s.book.n ? `<tr><td>The book</td><td>${s.book.n}</td><td>${f(s.book)}</td></tr>` : ''}<tr><td>Cheap reference</td><td>${s.ref.n}</td><td>${f(s.ref)}</td></tr></table>` : ''}
      <p class="small muted">Lower is better. A few claims prove little. The project's scoring log is the record, and this page only mirrors it.</p></section>`;
  }
  function fcIntro(cfg) {
    return `<div class="headrow"><h1>Forecast</h1>${gl('forecast')}</div>
      <p>Each claim below was registered with a date before anyone knew how it would resolve. Pick the ones you want and enter the chance you give each, from 1 to 99 percent. Lock it before the check date. When the result is in, the game scores you against the book's own probability and a cheap reference answer. The score is the Brier score, the square of the miss, so lower is better.</p>
      <p class="small muted">Forecast early. A forecast entered late has more to go on, and the game does not discount it. The scoring formula is provisional and weights are not used here. The sign ‡ in a source note means the item is still to verify. ${esc(cfg.credit || '')}</p>`;
  }
  route(/^\/forecast$/, async () => {
    if (!meta().forecast) { render('<h1>Forecast</h1><p class="muted">This build has no forecasts.</p>'); return; }
    let D;
    try { D = await fcLoad(); } catch (e) { render(`<h1>Forecast</h1>${errorBox(e)}`); return; }
    const sort = (a, b) => a.check_by.localeCompare(b.check_by) || a.id.localeCompare(b.id);
    const sections = [['open', 'Open', true], ['locked', 'Locked, waiting for the result', true], ['resolved', 'Resolved', true], ['closed', 'Closed without your forecast', false]];
    const draw = () => {
      const n = Date.now();
      const sel = (st) => D.items.filter((it) => fcState(it, D.mine, D.results, n) === st).sort(sort);
      render(html`${fcIntro(D.cfg)}<p class="small"><a href="#/how?s=forecast">${esc(HELP.ui.forecastHow)}</a></p>
        ${D.missing ? '<p class="err" role="alert">The results file did not load. Results will not show until it does.</p>' : ''}
        ${fcSummaryHtml(fcSummary(D.items, D.mine, D.results))}
        ${sections.map(([st, label, open]) => { const l = sel(st); const cut = st === 'open' && !D.all && l.length > FC_SHOW ? FC_SHOW : l.length; return l.length ? `<details class="fcsec" ${open ? 'open' : ''}><summary><h2>${esc(label)} <span class="muted">${l.length}</span></h2></summary>${l.slice(0, cut).map((it) => fcCard(it, st, D.mine, D.results)).join('')}${cut < l.length ? `<p><button type="button" id="fcall">Show the other ${l.length - cut}</button></p>` : ''}</details>` : ''; }).join('')}
        <p class="small muted"><a href="#/forecast/desk">Results desk for the site owner</a></p>`);
      bind('#fcall', 'click', () => { D.all = true; draw(); });
      bind('[data-lock]', 'click', async (e) => {
        const b = e.currentTarget; const id = b.dataset.lock;
        const inp = $(`[data-fp="${id}"]`); const msg = $(`[data-fmsg="${id}"]`);
        const v = Number(inp.value);
        if (!inp.value || !Number.isInteger(v) || v < 1 || v > 99) { msg.textContent = 'Enter a whole number from 1 to 99.'; inp.focus(); return; }
        if (b.dataset.armed !== String(v)) { b.dataset.armed = String(v); b.textContent = `Lock at ${v}%? Tap again`; msg.textContent = 'A locked forecast cannot change.'; return; }
        b.disabled = true;
        try { const r = await api('/forecast', { id, p: v }); D.mine[id] = r.forecast; draw(); const c = $(`#fc-${id}`); if (c) c.scrollIntoView({ block: 'center' }); }
        catch (err) { msg.textContent = err.message; b.disabled = false; }
      });
    };
    draw();
  });

  // The owner's desk. It builds the results file from what the project's scoring log says. The page never sends it anywhere.
  route(/^\/forecast\/desk$/, async () => {
    if (!meta().forecast) { render('<h1>Results desk</h1><p class="muted">This build has no forecasts.</p>'); return; }
    let D;
    try { D = await fcLoad(); } catch (e) { render(`<h1>Results desk</h1>${errorBox(e)}`); return; }
    const rows = JSON.parse(JSON.stringify(D.results));
    const today = new Date().toISOString().slice(0, 10);
    const fileText = () => JSON.stringify({ schema: 1, note: 'Results as written in the project scoring log. Edit with the owner desk in the game, never by hand.', updated: new Date().toISOString().slice(0, 10), rows }, null, 1) + '\n';
    const draw = (msg) => {
      render(html`<h1>Results desk</h1>
        <p>For the site owner. Enter a result only after the project's scoring log records it, and copy the log. This page decides nothing. It builds a file, and the file shows to every player once it is uploaded.</p>
        <section class="card"><h2>Add a result</h2>
          <div class="fc-form">
            <label for="dk-id">Claim</label>
            <select id="dk-id">${D.items.map((it) => `<option value="${esc(it.id)}">${esc(it.id)} · due ${esc(it.check_by)}${rows[it.id] ? ' · has a result' : ''}</option>`).join('')}</select>
            <label for="dk-res">Result in the scoring log</label>
            <select id="dk-res"><option value="true">Held</option><option value="false">Did not hold</option><option value="void">Void</option></select>
            <label for="dk-on">Scored on</label>
            <input id="dk-on" type="date" max="${today}" value="${today}">
            <label for="dk-ev">Evidence link, https only</label>
            <input id="dk-ev" type="url" placeholder="https://" autocomplete="off">
            <label for="dk-note">Note, up to 300 characters</label>
            <input id="dk-note" type="text" maxlength="300" autocomplete="off">
            <p class="small muted">A claim that already has a result needs a note. The earlier entry stays on file as history.</p>
            <div class="row"><button type="button" class="primary" id="dk-add">Add to the file</button></div>
            <p class="small" id="dk-msg" role="status">${esc(msg || '')}</p>
          </div></section>
        <section class="card"><h2>The file</h2>
          <p class="small">${Object.keys(rows).length} result${Object.keys(rows).length === 1 ? '' : 's'}. Download it and upload it to replace <b>assets/forecast-results.json</b> in this build's folder with your file manager. Players see it on their next visit.</p>
          <div class="row"><button type="button" id="dk-dl">Download forecast-results.json</button><button type="button" id="dk-copy">Copy the text</button></div>
          <textarea class="codebox" rows="10" readonly aria-label="The results file">${esc(fileText())}</textarea></section>
        <p class="small"><a href="#/forecast">Back to the forecasts</a></p>`);
      bind('#dk-add', 'click', () => {
        const id = $('#dk-id').value; const result = $('#dk-res').value; const on = $('#dk-on').value; const ev = $('#dk-ev').value.trim(); const note = $('#dk-note').value.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(on) || on > today) return draw('Enter a scored date that is not in the future.');
        if (ev && !/^https:\/\/\S+$/.test(ev)) return draw('The evidence link must start with https://');
        if (note.length > 300) return draw('The note is longer than 300 characters.');
        const prev = rows[id];
        if (prev && !note) return draw('This claim already has a result. Add a note that says why it changes.');
        const entry = { result, scored_on: on };
        if (ev) entry.evidence = ev;
        if (note) entry.note = note;
        if (prev) entry.history = (prev.history || []).concat([{ result: prev.result, scored_on: prev.scored_on, evidence: prev.evidence || null, note: prev.note || null }]);
        rows[id] = entry;
        draw(`Added ${id}.`);
      });
      bind('#dk-dl', 'click', () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([fileText()], { type: 'application/json' }));
        a.download = 'forecast-results.json';
        document.body.appendChild(a); a.click(); a.remove();
      });
      bind('#dk-copy', 'click', () => copyText(fileText(), 'Copied.'));
    };
    draw('');
  });

  // ---------- codex ----------
  route(/^\/codex$/, async () => {
    if (!state.me) {
      render(html`<div class="headrow"><h1>The stratagem codex</h1>${gl('codex')}</div><p>Disrupt a stratagem in play to capture it. Collect all 36.</p><button class="primary" id="go">Play now</button>`);
      $('#go').addEventListener('click', () => startRun({ mode: 'tutorial' }).catch((e) => toast(e.message)));
      return;
    }
    const d = await api('/codex');
    const p = d.progress;
    const byGroup = meta().groups.map((g) => ({ g, cards: d.cards.filter((c) => c.group === g), done: d.groups.find((x) => x.name === g).done }));
    render(html`
      <div class="headrow"><h1>The stratagem codex</h1>${gl('codex')}</div>
      <p class="small muted">The Thirty-Six Stratagems are a folk compilation, not PLA doctrine. Here they name patterns any actor can run. Disrupt a card in play to capture it.</p>
      <div class="tiles2">
        <div class="card"><div class="label">Captured</div><div class="big">${p.codexCaptured} of 36</div><div class="progress"><i data-w="${Math.round((100 * p.codexCaptured) / 36)}"></i></div><p class="small muted">${p.codexSeen} seen</p></div>
        <div class="card"><div class="label">Level ${p.level} · ${esc(p.title)}</div><div class="big">${p.xp} XP</div><p class="small muted">${p.won} operations won</p></div>
      </div>
      ${byGroup.map((x) => `<h2>${esc(x.g)} ${x.done ? '<span class="chip2">mastered</span>' : ''}</h2><div class="codex">${x.cards.map((c) => `<button type="button" class="ccard g-${esc(c.group)} ${c.seen ? '' : 'unseen'}" data-code="${c.code}"><span class="cnum">S${c.num}</span><span class="cnm">${c.seen ? esc(c.name) : 'Not yet seen'}</span><span class="cst ${c.captured ? 'cap' : ''}">${c.captured ? 'Captured' : c.seen ? 'Seen' : ''}</span></button>`).join('')}</div>`).join('')}
      <h2>Lenses</h2>
      <p class="small muted">One lens per dimension. Win an operation whose physics is that dimension to unlock its lens.</p>
      <div class="loadout">${Object.entries(meta().lenses).map(([k, l]) => `<div class="choice" aria-disabled="${!p.lenses.includes(k)}"><span><b>${esc(l.name)} <span class="chip2">${esc(k)}</span> ${p.lenses.includes(k) ? '<span class="chip2">unlocked</span>' : ''}</b><small>${esc(l.text)}</small></span></div>`).join('')}</div>
      <h2>Doctrine cards</h2>
      <p class="small muted">One per architecture layer. They unlock with your level.</p>
      <div class="loadout">${Object.entries(meta().doctrines).map(([k, x]) => `<div class="choice"><span><b>${esc(x.name)} <span class="chip2">${esc(x.layer)}</span> ${p.doctrines.includes(k) ? '<span class="chip2">unlocked</span>' : `<span class="chip2">level ${meta().doctrineLevel[k]}</span>`}</b><small>${esc(x.text)}</small></span></div>`).join('')}</div>
    `);
    $$('.progress i').forEach((el) => { el.style.width = el.dataset.w + '%'; });
    bind('.ccard', 'click', (e) => {
      const c = d.cards.find((x) => x.code === e.currentTarget.dataset.code);
      if (!c.seen) { toast('Face this stratagem in an operation to read it.'); return; }
      openSheet(`<h3>Stratagem ${c.num}</h3><p><b>${esc(c.name)}</b></p><p class="small">${esc(c.group)} group${c.captured ? ' · captured' : ' · seen'}</p><p>${esc(c.text)}</p>${c.foundIn.length ? `<p class="small"><b>On record in:</b> ${c.foundIn.map((f) => `<a href="#/op/${f.id}">${esc(f.title)}</a> (${esc(f.label)})`).join(', ')}</p>` : ''}`,
        (sheet) => bind('a', 'click', () => closeSheet(), sheet));
    });
  }, 10);

  // ---------- how to play ----------
  route(/^\/how$/, async () => {
    const dims = Object.entries(meta().dimensions);
    render(html`
      <h1>How to play</h1>
      <p>An opponent runs the method against a host, one stratagem at a time. You defend the host until the clock runs out, or you cut the lever the operation turns on.</p>
      ${howToc()}
      <p class="small">The <a href="#/glossary">${esc(HELP.ui.glossLink.toLowerCase())}</a> lists every term the board uses.</p>
      <div class="tiles2">
        <div class="card"><div class="label">1 · The board</div><p>Twelve domains. Bold outlines mark the domains in play. Red bars count pressure from 0 to 5. At 3 or more, a domain pays the opponent 1 leverage each turn. At 5 it falls and pays 2.</p></div>
        <div class="card"><div class="label">2 · The cards</div><p>Each turn the opponent plays stratagem cards aimed at domains. A face-up card shows its name, target and payload. An unattributed card shows a threat and hides its name, and it may be a feint. A face-down card shows nothing.</p></div>
        <div class="card"><div class="label">3 · Your moves</div><p><b class="btn-detect">Detect</b> costs 1 and reveals a hidden card. <b class="btn-disrupt">Disrupt</b> costs 2 and cancels a card you can name, which captures it for your codex, or clears 2 pressure from a domain. <b class="btn-defend">Defend</b> costs 1 and adds a shield that absorbs 1 pressure.</p></div>
        <div class="card"><div class="label">4 · The lifecycle</div><p>Leverage moves the operation from Attract through Accommodate, Control and Extract to Consume. Reach the end of the clock before Consume and you hold the line.</p></div>
        <div class="card"><div class="label">5 · The lever</div><p>Every operation turns on one domain. You may name it once. Right: leverage drops by 2 and every Disrupt aimed there costs 1 less. Wrong: the opponent gains 2. Empty a named lever from turn 4, while the operation sits at Attract or Accommodate and no domain has fallen, and it collapses.</p></div>
        <div class="card"><div class="label">6 · Coherence</div><p>A shield that absorbs a hit, a Disrupt on a card you detected or a correct lever raises coherence. Idle actions and fallen domains lower it. Every 2 points add an action each turn.</p></div>
        <div class="card"><div class="label">7 · Offers</div><p>Some cards are offers: extra actions now, a slope of pressure later. The method needs an invitation. Leave an offer and it passes.</p></div>
        <div class="card"><div class="label">8 · Stars</div><p>One star: you held the line. Two: the operation stopped before Extract. Three: you cut the lever, or kept leverage under 40 percent.</p></div>
      </div>
      ${counts().multi ? `<h2 id="how-factions" tabindex="-1">More than two factions</h2>
      <p class="small muted">Some operations put three factions on the board. You command one. The others each run the method, and they also run it on each other.</p>
      <div class="tiles2">
        <div class="card"><div class="label">Pairs</div><p class="small">Every faction has its own pressure, shields and slopes in each domain, and the board records who put the pressure there. When your domain holds 3 or more pressure, the faction that put most of it there banks the leverage.</p></div>
        <div class="card"><div class="label">Cards elsewhere</div><p class="small">A card aimed at another faction shows under Elsewhere. You cannot detect or disrupt it, but it changes who is strong when the cards land.</p></div>
        <div class="card"><div class="label">Legitimacy</div><p class="small">Each faction carries legitimacy from 0 to 100. Proxy, high-entropy and dishonorable stratagems cost the faction that plays them, and a Disrupt exposes the sender. A coherent turn restores yours. Below 25, a faction suffers an entropy spike in its own domains.</p></div>
        <div class="card"><div class="label">Leaders</div><p class="small">A leader stands in one domain and changes the rules there. Some make Disrupts cheaper or dearer, add shields or actions, or cost legitimacy. Move each of yours once a turn for 1 action.</p></div>
        <div class="card"><div class="label">Pacts</div><p class="small">Two factions may stand together against a third. While a pact holds, its members do not target each other. Pacts form and break on events, and breaking one has a price.</p></div>
      </div>` : ''}
      ${howSections()}
      <h2 id="how-dimensions" tabindex="-1">The ten dimensions</h2>
      <p class="small muted">Each operation runs under the dimension its record proves. Coherence multiplies, Agency gates, Topology and Entropy describe the ground, Time, Asymmetry and Criticality describe the contest, and Phase, Gradient and Resonance describe the move.</p>
      <div class="tiles2">${dims.map(([k, x]) => `<div class="card rulebox"><div class="label">${esc(x.tier)}</div><div class="big">${esc(k)}</div><p class="small">${esc(x.rule)}</p><p class="small muted">Counter: ${esc(x.counter)}</p><p class="small muted">Lens: ${esc(meta().lenses[k].name)}. ${esc(meta().lenses[k].text)}</p></div>`).join('')}</div>
      <h2 id="how-groups" tabindex="-1">The six stratagem groups</h2>
      <p class="small muted">The Thirty-Six Stratagems are a folk compilation, not PLA doctrine. The game uses them as names for patterns any actor can run. Card borders carry the group color.</p>
      <div class="codex">${meta().groups.map((g) => `<div class="ccard g-${esc(g)}"><span class="cnm">${esc(g)}</span><span class="cnum">${meta().cards.filter((c) => c.group === g).map((c) => 'S' + c.num).join(' ')}</span></div>`).join('')}</div>
      <p class="row"><button class="primary" id="boot">Try boot camp</button><a class="btn" href="#/">Home</a></p>
      ${DEMO ? `<div class="card"><div class="label">Demo progress</div><p class="small">Your level, codex and campaign live in this browser only. <a href="#/progress">${esc(HELP.ui.progress.link)}</a>.</p><button type="button" id="reset">Clear my progress</button></div>${feedbackHtml()}` : ''}
    `);
    $('#boot').addEventListener('click', () => startRun({ mode: 'tutorial' }).catch((e) => toast(e.message)));
    wireGuides();
    const sec = qs(location.hash).s;
    const tgt = sec && document.getElementById('how-' + sec);
    if (tgt) { tgt.scrollIntoView(); tgt.focus({ preventScroll: true }); }
    const rs = $('#reset');
    if (rs) rs.addEventListener('click', async () => {
      if (!rs.dataset.armed) { rs.dataset.armed = '1'; rs.textContent = 'Tap again to clear everything'; return; }
      await api('/demo/reset', {});
      hintState.seen = null;
      state.me = null;
      toast('Progress cleared.');
      location.hash = '#/';
    });
  }, 10);

  // ---------- version 12: your progress, to and from a file ----------
  const PX = HELP.ui.progress;
  function sumTable(s) {
    const rows = [['level', `${s.level}, ${s.title}`], ['xp', s.xp], ['played', s.played], ['won', s.won], ['captured', `${s.captured} of 36`], ['records', s.records]]
      .concat(meta() && meta().forecast ? [['forecasts', s.forecasts]] : [], [['arcs', s.arcs]]);
    return `<table class="psum">${rows.map(([k, v]) => `<tr><th scope="row">${esc(PX.rows[k])}</th><td>${esc(String(v))}</td></tr>`).join('')}</table>`;
  }
  // The feedback link shows only when parts/help.json names an address. It opens the player's own mail app and sends nothing itself.
  function feedbackHtml() {
    const f = HELP.ui.feedback;
    if (!f || !f.email) return '';
    const subject = `${f.subject} · ${document.title}`;
    const body = `${f.intro}\n\n${document.title} · ${location.href.split('#')[0]}`;
    const href = `mailto:${f.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return `<div class="card feedback"><p><a class="btn" href="${esc(href)}">${esc(f.label)}</a></p><p class="small muted">${esc(f.intro)}</p></div>`;
  }
  function saveFile(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  route(/^\/progress$/, async () => {
    if (!DEMO) { render(`<h1>${esc(PX.title)}</h1><p class="muted">An account keeps your progress in the full game.</p>`); return; }
    const { summary: now, persist } = await api('/demo/summary');
    render(html`
      <h1>${esc(PX.title)}</h1>
      <p>${esc(PX.intro)}</p>
      ${persist === false ? `<p class="err" role="alert">${esc(PX.noStore)}</p>` : ''}
      <section class="card" aria-labelledby="pnow"><h2 id="pnow">${esc(PX.now)}</h2>${sumTable(now)}
        <p class="row"><button type="button" class="primary" id="psave">${esc(PX.save)}</button></p></section>
      <section class="card" aria-labelledby="pload"><h2 id="pload">${esc(PX.load)}</h2>
        <p class="small" id="pnote">${esc(PX.loadNote)}</p>
        <input type="file" id="pfile" accept=".json,application/json" aria-labelledby="pload" aria-describedby="pnote">
        <div id="pout" role="status"></div></section>
      <section class="card"><p class="row"><button type="button" id="pclear">${esc(PX.clear)}</button></p></section>
      ${feedbackHtml()}
    `);
    const fresh = async (msg) => { hintState.seen = null; state.me = null; try { state.me = (await api('/me')).user; } catch { /* none yet */ } T.nav(); toast(msg); location.hash = '#/'; };
    $('#psave').addEventListener('click', async () => {
      try { const { file } = await api('/demo/export'); saveFile(`tdw-progress-${file.build}-${file.exported.slice(0, 10)}.json`, JSON.stringify(file) + '\n'); toast(PX.saved); }
      catch (e) { toast(e.message); }
    });
    $('#pfile').addEventListener('change', async (e) => {
      const out = $('#pout'); const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 10000000) { out.innerHTML = errorBox(PX.tooBig); return; }
      let file;
      try { file = JSON.parse(await f.text()); } catch { out.innerHTML = errorBox(PX.notFile); return; }
      let r;
      try { r = await api('/demo/import', { file }); } catch (err) { out.innerHTML = errorBox(err); return; }
      out.innerHTML = `<h3>${esc(PX.holds)}</h3>${sumTable(r.summary)}<p class="row"><button type="button" class="primary" id="preplace">${esc(PX.replace)}</button></p>`;
      $('#preplace').addEventListener('click', async (ev) => {
        const b = ev.currentTarget;
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = PX.replaceAgain; return; }
        b.disabled = true;
        try { await api('/demo/import', { file, apply: true }); await fresh(PX.loaded); } catch (err) { out.innerHTML = errorBox(err); }
      });
    });
    $('#pclear').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = PX.clearAgain; return; }
      await api('/demo/reset', {}); await fresh(PX.cleared);
    });
  }, 10);

  // ---------- glossary ----------
  route(/^\/glossary(\?.*)?$/, async () => {
    const terms = glossTerms().slice().sort((a, b) => a.term.localeCompare(b.term));
    const named = Object.fromEntries(terms.map((x) => [x.id, x.term]));
    const entry = (x) => {
      const see = x.see.filter((s) => named[s]);
      return `<div class="gterm" data-g="${esc(x.id)}"><dt id="g-${esc(x.id)}" tabindex="-1">${esc(x.term)}</dt><dd><p>${esc(x.text)}</p>`
        + (see.length ? `<p class="small">${esc(HELP.ui.glossSee)} ${see.map((s) => `<a href="#/glossary?t=${esc(s)}">${esc(named[s])}</a>`).join(' · ')}</p>` : '')
        + (x.how && howHas(x.how) ? `<p class="small"><a href="#/how?s=${esc(x.how)}">${esc(HELP.ui.hintMore)}</a></p>` : '') + '</dd></div>';
    };
    render(html`
      <h1>${esc(HELP.ui.glossTitle)}</h1>
      <p class="small muted">${esc(HELP.ui.glossIntro)}</p>
      <div class="glossfind"><label for="gq">${esc(HELP.ui.glossFilter)}</label><input id="gq" type="search" autocomplete="off" aria-controls="gloss"></div>
      <p class="small muted" id="gcount" role="status">${esc(countText(terms.length))}</p>
      <dl class="gloss" id="gloss">${terms.map(entry).join('')}</dl>
      <p class="muted" id="gnone" hidden>${esc(HELP.ui.glossNone)}</p>
    `);
    const q = $('#gq');
    q.addEventListener('input', () => {
      const s = q.value.trim().toLowerCase(); let n = 0;
      $$('.gterm').forEach((el) => { const x = terms.find((y) => y.id === el.dataset.g); const on = !s || `${x.term} ${x.text}`.toLowerCase().includes(s); el.hidden = !on; if (on) n++; });
      $('#gnone').hidden = n > 0;
      $('#gcount').textContent = countText(n);
    });
    const t = qs(location.hash).t;
    const tgt = t && document.getElementById('g-' + t);
    if (tgt) { tgt.closest('.gterm').classList.add('hit'); tgt.scrollIntoView({ block: 'start' }); tgt.focus({ preventScroll: true }); }
  }, 10);

  // ---------- records: result codes, replay, after-action report, challenge links ----------
  // Every finished run yields a code that holds its seed and actions. The game replays the code to verify the result.
  const REC = () => window.TDWRecord;
  let rctx = null;
  const rc = () => (rctx = rctx || REC().page());
  const baseUrl = () => location.href.split('#')[0];
  const recLink = (code) => `${baseUrl()}#/v/${code}`;
  const chLink = (key) => `${baseUrl()}#/ch/${key}`;
  const randSeed = () => { const a = new Uint8Array(6); try { crypto.getRandomValues(a); } catch { for (let i = 0; i < 6; i++) a[i] = Math.floor(Math.random() * 256); } return [...a].map((x) => x.toString(16).padStart(2, '0')).join(''); };
  async function copyText(text, ok) {
    try { await navigator.clipboard.writeText(text); toast(ok || 'Copied.'); return; } catch { /* fall back below */ }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'offscreen';
    document.body.appendChild(ta); ta.select();
    let done = false;
    try { done = document.execCommand('copy'); } catch { /* blocked */ }
    ta.remove();
    toast(done ? (ok || 'Copied.') : 'Select the text and copy it.');
  }
  const applyHeights = (root = T.main) => $$('[data-h]', root).forEach((el) => { el.style.height = Math.max(0, Math.min(100, Number(el.dataset.h))) + '%'; });
  const sameRun = (r, s) => r.opId === s.opId && r.tier === s.tier && r.seed === s.seed;
  async function ownRecords() { try { return (await api('/records')).records; } catch { return []; } }
  const outcomeLine = (s) => (s.outcome === 'win'
    ? `${s.reason === 'lever' ? 'The lever was cut' : 'The line held'} with ${s.leverage} of ${s.consumeAt} leverage.`
    : `The operation reached Consume on turn ${s.turns} of ${s.maxTurns}.`);
  const dayNoOf = (s) => (s.mode === 'daily' ? ` #${REC().dayNumber(rc(), s.seed.slice(6))}` : '');
  const sendText = (title, tier, r, code) => `TDW challenge: ${title}, Tier ${tier}.\nMy result: ${r.score} points, ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}.\nCheck it by replay, then send yours back: ${recLink(code)}`;

  function reachReportHtml(rep) {
    const r = rep.reach;
    if (!r || !r.length) return '';
    const closed = r.filter((m) => m.permit === 'barred');
    const priced = r.filter((m) => m.permit === 'priced' && m.used);
    const item = (m, lead) => `<li><b>${esc(m.name)}.</b> ${lead} <span class="small muted">${m.evidence.map((x) => esc(x.id)).join(', ')}</span></li>`;
    const rows = closed.map((m) => item(m, `${m.mirror ? `The rival used it ${m.mirror} time${m.mirror > 1 ? 's' : ''} in this run. ` : 'The rival did not use it in this run. '}It was closed to you.`))
      .concat(priced.map((m) => item(m, `You used it and paid for it.`))).join('');
    return `<h3>What your rules closed</h3><ul class="own">${rows || '<li>Nothing closed in this run.</li>'}</ul><p class="small muted">The permits are the game's reading of the evidence cards. They are not a count of anything.</p>`;
  }

  function ownHtml(rep) {
    const o = rep.own;
    if (!o || !o.sides.some((s) => s.acts.length)) return '';
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const rows = o.sides.map((s) => {
      const by = {}; s.acts.forEach((a) => { (by[a.type] = by[a.type] || []).push(a); });
      const body = s.acts.length ? Object.entries(by).map(([t, l]) => `${esc(cap(t))} (${[...new Set(l.map((a) => a.why))].map(esc).join(', ')}) on turn${l.length > 1 ? 's' : ''} ${l.map((a) => a.turn).join(', ')}`).join('. ') + '.' : 'None recorded.';
      return `<li><b>${esc(s.name)}</b>${s.player ? ' (you)' : ''}. ${body}</li>`;
    }).join('');
    return `<h3>Acts against its own position</h3><ul class="own">${rows}</ul><p class="small muted">Each act is typed by what it was when it happened. The result does not decide it.</p>`;
  }

  function reportHtml(rep, own) {
    const s = rep.summary;
    const top = Math.max(1, ...rep.ledger.map((x) => x.n));
    const ledger = rep.ledger.length
      ? `<ul class="ledger">${rep.ledger.slice(0, 6).map((x) => `<li><span>${esc(x.label)}</span><span class="bar"><i data-w="${Math.round((100 * x.n) / top)}"></i></span><b>${x.n}</b></li>`).join('')}</ul>`
      : '<p class="muted">The opponent banked no leverage.</p>';
    const relief = rep.relief.length ? `<p class="small muted">Leverage removed through: ${rep.relief.map((x) => `${esc(x.label)} (${x.n})`).join(', ')}.</p>` : '';
    const press = rep.pressure.length ? `${rep.pressure.slice(0, 4).map((x) => `${esc(x.label)} ${x.n}`).join(', ')}. Shields absorbed ${rep.absorbed}.` : `No pressure landed. Shields absorbed ${rep.absorbed}.`;
    const curve = `<div class="curve" role="img" aria-label="Opponent leverage after each turn, out of ${s.consumeAt}">${rep.curve.map((c) => `<span class="cv" title="Turn ${c.turn}: ${c.leverage} of ${s.consumeAt}"><i data-h="${Math.min(100, Math.round((100 * c.leverage) / s.consumeAt))}"></i><em>${c.turn}</em></span>`).join('')}</div>`;
    const w = rep.worstTurn;
    const worst = w ? `<h3>The costliest turn</h3><p>Turn ${w.turn} cost the most. The opponent gained ${w.gain}: ${w.causes.map((x) => `${esc(x.label)} (${x.n})`).join(', ')}.</p>` : '';
    const who = own ? 'You' : 'The player';
    const named = rep.named ? `${who} named ${esc(rep.named.d)} as the lever on turn ${rep.named.turn} and ${rep.named.correct ? 'was right' : 'was wrong'}.` : `${who} did not name the lever.`;
    const idle = rep.idle ? `${rep.idle} action${rep.idle === 1 ? '' : 's'} went unspent.` : `${who} spent every action.`;
    return `<div class="card report">
      <div class="label">After-action report</div>
      <h3>Where the opponent's leverage came from</h3>${ledger}${relief}
      <h3>Leverage after each turn</h3>${curve}
      <p class="small muted">Turn numbers sit under the bars. A full bar is Consume.</p>
      <h3>Pressure that landed</h3><p>${press}</p>
      ${worst}
      <h3>The play</h3><p>${rep.stats.detects} Detect, ${rep.stats.disrupts} Disrupt, ${rep.stats.defends} Defend. ${idle} ${named}</p>
      ${reachReportHtml(rep)}
      ${ownHtml(rep)}
      <h3>What to change</h3><ul class="changes">${rep.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <p class="small muted">Computed from the action log. It describes what happened, not what would have happened.</p>
    </div>`;
  }

  function rpTile(b, spine) {
    const cls = ['tile', 'rp', b.theater ? 'theater' : '', b.p >= 5 ? 'captured' : ''].join(' ');
    const badges = [b.d === spine ? '<span class="badge lever">LEVER</span>' : '', b.critical && b.d !== spine ? '<span class="badge crit">LOAD</span>' : '', b.gated ? '<span class="badge gate">GATED</span>' : '', b.lock ? `<span class="badge">LOCK ${b.lock}</span>` : ''].join('');
    const pips = [0, 1, 2, 3, 4].map((i) => `<span class="pp ${i < b.p ? 'on' : ''}"></span>`).join('');
    const label = `${b.d}: pressure ${b.p} of 5, ${b.s} shields${b.slope ? `, slope ${b.slope}` : ''}${b.gated ? ', gated' : ''}`;
    return `<div class="${cls}" role="group" aria-label="${esc(label)}"><span class="badges">${badges}</span><span class="row1">${icon(b.d)}</span><span class="dn">${tileName(b.d)}</span><span class="srow">${shieldSvg.repeat(b.s)}${b.slope ? `<span class="slope">↗+${b.slope}</span>` : ''}</span><span class="ppips">${pips}</span></div>`;
  }

  function replayHtml(res) {
    const n = res.frames.length - 1;
    return `<div class="card replay" id="replay">
      <div class="label">Replay</div>
      <div class="rp-head"><b id="rpl" aria-live="polite"></b><span class="small muted" id="rpm"></span></div>
      <div class="rp-controls"><button type="button" id="rpprev" aria-label="Previous step">Back</button><button type="button" id="rpplay">Play</button><button type="button" id="rpnext" aria-label="Next step">Next</button><input type="range" id="rprange" min="0" max="${n}" value="0" aria-label="Replay step"></div>
      <div id="rplc"></div>
      <h3>The opponent's cards this turn</h3>
      <ul class="rp-hand" id="rph"></ul>
      <h3>The board</h3>
      <div class="board" id="rpb"></div>
      <h3>What happened</h3>
      <ol class="rp-events" id="rpe"></ol>
    </div>`;
  }

  function wireReplay(res) {
    const R = REC(); const ctx = rc(); const s = res.summary;
    const n = res.frames.length - 1;
    let i = 0; let timer = null;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } const b = $('#rpplay'); if (b) b.textContent = 'Play'; };
    function draw() {
      const f = res.frames[i]; const sn = f.snap;
      $('#rpl').textContent = i === 0 ? f.label : `${i}. ${f.label}`;
      $('#rpm').textContent = `Step ${i} of ${n} · Turn ${sn.turn}`;
      $('#rprange').value = String(i);
      const st = Math.min(sn.stage, 4);
      $('#rplc').innerHTML = lifecycleHtml({ leverage: sn.leverage, consumeAt: sn.consumeAt, thresholds: [0.25, 0.5, 0.75, 1].map((x) => Math.ceil(sn.consumeAt * x)), stage: st, stageName: meta().stages[st] });
      // The hand belongs to the latest turn start at or before this step. Events since then mark what happened to each card.
      let h = 0; for (let j = i; j >= 0; j--) if (res.frames[j].hand) { h = j; break; }
      const seen = {};
      for (let j = h; j <= i; j++) for (const e of res.frames[j].ev) { if (e.id != null) { if (e.k === 'reveal') seen[e.id] = seen[e.id] || 'detected'; if (e.k === 'cancel') seen[e.id] = 'disrupted'; if (e.k === 'resolve' || e.k === 'fizzle') seen[e.id] = 'landed'; if (e.k === 'offer') seen[e.id] = e.accepted ? 'accepted' : 'passed'; } }
      $('#rph').innerHTML = res.frames[h].hand.map((c) => `<li class="g-${esc(c.group)}"><b>${esc(c.label)}</b>${c.target ? ` at ${esc(c.target)}${c.amount ? ` (${c.amount})` : ''}` : ''}${c.fake ? ' · decoy' : ''}${c.offer ? ' · offer' : ''}${seen[c.id] ? ` · <span class="best">${seen[c.id]}</span>` : ''}</li>`).join('') || '<li class="muted">No cards this turn.</li>';
      $('#rpb').innerHTML = sn.board.map((b) => rpTile(b, s.spine)).join('');
      const lines = f.ev.map((e) => R.describe(e, ctx)).filter(Boolean);
      $('#rpe').innerHTML = (lines.length ? lines : [i === 0 ? 'The opponent has played its first cards. Nothing has landed yet.' : 'Nothing further happened.']).map((t) => `<li>${esc(t)}</li>`).join('');
      applyWidths(T.main);
      $$('.lc-tick').forEach((el) => { el.style.left = el.dataset.left + '%'; });
    }
    const go1 = (k) => { i = Math.max(0, Math.min(n, k)); draw(); };
    $('#rpprev').addEventListener('click', () => { stop(); go1(i - 1); });
    $('#rpnext').addEventListener('click', () => { stop(); go1(i + 1); });
    $('#rprange').addEventListener('input', (e) => { stop(); go1(Number(e.target.value)); });
    $('#rpplay').addEventListener('click', () => {
      if (timer) { stop(); return; }
      if (i >= n) go1(0);
      $('#rpplay').textContent = 'Pause';
      timer = setInterval(() => { if (!$('#replay')) { stop(); return; } if (i >= n) { stop(); return; } go1(i + 1); }, 1100);
    });
    draw();
  }

  function verifiedCard(res, link) {
    const s = res.summary;
    const lens = s.lens ? ` · Lens: ${esc(meta().lenses[s.lens]?.name || s.lens)}` : '';
    const doc = s.doctrine ? ` · Doctrine: ${esc(meta().doctrines[s.doctrine]?.name || s.doctrine)}` : '';
    return `<div class="card verified"><div class="label"><span class="ok">Verified by replay</span> · ${esc(MODE[s.mode] || 'Operation')}${dayNoOf(s)}</div>
      <h3>${esc(s.title)}${s.watch ? ' ' + watchChip(s.watch) : ''}</h3>
      <p>${stars(s.stars)} Score <b>${s.score}</b> · Tier ${s.tier}. ${esc(outcomeLine(s))}</p>
      <p class="small muted">${s.actions} actions from seed ${esc(s.seed)}${lens}${doc}</p>
      ${link ? `<a class="btn" href="#/v/${esc(link)}">Open the full record</a>` : ''}</div>`;
  }

  function compareHtml(a, b, an, bn) {
    const c = REC().compare(a, b);
    if (!c.same) return '<div class="card"><div class="label">Comparison</div><p>These results come from different openings, so their scores do not compare. A fair contest uses one operation, one tier and one seed.</p></div>';
    const A = a.summary; const B = b.summary;
    const res = (s) => (s.outcome === 'win' ? (s.reason === 'lever' ? 'Lever cut' : 'Held the line') : 'Consumed');
    const lev = (s) => (s.leverCorrect === true ? 'Named, right' : s.leverCorrect === false ? 'Named, wrong' : 'Not named');
    const row = (k, f, cls) => `<tr><th scope="row">${k}</th><td class="${cls && cls(A, B) ? 'win' : ''}">${f(A)}</td><td class="${cls && cls(B, A) ? 'win' : ''}">${f(B)}</td></tr>`;
    const banner = c.winner === 'tie' ? 'The scores tie.' : `${c.winner === 'a' ? an : bn} won by ${Math.abs(A.score - B.score)} points.`;
    return `<div class="card"><div class="label">Same opening, two results</div><h3>${esc(banner)}</h3>
      <div class="scroll"><table class="cmp"><tr><th></th><th>${esc(an)}</th><th>${esc(bn)}</th></tr>
      ${row('Result', res)}${row('Stars', (s) => '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars), (x, y) => x.stars > y.stars)}${row('Score', (s) => String(s.score), (x, y) => x.score > y.score)}${row('Turns', (s) => String(s.turns))}${row('Leverage at the end', (s) => `${s.leverage} of ${s.consumeAt}`, (x, y) => x.leverage < y.leverage)}${row('Domains lost', (s) => String(s.captured), (x, y) => x.captured < y.captured)}${row('The lever', lev)}
      </table></div></div>`;
  }

  function drawVerified(res, code, mine, reveal) {
    const R = REC(); const ctx = rc(); const s = res.summary;
    const own = mine.some((r) => r.code === code);
    const other = mine.slice().sort((a, b) => a.id - b.id).find((r) => r.code !== code);
    const gated = s.mode === 'challenge' && !mine.length && !reveal;
    const you = other ? R.verify(other.code, ctx) : null;
    const key = `${s.opId}~${s.tier}~${s.seed}`;
    const loadout = `${s.lens ? ` with the ${esc(meta().lenses[s.lens]?.name || s.lens)} lens` : ''}${s.doctrine ? ` and the ${esc(meta().doctrines[s.doctrine]?.name || s.doctrine)} doctrine card` : ''}`;
    const gate = `<div class="card"><div class="label">Replay held back</div><p>This is a challenge result. The replay shows every move, so it spoils the opening for anyone who has not played it. Play the seed first, then compare.</p><div class="row"><a class="btn primary" href="#/ch/${esc(key)}">Play this seed</a><button type="button" id="reveal">Show the replay anyway</button></div></div>`;
    render(html`
      <div class="hero">
        <div class="kicker">Verified record · ${esc(MODE[s.mode] || 'Operation')}${dayNoOf(s)}</div>
        <h1>${esc(s.title)}</h1>
        ${s.watch ? `<p>${watchChip(s.watch)}</p>` : ''}
        <p>${esc(s.opponent)} · ${esc(s.dimension)} · Tier ${s.tier}</p>
        <div class="row">${stars(s.stars)} <span>Score ${s.score}</span></div>
      </div>
      <div class="card verified"><div class="label"><span class="ok">Verified by replay</span></div>
        <p>${esc(outcomeLine(s))} The game replayed ${s.actions} actions from seed <code>${esc(s.seed)}</code>${loadout} and reached this result. No server took part.</p>
        ${own ? '<p class="small muted">This is your record.</p>' : ''}</div>
      ${you && you.ok ? compareHtml(you, res, 'You', 'Your opponent') : ''}
      ${gated ? gate : reportHtml(R.report(res, ctx, { third: !own }), own) + replayHtml(res)}
      <div class="row"><button type="button" id="cpcode">Copy the code</button><button type="button" id="cplink">Copy the link</button>${s.mode === 'challenge' ? `<a class="btn primary" href="#/ch/${esc(key)}">Play this seed</a>` : `<a class="btn primary" href="#/op/${esc(s.opId)}">Play this operation</a>`}<a class="btn" href="#/records">Records</a></div>
    `);
    applyWidths(T.main); applyHeights(T.main);
    $('#cpcode').addEventListener('click', () => copyText(code, 'Code copied.'));
    $('#cplink').addEventListener('click', () => copyText(recLink(code), 'Link copied.'));
    const rv = $('#reveal'); if (rv) rv.addEventListener('click', () => drawVerified(res, code, mine, true));
    if ($('#replay')) wireReplay(res);
  }

  route(/^\/v\/(.+)$/, async (raw) => {
    let code; try { code = decodeURIComponent(raw); } catch { code = raw; }
    const res = REC().verify(code, rc());
    if (!res.ok) {
      render(`<h1>This record does not verify</h1><div class="card notverified"><p class="err" role="alert">${esc(res.error)}</p><p class="small muted">The game replays every action from the seed. A code that was edited, cut short or copied wrong fails here.</p></div><p><a class="btn" href="#/records">Records</a></p>`);
      return;
    }
    drawVerified(res, code, (await ownRecords()).filter((r) => sameRun(r, res.summary)), false);
  }, 10);

  route(/^\/records$/, async () => {
    const recs = await ownRecords();
    render(html`
      <div class="headrow"><h1>Records</h1>${gl('code')}</div>
      <p class="muted">Every finished run carries a result code. Paste a code and the game replays it, action by action, to check the result. A code that verifies proves that a legal line of play earned the score.</p>
      <div class="card">
        <label class="label" for="paste">Paste one result code, or two to compare</label>
        <textarea id="paste" class="codebox" rows="4" placeholder="TDW1~C001~3~..."></textarea>
        <div class="row"><button type="button" class="primary" id="check">Verify</button></div>
      </div>
      <div id="out"></div>
      <h2>Your results</h2>
      ${DEMO ? `<p class="small"><a href="#/progress">${esc(HELP.ui.progress.link)}</a></p>` : ''}
      ${recs.length ? `<div class="card scroll"><table><tr><th>Operation</th><th>Mode</th><th>Result</th><th>Score</th><th></th></tr>${recs.map((r) => `<tr><td>${esc(r.title)}${r.watch ? ' ' + watchChip(r.watch) : ''}<div class="small muted">Tier ${r.tier}</div></td><td>${esc(MODE[r.mode] || r.mode)}${r.dayNumber ? ' #' + r.dayNumber : ''}</td><td>${stars(r.stars || 0, 'small')}</td><td>${r.score}</td><td class="nowrap"><a class="btn" href="#/v/${esc(r.code)}">Replay</a> <button type="button" data-copy="${r.id}">Copy code</button></td></tr>`).join('')}</table></div>` : '<p class="muted">Finish a run and its record appears here.</p>'}
    `);
    bind('[data-copy]', 'click', (e) => { const r = recs.find((x) => String(x.id) === e.currentTarget.dataset.copy); if (r) copyText(r.code, 'Code copied.'); });
    const R = REC(); const ctx = rc();
    const CODE = /TDW1~[A-Za-z0-9:_~.-]+/;
    $('#check').addEventListener('click', () => {
      const text = $('#paste').value;
      let items = text.split(/\n+/).map((l) => (CODE.exec(l) || [])[0]).filter(Boolean).slice(0, 2).map((c) => ({ code: c, res: R.verify(c, ctx) }));
      if (items.length <= 1 && !(items[0] && items[0].res.ok)) {
        // A code that a chat app wrapped across lines.
        const at = text.indexOf('TDW1~');
        const whole = at >= 0 ? (CODE.exec(text.slice(at).replace(/\s+/g, '')) || [])[0] : null;
        if (whole) items = [{ code: whole, res: R.verify(whole, ctx) }];
      }
      if (!items.length) { $('#out').innerHTML = '<div class="card notverified"><p class="err" role="alert">No result code found. A code starts with TDW1.</p></div>'; return; }
      const good = items.filter((x) => x.res.ok);
      $('#out').innerHTML = items.map((x) => (x.res.ok ? verifiedCard(x.res, x.code) : `<div class="card notverified"><div class="label"><span class="err">Does not verify</span></div><p class="err" role="alert">${esc(x.res.error)}</p></div>`)).join('')
        + (good.length === 2 ? compareHtml(good[0].res, good[1].res, 'First code', 'Second code') : '');
    });
  }, 10);

  function openChallengeSheet(run, title) {
    const key = `${run.opId}~${run.tier}~${randSeed()}`;
    const link = chLink(key);
    openSheet(`<h3>Challenge a friend</h3>
      <p>Your friend plays ${esc(title)} at Tier ${run.tier} from the same opening, with no lens and no doctrine card. Play it yourself too. When you both finish, swap result links. The game checks each one by replay and compares the two.</p>
      <input class="codebox" id="chl" readonly value="${esc(link)}" aria-label="Challenge link">
      <div class="acts"><button type="button" id="chcopy">Copy the link</button><button type="button" id="chmsg">Copy a message</button><a class="btn primary" href="#/ch/${esc(key)}" data-do="close">Play it now</a></div>`, (sheet) => {
      $('#chcopy', sheet).addEventListener('click', () => copyText(link, 'Link copied.'));
      $('#chmsg', sheet).addEventListener('click', () => copyText(`Take my TDW challenge: ${title}, Tier ${run.tier}. We play the same opening.\n${link}`, 'Message copied.'));
      $('[data-do="close"]', sheet).addEventListener('click', closeSheet);
    });
  }

  route(/^\/ch\/(.+)$/, async (raw) => {
    let txt; try { txt = decodeURIComponent(raw); } catch { txt = raw; }
    const ch = REC().parseChallenge(txt);
    if (!ch) { render('<h1>This challenge link is not valid</h1><div class="card"><p class="err" role="alert">Ask your friend to send it again.</p></div><p><a class="btn" href="#/ops">More operations</a></p>'); return; }
    const d = await api('/ops/' + ch.opId);
    const o = d.op;
    const first = (await ownRecords()).filter((r) => r.mode === 'challenge' && r.opId === ch.opId && r.tier === ch.tier && r.seed === ch.seed).sort((a, b) => a.id - b.id)[0];
    render(html`
      <div class="hero">
        <div class="kicker">Challenge · Tier ${ch.tier}</div>
        <h1>${esc(o.title)}</h1>
        <p>${md(o.brief)}</p>
        <p class="pill-row"><span class="chip2">${esc(o.opponent)}</span><span class="chip2">${esc(o.label)}</span><span class="chip2 dimchip">${esc(o.dimension)}</span></p>
        <div class="row"><button type="button" class="primary" id="accept">${first ? 'Play it again as practice' : 'Accept the challenge'}</button></div>
      </div>
      <div class="card"><div class="label">The terms</div><p>You and your opponent face the same opening. Lenses and doctrine cards stay home. When you finish, send your result back. The game checks every result by replay, so no one can edit a score.</p></div>
      ${first ? `<div class="card"><div class="label">Your result</div><p>${stars(first.stars || 0)} Score <b>${first.score}</b></p><div class="row"><a class="btn primary" href="#/v/${esc(first.code)}">Open your record</a><button type="button" id="sendres">Send your result</button></div></div>` : ''}
    `);
    $('#accept').addEventListener('click', () => startRun({ mode: 'challenge', opId: ch.opId, tier: ch.tier, seed: ch.seed }).catch((e) => toast(e.message)));
    const sr = $('#sendres'); if (sr) sr.addEventListener('click', () => copyText(sendText(o.title, ch.tier, first, first.code), 'Message copied. Paste it to your friend.'));
  }, 10);

  // The record and report cards under a finished run.
  function recordCards(d) {
    if (!d.code) return '';
    const R = REC(); const ctx = rc();
    const res = R.verify(d.code, ctx);
    if (!res.ok) return '';
    return `<div class="card record">
      <div class="label">Your record</div>
      <p>This code replays your run. Anyone can paste it into Records and the game checks your score. It holds the seed and every action, so it spoils the operation for anyone who has not played it.</p>
      <textarea class="codebox" id="rcode" readonly rows="3" aria-label="Result code">${esc(d.code)}</textarea>
      <div class="row"><button type="button" id="rcopy">Copy the code</button><button type="button" id="rlink">Copy the replay link</button><a class="btn" href="#/v/${esc(d.code)}">Watch the replay</a>${d.run.mode === 'challenge' ? '<button type="button" class="primary" id="sendres">Send your result</button>' : ''}</div>
    </div>${reportHtml(R.report(res, ctx), true)}`;
  }
  function wireRecordCards(d) {
    if (!d.code || !$('#rcode')) return;
    $('#rcopy').addEventListener('click', () => copyText(d.code, 'Code copied.'));
    $('#rlink').addEventListener('click', () => copyText(recLink(d.code), 'Link copied.'));
    const sr = $('#sendres'); if (sr) sr.addEventListener('click', () => copyText(sendText(d.view.op.title, d.run.tier, { score: d.view.over.score, stars: d.view.over.stars }, d.code), 'Message copied. Paste it to your friend.'));
    applyWidths(T.main); applyHeights(T.main);
  }

  // ---------- challenges ----------
  route(/^\/c\/([A-Za-z0-9]{4,10})$/, async (code) => {
    const d = await api('/challenges/' + code);
    const o = d.op;
    const isAsyncChallenge = d.challenge?.status === 'pending' || d.challenge?.status === 'accepted' || d.challenge?.status === 'complete';
    const isComplete = d.challenge?.status === 'complete';

    render(html`
      <div class="hero">
        <div class="kicker">${isAsyncChallenge ? '1v1 Challenge' : 'Challenge'} ${esc(d.code)} · Tier ${d.tier}</div>
        <h1>${esc(o.title)}</h1>
        <p>${esc(d.creator)} ${isAsyncChallenge ? 'challenged you to face' : 'sent you'} this operation. You both face the same opening. Lenses and doctrine cards stay home.</p>
        <p class="pill-row"><span class="chip2">${esc(o.opponent)}</span><span class="chip2">${esc(o.label)}</span><span class="chip2 dimchip">${esc(o.dimension)}</span></p>
        <div class="row"><button class="primary" id="play">${isComplete ? 'View challenge' : 'Accept the challenge'}</button></div>
      </div>
      <h2>${isAsyncChallenge ? 'Leaderboard' : 'Results'}</h2>
      <div class="card scroll">${d.results.length ? `<table><tr><th>#</th><th>Player</th><th>Result</th><th>Score</th></tr>${d.results.map((x) => `<tr class="${x.me ? 'me' : ''}"><td>${x.rank}</td><td>${esc(x.name)}</td><td>${stars(x.stars || 0, 'small')}</td><td>${x.score}</td></tr>`).join('')}</table>` : '<p class="muted">No results yet.</p>'}</div>
      <p><button id="copy">Copy the challenge link</button></p>
    `);
    $('#play').addEventListener('click', async () => {
      try {
        if (isAsyncChallenge && !isComplete) await api(`/api/challenge/${code}/accept`);
        await startRun({ mode: 'challenge', code: d.code });
      } catch (e) { toast(e.message); }
    });
    $('#copy').addEventListener('click', () => shareText(`Take my TDW challenge: ${o.title}.`, `${location.origin}/#/c/${d.code}`));
  }, 10);
})();
