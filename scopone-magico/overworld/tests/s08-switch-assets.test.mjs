import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AssetLibrary} from '../engine/assets.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets.json'),'utf8'));
const dirs=['S','SE','E','NE','N','NW','W','SW'];
const avatar=manifest.images['s08-player'];
const base='characters/s08/v02-handsfree-test/';
const mock=new Map(Object.entries(manifest.images).map(([id,x])=>[id,{
  src:x.src,naturalWidth:(x.frames||1)*(x.frameSize?.[0]||512),
  naturalHeight:x.frameSize?.[1]||512
}]));
const lib=new AssetLibrary(manifest,mock);

test('S08 V02 registers 8 standing WebPs and 8 four-frame walks, no generated replacements',()=>{
  assert.equal(avatar.characterId,'S08');
  assert.equal(avatar.artStatus,'TEST_VISUAL_REVIEW');
  assert.deepEqual(avatar.anchor,[.5,350/512]);
  for(const direction of dirs){
    const idle=base+'standing/'+direction+'.webp';
    const walk=base+'walk/'+direction+'.webp';
    for(const [state,src,expectedFrames] of [['idle',idle,1],['walk',walk,4]]){
      const sp=lib.spriteFor({assetId:'s08-player',animation:state},direction,.38);
      assert.equal(sp.image?.src,src);
      assert.equal(sp.frames,expectedFrames);
      assert.equal(sp.flip,false);
      assert.equal(sp.anchor[1],350/512);
      assert.deepEqual(sp.renderScale,[1.4,1.4]);
      assert.ok(fs.statSync(path.join(root,src)).size>10000,src);
    }
    assert.equal(manifest.images['s08-v02-walk-'+direction].lazy,true);
  }
});
test('S08 four-frame walk advances without changing facing',()=>{
  const p={assetId:'s08-player',animation:'walk'};
  assert.deepEqual([0,.15,.30,.45,.60].map(t=>lib.spriteFor(p,'SE',t).frame),[0,1,2,3,0]);
  assert.equal(lib.spriteFor({...p,animation:'idle'},'SE',300).frame,0);
});
test('S08 images are actual lossless WebP and S08 remains isolated from C08',()=>{
  assert.equal(manifest.images.player.characterId,'C08');
  for(const dir of dirs)for(const kind of ['standing','walk']){
    const bytes=fs.readFileSync(path.join(root,base+kind+'/'+dir+'.webp'));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(bytes.toString('ascii',12,16),'VP8L');
  }
  assert.equal(manifest.images.player.animations.walk.perDirection.NE.frames,22);
});
test('missing S08 walk image displays its own matching standing direction',()=>{
  const separate=new Map(mock);
  separate.delete('s08-v02-walk-NE');
  const l=new AssetLibrary(manifest,separate);
  const result=l.spriteFor({assetId:'s08-player',animation:'walk'},'NE',.5);
  assert.equal(result.frames,1);
  assert.equal(result.fallback,true);
  assert.equal(result.image.src,base+'standing/NE.webp');
});
