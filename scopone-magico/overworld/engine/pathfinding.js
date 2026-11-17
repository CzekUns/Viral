/** 8-way A* for touch-to-walk. The corners of obstacles may not be cut. */
export function findPath(world,start,goal,{diagonal=true,maxVisited=12000}={}){
  const sx=Math.floor(start.x),sy=Math.floor(start.y),tx=Math.floor(goal.x),ty=Math.floor(goal.y);
  if(world.isBlocked(tx,ty)||world.isBlocked(sx,sy))return [];
  if(sx===tx&&sy===ty)return [{x:tx+.5,y:ty+.5}];
  const directions=diagonal?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
  const key=(x,y)=>`${x},${y}`;
  const h=(x,y)=>{const dx=Math.abs(x-tx),dy=Math.abs(y-ty);return diagonal?Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy):dx+dy;};
  const open=[{x:sx,y:sy,g:0,f:h(sx,sy)}];const best=new Map([[key(sx,sy),0]]),came=new Map();
  let visited=0;
  while(open.length&&visited++<maxVisited){
    let idx=0;for(let i=1;i<open.length;i++)if(open[i].f<open[idx].f)idx=i;
    const cur=open.splice(idx,1)[0],id=key(cur.x,cur.y);
    if(cur.g!==best.get(id))continue;
    if(cur.x===tx&&cur.y===ty){
      const result=[];let k=id;
      for(let limit=0;limit<maxVisited;limit++){
        const [x,y]=k.split(',').map(Number);result.push({x:x+.5,y:y+.5});
        if(k===key(sx,sy))break;
        k=came.get(k);if(!k)return [];
      }
      result.reverse();return result;
    }
    for(const [dx,dy] of directions){
      const x=cur.x+dx,y=cur.y+dy;
      if(world.isBlocked(x,y))continue;
      if(dx&&dy&&(world.isBlocked(cur.x+dx,cur.y)||world.isBlocked(cur.x,cur.y+dy)))continue;
      const cost=cur.g+(dx&&dy?Math.SQRT2:1),k=key(x,y);
      if(cost<(best.get(k)??Infinity)){
        best.set(k,cost);came.set(k,id);open.push({x,y,g:cost,f:cost+h(x,y)});
      }
    }
  }
  return [];
}
