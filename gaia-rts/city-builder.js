/* Gaia RTS · buildable settlements laid directly over the original 3D Gaia.
 * 64x64 buildable tiles, adjacent 16x16 expansions, city buildings and
 * designated off-city resource sites. World model/texture stays untouched.
 * Each district uses one transparent plane + one grid helper, not 4096 meshes.
 */
export const CITY_TILE=.12, BASE_TILES=64, EXPANSION_TILES=16;
export const CITY_BUILDINGS={
 house:{w:5,h:5,cost:20,name:'Casa'},
 barracks:{w:9,h:7,cost:100,name:'Caserma'},
 warehouse:{w:8,h:6,cost:40,name:'Magazzino'},
 expansion:{w:16,h:16,cost:120,name:'Espansione 16×16'},
 lumber:{cost:80,name:'Segheria'},
 mine:{cost:80,name:'Miniera'}
};
export const cityContains=(districts,x,z)=>districts.some(d=>x>=d.x&&x<d.x+d.w&&z>=d.z&&z<d.z+d.h);
const key=(x,z)=>x+':'+z;
export function canExpandCity(districts,x,z,size=EXPANSION_TILES){
 if(!Number.isInteger(x)||!Number.isInteger(z)||x%size||z%size)return false;
 const proposed={x,z,w:size,h:size};
 if(districts.some(d=>x<d.x+d.w&&x+size>d.x&&z<d.z+d.h&&z+size>d.z))return false;
 // Exactly one full/partial shared edge, never a diagonal-only corner touch.
 return districts.some(d=>(
  ((x===d.x+d.w||x+size===d.x)&&z<d.z+d.h&&z+size>d.z)||
  ((z===d.z+d.h||z+size===d.z)&&x<d.x+d.w&&x+size>d.x)
 ));
}
export function canBuildCity(districts,occupied,x,z,w,h){
 if(!Number.isInteger(x)||!Number.isInteger(z)||w<1||h<1)return false;
 for(let row=z;row<z+h;row++)for(let col=x;col<x+w;col++){
  if(!cityContains(districts,col,row)||occupied.has(key(col,row)))return false;
  // Main streets connect the centre to every edge of the initial district.
  if(col>=30&&col<=33&&row>=0&&row<64)return false;
  if(row>=30&&row<=33&&col>=0&&col<64)return false;
 }
 return true;
}
export const cellFromWorld=(x,z,origin,tile=CITY_TILE)=>({
 x:Math.floor((x-origin.x)/tile),
 z:Math.floor((z-origin.z)/tile)
});
export function createGaiaCityBuilder({THREE,scene,center,getGround,onChange=()=>{},saveKey='gaia-rts-city-lindblum-v1'}){
 const base={x:0,z:0,w:BASE_TILES,h:BASE_TILES};
 const half=BASE_TILES*CITY_TILE*.5;
 const origin={x:center.x-half,z:center.z-half};
 // A flat overlay on the REAL terrain. Sample its footprint and keep original
 // terrain geometry/textures untouched underneath the translucent plateau.
 const levels=[];
 for(let iz=0;iz<7;iz++)for(let ix=0;ix<7;ix++){
  const p=getGround(origin.x+(ix+.5)*BASE_TILES*CITY_TILE/7,
                    origin.z+(iz+.5)*BASE_TILES*CITY_TILE/7);
  if(p&&Number.isFinite(p.y))levels.push(p.y);
 }
 const cityY=(levels.length?Math.max(...levels):center.y)+.045;
 const group=new THREE.Group();group.name='Lindblum · buildable 64x64';scene.add(group);
 const mats={
  grass:new THREE.MeshStandardMaterial({color:'#7b9765',roughness:1,transparent:true,opacity:.59,depthWrite:false,side:THREE.DoubleSide}),
  expansion:new THREE.MeshStandardMaterial({color:'#c6ac6b',roughness:1,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}),
  edge:new THREE.MeshStandardMaterial({color:'#80745b',roughness:1}),
  road:new THREE.MeshStandardMaterial({color:'#b6a48a',roughness:1}),
  stone:new THREE.MeshStandardMaterial({color:'#d8c4a1',roughness:1}),
  wall:new THREE.MeshStandardMaterial({color:'#d1b78e',roughness:1}),
  wood:new THREE.MeshStandardMaterial({color:'#756044',roughness:1}),
  roof:new THREE.MeshStandardMaterial({color:'#a45b3d',roughness:1}),
  blue:new THREE.MeshStandardMaterial({color:'#547f9b',roughness:1}),
  door:new THREE.MeshStandardMaterial({color:'#4c4034',roughness:1}),
  tree:new THREE.MeshStandardMaterial({color:'#3d7450',roughness:1}),
  pine:new THREE.MeshStandardMaterial({color:'#275b42',roughness:1}),
  rock:new THREE.MeshStandardMaterial({color:'#6d7980',roughness:1}),
  gold:new THREE.MeshStandardMaterial({color:'#d9bc79',roughness:1})
 };
 const districts=[{...base}],occupied=new Map(),structures=[],siteMeshes=new Map(),siteList=[];
 const ghost=new THREE.Group();ghost.name='Prossima area edificabile 16×16';group.add(ghost);
 const costs=Object.fromEntries(Object.entries(CITY_BUILDINGS).map(([id,b])=>[id,b.cost]));
 let markers=new THREE.Group();group.add(markers);
 const box=(parent,w,h,d,material,x=0,y=0,z=0)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 const place=(g,x,z,y)=>{g.position.set(x,y,z);group.add(g);return g};
 function worldPoint(cx,cz){
  return {x:origin.x+(cx+.5)*CITY_TILE,z:origin.z+(cz+.5)*CITY_TILE};
 }
 function decoratedRoof(parent,w,d,h,material=mats.roof){
  const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.73,h,4),material);
  roof.rotation.y=Math.PI/4;roof.position.y=h*.5;parent.add(roof);
 }
 function buildingModel(type,w,h){
  const g=new THREE.Group(),ww=w*CITY_TILE*.88,dd=h*CITY_TILE*.88;
  const bodyHeight=type==='barracks'?.43:type==='warehouse'?.27:.25;
  const bodyMaterial=type==='warehouse'?mats.wood:mats.wall;
  box(g,ww,bodyHeight,dd,bodyMaterial,0,bodyHeight/2,0);
  const roofMaterial=type==='barracks'?mats.blue:mats.roof;
  const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(ww,dd)*.72,bodyHeight*.75,4),roofMaterial);
  roof.rotation.y=Math.PI/4;roof.position.y=bodyHeight+bodyHeight*.33;g.add(roof);
  box(g,ww*.2,bodyHeight*.55,.015,mats.door,0,bodyHeight*.275,dd*.507);
  for(const sx of [-1,1])box(g,.035,.06,.012,mats.blue,sx*ww*.32,bodyHeight*.65,dd*.511);
  if(type==='barracks'){
   for(const sx of [-1,1]){
    const tower=new THREE.Group();
    box(tower,.15,.47,.15,mats.stone,0,.235,0);
    decoratedRoof(tower,.20,.20,.16,mats.blue);
    tower.children[tower.children.length-1].position.y=.56;
    tower.position.set(sx*(ww*.52),0,-dd*.38);g.add(tower);
   }
  }
  if(type==='warehouse'){
   box(g,ww*.52,.12,.012,mats.door,0,.10,dd*.512);
   for(const sx of [-1,1])box(g,.07,.10,.12,mats.wood,sx*.18,.06,dd*.62);
  }
  return g;
 }
 function townCenter(){
  const g=new THREE.Group();
  const plaza=box(g,CITY_TILE*14,.012,CITY_TILE*12,mats.road,0,.006,0);
  const fountain=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.20,.22,.045,10),mats.stone);
  base.position.y=.03;fountain.add(base);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(.145,.14,.013,10),mats.blue);
  water.position.y=.058;fountain.add(water);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(.048,.21,6),mats.gold);
  spire.position.y=.17;fountain.add(spire);g.add(fountain);
  const p=worldPoint(29,29);place(g,p.x,cityY+.025,p.z);
 }
 function makePlot(d){
  const w=d.w*CITY_TILE,h=d.h*CITY_TILE;
  const centerX=origin.x+(d.x+d.w/2)*CITY_TILE;
  const centerZ=origin.z+(d.z+d.h/2)*CITY_TILE;
  const patch=new THREE.Mesh(new THREE.PlaneGeometry(w,h),d.x===0&&d.z===0?mats.grass:mats.expansion);
  patch.rotation.x=-Math.PI/2;patch.position.set(centerX,cityY,centerZ);
  patch.renderOrder=3;group.add(patch);
  const grid=new THREE.GridHelper(w,d.w,'#d9cba3','#b4bc94');
  grid.position.set(centerX,cityY+.007,centerZ);
  grid.material.transparent=true;grid.material.opacity=.43;grid.material.depthWrite=false;
  grid.renderOrder=4;group.add(grid);
  const short=.025;
  box(group,w,.027,short,mats.edge,centerX,cityY-.01,centerZ-h/2);
  box(group,w,.027,short,mats.edge,centerX,cityY-.01,centerZ+h/2);
  box(group,short,.027,h,mats.edge,centerX-w/2,cityY-.01,centerZ);
  box(group,short,.027,h,mats.edge,centerX+w/2,cityY-.01,centerZ);
 }
 function drawExpansionPreview(){
  // Show a real 16×16 next-step plot adjacent to Lindblum without purchasing it.
  for(const child of [...ghost.children]){
   ghost.remove(child);child.geometry?.dispose?.();child.material?.dispose?.();
  }
  const proposed=[
   {x:64,z:24},{x:64,z:40},{x:-16,z:24},
   {x:24,z:64},{x:24,z:-16},
   ...districts.slice(1).map(d=>({x:d.x+d.w,z:d.z}))
  ].find(({x,z})=>{
   if(!canExpandCity(districts,x,z))return false;
   const p=worldPoint(x+7,z+7);
   return !!getGround(p.x,p.z);
  });
  if(!proposed)return;
  const size=16*CITY_TILE;
  const cx=origin.x+(proposed.x+8)*CITY_TILE;
  const cz=origin.z+(proposed.z+8)*CITY_TILE;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(size,size),
   new THREE.MeshBasicMaterial({color:'#d9ad55',transparent:true,opacity:.20,
     depthWrite:false,side:THREE.DoubleSide}));
  plane.rotation.x=-Math.PI/2;plane.position.set(cx,cityY+.017,cz);
  ghost.add(plane);
  const pts=[
   new THREE.Vector3(cx-size/2,cityY+.025,cz-size/2),
   new THREE.Vector3(cx+size/2,cityY+.025,cz-size/2),
   new THREE.Vector3(cx+size/2,cityY+.025,cz+size/2),
   new THREE.Vector3(cx-size/2,cityY+.025,cz+size/2)
  ];
  const loop=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
   new THREE.LineDashedMaterial({color:'#ffe09b',dashSize:.13,gapSize:.08}));
  loop.computeLineDistances();ghost.add(loop);
 }
 function drawRoads(){
  const w=BASE_TILES*CITY_TILE,street=4*CITY_TILE;
  const x=origin.x+w/2,z=origin.z+w/2;
  box(group,street,.008,w,mats.road,x,cityY+.014,z).renderOrder=5;
  box(group,w,.008,street,mats.road,x,cityY+.014,z).renderOrder=5;
 }
 function drawFence(){
  const w=BASE_TILES*CITY_TILE,x=origin.x+w/2,z=origin.z+w/2,step=w/8;
  for(let i=0;i<=8;i++){
   for(const [xx,zz] of [[origin.x+i*step,origin.z],[origin.x+i*step,origin.z+w],
    [origin.x,origin.z+i*step],[origin.x+w,origin.z+i*step]]){
    box(group,.045,.22,.045,mats.wood,xx,cityY+.12,zz);
   }
  }
  for(const [px,pz,sx,sz] of [[x,origin.z,w,.024],[x,origin.z+w,w,.024],
   [origin.x,z,.024,w],[origin.x+w,z,.024,w]]){
   box(group,sx,.028,sz,mats.wood,px,cityY+.17,pz);
  }
 }
 function occupiedFootprint(x,z,w,h,id){
  for(let iz=z;iz<z+h;iz++)for(let ix=x;ix<x+w;ix++)occupied.set(key(ix,iz),id);
 }
 function addBuilding(type,x,z,skipChecks=false){
  const def=CITY_BUILDINGS[type];if(!def?.w||type==='expansion')return {ok:false,message:'Tipo non edificabile'};
  if(!skipChecks&&!canBuildCity(districts,occupied,x,z,def.w,def.h))return {ok:false,message:'Lotto occupato o non edificabile'};
  const site=worldPoint(x+(def.w-1)/2,z+(def.h-1)/2);
  const visual=buildingModel(type,def.w,def.h);
  place(visual,site.x,cityY+.019,site.z);
  occupiedFootprint(x,z,def.w,def.h,type);
  structures.push({type,x,z});
  return {ok:true,message:def.name+' costruito',cost:def.cost};
 }
 function tree(parent,x,z,scale=1){
  box(parent,.032*scale,.15*scale,.032*scale,mats.wood,x,.075*scale,z);
  const top=new THREE.Mesh(new THREE.ConeGeometry(.13*scale,.31*scale,5),mats.pine);
  top.position.set(x,.25*scale,z);parent.add(top);
 }
 function siteDecor(site){
  const g=new THREE.Group(),r=site.type==='lumber'?.32:.36;
  const ring=new THREE.Mesh(new THREE.RingGeometry(r-.025,r,36),
   new THREE.MeshBasicMaterial({color:site.type==='lumber'?'#85bf71':'#e3bd71',side:THREE.DoubleSide,transparent:true,opacity:.88}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.016;g.add(ring);
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.08),
   site.type==='lumber'?mats.tree:mats.gold);
  gem.position.y=.12;g.add(gem);
  if(site.type==='lumber'){
   for(const [a,b,sc] of [[-.24,-.22,.7],[.26,-.2,.85],[.20,.21,.8],[-.23,.24,.65]])tree(g,a,b,sc);
  }else{
   for(const [a,b] of [[-.23,-.15],[.23,-.12],[.09,.20]]){
    const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.11),mats.rock);
    stone.scale.set(1,.8,1.3);stone.position.set(a,.07,b);g.add(stone);
   }
  }
  const ground=getGround(site.x,site.z),y=(ground?.y??cityY)+.025;
  place(g,site.x,y,site.z);
  siteMeshes.set(site.id,{group:g,ring});
 }
 function resourceModel(type){
  const g=new THREE.Group();
  if(type==='lumber'){
   box(g,.45,.15,.30,mats.wood,0,.075,0);
   const roof=new THREE.Mesh(new THREE.ConeGeometry(.35,.16,4),mats.roof);
   roof.rotation.y=Math.PI/4;roof.position.y=.23;g.add(roof);
   for(let i=0;i<4;i++)box(g,.24,.035,.06,mats.wood,.42+i*.07,.05,(i%2)*.08);
  }else{
   box(g,.48,.35,.12,mats.rock,0,.175,-.15);
   box(g,.18,.22,.055,mats.door,0,.12,-.084);
   for(const side of [-1,1])box(g,.06,.34,.07,mats.wood,side*.12,.18,-.055);
   box(g,.38,.06,.08,mats.wood,0,.38,-.06);
  }
  return g;
 }
 function chooseSite(dx,dz,used){
  let winner=null,score=Infinity;
  for(let r=0;r<4;r++)for(let ai=0;ai<16;ai++){
   const ang=ai*Math.PI*2/16;
   const x=center.x+dx+Math.cos(ang)*r*.75,z=center.z+dz+Math.sin(ang)*r*.75;
   const p=getGround(x,z);
   if(!p||cityContains(districts,cellFromWorld(x,z,origin).x,cellFromWorld(x,z,origin).z))continue;
   if(used.some(u=>Math.hypot(u.x-x,u.z-z)<1.3))continue;
   const h=Math.hypot(x-(center.x+dx),z-(center.z+dz));
   const candidate=h+Math.abs(p.y-center.y)*.01;
   if(candidate<score){winner={x,z,y:p.y};score=candidate}
  }
  return winner;
 }
 const nodePlans=[
  {id:'forest-a',type:'lumber',dx:5.3,dz:-2.1},
  {id:'mine-a',type:'mine',dx:-5.4,dz:2.0},
  {id:'forest-b',type:'lumber',dx:5.2,dz:4.9},
  {id:'mine-b',type:'mine',dx:-5.4,dz:-5.1}
 ];
 for(const plan of nodePlans){
  const spot=chooseSite(plan.dx,plan.dz,siteList);
  if(spot)siteList.push({id:plan.id,type:plan.type,...spot,built:false});
 }
 for(const site of siteList)siteDecor(site);
 function placeResource(type,p){
  const site=siteList.filter(s=>s.type===type&&!s.built)
   .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(!site||Math.hypot(site.x-p.x,site.z-p.z)>.85)
   return {ok:false,message:'Tocca un giacimento segnalato, fuori dalla città'};
  site.built=true;
  const m=resourceModel(type),ground=getGround(site.x,site.z);
  place(m,site.x,(ground?.y??site.y)+.024,site.z);
  siteMeshes.get(site.id)?.group?.add(new THREE.Object3D());
  const icon=siteMeshes.get(site.id);
  if(icon){icon.ring.material.color.set('#f3e0af');icon.group.children[1].visible=false}
  return {ok:true,message:(type==='lumber'?'Segheria':'Miniera')+' attiva su Gaia',cost:costs[type]};
 }
 function save(){
  try{localStorage.setItem(saveKey,JSON.stringify({
   version:1,districts:districts.slice(1),buildings:structures.slice(),
   sites:siteList.filter(s=>s.built).map(s=>s.id)
  }))}catch(e){console.warn('Salvataggio città non disponibile:',e)}
 }
 function restore(){
  let data=null;
  try{data=JSON.parse(localStorage.getItem(saveKey)||'null')}catch(e){}
  if(data?.version===1&&Array.isArray(data.districts)){
   for(const ext of data.districts.slice(0,30)){
    const x=Number(ext?.x),z=Number(ext?.z);
    if(canExpandCity(districts,x,z)){
     const d={x,z,w:16,h:16};districts.push(d);makePlot(d);
    }
   }
  }
  const saved=Array.isArray(data?.buildings)?data.buildings:null;
  if(saved){
   for(const b of saved.slice(0,250)){
    const def=CITY_BUILDINGS[b?.type],x=Number(b?.x),z=Number(b?.z);
    if(def?.w&&canBuildCity(districts,occupied,x,z,def.w,def.h))addBuilding(b.type,x,z);
   }
  }else{
   for(const [type,x,z] of [
    ['house',8,9],['house',17,12],['house',40,9],['house',49,17],
    ['house',8,44],['house',18,45],['house',42,46],
    ['barracks',40,23],['warehouse',40,39],['warehouse',8,24]
   ])addBuilding(type,x,z);
  }
  if(Array.isArray(data?.sites)){
   for(const id of data.sites){const site=siteList.find(s=>s.id===id);if(site&&!site.built)placeResource(site.type,site)}
  }else{
   for(const id of ['forest-a','mine-a']){
    const site=siteList.find(s=>s.id===id);if(site)placeResource(site.type,site);
   }
  }
 }
 makePlot(base);drawRoads();drawFence();townCenter();restore();drawExpansionPreview();
 function groundAt(x,z){
  const c=cellFromWorld(x,z,origin);
  return cityContains(districts,c.x,c.z)?new THREE.Vector3(x,cityY+.03,z):null;
 }
 function planeHit(raycaster){
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-cityY);
  const hit=new THREE.Vector3();
  if(!raycaster.ray.intersectPlane(plane,hit))return null;
  return groundAt(hit.x,hit.z)?hit:null;
 }
 function siteTarget(type){
  const site=siteList.find(s=>s.type===type&&!s.built)||siteList.find(s=>s.type===type);
  return site?new THREE.Vector3(site.x,site.y+.04,site.z):null;
 }
 function click(type,p){
  if(type==='expansion'){
   const cell=cellFromWorld(p.x,p.z,origin);
   const x=Math.floor(cell.x/16)*16,z=Math.floor(cell.z/16)*16;
   if(!canExpandCity(districts,x,z))return {ok:false,message:'Seleziona un lotto 16×16 confinante con la città'};
   // Reject new platforms above sea or fully outside real terrain.
   const probe=[{x,z},{x:x+15,z},{x,z:z+15},{x:x+15,z:z+15}];
   const land=probe.filter(t=>{
    const wp=worldPoint(t.x,t.z);return !!getGround(wp.x,wp.z)
   });
   if(land.length<3)return {ok:false,message:'Questo lotto è sopra il mare o non ha terreno disponibile'};
   const d={x,z,w:16,h:16};districts.push(d);makePlot(d);drawExpansionPreview();save();onChange();
   return {ok:true,message:'Nuovo quartiere 16×16 aggiunto',cost:costs.expansion};
  }
  if(type==='lumber'||type==='mine'){
   const result=placeResource(type,p);
   if(result.ok){save();onChange()}return result;
  }
  const cell=cellFromWorld(p.x,p.z,origin);
  const def=CITY_BUILDINGS[type];
  if(!def?.w)return {ok:false,message:'Tipo non valido'};
  // Tap defines the building centre, so a house is never placed offscreen.
  const x=cell.x-Math.floor(def.w/2),z=cell.z-Math.floor(def.h/2);
  const result=addBuilding(type,x,z);
  if(result.ok){save();onChange()}
  return result;
 }
 function findPath(from,to){
  const a=cellFromWorld(from.x,from.z,origin),b=cellFromWorld(to.x,to.z,origin);
  if(!cityContains(districts,a.x,a.z)||!cityContains(districts,b.x,b.z))return null;
  const nearestFree=(p)=>{
   for(let radius=0;radius<=5;radius++)for(let dz=-radius;dz<=radius;dz++)
    for(let dx=-radius;dx<=radius;dx++){
     const x=p.x+dx,z=p.z+dz;
     if(cityContains(districts,x,z)&&!occupied.has(key(x,z)))return {x,z};
    }
   return null;
  };
  const start=nearestFree(a),goal=nearestFree(b);
  if(!start||!goal)return [];
  const goalKey=key(goal.x,goal.z),startKey=key(start.x,start.z);
  const pending=[{x:start.x,z:start.z,g:0,f:0}],dist=new Map([[startKey,0]]);
  const parents=new Map(),closed=new Set();
  let steps=0;
  while(pending.length&&steps++<12000){
   let bi=0;for(let i=1;i<pending.length;i++)if(pending[i].f<pending[bi].f)bi=i;
   const cur=pending.splice(bi,1)[0],id=key(cur.x,cur.z);
   if(closed.has(id))continue;closed.add(id);
   if(id===goalKey){
    const result=[];let k=id;
    while(k!==startKey&&parents.has(k)){
     const [x,z]=k.split(':').map(Number),wp=worldPoint(x,z);
     result.unshift(new THREE.Vector3(wp.x,cityY+.03,wp.z));
     k=parents.get(k);
    }
    // Limit waypoints to reduce per-frame overhead on mobile.
    return result.length?result:[new THREE.Vector3(to.x,cityY+.03,to.z)];
   }
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
    const x=cur.x+dx,z=cur.z+dz,nk=key(x,z);
    if(closed.has(nk)||!cityContains(districts,x,z)||occupied.has(nk))continue;
    if(dx&&dz&&(occupied.has(key(cur.x+dx,cur.z))||occupied.has(key(cur.x,cur.z+dz))))continue;
    const g=cur.g+Math.hypot(dx,dz);
    if(g>=(dist.get(nk)??Infinity))continue;
    dist.set(nk,g);parents.set(nk,id);
    pending.push({x,z,g,f:g+Math.hypot(x-goal.x,z-goal.z)});
   }
  }
  return [];
 }
 function dispose(){
  scene.remove(group);
  group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values(mats).includes(o.material))o.material.dispose()});
  Object.values(mats).forEach(m=>m.dispose());
 }
 return {
  group,origin,cityY,districts,siteList,costs,click,groundAt,planeHit,findPath,
  siteTarget,dispose,worldPoint,
  get buildableCount(){return districts.reduce((n,d)=>n+d.w*d.h,0)},
  get cityCenter(){return new THREE.Vector3(center.x,cityY+.04,center.z)},
  containsWorld(x,z){const c=cellFromWorld(x,z,origin);return cityContains(districts,c.x,c.z)}
 };
}
