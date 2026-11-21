import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildTerrain} from '../engine/terrain.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const zone=read('maps/external/campania.json');
const images=read('assets.json').images;
const base=['grass','forest','hill','road','coast','shallow','sea'];

test('V04 has 21 variations, 24 oriented transitions and five road pieces as real WebPs',()=>{
 const ids=Object.keys(images).filter(k=>k.startsWith('outer-')&&images[k].src.startsWith('tiles/outside/v04/'));
 assert.equal(ids.length,50);
 for(const id of ids){
  const spec=images[id];
  assert.equal(spec.type,'tile');
  assert.deepEqual(spec.size,[104,60]);
  const bytes=fs.readFileSync(path.join(root,spec.src));
  assert.ok(bytes.length>700&&bytes.length<12000,id+' WebP should be lightweight');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 for(const t of base){
  assert.equal(zone.terrain.variants[t].length,3);
  for(const id of zone.terrain.variants[t])assert.ok(images[id],id);
 }
 for(const [type,neighbors] of Object.entries(zone.terrain.transitions))
  for(const prefix of Object.values(neighbors))
   for(const side of ['nw','ne','se','sw'])assert.ok(images[prefix+'-'+side],type+':'+side);
 for(const id of Object.values(zone.terrain.roadPieces))assert.ok(images[id],id);
});

test('V04 map is deterministic, produces additional tiles without changing passability',()=>{
 const old=buildTerrain(zone,{version:'v03'});
 const latest=buildTerrain(zone,{version:'v04'});
 const again=buildTerrain(zone,{version:'v04'});
 assert.deepEqual([...latest.blocked],[...old.blocked]);
 assert.deepEqual(latest.tiles,again.tiles);
 assert.ok(new Set(latest.tiles).size>15,'variants and transitions should be used');
 assert.ok(latest.tiles.some(id=>id.includes('-var0')),'variant must appear on map');
 assert.ok(latest.tiles.some(id=>id.includes('-to-')),'transition must appear on map');
 for(const id of latest.tiles)assert.ok(images[id],id+' must be registered');
 assert.ok(old.tiles.every(id=>base.some(t=>id===zone.terrain.tiles[t])));
});

test('V04 preserves the seven approved V03 tile files for rollback',()=>{
 for(const t of base){
  assert.equal(images['outer-'+t].src,'tiles/outside/v03/'+t+'.webp');
  assert.ok(fs.existsSync(path.join(root,images['outer-'+t].src)));
  assert.ok(fs.existsSync(path.join(root,'tiles/outside/'+t+'.svg')));
 }
});
