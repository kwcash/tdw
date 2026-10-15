#!/usr/bin/env python3 -I
"""Version 6 of the bundle: forecast mode. Reads out/game.v5.js and parts/style.v5.css, writes out/game.js and parts/style.css.
The engine, the record module and every rule stay as they were. Forecast mode lives in the client and the demo shim, and only
a build whose content names a `forecast` block shows it."""
import sys, pathlib
root = pathlib.Path(__file__).parent


def patch(src, pairs, label):
    s = src
    for i, (old, new) in enumerate(pairs):
        n = s.count(old)
        if n != 1:
            sys.exit(f"{label}: anchor #{i} matched {n} times (need exactly 1):\n{old[:170]}")
        s = s.replace(old, new)
    return s


MARK = '/* TDW demo shim.'
g = (root / 'out/game.v5.js').read_text()
engine_before = g.split(MARK)[0]

SHIM_ROUTES = r"""  on('GET', /^\/api\/calendar$/, () => ({ calendar: C.calendar || [], note: C.calendarNote || '' }));

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
"""

CLIENT = r"""  // ---------- forecasts ----------
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
    return `<h1>Forecast</h1>
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
      render(html`${fcIntro(D.cfg)}
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

"""

g = patch(g, [
    # shim: the player's own forecasts, and the content block in the meta
    ("""  on('GET', /^\\/api\\/calendar$/, () => ({ calendar: C.calendar || [], note: C.calendarNote || '' }));
""", SHIM_ROUTES),
    ("""    copy: C.copy || null,
""", """    copy: C.copy || null,
    forecast: C.forecast || null,
"""),
    # nav
    ("""[['#/', 'Home'], ['#/ops', 'Play'], ['#/arcs', 'Campaign'], ['#/codex', 'Codex'], ['#/records', 'Records'], ['#/how', 'How to play']]
        .map(""", """[['#/', 'Home'], ['#/ops', 'Play'], ['#/arcs', 'Campaign'], ['#/codex', 'Codex'], ['#/records', 'Records']].concat(state.meta && state.meta.forecast ? [['#/forecast', 'Forecast']] : [], [['#/how', 'How to play']])
        .map("""),
    # home card
    ("""      ${calendarHtml(calData)}
      ${!prog.tutorialDone ?""", """      ${calendarHtml(calData)}
      ${fcHomeCard()}
      ${!prog.tutorialDone ?"""),
    ("""      ${calendarHtml(calData)}
      <div class="tiles2">
        <div class="card"><div class="label">Every day</div>""", """      ${calendarHtml(calData)}
      ${fcHomeCard()}
      <div class="tiles2">
        <div class="card"><div class="label">Every day</div>"""),
    # routes
    ("""  // ---------- codex ----------
""", CLIENT + """  // ---------- codex ----------
"""),
], 'game')

# nothing before the shim may change, so the engine and every result code stay as they were
assert g.split(MARK)[0] == engine_before, 'the engine part changed'

css = (root / 'parts/style.v5.css').read_text()
css += r"""
/* ---- version 6: forecast mode ---- */
.fc { margin: 12px 0; display: grid; gap: 8px; }
.fc-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.fc-text { margin: 0; font-weight: 600; }
.fc-st { font-weight: 700; }
.fc-open .fc-st { border-color: var(--good); color: var(--good); }
.fc-locked .fc-st { border-color: var(--detect); color: var(--detect); }
.fc-closed { opacity: .8; }
.fc-hash.ok { color: var(--muted); }
.fc-hash.bad { color: var(--bad); font-weight: 700; }
.fc-form { display: grid; gap: 6px; }
.fc-form label { font-size: 14px; color: var(--muted); }
.fc-form input[type=number] { width: 7em; }
.fc-form input[type=date], .fc-form input[type=url], .fc-form input[type=text], .fc-form select { max-width: 100%; min-height: 44px; }
.fc-yours, .fc-ref p, .fc-res p { margin: 0; }
.fc-ref { padding: 8px 10px; border-left: 3px solid var(--line); background: var(--bg); border-radius: 6px; }
.fc-res { display: grid; gap: 6px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; }
table.fc-score { border-collapse: collapse; width: 100%; max-width: 420px; }
table.fc-score th, table.fc-score td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--line); font-size: 14px; }
.fcsec > summary { cursor: pointer; list-style: none; }
.fcsec > summary::-webkit-details-marker { display: none; }
.fcsec > summary h2 { display: inline; font-size: 20px; }
.fc-rules summary { cursor: pointer; font-size: 14px; }
section.card > h2:first-child { margin-top: 4px; }
"""
(root / 'out/game.js').write_text(g)
(root / 'parts/style.css').write_text(css)
print('patched: game, style. OK')
