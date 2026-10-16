const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const out={errors:[]};const tag=process.argv[2];
const p=await b.newPage({viewport:{width:1280,height:1000}});
p.on('pageerror',e=>out.errors.push(e.message));
await p.goto('http://localhost:3100/collection',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
out.tracker=(await p.textContent('section[aria-label="Value tracker"]')).replace(/\s+/g,' ').slice(0,400);
out.kpis=await p.$$eval('section[aria-label="Collection totals"] b',e=>e.map(x=>x.textContent));
await p.screenshot({path:`/tmp/uat/shots/b5_${tag}.png`});
const pt=await p.$('.recharts-line-dots circle:last-child');
if(pt){const bb=await pt.boundingBox();await p.mouse.move(bb.x+3,bb.y+3);await p.waitForTimeout(300);out.tooltip=(await p.textContent('.recharts-tooltip-wrapper')||'').trim();await p.screenshot({path:`/tmp/uat/shots/b5_${tag}_tip.png`,clip:{x:280,y:0,width:720,height:500}});}
await p.click('main button');await p.waitForTimeout(400);
out.spark=await p.$('figure svg')!==null;
await p.screenshot({path:`/tmp/uat/shots/b5_${tag}_drawer.png`});
const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await m.goto('http://localhost:3100/collection',{waitUntil:'networkidle'});await m.waitForTimeout(1000);
out.mobileOverflowX=await m.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
await m.screenshot({path:`/tmp/uat/shots/b5_${tag}_m.png`});
console.log(JSON.stringify(out,null,1));await b.close();})();
