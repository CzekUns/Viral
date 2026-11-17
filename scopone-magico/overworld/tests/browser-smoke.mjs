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
 // Touch-to-move toward Napoli entrance, without using the development bridge.
 const externalZoom=.88,dx=48.5-returned.x,dy=39.5-returned.y;
 const cx=390/2+(dx-dy)*26*externalZoom;
 const cy=844*.44+(dx+dy)*15*externalZoom;
 await iframe.locator('#world-canvas').tap({position:{x:cx,y:cy}});
 await page.waitForFunction(()=>document.querySelector('#overworld-frame')?.contentWindow?.ScoponeOverworld?.position()?.scene==='city',{timeout:10000});
 await iframe.locator('#exit').click();
 assert.equal(await page.locator('#menu-view').isVisible(),true);
 await page.locator('#start-quick').click();
 assert.equal(await page.locator('#game-view').isVisible(),true);
 await page.locator('#back-menu').click();
 await page.locator('#start-draw').click();
 assert.equal(await page.locator('#game-view').isVisible(),true);
 assert.deepEqual(errors,[],'Uncaught browser errors');
 console.log('MOBILE BROWSER QA OK: map, joystick, city, reload, exit, tap-to-move and both card modes');
}
try{await main();}finally{await browser?.close();server.kill();}
