import test from 'node:test';
import assert from 'node:assert/strict';
import {project,unproject,worldToScreen,screenToWorld,screenToTile,TILE_HEIGHT,TILE_WIDTH,axisAngle,screenDirectionToWorld} from '../engine/geometry.js';
import {World} from '../engine/world.js';
import {findPath} from '../engine/pathfinding.js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const mapDir=path.resolve(base,'../maps');
const index=JSON.parse(fs.readFileSync(path.join(mapDir,'world.json')));
const zones=index.zones.map(f=>JSON.parse(fs.readFileSync(path.join(mapDir,f))));
const world=new World(index,zones);
test('orthographic true isometry 30/30, 104x60 at 0.5 scale',()=>{
 assert.equal(TILE_WIDTH,52);assert.equal(TILE_HEIGHT,30);
 assert.ok(Math.abs(axisAngle-30)<.03);
 assert.ok(Math.abs(TILE_WIDTH/TILE_HEIGHT-Math.sqrt(3))<.002);
 const a=project(1,0),b=project(0,1);
 assert.deepEqual(a,{x:26,y:15});assert.deepEqual(b,{x:-26,y:15});
 const cosine=(a.x*b.x+a.y*b.y)/(Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y));
 assert.ok(Math.abs(Math.acos(cosine)*180/Math.PI-120)<.05);
});
test('project and unproject round-trip world and screen coords',()=>{
 const cam={x:22.3,y:51.4,zoom:1.53,anchorY:.44};
 for(const [x,y] of [[0,0],[32,32],[31.8,6.4],[63.5,63.5],[12.312,45.89]]){
  const p=project(x,y),q=unproject(p.x,p.y);assert.ok(Math.abs(q.x-x)<1e-10&&Math.abs(q.y-y)<1e-10);
  const s=worldToScreen(x,y,cam,390,844),r=screenToWorld(s.x,s.y,cam,390,844);
  assert.ok(Math.abs(r.x-x)<1e-10&&Math.abs(r.y-y)<1e-10);
  const tile=screenToTile(s.x,s.y,cam,390,844);assert.equal(tile.x,Math.floor(x));assert.equal(tile.y,Math.floor(y));
 }
});
test('four 32x32 zones form an uninterrupted 64x64 world',()=>{
 assert.equal(world.zones.size,4);assert.equal(world.width*world.height,4096);
 assert.equal(world.zoneAt(31.999,15).id,'A');assert.equal(world.zoneAt(32,15).id,'B');
 assert.equal(world.zoneAt(31,32).id,'C');assert.equal(world.zoneAt(32,32).id,'D');
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)assert.ok(world.tileAt(x,y));
 assert.equal(world.zoneAt(64,1),null);
});
test('16x16 chunk loading across seamless zone boundaries',()=>{
 world.prefetchNear(31.7,16.5,1);
 const ids=[...world.preloaded];assert.ok(ids.some(k=>k.startsWith('A:')));assert.ok(ids.some(k=>k.startsWith('B:')));
 for(const z of world.zones.values()){for(let cx=0;cx<2;cx++)for(let cy=0;cy<2;cy++)assert.ok(world.ensureChunk(z.id,cx,cy));}
 assert.equal(world.chunks.size,16);
});
test('collision map is addressable in local and global coordinates',()=>{
 assert.equal(world.isBlocked(31.5,10.5),false);
 world.setCollision('B',0,10,true);assert.equal(world.isBlocked(32.5,10.5),true);
 assert.equal(world.canStand(32.5,10.5),false);
 world.setCollision('B',0,10,false);assert.equal(world.canStand(32.5,10.5),true);
});
test('A* paths across zones and respects blocking without diagonal corner-cut',()=>{
 const a=findPath(world,{x:30.5,y:15.5},{x:34.5,y:15.5});
 assert.ok(a.length>=5);assert.deepEqual(a.at(-1),{x:34.5,y:15.5});
 world.setCollision('A',1,0,true);world.setCollision('A',0,1,true);
 const path=findPath(world,{x:.5,y:.5},{x:1.5,y:1.5});assert.deepEqual(path,[]);
 world.setCollision('A',1,0,false);world.setCollision('A',0,1,false);
});
test('configure larger 64×64 zones without geometry rewrite',()=>{
 const large={...zones[0],id:'T',width:64,height:64,worldX:0,worldY:0};
 const w=new World({...index,width:64,height:64},[large]);assert.equal(w.zoneAt(63,63).id,'T');assert.ok(w.ensureChunk('T',3,3));
});
test('uniform velocity vector normalized for joystick and diagonals toggled',()=>{
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]]){
  const a=screenDirectionToWorld(x,y);assert.ok(Math.abs(Math.hypot(a.x,a.y)-1)<1e-10);
 }
 const a=screenDirectionToWorld(1,1,false);assert.ok(a.x!==0||a.y!==0);
});
