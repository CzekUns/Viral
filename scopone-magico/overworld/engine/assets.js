/** External asset registration. Paths are relative to /scopone-magico/overworld/ . */
export class AssetLibrary {
  constructor(manifest,images){this.manifest=manifest;this.images=images;this.bySrc=new Map(Object.entries(manifest.images).map(([id,c])=>[c.src,id]));}
  static async load(url=new URL('../assets.json',import.meta.url)){
    const response=await fetch(url);if(!response.ok)throw Error('Asset manifest unavailable');
    const manifest=await response.json();const images=new Map();
    // Preview switch: ?terrain=legacy restores the archived SVG art immediately.
    // The default presentation uses the original Drive V03 WebP files.
    const legacy=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('terrain')==='legacy';
    if(legacy){
      for(const id of ['grass','forest','hill','road','coast','shallow','sea']){
        const entry=manifest.images['outer-'+id];
        if(entry)entry.src='tiles/outside/'+id+'.svg';
      }
    }
    await Promise.all(Object.entries(manifest.images).map(async([id,config])=>{
      const image=new Image();image.decoding='async';
      image.src=new URL(config.src,url).href; // resolved from the module-relative manifest
      try{await image.decode();images.set(id,image);}catch(e){console.warn('Missing image',id,e);}
    }));
    return new AssetLibrary(manifest,images);
  }
  image(id){return this.images.get(id)||null;}
  info(id){return this.manifest.images[id]||null;}
  getTile(id){return this.image(id)||this.image(this.manifest.fallbackTile);}
  spriteFor(character,heading,elapsed=0){
    const spec=this.info(character.assetId)||{};
    const anim=spec.animations?.[character.animation||'idle']||spec.animations?.idle||{};
    // Animation state and facing direction each select an external WebP.
    // Fall back to static idle for missing walk directions, without mirroring
    // the hand-held or belt-mounted cup onto the wrong side of the character.
    const path=anim.directions?.[heading]||anim.directions?.S||spec.directions?.[heading]||spec.src;
    const fileId=this.bySrc.get(path);
    const directionalImage=this.image(fileId);
    const image=directionalImage||this.image(character.assetId);
    const frames=directionalImage?Math.max(1,Math.floor(anim.frames||1)):1;
    const frame=image&&frames>1?Math.floor(Math.max(0,elapsed)*(anim.fps||6))%frames:0;
    return {image,frame,frames,anchor:spec.anchor||[.5,1],flip:false};
  }
}
