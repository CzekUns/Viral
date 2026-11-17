/** Browser QA in emulazione touch 390x844. Per test fisico resta necessario un telefono. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const base='http://127.0.0.1:8765/scopone-magico/';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:repoRoot,stdio:'ignore'});
let browser;
async function waitForServer(){
 for(let i=0;i<60;i++){
  try{const response=await fetch(base+'overworld/index.html');if(response.ok)return;}
  catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Local HTTP server did not start');
}
async function main(){
 await mkdir(path.join(repoRoot,'browser-qa'),{recursive:true});
 await waitForServer();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overworld').click();
 const iframe=page.frameLocator('#overworld-frame');
 await iframe.locator('#loading').waitFor({state:'hidden',timeout:35000});
 const getPos=()=>iframe.locator('#world-canvas').evaluate(()=>window.ScoponeOverworld.position());
 const a=await getPos();
 assert.equal(a.scene,'outside','Overworld must start in external Campania');
 assert.equal(await iframe.locator('#zone-name').textContent(),'Campania');

 // Re-run the exterior with developer diagnostics in an isolated session so
 // perf counters cannot be hidden by the parent iframe or a saved city scene.
 const perfContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const perfPage=await perfContext.newPage();
 await perfPage.goto(base+'overworld/index.html?debug=1',{waitUntil:'domcontentloaded'});
 await perfPage.locator('#loading').waitFor({state:'hidden',timeout:35000});
 const benchmark=await perfPage.evaluate(()=>{
  const d=window.ScoponeOverworld.debug(),r=d.renderer;
  if(!d||!r)throw Error('Debug renderer unavailable');
  r.draw(d.player,[],null,1/60);
  const start={...r.terrainStats};
  const t0=performance.now();
  for(let i=0;i<120;i++)r.draw(d.player,[],null,1/60);
  const ms=(performance.now()-t0)/120;
  const after={...r.terrainStats},cacheSize=r.terrainCache.size;
  const beforeMove=after.builds;
  d.player.x=70.5;d.player.y=44.5;r.follow(d.player,1,true);
  r.draw(d.player,[],null,1/60);
  return {ms,start,after,afterMove:r.terrainStats.builds,beforeMove,cacheSize,max:r.maxTerrainChunks,
   canvasDpr:r.dpr};
 });
 const terrainImages=await perfPage.evaluate(()=>{
  const {renderer}=window.ScoponeOverworld.debug();
  return Object.fromEntries(['grass','forest','hill','road','coast','shallow','sea'].map(name=>{
    const id='outer-'+name,info=renderer.assets.info(id),image=renderer.assets.image(id);
    return [name,{src:info.src,width:image?.naturalWidth,height:image?.naturalHeight}];
  }));
 });
 for(const [name,tile] of Object.entries(terrainImages)){
  assert.equal(tile.src,'tiles/outside/v03/'+name+'.webp','V03 must be active by default');
  assert.equal(tile.width,104,'V03 image width '+name);
  assert.equal(tile.height,60,'V03 image height '+name);
 }
 console.log('EXTERIOR V03 TILES',JSON.stringify(terrainImages));
 const legacyPage=await perfContext.newPage();
 await legacyPage.goto(base+'overworld/index.html?debug=1&terrain=legacy',{waitUntil:'domcontentloaded'});
 await legacyPage.locator('#loading').waitFor({state:'hidden',timeout:35000});
 const legacyTerrain=await legacyPage.evaluate(()=>{
  const assets=window.ScoponeOverworld.debug().renderer.assets;
  return ['grass','forest','hill','road','coast','shallow','sea'].map(name=>assets.info('outer-'+name).src);
 });
 assert.deepEqual(legacyTerrain,['grass','forest','hill','road','coast','shallow','sea'].map(name=>'tiles/outside/'+name+'.svg'));
 await legacyPage.close();
 assert.ok(benchmark.start.builds>0,'Exterior must build tile chunks on first draw');
 assert.equal(benchmark.after.builds,benchmark.start.builds,'Static chunks must not be rasterized again each frame');
 assert.ok(benchmark.after.hits>benchmark.start.hits+100,'Repeated frames reuse the cached chunks');
 assert.ok(benchmark.cacheSize<=benchmark.max,'Terrain cache must remain memory-bounded');
 assert.ok(benchmark.canvasDpr<2,'Exterior DPR should be capped for mobile');
 console.log('EXTERIOR PERF',JSON.stringify(benchmark));
 await perfContext.close();
 await page.screenshot({path:path.join(repoRoot,'browser-qa','01-esterno-mobile.png')});
 const colors=await iframe.locator('#world-canvas').evaluate(canvas=>{
  const ctx=canvas.getContext('2d'),data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const sample=new Set();
  for(let y=0;y<canvas.height;y+=Math.max(1,Math.floor(canvas.height/23))){
   for(let x=0;x<canvas.width;x+=Math.max(1,Math.floor(canvas.width/15))){
    const i=(y*canvas.width+x)*4;sample.add(data[i]+','+data[i+1]+','+data[i+2]);
   }
  }
  return sample.size;
 });
 assert.ok(colors>12,'Map canvas should contain varied rendered natural textures');
 const joystick=await iframe.locator('#joystick').boundingBox();
 assert.ok(joystick,'Touch joystick should be visible');
 const jx=joystick.x+joystick.width/2,jy=joystick.y+joystick.height/2;
 await page.mouse.move(jx,jy);await page.mouse.down();
 await page.mouse.move(jx+25,jy,{steps:8});
 await page.waitForTimeout(750);await page.mouse.up();
 const moved=await getPos();
 assert.ok(Math.hypot(moved.x-a.x,moved.y-a.y)>.1,'Joystick must move the external avatar');
 await iframe.locator('#world-canvas').evaluate(()=>window.ScoponeOverworld.enterCity('napoli'));
 await page.waitForFunction(()=>document.querySelector('#overworld-frame')?.contentWindow?.ScoponeOverworld?.position()?.scene==='city');
 assert.equal((await getPos()).cityId,'napoli');
 assert.equal(await iframe.locator('#zone-name').textContent(),'Napoli');
 assert.equal(await iframe.locator('#leave-city').isVisible(),true);
 await page.screenshot({path:path.join(repoRoot,'browser-qa','02-citta-mobile.png')});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#start-overworld').click();
 await iframe.locator('#loading').waitFor({state:'hidden',timeout:35000});
 assert.equal((await getPos()).scene,'city','Reload must preserve current city');
 await iframe.locator('#leave-city').click();
 await page.waitForFunction(()=>document.querySelector('#overworld-frame')?.contentWindow?.ScoponeOverworld?.position()?.scene==='outside');
 const returned=await getPos();
 assert.equal(returned.cityId,null);assert.equal(returned.x,50.5);assert.equal(returned.y,38.5);
 // The scene identifier changes before the final fade finishes; wait for touch to unlock.
 await page.waitForFunction(()=>!document.querySelector('#overworld-frame')?.contentWindow?.document.querySelector('#transition-veil')?.classList.contains('active'));
 // Touch-to-move toward Napoli entrance, without using the development bridge.
 const externalZoom=.88,dx=48.5-returned.x,dy=39.5-returned.y;
 const cx=390/2+(dx-dy)*26*externalZoom;
 const cy=844*.44+(dx+dy)*15*externalZoom;
 await iframe.locator('#world-canvas').tap({position:{x:cx,y:cy}});
 await page.waitForFunction(()=>document.querySelector('#overworld-frame')?.contentWindow?.ScoponeOverworld?.position()?.scene==='city',null,{timeout:10000});
 await iframe.locator('#exit').click();
 // postMessage from child iframe reaches the parent asynchronously.
 await page.locator('#menu-view').waitFor({state:'visible',timeout:5000});
 await page.locator('#start-quick').click();
 assert.equal(await page.locator('#game-view').isVisible(),true);
 await page.locator('#back-menu').click();
 await page.locator('#start-draw').click();
 assert.equal(await page.locator('#game-view').isVisible(),true);
 assert.deepEqual(errors,[],'Uncaught browser errors');
 console.log('MOBILE BROWSER QA OK: map, joystick, city, reload, exit, tap-to-move and both card modes');
}
try{await main();}finally{await browser?.close();server.kill();}
