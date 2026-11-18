/** Stable 8-way C08 facing and walking time independent of analog sector jitter. */
export const C08_HEADINGS=Object.freeze(['E','SE','S','SW','W','NW','N','NE']);
export function facingWithHysteresis(dx,dy,previous=null,marginDegrees=8){
  if(!dx&&!dy)return previous||'S';
  const angle=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
  const closest=C08_HEADINGS[Math.round(angle/45)%8];
  const old=C08_HEADINGS.indexOf(previous);
  if(old!==-1){
    const delta=((angle-old*45+540)%360)-180;
    if(Math.abs(delta)<22.5+marginDegrees)return previous;
  }
  return closest;
}
/** Direction changes preserve walk phase; only a walk/idle transition resets it. */
export function advanceC08AnimationTime(previousState,nextState,elapsed,dt){
  if(nextState!=='walk')return 0;
  if(previousState!=='walk')return 0;
  return Math.max(0,elapsed)+Math.max(0,dt);
}
