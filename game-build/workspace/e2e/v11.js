// Browser run for version 11: the glossary page and the links to it from each panel. Usage:
// NEW=<folder holding game, 1931, 2030, 2026 built by mkpkg.py> OLDD=<the same four from the previous release> SHOTS=<dir> node e2e/v11.js
const { chromium } = require(process.env.PW_MODULE || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const NEW = process.env.NEW, OLDD = process.env.OLDD, SHOTS = process.env.SHOTS || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function serve(dir, port) { http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(port); }
const WS = path.join(__dirname, '..');
const HELP = JSON.parse(fs.readFileSync(path.join(WS, 'src/help.json'), 'utf8'));
// build, an operation with many panels, the tier to play, the content file, a term only this build shows (or null)
const BUILDS = [['game', 'C002', 1, 'base', null], ['1931', 'E011', 4, 'era1', 'holding'], ['2030', 'N005', 3, 'era2', 'pact'], ['2026', 'W017', 7, 'era3', 'permit']];
// The terms a build should show, worked out from its content the way the game does.
function expected(b) {
  const C = JSON.parse(fs.readFileSync(path.join(WS, `content/${b}.json`), 'utf8'));
  const ops = C.ops.filter((o) => !o.hidden); const rs = C.ruleset || {};
  const legit = (o) => !!(o.rules && o.rules.legitimacy !== undefined ? o.rules.legitimacy : rs.legitimacy);
  const multi = (o) => Array.isArray(o.factions) && o.factions.length > 2;
  const n = (f) => ops.filter(f).length;
  const on = { always: true, factions: n((o) => multi(o) || legit(o) || (o.pacts || []).length) > 0, legit: n(legit) > 0, leaders: n((o) => (o.cadres || []).length) > 0, pacts: n((o) => (o.pacts || []).length) > 0, multi: n(multi) > 0, holdings: n((o) => (o.holdings || []).length) > 0, reach: n((o) => (o.reach || []).length) > 0, watch: n((o) => o.kind === 'watch') > 0, world: n((o) => o.world) > 0, forecast: !!C.forecast, guides: (C.guides || []).length > 0 };
  on.selfact = on.holdings || on.reach;
  return HELP.glossary.filter((g) => on[g.when]).map((g) => g.id).sort();
}
BUILDS.forEach(([n], i) => { serve(`${NEW}/${n}`, 10010 + i); serve(`${OLDD}/${n}`, 10020 + i); });
const out = (...a) => console.log(...a);
let bad = 0; const check = (cond, what) => { if (!cond) { bad++; out('  FAIL', what); } };
async function finish(pg) { let t = 0; while (!(await pg.$('.result')) && t++ < 40) { const ok = await pg.$('#coachok'); if (ok) { await ok.click(); continue; } const end = await pg.$('#end'); if (!end) break; await end.click(); await pg.waitForTimeout(60); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(120); } await pg.waitForSelector('.result'); }
(async () => {
  const br = await chromium.launch({ ...(process.env.CHROMIUM === '' ? {} : { executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }), args: ['--no-sandbox'] });
  for (const [i, [name, opId, tier, b, only]] of BUILDS.entries()) {
    const nu = `http://localhost:${10010 + i}/`; const old = `http://localhost:${10020 + i}/`; const want = expected(b);
    for (const [w, h] of [[1280, 900], [390, 800]]) {
      const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
      await pg.goto(`${nu}#/glossary`); await pg.waitForSelector('.gloss');
      const ids = (await pg.$$eval('.gterm dt', (d) => d.map((x) => x.id.slice(2)))).sort();
      check(JSON.stringify(ids) === JSON.stringify(want), `${name} terms ${ids.length} want ${want.length}: missing ${want.filter((x) => !ids.includes(x))} extra ${ids.filter((x) => !want.includes(x))}`);
      const sorted = await pg.$$eval('.gterm dt', (d) => d.map((x) => x.textContent));
      check(JSON.stringify(sorted) === JSON.stringify(sorted.slice().sort((x, y) => x.localeCompare(y))), `${name} terms are in order`);
      const deadSee = await pg.$$eval('.gterm a[href^="#/glossary?t="]', (a) => a.map((x) => x.getAttribute('href').split('t=')[1]).filter((t) => !document.getElementById('g-' + t)));
      check(!deadSee.length, `${name} see-also links to absent terms ${deadSee}`);
      await pg.fill('#gq', 'pressure'); const shown = await pg.$$eval('.gterm', (g) => g.filter((x) => !x.hidden).length);
      await pg.fill('#gq', 'decoy'); const one = await pg.$eval('#gcount', (e) => e.textContent);
      check(one === '1 term', `${name} the count reads "${one}"`);
      await pg.fill('#gq', 'zzzz'); const none = await pg.$eval('#gnone', (e) => !e.hidden);
      check(shown > 0 && shown < ids.length && none, `${name} filter shows ${shown} then none ${none}`);
      if (only) {
        await pg.goto(`${nu}#/glossary?t=${only}`); await pg.waitForSelector(`#g-${only}`);
        const st = await pg.evaluate((x) => { const d = document.getElementById('g-' + x); const r = d.getBoundingClientRect(); const top = document.querySelector('.top').getBoundingClientRect(); return { focus: document.activeElement === d, hit: d.closest('.gterm').classList.contains('hit'), seen: r.top >= Math.max(0, top.bottom) - 1 && r.bottom <= innerHeight }; }, only);
        check(st.focus && st.hit && st.seen, `${name} ${w}px ?t=${only} ${JSON.stringify(st)}`);
        if (SHOTS && w === 390) await pg.screenshot({ path: `${SHOTS}/${name}-glossary-${only}-390.png` });
      }
      // every panel link on the board names a term this build shows
      await pg.goto(`${nu}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click(`[data-tier="${tier}"]`); await pg.click('#start'); await pg.waitForSelector('#end');
      const links = await pg.$$eval('button.gl[data-gl]', (a) => a.map((x) => [x.dataset.gl, x.getAttribute('aria-label'), Math.round(x.getBoundingClientRect().width), Math.round(x.getBoundingClientRect().height)]));
      const badLinks = links.filter(([t, label, lw, lh]) => !want.includes(t) || !/, in the glossary$/.test(label) || lw < 24 || lh < 24 || lw > 40 || lh > 40);
      check(links.length >= 6 && !badLinks.length && !(await pg.$('main a.gl')), `${name} ${w}px board term buttons ${links.length} bad ${JSON.stringify(badLinks)}`);
      const heads = await pg.$$eval('h1, h2', (hs) => hs.map((x) => x.textContent));
      check(!heads.some((x) => /\?|glossary/.test(x)), `${name} headings keep their own names ${JSON.stringify(heads)}`);
      const turnLink = await pg.$eval('.turnbox .tn a[href="#/glossary"]', (e) => [e.textContent, e.getAttribute('target')]);
      check(turnLink[0] === 'Glossary' && turnLink[1] === null, `${name} turn box links the glossary in this tab ${JSON.stringify(turnLink)}`);
      // a term opens over the board, a related term replaces it, and closing it returns focus to the button
      const url0 = pg.url();
      await pg.click('button.gl[data-gl="lever"]'); await pg.waitForSelector('.sheet #termh');
      const t1 = await pg.$eval('.sheet #termh', (e) => e.textContent);
      const seeBtn = await pg.$('.sheet [data-see]'); let t2 = '';
      if (seeBtn) { await seeBtn.click(); await pg.waitForTimeout(60); t2 = await pg.$eval('.sheet #termh', (e) => e.textContent); }
      await pg.click('.sheet [data-do="close"]'); await pg.waitForTimeout(60);
      const back = await pg.evaluate(() => document.activeElement && document.activeElement.dataset.gl);
      check(t1 === 'Lever' && t2 && t2 !== t1 && !(await pg.$('.sheet')) && back === 'lever' && pg.url() === url0, `${name} term sheet "${t1}" then "${t2}", focus back ${back}, url kept ${pg.url() === url0}`);
      if (SHOTS && w === 390) { await pg.click('button.gl[data-gl="actions"]'); await pg.waitForSelector('.sheet #termh'); await pg.waitForTimeout(400); await pg.screenshot({ path: `${SHOTS}/${name}-term-sheet-390.png` }); await pg.keyboard.press('Escape'); }
      if (SHOTS && w === 1280) await pg.screenshot({ path: `${SHOTS}/${name}-board-links.png` });
      await finish(pg);
      for (const [route, sel] of [['#/records', '.headrow a.gl'], ['#/codex', '.headrow a.gl'], ['#/how', 'a[href="#/glossary"]'], ['#/', 'a[href="#/glossary"]']]) {
        await pg.goto(`${nu}${route}`); await pg.waitForSelector('main h1');
        check(!!(await pg.$(sel)), `${name} ${route} links the glossary`);
      }
      if (b === 'era3') { await pg.goto(`${nu}#/forecast`); await pg.waitForSelector('#fcs'); check(!!(await pg.$('.headrow a.gl[href="#/glossary?t=forecast"]')), `${name} forecast links the glossary`); }
      { const p2 = await ctx.newPage(); await p2.goto(`${nu}#/codex`); await p2.waitForSelector('main h1'); check(!!(await p2.$('.headrow a.gl')), `${name} codex links the glossary before any play`); await p2.close(); }
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(ov <= 0 && !errs.length, `${name} ${w}px overflow ${ov} errors ${JSON.stringify(errs)}`);
      out(`${name} ${w}px: ${ids.length} terms | filter "pressure" ${shown} | board links ${links.length}, all resolve | overflow ${ov} | errors ${errs.length}`);
      await ctx.close();
    }
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${old}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await finish(pg);
    const code = await pg.$eval('#rcode', (e) => e.value); const key = await pg.evaluate(() => Object.keys(localStorage).find((k) => /^tdw-/.test(k) && !['tdw-coach', 'tdw-guide'].includes(k)));
    const dump = await pg.evaluate((k) => localStorage.getItem(k), key);
    const pg2 = await ctx.newPage(); pg2.on('pageerror', (e) => errs.push(e.message)); await pg2.goto(nu); await pg2.waitForSelector('main h1');
    await pg2.evaluate(([k, d]) => localStorage.setItem(k, d), [key, dump]); await pg2.reload(); await pg2.waitForSelector('main h1');
    await pg2.goto(`${nu}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified'); const ver = !!(await pg2.$('.card.verified'));
    await pg2.goto(`${nu}#/records`); await pg2.waitForSelector('#paste'); const rows = await pg2.$$eval('table tr', (r) => r.length - 1);
    check(ver && rows >= 1 && !errs.length, `${name} old save`);
    out(`${name} old save: key ${key} | old ${opId} code verifies ${ver} | records rows ${rows} | errors ${JSON.stringify(errs)}`);
    await ctx.close();
  }
  await br.close();
  out(bad ? `${bad} BROWSER CHECKS FAILED` : 'ALL BROWSER CHECKS PASS');
  process.exit(bad ? 1 : 0);
})();
