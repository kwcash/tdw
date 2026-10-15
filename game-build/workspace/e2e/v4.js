const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const T = process.env.T;                      // scratchpad/t
const sites = { old: process.env.OLD || `${T}/user2026`, neu: `${T}/v3/out/pkg/2026`, front: process.env.FRONT };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const ports = { old: 9501, neu: 9502, front: 9503 };
for (const [k, dir] of Object.entries(sites)) http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); } }); }).listen(ports[k]);
const base = (k) => `http://localhost:${ports[k]}/`;
const KEY = 'tdw-2026-1';
const out = (...a) => console.log(...a);
async function play(pg) {
  let turns = 0;
  while (!(await pg.$('.result')) && turns++ < 40) {
    for (let rep = 0; rep < 3; rep++) {
      const doms = await pg.$$('button[data-d]'); let best = null, bp = -1;
      for (const d of doms) { const l = await d.getAttribute('aria-label'); const m = /pressure (\d)/.exec(l); const pr = m ? +m[1] : 0; if (pr > bp) { bp = pr; best = d; } }
      if (best) { await best.click(); await pg.waitForTimeout(50); const df = await pg.$('[data-do="defend"]'); if (df) { await df.click(); await pg.waitForTimeout(50); } else { const cl = await pg.$('[data-do="close"],.sheetclose'); if (cl) await cl.click(); } }
    }
    const end = await pg.$('#end'); if (end) { await end.click(); await pg.waitForTimeout(100); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(200); }
  }
}
async function arcState(pg, b) {
  const o = {};
  for (const id of ['the-strait', 'the-seams']) {
    await pg.goto(`${b}#/arc/${id}`); await pg.waitForSelector('.arcline');
    o[id] = await pg.$$eval('.arcnode', (n) => n.map((x) => [x.querySelector('b').textContent, x.classList.contains('cleared') ? 'cleared' : x.classList.contains('open') ? 'open' : 'locked']));
  }
  return o;
}
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

  // ---- 3. saved progress: made by the OLD build, read by the NEW one
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    await pg.goto(`${base('old')}#/op/W006`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await play(pg); await pg.waitForSelector('.result');
    const code = await pg.$eval('#rcode', (e) => e.value);
    await pg.evaluate((KEY) => { const d = JSON.parse(localStorage.getItem(KEY)); d.arcs = { 'the-strait': { 0: 3, 1: 2, 2: 2, 3: 1, 4: 1 }, 'the-seams': { 0: 3, 1: 3, 2: 2 } }; d.unlocks['tutorial'] = 1; localStorage.setItem(KEY, JSON.stringify(d)); }, KEY);
    await pg.reload(); await pg.waitForSelector('main h1');   // the build keeps its state in memory, so reload to read the injected save
    const before = await arcState(pg, base('old'));
    const dump = await pg.evaluate((KEY) => localStorage.getItem(KEY), KEY);
    const prog0 = await pg.evaluate(async () => (await window.TDW_FETCH('/api/progress')).progress).catch(() => null);
    await pg.goto(`${base('old')}#/`); await pg.waitForSelector('main h1'); const homeOld = await pg.$eval('main', (m) => m.innerText.replace(/\s+/g, ' ')).catch(() => '');
    const pg2 = await ctx.newPage();
    await pg2.goto(base('neu')); await pg2.waitForSelector('main h1');
    await pg2.evaluate(([KEY, dump]) => localStorage.setItem(KEY, dump), [KEY, dump]);
    await pg2.reload(); await pg2.waitForSelector('main h1');
    const after = await arcState(pg2, base('neu'));
    let ok = true; const notes = [];
    for (const id of Object.keys(before)) before[id].forEach(([t, st], i) => { const a = after[id][i]; if (a[0] !== t) { ok = false; notes.push(`node ${i} of ${id} changed from ${t} to ${a[0]}`); } if (st !== 'locked' && a[1] !== st) { ok = false; notes.push(`${t}: ${st} became ${a[1]}`); } });
    out('3. saved progress: every node that was open or cleared before is the same after:', ok, notes);
    out('   strait before', JSON.stringify(before['the-strait'].map((x) => x[1])), 'after', JSON.stringify(after['the-strait'].map((x) => x[1])), '| W014 is', after['the-strait'][5] && after['the-strait'][5].join(' '));
    await pg2.goto(`${base('neu')}#/v/${code}`); await pg2.waitForSelector('.verified, .notverified');
    out('   the old run\'s code still verifies in the new build:', !!(await pg2.$('.card.verified')), '|', code.slice(0, 40) + '...');
    await pg2.goto(`${base('neu')}#/records`); await pg2.waitForSelector('#paste'); out('   records rows after the move:', await pg2.$$eval('table tr', (r) => r.length - 1));
    await ctx.close();
  }

  // ---- 4. the new build at 1280 and 375
  for (const [w, h] of [[1280, 900], [375, 800]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
    await pg.goto(base('neu')); await pg.waitForSelector('main h1');
    const calWelcome = await pg.$$eval('.cal-item', (e) => e.length);
    await pg.click('#go'); await pg.waitForSelector('#end'); // tutorial
    await pg.goto(`${base('neu')}#/`); await pg.waitForSelector('main h1');
    const calHome = await pg.$$eval('.cal-item', (e) => e.length);
    await pg.screenshot({ path: `${process.env.SHOTS}/home-${w}.png`, fullPage: true });
    const ov1 = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // keyboard: tab to the first source link
    await pg.focus('body'); let reached = false; for (let i = 0; i < 40; i++) { await pg.keyboard.press('Tab'); if (await pg.evaluate(() => document.activeElement && document.activeElement.classList.contains('cal-src'))) { reached = true; break; } }
    const links = await pg.$$eval('.cal-src', (a) => a.map((x) => x.getAttribute('href')));
    await pg.goto(`${base('neu')}#/ops`); await pg.waitForSelector('.oplist .item'); const nOps = await pg.$$eval('.oplist .item', (e) => e.length); const calOps = await pg.$$eval('.cal-item', (e) => e.length);
    const watchChip = await pg.$$eval('.oplist .chip2.watch', (e) => e.map((x) => x.textContent));
    out(`4. ${w}px: calendar items welcome ${calWelcome} home ${calHome} ops page ${calOps} | operations listed ${nOps} | watch chips ${JSON.stringify(watchChip)} | source links ${links.length} reachable by keyboard ${reached} | h-overflow home ${ov1}`);
    const ids = []; for (let n = 1; n <= 16; n++) ids.push('W' + String(n).padStart(3, '0'));
    const report = [];
    for (const id of ids) {
      await pg.goto(`${base('neu')}#/op/${id}`); await pg.waitForSelector('#start'); const title = await pg.$eval('main h1', (e) => e.textContent); const chip = await pg.$('main .chip2.watch');
      if (id === 'W013') await pg.screenshot({ path: `${process.env.SHOTS}/W013-op-${w}.png`, fullPage: true });
      await pg.click('#start'); await pg.waitForSelector('#end'); const hud = await pg.$('.hud .chip2.watch');
      if (id === 'W013') await pg.screenshot({ path: `${process.env.SHOTS}/W013-board-${w}.png`, fullPage: true });
      if (id === 'W013' || id === 'W014') { await play(pg); await pg.waitForSelector('.result'); if (id === 'W013') await pg.screenshot({ path: `${process.env.SHOTS}/W013-result-${w}.png`, fullPage: true }); const rc = await pg.$('#rcode'); const resultChip = await pg.$('.result .chip2.watch'); report.push(`${id} played to the result, code ${rc ? 'yes' : 'no'}, result badge ${resultChip ? 'yes' : 'no'}`); }
      report.push(`${id} ${title}${chip ? ' [watch badge]' : ''}${hud ? ' [hud badge]' : ''}`);
    }
    const ov2 = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    out('   operations opened and started:', report.join(' | '));
    out(`   h-overflow ${ov2} | console errors: ${errs.length ? JSON.stringify(errs) : 'none'}`);
    await ctx.close();
  }

  // ---- calendar visibility by date
  for (const [label, when] of [['20 November 2026', '2026-11-20T10:00:00'], ['15 January 2027', '2027-01-15T10:00:00'], ['12 October 2026', '2026-10-12T10:00:00']]) {
    const ctx = await br.newContext({ viewport: { width: 375, height: 800 } }); const pg = await ctx.newPage();
    await pg.clock.install({ time: new Date(when) }); await pg.goto(base('neu')); await pg.waitForSelector('main h1');
    const items = await pg.$$eval('.cal-item .cal-when', (e) => e.map((x) => x.textContent)); const panel = await pg.$('.cal');
    out(`   calendar on ${label}: panel ${panel ? 'shown' : 'hidden'} ${JSON.stringify(items)}`); await ctx.close();
  }

  // ---- 7. the landing page
  for (const [w, h] of [[1280, 900], [375, 800]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto(base('front')); await pg.waitForTimeout(1500);
    const card = await pg.$eval('.era.e2026', (e) => e.innerText.replace(/\s+/g, ' ')); const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await pg.screenshot({ path: `${process.env.SHOTS}/landing-${w}.png`, fullPage: true });
    out(`7. landing ${w}px: overflow ${ov}, errors ${errs.length ? JSON.stringify(errs) : 'none'} | 2026 card: ${card}`); await ctx.close();
  }
  await br.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
