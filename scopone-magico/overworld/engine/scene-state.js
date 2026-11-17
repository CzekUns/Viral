/** Salvataggio separato per scala geografica e città; migrazione non distruttiva da v1. */
export const STORAGE_V1='scopone-alchemico:overworld:v1';
export const STORAGE_V2='scopone-alchemico:overworld:v2';
export function defaultState(external,internal){
  const a=external.entrance(external.manifest.start.zone,external.manifest.start.entrance);
  const b=internal.entrance(internal.manifest.start.zone,internal.manifest.start.entrance);
  return {version:2,scene:'outside',cityId:null,outside:{...a,zoom:external.manifest.view?.zoom??.88},inside:{...b,zoom:internal.manifest.view?.zoom??1.08}};
}
export function restoreState(v2,v1,external,internal){
  const state=defaultState(external,internal);
  const valid=(obj,world)=>obj&&Number.isFinite(obj.x)&&Number.isFinite(obj.y)&&world.canStand(obj.x,obj.y);
  if(v2?.version===2){
    if(valid(v2.outside,external))Object.assign(state.outside,{x:v2.outside.x,y:v2.outside.y});
    if(valid(v2.inside,internal))Object.assign(state.inside,{x:v2.inside.x,y:v2.inside.y});
    for(const key of ['outside','inside'])if(Number.isFinite(v2[key]?.zoom))state[key].zoom=Math.max(.65,Math.min(1.9,v2[key].zoom));
    if(v2.scene==='city'&&external.manifest.cities?.some(c=>c.id===v2.cityId)){
      state.scene='city';state.cityId=v2.cityId;
    }
  }else if(v1?.version===1&&valid(v1,internal)){
    // Il vecchio Overworld diventa mappa locale, senza imporre l'ingresso in città.
    Object.assign(state.inside,{x:v1.x,y:v1.y,zoom:Number.isFinite(v1.zoom)?Math.max(.65,Math.min(1.9,v1.zoom)):state.inside.zoom});
  }
  return state;
}
export function encodeState(state){
  return {version:2,scene:state.scene,cityId:state.cityId,
    outside:{...state.outside},inside:{...state.inside},lastPlayed:Date.now()};
}
export function cityOnTile(manifest,x,y){
  return (manifest.cities||[]).find(city=>Math.floor(x)===city.x&&Math.floor(y)===city.y)||null;
}
