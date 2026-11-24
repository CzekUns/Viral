import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CITY_TILE,BASE_TILES,EXPANSION_TILES,cityContains,cellFromWorld,
 canExpandCity,canBuildCity,createGaiaCityBuilder
} from '../city-builder.js';

const base=[{x:0,z:0,w:64,h:64}];
test('city tiles represent 64x64 owned cells, without turning the world into a grid',()=>{
 assert.equal(BASE_TILES,64);assert.equal(EXPANSION_TILES,16);
 assert.equal(BASE_TILES**2,4096);
 assert.equal(cityContains(base,0,0),true);
 assert.equal(cityContains(base,63,63),true);
 assert.equal(cityContains(base,64,63),false);
});
test('16x16 expansion only accepts adjacent, unoccupied, snapped districts',()=>{
 assert.equal(canExpandCity(base,64,16),true);
 assert.equal(canExpandCity(base,-16,32),true);
 assert.equal(canExpandCity(base,16,64),true);
 assert.equal(canExpandCity(base,64,64),false);
 assert.equal(canExpandCity(base,48,48),false);
 assert.equal(canExpandCity(base,65,16),false);
 const grown=[...base,{x:64,z:16,w:16,h:16}];
 assert.equal(canExpandCity(grown,64,16),false);
 assert.equal(canExpandCity(grown,80,16),true);
});
test('building respects owned land, occupied squares and central streets',()=>{
 const occupied=new Map();
 assert.equal(canBuildCity(base,occupied,8,8,5,5),true);
 assert.equal(canBuildCity(base,occupied,62,10,5,5),false);
 assert.equal(canBuildCity(base,occupied,30,10,5,5),false);
 assert.equal(canBuildCity(base,occupied,10,31,5,5),false);
 occupied.set('9:9','house');
 assert.equal(canBuildCity(base,occupied,8,8,5,5),false);
});
test('world space maps deterministically to buildable tile coordinates',()=>{
 const origin={x:-3.84,z:-3.84};
 assert.deepEqual(cellFromWorld(origin.x+.001,origin.z+.001,origin),{x:0,z:0});
 assert.deepEqual(cellFromWorld(origin.x+CITY_TILE*64+.001,origin.z+CITY_TILE*15+.001,origin),{x:64,z:15});
});
class V3{
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this}
 clone(){return new V3(this.x,this.y,this.z)}
}
class Obj{
 constructor(){this.children=[];this.position=new V3();this.rotation={x:0,y:0,z:0};this.scale=new V3(1,1,1)}
 add(child){this.children.push(child)}
 remove(child){this.children=this.children.filter(v=>v!==child)}
 traverse(fn){fn(this);for(const child of this.children)child.traverse?.(fn)}
}
class Mesh extends Obj{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class Geometry{dispose(){}}
class Material{constructor(){this.color={set(){}}}dispose(){}}
class GridHelper extends Obj{constructor(){super();this.material=new Material()}}
const THREE={Group:Obj,Object3D:Obj,Mesh,GridHelper,Vector3:V3,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 BoxGeometry:Geometry,ConeGeometry:Geometry,RingGeometry:Geometry,
 CylinderGeometry:Geometry,DodecahedronGeometry:Geometry,
 OctahedronGeometry:Geometry,PlaneGeometry:Geometry,DoubleSide:2};
test('runtime city builds on top of real ground, can expand, and pathfind through streets',()=>{
 const scene=new Obj(),ground=(x,z)=>new V3(x,0,z);
 const city=createGaiaCityBuilder({THREE,scene,center:new V3(0,0,0),getGround:ground});
 assert.equal(city.buildableCount,4096);assert.equal(city.cityY,.045);
 assert.ok(scene.children.includes(city.group));
 assert.ok(city.group.children.some(item=>item instanceof GridHelper));
 assert.ok(city.group.children.length>35);
 const n=scene.children.length;
 const expanded=city.click('expansion',{x:4.7,z:0});
 assert.equal(expanded.ok,true,expanded.message);
 assert.equal(city.buildableCount,4352);
 assert.equal(city.click('house',{x:5.3,z:.6}).ok,true);
 assert.equal(city.click('expansion',{x:4.7,z:0}).ok,false);
 const start=city.worldPoint(30,31),end=city.worldPoint(34,31);
 const route=city.findPath(new V3(start.x,city.cityY,start.z),
  new V3(end.x,city.cityY,end.z));
 assert.ok(Array.isArray(route)&&route.length,'roads remain navigable');
 city.dispose();assert.equal(scene.children.length,n-1);
});
test('external forest and mine sites remain on Gaia and accept construction',()=>{
 const scene=new Obj(),ground=(x,z)=>new V3(x,4+Math.sin(x)*.02,z);
 const city=createGaiaCityBuilder({THREE,scene,center:new V3(0,4,0),getGround:ground});
 assert.ok(city.siteList.some(s=>s.type==='lumber'));
 assert.ok(city.siteList.some(s=>s.type==='mine'));
 const node=city.siteList.find(s=>!s.built);
 assert.ok(node);
 const placed=city.click(node.type,{x:node.x,z:node.z});
 assert.equal(placed.ok,true,placed.message);
 assert.equal(node.built,true);
 assert.equal(city.click(node.type,{x:node.x+100,z:node.z+100}).ok,false);
 city.dispose();
});
