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
const recovered={E:12,SE:12,S:18};
const byName=manifest.images.player.animations;
const mockImages=new Map(Object.entries(manifest.images).map(([id,s])=>[
  id,{naturalWidth:(s.frames||1)*(s.frameSize?.[0]||384),naturalHeight:s.frameSize?.[1]||384,src:s.src}
]));
const lib=new AssetLibrary(manifest,mockImages);

test('walk directions use AutoSprite 22 frames plus recovered E SE S',()=>{
  for(const d of directions){
    for(const state of ['idle','walk']){
      const f=lib.spriteFor({assetId:'player',animation:state},d,0);
      const source=byName[state].directions[d];
      assert.equal(f.image?.src,source,d+' '+state);
      assert.equal(f.flip,false,'Do not mirror cup and sword');
      assert.equal(f.frames,state==='idle'?1:auto.includes(d)?22:(recovered[d]||1),d);
      assert.equal(f.anchor[0],.5);
      assert.ok(f.renderScale[0]>0&&f.renderScale[1]>0);
      assert.ok(fs.statSync(path.join(root,source)).size>2500,source);
    }
  }
  assert.equal(byName.walk.perDirection.S.artStatus,'TEST AUTOSPRITE SCREENREC V04 ANCHOR FIX');
  assert.equal(byName.walk.perDirection.SE.artStatus,'TEST AUTOSPRITE SCREENREC V04 ANCHOR FIX');
  assert.equal(byName.walk.perDirection.E.frames,12);
});
test('22 frames are preserved and advance at the specified rate',()=>{
  // Start with a fresh decoded image bank: the previous test exercised four-sheet LRU eviction.
  const phaseImages=new Map(Object.entries(manifest.images).map(([id,s])=>[
    id,{naturalWidth:(s.frames||1)*(s.frameSize?.[0]||384),naturalHeight:s.frameSize?.[1]||384,src:s.src}
  ]));
  const phaseLib=new AssetLibrary(manifest,phaseImages);
  const p={assetId:'player',animation:'walk'};
  assert.deepEqual([0,1/22,5/22,21/22,1].map(t=>phaseLib.spriteFor(p,'W',t).frame),[0,1,5,21,0]);
  assert.deepEqual([0,1/12,5/12,17/12,18/12].map(t=>phaseLib.spriteFor(p,'S',t).frame),[0,1,5,17,0]);
  assert.deepEqual([0,1/12,5/12,1].map(t=>phaseLib.spriteFor(p,'E',t).frame),[0,1,5,0]);
  assert.equal(phaseLib.spriteFor({...p,animation:'idle'},'NW',999).frame,0);
});
test('WebP strips remain within Android-friendly 4096px width and match frame cell geometry',()=>{
  const entries=[...auto,'S'].map(d=>[d,22,180,249]).concat([['S',4,180,180],['SE',4,180,180],['E',12,180,249],['SE',12,180,249],['S',18,180,249]]);
  for(const [d,frames,fw,fh] of entries){
    const src=frames===22?'characters/c08/v02/c08-v02-auto-'+d+'-22f.webp':frames===4?'characters/c08/v02/c08-approved-'+d+'-4f.webp':'characters/c08/v04-stabilized/c08-auto-stabilized-'+d+'-'+frames+'f.webp';
    const bytes=fs.readFileSync(path.join(root,src));
    assert.equal(bytes.toString('ascii',0,4),'RIFF',src);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',src);
    const format=bytes.toString('ascii',12,16);
    assert.ok(format==='VP8X'||format==='VP8L',src+' unsupported WebP kind '+format);
    let actualWidth,actualHeight;
    if(format==='VP8X'){
      actualWidth=bytes.readUIntLE(24,3)+1;
      actualHeight=bytes.readUIntLE(27,3)+1;
    }else{
      assert.equal(bytes[20],0x2f,'Lossless WebP signature');
      const packed=bytes.readUInt32LE(21);
      actualWidth=(packed&0x3fff)+1;
      actualHeight=((packed>>>14)&0x3fff)+1;
    }
    assert.equal(actualWidth,fw*frames,src+' sheet width');
    assert.equal(actualHeight,fh,src+' sheet height');
    assert.ok(fw*frames<=4096,'limit WebP decoding width');
  }
});
test('AutoSprite metadata and original V04 backups remain available',()=>{
  assert.equal(manifest.images.player.comparisonSudAuto.meta.frames,22);
  assert.equal(manifest.images.player.comparisonBeforeRecovery.S.walkMeta.artStatus,'APPROVATO V08');
  assert.equal(manifest.images.player.comparisonBeforeRecovery.SE.walkMeta.artStatus,'APPROVATO V07');
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

test('recovered E/SE/S preserve approved previous sources and expose matching frame sheets',()=>{
  for(const [d,count] of Object.entries(recovered)){
    const spec=manifest.images['c08-stabilized-walk-'+d];
    assert.equal(spec.frames,count);
    assert.deepEqual(spec.frameSize,[180,249]);
    assert.equal(byName.walk.directions[d],spec.src);
    assert.ok(manifest.images.player.comparisonBeforeRecovery[d].walk);
    assert.ok(fs.statSync(path.join(root,spec.src)).size>2500);
  }
});

test('stabilization preserves original 12/12/18f animation paths for comparison',()=>{
  for(const d of ['E','SE','S']){
    const old=manifest.images.player.comparisonBeforeStabilization[d];
    const now=manifest.images.player.animations.walk.directions[d];
    assert.ok(old.walk.includes('v03-recovered/c08-auto-recovered-'+d));
    assert.ok(now.includes('v04-stabilized/c08-auto-stabilized-'+d));
    assert.equal(old.walkMeta.frames,manifest.images.player.animations.walk.perDirection[d].frames);
    assert.ok(fs.existsSync(path.join(root,old.walk)));
    assert.ok(fs.existsSync(path.join(root,now)));
  }
});
