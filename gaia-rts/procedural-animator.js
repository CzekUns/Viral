/* Gaia RTS — non-destructive procedural posing for static FF9 GLB meshes.
 * Original geometry, UVs, textures and scene graph are preserved. Native
 * animation clips take precedence if later imported from the FF9 PC game.
 * Morph targets are built once per asset and shared by unit clones, with
 * independent per-unit influences updated on the GPU.
 */
const POSES=['step-left','step-right','attack','hit'];
const clamp01=value=>Math.max(0,Math.min(1,value));
const ease=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t)};
// Original converted FF9 figures face local +Z. Point that axis toward actual velocity.
export function headingForMotion(dx,dz){return Math.atan2(dx,dz)}
// Advance the walking cycle only when feet travel over the terrain.
// One full two-step stride is approximately 0.92 character heights.
export function gaitPhaseDelta(travelDistance,unitHeight=.65){
 return Math.max(0,travelDistance)*(2*Math.PI)/Math.max(.05,unitHeight*.92);
}

// Neutral pose correction for unrigged FF9 humanoids. The static DAE/GLB models
// were exported with arms spread outward; changing walk poses alone does not
// change this T/A-pose when standing still.
export function lowerFF9Arms(position,metrics){
 const {x,y,z}=position;
 if(metrics.foldArms===false)return {x,y,z};
 const {minY,h,width,midX}=metrics;
 const half=Math.max(width*.5,.001),rel=x-midX;
 const side=rel<0?-1:1,nx=Math.abs(rel)/half;
 const ny=clamp01((y-minY)/Math.max(h,.001));
 // Arm silhouette is separated from head, chest centre, pelvis and legs.
 const armRegion=ease(.15,.27,ny)*(1-ease(.71,.82,ny))*ease(.26,.48,nx);
 if(armRegion<1e-5)return {x,y,z};
 const shoulderX=midX+side*width*.17;
 const shoulderY=minY+h*.67;
 const theta=(metrics.armFoldAngles?.[side<0?0:1]??.78)*(-side);
 const dx=x-shoulderX,dy=y-shoulderY;
 const c=Math.cos(theta),sn=Math.sin(theta);
 const rotatedX=shoulderX+c*dx-sn*dy;
 const rotatedY=shoulderY+sn*dx+c*dy;
 return {x:x+(rotatedX-x)*armRegion,y:y+(rotatedY-y)*armRegion,z};
}

// Estimate arm slope separately on each side. This is an asymmetry-safe,
// size-independent calculation from the real original GLB vertices.
function estimateArmAngles(root,inverseRoot,metrics,THREE){
 const ySamples=[[],[]],v=new THREE.Vector3();
 const half=Math.max(metrics.width*.5,.001);
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry)return;
  const pos=mesh.geometry.getAttribute('position');
  if(!pos)return;
  const toBody=inverseRoot.clone().multiply(mesh.matrixWorld);
  for(let i=0;i<pos.count;i++){
   v.fromBufferAttribute(pos,i).applyMatrix4(toBody);
   const nx=(v.x-metrics.midX)/half;
   const ny=(v.y-metrics.minY)/metrics.h;
   if(Math.abs(nx)>.8&&ny>.16&&ny<.78){
    ySamples[nx<0?0:1].push(ny);
   }
  }
 });
 return ySamples.map(values=>{
  values.sort((a,b)=>a-b);
  const median=values.length>=10?values[Math.floor(values.length/2)]:.4;
  const reach=half*.85-metrics.width*.17;
  const angle=Math.atan2(reach,Math.max(metrics.h*.13,(.67-median)*metrics.h))+.12;
  return Math.max(.35,Math.min(1,angle));
 });
}

