// Browser run for version 12: progress to and from a file, and the feedback link. Usage:
// NEW=<folder holding game, 1931, 2030, 2026 built by mkpkg.py> OLDD=<the same four from the previous release> SHOTS=<dir> node e2e/v12.js
const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const NEW = process.env.NEW, OLDD = process.env.OLDD, SHOTS = process.env.SHOTS || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
// edit(f, body) may rewrite a served file, as the feedback check does to set an address
function serve(dir, port, edit) { http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); r.end(edit ? edit(f, d) : d); } }); }).listen(port); }
const BUILDS = [['game', 'C002', 'tdw-demo-1'], ['1931', 'E011', 'tdw-1931-1'], ['2030', 'N005', 'tdw-2030-1'], ['2026', 'W017', 'tdw-2026-1']];
BUILDS.forEach(([n], i) => { serve(`${NEW}/${n}`, 10030 + i); serve(`${OLDD}/${n}`, 10040 + i); });
serve(`${NEW}/2026`, 10050, (f, d) => (f.endsWith('game.js') ? Buffer.from(String(d).replace('"email":""', '"email":"owner@example.org"')) : d));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tdw-v12-'));
const out = (...a) => console.log(...a);
let bad = 0; const check = (cond, what) => { if (!cond) { bad++; out('  FAIL', what); } };
async function finish(pg) { let t = 0; while (!(await pg.$('.result')) && t++ < 40) { const ok = await pg.$('#coachok'); if (ok) { await ok.click(); continue; } const end = await pg.$('#end'); if (!end) break; await end.click(); await pg.waitForTimeout(60); const e2 = await pg.$('#end'); if (e2 && /Tap again/.test(await e2.textContent())) await e2.click(); await pg.waitForTimeout(120); } await pg.waitForSelector('.result'); }
const rowOf = (pg, label, sel = '.psum') => pg.$$eval(`${sel} tr`, (rs, l) => { const r = rs.find((x) => x.querySelector('th').textContent === l); return r ? r.querySelector('td').textContent : null; }, label);
const files = {};
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [i, [name, opId, key]] of BUILDS.entries()) {
    const nu = `http://localhost:${10030 + i}/`; const old = `http://localhost:${10040 + i}/`;
    for (const [w, h] of [[1280, 900], [390, 800]]) {
      const ctx = await br.newContext({ viewport: { width: w, height: h }, acceptDownloads: true }); const pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
      await pg.goto(`${nu}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await finish(pg);
      const code = await pg.$eval('#rcode', (e) => e.value);
      await pg.goto(`${nu}#/progress`); await pg.waitForSelector('#psave');
      const played = await rowOf(pg, 'Operations played');
      const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#psave')]);
      const fname = dl.suggestedFilename(); const fpath = path.join(TMP, `${name}-${w}.json`); await dl.saveAs(fpath);
      const file = JSON.parse(fs.readFileSync(fpath, 'utf8')); files[name] = fpath;
      check(played === '1' && file.format === 'tdw-progress' && file.build === key && new RegExp(`^tdw-progress-${key}-\\d{4}-\\d{2}-\\d{2}\\.json$`).test(fname), `${name} save "${played}" ${fname}`);
      check(!(await pg.$('a[href^="mailto:"]')), `${name} no feedback link without an address`);
      await pg.goto(`${nu}#/how`); await pg.waitForSelector('#how-dimensions');
      check(!(await pg.$('a[href^="mailto:"]')) && !(await pg.evaluate(() => document.body.innerText.includes('${'))) && !!(await pg.$('a[href="#/progress"]')), `${name} How to play links the progress page cleanly`);
      await pg.goto(`${nu}#/progress`); await pg.waitForSelector('#psave');
      if (SHOTS && w === 390) await pg.screenshot({ path: `${SHOTS}/${name}-progress-390.png`, fullPage: true });
      // a fresh browser loads the file: it sees what the file holds, and only the second tap replaces the progress
      const ctx2 = await br.newContext({ viewport: { width: w, height: h } }); const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => errs.push(e.message));
      await p2.goto(`${nu}#/progress`); await p2.waitForSelector('#pfile');
      const before = await rowOf(p2, 'Operations played');
      await p2.setInputFiles('#pfile', fpath); await p2.waitForSelector('#preplace');
      const holds = await rowOf(p2, 'Operations played', '#pout .psum');
      await p2.click('#preplace'); const armed = await p2.$eval('#preplace', (b) => b.textContent);
      await p2.goto(`${nu}#/records`); await p2.waitForSelector('#paste'); const notYet = Math.max(0, await p2.$$eval('table tr', (r) => r.length - 1));
      await p2.goto(`${nu}#/progress`); await p2.waitForSelector('#pfile');
      await p2.setInputFiles('#pfile', fpath); await p2.waitForSelector('#preplace');
      await p2.click('#preplace'); await p2.click('#preplace'); await p2.waitForFunction(() => location.hash === '#/');
      await p2.goto(`${nu}#/records`); await p2.waitForSelector('#paste'); const rows = await p2.$$eval('table tr', (r) => r.length - 1);
      await p2.goto(`${nu}#/v/${code}`); await p2.waitForSelector('.verified, .notverified'); const ver = !!(await p2.$('.card.verified'));
      check(before === '0' && holds === '1' && /Tap again/.test(armed) && notYet === 0 && rows === 1 && ver, `${name} ${w}px load: before ${before} holds ${holds} armed "${armed}" before confirm ${notYet} rows ${rows} verifies ${ver}`);
      // a file that is not one, and clearing
      const junk = path.join(TMP, 'junk.json'); fs.writeFileSync(junk, 'not json at all');
      await p2.goto(`${nu}#/progress`); await p2.waitForSelector('#pfile'); await p2.setInputFiles('#pfile', junk); await p2.waitForSelector('#pout .err');
      const junkMsg = await p2.$eval('#pout .err', (e) => e.textContent);
      await p2.click('#pclear'); await p2.click('#pclear'); await p2.waitForFunction(() => location.hash === '#/');
      await p2.goto(`${nu}#/progress`); await p2.waitForSelector('#psave'); const after = await rowOf(p2, 'Operations played');
      check(/not a TDW progress file/.test(junkMsg) && after === '0', `${name} junk "${junkMsg}" then clear leaves ${after}`);
      const ov = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(ov <= 0 && !errs.length, `${name} ${w}px overflow ${ov} errors ${JSON.stringify(errs)}`);
      out(`${name} ${w}px: saved ${fname} | fresh browser holds ${holds}, loads after two taps | records ${rows} verify ${ver} | junk refused | clear works | overflow ${ov} | errors ${errs.length}`);
      await ctx2.close(); await ctx.close();
    }
    // a save from the previous release saves to a file in this one
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${old}#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end'); await finish(pg);
    const dump = await pg.evaluate((k) => localStorage.getItem(k), key);
    const pg2 = await ctx.newPage(); pg2.on('pageerror', (e) => errs.push(e.message)); await pg2.goto(nu); await pg2.waitForSelector('main h1');
    await pg2.evaluate(([k, d]) => localStorage.setItem(k, d), [key, dump]); await pg2.reload(); await pg2.waitForSelector('main h1'); await pg2.goto(`${nu}#/progress`); await pg2.waitForSelector('#psave');
    const [dl] = await Promise.all([pg2.waitForEvent('download'), pg2.click('#psave')]); const f = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    check(f.save.played === 1 && !errs.length, `${name} old save exports ${f.save.played} ${JSON.stringify(errs)}`);
    out(`${name} old save: saved to a file with ${f.save.played} run | errors ${JSON.stringify(errs)}`);
    await ctx.close();
  }
  // a file from another build is refused
  {
    const ctx = await br.newContext(); const pg = await ctx.newPage();
    await pg.goto('http://localhost:10033/#/progress'); await pg.waitForSelector('#pfile'); await pg.setInputFiles('#pfile', files['1931']); await pg.waitForSelector('#pout .err');
    const msg = await pg.$eval('#pout .err', (e) => e.textContent);
    check(/another build/.test(msg) && /1931/.test(msg), `cross-build "${msg}"`);
    out(`2026 refuses the 1931 file: "${msg}"`);
    await ctx.close();
  }
  // with an address set, the link shows and fills in the subject
  {
    const ctx = await br.newContext(); const pg = await ctx.newPage();
    await pg.goto('http://localhost:10050/#/progress'); await pg.waitForSelector('#psave');
    const href = await pg.$eval('a[href^="mailto:"]', (a) => a.getAttribute('href')).catch(() => null);
    await pg.goto('http://localhost:10050/#/how'); await pg.waitForSelector('#how-dimensions'); const onHow = !!(await pg.$('a[href^="mailto:"]'));
    const raw = await pg.evaluate(() => document.body.innerText.includes('${'));
    check(!raw, 'no template text shows on How to play');
    check(href && href.startsWith('mailto:owner@example.org?subject=TDW%20feedback') && /&body=/.test(href) && onHow, `feedback link ${href} on How ${onHow}`);
    out(`feedback with an address: ${href && href.slice(0, 60)}... | on How to play ${onHow}`);
    await ctx.close();
  }
  await br.close();
  out(bad ? `${bad} BROWSER CHECKS FAILED` : 'ALL BROWSER CHECKS PASS');
  process.exit(bad ? 1 : 0);
})();
