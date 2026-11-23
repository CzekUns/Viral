import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {OVERWORLD_AVATARS,resolveAvatar,nextAvatar} from '../engine/avatar-roster.js';
import {AssetLibrary} from '../engine/assets.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'assets.json'),'utf8'));
const directions=['S','SE','E','NE','N','NW','W','SW'];
test('All four suits and three Coppe versions remain independently selectable',()=>{
 const ids=OVERWORLD_AVATARS.map(a=>a.id);
 assert.deepEqual(ids,['player','s08-player','b08-player','b08-v02-player','d08-player','c08-v01-player','c08-v02-player']);
 assert.equal(new Set(ids).size,7);
 assert.deepEqual([...new Set(ids.map(id=>manifest.images[id].characterId))].sort(),['B08','C08','D08','S08']);
 for(let i=0;i<ids.length;i++)assert.equal(nextAvatar(ids[i]).id,ids[(i+1)%ids.length]);
 assert.equal(resolveAvatar('unknown').id,'player');
});
test('Four new characters contain all 8 real 512x512 standing WebPs and 4x512 walk frames',()=>{
 for(const avatar of OVERWORLD_AVATARS.slice(2)){
   const item=manifest.images[avatar.id];
   assert.equal(item.type,'character');
   assert.ok(item.artStatus.includes('TEST'));
   for(const dir of directions){
     for(const mode of ['idle','walk']){
       const info=item.animations[mode],image=info.directions[dir];
       assert.ok(image?.startsWith('characters/'));
       assert.ok(statSync(path.join(root,image)).size>10000,image);
       const d=info.perDirection[dir];
       assert.deepEqual(d.anchor,avatar.id==='b08-v02-player'?[.5,.88]:[.5,390/512],avatar.id+' '+dir);
       assert.deepEqual(d.renderScale,[1.4,1.4]);
       assert.equal(d.frames,mode==='walk'?4:1);
       assert.equal(d.fps,mode==='walk'?7:1);
       const signature=readFileSync(path.join(root,image)).subarray(0,16);
       assert.equal(signature.toString('ascii',0,4),'RIFF');
       assert.equal(signature.toString('ascii',8,12),'WEBP');
     }
   }
 }
});
test('directional S08 and C08 original are unchanged; new walk files remain lazy',()=>{
 assert.equal(manifest.images['s08-player'].animations.walk.perDirection.E.frames,4);
 assert.equal(manifest.images['player'].animations.walk.perDirection.NE.frames,22);
 const bysrc=new Map(Object.entries(manifest.images).map(([id,x])=>[x.src,id]));
 const mock=new Map(Object.entries(manifest.images).filter(([,x])=>!x.lazy&&x.src).map(([id,x])=>[id,{src:x.src,naturalWidth:512,naturalHeight:512}]));
 const library=new AssetLibrary(manifest,mock);
 for(const avatar of OVERWORLD_AVATARS.slice(2)){
   for(const dir of directions){
     const ip=manifest.images[avatar.id].animations.idle.directions[dir];
     const wp=manifest.images[avatar.id].animations.walk.directions[dir];
     const id=bysrc.get(wp);
     assert.equal(library.info(id).lazy,true,avatar.id+' '+dir);
     assert.ok(mock.has(bysrc.get(ip)),'standing eager-loaded '+avatar.id+' '+dir);
   }
 }
});
