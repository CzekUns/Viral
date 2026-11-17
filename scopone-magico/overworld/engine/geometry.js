/** Scopone Alchemico Overworld: orthodox 30°/30° isometric orthographic projection. */
export const ISO = Object.freeze({sourceWidth:104, sourceHeight:60, renderScale:.5, chunkSize:16, zoneSize:32});
export const TILE_WIDTH = ISO.sourceWidth * ISO.renderScale; // 52 px at zoom 1
export const TILE_HEIGHT = ISO.sourceHeight * ISO.renderScale; // 30 px at zoom 1
export const axisAngle = Math.atan2(TILE_HEIGHT, TILE_WIDTH) * 180 / Math.PI; // 29.982°
export function project(x,y,width=TILE_WIDTH,height=TILE_HEIGHT) {
  return {x:(x-y)*width/2, y:(x+y)*height/2};
}
export function unproject(x,y,width=TILE_WIDTH,height=TILE_HEIGHT) {
  return {x:x/width+y/height, y:y/height-x/width};
}
export function worldToScreen(x,y,camera,screenW,screenH) {
  const p=project(x,y), focus=project(camera.x,camera.y);
  return {x:screenW/2+(p.x-focus.x)*camera.zoom,y:screenH*camera.anchorY+(p.y-focus.y)*camera.zoom};
}
export function screenToWorld(sx,sy,camera,screenW,screenH) {
  const focus=project(camera.x,camera.y);
  return unproject(focus.x+(sx-screenW/2)/camera.zoom,focus.y+(sy-screenH*camera.anchorY)/camera.zoom);
}
export function screenToTile(x,y,camera,w,h) {
  const p=screenToWorld(x,y,camera,w,h);
  return {x:Math.floor(p.x),y:Math.floor(p.y)};
}
export function normalize(x,y){const n=Math.hypot(x,y);return n>1e-7?{x:x/n,y:y/n}:{x:0,y:0};}
/** A screen-space joystick vector mapped to an equally fast world-space direction. */
export function screenDirectionToWorld(sx,sy,allowDiagonal=true){
  let dx=sx,dy=sy;
  const w=unproject(dx,dy);
  // Optional orthogonal-only grid locomotion, even for diagonal screen-space inputs.
  if(!allowDiagonal){if(Math.abs(w.x)>=Math.abs(w.y))w.y=0;else w.x=0;}
  return normalize(w.x,w.y);
}
export function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v));}
