// Browser run for version 9: How to play sections, first-use hints, guided runs, old saves. Usage:
// NEW=<folder holding game, 1931, 2030, 2026 built by mkpkg.py> OLDD=<the same four from the previous release> SHOTS=<dir> node e2e/v9.js
const { chromium } = require(process.env.PW_MODULE || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const NEW = process.env.NEW, OLDD = process.env.OLDD, SHOTS = process.env.SHOTS || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
function serve(dir, port) { http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(port); }
// build, an operation whose board shows panels, the tier to play it at, the How to play sections expected, the guide
const BUILDS = [
  ['game', 'C002', 7, ['tiers'], null],
  ['1931', 'E011', 4, ['tiers', 'holdings'], 'holdings'],
  ['2030', 'N005', 7, ['tiers'], null],
  ['2026', 'W017', 7, ['tiers', 'reach', 'forecast'], 'reach'],
];
BUILDS.forEach(([n], i) => { serve(`${NEW}/${n}`, 9970 + i); serve(`${OLDD}/${n}`, 9980 + i); });
const out = (...a) => console.log(...a);
let bad = 0; const check = (cond, what) => { if (!cond) { bad++; out('  FAIL', what); } };
async function finish(pg) {
  let t = 0;
  while (!(await pg.$('.result')) && t++ < 40) {
    const ok = await pg.$('#coachok'); if (ok) { await ok.click(); await pg.waitForTimeout(40); continue; }
    const end = await pg.$('#end'); if (!end) break;
    await end.click(); await pg.waitForTimeout(60);
    const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click();
    await pg.waitForTimeout(120);
  }
  await pg.waitForSelector('.result');
}
// Where focus went after a dismissal: on screen, below the header and above the sticky end bar.
const focusSeen = (pg) => pg.evaluate(() => {
  const a = document.activeElement; if (!a || !a.matches('.hintok, #coachok')) return 'no note';
  const r = a.getBoundingClientRect(); const bar = document.querySelector('.endbar'); const top = document.querySelector('.top');
  const lo = bar ? bar.getBoundingClientRect().top : innerHeight; const hi = Math.max(0, top ? top.getBoundingClientRect().bottom : 0);
  return r.top >= hi && r.bottom <= lo ? 'ok' : `hidden at ${Math.round(r.top)} to ${Math.round(r.bottom)}, clear from ${Math.round(hi)} to ${Math.round(lo)}`;
});
// The heading a How to play link jumps to sits below the sticky header.
const headingSeen = (pg, id) => pg.evaluate((x) => {
  const h = document.getElementById('how-' + x).getBoundingClientRect(); const top = document.querySelector('.top').getBoundingClientRect();
  return h.top >= Math.max(0, top.bottom) - 1 && h.bottom <= innerHeight ? 'ok' : `heading at ${Math.round(h.top)}, header ends ${Math.round(top.bottom)}`;
}, id);
const hintOf = (pg) => pg.$eval('.hint .hintok', (b) => b.dataset.hint).catch(() => null);
(async () => {
  const br = await chromium.launch({ ...(process.env.CHROMIUM === '' ? {} : { executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }), args: ['--no-sandbox'] });
  for (const [i, [name, opId, tier, how, guide]] of BUILDS.entries()) {
    const nu = `http://localhost:${9970 + i}/`; const old = `http://localhost:${9980 + i}/`;
    for (const [w, h] of [[1280, 900], [390, 800]]) {
      const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
      // How to play
      await pg.goto(`${nu}#/how`); await pg.waitForSelector('#how-dimensions');
      const ids = await pg.$$eval('h2[id^="how-"]', (x) => x.map((e) => e.id.slice(4)));
      const newIds = ids.filter((x) => ['tiers', 'holdings', 'reach', 'forecast'].includes(x));
      check(JSON.stringify(newIds) === JSON.stringify(how), `${name} how sections ${JSON.stringify(newIds)}`);
      const toc = await pg.$$eval('.howtoc a', (a) => a.map((x) => x.getAttribute('href')));
      check(toc.every((href) => ids.includes(href.split('s=')[1])), `${name} toc targets ${JSON.stringify(toc)}`);
      const gbtn = await pg.$$eval('[data-guide]', (b) => b.map((x) => x.dataset.guide));
      check(JSON.stringify(gbtn) === JSON.stringify(guide ? [guide] : []), `${name} guide buttons ${JSON.stringify(gbtn)}`);
      await pg.goto(`${nu}#/how?s=tiers`); await pg.waitForSelector('#how-tiers');
      const focus = await pg.evaluate(() => document.activeElement && document.activeElement.id);
      check(focus === 'how-tiers', `${name} how?s=tiers focus ${focus}`);
      const last = how[how.length - 1];
      await pg.goto(`${nu}#/how?s=${last}`); await pg.waitForSelector('#how-' + last);
      const hs = await headingSeen(pg, last); check(hs === 'ok', `${name} ${w}px how?s=${last} ${hs}`);
      if (w === 390 && SHOTS) await pg.screenshot({ path: `${SHOTS}/${name}-how-tiers-390.png` });
      // first-use hints on the board, one at a time, and they stay dismissed after a reload
      await pg.goto(`${nu}#/op/${opId}`); await pg.waitForSelector('#start');
      const opGuide = !!(await pg.$('.guidecard'));
      check(opGuide === !!guide, `${name} op page guide card ${opGuide}`);
      await pg.click(`[data-tier="${tier}"]`); await pg.click('#start'); await pg.waitForSelector('#end');
      const seen = []; let hNow = await hintOf(pg); let k = 0;
      while (hNow && k++ < 8) {
        seen.push(hNow);
        if (w === 1280 && seen.length === 1 && SHOTS) await pg.screenshot({ path: `${SHOTS}/${name}-hint-${hNow}.png`, fullPage: true });
        await pg.focus('.hintok'); await pg.keyboard.press('Enter');
        await pg.waitForTimeout(100); hNow = await hintOf(pg);
        if (hNow) { const fs1 = await focusSeen(pg); check(fs1 === 'ok', `${name} ${w}px focus after dismissing ${seen[seen.length - 1]}: ${fs1}`); }
      }
      check(seen.length >= 1, `${name} shows at least one hint`);
      await pg.reload(); await pg.waitForSelector('#end');
      check(!(await hintOf(pg)), `${name} hints stay dismissed after reload`);
      await finish(pg);
      const code = await pg.$eval('#rcode', (e) => e.value);
      // the guided run
      let gline = '';
      if (guide) {
        await pg.goto(`${nu}#/how`); await pg.waitForSelector('[data-guide]'); await pg.click('[data-guide]'); await pg.waitForSelector('#end');
        const kicker = await pg.$eval('.hud .kicker', (e) => e.textContent); const turn = await pg.$eval('.turnbox .tn', (e) => e.textContent);
        const coach = await pg.$eval('.coach .label', (e) => e.textContent).catch(() => '');
        check(/Guided run/.test(kicker) && /Turn 1 of 6/.test(turn) && /Guided run · step 1/.test(coach), `${name} guide board "${kicker}" "${turn}" "${coach}"`);
        const desc = await pg.$eval('#coachok', (b) => document.getElementById(b.getAttribute('aria-describedby')).textContent);
        check(desc.length > 40, `${name} coach button describes its step`);
        check(!(await pg.$('.hint')), `${name} no hint during a guided run`);
        if (w === 390 && SHOTS) await pg.screenshot({ path: `${SHOTS}/${name}-guide-390.png` });
        await pg.focus('#coachok'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
        const coach2 = await pg.$eval('.coach .label', (e) => e.textContent).catch(() => '');
        check(/· step 2/.test(coach2), `${name} second guide step "${coach2}"`);
        const fs2 = await focusSeen(pg); check(fs2 === 'ok', `${name} ${w}px focus after a coach step: ${fs2}`);
        await pg.reload(); await pg.waitForSelector('#end');
        const coach3 = await pg.$eval('.coach .label', (e) => e.textContent).catch(() => '');
        check(/· step 2/.test(coach3), `${name} the run keeps dismissed steps after a reload "${coach3}"`);
        await finish(pg);
        const next = await pg.$eval('.result .row a.primary', (a) => a.textContent + ' ' + a.getAttribute('href'));
        check(new RegExp(`Play the full operation #/op/${opId}`).test(next), `${name} guide next "${next}"`);
        const gcode = await pg.$eval('#rcode', (e) => e.value);
        await pg.goto(`${nu}#/v/${gcode}`); await pg.waitForSelector('.verified, .notverified');
        const gver = !!(await pg.$('.card.verified')); const gk = await pg.$eval('.hero .kicker', (e) => e.textContent);
        check(gver && /Guided run/.test(gk), `${name} guide code verifies ${gver} "${gk}"`);
        await pg.goto(`${nu}#/`); await pg.waitForSelector('main h1');
        const homeGuide = await pg.$$eval('[data-guide]', (b) => b.length);
        check(homeGuide === 0, `${name} home hides a finished guide (${homeGuide})`);
        await pg.goto(`${nu}#/op/${opId}`); await pg.waitForSelector('#start');
        check(!(await pg.$('.guidecard')), `${name} the briefing drops a finished guide`);
        gline = ` | guide "${kicker.trim()}" verifies ${gver}`;
      }
      // the forecast page links to its How to play section and shows no hint
      if (how.includes('forecast')) {
        await pg.goto(`${nu}#/forecast`); await pg.waitForSelector('#fcs');
        check(!(await pg.$('.hint')) && !!(await pg.$('a[href="#/how?s=forecast"]')), `${name} forecast page link and no hint`);
      }
      await pg.goto(`${nu}#/v/${code}`); await pg.waitForSelector('.verified, .notverified'); const ver = !!(await pg.$('.card.verified'));
      check(ver, `${name} board code verifies`);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(ov <= 0, `${name} ${w}px overflow ${ov}`);
      check(!errs.length, `${name} errors ${JSON.stringify(errs)}`);
      out(`${name} ${w}px: how ${JSON.stringify(newIds)} | toc ${toc.length} | hints ${JSON.stringify(seen)} | op guide card ${opGuide}${gline} | code verifies ${ver} | overflow ${ov} | errors ${errs.length}`);
      await ctx.close();
    }
    {
      const ctx = await br.newContext({ viewport: { width: 640, height: 450 } }); const pg = await ctx.newPage();
      for (const id of how) { await pg.goto(`${nu}#/how?s=${id}`); await pg.waitForSelector('#how-' + id); const hs = await headingSeen(pg, id); check(hs === 'ok', `${name} 200% zoom how?s=${id} ${hs}`); }
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(ov <= 0, `${name} 200% zoom overflow ${ov}`);
      out(`${name} 640px (200% zoom): ${how.length} section links land below the header | overflow ${ov}`);
      await ctx.close();
    }
    // a save and a code from the previous release work in this one, and a guided run on top still loads in the old build
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${old}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await finish(pg);
    const code = await pg.$eval('#rcode', (e) => e.value); const key = await pg.evaluate(() => Object.keys(localStorage).find((k) => /^tdw-/.test(k) && k !== 'tdw-coach'));
    const dump = await pg.evaluate((k) => localStorage.getItem(k), key);
    const pg2 = await ctx.newPage(); pg2.on('pageerror', (e) => errs.push(e.message)); await pg2.goto(nu); await pg2.waitForSelector('main h1');
    await pg2.evaluate(([k, d]) => localStorage.setItem(k, d), [key, dump]); await pg2.reload(); await pg2.waitForSelector('main h1');
    await pg2.goto(`${nu}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified'); const ver = !!(await pg2.$('.card.verified'));
    await pg2.goto(`${nu}#/records`); await pg2.waitForSelector('#paste'); const rows = await pg2.$$eval('table tr', (r) => r.length - 1);
    let back = 'n/a';
    if (guide) {
      await pg2.goto(`${nu}#/how`); await pg2.waitForSelector('[data-guide]'); await pg2.click('[data-guide]'); await pg2.waitForSelector('#end'); await finish(pg2);
      // the old build sits on another port, so copy the new save across before it reads it
      const dump2 = await pg2.evaluate((k) => localStorage.getItem(k), key);
      const pg3 = await ctx.newPage(); pg3.on('pageerror', (e) => errs.push(e.message));
      await pg3.goto(old); await pg3.waitForSelector('main h1');
      await pg3.evaluate(([k, d]) => localStorage.setItem(k, d), [key, dump2]); await pg3.reload(); await pg3.waitForSelector('main h1');
      await pg3.goto(`${old}#/records`); await pg3.waitForSelector('#paste');
      back = await pg3.$$eval('table tr', (r) => r.length - 1);
      await pg3.goto(`${old}#/op/${opId}`); await pg3.waitForSelector('#start'); await pg3.click('#start'); await pg3.waitForSelector('#end');
      check(back >= 2, `${name} the old build lists both runs from the new save (${back})`);
    }
    check(ver && rows >= 1 && !errs.length, `${name} old save`);
    out(`${name} old save: key ${key} | old ${opId} code verifies in the new build ${ver} | records rows ${rows} | old build reads the new save, rows ${back} | errors ${JSON.stringify(errs)}`);
    await ctx.close();
  }
  await br.close();
  out(bad ? `${bad} BROWSER CHECKS FAILED` : 'ALL BROWSER CHECKS PASS');
  process.exit(bad ? 1 : 0);
})();
