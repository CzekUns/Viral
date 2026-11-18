import {TILE_WIDTH,TILE_HEIGHT,screenToWorld,worldToScreen,clamp} from './geometry.js';

/** Canvas 2D renderer: fixed orthographic camera, depth-sort by foot Y, external images. */
export class IsoRenderer {
  constructor(canvas,world,assets){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.world=world;this.assets=assets;this.width=1;this.height=1;this.dpr=1;
    this.camera={x:16.5,y:16.5,zoom:1,anchorY:.44};
    this.target={x:16.5,y:16.5};this.elapsed=0;this.debug=false;this.exitMarker=null;
    // Cache only static exterior tiles. Local cities keep their original renderer.
    this.terrainCache=new Map();this.cacheWorld=null;this.maxTerrainChunks=28;
    this.terrainStats={builds:0,hits:0,evictions:0,draws:0};
    this.resize();
  }
  resize(){
    const box=this.canvas.getBoundingClientRect();this.width=Math.max(1,Math.round(box.width));this.height=Math.max(1,Math.round(box.height));
    // Natural 52×30 tiles need less resolution than large indoor character sprites.
    const dpr=Math.min(window.devicePixelRatio||1,this.world.manifest.cities?1.65:2.25);
    const cw=Math.round(this.width*dpr),ch=Math.round(this.height*dpr);
    if(this.canvas.width===cw&&this.canvas.height===ch&&this.dpr===dpr)return;
    this.dpr=dpr;
    this.canvas.width=cw;this.canvas.height=ch;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.ctx.imageSmoothingEnabled=true;
  }
  follow(p,dt,immediate=false){
    const factor=immediate?1:1-Math.exp(-dt*9);
    this.camera.x+=(p.x-this.camera.x)*factor;
    this.camera.y+=(p.y-this.camera.y)*factor;
  }
  setZoom(next){this.camera.zoom=clamp(next,.65,1.9);}
  screenTile(sx,sy){const p=screenToWorld(sx,sy,this.camera,this.width,this.height);return {x:Math.floor(p.x),y:Math.floor(p.y)};}
  _screen(x,y){return worldToScreen(x,y,this.camera,this.width,this.height);}
  _cullBounds(){
    const corners=[[0,0],[this.width,0],[0,this.height],[this.width,this.height]];
    const pts=corners.map(([x,y])=>screenToWorld(x,y,this.camera,this.width,this.height));
    const minX=Math.floor(Math.min(...pts.map(p=>p.x)))-4;
    const maxX=Math.ceil(Math.max(...pts.map(p=>p.x)))+4;
    const minY=Math.floor(Math.min(...pts.map(p=>p.y)))-4;
    const maxY=Math.ceil(Math.max(...pts.map(p=>p.y)))+4;
    return {minX,maxX,minY,maxY};
  }
  draw(player,entities=[],destination=null,dt=1/60){
    const c=this.ctx,w=this.width,h=this.height,z=this.camera.zoom;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    c.fillStyle=this.world.manifest.background||'#d9c9b3';c.fillRect(0,0,w,h);
    const b=this._cullBounds(),tw=TILE_WIDTH*z,th=TILE_HEIGHT*z;
    if(this.world.manifest.cities){
      this._drawTerrainChunks(b);
    }else{
    // Legacy floor renderer remains untouched for the interior city scene.
    for(let sum=b.minX+b.minY;sum<=b.maxX+b.maxY;sum++){
      for(let x=b.minX;x<=b.maxX;x++){
        const y=sum-x;if(y<b.minY||y>b.maxY)continue;
        // Nonwalkable, decorative stone continuation beyond the four test zones.
        // This prevents a hard blank wedge at the world's outer boundary.
        const tx=clamp(x,0,this.world.width-1),ty=clamp(y,0,this.world.height-1);
        const tile=this.world.tileAt(tx,ty);if(!tile)continue;
        const p=this._screen(x+.5,y+.5);
        if(p.x+tw/2<-.6||p.x-tw/2>w+.6||p.y+th/2<-.6||p.y-th/2>h+.6)continue;
        const img=this.assets.getTile(tile.tileId);
        if(img){c.drawImage(img,p.x-tw/2-.45,p.y-th/2-.45,tw+.9,th+.9);}
        else{c.fillStyle=tile.zone.fallback||'#d4c2ad';c.beginPath();c.moveTo(p.x,p.y-th/2);c.lineTo(p.x+tw/2,p.y);c.lineTo(p.x,p.y+th/2);c.lineTo(p.x-tw/2,p.y);c.closePath();c.fill();}
      }
    }
    }
    if(destination){const p=this._screen(destination.x,destination.y);c.save();c.strokeStyle='rgba(127,77,36,.78)';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y,tw*.25,th*.26,0,0,2*Math.PI);c.stroke();c.restore();}
    if(this.exitMarker){
      const p=this._screen(this.exitMarker.x,this.exitMarker.y);
      c.save();c.strokeStyle='#a66836';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,tw*.28,th*.3,0,0,2*Math.PI);c.stroke();
      c.font='bold 12px Georgia,serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#f5edd9';c.strokeText('USCITA',p.x,p.y-th*.8);c.fillStyle='#6e402a';c.fillText('USCITA',p.x,p.y-th*.8);c.restore();
    }
    // All future entities and props use the same feet-based depth ordering.
    const visible=this.world.renderables.filter(e=>e.x>=b.minX-2&&e.x<=b.maxX+2&&e.y>=b.minY-2&&e.y<=b.maxY+2);
    const all=[...visible,...entities,player].sort((a,b)=>(a.x+a.y+a.height*.01)-(b.x+b.y+b.height*.01));
    for(const item of all)this.drawEntity(item);
    if(this.world.manifest.labels)this.drawLabels(this.world.manifest.labels);
    if(this.debug)this.drawDebug(player,b);
  }
  /** Precompose a 16×16 block once onto a small transparent canvas (1x).
   * This avoids thousands of SVG drawImage calls per animation frame.
   * Only the manifest-provided image IDs are used; no fixed art in the engine. */
  _buildTerrainChunk(zone,cx,cy){
    const n=this.world.chunkSize;
    const tileW=TILE_WIDTH,tileH=TILE_HEIGHT,pad=2;
    const columns=Math.min(n,zone.width-cx*n),rows=Math.min(n,zone.height-cy*n);
    const width=(columns+rows)*tileW/2+pad*2;
    const height=(columns+rows)*tileH/2+pad*2;
    const buffer=document.createElement('canvas');
    buffer.width=Math.ceil(width);buffer.height=Math.ceil(height);
    const ctx=buffer.getContext('2d',{alpha:true});
    ctx.imageSmoothingEnabled=true;
    const anchorX=rows*tileW/2+pad,anchorY=pad;
    const x0=zone.worldX+cx*n,y0=zone.worldY+cy*n;
    for(let sum=0;sum<columns+rows-1;sum++){
      for(let ix=Math.max(0,sum-rows+1);ix<=Math.min(columns-1,sum);ix++){
        const iy=sum-ix;
        const tile=this.world.tileAt(x0+ix,y0+iy);
        if(!tile)continue;
        const pX=anchorX+(ix-iy)*tileW/2,pY=anchorY+(ix+iy+1)*tileH/2;
        const art=this.assets.getTile(tile.tileId);
        if(art)ctx.drawImage(art,pX-tileW/2-.45,pY-tileH/2-.45,tileW+.9,tileH+.9);
        else{
          ctx.fillStyle=tile.zone.fallback||'#d4c2ad';
          ctx.beginPath();ctx.moveTo(pX,pY-tileH/2);ctx.lineTo(pX+tileW/2,pY);
          ctx.lineTo(pX,pY+tileH/2);ctx.lineTo(pX-tileW/2,pY);ctx.closePath();ctx.fill();
        }
      }
    }
    this.terrainStats.builds++;
    return {buffer,anchorX,anchorY};
  }
  _terrainChunk(zone,cx,cy){
    if(this.cacheWorld!==this.world){
      this.terrainCache.clear();this.cacheWorld=this.world;
    }
    const key=zone.id+':'+cx+':'+cy;
    if(this.terrainCache.has(key)){
      const value=this.terrainCache.get(key);
      // Recently visible chunks are retained when the player crosses boundaries.
      this.terrainCache.delete(key);this.terrainCache.set(key,value);
      this.terrainStats.hits++;return value;
    }
    const value=this._buildTerrainChunk(zone,cx,cy);
    this.terrainCache.set(key,value);
    if(this.terrainCache.size>this.maxTerrainChunks){
      this.terrainCache.delete(this.terrainCache.keys().next().value);
      this.terrainStats.evictions++;
    }
    return value;
  }
  /** Draw only chunks intersecting the viewport; map objects and player remain dynamic. */
  _drawTerrainChunks(bounds){
    const z=this.camera.zoom,ctx=this.ctx,n=this.world.chunkSize;
    for(const zone of this.world.zoneBounds){
      const firstX=Math.max(0,Math.floor((bounds.minX-zone.worldX)/n));
      const lastX=Math.min(Math.ceil(zone.width/n)-1,Math.floor((bounds.maxX-zone.worldX)/n));
      const firstY=Math.max(0,Math.floor((bounds.minY-zone.worldY)/n));
      const lastY=Math.min(Math.ceil(zone.height/n)-1,Math.floor((bounds.maxY-zone.worldY)/n));
      if(firstX>lastX||firstY>lastY)continue;
      for(let cy=firstY;cy<=lastY;cy++)for(let cx=firstX;cx<=lastX;cx++){
        const originX=zone.worldX+cx*n,originY=zone.worldY+cy*n;
        const columns=Math.min(n,zone.width-cx*n),rows=Math.min(n,zone.height-cy*n);
        const p=this._screen(originX,originY);
        const left=p.x-(rows*TILE_WIDTH/2+2)*z;
        const top=p.y-2*z;
        const width=((columns+rows)*TILE_WIDTH/2+4)*z;
        const height=((columns+rows)*TILE_HEIGHT/2+4)*z;
        if(left>this.width||left+width<0||top>this.height||top+height<0)continue;
        const entry=this._terrainChunk(zone,cx,cy);
        ctx.drawImage(entry.buffer,p.x-entry.anchorX*z,p.y-entry.anchorY*z,entry.buffer.width*z,entry.buffer.height*z);
        this.terrainStats.draws++;
      }
    }
  }
  /** Future dynamic tile edits must invalidate the relevant cached block. */
  invalidateTerrain(){
    this.terrainCache.clear();this.terrainStats.evictions=0;
  }
  drawEntity(entity){
    const c=this.ctx,p=this._screen(entity.x,entity.y),z=this.camera.zoom;
    const spec=this.assets.spriteFor(entity,entity.facing||'S',entity.animationTime??this.elapsed);
    const scale=spec.renderScale||[1,1];
    const width=(entity.renderWidth||46)*scale[0]*z,height=(entity.renderHeight||100)*scale[1]*z;
    // Inspect the exact frame passed to Canvas.drawImage, not a second manifest
    // lookup that could disagree with the asynchronously decoded frame.
    const playerSprite=entity.assetId==='player'?{
      facing:entity.facing||'S',animation:entity.animation||'idle',
      animationTime:entity.animationTime??0,frame:spec.frame,frames:spec.frames,
      loading:!!spec.loading,failed:!!spec.failed,fallback:!!spec.fallback,
      requested:spec.requested||'',src:spec.image?.currentSrc||spec.image?.src||'',
      drawn:false,image:null,sourceX:0,sourceWidth:0
    }:null;
    if(playerSprite)this.lastPlayerSprite=playerSprite;
    if(!spec.image||!spec.image.naturalWidth||!spec.image.naturalHeight){
      c.fillStyle='#883b2d';c.beginPath();c.ellipse(p.x,p.y-height*.5,width*.35,height*.44,0,0,Math.PI*2);c.fill();return;
    }
    c.save();c.translate(p.x,p.y);
    c.fillStyle='rgba(55,41,27,.22)';c.beginPath();c.ellipse(1,0,width*.31,height*.06,-.1,0,Math.PI*2);c.fill();
    if(spec.flip)c.scale(-1,1);
    const frames=Math.max(1,Math.floor(spec.frames||1));
    const frame=Math.max(0,Math.min(frames-1,Math.floor(spec.frame||0)));
    const iw=spec.image.naturalWidth/frames,ix=frame*iw;
    const anchor=spec.anchor;
    c.drawImage(spec.image,ix,0,iw,spec.image.naturalHeight,-width*anchor[0],-height*anchor[1],width,height);
    c.restore();
    if(playerSprite){
      playerSprite.drawn=true;
      playerSprite.frame=frame;playerSprite.frames=frames;
      playerSprite.image=spec.image;playerSprite.sourceX=ix;playerSprite.sourceWidth=iw;
    }
    if(entity.label){
      c.save();c.textAlign='center';c.font='bold 12px Georgia,serif';c.lineWidth=3;
      c.strokeStyle='#f4e6c5';c.strokeText(entity.label,p.x,p.y-height-5);
      c.fillStyle='#3f3027';c.fillText(entity.label,p.x,p.y-height-5);c.restore();
    }
  }
  drawLabels(labels){
    const c=this.ctx;c.save();c.textAlign='center';
    for(const label of labels){const p=this._screen(label.x+.5,label.y+.5);
      if(p.x< -120||p.x>this.width+120||p.y< -40||p.y>this.height+40)continue;
      c.font=label.kind==='sea'?'italic 17px Georgia,serif':'italic 12px Georgia,serif';
      c.lineWidth=3;c.strokeStyle=label.kind==='sea'?'#315e71':'#e8dfc4';
      c.strokeText(label.text,p.x,p.y);c.fillStyle=label.kind==='sea'?'#d8e6df':'#544a33';c.fillText(label.text,p.x,p.y);
    }c.restore();
  }
  drawDebug(player,b){
    const c=this.ctx;c.save();c.font='11px monospace';c.fillStyle='#3b2818';c.fillText(`world ${player.x.toFixed(2)} ${player.y.toFixed(2)} | draw ${b.maxX-b.minX+1}×${b.maxY-b.minY+1} | zoom ${this.camera.zoom.toFixed(2)}`,8,18);c.restore();
  }
}
