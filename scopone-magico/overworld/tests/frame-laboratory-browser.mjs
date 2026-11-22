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
try{
 await mkdir(path.join(root,'browser-qa'),{recursive:true});
 for(let i=0;i<70;i++){
  try{if((await fetch(base+'laboratorio-frame.html')).ok)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,120));
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'laboratorio-frame.html?avatar=s08-player&direzione=E');
 await page.waitForFunction(()=>document.querySelector('#lab-status')?.textContent?.includes('pronte'),null,{timeout:25000});
 assert.equal(await page.locator('#lab-avatar option').count(),6);
 assert.equal(await page.locator('#lab-frames .frame-button').count(),4,'S08 East must have 4 actual current frames');
 assert.equal(await page.locator('#lab-candidates .candidate-group').count(),3,
   'S08 E has 4 walk frames and both V01/V02 standing fallback sources');
 assert.match(await page.locator('#lab-availability').textContent(),/0 fotogrammi di camminata alternativi/);
 assert.match(await page.locator('#lab-availability').textContent(),/28 fotogrammi da altre direzioni/);
 assert.equal(await page.locator('#lab-other-directions').count(),1);
 await page.locator('#lab-other-directions summary').click();
 await page.waitForFunction(()=>document.querySelectorAll('#lab-other-directions .candidate-group').length===7,null,{timeout:12000});
 assert.equal(await page.locator('#lab-other-directions .candidate-button').count(),28,
   'Other directions must expose all 7 x 4 source frames, not silently hide them');
 await page.screenshot({path:path.join(root,'browser-qa','laboratorio-S08-E-frame-extra.png'),fullPage:true});
 await page.locator('#lab-frames .frame-button').nth(0).click();
 await page.locator('#lab-candidates .candidate-button').nth(3).click();
 assert.match(await page.locator('#lab-instructions').inputValue(),/FRAME 1 \(indice 0\)/);
 assert.match(await page.locator('#lab-instructions').inputValue(),/fotogramma 4\/4/);
 const differs=await page.waitForFunction(()=>{
   const a=document.getElementById('lab-original'),b=document.getElementById('lab-preview');
   return a.toDataURL()!==b.toDataURL();
 },null,{timeout:6000});
 assert.ok(differs,'Edited walking animation must draw visually different pixels to Canvas');
 await page.screenshot({path:path.join(root,'browser-qa','laboratorio-S08-E-prima-dopo.png'),fullPage:true});
 await page.locator('#lab-undo').click();
 assert.equal(await page.locator('#lab-instructions').inputValue(),'','Undo must restore original sequence');

 // Multi-select non-adjacent poses and mark them for redrawing, not replacing.
 await page.locator('#lab-frames .frame-button').nth(0).click();
 await page.locator('#lab-frames .frame-button').nth(2).click();
 assert.equal(await page.locator('#lab-frames .frame-button[aria-pressed="true"]').count(),2);
 assert.equal(await page.locator('#lab-mark-count').textContent(),'2');
 await page.locator('#lab-mark-note').fill('piede rivolto a NE / salta');
 await page.locator('#lab-mark-redo').click();
 assert.equal(await page.locator('#lab-redo-total').textContent(),'2');
 assert.equal(await page.locator('#lab-frames .frame-button[data-marked="true"]').count(),2);
 assert.match(await page.locator('#lab-redo-text').inputValue(),/piede rivolto a NE \/ salta/);
 const exported=await page.locator('#lab-redo-text').inputValue();
 assert.match(exported,/Fotogramma 1 \(indice 0\)/);
 assert.match(exported,/Fotogramma 3 \(indice 2\)/);
 await page.locator('#lab-candidates .candidate-button').nth(1).click();
 const combined=await page.locator('#lab-instructions').inputValue();
 assert.match(combined,/FRAME 1 \(indice 0\)/);
 assert.match(combined,/FRAME 3 \(indice 2\)/);
 await page.locator('#lab-undo').click();
 assert.equal(await page.locator('#lab-instructions').inputValue(),'');
 await page.locator('#lab-select-none').click();
 assert.equal(await page.locator('#lab-frames .frame-button[aria-pressed="true"]').count(),0);
 await page.screenshot({path:path.join(root,'browser-qa','laboratorio-S08-E-multi-da-rifare.png'),fullPage:true});


 // Bastoni NW has original V01 + three non-active R02 candidate sources.
 await page.locator('#lab-avatar').selectOption('b08-player');
 await page.locator('#lab-direction').selectOption('NW');
 await page.waitForFunction(()=>document.querySelector('#lab-status')?.textContent?.includes('pronte'),null,{timeout:25000});
 assert.equal(await page.locator('#lab-frames .frame-button').count(),4);
 assert.equal(await page.locator('#lab-candidates .candidate-group').count(),5);
 assert.equal(await page.locator('#lab-candidates .candidate-button').count(),11);
 await page.locator('#lab-frames .frame-button').nth(0).click();
 await page.locator('.candidate-group').nth(2).locator('.candidate-button').first().click();
 const instructions=await page.locator('#lab-instructions').inputValue();
 assert.match(instructions,/FRAME 1 \(indice 0\)/);
 assert.match(instructions,/characters\/b08\/revisions\/audit-r02-nw-1-2\//);
 await page.screenshot({path:path.join(root,'browser-qa','laboratorio-B08-NW-candidato.png'),fullPage:true});
 await page.locator('#lab-copy').click();
 await page.waitForFunction(()=>/copiate|Copia il testo/i.test(document.querySelector('#lab-status')?.textContent||''),null,{timeout:7000});
 // Collect several frames from a second avatar and retain both groups after reload.
 await page.locator('#lab-select-all').click();
 assert.equal(await page.locator('#lab-frames .frame-button[aria-pressed="true"]').count(),4);
 await page.locator('#lab-mark-note').fill('quattro pose da verificare');
 await page.locator('#lab-mark-redo').click();
 assert.equal(await page.locator('#lab-redo-total').textContent(),'6');
 assert.equal(await page.locator('.redo-group').count(),2);
 await page.locator('#lab-avatar').selectOption('s08-player');
 await page.locator('#lab-direction').selectOption('E');
 await page.waitForFunction(()=>document.querySelector('#lab-status')?.textContent?.includes('pronte'),null,{timeout:25000});
 assert.equal(await page.locator('#lab-frames .frame-button[data-marked="true"]').count(),2);
 assert.equal(await page.locator('#lab-redo-total').textContent(),'6');
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('#lab-status')?.textContent?.includes('pronte'),null,{timeout:25000});
 assert.equal(await page.locator('#lab-redo-total').textContent(),'6','Redo list survives page reload');
 assert.equal(await page.locator('#lab-frames .frame-button[data-marked="true"]').count(),2,'Marked badges survive page reload');
 assert.equal(await page.locator('.redo-group').count(),2);
 assert.match(await page.locator('#lab-redo-text').inputValue(),/quattro pose da verificare/);
 assert.equal(await page.locator('#lab-github-redo').getAttribute('aria-disabled'),'false');
 assert.match(await page.locator('#lab-github-redo').getAttribute('href'),/^https:\/\/github.com\/CzekUns\/Viral\/issues\/new\?/);
 // Remove only one mark while preserving the rest.
 await page.locator('.redo-group').filter({hasText:'8 Spade V02'}).locator('.redo-record button').first().click();
 assert.equal(await page.locator('#lab-redo-total').textContent(),'5');
 await page.locator('#lab-copy-redo').click();
 await page.waitForFunction(()=>/copiato|Copia il testo/i.test(document.querySelector('#lab-redo-status')?.textContent||''),null,{timeout:7000});
 await page.screenshot({path:path.join(root,'browser-qa','laboratorio-elenco-persistente-da-rifare.png'),fullPage:true});


 for(const id of ['d08-player','c08-v01-player','c08-v02-player','player']){
   await page.locator('#lab-avatar').selectOption(id);
   await page.waitForFunction(()=>document.querySelector('#lab-status')?.textContent?.includes('pronte'),null,{timeout:25000});
   assert.ok(await page.locator('#lab-frames .frame-button').count()>=4,'missing workbench current frames '+id);
 }
 assert.deepEqual(errors,[],'No browser exceptions');
 console.log('FRAME LABORATORY QA OK: 6 avatars, two non-adjacent selected, multi-frame replacement, redo queue across suits, persistence, undo and GitHub issue draft');
}finally{
 await browser?.close();server.kill();
}
