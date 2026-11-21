/** Visual catalog QA: inspect real WebPs and verify exact replacement reporting on Android viewport. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const base='http://127.0.0.1:8765/scopone-magico/overworld/';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
async function waitForServer(){
 for(let i=0;i<60;i++){
  try{if((await fetch(base+'catalogo-sprite.html')).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Catalog server did not start');
}
try{
 await mkdir(path.join(root,'browser-qa'),{recursive:true});
 await waitForServer();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
  permissions:['clipboard-read','clipboard-write']
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'catalogo-sprite.html',{waitUntil:'domcontentloaded'});
 await page.locator('.sprite-card').first().waitFor({timeout:25000});
 assert.equal(await page.locator('.sprite-card').count(),66,'All 66 originals must be visible by default');
 assert.equal(await page.locator('#total-count').textContent(),'66');
 assert.equal(await page.locator('#used-count').textContent(),'32');
 assert.equal(await page.locator('#unused-count').textContent(),'34');
 assert.equal(await page.locator('.sprite-card[data-used=true]').count(),32);
 assert.equal(await page.locator('.sprite-card[data-used=false]').count(),34);
 assert.ok(await page.locator('a[href="catalogo-sprite.html"]').count()===0,'Catalog links back to game, not itself');
 await page.screenshot({path:path.join(root,'browser-qa','catalogo-01-mobile-home.png')});

 // Current C08 SE walk plus all historic variants including approved V07:
 // frame 0 & frame 1 must differ when extracted using source rect, not squeezed.
 await page.locator('#filter-character').selectOption('C08');
 await page.locator('#filter-direction').selectOption('SE');
 await page.locator('#filter-pose').selectOption('walk');
 assert.equal(await page.locator('.sprite-card').count(),4);
 assert.equal(await page.locator('.sprite-card[data-used=true]').count(),1);
 assert.equal(await page.locator('.sprite-card[data-used=false]').count(),3);
 await page.locator('.sprite-card[data-used=true] .sprite-preview').click();
 await page.locator('#detail-strip button').nth(1).waitFor({timeout:20000});
 assert.equal(await page.locator('#detail-strip button').count(),12);
 await page.locator('#detail-strip button').first().click();
 const frameOne=await page.locator('#detail-canvas').evaluate(c=>c.toDataURL());
 await page.locator('#detail-strip button').nth(1).click();
 const frameTwo=await page.locator('#detail-canvas').evaluate(c=>c.toDataURL());
 assert.notEqual(frameOne,frameTwo,'Individual C08 frames must render differently');
 assert.match(await page.locator('#detail-code').textContent(),/C08-WALK-SE-STABILIZZATA-V04/);
 await page.screenshot({path:path.join(root,'browser-qa','catalogo-02-fotogramma-C08.png')});
 await page.locator('#detail-from').click();
 assert.match(await page.locator('#chosen-from').textContent(),/fotogramma 2\/12/);
 await page.locator('.sprite-card[data-used=false] .sprite-buttons button:last-child').first().click();
 assert.equal(await page.locator('#add-replacement').isEnabled(),true);
 await page.locator('#add-replacement').click();
 const instructions=await page.locator('#replacement-text').inputValue();
 assert.match(instructions,/DA: C08-WALK-SE-STABILIZZATA-V04 \[fotogramma 2\/12\]/);
 assert.match(instructions,/CON: C08-WALK-SE-/);
 assert.match(instructions,/characters\/c08\/v04-stabilized\//);
 assert.match(instructions,/Usa questi file già presenti/);
 await page.locator('#copy-replacements').click();
 await page.waitForFunction(()=>/copiate|seleziona e copia/i.test(document.querySelector('#copy-status')?.textContent||''),null,{timeout:10000});
 assert.match(await page.locator('#copy-status').textContent(),/copiate|seleziona e copia/i);
 await page.screenshot({path:path.join(root,'browser-qa','catalogo-03-sostituzione-pronta.png'),fullPage:true});
 await page.locator('[data-status="unused"]').click();
 assert.equal(await page.locator('.sprite-card').count(),3);
 await page.locator('[data-status="used"]').click();
 assert.equal(await page.locator('.sprite-card').count(),1);
 await page.locator('[data-status="all"]').click();

 // S08 V02 standing (in use) alongside V01 test standing (not in use).
 await page.locator('#filter-character').selectOption('S08');
 await page.locator('#filter-direction').selectOption('S');
 await page.locator('#filter-pose').selectOption('idle');
 assert.equal(await page.locator('.sprite-card').count(),2);
 assert.equal(await page.locator('.sprite-card[data-used=true]').count(),1);
 assert.equal(await page.locator('.sprite-card[data-used=false]').count(),1);
 const v01=await page.locator('.sprite-card[data-used=false] .sprite-code').textContent();
 assert.match(v01,/S08-STAND-S-SPADE-V01/);
 const v02=await page.locator('.sprite-card[data-used=true] .sprite-code').textContent();
 assert.match(v02,/S08-STAND-S-SPADE-V02/);
 await page.locator('.sprite-grid').screenshot({path:path.join(root,'browser-qa','catalogo-04-Spade-V01-vs-V02.png')});
 // The real thumbnail must have decoded and drawn nontransparent pixels.
 await page.waitForFunction(()=>{
  const canvas=document.querySelector('.sprite-card[data-used=true] canvas');
  if(!canvas)return false;
  const a=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  return a.some((value,i)=>i%4===3&&value>0);
 },null,{timeout:20000});
 assert.ok(await page.locator('a[href="./"]').count()===1,'Link back to live game');
 assert.deepEqual(errors,[],'Browser page must not throw errors');
 console.log('VISUAL SPRITE CATALOG QA OK: 66 total, 32 active, 34 backup, C08 frame scrub, S08 V01/V02 and copy');
}finally{await browser?.close();server.kill();}
