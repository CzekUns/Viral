import {ISO,clamp} from './geometry.js';
import {buildTerrain} from './terrain.js';

export class World {
  constructor(manifest,zones){
    this.manifest=manifest;
    this.zones=new Map(zones.map(z=>[z.id,z]));
    this.width=manifest.width;this.height=manifest.height;
    this.chunkSize=manifest.chunkSize||ISO.chunkSize;
    this.chunks=new Map();this.preloaded=new Set();
    this.zoneBounds=[...this.zones.values()];
    this.renderables=[];
    for(const z of this.zones.values()){
      if(z.width<=0||z.height<=0||z.width%this.chunkSize||z.height%this.chunkSize) throw Error('Invalid zone dimensions: '+z.id);
      // Explicit logical collision grid from compact, human-editable blocked-cell definitions.
      z.collisionGrid=new Uint8Array(z.width*z.height);
      z.collisionGrid.fill(z.collision?.defaultBlocked?1:0);
      const terrain=buildTerrain(z);
      if(terrain){z.terrainGrid=terrain.tiles;z.collisionGrid.set(terrain.blocked);}
      for(const [x,y] of z.collision?.blocked||[]) {
        if(x>=0&&y>=0&&x<z.width&&y<z.height) z.collisionGrid[y*z.width+x]=1;
      }
      for(const [x,y] of z.collision?.open||[]) {
        if(x>=0&&y>=0&&x<z.width&&y<z.height) z.collisionGrid[y*z.width+x]=0;
      }
      // Future prop/NPC footprint and draw-order support (empty for the four floor-only zones).
      for(const item of [...(z.objects||[]),...(z.entities||[])]){
        const itemX=z.worldX+item.x+.5,itemY=z.worldY+item.y+.5;
        this.renderables.push({...item,x:itemX,y:itemY,assetId:item.assetId||item.asset||'',layer:item.layer||'objects'});
        if(item.solid){
          const fw=item.footprint?.[0]||1,fh=item.footprint?.[1]||1;
          for(let ox=0;ox<fw;ox++)for(let oy=0;oy<fh;oy++){
            const tx=item.x+ox,ty=item.y+oy;
            if(tx>=0&&ty>=0&&tx<z.width&&ty<z.height)z.collisionGrid[ty*z.width+tx]=1;
          }
        }
      }
    }
    // I borghi sono entità di scena; ogni ingresso è definito nel manifest geografico.
    for(const city of manifest.cities||[]){
      if(!this.zoneAt(city.x+.5,city.y+.5)||this.isBlocked(city.x,city.y))throw Error('City on impassable tile: '+city.id);
      this.renderables.push({x:city.x+.5,y:city.y+.5,assetId:city.assetId,label:city.name,renderWidth:83,renderHeight:86,layer:'objects'});
    }
    this.listeners=new Set();
  }
  static async load(base=new URL('../maps/',import.meta.url),manifestFile='world.json'){
    const response=await fetch(new URL(manifestFile,base));
    if(!response.ok)throw Error('World manifest not found: '+manifestFile);
    const index=await response.json();
    const zones=await Promise.all(index.zones.map(async p=>{
      const res=await fetch(new URL(p,base));if(!res.ok)throw Error(`Zone not found: ${p}`);return res.json();
    }));
    return new World(index,zones);
  }
  zoneAt(x,y){return this.zoneBounds.find(z=>x>=z.worldX&&x<z.worldX+z.width&&y>=z.worldY&&y<z.worldY+z.height)||null;}
  zoneById(id){return this.zones.get(id)||null;}
  inside(x,y){return !!this.zoneAt(x,y);}
  isBlocked(x,y){const tx=Math.floor(x),ty=Math.floor(y),z=this.zoneAt(tx,ty);if(!z)return true;return !!z.collisionGrid[(ty-z.worldY)*z.width+(tx-z.worldX)];}
  canStand(x,y,radius=.17){
    return !this.isBlocked(x-radius,y-radius)&&!this.isBlocked(x+radius,y-radius)&&
           !this.isBlocked(x-radius,y+radius)&&!this.isBlocked(x+radius,y+radius);
  }
  _chunkKey(z,x,y){return `${z.id}:${x}:${y}`;}
  ensureChunk(zoneId,cx,cy){
    const z=this.zoneById(zoneId);if(!z)return null;
    const cols=Math.ceil(z.width/this.chunkSize),rows=Math.ceil(z.height/this.chunkSize);
    if(cx<0||cy<0||cx>=cols||cy>=rows)return null;
    const key=this._chunkKey(z,cx,cy);
    if(this.chunks.has(key))return this.chunks.get(key);
    const chunk={key,zoneId,cx,cy,originX:z.worldX+cx*this.chunkSize,originY:z.worldY+cy*this.chunkSize,
      width:Math.min(this.chunkSize,z.width-cx*this.chunkSize),height:Math.min(this.chunkSize,z.height-cy*this.chunkSize),
      tileId:z.floor,layerIds:z.layers||['floor'],entities:z.entities||[]};
    this.chunks.set(key,chunk);this.preloaded.add(key);return chunk;
  }
  /** Prewarm a 3x3 neighborhood, including chunks across each linked zone edge. */
  prefetchNear(x,y,rad=1){
    const tileX=Math.floor(x),tileY=Math.floor(y);
    const c=this.chunkSize;
    for(let cx=Math.floor(tileX/c)-rad;cx<=Math.floor(tileX/c)+rad;cx++){
      for(let cy=Math.floor(tileY/c)-rad;cy<=Math.floor(tileY/c)+rad;cy++){
        const gx=cx*c,gy=cy*c,z=this.zoneAt(gx+0.5,gy+0.5);
        if(z)this.ensureChunk(z.id,Math.floor((gx-z.worldX)/c),Math.floor((gy-z.worldY)/c));
      }
    }
  }
  tileAt(x,y){
    const z=this.zoneAt(x,y);if(!z)return null;
    const lx=Math.floor(x-z.worldX),ly=Math.floor(y-z.worldY);
    const c=this.ensureChunk(z.id,Math.floor(lx/this.chunkSize),Math.floor(ly/this.chunkSize));
    // Sparse per-tile overrides can be injected in zone maps without changing the renderer.
    const variants=z.floorVariants||[z.floor];
    const variant=z.terrainGrid?.[ly*z.width+lx]||variants[(lx+ly)%variants.length];
    return {zone:z,chunk:c,tileId:z.tileOverrides?.[`${lx},${ly}`]||variant,blocked:!!z.collisionGrid[ly*z.width+lx]};
  }
  getPortalAt(x,y){const z=this.zoneAt(x,y);if(!z)return null;const localX=Math.floor(x-z.worldX),localY=Math.floor(y-z.worldY);return (z.portals||[]).find(p=>p.active&&p.tileX===localX&&p.tileY===localY)||null;}
  entrance(zoneId,pointId='start'){
    const z=this.zoneById(zoneId);const p=z?.entrances?.[pointId];
    if(!z||!p)throw Error('Missing entrance '+zoneId+':'+pointId);
    return {x:z.worldX+p[0]+.5,y:z.worldY+p[1]+.5};
  }
  globalPositionToZone(x,y){const z=this.zoneAt(x,y);return z?{zone:z.id,localX:x-z.worldX,localY:y-z.worldY}:null;}
  setCollision(zoneId,x,y,blocked){const z=this.zoneById(zoneId);if(!z)return false;if(x<0||y<0||x>=z.width||y>=z.height)return false;z.collisionGrid[y*z.width+x]=blocked?1:0;return true;}
}
