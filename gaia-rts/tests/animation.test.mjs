import test from 'node:test';
import assert from 'node:assert/strict';
import {deformFF9Vertex,lowerFF9Arms,createFF9Animator,prepareFF9Animations} from '../procedural-animator.js';

const m={minY:0,h:500,width:300,midX:0,midZ:0};
test('left and right walk poses swing feet in opposing directions',()=>{
 const p={x:80,y:20,z:0};
 const a=deformFF9Vertex(p,m,'step-left'),b=deformFF9Vertex(p,m,'step-right');
 assert.ok(a.z*b.z<0);assert.ok(Math.abs(a.z)>20);
});
test('walk keeps head fixed, attack and hurt deform the upper body',()=>{
 const head={x:0,y:480,z:0},arm={x:122,y:360,z:0};
 assert.deepEqual(deformFF9Vertex(head,m,'step-left'),head);
 assert.notDeepEqual(deformFF9Vertex(arm,m,'attack'),arm);
 assert.notDeepEqual(deformFF9Vertex(head,m,'hit'),head);
});
test('pose coordinates stay finite for arbitrary FF9 mesh vertices',()=>{
 for(let i=0;i<500;i++){
  const p={x:(i%13-6)*22,y:i%501,z:(i%7-3)*31};
  for(const pose of ['step-left','step-right','attack','hit']){
   for(const v of Object.values(deformFF9Vertex(p,m,pose)))assert.ok(Number.isFinite(v));
  }
 }
});
function makeModel(){
 const mesh={isMesh:true,morphTargetInfluences:[0,0,0,0],geometry:{morphAttributes:{position:[{name:'gaia-step-left'}]}}};
 return {mesh,model:{position:{y:1.2},rotation:{z:0},traverse:f=>f(mesh)}};
}
test('walk, swing, hurt and fall drive independent per-unit morph weights',()=>{
 const {mesh,model}=makeModel(),animator=createFF9Animator(model,[],{},3);
 assert.equal(animator.mode,'morph');
 for(let i=0;i<17;i++)animator.update(.016,true);
 assert.ok(mesh.morphTargetInfluences[0]>0||mesh.morphTargetInfluences[1]>0);
 assert.equal(model.position.y,1.2,'walking never bounces the full character');
 animator.attack();animator.update(.12,false);assert.ok(mesh.morphTargetInfluences[2]>.05);
 animator.hit();animator.update(.10,false);assert.ok(mesh.morphTargetInfluences[3]>.05);
 animator.die();for(let i=0;i<90;i++)animator.update(.016,false);
 assert.equal(animator.finished,true);
 assert.ok(Math.abs(model.rotation.z)>1);
});
test('a native walk clip takes precedence over the generated walk poses',()=>{
 const {mesh,model}=makeModel();
 const action={reset(){return this},fadeIn(){return this},fadeOut(){return this},play(){return this},setLoop(){return this}};
 class AnimationMixer{clipAction(){return action}update(){}}
 const animator=createFF9Animator(model,[{name:'Walk_01'}],{AnimationMixer,LoopOnce:2200});
 for(let i=0;i<10;i++)animator.update(.016,true);
 assert.equal(mesh.morphTargetInfluences[0],0);
 assert.equal(mesh.morphTargetInfluences[1],0);
});
class Matrix {clone(){return new Matrix()}invert(){return this}multiply(){return this}}
class Vec{
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 fromBufferAttribute(a,i){return this.set(a.array[3*i],a.array[3*i+1],a.array[3*i+2])}
 applyMatrix4(){return this}
 clone(){return new Vec(this.x,this.y,this.z)}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
}
class Bounds{
 setFromObject(){this.min=new Vec(-150,0,-25);this.max=new Vec(150,500,25);return this}
 getSize(out){return out.set(300,500,50)}
 getCenter(out){return out.set(0,250,0)}
}
class Attribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;this.name=''}
 setXYZ(i,x,y,z){this.array[i*3]=x;this.array[i*3+1]=y;this.array[i*3+2]=z}
}
class Geometry{
 constructor(){this.attr=new Attribute(new Float32Array([-80,0,0,80,0,0,120,300,0,0,480,0]),3);this.morphAttributes={}}
 getAttribute(name){return name==='position'?this.attr:null}
 clone(){const geo=new Geometry();geo.attr=new Attribute(this.attr.array.slice(),3);return geo}
 computeVertexNormals(){this.normalsUpdated=true}
}
test('preparation never edits original geometry or materials, and only runs once',()=>{
 const material={name:'FF9_Textured'},source=new Geometry();
 const mesh={isMesh:true,isSkinnedMesh:false,geometry:source,material,matrixWorld:new Matrix(),
  updateMorphTargets(){this.morphTargetInfluences=new Array(this.geometry.morphAttributes.position.length).fill(0)}};
 const scene={userData:{},matrixWorld:new Matrix(),updateMatrixWorld(){},traverse:f=>f(mesh)};
 const gltf={scene,animations:[]},mock={Box3:Bounds,Vector3:Vec,Float32BufferAttribute:Attribute};
 prepareFF9Animations(gltf,mock,'Zidane');
 assert.equal(mesh.material,material);
 assert.equal(source.morphAttributes.position,undefined);
 assert.deepEqual([...source.getAttribute('position').array].slice(0,3),[-80,0,0]);
 assert.equal(gltf.userData.gaiaArmsLowered,true);
 assert.equal(mesh.geometry.normalsUpdated,true);
 assert.equal(mesh.geometry.morphTargetsRelative,true);
 assert.equal(mesh.geometry.morphAttributes.position.length,4);
 assert.deepEqual(mesh.geometry.morphAttributes.position.map(x=>x.name),
  ['gaia-step-left','gaia-step-right','gaia-attack','gaia-hit']);
 assert.deepEqual(mesh.morphTargetInfluences,[0,0,0,0]);
 prepareFF9Animations(gltf,mock,'Zidane');
 assert.equal(gltf.userData.gaiaMorphMeshes,1);
});

test('rest pose folds outstretched arms beside the hips while leaving head and legs intact',()=>{
 const metrics={...m,armFoldAngles:[.75,.75],foldArms:true};
 const rightHand={x:145,y:210,z:2},leftHand={x:-145,y:210,z:2};
 const right=lowerFF9Arms(rightHand,metrics),left=lowerFF9Arms(leftHand,metrics);
 assert.ok(Math.abs(right.x)<100,'right hand comes inward');
 assert.ok(Math.abs(left.x)<100,'left hand comes inward');
 assert.ok(right.y<rightHand.y-35,'right hand drops toward hip');
 assert.ok(left.y<leftHand.y-35,'left hand drops toward hip');
 for(const still of [{x:0,y:260,z:3},{x:25,y:485,z:4},{x:20,y:40,z:-3}]){
  assert.deepEqual(lowerFF9Arms(still,metrics),still,'torso, head and legs stay stable');
 }
});
test('arm rest pose is symmetrical and winged Chocobo keeps its wings',()=>{
 const metrics={...m,armFoldAngles:[.65,.65],foldArms:true};
 const a=lowerFF9Arms({x:135,y:225,z:5},metrics);
 const b=lowerFF9Arms({x:-135,y:225,z:5},metrics);
 assert.ok(Math.abs(a.x+b.x)<1e-5);
 assert.ok(Math.abs(a.y-b.y)<1e-5);
 assert.deepEqual(lowerFF9Arms({x:135,y:225,z:5},{...metrics,foldArms:false}),{x:135,y:225,z:5});
});
