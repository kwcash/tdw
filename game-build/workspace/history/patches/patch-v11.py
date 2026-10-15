#!/usr/bin/env python3 -I
"""Version 11 of the bundle: a glossary of the terms the board uses, at #/glossary, and a small link from each panel to its term.
A term shows when the build has the rule behind it. The words live in parts/help.json. The engine and the record module do not change.
Reads out/game.v10.js, out/record.v10.js, parts/style.v10.css and parts/help.json. Writes out/game.js, out/engine.js, out/record.js,
parts/record.js and parts/style.css."""
import re, sys, json, pathlib
root = pathlib.Path(__file__).parent

def patch(src, pairs, label):
    s = src
    for i, (old, new) in enumerate(pairs):
        n = s.count(old)
        if n != 1:
            sys.exit(f"{label}: anchor #{i} matched {n} times (need exactly 1):\n{old[:170]}")
        s = s.replace(old, new)
    return s

HELP = json.loads((root / 'parts/help.json').read_text(encoding='utf-8'))
help_js = json.dumps(HELP, ensure_ascii=False, separators=(',', ':'))
assert '\n' not in help_js and '</' not in help_js

g = (root / 'out/game.v10.js').read_text()
m = re.findall(r'\n  const HELP = \{.*\};\n', g)
if len(m) != 1: sys.exit('game: the HELP line matched %d times' % len(m))
g = g.replace(m[0], '\n  const HELP = ' + help_js + ';\n')
g = patch(g, [
 # ---------------- demo shim: what decides which terms a build shows ----------------
 ("""  const META = {""", """  // What decides which glossary terms a build shows. Each count mirrors the panel it explains.
  const PICK = OPS.filter((o) => !o.hidden);
  const legitOf = (o) => !!(o.rules && o.rules.legitimacy !== undefined ? o.rules.legitimacy : REG.ruleset.legitimacy);
  const multiOf = (o) => Array.isArray(o.factions) && o.factions.length > 2;
  const META = {"""),
 ("""reach: OPS.filter((o) => !o.hidden && Array.isArray(o.reach) && o.reach.length).length },""",
  """reach: OPS.filter((o) => !o.hidden && Array.isArray(o.reach) && o.reach.length).length, legit: PICK.filter(legitOf).length, leaders: PICK.filter((o) => (o.cadres || []).length).length, pacts: PICK.filter((o) => (o.pacts || []).length).length, factions: PICK.filter((o) => multiOf(o) || legitOf(o) || (o.pacts || []).length).length, watch: PICK.filter((o) => o.kind === 'watch').length, world: PICK.filter((o) => o.world).length },"""),

 # ---------------- board client: helpers ----------------
 ("""  const howOn = () => ({""", """  // ---------- version 11: the glossary ----------
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
  const howOn = () => ({"""),

 # ---------------- the board ----------------
 ("""<span>Lifecycle · <b>${esc(v.stageName)}</b></span>""", """<span>Lifecycle · <b>${esc(v.stageName)}</b> ${gl('lifecycle', true)}</span>"""),
 ("""<div class="lbl">Actions</div>""", """<div class="lbl">Actions ${gl('actions', true)}</div>"""),
 ("""<div class="lbl">Coherence</div>""", """<div class="lbl">Coherence ${gl('coherence', true)}</div>"""),
 ("""<div class="lbl">Lever</div>""", """<div class="lbl">Lever ${gl('lever', true)}</div>"""),
 ("""<div class="lbl">Physics</div>""", """<div class="lbl">Physics ${gl('dimension', true)}</div>"""),
 ("""<div class="lbl">Doctrine · ${esc(doc.layer)}</div>""", """<div class="lbl">Doctrine · ${esc(doc.layer)} ${gl('doctrine', true)}</div>"""),
 ("""<span class="label">Factions</span>""", """<span class="label">Factions ${gl('faction', true)}</span>"""),
 ("""<section class="cadres" aria-label="Leaders"><div class="label">Leaders</div>""", """<section class="cadres" aria-label="Leaders"><div class="label">Leaders ${gl('leader', true)}</div>"""),
 ("""<div class="label">Holdings</div>""", """<div class="label">Holdings ${gl('holding', true)}</div>"""),
 ("""<div class="label">Reach</div>""", """<div class="label">Reach ${gl('reach', true)}</div>"""),
 ("""<div class="label">Elsewhere · aimed at the other factions</div>""", """<div class="label">Elsewhere · aimed at the other factions ${gl('elsewhere', true)}</div>"""),
 ("""<h2>Cards in play</h2>""", """<div class="headrow"><h2>Cards in play</h2>${gl('card', true)}</div>"""),
 ("""<h2>The board</h2>""", """<div class="headrow"><h2>The board</h2>${gl('domain', true)}</div>"""),
 ("""<a href="#/how" target="_blank" rel="noopener">How to play</a></div>""", """<a href="#/how" target="_blank" rel="noopener">How to play</a> · <a href="#/glossary">${esc(HELP.ui.glossLink)}</a></div>"""),
 ("""<details class="fboards"><summary>Every faction's board</summary>""", """<details class="fboards"><summary>Every faction's board</summary>${gl('faction', true)}"""),
 ("""            ${d.run.watch ? `<div>${watchChip(d.run.watch)}</div>` : ''}""", """            ${d.run.watch ? `<div>${watchChip(d.run.watch)} ${gl('watch', true)}</div>` : ''}"""),
 # the hint link stays in this tab, as the router sends it anyway
 ("""target="_blank" rel="noopener">${esc(HELP.ui.hintMore)}""", """>${esc(HELP.ui.hintMore)}"""),
 # two How to play cards from before version 9 stated the rule loosely
 ("""A shield that absorbs a hit, a Detect followed by a Disrupt, or a correct lever raises coherence.""", """A shield that absorbs a hit, a Disrupt on a card you detected or a correct lever raises coherence."""),
 ("""Move one of yours for 1 action, once a turn.</p></div>""", """Move each of yours once a turn for 1 action.</p></div>"""),

 # ---------------- other pages ----------------
 ("""return `<h1>Forecast</h1>""", """return `<div class="headrow"><h1>Forecast</h1>${gl('forecast')}</div>"""),
 ("""      <h1>Records</h1>""", """      <div class="headrow"><h1>Records</h1>${gl('code')}</div>"""),
 ("""      <h1>The stratagem codex</h1>
      <p class="small muted">The Thirty-Six Stratagems""", """      <div class="headrow"><h1>The stratagem codex</h1>${gl('codex')}</div>
      <p class="small muted">The Thirty-Six Stratagems"""),
 ("""render(html`<h1>The stratagem codex</h1><p>Disrupt""", """render(html`<div class="headrow"><h1>The stratagem codex</h1>${gl('codex')}</div><p>Disrupt"""),
 ("""<button id="quick">Quick play</button> <a class="btn" href="#/how">How to play</a></p>""", """<button id="quick">Quick play</button> <a class="btn" href="#/how">How to play</a> <a class="btn" href="#/glossary">${esc(HELP.ui.glossLink)}</a></p>"""),
 ("""      ${howToc()}""", """      ${howToc()}
      <p class="small">The <a href="#/glossary">${esc(HELP.ui.glossLink.toLowerCase())}</a> lists every term the board uses.</p>"""),

 # ---------------- the glossary page ----------------
 ("""  // ---------- records: result codes, replay, after-action report, challenge links ----------""", """  // ---------- glossary ----------
  route(/^\\/glossary(\\?.*)?$/, async () => {
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

  // ---------- records: result codes, replay, after-action report, challenge links ----------"""),
], 'game')
(root / 'out/game.js').write_text(g)
cut = g.index('/* TDW demo shim.')
engine = g[:cut].rstrip() + '\n'
assert engine == (root / 'out/engine.v8.js').read_text(), 'the engine part changed'
(root / 'out/engine.js').write_text(engine)
r = (root / 'out/record.v10.js').read_text()
(root / 'out/record.js').write_text(r)
(root / 'parts/record.js').write_text(r)
(root / 'parts/style.css').write_text((root / 'parts/style.v10.css').read_text() + '''
/* ---- version 11: glossary ---- */
a.gl, button.gl { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; min-height: 24px; padding: 0 6px; margin-left: 4px; border: 1px solid var(--line); border-radius: 12px; font-size: 13px; font-weight: 700; line-height: 1; text-decoration: none; text-transform: none; letter-spacing: 0; color: var(--muted); vertical-align: middle; }
a.gl:hover, button.gl:hover { color: var(--ink); border-color: var(--ink); }
button.gl { min-height: 24px; padding: 0 6px; background: none; cursor: pointer; }
.meter button.gl { width: auto; min-height: 24px; padding: 0 6px; margin-top: 0; }
.headrow { display: flex; align-items: center; gap: 4px 8px; flex-wrap: wrap; }
.headrow h1, .headrow h2 { margin-right: 0; }
.hand-head .headrow h2 { margin: 0; }
.linkish { background: none; border: 0; min-height: 24px; padding: 0 4px; font: inherit; color: var(--accent); text-decoration: underline; cursor: pointer; }
.glossfind { display: grid; gap: 4px; max-width: 420px; }
.glossfind label { font-size: 14px; color: var(--muted); }
.glossfind input { min-height: 44px; }
.gloss { margin: 8px 0 16px; }
.gterm { padding: 10px 8px; border-bottom: 1px solid var(--line); border-radius: 6px; }
.gterm dt { font-weight: 700; font-size: 17px; scroll-margin-top: 112px; }
.gterm dd { margin: 4px 0 0; }
.gterm dd p { margin: 4px 0; }
.gterm.hit { background: var(--banner-bg); color: var(--banner-ink); }
.gterm.hit a { color: var(--banner-ink); }
dt[tabindex="-1"]:focus { outline: none; }
@media (max-width: 560px) { .gterm dt { scroll-margin-top: 12px; } }
''')
print('patched: game, engine, style. record unchanged. OK')
