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
