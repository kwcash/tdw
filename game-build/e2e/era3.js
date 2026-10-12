const { chromium } = require('/tmp/pw/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const S=process.env.SCR; const dir=`${S}/v2/out/pkg/2026`;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{let f=path.join(dir,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':MIME[path.extname(f)]||'text/plain'});r.end(d)}})}).listen(9401);
(async()=>{
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 for(const [w,h] of [[390,844],[1280,900]]){
  const pg=await (await br.newContext({viewport:{width:w,height:h}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push(m.text())});
  const b='http://localhost:9401/';
  await pg.goto(b);await pg.waitForSelector('main h1');
  const hero=await pg.$eval('main',m=>m.innerText.replace(/\s+/g,' ').slice(0,260));
  await pg.goto(b+'#/ops');await pg.waitForSelector('.oplist .item');const n=await pg.$$eval('.oplist .item',e=>e.length);
  await pg.goto(b+'#/arcs');await pg.waitForSelector('.tiles2');const arcs=await pg.$$eval('.tiles2 .big',e=>e.map(x=>x.textContent));
  await pg.goto(b+'#/op/W007');await pg.waitForSelector('#start');await pg.screenshot({path:`${S}/v2/e2e/y2026-${w}-op.png`,fullPage:true});
  await pg.click('#start');await pg.waitForSelector('#end');
  const fx=await pg.$$eval('.fx .fx-name b',e=>e.map(x=>x.textContent));const cad=await pg.$$eval('.cadre b',e=>e.map(x=>x.textContent));const pact=await pg.$$eval('.pactchip',e=>e.map(x=>x.textContent));
  await pg.screenshot({path:`${S}/v2/e2e/y2026-${w}-board.png`,fullPage:true});
  const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  console.log(w,'hero:',hero,'\n  ops',n,'arcs',arcs,'\n  factions',fx,'\n  leaders',cad,'\n  pacts',pact,'\n  overflow',ov,'errs',errs.length?errs:'none');
 }
 await br.close();process.exit(0)})();
