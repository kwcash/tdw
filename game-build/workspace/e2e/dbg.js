const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = process.env.SCR + '/v2/out/pkg/' + process.argv[2]; const opId = process.argv[3]; const w = +process.argv[4];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f)] }); r.end(d); } }); }).listen(8999);
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pg = await (await br.newContext({ viewport: { width: w, height: 900 } })).newPage();
  await pg.goto(`http://localhost:8999/#/op/${opId}`); await pg.waitForSelector('#start'); await pg.click('#start'); await pg.waitForSelector('#end');
  for (let t = 0; t < 8; t++) {
    const st = await pg.evaluate(() => ({ turn: document.querySelector('#end')?.textContent, coach: !!document.querySelector('.coach'), sheet: !!document.querySelector('.sheet:not([hidden])'), toast: document.querySelector('.toast')?.textContent }));
    console.log(JSON.stringify(st));
    const coach = await pg.$('#coachok'); if (coach) { await coach.click(); continue; }
    const end = await pg.$('#end'); if (!end) break; await end.click({ timeout: 3000 }).catch((e) => console.log('click fail', e.message.slice(0, 200))); await pg.waitForTimeout(400);
  }
  await pg.screenshot({ path: process.env.SCR + '/v2/e2e/dbg.png' }); await br.close(); process.exit(0);
})();