export function deformFF9Vertex(position,metrics,pose,vertexRig=null){
 let {x,y,z}=position;
 const {h,width,minY,midX,midZ}=metrics;
 const ny=clamp01((y-minY)/Math.max(h,.001));
 const nx=(x-midX)/Math.max(width*.5,.001);
 const side=Math.max(-1,Math.min(1,nx*4.5));
 const hip=minY+h*.43,shoulder=minY+h*.67;
 const legMask=1-ease(.35,.48,ny);
 // After the neutral T-pose correction arms move inward, so their mask
 // MUST come from their original exported vertex positions before folding.
 const armMask=vertexRig?.armMask??(
  ease(.19,.32,ny)*(1-ease(.77,.89,ny))*ease(.14,.38,Math.abs(nx)));
 const armSide=vertexRig?.armSide??side;
 const turn=(py,pz,pivotY,pivotZ,angle,weight)=>{
  if(Math.abs(angle*weight)<1e-8)return [py,pz];
  const c=Math.cos(angle),s=Math.sin(angle),dy=py-pivotY,dz=pz-pivotZ;
  const ry=pivotY+c*dy-s*dz,rz=pivotZ+s*dy+c*dz;
  return [py+(ry-py)*weight,pz+(rz-pz)*weight];
 };
 if(pose==='step-left'||pose==='step-right'){
  const phase=(pose==='step-left'?1:-1);
  const gait=phase*side;
  // Feet swing front-to-back; opposite arms swing with stronger amplitude.
  let turned=turn(y,z,hip,midZ,gait*.56,legMask);y=turned[0];z=turned[1];
  const knee=minY+h*.22;
  turned=turn(y,z,knee,midZ,-gait*.23,legMask*(1-ease(.19,.32,ny)));y=turned[0];z=turned[1];
  const armGait=phase*armSide;
  turned=turn(y,z,shoulder,midZ,-armGait*.82,armMask);y=turned[0];z=turned[1];
  // Bend elbows slightly so arms don't resemble rigid windmill blades.
  const forearm=armMask*(1-ease(.36,.52,ny));
  turned=turn(y,z,minY+h*.43,midZ,armGait*.16,forearm);
  y=turned[0];z=turned[1];
 }else if(pose==='attack'){
  const upper=ease(.43,.73,ny);
  const turned=turn(y,z,shoulder,midZ,-.55,armMask);y=turned[0];z=turned[1];
  z-=h*.075*upper*(.68+.32*Math.max(0,side));x+=h*.022*upper;
 }else if(pose==='hit'){
  const upper=ease(.35,.78,ny);
  const turned=turn(y,z,hip,midZ,.22,upper);y=turned[0];z=turned[1];
  z+=h*.02*upper;
 }
 return {x,y,z};
}
export function prepareFF9Animations(gltf,THREE,label=''){
 if(!gltf?.scene||gltf.scene.userData.gaiaRigReady)return gltf;
 let root=gltf.scene;root.updateMatrixWorld(true);
 let bounds=new THREE.Box3().setFromObject(root);
 let ext=bounds.getSize(new THREE.Vector3());
 // Correct the unusual Z-up pose encountered in some COLLADA assets.
 if(ext.z>ext.y*1.8&&ext.z>ext.x*1.15){
  const wrapper=new THREE.Group();
  wrapper.name='Gaia_OrientationCorrection';
  root.rotation.x-=Math.PI/2;wrapper.add(root);gltf.scene=wrapper;root=wrapper;
  root.updateMatrixWorld(true);
  bounds=new THREE.Box3().setFromObject(root);ext=bounds.getSize(new THREE.Vector3());
  gltf.userData={...(gltf.userData||{}),correctedOrientation:true};
 }
 if(!Number.isFinite(ext.y)||ext.y<=1e-6)return gltf;
 const center=bounds.getCenter(new THREE.Vector3());
 const metrics={minY:bounds.min.y,h:ext.y,width:ext.x,midX:center.x,midZ:center.z};
 const inverseRoot=root.matrixWorld.clone().invert();
 const nativeClips=gltf.animations||[];
 const hasNativeWalk=nativeClips.some(clip=>/walk|run/i.test(clip.name));
 const displayName=(gltf.userData?.gaiaDisplayName||label||'').toLowerCase();
 // Chocobos have wings, not human arms: do not fold them against their torso.
 metrics.foldArms=!/(chocobo|quadruped|bird|horse|mount)/i.test(displayName);
 if(metrics.foldArms&&!hasNativeWalk){
  metrics.armFoldAngles=estimateArmAngles(root,inverseRoot,metrics,THREE);
 }
 let morphMeshes=0;
 if(!hasNativeWalk)root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isSkinnedMesh)return;
  const source=mesh.geometry,attr=source?.getAttribute('position');
  if(!attr||attr.itemSize!==3||attr.count>150000)return;
  if(source.morphAttributes?.position?.length)return;
  const geometry=source.clone(),pos=geometry.getAttribute('position');
  const toBody=inverseRoot.clone().multiply(mesh.matrixWorld);
  const fromBody=toBody.clone().invert();
  const v=new THREE.Vector3(),dest=new THREE.Vector3();
  const morphData=POSES.map(()=>new Float32Array(pos.count*3));
  const neutralLocal=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){
   v.fromBufferAttribute(pos,i);
   const body=v.clone().applyMatrix4(toBody);
   // Bake lowered arms into the cloned neutral geometry, not into the
   // copyrighted source GLB geometry. This keeps arms down even in idle.
   const neutral=lowerFF9Arms(body,metrics);
   neutralLocal.set(neutral.x,neutral.y,neutral.z).applyMatrix4(fromBody);
   pos.setXYZ(i,neutralLocal.x,neutralLocal.y,neutralLocal.z);
   const nx=Math.abs((body.x-metrics.midX)/Math.max(metrics.width*.5,.001));
   const ny=clamp01((body.y-metrics.minY)/metrics.h);
   const armMask=metrics.foldArms?(
    ease(.16,.29,ny)*(1-ease(.69,.80,ny))*ease(.36,.58,nx)
   ):0;
   const vertexRig={armMask,armSide:body.x<metrics.midX?-1:1};
   for(let j=0;j<POSES.length;j++){
    const moved=deformFF9Vertex(neutral,metrics,POSES[j],vertexRig);
    dest.set(moved.x,moved.y,moved.z).applyMatrix4(fromBody).sub(neutralLocal);
    const at=i*3;morphData[j][at]=dest.x;morphData[j][at+1]=dest.y;morphData[j][at+2]=dest.z;
   }
  }
  pos.needsUpdate=true;
  geometry.computeVertexNormals();
  geometry.morphTargetsRelative=true;
  geometry.morphAttributes.position=morphData.map((data,j)=>{
   const buffer=new THREE.Float32BufferAttribute(data,3);
   buffer.name='gaia-'+POSES[j];return buffer;
  });
  mesh.geometry=geometry;mesh.updateMorphTargets();morphMeshes++;
 });
 root.userData.gaiaRigReady=true;
 gltf.userData={...(gltf.userData||{}),gaiaMorphMeshes:morphMeshes,
  gaiaRigModel:label,gaiaArmsLowered:metrics.foldArms&&!hasNativeWalk,
  gaiaArmFoldAngles:metrics.armFoldAngles||[]};
 return gltf;
}
export function createFF9Animator(model,nativeClips,THREE,seed=0,unitHeight=.65){
 const clips=nativeClips||[];
 const mixer=clips.length?new THREE.AnimationMixer(model):null;
 const first=patterns=>clips.find(clip=>patterns.some(pattern=>pattern.test(clip.name)));
 const clipMap={
  idle:first([/idle/i,/stand/i,/wait/i]),
  walk:first([/walk/i,/run/i]),
  attack:first([/attack/i,/strike/i,/swing/i]),
  hit:first([/hit/i,/damage/i,/hurt/i]),
  dead:first([/death/i,/dead/i,/fall/i])
 };
 const actions={};
 for(const [name,clip] of Object.entries(clipMap)){
  if(clip&&mixer)actions[name]=mixer.clipAction(clip);
 }
 let nativeState=null;
 const morphMeshes=[];
 model.traverse(o=>{
  if(o.isMesh&&o.morphTargetInfluences?.length>=POSES.length&&
     o.geometry.morphAttributes.position?.[0]?.name==='gaia-step-left')morphMeshes.push(o);
 });
 const baseY=model.position.y,baseZRotation=model.rotation.z;
 const state={
  seed,phase:seed*1.84,walkBlend:0,attackRemaining:0,hitRemaining:0,
  dying:false,deathElapsed:0,deadDirection:seed%2?-1:1,current:'idle'
 };
 function setNative(name){
  if(nativeState===name)return;
  const next=actions[name]||(name==='idle'?actions.idle:null);
  const old=nativeState&&actions[nativeState];
  if(old&&old!==next)old.fadeOut(.12);
  if(next&&old!==next){
   next.reset().fadeIn(.12).play();
   if(name==='attack'||name==='hit'||name==='dead'){
    next.setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;
   }
  }
  nativeState=name;
 }
 function update(dt,moving,travelDistance=0){
  const t=Math.max(0,Math.min(.06,dt));
  if(state.dying)state.deathElapsed+=t;
  else{
   state.attackRemaining=Math.max(0,state.attackRemaining-t);
   state.hitRemaining=Math.max(0,state.hitRemaining-t);
  }
  const desiredMove=moving&&!state.dying?1:0;
  state.walkBlend+=(desiredMove-state.walkBlend)*Math.min(1,t*10);
  if(state.walkBlend>.01&&moving&&travelDistance>0){
   state.phase+=gaitPhaseDelta(travelDistance,unitHeight);
   if(state.phase>Math.PI*1000)state.phase%=Math.PI*2;
  }
  const attack=state.attackRemaining>0?Math.sin((1-state.attackRemaining/.46)*Math.PI):0;
  const hit=state.hitRemaining>0?Math.sin((1-state.hitRemaining/.34)*Math.PI):0;
  const action=state.dying?'dead':state.hitRemaining>0?'hit':
      state.attackRemaining>0?'attack':moving?'walk':'idle';
  state.current=action;
  if(actions[action])setNative(action);
  else if(actions.idle&&action==='idle')setNative('idle');
  if(mixer)mixer.update(t);
  const wave=Math.sin(state.phase);
  const walk=state.walkBlend*(state.dying?0:1);
  const walkLeft=!actions.walk?walk*Math.max(0,wave):0;
  const walkRight=!actions.walk?walk*Math.max(0,-wave):0;
  for(const mesh of morphMeshes){
   const influences=mesh.morphTargetInfluences;
   influences[0]=walkLeft;influences[1]=walkRight;
   influences[2]=!actions.attack?attack:0;
   influences[3]=!actions.hit?hit:0;
  }
  if(state.dying){
   const pct=Math.min(1,state.deathElapsed/.7),easing=pct*pct*(3-2*pct);
   model.rotation.z=baseZRotation+state.deadDirection*easing*1.25;
   model.position.y=baseY-easing*.1;
  }else{
   model.rotation.z=baseZRotation+hit*.04;
   model.position.y=baseY;
  }
 }
 return {
  update,
  attack(){if(!state.dying){state.attackRemaining=.46;state.current='attack'}},
  hit(){if(!state.dying){state.hitRemaining=.34;state.current='hit'}},
  die(){if(!state.dying){state.dying=true;state.deathElapsed=0}},
  get finished(){return state.dying&&state.deathElapsed>=1.25},
  get state(){return state.current},
  get gaitPhase(){return state.phase},
  get mode(){return morphMeshes.length?'morph':actions.walk?'native':'static'},
  get morphMeshCount(){return morphMeshes.length}
 };
}
