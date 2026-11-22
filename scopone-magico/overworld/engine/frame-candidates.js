// Catalog candidate sources are immutable: selecting a frame only previews a new sequence.
const DIRECTIONS=['S','SE','E','NE','N','NW','W','SW'];

export function collectWalkCandidates(items,manifest,avatarId,direction){
 const info=manifest.images[avatarId];
 if(!info?.animations?.walk?.directions?.[direction])throw Error('Avatar o direzione non registrati');
 const src=info.animations.walk.directions[direction];
 const match=x=>x.character===info.characterId&&x.src!==src;
 const sameWalk=items.filter(x=>match(x)&&x.direction===direction&&x.state==='walk');
 const sameStanding=items.filter(x=>match(x)&&x.direction===direction&&x.state==='idle');
 const otherWalk=Object.fromEntries(DIRECTIONS.filter(d=>d!==direction).map(d=>[
  d,items.filter(x=>match(x)&&x.direction===d&&x.state==='walk')
 ]));
 const otherStanding=Object.fromEntries(DIRECTIONS.filter(d=>d!==direction).map(d=>[
  d,items.filter(x=>match(x)&&x.direction===d&&x.state==='idle')
 ]));
 const usedPaths=new Set(Object.values(manifest.images).filter(x=>x.type==='character')
   .flatMap(x=>['idle','walk'].flatMap(kind=>Object.values(x.animations?.[kind]?.directions||{}))));
 const byCurrent=(item)=>({...item,inAnyAvatar:usedPaths.has(item.src)});
 const sum=xs=>xs.reduce((n,x)=>n+x.frames,0);
 return {
  src,character:info.characterId,direction,
  sameWalk:sameWalk.map(byCurrent),
  sameStanding:sameStanding.map(byCurrent),
  otherWalk:Object.fromEntries(Object.entries(otherWalk).map(([d,rows])=>[d,rows.map(byCurrent)])),
  otherStanding:Object.fromEntries(Object.entries(otherStanding).map(([d,rows])=>[d,rows.map(byCurrent)])),
  counts:{
   sameWalkFiles:sameWalk.length,
   sameWalkFrames:sum(sameWalk),
   standingFiles:sameStanding.length,
   standingFrames:sum(sameStanding),
   otherWalkFiles:Object.values(otherWalk).flat().length,
   otherWalkFrames:sum(Object.values(otherWalk).flat()),
   unusedSameDirectionFrames:sum([...sameWalk,...sameStanding].filter(x=>!usedPaths.has(x.src))),
  }
 };
}
