import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AssetLibrary} from '../engine/assets.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets.json'),'utf8'));
const directions=['N','NE','E','SE','S','SW','W','NW'];
const auto=['N','NE','SW','W','NW'];
const approved=['S','SE'];
const byName=manifest.images.player.animations;
const mockImages=new Map(Object.entries(manifest.images).map(([id,s])=>[
  id,{naturalWidth:(s.frames||1)*(s.frameSize?.[0]||384),naturalHeight:s.frameSize?.[1]||384,src:s.src}
]));
const lib=new AssetLibrary(manifest,mockImages);

test('walk directions use AutoSprite 22 frames, approved 4 frames, East static',()=>{
  for(const d of directions){
    for(const state of ['idle','walk']){
      const f=lib.spriteFor({assetId:'player',animation:state},d,0);
      const source=byName[state].directions[d];
      assert.equal(f.image?.src,source,d+' '+state);
      assert.equal(f.flip,false,'Do not mirror cup and sword');
      assert.equal(f.frames,state==='idle'?1:auto.includes(d)?22:approved.includes(d)?4:1,d);
      assert.equal(f.anchor[0],.5);
      assert.ok(f.renderScale[0]>0&&f.renderScale[1]>0);
      assert.ok(fs.statSync(path.join(root,source)).size>2500,source);
    }
  }
  assert.equal(byName.walk.perDirection.S.artStatus,'APPROVATO V08');
  assert.equal(byName.walk.perDirection.SE.artStatus,'APPROVATO V07');
  assert.equal(byName.walk.perDirection.E.frames,1);
});
test('22 frames are preserved and advance at the specified rate',()=>{
  const p={assetId:'player',animation:'walk'};
  assert.deepEqual([0,1/22,5/22,21/22,1].map(t=>lib.spriteFor(p,'W',t).frame),[0,1,5,21,0]);
  assert.deepEqual([0,.125,.25,.5].map(t=>lib.spriteFor(p,'S',t).frame),[0,1,2,0]);
  assert.equal(lib.spriteFor(p,'E',5).frame,0);
  assert.equal(lib.spriteFor({...p,animation:'idle'},'NW',999).frame,0);
});
test('WebP strips remain within Android-friendly 4096px width and match frame cell geometry',()=>{
  const entries=[...auto,'S'].map(d=>[d,22,180,249]).concat([['S',4,180,180],['SE',4,180,180]]);
  for(const [d,frames,fw,fh] of entries){
    const src=frames===22?'characters/c08/v02/c08-v02-auto-'+d+'-22f.webp':'characters/c08/v02/c08-approved-'+d+'-4f.webp';
    const bytes=fs.readFileSync(path.join(root,src));
    assert.equal(bytes.toString('ascii',0,4),'RIFF',src);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',src);
    assert.equal(bytes.toString('ascii',12,16),'VP8X',src);
    assert.equal(bytes.readUIntLE(24,3)+1,fw*frames,src+' sheet width');
    assert.equal(bytes.readUIntLE(27,3)+1,fh,src+' sheet height');
    assert.ok(fw*frames<=4096,'limit WebP decoding width');
  }
});
test('AutoSprite metadata and original V04 backups remain available',()=>{
  assert.equal(manifest.images.player.comparisonSudAuto.meta.frames,22);
  assert.equal(manifest.images.player.animations.walk.perDirection.S.artStatus,'APPROVATO V08');
  for(const d of directions)for(const state of ['idle','walk']){
    const old='characters/c08/'+state+'/'+d+'.webp';
    assert.ok(fs.existsSync(path.join(root,old)),old);
  }
});
test('lost walk asset falls back to matching directional idle without stretching whole strip',()=>{
  const missing='c08-v02-walk-N';
  mockImages.delete(missing);
  const fallback=lib.spriteFor({assetId:'player',animation:'walk'},'N',.6);
  assert.equal(fallback.frames,1);
  assert.equal(fallback.image?.src,'characters/c08/v02/c08-v02-idle-N.webp');
  assert.equal(fallback.flip,false);
  assert.equal(lib.spriteFor({assetId:'player',animation:'dance'},'SE',.6).frames,1);
});
test('lazy walk sheets are budgeted via LRU without evicting small idle images',()=>{
  const cloned=new Map(mockImages);
  for(const d of ['W','NW','N','NE','SW'])cloned.set('c08-v02-walk-'+d,{src:d});
  const l=new AssetLibrary(manifest,cloned);
  for(const d of ['W','NW','N','NE','SW'])l._touch('c08-v02-walk-'+d);
  assert.equal(l.walkLru.length,4);
  assert.equal(l.image('c08-v02-walk-W'),null);
  assert.ok(l.image('c08-v02-idle-W'));
});
