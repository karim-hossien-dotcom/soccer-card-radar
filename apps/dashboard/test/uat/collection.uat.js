const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const out={errors:[],checks:{}};
const p=await b.newPage({viewport:{width:1280,height:1100}});
p.on('pageerror',e=>out.errors.push('pageerror '+e.message));
p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g/.test(m.text()))out.errors.push('console '+m.text().slice(0,150))});
await p.goto('http://localhost:3100/collection',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
const kpi=await p.$$eval('section[aria-label="Collection totals"] b',e=>e.map(x=>x.textContent));
out.checks.kpisNow=kpi;
out.checks.tiles=await p.$$eval('main button',e=>e.length);
await p.screenshot({path:'/tmp/uat/shots/desktop.png'});
await p.click('button:has-text("PSA 10")');await p.waitForTimeout(300);
out.checks.kpisPSA10=await p.$$eval('section[aria-label="Collection totals"] b',e=>e.map(x=>x.textContent));
await p.click('[aria-label="Show"] button:has-text("Raw")');await p.waitForTimeout(300);
out.checks.kpisRawPSA10=await p.$$eval('section[aria-label="Collection totals"] b',e=>e.map(x=>x.textContent));
await p.click('[aria-label="Show"] button:has-text("At PSA")');await p.waitForTimeout(300);
out.checks.kpisAtPsaPSA10=await p.$$eval('section[aria-label="Collection totals"] b',e=>e.map(x=>x.textContent));
await p.click('[aria-label="Show"] button:has-text("All")');await p.click('[aria-label="Scenario"] button:has-text("Now")');
await p.selectOption('select[aria-label="Sort"]','date');await p.waitForTimeout(300);
out.checks.firstByDate=await p.$$eval('main button',e=>e.slice(0,3).map(x=>x.getAttribute('aria-label').slice(0,60)));
// hover zoom
const shot=await p.$('main button img');const bb=await shot.boundingBox();
await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(300);
const z=await p.$('div[aria-hidden] img');out.checks.zoomVisible=!!z;
if(z){const zb=await (await p.$('div[aria-hidden]')).boundingBox();out.checks.zoomInViewport=zb.x>=0&&zb.y>=0&&zb.x+zb.width<=1280&&zb.y+zb.height<=1100;}
await p.screenshot({path:'/tmp/uat/shots/hover.png'});
await p.mouse.move(5,5);
// search + drawer
await p.fill('input[type=search]','Roman Numeral');await p.waitForTimeout(300);
out.checks.searchCount=await p.$$eval('main button',e=>e.length);
await p.click('main button');await p.waitForTimeout(400);
out.checks.drawerText=(await p.textContent('[role=dialog]')).replace(/\s+/g,' ').slice(0,400);
await p.screenshot({path:'/tmp/uat/shots/drawer.png'});
await p.keyboard.press('Escape');
// mobile
const m=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
m.on('pageerror',e=>out.errors.push('m pageerror '+e.message));
await m.goto('http://localhost:3100/collection',{waitUntil:'networkidle'});await m.waitForTimeout(800);
out.checks.mobileOverflowX=await m.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
await m.screenshot({path:'/tmp/uat/shots/mobile.png'});
await m.tap('main button');await m.waitForTimeout(400);
await m.screenshot({path:'/tmp/uat/shots/mobile_drawer.png'});
// regression: other pages render (no DB here, expect graceful)
for(const r of ['/','/stars','/legends','/dips']){const rp=await b.newPage();const errs=[];rp.on('pageerror',e=>errs.push(e.message));const resp=await rp.goto('http://localhost:3100'+r,{waitUntil:'domcontentloaded',timeout:90000}).catch(e=>({status:()=> 'ERR '+e.message.slice(0,60)}));out.checks['route '+r]=resp.status()+(errs.length?' errs:'+errs.length:'');await rp.close();}
console.log(JSON.stringify(out,null,1));await b.close();})();
