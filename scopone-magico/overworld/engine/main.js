import {World} from './world.js';
import {AssetLibrary} from './assets.js';
import {IsoRenderer} from './renderer.js';
import {TouchControls} from './controls.js';
import {findPath} from './pathfinding.js';
import {screenDirectionToWorld,normalize,clamp} from './geometry.js';

const STORAGE='scopone-alchemico:overworld:v1';
const $=id=>document.getElementById(id);
const canvas=$('world-canvas'),status=$('status'),loading=$('loading');
const debug=new URL(location.href).searchParams.has('debug');
let world,assets,renderer,controls;
const lifecycle={active:true,fade:false,lastZone:null,path:[],destination:null,lastSave:0,lastFrame:0,raf:0};
const player={x:16.5,y:16.5,facing:'SE',assetId:'player',animation:'idle',renderWidth:43,renderHeight:100,speed:3.1,height:0};
const hooks=new Map();
function emit(name,detail){
 for(const fn of hooks.get(name)||[])try{fn(detail);}catch(e){console.error('Overworld listener error',e);}
 document.dispatchEvent(new CustomEvent('scopone:overworld:'+name,{detail}));
}
function subscribe(name,fn){if(!hooks.has(name))hooks.set(name,new Set());hooks.get(name).add(fn);return()=>hooks.get(name).delete(fn);}
function restore(){try{const s=JSON.parse(localStorage.getItem(STORAGE)||'null');if(s?.version===1&&Number.isFinite(s.x)&&Number.isFinite(s.y)&&world.canStand(s.x,s.y)){player.x=s.x;player.y=s.y;return true;}}catch(e){console.warn('Unable to restore overworld',e);}return false;}
function save(){
 try{const zone=world.globalPositionToZone(player.x,player.y);localStorage.setItem(STORAGE,JSON.stringify({version:1,x:player.x,y:player.y,zone:zone?.zone||null,zoom:renderer.camera.zoom,lastPlayed:Date.now()}));}catch(e){console.warn('Unable to persist overworld',e);}
}
function facingFromScreen(dx,dy){
 const angle=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
 return ['E','SE','S','SW','W','NW','N','NE'][Math.round(angle/45)%8];
}
function tryMove(dx,dy){
 const x=player.x,y=player.y;
 if(world.canStand(x+dx,y+dy)){player.x+=dx;player.y+=dy;return true;}
 // Optional slide along blocked cells, without changing the logical grid.
 let changed=false;
 if(world.canStand(x+dx,y)){player.x+=dx;changed=true;}
 if(world.canStand(player.x,y+dy)){player.y+=dy;changed=true;}
 return changed;
}
async function travelPortal(zoneId,entranceId='start'){
 if(lifecycle.fade)return false;
 const target=world.entrance(zoneId,entranceId);
 if(!world.canStand(target.x,target.y))return false;
 lifecycle.fade=true;lifecycle.path=[];lifecycle.destination=null;
 const veil=$('transition-veil');veil.classList.add('active');
 await new Promise(r=>setTimeout(r,200));
 player.x=target.x;player.y=target.y;
 world.prefetchNear(player.x,player.y,2);renderer.follow(player,1,true);
 emit('portal',{zoneId,entranceId,position:{x:player.x,y:player.y}});
 save();veil.classList.remove('active');
 await new Promise(r=>setTimeout(r,200));lifecycle.fade=false;return true;
}
function enterZone(){
 const here=world.globalPositionToZone(player.x,player.y);if(!here)return;
 if(here.zone!==lifecycle.lastZone){
  const previous=lifecycle.lastZone;lifecycle.lastZone=here.zone;
  $('zone-name').textContent=`Zona ${here.zone}`;
  emit('zonechange',{from:previous,to:here.zone,position:{x:player.x,y:player.y}});
 }
}
function update(dt){
 if(lifecycle.fade)return;
 let motion=controls.getVector();let move;
 if(motion.x||motion.y){
  lifecycle.path=[];lifecycle.destination=null;
  move=screenDirectionToWorld(motion.x,motion.y,world.manifest.allowDiagonal!==false);
  player.facing=facingFromScreen(motion.x,motion.y);
 }else if(lifecycle.path.length){
  const next=lifecycle.path[0];const dx=next.x-player.x,dy=next.y-player.y,dist=Math.hypot(dx,dy);
  if(dist<.06){lifecycle.path.shift();if(!lifecycle.path.length)lifecycle.destination=null;}
  else{
   move=normalize(dx,dy);
   const screenDx=(move.x-move.y)*26,screenDy=(move.x+move.y)*15;
   player.facing=facingFromScreen(screenDx,screenDy);
   if(dist<player.speed*dt)dt=dist/player.speed;
  }
 }
 if(move){const moved=tryMove(move.x*player.speed*dt,move.y*player.speed*dt);
  player.animation=moved?'walk':'idle';if(!moved){lifecycle.path=[];lifecycle.destination=null;}
 }else player.animation='idle';
 world.prefetchNear(player.x,player.y,1);
 enterZone();
 const portal=world.getPortalAt(player.x,player.y);
 if(portal&&portal.active)travelPortal(portal.toZone,portal.entrance);
 lifecycle.lastSave+=dt;if(lifecycle.lastSave>1.2){save();lifecycle.lastSave=0;}
 if(debug){$('debug-data').textContent=`${player.x.toFixed(2)}, ${player.y.toFixed(2)} · ${world.globalPositionToZone(player.x,player.y)?.zone} · chunk ${world.preloaded.size}`;}
}
function tick(t){
 if(!lifecycle.active)return;
 const dt=clamp(lifecycle.lastFrame?(t-lifecycle.lastFrame)/1000:1/60,0,.05);
 lifecycle.lastFrame=t;
 update(dt);renderer.follow(player,dt);renderer.elapsed=t/1000;
 renderer.draw(player,[],lifecycle.destination,dt);
 lifecycle.raf=requestAnimationFrame(tick);
}
function canvasTap(e){
 if(e.pointerType==='touch'&&e.isPrimary===false)return;
 const rect=canvas.getBoundingClientRect();
 const tile=renderer.screenTile(e.clientX-rect.left,e.clientY-rect.top);
 if(world.isBlocked(tile.x,tile.y)){status.textContent='Cella non raggiungibile';return;}
 const path=findPath(world,player,tile,{diagonal:world.manifest.allowDiagonal!==false});
 if(!path.length){status.textContent='Nessun percorso disponibile';return;}
 lifecycle.path=path; lifecycle.destination={x:tile.x+.5,y:tile.y+.5};
 status.textContent='Tocca una cella o usa il joystick';
}
function setupInputs(){
 controls=new TouchControls($('joystick'));
 canvas.addEventListener('pointerup',canvasTap);
 $('zoom-in').addEventListener('click',()=>{renderer.setZoom(renderer.camera.zoom+.15);save();});
 $('zoom-out').addEventListener('click',()=>{renderer.setZoom(renderer.camera.zoom-.15);save();});
 $('exit').addEventListener('click',()=>exit());
 $('debug-toggle').addEventListener('click',()=>{renderer.debug=!renderer.debug;$('debug-data').hidden=!renderer.debug;});
 $('portal-test').addEventListener('click',()=>travelPortal('D','start'));
 window.addEventListener('resize',()=>renderer.resize());
 if('ResizeObserver' in window)new ResizeObserver(()=>renderer.resize()).observe(canvas);
 window.addEventListener('pagehide',save);
 window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();exit();}});
 // Two-finger pinch changes visual scale only, never global world coordinates.
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
function exit(){save();lifecycle.active=false;cancelAnimationFrame(lifecycle.raf);controls?.dispose();if(window.parent!==window)window.parent.postMessage({type:'scopone-overworld-exit'},location.origin);else location.href='../index.html';}
async function start(){
 try{
  [world,assets]=await Promise.all([World.load(),AssetLibrary.load()]);
  if(!restore()){const p=world.entrance(world.manifest.start.zone,world.manifest.start.entrance);player.x=p.x;player.y=p.y;}
  renderer=new IsoRenderer(canvas,world,assets);renderer.debug=debug;renderer.camera.x=player.x;renderer.camera.y=player.y;
  try{const s=JSON.parse(localStorage.getItem(STORAGE)||'null');if(s?.zoom)renderer.setZoom(s.zoom);}catch{}
  world.prefetchNear(player.x,player.y,2);enterZone();setupInputs();
  if(debug){$('debug-controls').hidden=false;$('debug-data').hidden=false;}
  loading.hidden=true;canvas.setAttribute('aria-busy','false');lifecycle.raf=requestAnimationFrame(tick);
  emit('ready',{world:world.manifest.id,position:{x:player.x,y:player.y}});
 }catch(e){console.error(e);loading.textContent='Impossibile caricare la mappa: '+e.message;loading.classList.add('error');}
}
// Public bridge for future NPC interaction, Scopone challenges and rewards.
window.ScoponeOverworld={
 on:subscribe,
 position:()=>({x:player.x,y:player.y,zone:world?.globalPositionToZone(player.x,player.y)?.zone||null}),
 portal:travelPortal,
 launchScopone:details=>{const payload={position:{x:player.x,y:player.y},...details};emit('challenge-request',payload);if(window.parent!==window)window.parent.postMessage({type:'scopone-overworld-challenge',payload},location.origin);},
 reward:details=>emit('reward',details),
 save:()=>world&&save(),
 // Dedicated development API; not gameplay code.
 debug:()=>debug?{world,player,renderer,lifecycle,findPath,tryMove}:null
};
start();
