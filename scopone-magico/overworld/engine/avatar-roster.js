/** All available test avatars; original C08 remains the default fallback. */
export const OVERWORLD_AVATARS=Object.freeze([
  Object.freeze({id:'player',name:'8 Coppe Auto',short:'Coppe Auto',suit:'Coppe',version:'AutoSprite',emoji:'🏺'}),
  Object.freeze({id:'s08-player',name:'8 Spade V02',short:'Spade',suit:'Spade',version:'V02',emoji:'⚔️'}),
  Object.freeze({id:'b08-player',name:'8 Bastoni V01',short:'Bastoni',suit:'Bastoni',version:'V01 TEST',emoji:'🪵'}),
  Object.freeze({id:'d08-player',name:'8 Denari V01',short:'Denari',suit:'Denari',version:'V01 TEST',emoji:'🪙'}),
  Object.freeze({id:'c08-v01-player',name:'8 Coppe V01',short:'Coppe V01',suit:'Coppe',version:'V01 TEST',emoji:'🏺'}),
  Object.freeze({id:'c08-v02-player',name:'8 Coppe V02 compatto',short:'Coppe V02',suit:'Coppe',version:'V02 COMPATTO',emoji:'🏺'}),
]);
export function resolveAvatar(id){return OVERWORLD_AVATARS.find(x=>x.id===id)||OVERWORLD_AVATARS[0];}
export function nextAvatar(id){return OVERWORLD_AVATARS[(OVERWORLD_AVATARS.findIndex(x=>x.id===id)+1)%OVERWORLD_AVATARS.length];}
export function avatarIDs(){return OVERWORLD_AVATARS.map(x=>x.id);}
