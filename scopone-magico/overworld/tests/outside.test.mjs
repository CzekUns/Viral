import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../engine/world.js';
import {findPath} from '../engine/pathfinding.js';
import {defaultState,restoreState,encodeState,cityOnTile} from '../engine/scene-state.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const parse=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const outsideManifest=parse('maps/external/world.json');
const outside=new World(outsideManifest,[parse('maps/external/campania.json')]);
const innerManifest=parse('maps/world.json');
const city=new World(innerManifest,innerManifest.zones.map(n=>parse('maps/'+n)));
test('campania tile map has walkable coast, blocked open sea and land extensions',()=>{
 assert.equal(outside.width,96);assert.equal(outside.height,96);
 for(const [x,y] of [[48,39],[29,43],[67,47],[52,17],[82,71],[92,64]])assert.equal(outside.isBlocked(x+.5,y+.5),false,x+','+y);
 assert.equal(outside.isBlocked(48.5,62.5),true,'Golfo di Napoli must be water');
 assert.equal(outside.isBlocked(30.5,70.5),true,'deep water blocked');
 assert.equal(outside.isBlocked(16.5,72.5),false,'Ischia island');
 assert.equal(outside.isBlocked(59.5,88.5),false,'Capri island');
 const terrain=outside.zoneById('campania').terrainGrid;
 assert.ok(new Set(terrain).size>=6,'nature is not one flat tile');
});
test('all city nodes provide unique IDs, reachable entry and safe return',()=>{
 assert.equal(outside.manifest.cities.length,6);
 assert.equal(new Set(outside.manifest.cities.map(c=>c.id)).size,6);
 for(const c of outside.manifest.cities){
  assert.equal(cityOnTile(outside.manifest,c.x+.5,c.y+.5)?.id,c.id);
  assert.ok(outside.canStand(c.x+.5,c.y+.5),c.name);
  assert.ok(outside.canStand(...c.returnOutside),c.name+' return');
  assert.ok(city.canStand(...c.exitInside),c.name+' internal exit');
  assert.ok(city.zoneById(c.entry.zone).entrances[c.entry.entrance],c.name+' internal entrance');
  assert.ok(fs.existsSync(path.resolve(root,'maps/external',c.map)),c.name+' manifest exists');
 }
 const p=findPath(outside,outside.entrance('campania','start'),{x:48.5,y:39.5});
 assert.ok(p.length>0&&p.length<25,'Napoli is reachable from initial spawn');
});
test('two-scale persistence and migration from the legacy interior save',()=>{
 const initial=defaultState(outside,city);
 assert.equal(initial.scene,'outside');
 const loaded=restoreState({version:2,scene:'city',cityId:'napoli',
  outside:{x:50.5,y:38.5,zoom:.75},inside:{x:17.5,y:18.5,zoom:1.3}},null,outside,city);
 assert.equal(loaded.scene,'city');assert.equal(loaded.cityId,'napoli');
 assert.equal(loaded.inside.zoom,1.3);assert.equal(loaded.outside.zoom,.75);
 assert.equal(encodeState(loaded).version,2);
 const invalid=restoreState({version:2,scene:'city',cityId:'inesistente',outside:{x:-5,y:2}},null,outside,city);
 assert.equal(invalid.scene,'outside');assert.ok(outside.canStand(invalid.outside.x,invalid.outside.y));
 const migrated=restoreState(null,{version:1,x:19.5,y:21.5,zoom:1.2},outside,city);
 assert.equal(migrated.scene,'outside');assert.equal(migrated.inside.x,19.5);assert.equal(migrated.inside.zoom,1.2);
});
test('V03 test artwork is lossless to binary transport, retained beside legacy textures',()=>{
 const images=parse('assets.json').images;
 for(const name of ['grass','forest','hill','road','coast','shallow','sea']){
  const src=images['outer-'+name].src;
  assert.equal(src,'tiles/outside/v03/'+name+'.webp','unexpected V03 mapping');
  const data=fs.readFileSync(path.join(root,src));
  assert.ok(data.length>1000&&data.length<12000,'WebP should remain compact');
  assert.equal(data.toString('ascii',0,4),'RIFF','valid WebP RIFF header');
  assert.equal(data.toString('ascii',8,12),'WEBP','valid WebP signature');
  assert.ok(fs.existsSync(path.join(root,'tiles/outside/'+name+'.svg')),'legacy fallback retained');
 }
});
test('external artwork uses replaceable manifest paths and local files',()=>{
 const assets=parse('assets.json');
 for(const tile of Object.values(parse('maps/external/campania.json').terrain.tiles)){
  assert.equal(assets.images[tile].type,'tile');
  assert.ok(fs.statSync(path.join(root,assets.images[tile].src)).size>100);
 }
 for(const id of ['outer-city','outer-volcano'])assert.ok(fs.statSync(path.join(root,assets.images[id].src)).size>100);
});
