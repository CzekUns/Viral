import {normalize} from './geometry.js';
export class TouchControls {
  constructor(root){
    this.root=root;this.knob=root.querySelector('.joystick-knob');this.dx=0;this.dy=0;this.pointerId=null;
    const update=e=>{
      const rect=root.getBoundingClientRect(),centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;
      const max=rect.width*.32;
      let dx=e.clientX-centerX,dy=e.clientY-centerY;
      const length=Math.hypot(dx,dy);
      if(length>max){dx*=max/length;dy*=max/length;}
      this.dx=dx/max;this.dy=dy/max;
      this.knob.style.transform=`translate(${dx}px,${dy}px)`;
    };
    root.addEventListener('pointerdown',e=>{
      e.preventDefault();if(this.pointerId!==null)return;
      this.pointerId=e.pointerId;root.setPointerCapture(e.pointerId);update(e);
    });
    root.addEventListener('pointermove',e=>{if(e.pointerId===this.pointerId){e.preventDefault();update(e);}});
    const finish=e=>{if(e.pointerId===this.pointerId){this.pointerId=null;this.dx=0;this.dy=0;this.knob.style.transform='translate(0,0)';}};
    root.addEventListener('pointerup',finish);root.addEventListener('pointercancel',finish);root.addEventListener('lostpointercapture',finish);
    this.keys=new Set();
    this.onKeyDown=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}};
    this.onKeyUp=e=>{this.keys.delete(e.code);};
    window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);
  }
  getVector(){
    let x=this.dx,y=this.dy;
    if(this.keys.has('ArrowRight')||this.keys.has('KeyD'))x+=1;
    if(this.keys.has('ArrowLeft')||this.keys.has('KeyA'))x-=1;
    if(this.keys.has('ArrowDown')||this.keys.has('KeyS'))y+=1;
    if(this.keys.has('ArrowUp')||this.keys.has('KeyW'))y-=1;
    if(Math.hypot(x,y)<.15)return{x:0,y:0};return normalize(x,y);
  }
  dispose(){window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);}
}
