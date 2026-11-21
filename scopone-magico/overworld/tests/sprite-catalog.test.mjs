import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>JSON.parse(readFileSync(path.join(root,relative),'utf8'));
const inventory=read('catalogo-sprite-data.json').items;
const manifest=read('assets.json');
const dirs=['N','NE','E','SE','S','SW','W','NW'];
const current=new Set(['player','s08-player'].flatMap(id=>
 ['idle','walk'].flatMap(kind=>Object.values(manifest.images[id].animations[kind].directions))));

test('visual catalog includes every original C08/S08 WebP from repo',()=>{
 assert.equal(inventory.length,66);
 assert.equal(new Set(inventory.map(x=>x.src)).size,66);
 assert.equal(new Set(inventory.map(x=>x.code)).size,66);
 assert.equal(inventory.filter(x=>current.has(x.src)).length,32);
 assert.equal(inventory.filter(x=>!current.has(x.src)).length,34);
 assert.equal(inventory.filter(x=>x.character==='C08').length,42);
 assert.equal(inventory.filter(x=>x.character==='S08').length,24);
 for(const item of inventory){
  assert.ok(item.src.startsWith('characters/'),item.code);
  assert.ok(item.src.endsWith('.webp'),item.code);
  assert.ok(dirs.includes(item.direction),item.code);
  assert.ok(['idle','walk'].includes(item.state),item.code);
  assert.ok(item.code.startsWith(item.character+'-'),item.code);
  assert.ok(item.frames>=1&&item.frames<=22,item.code);
  const file=path.join(root,item.src);
  assert.ok(existsSync(file),'Missing source image '+item.src);
  assert.ok(statSync(file).size>5000,'Empty WebP '+item.src);
  const riff=readFileSync(file).subarray(0,12);
  assert.equal(riff.toString('ascii',0,4),'RIFF',item.src);
  assert.equal(riff.toString('ascii',8,12),'WEBP',item.src);
 }
});
test('default animation selection, not stale player.directions, drives status',()=>{
 for(const id of ['player','s08-player']){
  const spec=manifest.images[id];
  for(const [state,config] of Object.entries(spec.animations)){
   for(const [dir,src] of Object.entries(config.directions)){
    const found=inventory.filter(x=>x.src===src);
    assert.equal(found.length,1,id+' '+state+' '+dir);
    assert.equal(found[0].direction,dir);
    assert.equal(found[0].state,state);
   }
   assert.equal(Object.keys(config.directions).length,8,id+' '+state);
  }
 }
 const legacy=inventory.find(x=>x.src==='characters/player-south.webp');
 assert.ok(legacy&&!current.has(legacy.src));
 const approved=inventory.find(x=>x.src.endsWith('c08-approved-SE-4f.webp'));
 assert.ok(approved&&!current.has(approved.src),'approved V07 is rollback and not current default');
 const s08old=inventory.filter(x=>x.version==='Spade V01');
 assert.equal(s08old.length,8);
 assert.ok(s08old.every(x=>!current.has(x.src)));
});
test('catalog HTML links back to game and uses a manifest-driven gallery',()=>{
 const html=readFileSync(path.join(root,'catalogo-sprite.html'),'utf8');
 const js=readFileSync(path.join(root,'catalogo-sprite.js'),'utf8');
 const game=readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/id="catalog-grid"/);
 assert.match(html,/id="detail-range"/);
 assert.match(html,/id="replacement-text"/);
 assert.match(js,/animations\[phase\]\.directions/);
 assert.match(js,/drawImage\(img,frame\*sw/);
 assert.match(js,/requestAnimationFrame\(loop\)/);
 assert.match(game,/href="catalogo-sprite\.html"/);
});
