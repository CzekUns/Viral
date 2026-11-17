/** Topografia stilizzata del Golfo di Napoli, guidata dal JSON della zona.
 * Il renderer riceve solo ID di tile: nessuna dipendenza grafica o DOM qui. */
const pointInPolygon=(x,y,points)=>{
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
};
function coastline(x,points){
  for(let i=1;i<points.length;i++){
    if(x<=points[i][0]){
      const [x0,y0]=points[i-1],[x1,y1]=points[i];
      return y0+(y1-y0)*Math.max(0,Math.min(1,(x-x0)/(x1-x0)));
    }
  }
  return points.at(-1)[1];
}
const ellipse=(x,y,[cx,cy,rx,ry])=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
function segmentDistance(x,y,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=dx*dx+dy*dy?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy))):0;
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
}
function nearTrail(x,y,lines){
  return lines.some(line=>line.slice(1).some((end,i)=>segmentDistance(x,y,line[i],end)<.87));
}
function hash(x,y){const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);}
export function buildTerrain(zone){
  const cfg=zone.terrain;
  if(!cfg)return null;
  const width=zone.width,height=zone.height;
  if(!cfg.coast?.length||!cfg.tiles)throw Error('Invalid terrain config: '+zone.id);
  const isLand=(x,y)=>{
    if(x<0||y<0||x>=width||y>=height)return false;
    if(y<=coastline(x,cfg.coast))return true;
    if((cfg.peninsulas||[]).some(poly=>pointInPolygon(x,y,poly)))return true;
    return (cfg.islands||[]).some(shape=>ellipse(x,y,shape));
  };
  const tiles=new Array(width*height),blocked=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const cx=x+.5,cy=y+.5,land=isLand(cx,cy),i=y*width+x;
    const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>isLand(cx+dx,cy+dy)!==land);
    let type;
    if(!land){type=edge?'shallow':'sea';blocked[i]=1;}
    else if((cfg.cities||[]).some(([tx,ty])=>Math.hypot(cx-(tx+.5),cy-(ty+.5))<2.3))type='road';
    else if(nearTrail(cx,cy,cfg.trails||[]))type='road';
    else if(edge)type='coast';
    else if((cfg.hills||[]).some(region=>ellipse(cx,cy,region))&&hash(x,y)>.19)type='hill';
    else if((cfg.forests||[]).some(region=>ellipse(cx,cy,region))&&hash(x,y)>.22)type='forest';
    else type='grass';
    tiles[i]=cfg.tiles[type];
    if(!tiles[i])throw Error('Unknown terrain tile: '+type);
  }
  return {tiles,blocked};
}
