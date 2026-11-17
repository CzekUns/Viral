/** External asset registration. Paths are relative to /scopone-magico/overworld/ . */
export class AssetLibrary {
  constructor(manifest,images){this.manifest=manifest;this.images=images;}
  static async load(url=new URL('../assets.json',import.meta.url)){
    const response=await fetch(url);if(!response.ok)throw Error('Asset manifest unavailable');
    const manifest=await response.json();const images=new Map();
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
    const dir=spec.directions?.[heading]||spec.directions?.['S']||spec.src;
    let image=this.image(character.assetId);
    if(dir&&dir!==spec.src){for(const [id,i] of Object.entries(this.manifest.images))if(i.src===dir){image=this.image(id);break;}}
    const anim=spec.animations?.[character.animation||'idle'];
    if(anim?.frames>1&&image){const frame=Math.floor(elapsed*(anim.fps||6))%anim.frames;return{image,frame,frames:anim.frames,anchor:spec.anchor||[.5,1],flip:!spec.directions?.[heading]&&['W','NW','SW'].includes(heading)};}
    return {image,frame:0,frames:1,anchor:spec.anchor||[.5,1],flip:!spec.directions?.[heading]&&['W','NW','SW'].includes(heading)};
  }
}
