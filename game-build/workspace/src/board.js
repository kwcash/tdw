/* TDW Operations: the board game client. Talks to the server, which holds every game state. */
(function () {
  const T = window.TDW;
  if (!T) return;
  const { $, $$, esc, md, api, html, render, applyWidths, errorBox, bind, route, state, needLogin } = T;
  // The single-page demo runs without a server. It keeps progress in this browser and hides accounts and challenges.
  const DEMO = !!window.TDW_DEMO;
  // Help text shared by every build. It comes from parts/help.json.
  const HELP = __HELP__;

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

  // One live region that stays on the page while the board redraws, so a screen reader reads out each turn's results.
  // The board creates it on first draw, so it is in place before any text arrives.
  // It empties when the player leaves the page, so no stale text waits on later pages.
  let liveTimer = 0;
  function liveRegion() {
    let live = document.getElementById('sr-turn');
    if (!live) {
      live = document.createElement('div'); live.id = 'sr-turn'; live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true'); document.body.appendChild(live);
      window.addEventListener('hashchange', () => { clearTimeout(liveTimer); live.textContent = ''; });
    }
    return live;
  }
  function announce(text) {
    const live = liveRegion();
    clearTimeout(liveTimer); live.textContent = '';
    liveTimer = setTimeout(() => { live.textContent = text; }, 50);
  }

  function drawBoard() {
    liveRegion();
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
      ${G.feed.length ? `<div class="feed">${G.feed.map((f, i) => `<p class="${f.cls || ''}" data-delay="${i}">${esc(f.text)}</p>`).join('')}</div>` : ''}
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
        announce(HELP.ui.live.unspent.replace('{n}', v.ap));
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
      const said = G.feed.map((f) => f.text).join(' ');
      // The feed often names the new turn already, so the turn number goes first only when it does not.
      if (action.type === 'end') announce(`${r.view.over ? HELP.ui.live.over + ' ' : /\bTurn \d+/.test(said) ? '' : HELP.ui.live.turn.replace('{n}', r.view.turn) + ' '}${said || HELP.ui.live.quiet}`);
      else if (said) announce(said);
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
