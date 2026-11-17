import {TILE_WIDTH,TILE_HEIGHT,screenToWorld,worldToScreen,clamp} from './geometry.js';

/** Canvas 2D renderer: fixed orthographic camera, depth-sort by foot Y, external images. */
export class IsoRenderer {
  constructor(canvas,world,assets){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.world=world;this.assets=assets;this.width=1;this.height=1;this.dpr=1;
    this.camera={x:16.5,y:16.5,zoom:1,anchorY:.44};
    this.target={x:16.5,y:16.5};this.elapsed=0;this.debug=false;this.exitMarker=null;
    this.resize();
  }
  resize(){
    const box=this.canvas.getBoundingClientRect();this.width=Math.max(1,Math.round(box.width));this.height=Math.max(1,Math.round(box.height));
    this.dpr=Math.min(window.devicePixelRatio||1,2.5);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
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
    // A small size overlap removes sub-pixel hairlines between adjacent transparent diamonds.
    // Images and positions remain identical across chunk and zone boundaries.
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
  drawEntity(entity){
    const c=this.ctx,p=this._screen(entity.x,entity.y),z=this.camera.zoom;
    const spec=this.assets.spriteFor(entity,entity.facing||'S',entity.animationTime??this.elapsed);
    const width=(entity.renderWidth||46)*z,height=(entity.renderHeight||100)*z;
    if(!spec.image){
      c.fillStyle='#883b2d';c.beginPath();c.ellipse(p.x,p.y-height*.5,width*.35,height*.44,0,0,Math.PI*2);c.fill();return;
    }
    c.save();c.translate(p.x,p.y);
    c.fillStyle='rgba(55,41,27,.22)';c.beginPath();c.ellipse(1,0,width*.31,height*.06,-.1,0,Math.PI*2);c.fill();
    if(spec.flip)c.scale(-1,1);
    const frames=spec.frames,frame=spec.frame;
    const ix=frame*(spec.image.naturalWidth/frames),iw=spec.image.naturalWidth/frames;
    const anchor=spec.anchor;
    c.drawImage(spec.image,ix,0,iw,spec.image.naturalHeight,-width*anchor[0],-height*anchor[1],width,height);
    c.restore();
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
