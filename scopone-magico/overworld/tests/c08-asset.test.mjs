import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {AssetLibrary} from '../engine/assets.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets.json'),'utf8'));
const dirs=['N','NE','E','SE','S','SW','W','NW'];
const fakeImages=new Map(Object.entries(manifest.images).map(([id,s])=>[id,{naturalWidth:(s.frames||1)*384,naturalHeight:384,src:s.src}]));
const library=new AssetLibrary(manifest,fakeImages);
test('C08 sprites have an external idle/walk image in all 8 directions',()=>{
 for(const heading of dirs){
  for(const animation of ['idle','walk']){
   const char={assetId:'player',animation};
   const frame=library.spriteFor(char,heading,0);
   assert.equal(frame.image.src,`characters/c08/${animation}/${heading}.webp`);
   assert.equal(frame.flip,false,'the belt cup must never be mirrored');
   assert.equal(frame.frames,animation==='walk'?3:1);
   assert.equal(frame.anchor[0],.5);
   assert.ok(Math.abs(frame.anchor[1]-365/384)<1e-6);
   assert.ok(fs.statSync(path.join(root,frame.image.src)).size>2000);
  }
 }
});
test('walk frame progression uses dedicated frames, idle is static',()=>{
 const p={assetId:'player',animation:'walk'};
 const frames=[0,.15,.3,.45].map(t=>library.spriteFor(p,'E',t).frame);
 assert.deepEqual(frames,[0,1,2,0]);
 assert.equal(library.spriteFor({...p,animation:'idle'},'E',900).frame,0);
});
test('unknown state and missing image safely fall back to idle sprite without cropping',()=>{
 const fallback=library.spriteFor({assetId:'player',animation:'dance'},'NE',.8);
 assert.equal(fallback.frames,1);
 assert.equal(fallback.image.src,'characters/c08/idle/NE.webp');
 fakeImages.delete('c08-walk-N');
 const missing=library.spriteFor({assetId:'player',animation:'walk'},'N',.8);
 assert.equal(missing.frames,1);
 assert.equal(missing.image.src,'characters/c08/idle/S.webp');
});
