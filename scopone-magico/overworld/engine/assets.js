/** Scopone Alchemico — external image registration, direction-aware C08 animation.
 * PNG masters remain in Drive; WebP strips live in characters/c08/v02/.
 * Large walk strips are decoded on demand with a four-direction LRU budget. */
export class AssetLibrary {
  constructor(manifest,images,url=new URL('../assets.json',import.meta.url)){
    this.manifest=manifest;
    this.images=images;
    this.manifestUrl=url;
    this.bySrc=new Map(Object.entries(manifest.images).map(([id,c])=>[c.src,id]));
    this.pending=new Set();
    this.failed=new Map();
    this.revision=0; // invalidate idle canvas after asynchronous decode/failure
    this.walkLru=[];
    this.maxWalkSheets=4;
  }
  static async load(url=new URL('../assets.json',import.meta.url)){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('Asset manifest unavailable');
    const manifest=await response.json();
    const params=typeof window!=='undefined'?new URLSearchParams(window.location.search):new URLSearchParams();
    // Terrain reference rollback is independent of C08 animation selection.
    if(params.get('terrain')==='legacy'){
      for(const id of ['grass','forest','hill','road','coast','shallow','sea']){
        const entry=manifest.images['outer-'+id];
        if(entry)entry.src='tiles/outside/'+id+'.svg';
      }
    }
    const player=manifest.images.player;
    const directions=['N','NE','E','SE','S','SW','W','NW'];
    if(params.get('c08')==='legacy'){
      // Existing 3-frame V04 files stay available for direct before/after QA.
      for(const d of directions){
        player.animations.idle.directions[d]='characters/c08/idle/'+d+'.webp';
        player.animations.walk.directions[d]='characters/c08/walk/'+d+'.webp';
        player.animations.idle.perDirection[d]={frames:1,fps:1,anchor:[.5,365/384],renderScale:[1,1]};
        player.animations.walk.perDirection[d]={frames:3,fps:7,anchor:[.5,365/384],renderScale:[1,1]};
      }
    }else if(params.get('c08-recovered')==='off'&&player.comparisonBeforeRecovery){
      // Restore exact previous E (static), SE V07 and S V08, without deleting source artwork.
      for(const d of ['E','SE','S']){
        const old=player.comparisonBeforeRecovery[d];
        player.animations.walk.directions[d]=old.walk;
        player.animations.idle.directions[d]=old.idle;
        player.animations.walk.perDirection[d]={...old.walkMeta};
        player.animations.idle.perDirection[d]={...old.idleMeta};
      }
    }else if(params.get('c08-stabilized')==='off'&&player.comparisonBeforeStabilization){
      // Compare with pre-stabilization 12/12/18f AutoSprite captures.
      for(const d of ['E','SE','S']){
        const prior=player.comparisonBeforeStabilization[d];
        player.animations.walk.directions[d]=prior.walk;
        player.animations.walk.perDirection[d]={...prior.walkMeta};
      }
    }else if(params.get('c08-sud')==='auto'&&player.comparisonSudAuto){
      // Deliberate opt-in: approved V08 Sud is the default.
      const cmp=player.comparisonSudAuto;
      player.animations.walk.directions.S=cmp.walk;
      player.animations.idle.directions.S=cmp.idle;
      player.animations.walk.perDirection.S={...cmp.meta};
      player.animations.idle.perDirection.S={...cmp.meta,frames:1,fps:1};
    }
    const images=new Map();
    await Promise.all(Object.entries(manifest.images).filter(([,config])=>!config.lazy).map(async([id,config])=>{
      const image=new Image();image.decoding='async';
      const resolved=new URL(config.src,url);
      if(config.src.startsWith('characters/c08/'))resolved.searchParams.set('rev','c08-e-se-s-anti-drop-v05');
      image.src=resolved.href;
      try{await image.decode();images.set(id,image);}
      catch(e){console.warn('Missing image',id,e);}
    }));
    return new AssetLibrary(manifest,images,url);
  }
  image(id){return this.images.get(id)||null;}
  info(id){return this.manifest.images[id]||null;}
  getTile(id){return this.image(id)||this.image(this.manifest.fallbackTile);}
  _touch(id){
    if(!this.info(id)?.lazy)return;
    const pos=this.walkLru.indexOf(id);
    if(pos!==-1)this.walkLru.splice(pos,1);
    this.walkLru.push(id);
    while(this.walkLru.length>this.maxWalkSheets){
      const old=this.walkLru.shift();
      if(old!==id)this.images.delete(old);
    }
  }
  _request(id){
    if(!id||this.images.has(id)||this.pending.has(id)||typeof Image==='undefined')return;
    const previousFailure=this.failed.get(id);
    if(previousFailure&&Date.now()<previousFailure.nextRetry)return;
    const config=this.info(id);
    if(!config)return;
    this.pending.add(id);
    const image=new Image();image.decoding='async';
    const resolved=new URL(config.src,this.manifestUrl);
    if(config.src.startsWith('characters/c08/'))resolved.searchParams.set('rev','c08-e-se-s-anti-drop-v05');
    image.src=resolved.href;
    const decode=typeof image.decode==='function'?image.decode():new Promise((resolve,reject)=>{
      image.onload=resolve;image.onerror=reject;
    });
    Promise.resolve(decode).then(()=>{
      if(!image.naturalWidth||!image.naturalHeight)throw Error('Decoded image has no pixels');
      this.images.set(id,image);
      this.failed.delete(id);
      this._touch(id);
      this.revision++;
    }).catch(e=>{
      const attempts=(previousFailure?.attempts||0)+1;
      const backoff=Math.min(30000,500*2**Math.min(attempts,6));
      this.failed.set(id,{attempts,nextRetry:Date.now()+backoff,reason:String(e)});
      this.revision++; // present fallback and error instead of claiming animation played
      console.warn('Unable to decode C08 sprite; retry after',backoff,'ms',id,e);
    }).finally(()=>this.pending.delete(id));
  }
  spriteFor(character,heading,elapsed=0){
    const spec=this.info(character.assetId)||{};
    const state=character.animation==='walk'?'walk':'idle';
    const anim=spec.animations?.[state]||spec.animations?.idle||{};
    const specific=anim.perDirection?.[heading]||{};
    const path=anim.directions?.[heading]||anim.directions?.S||spec.directions?.[heading]||spec.src;
    const id=this.bySrc.get(path);
    let img=this.image(id);
    if(!img)this._request(id);
    // While the requested walk direction decodes, show the matching static frame.
    // Never mirror a C08 raster: that would exchange the cup and sword sides.
    if(!img){
      const idle=spec.animations?.idle||{};
      const idlePath=idle.directions?.[heading]||idle.directions?.S||spec.src;
      const idleId=this.bySrc.get(idlePath);
      const idleMeta=idle.perDirection?.[heading]||{};
      img=this.image(idleId)||this.image(character.assetId);
      return {image:img,frame:0,frames:1,requested:path,
        anchor:idleMeta.anchor||spec.anchor||[.5,1],
        renderScale:idleMeta.renderScale||[1,1],flip:false,
        loading:!this.failed.has(id),failed:this.failed.has(id),fallback:true};
    }
    this._touch(id);
    const frames=Math.max(1,Math.floor(specific.frames||anim.frames||1));
    const fps=Number.isFinite(specific.fps)?specific.fps:(anim.fps||6);
    const frame=frames>1?Math.floor(Math.max(0,elapsed)*fps)%frames:0;
    return {image:img,frame,frames,requested:path,
      anchor:specific.anchor||spec.anchor||[.5,1],
      renderScale:specific.renderScale||[1,1],flip:false,loading:false,failed:false,fallback:false};
  }
}
