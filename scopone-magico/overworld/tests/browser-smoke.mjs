/** Browser QA in emulazione touch 390x844. Per test fisico resta necessario un telefono. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
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
 await page.locator('#overworld-frame').evaluate(element=>{
   const url=new URL(element.src);
   url.searchParams.set('debug','1');
   url.searchParams.set('c08debug','1');
   element.src=url.href;
 });
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

 // Switch between C08 and S08 in the real Overworld UI without changing world
 // coordinates, camera, gameplay state or facing. S08 V02 remains labelled TEST.
 const avatarButton=iframe.locator('#character-switch');
 assert.equal(await avatarButton.isVisible(),true,'Avatar toggle must be visible on Android');
 assert.match(await avatarButton.textContent(),/Spade/);
 assert.equal(await iframe.locator('[data-avatar]').count(),6,'Four suits and two extra Coppe variants must be available');
 const beforeSwitch=await iframe.locator('#world-canvas').evaluate(()=>{
   const p=window.ScoponeOverworld.debug().player;
   return {x:p.x,y:p.y,facing:p.facing,asset:p.assetId};
 });
 assert.equal(beforeSwitch.asset,'player');
 await avatarButton.click();
 assert.match(await avatarButton.textContent(),/Bastoni/);
 assert.equal(await iframe.locator('[data-avatar="s08-player"]').getAttribute('aria-pressed'),'true');
 const afterSwitch=await iframe.locator('#world-canvas').evaluate(()=>{
   const p=window.ScoponeOverworld.debug().player;
   return {x:p.x,y:p.y,facing:p.facing,asset:p.assetId,
     stored:localStorage.getItem('scopone-alchemico:overworld:character:v1')};
 });
 assert.equal(afterSwitch.asset,'s08-player');
 assert.equal(afterSwitch.stored,'s08-player');
 for(const dim of ['x','y','facing'])assert.equal(afterSwitch[dim],beforeSwitch[dim],
   'Character switch must not move or rotate player: '+dim);
 await page.screenshot({path:path.join(repoRoot,'browser-qa','s08-v02-standing-switch-mobile.png')});

 // Decode every directional S08 sheet, assert all 4 frames are visually distinct
 // source images (not merely four manifest entries), with no sprites mirrored.
 const s08Frames=await iframe.locator('#world-canvas').evaluate(async()=>{
   const {renderer,player}=window.ScoponeOverworld.debug();
   const dirs=['S','SE','E','NE','N','NW','W','SW'];
   const result={};
   for(const direction of dirs){
     let sp;
     for(let k=0;k<100;k++){
       sp=renderer.assets.spriteFor({...player,animation:'walk'},direction,.36);
       if(sp.image&&!sp.loading)break;
       await new Promise(r=>setTimeout(r,50));
     }
     if(!sp?.image||sp.loading)throw Error('Missing S08 walk '+direction);
     const img=sp.image,cellW=img.naturalWidth/4;
     const hashes=[];
     const canvas=document.createElement('canvas');
     canvas.width=96;canvas.height=96;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});
     for(let frame=0;frame<4;frame++){
       ctx.clearRect(0,0,96,96);
       ctx.drawImage(img,frame*cellW,0,cellW,img.naturalHeight,0,0,96,96);
       const rgba=ctx.getImageData(0,0,96,96).data;
       let h=2166136261>>>0;
       for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>16){
         for(let color=0;color<4;color++)h=Math.imul(h^rgba[i+color],16777619)>>>0;
       }
       hashes.push(h.toString(16));
     }
     result[direction]={frames:sp.frames,width:img.naturalWidth,height:img.naturalHeight,
       src:img.currentSrc||img.src,hashes};
   }
   return result;
 });
 for(const [direction,entry] of Object.entries(s08Frames)){
   assert.equal(entry.frames,4,'Wrong S08 frame count '+direction);
   assert.equal(entry.width,2048,'Wrong S08 sheet width '+direction);
   assert.equal(entry.height,512,'Wrong S08 sheet height '+direction);
   assert.equal(new Set(entry.hashes).size,4,'S08 pose duplication '+direction);
   assert.ok(entry.src.includes('/s08/v02-handsfree-test/walk/'+direction+'.webp'),
     'Wrong S08 sheet '+direction);
 }
 console.log('S08 WEBP ALL DIRECTIONS 4 DISTINCT POSES',Object.keys(s08Frames));

 // Native touch events, rather than programmatic animationTime assignments.
 // Record actual source image and frame passed to Canvas.drawImage during motion.
 const s08Input=await context.newCDPSession(page);
 const s08Rect=await iframe.locator('#joystick').boundingBox();
 const sx=s08Rect.x+s08Rect.width/2,sy=s08Rect.y+s08Rect.height/2;
 const motions=[
   ['S',0,1],['SE',1,1],['E',1,0],['NE',1,-1],
   ['N',0,-1],['NW',-1,-1],['W',-1,0],['SW',-1,1]
 ];
 const s08TouchProof=[];
 for(const [direction,dx,dy] of motions){
   await iframe.locator('#world-canvas').evaluate(()=>{
     const d=window.ScoponeOverworld.debug();
     d.player.x=45.5;d.player.y=45.5;d.player.animation='idle';d.player.animationTime=0;
     d.renderer.camera.x=45.5;d.renderer.camera.y=45.5;
     d.lifecycle.path=[];d.lifecycle.destination=null;
   });
   await s08Input.send('Input.dispatchTouchEvent',{
     type:'touchStart',touchPoints:[{x:sx,y:sy,id:39}]
   });
   let snapA,snapB;
   const observedFrames=[],observedHashes=[];
   try{
     await s08Input.send('Input.dispatchTouchEvent',{
       type:'touchMove',touchPoints:[{x:sx+28*dx,y:sy+28*dy,id:39}]
     });
     await page.waitForTimeout(235);
     snapA=await iframe.locator('#world-canvas').evaluate(()=>{
       const {player,renderer}=window.ScoponeOverworld.debug();
       const spec=renderer.lastPlayerSprite;
       return {asset:player.assetId,facing:player.facing,animation:player.animation,
         frame:spec?.frame,frames:spec?.frames,drawn:spec?.drawn,
         loading:spec?.loading,src:spec?.src,
         x:player.x,y:player.y,animationTime:player.animationTime};
     });
     if(['S','E'].includes(direction))
       await page.screenshot({path:path.join(repoRoot,'browser-qa','s08-touch-'+direction+'-first.png')});
     await page.waitForTimeout(330);
     snapB=await iframe.locator('#world-canvas').evaluate(()=>{
       const {player,renderer}=window.ScoponeOverworld.debug();
       const spec=renderer.lastPlayerSprite;
       return {asset:player.assetId,facing:player.facing,animation:player.animation,
         frame:spec?.frame,frames:spec?.frames,drawn:spec?.drawn,
         loading:spec?.loading,src:spec?.src,
         x:player.x,y:player.y,animationTime:player.animationTime};
     });
     if(['S','E'].includes(direction))
       await page.screenshot({path:path.join(repoRoot,'browser-qa','s08-touch-'+direction+'-second.png')});
     // A single two-point test can alias the same frame after one complete
     // 4-frame loop. Sample across time while the real finger stays down.
     observedFrames.push(snapA.frame,snapB.frame);
     for(let check=0;check<6;check++){
       await page.waitForTimeout(95);
       const drawn=await iframe.locator('#world-canvas').evaluate(()=>{
         const r=window.ScoponeOverworld.debug().renderer.lastPlayerSprite;
         if(!r?.drawn||!r.image||r.loading)return {frame:r?.frame,hash:null};
         const box=document.createElement('canvas');box.width=72;box.height=96;
         const ctx=box.getContext('2d',{willReadFrequently:true});
         ctx.drawImage(r.image,r.sourceX,0,r.sourceWidth,r.image.naturalHeight,0,0,72,96);
         const data=ctx.getImageData(0,0,72,96).data;
         let h=2166136261>>>0;
         for(let p=0;p<data.length;p+=4)if(data[p+3]>16){
           for(let c=0;c<4;c++)h=Math.imul(h^data[p+c],16777619)>>>0;
         }
         return {frame:r.frame,hash:h.toString(16)};
       });
       observedFrames.push(drawn.frame);
       if(drawn.hash)observedHashes.push(drawn.hash);
     }
   }finally{
     await s08Input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   assert.equal(snapB.asset,'s08-player','Lost S08 selection '+direction);
   assert.equal(snapB.facing,direction,'Wrong real touch direction '+direction);
   assert.equal(snapB.animation,'walk','No actual S08 walking '+direction);
   assert.equal(snapB.frames,4,'Canvas did not receive S08 strip '+direction);
   assert.equal(snapB.drawn,true,'Canvas did not draw S08 '+direction);
   assert.equal(snapB.loading,false,'S08 fell back to static '+direction);
   assert.ok(snapB.src.includes('/s08/v02-handsfree-test/walk/'+direction+'.webp'), 'Wrong live S08 sprite '+direction);
   assert.ok(snapB.animationTime>snapA.animationTime,'S08 animation clock stalled '+direction);
   assert.ok(new Set(observedFrames).size>=2,'Actual Canvas frame never advanced '+direction);
   assert.ok(new Set(observedHashes).size>=2,'Actual Canvas poses never changed visually '+direction);
   assert.ok(Math.hypot(snapB.x-45.5,snapB.y-45.5)>.5,'S08 did not move '+direction);
   s08TouchProof.push({direction,frames:snapB.frames,frameA:snapA.frame,
     frameB:snapB.frame,seen:[...new Set(observedFrames)].sort(),differentPoses:new Set(observedHashes).size,time:snapB.animationTime});
   await page.waitForTimeout(95);
 }
 console.log('S08 REAL TOUCH ALL 8 DIRECTIONS',JSON.stringify(s08TouchProof));
 
 // New suits + both new C08 versions: real multi-variant selection,
 // directional WebP decoding, live touch and Canvas-drawn frame differences.
 const suits=[
  {id:'b08-player',folder:'b08/v01-handsfree-test'},
  {id:'d08-player',folder:'d08/v01-handsfree-test'},
  {id:'c08-v01-player',folder:'c08/v01-denari-style-test'},
  {id:'c08-v02-player',folder:'c08/v02-compact-test'}
 ];
 const varietyProof=[];
 const allJoystick=await iframe.locator('#joystick').boundingBox();
 const vx=allJoystick.x+allJoystick.width/2,vy=allJoystick.y+allJoystick.height/2;
 const deviceTouch=await context.newCDPSession(page);
 for(const testAvatar of suits){
   const old=await getPos();
   await iframe.locator('[data-avatar="'+testAvatar.id+'"]').click();
   const selected=await iframe.locator('#world-canvas').evaluate(()=>{
      const d=window.ScoponeOverworld.debug();
      return {id:d.player.assetId,scene:d.state.scene,pos:{x:d.player.x,y:d.player.y},stored:localStorage.getItem('scopone-alchemico:overworld:character:v1')};
   });
   assert.equal(selected.id,testAvatar.id);
   assert.equal(selected.stored,testAvatar.id);
   assert.equal(selected.scene,'city');
   assert.equal(selected.pos.x,old.x,'Switch must preserve x '+testAvatar.id);
   assert.equal(selected.pos.y,old.y,'Switch must preserve y '+testAvatar.id);
   assert.equal(await iframe.locator('[data-avatar="'+testAvatar.id+'"]').getAttribute('aria-pressed'),'true');
   // All eight directions must be registered and decoded as 4-frame WebP strips.
   const art=await iframe.locator('#world-canvas').evaluate(async()=>{
     const d=window.ScoponeOverworld.debug(),a=d.renderer.assets;
     const result={};
     for(const dir of ['N','NE','E','SE','S','SW','W','NW']){
       let spec=null;
       for(let i=0;i<90;i++){
         spec=a.spriteFor({...d.player,animation:'walk'},dir,.3);
         if(!spec.loading&&spec.frames===4&&spec.image?.naturalWidth)break;
         await new Promise(r=>setTimeout(r,50));
       }
       result[dir]={frames:spec?.frames,loading:spec?.loading,src:spec?.image?.src,
         w:spec?.image?.naturalWidth,h:spec?.image?.naturalHeight};
     }
     return result;
   });
   for(const [dir,entry] of Object.entries(art)){
     assert.equal(entry.frames,4,'wrong animation count '+testAvatar.id+' '+dir);
     assert.equal(entry.loading,false,'image loading fallback '+testAvatar.id+' '+dir);
     assert.equal(entry.w,2048,'WebP strip width '+testAvatar.id+' '+dir);
     assert.equal(entry.h,512,'WebP strip height '+testAvatar.id+' '+dir);
     assert.ok(entry.src.includes(testAvatar.folder+'/walk/'+dir+'.webp'),testAvatar.id+' '+dir);
   }
   // Walk EAST with a real mobile touch; collect drawn Canvas frame index,
   // not just spriteFor() or stored filenames.
   await iframe.locator('#world-canvas').evaluate(()=>{
     const d=window.ScoponeOverworld.debug();
     d.player.x=45.5;d.player.y=45.5;d.player.animation='idle';d.player.animationTime=0;
     d.renderer.camera.x=45.5;d.renderer.camera.y=45.5;
     d.lifecycle.path=[];d.lifecycle.destination=null;
   });
   const observed=[];
   await deviceTouch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:vx,y:vy,id:31}]});
   try{
     await deviceTouch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:vx+27,y:vy,id:31}]});
     for(let i=0;i<10;i++){
       await page.waitForTimeout(108);
       observed.push(await iframe.locator('#world-canvas').evaluate(()=>{
         const d=window.ScoponeOverworld.debug(),s=d.renderer.lastPlayerSprite;
         return {id:d.player.assetId,facing:d.player.facing,animation:d.player.animation,
           frame:s?.frame,frames:s?.frames,drawn:s?.drawn,loading:s?.loading,
           src:s?.src,elapsed:d.player.animationTime};
       }));
     }
   }finally{
     await deviceTouch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   const valid=observed.filter(x=>x.id===testAvatar.id&&x.facing==='E'&&x.animation==='walk'&&x.drawn&&!x.loading&&x.frames===4&&x.src?.includes(testAvatar.folder));
   assert.ok(valid.length>=6,testAvatar.id+' must walk east under real touch');
   assert.ok(new Set(valid.map(x=>x.frame)).size>=3,testAvatar.id+' drawn sprite frames are stuck');
   await page.screenshot({path:path.join(repoRoot,'browser-qa','four-suits-'+testAvatar.id+'.png')});
   varietyProof.push({variant:testAvatar.id,validSamples:valid.length,drawnFrames:[...new Set(valid.map(x=>x.frame))],maxTime:Math.max(...valid.map(x=>x.elapsed))});
 }
 await iframe.locator('[data-avatar="player"]').click();
 console.log('FOUR SUITS REAL ANDROID TOUCH',JSON.stringify(varietyProof));


 // One-button roundtrip must restore C08 assets without touching any cards.
 const posS08=await getPos();
 await iframe.locator('[data-avatar="player"]').click();
 assert.match(await avatarButton.textContent(),/Spade/);
 assert.equal(await iframe.locator('[data-avatar="player"]').getAttribute('aria-pressed'),'true');
 const afterRoundtrip=await iframe.locator('#world-canvas').evaluate(()=>{
   const d=window.ScoponeOverworld.debug();
   return {asset:d.player.assetId,frameSource:d.renderer.lastPlayerSprite?.src,
     stored:localStorage.getItem('scopone-alchemico:overworld:character:v1')};
 });
 assert.equal(afterRoundtrip.asset,'player');
 assert.equal(afterRoundtrip.stored,'player');
 assert.deepEqual(await getPos(),posS08,'Avatar swap must not change scene coordinates');


 // Real joystick QA for the three reported directions. Unlike the old
 // screenshot test below, this does not assign facing or animation manually:
 // the normal requestAnimationFrame update handles input and pose selection.
 const joystickDirections=[
   {dir:'NE',dx:1,dy:-1,frames:22,pattern:/c08-v02-auto-NE-22f\.webp/},
   {dir:'E',dx:1,dy:0,frames:12,pattern:/c08-auto-stabilized-E-12f\.webp/},
   {dir:'SE',dx:1,dy:1,frames:12,pattern:/c08-auto-stabilized-SE-12f\.webp/},
 ];
 const analog=await iframe.locator('#joystick').boundingBox();
 const joyX=analog.x+analog.width/2,joyY=analog.y+analog.height/2;
 const realJoystickEvidence=[];
 for(const {dir,dx,dy,frames,pattern} of joystickDirections){
   const canMove=await iframe.locator('#world-canvas').evaluate(()=>{
     const {world,player,renderer}=window.ScoponeOverworld.debug();
     if(!world.canStand(20.5,20.5))return false;
     player.x=20.5;player.y=20.5;
     renderer.camera.x=player.x;renderer.camera.y=player.y;
     return true;
   });
   assert.ok(canMove,'QA start location must be walkable');
   await page.mouse.move(joyX,joyY);
   await page.mouse.down();
   await page.mouse.move(joyX+dx*25,joyY+dy*25,{steps:4});
   await page.waitForTimeout(650);
   const sample=await iframe.locator('#world-canvas').evaluate(()=>{
     const env=window.ScoponeOverworld.debug();
     const {player,renderer}=env;
     const sprite=renderer.assets.spriteFor(player,player.facing,player.animationTime);
     return {facing:player.facing,animation:player.animation,elapsed:player.animationTime,
       frame:sprite.frame,frames:sprite.frames,loading:sprite.loading,
       src:sprite.image?.currentSrc||sprite.image?.src||'',
       pos:{x:player.x,y:player.y}};
   });
   await page.screenshot({path:path.join(repoRoot,'browser-qa','c08-joystick-'+dir+'-mobile.png')});
   await page.mouse.up();
   assert.equal(sample.facing,dir,'Joystick facing '+dir);
   assert.equal(sample.animation,'walk','Joystick must trigger actual walk '+dir);
   assert.ok(sample.elapsed>.15,'Walk timer must advance '+dir);
   assert.equal(sample.frames,frames,'Frame count mismatch from joystick '+dir);
   assert.match(sample.src,pattern,'Wrong sprite file from joystick '+dir);
   assert.equal(sample.loading,false,'Directional walk still on fallback '+dir);
   realJoystickEvidence.push({dir,frames:sample.frames,frame:sample.frame,
     source:sample.src.split('/').pop(),elapsed:sample.elapsed,pos:sample.pos});
 }
 console.log('C08 REAL JOYSTICK NE/E/SE',JSON.stringify(realJoystickEvidence));

 // Long-held REAL TOUCH (not mouse or artificially assigned frames): Android
 // portrait viewport, native Chromium Input.dispatchTouchEvent and RAF movement.
 // The QA snapshots the EXACT image and source rectangle used by Canvas.drawImage;
 // comparing cropped sprite pixels avoids false positives from camera/terrain motion.
 const touchSession=await context.newCDPSession(page);
 const stableJoystick=await iframe.locator('#joystick').boundingBox();
 const cxTouch=stableJoystick.x+stableJoystick.width/2;
 const cyTouch=stableJoystick.y+stableJoystick.height/2;
 const longHoldEvidence={};
 for(const direction of ['NE','SE']){
   const sign=direction==='NE'?-1:1;
   const found=await iframe.locator('#world-canvas').evaluate((_canvas,sign)=>{
     const d=window.ScoponeOverworld.debug();
     const {world,player,renderer,lifecycle}=d;
     const sx=Math.SQRT1_2,sy=sign*Math.SQRT1_2;
     const ux=sx/52+sy/30,uy=sy/30-sx/52,length=Math.hypot(ux,uy);
     const vx=ux/length,vy=uy/length;
     let spawn=null;
     for(const x of [20.5,24.5,16.5,28.5,36.5,44.5,12.5]){
       if(spawn)break;
       for(const y of [20.5,24.5,16.5,28.5,36.5,44.5,12.5]){
         let safe=true;
         for(let i=0;i<=36;i++){
           const distance=i/36*9.5,px=x+vx*distance,py=y+vy*distance;
           if(!world.canStand(px,py)||world.getPortalAt(px,py)?.active){safe=false;break;}
         }
         if(safe){spawn={x,y};break;}
       }
     }
     if(!spawn)return null;
     player.x=spawn.x;player.y=spawn.y;
     player.animation='idle';player.animationTime=0;
     renderer.camera.x=spawn.x;renderer.camera.y=spawn.y;
     lifecycle.path=[];lifecycle.destination=null;
     return spawn;
   },sign);
   assert.ok(found,'No traversable 9.5-tile route for '+direction);
   const samples=[];
   const savedPoseHashes=new Set();
   await touchSession.send('Input.dispatchTouchEvent',{
     type:'touchStart',touchPoints:[{x:cxTouch,y:cyTouch,id:41}]
   });
   try{
     await touchSession.send('Input.dispatchTouchEvent',{
       type:'touchMove',touchPoints:[{x:cxTouch+28,y:cyTouch+sign*28,id:41}]
     });
     for(let i=0;i<26;i++){
       // Deliberate small analog wobble around the E/NE or E/SE boundary
       // during the last second. A real walk phase must continue.
       if(i>=16){
         const wobble=(i%2===0?28:10);
         await touchSession.send('Input.dispatchTouchEvent',{
           type:'touchMove',touchPoints:[{x:cxTouch+28,y:cyTouch+sign*wobble,id:41}]
         });
       }
       await page.waitForTimeout(105);
       const snapshot=await iframe.locator('#world-canvas').evaluate(canvas=>{
         const env=window.ScoponeOverworld.debug();
         const p=env.player,d=env.renderer.lastPlayerSprite;
         const panel=document.getElementById('c08-diagnostics');
         if(!d)return null;
         let poseHash=null,opaquePixels=0;
         if(d.drawn&&d.image&&d.sourceWidth>0){
           const tile=document.createElement('canvas');
           tile.width=72;tile.height=96;
           const ctx=tile.getContext('2d',{willReadFrequently:true});
           ctx.drawImage(d.image,d.sourceX,0,d.sourceWidth,d.image.naturalHeight,0,0,72,96);
           const pixels=ctx.getImageData(0,0,72,96).data;
           let h=2166136261>>>0;
           for(let z=0;z<pixels.length;z+=4){
             if(pixels[z+3]<32)continue;
             opaquePixels++;
             for(let c=0;c<4;c++)h=Math.imul(h^pixels[z+c],16777619)>>>0;
           }
           poseHash=h.toString(16);
         }
         return {facing:p.facing,animation:p.animation,
           animationTime:p.animationTime,renderedTime:d.animationTime,
           frame:d.frame,frames:d.frames,loading:d.loading,failed:d.failed,
           drawn:d.drawn,source:d.src,poseHash,opaquePixels,
           diagnostic:panel?.textContent||'',panelVisible:!!panel&&!panel.hidden};
       });
       if(snapshot)samples.push(snapshot);
       if(snapshot?.drawn&&!snapshot.loading&&!snapshot.failed&&snapshot.animation==='walk'&&snapshot.facing===direction&&snapshot.poseHash){
         if(!savedPoseHashes.has(snapshot.poseHash)&&savedPoseHashes.size<2){
           savedPoseHashes.add(snapshot.poseHash);
           await page.screenshot({path:path.join(repoRoot,'browser-qa','c08-touch-'+direction+'-pose'+savedPoseHashes.size+'.png')});
         }
       }
     }
   }finally{
     await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   const running=samples.filter(x=>x.animation==='walk'&&x.facing===direction&&
     x.drawn&&!x.loading&&!x.failed&&x.poseHash&&x.opaquePixels>100);
   const frameValues=new Set(running.map(x=>x.frame));
   const poseValues=new Set(running.map(x=>x.poseHash));
   assert.ok(running.length>=8,direction+' did not keep walking with native touch');
   assert.ok(Math.max(...running.map(x=>x.animationTime))>1.8,
     direction+' animation timer was reset during joystick wobble');
   assert.ok(frameValues.size>=(direction==='NE'?3:2),direction+' frame index is stuck');
   assert.ok(poseValues.size>=2,direction+' drawn poses have identical source pixels');
   assert.ok(running.every(x=>x.panelVisible&&x.diagnostic.includes('frame:')&&
     x.diagnostic.includes('animationTime:')&&x.diagnostic.includes('loading:')),
     'Live diagnostic is not visible or does not contain the drawn frame');
   assert.ok(running.every(x=>x.frames===(direction==='NE'?22:12)),
     'Wrong directional frame strip '+direction);
   assert.ok(running.every(x=>direction==='NE'?
     /c08-v02-auto-NE-22f\.webp/.test(x.source):
     /c08-auto-stabilized-SE-12f\.webp/.test(x.source)),
     'Unexpected C08 image decoded in renderer '+direction);
   await page.waitForTimeout(180);
   const stopped=await iframe.locator('#world-canvas').evaluate(
     ()=>window.ScoponeOverworld.debug().player.animation);
   assert.equal(stopped,'idle','C08 must return to idle when finger lifts');
   longHoldEvidence[direction]={
     samples:samples.length,walkingSamples:running.length,
     maxTime:Math.max(...running.map(x=>x.animationTime)),
     frames:[...frameValues].sort((a,b)=>a-b),
     distinctDrawnPoses:poseValues.size,
     source:running[0].source.split('/').pop(),
     screenshotFiles:['c08-touch-'+direction+'-pose1.png','c08-touch-'+direction+'-pose2.png']
   };
 }
 console.log('C08 REAL TOUCH HOLD 2.7s + ANALOG WOBBLE',JSON.stringify(longHoldEvidence));



 // Actual 2D canvas rendering from the live Overworld in a portrait Chromium
 // viewport. Captures the requested direction after its lazy strip has decoded.
 const expectedFrames={W:22,NW:22,N:22,NE:22,SW:22,S:18,SE:12,E:12};
 for(const direction of Object.keys(expectedFrames)){
   const snap=await iframe.locator('#world-canvas').evaluate(async(canvas,dir)=>{
     const env=window.ScoponeOverworld.debug();
     if(!env)throw Error('QA debug API unavailable');
     const {player,renderer}=env;
     let sprite;
     for(let t=0;t<90;t++){
       sprite=renderer.assets.spriteFor({...player,animation:'walk'},dir,0.27);
       if(sprite?.image&&!sprite.loading)break;
       await new Promise(r=>setTimeout(r,60));
     }
     if(!sprite?.image||sprite.loading)throw Error('C08 direction did not decode: '+dir);
     player.facing=dir;player.animation='walk';player.animationTime=.27;
     renderer.draw(player,[],null,1/60);
     const image=canvas.toDataURL('image/png').split(',')[1];
     return {frames:sprite.frames,frame:sprite.frame,src:sprite.image.currentSrc||sprite.image.src,image};
   },direction);
   assert.equal(snap.frames,expectedFrames[direction],direction+' wrong frame count');
   assert.match(snap.src,/\/characters\/c08\//,direction+' wrong C08 source');
   if(['E','SE','S'].includes(direction))assert.match(snap.src,/c08-auto-stabilized-/,'Recovered C08 sheet missing');
   if(['W','NW','N','NE','SW'].includes(direction))assert.match(snap.src,/c08-v02-auto-/,'AutoSprite was not selected');
   await writeFile(path.join(repoRoot,'browser-qa','c08-'+direction+'-city.png'),Buffer.from(snap.image,'base64'));
 }
 // Verify that a 22-frame sequence actually advances between two draw calls.
 const motion=await iframe.locator('#world-canvas').evaluate(async canvas=>{
   const env=window.ScoponeOverworld.debug();
   const {player,renderer}=env;
   player.facing='W';player.animation='walk';
   // W may have been evicted from the four-sheet LRU by the preceding
   // eight-direction screenshot tour. Wait for the on-demand WebP decode.
   let loaded=false;
   for(let attempt=0;attempt<90;attempt++){
     const check=renderer.assets.spriteFor({...player,animation:'walk'},'W',0);
     if(check.image&&!check.loading){loaded=true;break;}
     await new Promise(r=>setTimeout(r,60));
   }
   if(!loaded)throw Error('W sprite did not reload after LRU eviction');
   const images=[];
   for(const elapsed of [0,5/22]){
     player.animationTime=elapsed;
     player.animation='walk';
     const spec=renderer.assets.spriteFor({...player,animation:'walk'},'W',elapsed);
     renderer.draw(player,[],null,1/60);
     images.push({frame:spec.frame,pixels:canvas.toDataURL('image/png')});
   }
   return images;
 });
 assert.deepEqual(motion.map(x=>x.frame),[0,5],'C08 must advance on the 22-frame sheet');
 assert.notEqual(motion[0].pixels,motion[1].pixels,'The rendered walking poses must visibly differ');


 // Confirm that each newly recovered direction changes image pixels across real frame indices.
 for(const heading of ['E','SE','S']){
   const samples=await iframe.locator('#world-canvas').evaluate(async(canvas,dir)=>{
     const {player,renderer}=window.ScoponeOverworld.debug();
     let sprite;
     for(let i=0;i<90;i++){
       sprite=renderer.assets.spriteFor({...player,animation:'walk'},dir,0);
       if(sprite.image&&!sprite.loading)break;
       await new Promise(resolve=>setTimeout(resolve,60));
     }
     if(!sprite.image||sprite.loading)throw Error('Recovered '+dir+' did not decode');
     const frames=[];
     for(const elapsed of [0,5/12]){
       player.facing=dir;player.animation='walk';player.animationTime=elapsed;
       const selected=renderer.assets.spriteFor(player,dir,elapsed);
       renderer.draw(player,[],null,1/60);
       frames.push({frame:selected.frame,pixels:canvas.toDataURL('image/png')});
     }
     return frames;
   },heading);
   assert.deepEqual(samples.map(x=>x.frame),[0,5],heading+' must advance');
   assert.notEqual(samples[0].pixels,samples[1].pixels,heading+' must display different poses');
 }

 const s08EndScene=await getPos();
 assert.equal(s08EndScene.scene,'city','S08 QA must not approach city exit trigger');
 await iframe.locator('#world-canvas').evaluate(()=>window.ScoponeOverworld.save());
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
 // The controller keeps input locked for an additional 200 ms after the veil disappears.
 await page.waitForTimeout(300);
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
