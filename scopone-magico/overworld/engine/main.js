import {World} from './world.js';
import {AssetLibrary} from './assets.js';
import {IsoRenderer} from './renderer.js';
import {TouchControls} from './controls.js';
import {findPath} from './pathfinding.js';
import {screenDirectionToWorld,normalize,clamp} from './geometry.js';
import {STORAGE_V1,STORAGE_V2,restoreState,encodeState,cityOnTile} from './scene-state.js';

const $=id=>document.getElementById(id);
const canvas=$('world-canvas'),status=$('status'),loading=$('loading');
const debug=new URL(location.href).searchParams.has('debug');
let worlds,world,assets,renderer,controls,state;
const lifecycle={active:true,fade:false,lastZone:null,path:[],destination:null,lastSave:0,lastFrame:0,raf:0};
const player={x:0,y:0,facing:'SE',assetId:'player',animation:'idle',animationTime:0,renderWidth:48,renderHeight:48,speed:4.1,height:0};
const hooks=new Map();
function emit(name,detail){
 for(const fn of hooks.get(name)||[])try{fn(detail);}catch(e){console.error('Overworld listener error',e);}
 document.dispatchEvent(new CustomEvent('scopone:overworld:'+name,{detail}));
}
function subscribe(name,fn){
 if(!hooks.has(name))hooks.set(name,new Set());
 hooks.get(name).add(fn);return()=>hooks.get(name).delete(fn);
}
function readSave(key){
 try{return JSON.parse(localStorage.getItem(key)||'null');}
 catch(e){console.warn('Invalid overworld save',e);return null;}
}
function cityById(id){return worlds.outside.manifest.cities?.find(c=>c.id===id)||null;}
function syncPosition(){
 if(!state||!renderer)return;
 const slot=state.scene==='outside'?'outside':'inside';
 state[slot]={x:player.x,y:player.y,zoom:renderer.camera.zoom};
}
function save(){
 if(!state)return;
 syncPosition();
 try{localStorage.setItem(STORAGE_V2,JSON.stringify(encodeState(state)));}
 catch(e){console.warn('Unable to save overworld',e);}
}
function applyScene(){
 world=worlds[state.scene];
 renderer.world=world;
 renderer.resize();
 const slot=state.scene==='outside'?'outside':'inside';
 const view=world.manifest.view||{};
 const p=state[slot];player.x=p.x;player.y=p.y;
 const size=view.playerSize||[110,110];
 player.renderWidth=size[0];player.renderHeight=size[1];
 player.speed=world.manifest.walkSpeedTilesPerSec||3.1;
 renderer.setZoom(p.zoom??view.zoom??1);
 renderer.camera.x=player.x;renderer.camera.y=player.y;
 renderer.exitMarker=state.scene==='city'?cityById(state.cityId)?.exitInside&&{
   x:cityById(state.cityId).exitInside[0],y:cityById(state.cityId).exitInside[1]
 }:null;
 lifecycle.path=[];lifecycle.destination=null;lifecycle.lastZone=null;
 player.animation='idle';player.animationTime=0;
 world.prefetchNear(player.x,player.y,2);
 $('overworld').classList.toggle('city-scene',state.scene==='city');
 $('leave-city').hidden=state.scene!=='city';
}
function updateHud(){
 if(state.scene==='outside'){
  $('zone-name').textContent='Campania';
  document.querySelector('.mode-tag').textContent='ESTERNO';
  status.textContent='Esplora il golfo e raggiungi una città';
 }else{
  $('zone-name').textContent=cityById(state.cityId)?.name||'Città';
  document.querySelector('.mode-tag').textContent='CITTÀ';
  status.textContent='Città vuota · raggiungi USCITA o usa il pulsante';
 }
}
async function transition(next){
 if(lifecycle.fade)return false;
 lifecycle.fade=true;
 const veil=$('transition-veil');veil.classList.add('active');
 await new Promise(r=>setTimeout(r,200));
 try{
  next();applyScene();updateHud();save();
  emit('scenechange',{scene:state.scene,cityId:state.cityId,position:position()});
 }finally{
  veil.classList.remove('active');
  await new Promise(r=>setTimeout(r,200));lifecycle.fade=false;
 }
 return true;
}
function enterCity(id){
 if(state.scene!=='outside'||!cityById(id)||lifecycle.fade)return Promise.resolve(false);
 return transition(()=>{
  syncPosition();
  const city=cityById(id);
  worlds.city=worlds.cityMaps.get(city.map);
  const entry=worlds.city.entrance(city.entry.zone,city.entry.entrance);
  state.cityId=id;state.scene='city';
  state.inside={x:entry.x,y:entry.y,zoom:worlds.city.manifest.view?.zoom??1.08};
  emit('cityenter',{id,name:city.name});
 });
}
function leaveCity(){
 if(state.scene!=='city'||lifecycle.fade)return Promise.resolve(false);
 return transition(()=>{
  syncPosition();const city=cityById(state.cityId);
  const previous=state.cityId;
  state.outside.x=city.returnOutside[0];state.outside.y=city.returnOutside[1];
  state.scene='outside';state.cityId=null;
  emit('cityexit',{id:previous});
 });
}
// Legacy portal API remains available for the original A/B/C/D city grid.
async function travelPortal(zoneId,entranceId='start'){
 if(state.scene!=='city'||lifecycle.fade)return false;
 const target=world.entrance(zoneId,entranceId);
 if(!world.canStand(target.x,target.y))return false;
 return transition(()=>{
  player.x=target.x;player.y=target.y;
  state.inside.x=target.x;state.inside.y=target.y;
  emit('portal',{zoneId,entranceId,position:{x:player.x,y:player.y}});
 });
}
function facingFromScreen(dx,dy){
 const angle=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
 return ['E','SE','S','SW','W','NW','N','NE'][Math.round(angle/45)%8];
}
function tryMove(dx,dy){
 const x=player.x,y=player.y;
 if(world.canStand(x+dx,y+dy)){player.x+=dx;player.y+=dy;return true;}
 let changed=false;
 if(world.canStand(x+dx,y)){player.x+=dx;changed=true;}
 if(world.canStand(player.x,y+dy)){player.y+=dy;changed=true;}
 return changed;
}
function enterZone(){
 const here=world.globalPositionToZone(player.x,player.y);if(!here)return;
 if(here.zone!==lifecycle.lastZone){
  const previous=lifecycle.lastZone;lifecycle.lastZone=here.zone;
  emit('zonechange',{from:previous,to:here.zone,scene:state.scene,position:{x:player.x,y:player.y}});
 }
}
function update(dt){
 if(lifecycle.fade)return;
 const previousFacing=player.facing;
 let motion=controls.getVector(),move;
 if(motion.x||motion.y){
  lifecycle.path=[];lifecycle.destination=null;
  move=screenDirectionToWorld(motion.x,motion.y,world.manifest.allowDiagonal!==false);
  player.facing=facingFromScreen(motion.x,motion.y);
 }else if(lifecycle.path.length){
  const next=lifecycle.path[0],dx=next.x-player.x,dy=next.y-player.y,dist=Math.hypot(dx,dy);
  if(dist<.06){lifecycle.path.shift();if(!lifecycle.path.length)lifecycle.destination=null;}
  else{
   move=normalize(dx,dy);
   const screenDx=(move.x-move.y)*26,screenDy=(move.x+move.y)*15;
   player.facing=facingFromScreen(screenDx,screenDy);
   if(dist<player.speed*dt)dt=dist/player.speed;
  }
 }
 const previousAnimation=player.animation;
 if(move){
  const moved=tryMove(move.x*player.speed*dt,move.y*player.speed*dt);
  player.animation=moved?'walk':'idle';
  if(!moved){lifecycle.path=[];lifecycle.destination=null;}
 }else player.animation='idle';
 player.animationTime=(previousAnimation===player.animation&&previousFacing===player.facing)?player.animationTime+dt:0;
 world.prefetchNear(player.x,player.y,1);enterZone();
 if(state.scene==='outside'){
  const city=cityOnTile(world.manifest,player.x,player.y);
  if(city){void enterCity(city.id);return;}
 }else{
  const city=cityById(state.cityId);
  if(city&&Math.hypot(player.x-city.exitInside[0],player.y-city.exitInside[1])<.43){
   void leaveCity();return;
  }
  const portal=world.getPortalAt(player.x,player.y);
  if(portal?.active){void travelPortal(portal.toZone,portal.entrance);return;}
 }
 lifecycle.lastSave+=dt;
 if(lifecycle.lastSave>1.2){save();lifecycle.lastSave=0;}
 if(debug){$('debug-data').textContent=state.scene+' · '+player.x.toFixed(2)+', '+player.y.toFixed(2)+' · '+world.globalPositionToZone(player.x,player.y)?.zone+' · chunk '+world.preloaded.size;}
}
function tick(t){
 if(!lifecycle.active)return;
 const dt=clamp(lifecycle.lastFrame?(t-lifecycle.lastFrame)/1000:1/60,0,.05);
 lifecycle.lastFrame=t;
 update(dt);renderer.follow(player,dt);renderer.elapsed=t/1000;
 const key=[world.manifest.id,player.x.toFixed(3),player.y.toFixed(3),player.facing,
   player.animation,renderer.camera.x.toFixed(3),renderer.camera.y.toFixed(3),renderer.camera.zoom.toFixed(3),
   lifecycle.destination?.x,lifecycle.destination?.y,renderer.debug].join(':');
 if(key!==lifecycle.lastDrawKey||player.animation==='walk'||renderer.debug){
  renderer.draw(player,[],lifecycle.destination,dt);lifecycle.lastDrawKey=key;
 }
 lifecycle.raf=requestAnimationFrame(tick);
}
function canvasTap(e){
 if(lifecycle.fade||e.pointerType==='touch'&&e.isPrimary===false)return;
 const rect=canvas.getBoundingClientRect();
 const tile=renderer.screenTile(e.clientX-rect.left,e.clientY-rect.top);
 if(world.isBlocked(tile.x,tile.y)){status.textContent='Terreno non percorribile';return;}
 const path=findPath(world,player,tile,{diagonal:world.manifest.allowDiagonal!==false});
 if(!path.length){status.textContent='Nessun percorso disponibile';return;}
 lifecycle.path=path;lifecycle.destination={x:tile.x+.5,y:tile.y+.5};
}
function setupInputs(){
 controls=new TouchControls($('joystick'));
 canvas.addEventListener('pointerup',canvasTap);
 $('zoom-in').addEventListener('click',()=>{renderer.setZoom(renderer.camera.zoom+.15);save();});
 $('zoom-out').addEventListener('click',()=>{renderer.setZoom(renderer.camera.zoom-.15);save();});
 $('exit').addEventListener('click',exit);
 $('leave-city').addEventListener('click',()=>{void leaveCity();});
 $('debug-toggle').addEventListener('click',()=>{renderer.debug=!renderer.debug;$('debug-data').hidden=!renderer.debug;});
 $('portal-test').addEventListener('click',()=>{if(state.scene==='city')void travelPortal('D','start');});
 window.addEventListener('resize',()=>renderer.resize());
 if('ResizeObserver' in window)new ResizeObserver(()=>renderer.resize()).observe(canvas);
 window.addEventListener('pagehide',save);
 window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();if(state.scene==='city')void leaveCity();else exit();}});
 const pointers=new Map();let previousDistance=0;
 canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1)previousDistance=0;});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);
   if(previousDistance>0)renderer.setZoom(renderer.camera.zoom*dist/previousDistance);
   previousDistance=dist;
  }
 });
 const clear=e=>{pointers.delete(e.pointerId);if(pointers.size<2)previousDistance=0;};
 canvas.addEventListener('pointerup',clear);canvas.addEventListener('pointercancel',clear);
}
function exit(){
 save();lifecycle.active=false;cancelAnimationFrame(lifecycle.raf);controls?.dispose();
 if(window.parent!==window)window.parent.postMessage({type:'scopone-overworld-exit'},location.origin);
 else location.href='../index.html';
}
function position(){return {scene:state?.scene||null,cityId:state?.cityId||null,x:player.x,y:player.y,zone:world?.globalPositionToZone(player.x,player.y)?.zone||null};}
async function start(){
 try{
  const externalBase=new URL('../maps/external/',import.meta.url);
  const [outside,library]=await Promise.all([World.load(externalBase),AssetLibrary.load()]);
  const cities=outside.manifest.cities||[];
  if(!cities.length)throw Error('No cities configured');
  const cityMaps=new Map();
  await Promise.all([...new Set(cities.map(c=>c.map))].map(async mapRef=>{
    const url=new URL(mapRef,externalBase);
    const folder=new URL('.',url),name=decodeURIComponent(url.pathname.split('/').at(-1));
    cityMaps.set(mapRef,await World.load(folder,name));
  }));
  const saved=readSave(STORAGE_V2);
  const requested=cities.find(c=>c.id===saved?.cityId)||cities[0];
  const city=cityMaps.get(requested.map);
  worlds={outside,city,cityMaps};assets=library;
  state=restoreState(saved,readSave(STORAGE_V1),outside,city);
  renderer=new IsoRenderer(canvas,worlds[state.scene],assets);
  applyScene();enterZone();updateHud();setupInputs();
  if(debug){$('debug-controls').hidden=false;$('debug-data').hidden=false;}
  loading.hidden=true;canvas.setAttribute('aria-busy','false');
  lifecycle.raf=requestAnimationFrame(tick);
  emit('ready',{world:world.manifest.id,scene:state.scene,cityId:state.cityId,position:position()});
 }catch(e){console.error(e);loading.textContent='Impossibile caricare la mappa: '+e.message;loading.classList.add('error');}
}
window.ScoponeOverworld={
 on:subscribe,position,portal:travelPortal,enterCity,leaveCity,
 launchScopone:details=>{const payload={position:position(),...details};emit('challenge-request',payload);if(window.parent!==window)window.parent.postMessage({type:'scopone-overworld-challenge',payload},location.origin);},
 reward:details=>emit('reward',details),save:()=>state&&save(),
 debug:()=>debug?{worlds,world,player,renderer,lifecycle,state,findPath,tryMove}:null
};
start();
