/* VIRAL — Macro material renderer. Original procedural art, no external assets. */
window.ViralArt = (() => {
  "use strict";
  const materialCache = new Map();
  let tablePattern = null;
  const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => {
    let h = Math.imul(a + 0x7ed55d16, 0x85ebca6b) ^ Math.imul(b + 0x632be59b, 0xc2b2ae35);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967295;
  };
  const rgba = (hex, a=1) => {
    const s = hex.replace("#","");
    return "rgba(" + parseInt(s.slice(0,2),16) + "," + parseInt(s.slice(2,4),16) + "," + parseInt(s.slice(4,6),16) + "," + a + ")";
  };
  function round(ctx,x,y,w,h,r) {
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }
  function makeNoiseCanvas(kind, pal) {
    const size=256, c=document.createElement("canvas");c.width=c.height=size;
    const dc=c.getContext("2d");
    const im=dc.createImageData(size,size), arr=im.data;
    const color = kind==="soap" ? pal.main : "#b6b0a7";
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    const offset=kind==="soap"?19:12;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const k=(y*size+x)*4;
      const a=(rnd(x,y)-.5)*offset;
      const b=(rnd(x>>2,y>>2)-.5)*13;
      const vein=Math.sin((x+y*.48)*.20+Math.sin(y*.039)*1.4)*1.6;
      const pores=(rnd(x*3+8,y*9+3)>.984 ? -17 : 0);
      arr[k]=clamp(rgb[0]+a+b+vein+pores,0,255);
      arr[k+1]=clamp(rgb[1]+a+b+vein+pores,0,255);
      arr[k+2]=clamp(rgb[2]+a+b+vein+pores,0,255);
      arr[k+3]=255;
    }
    dc.putImageData(im,0,0);
    return c;
  }
  function getMaterial(ctx,pal) {
    if (!materialCache.has(pal.main)) materialCache.set(pal.main, makeNoiseCanvas("soap",pal));
    return ctx.createPattern(materialCache.get(pal.main),"repeat");
  }
  function background(ctx,w,h) {
    if(!tablePattern) tablePattern=makeNoiseCanvas("table");
    const g=ctx.createRadialGradient(w*.42,h*.31,10,w*.5,h*.55,Math.max(w*.9,h*.72));
    g.addColorStop(0,"#dedad3");g.addColorStop(.54,"#cbc5bc");g.addColorStop(1,"#a8a298");
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalAlpha=.17;ctx.fillStyle=ctx.createPattern(tablePattern,"repeat");ctx.fillRect(0,0,w,h);ctx.restore();
    const beam=ctx.createLinearGradient(0,0,w,h);
    beam.addColorStop(0,"#ffffff53");beam.addColorStop(.32,"#ffffff07");beam.addColorStop(1,"#504e4914");
    ctx.fillStyle=beam;ctx.fillRect(0,0,w,h);
    const vignette=ctx.createRadialGradient(w*.49,h*.5,Math.min(w,h)*.2,w*.49,h*.5,h*.79);
    vignette.addColorStop(0,"#1e1b1700");vignette.addColorStop(1,"#514b4249");
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function beveledFace(ctx,x,y,w,h,pal) {
    const side=ctx.createLinearGradient(x,y,x+w,y+h+20);
    side.addColorStop(0,pal.main);side.addColorStop(.45,pal.dark);side.addColorStop(1,"#634840");
    round(ctx,x+3,y+18,w-4,h,23);ctx.fillStyle=side;ctx.fill();
    const front=ctx.createLinearGradient(x,y+h,x+w*.3,y+h+21);
    front.addColorStop(0,rgba(pal.dark,.20));front.addColorStop(1,rgba(pal.dark,.65));
    round(ctx,x+3,y+8,w-4,h+11,22);ctx.fillStyle=front;ctx.fill();
    const rim=ctx.createLinearGradient(x,y,x+w,y+h);
    rim.addColorStop(0,pal.light);rim.addColorStop(.21,pal.main);rim.addColorStop(.75,pal.main);rim.addColorStop(1,pal.dark);
    round(ctx,x,y,w,h,24);ctx.fillStyle=rim;ctx.fill();
    ctx.save();round(ctx,x,y,w,h,24);ctx.clip();
    const sp=ctx.createLinearGradient(x,y,x+w,y+h);
    sp.addColorStop(0,"#fffaf087");sp.addColorStop(.34,"#ffffff08");sp.addColorStop(1,"#50331f38");
    ctx.fillStyle=sp;ctx.fillRect(x,y,w,h);
    const material=getMaterial(ctx,pal);
    ctx.globalAlpha=.31;ctx.fillStyle=material;ctx.fillRect(x,y,w,h);ctx.restore();
    ctx.save();ctx.strokeStyle="#fffaf0a1";ctx.lineWidth=2;
    round(ctx,x+2,y+2,w-4,h-4,22);ctx.stroke();
    ctx.strokeStyle=rgba(pal.dark,.40);ctx.lineWidth=2;
    round(ctx,x+6,y+6,w-12,h-12,19);ctx.stroke();ctx.restore();
  }
  function cutWell(ctx,xx,yy,cw,ch,pal,r,c) {
    const inset=.9;
    ctx.save();
    // Fractured, recessed soap is still the soap's own color; it is not a black hole.
    ctx.beginPath();
    ctx.moveTo(xx+inset,yy+inset+2);
    const n=5;
    for(let k=1;k<=n;k++) {
      const cx=xx+(cw-2*inset)*k/n+inset;
      ctx.lineTo(cx,yy+inset+(rnd(c*23+k,r*3)-.5)*2.6);
    }
    for(let k=1;k<=n;k++) {
      ctx.lineTo(xx+cw-inset+(rnd(c+5,r+k*7)-.5)*2,yy+inset+(ch-2*inset)*k/n);
    }
    for(let k=n-1;k>=0;k--) {
      ctx.lineTo(xx+inset+(cw-2*inset)*k/n,yy+ch-inset+(rnd(c*3+k,r*11)-.5)*2.8);
    }
    for(let k=n-1;k>=0;k--) {
      ctx.lineTo(xx+inset+(rnd(c+k*9,r)-.5)*2.4,yy+inset+(ch-2*inset)*k/n);
    }
    ctx.closePath();
    const pit=ctx.createLinearGradient(xx,yy,xx+cw*.6,yy+ch);
    pit.addColorStop(0,rgba(pal.dark,.96));pit.addColorStop(.34,rgba(pal.main,.96));pit.addColorStop(1,rgba(pal.light,.82));
    ctx.fillStyle=pit;ctx.fill();
    ctx.clip();
    ctx.globalAlpha=.31;ctx.fillStyle=getMaterial(ctx,pal);ctx.fillRect(xx,yy,cw,ch);ctx.globalAlpha=1;
    ctx.strokeStyle=rgba(pal.dark,.48);ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(xx+1,yy+ch-1);ctx.lineTo(xx+1,yy+1);ctx.lineTo(xx+cw-1,yy+1);ctx.stroke();
    ctx.strokeStyle="#fff2e55f";ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(xx+2,yy+ch-2);ctx.lineTo(xx+cw-1,yy+ch-2);ctx.lineTo(xx+cw-1,yy+2);ctx.stroke();
    // Imperfect soap fracture streaks on the freshly exposed layer.
    for(let k=0;k<3;k++){
      const qx=xx+cw*(.12+rnd(c*17+k,r*11)*.70), qy=yy+ch*(.16+rnd(c,r*9+k)*.67);
      ctx.globalAlpha=.11;ctx.strokeStyle=pal.dark;ctx.lineWidth=.6;
      ctx.beginPath();ctx.moveTo(qx,qy);ctx.lineTo(qx+cw*.2,qy+ch*.13);ctx.stroke();
    }
    ctx.restore();
  }
  function intactCell(ctx,xx,yy,cw,ch,pal,r,c) {
    ctx.save();
    const gap=.68;
    const grad=ctx.createLinearGradient(xx,yy,xx+cw*.75,yy+ch);
    grad.addColorStop(0,rgba(pal.light,.95));
    grad.addColorStop(.22,rgba(pal.main,.96));
    grad.addColorStop(1,rgba(pal.main,1));
    ctx.fillStyle=grad;
    ctx.fillRect(xx+gap,yy+gap,cw-2*gap,ch-2*gap);
    ctx.save();
    ctx.beginPath();ctx.rect(xx+gap,yy+gap,cw-2*gap,ch-2*gap);ctx.clip();
    ctx.globalAlpha=.20;ctx.fillStyle=getMaterial(ctx,pal);ctx.fillRect(xx,yy,cw,ch);
    ctx.restore();
    ctx.strokeStyle=rgba(pal.dark,.28);ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(xx+cw-.8,yy+1);ctx.lineTo(xx+cw-.8,yy+ch-1);ctx.lineTo(xx+1,yy+ch-.8);ctx.stroke();
    ctx.strokeStyle="#fffcf6ad";ctx.lineWidth=.76;
    ctx.beginPath();ctx.moveTo(xx+1,yy+ch-1);ctx.lineTo(xx+1,yy+1);ctx.lineTo(xx+cw-1,yy+1);ctx.stroke();
    // Very small air holes and wax-like glints, deterministic across frames.
    for(let k=0;k<3;k++) {
      const qx=xx+4+rnd(c*31+k*19,r*7)*(cw-8);
      const qy=yy+3+rnd(c*5+k*13,r*23)*(ch-6);
      const size=.25+rnd(c+k,r+k)*.55;
      ctx.fillStyle=k===0?rgba(pal.dark,.35):"#fffdf75e";
      ctx.beginPath();ctx.arc(qx,qy,size,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function soap(ctx,geo,pal,cells,w,h) {
    const {x,y,bw,bh,x0,y0,cw,ch}=geo;
    if(!bw||!bh)return;
    ctx.save();
    // Large diffused studio shadow across the tabletop.
    ctx.filter="blur(18px)";
    ctx.fillStyle="#3a2e2674";
    ctx.beginPath();ctx.ellipse(x+bw*.56,y+bh+24,bw*.57,21,-.05,0,Math.PI*2);ctx.fill();
    ctx.filter="none";
    ctx.shadowColor="#3a261d72";ctx.shadowBlur=25;ctx.shadowOffsetX=7;ctx.shadowOffsetY=16;
    round(ctx,x+4,y+17,bw,bh,24);ctx.fillStyle=pal.dark;ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
    beveledFace(ctx,x,y,bw,bh,pal);
    ctx.save();round(ctx,x+6,y+5,bw-12,bh-11,18);ctx.clip();
    const rectRows=12, rectCols=8;
    const spanW=(bw-16)/rectCols,spanH=(bh-16)/rectRows;
    // Soft scored soap blocks — not individual floating tiles.
    for(const cell of cells){
      const xx=x0+cell.c*cw,yy=y0+cell.r*ch;
      if(cell.cut)cutWell(ctx,xx,yy,cw,ch,pal,cell.r,cell.c);
      else intactCell(ctx,xx,yy,cw,ch,pal,cell.r,cell.c);
    }
    ctx.restore();
    ctx.save();
    const shine=ctx.createLinearGradient(x,y,x+bw*.45,y+bh*.8);
    shine.addColorStop(0,"#fffbefb3");shine.addColorStop(.45,"#ffffee20");shine.addColorStop(1,"#ffffff00");
    ctx.strokeStyle=shine;ctx.lineWidth=4;
    round(ctx,x+9,y+9,bw-18,bh-18,17);ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  function fragment(ctx,p,alpha,pal){
    const ww=p.ww, hh=p.hh;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=alpha;
    ctx.shadowColor="#49352d58";ctx.shadowBlur=4;ctx.shadowOffsetY=3;
    // Some fragments fold into curved thin shavings; others fall as jagged chips.
    const kind=p.kind===undefined ? (p.ww>20?"curl":"chunk") : p.kind;
    if(kind==="curl"){
      ctx.lineCap="round";ctx.lineJoin="round";
      ctx.strokeStyle=p.fill;ctx.lineWidth=Math.max(4,hh*.46);
      ctx.beginPath();ctx.moveTo(-ww*.5,-hh*.16);ctx.bezierCurveTo(-ww*.22,-hh*.72,ww*.2,hh*.7,ww*.5,-hh*.12);ctx.stroke();
      ctx.shadowBlur=0;ctx.strokeStyle="#fff6e7ad";ctx.lineWidth=Math.max(1,hh*.12);
      ctx.beginPath();ctx.moveTo(-ww*.45,-hh*.21);ctx.bezierCurveTo(-ww*.18,-hh*.70,ww*.18,hh*.67,ww*.48,-hh*.15);ctx.stroke();
      ctx.strokeStyle=rgba(pal.dark,.45);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(-ww*.49,-hh*.05);ctx.bezierCurveTo(-ww*.18,-hh*.57,ww*.18,hh*.85,ww*.47,0);ctx.stroke();
    }else{
      const g=ctx.createLinearGradient(-ww/2,-hh/2,ww/2,hh/2);
      g.addColorStop(0,pal.light);g.addColorStop(.26,p.fill);g.addColorStop(1,pal.dark);
      ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(-ww*.48,-hh*.31);ctx.lineTo(ww*.12,-hh*.51);ctx.lineTo(ww*.5,-hh*.14);
      ctx.lineTo(ww*.36,hh*.42);ctx.lineTo(-ww*.21,hh*.48);ctx.lineTo(-ww*.5,hh*.12);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle=rgba(pal.dark,.58);
      ctx.beginPath();ctx.moveTo(-ww*.21,hh*.48);ctx.lineTo(ww*.36,hh*.42);ctx.lineTo(ww*.49,-hh*.14);ctx.lineTo(ww*.45,hh*.48);ctx.lineTo(-ww*.19,hh*.55);ctx.closePath();ctx.fill();
      ctx.strokeStyle="#fff8eb99";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-ww*.43,-hh*.24);ctx.lineTo(ww*.12,-hh*.45);ctx.lineTo(ww*.44,-hh*.10);ctx.stroke();
    }
    ctx.restore();
  }
  function chips(ctx,chips,pal,frame,h){
    for(let i=chips.length-1;i>=0;i--){
      const p=chips[i];
      p.x+=p.vx*frame;p.y+=p.vy*frame;
      p.vy+=.24*frame;p.vx*=.992;p.rot+=p.spin*frame;p.age+=frame;
      if(p.y>h-16){p.y=h-16;p.vy*= -.20;p.vx*=.78;}
      if(p.age>p.life){chips.splice(i,1);continue;}
      const alpha=clamp((p.life-p.age)/Math.min(p.life*.30,28));
      fragment(ctx,p,alpha,pal);
    }
  }
  function powder(ctx,dust,frame){
    for(let i=dust.length-1;i>=0;i--){
      const p=dust[i];p.x+=p.vx*frame;p.y+=p.vy*frame;p.vy+=.15*frame;p.age+=frame;
      if(p.age>p.life){dust.splice(i,1);continue;}
      ctx.globalAlpha=clamp(1-p.age/p.life);
      ctx.fillStyle=p.fill;ctx.beginPath();ctx.arc(p.x,p.y,p.size*.53,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function knife(ctx,mouse){
    if(!mouse.down)return;
    ctx.save();ctx.translate(mouse.x,mouse.y);
    ctx.rotate(mouse.angle+.64);
    ctx.shadowColor="#22242488";ctx.shadowBlur=10;ctx.shadowOffsetX=5;ctx.shadowOffsetY=7;
    // Long steel edge, point located exactly at the finger's cutting contact.
    const steel=ctx.createLinearGradient(-70,-32,-9,17);
    steel.addColorStop(0,"#454e51");steel.addColorStop(.26,"#f8faf5");
    steel.addColorStop(.58,"#b5bec1");steel.addColorStop(.81,"#f1f7fa");steel.addColorStop(1,"#666e6f");
    ctx.fillStyle=steel;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-61,-16);ctx.lineTo(-82,-34);ctx.lineTo(-71,-45);ctx.lineTo(-26,-29);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle="#f4f8f8";ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-61,-16);ctx.lineTo(-82,-34);ctx.stroke();
    ctx.strokeStyle="#535c60ad";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-26,-29);ctx.lineTo(-65,-39);ctx.stroke();
    // Brushed rubber utility handle with satin metal ferrule.
    const grip=ctx.createLinearGradient(-130,-75,-60,-20);
    grip.addColorStop(0,"#343a3d");grip.addColorStop(.40,"#171e23");grip.addColorStop(.73,"#454d52");grip.addColorStop(1,"#11171b");
    ctx.save();ctx.translate(-73,-38);ctx.rotate(.38);
    round(ctx,-78,-15,91,30,6);ctx.fillStyle=grip;ctx.fill();
    ctx.strokeStyle="#8b9697a6";ctx.lineWidth=1;round(ctx,-78,-15,91,30,6);ctx.stroke();
    ctx.fillStyle="#a0a9ac";ctx.fillRect(-4,-14,10,28);
    ctx.fillStyle="#565f61";
    for(let i=0;i<6;i++){ctx.fillRect(-65+i*9,-10,3,20);}
    ctx.fillStyle="#9da6a5";ctx.beginPath();ctx.arc(-70,0,2.4,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  return { background, soap, chips, powder, knife };
})();