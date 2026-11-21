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
/** Returns stable graphic IDs computed once per zone, not per frame.
 * version=v03 or ?terrain=v03 preserves the approved flat V03 map;
 * ?terrain=legacy also keeps the previous SVG rollback. */
const EDGE_STEPS=[['nw',-1,0],['ne',0,-1],['se',1,0],['sw',0,1]];
export function buildTerrain(zone,options={}){
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
  const tiles=new Array(width*height),types=new Array(width*height),blocked=new Uint8Array(width*height);
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
    types[i]=type;
    tiles[i]=cfg.tiles[type];
    if(!tiles[i])throw Error('Unknown terrain tile: '+type);
  }
  const requested=options.version??(typeof window!=='undefined'
    ?new URLSearchParams(window.location.search).get('terrain'):null);
  if(requested==='legacy'||requested==='v03')return {tiles,blocked};

  // These directions are map-grid neighbors of the 30-degree diamond sides.
  const terrainAt=(x,y)=>x>=0&&y>=0&&x<width&&y<height?types[y*width+x]:null;
  const roadPiece=(x,y)=>{
    if(!cfg.roadPieces)return null;
    // Do not replace broad city plazas or roads passing through rocky biomes.
    if((cfg.cities||[]).some(([cx,cy])=>Math.hypot(x-cx,y-cy)<3.5))return null;
    const state=Object.fromEntries(EDGE_STEPS.map(([d,dx,dy])=>[d,terrainAt(x+dx,y+dy)]));
    if(Object.values(state).some(v=>v!=='road'&&v!=='grass'))return null;
    const exits=EDGE_STEPS.map(([d])=>d).filter(d=>state[d]==='road');
    const key=exits.length===4?'cross':
      exits.length===2&&exits.includes('ne')&&exits.includes('sw')?'ne-sw':
      exits.length===2&&exits.includes('nw')&&exits.includes('se')?'nw-se':
      exits.length===2&&exits.includes('ne')&&exits.includes('se')?'bend-ne-se':
      exits.length===1&&exits[0]==='ne'?'end-ne':null;
    return key?cfg.roadPieces[key]||null:null;
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,type=types[i];
    if(type==='road'){
      const path=roadPiece(x,y);
      if(path){tiles[i]=path;continue;}
    }
    // Four equally weighted base/variation choices; stable across frames,
    // sessions, scrolling, chunks and zoom changes.
    const variants=cfg.variants?.[type]||[];
    const choice=Math.floor(hash(x+89,y+157)*(variants.length+1));
    if(choice)tiles[i]=variants[choice-1];
    const transitions=cfg.transitions?.[type];
    if(!transitions)continue;
    const priority=type==='grass'?['coast','road','hill','forest']:
      type==='coast'?['shallow']:type==='shallow'?['sea']:[];
    for(const other of priority){
      const prefix=transitions[other];
      if(!prefix)continue;
      const sides=EDGE_STEPS.filter(([,dx,dy])=>terrainAt(x+dx,y+dy)===other);
      if(!sides.length)continue;
      const index=Math.floor(hash(x+271,y+343)*sides.length);
      tiles[i]=prefix+'-'+sides[index][0];
      break;
    }
  }
  return {tiles,blocked};
}
