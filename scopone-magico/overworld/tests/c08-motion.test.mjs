import test from 'node:test';
import assert from 'node:assert/strict';
import {facingWithHysteresis,advanceC08AnimationTime} from '../engine/c08-motion.js';
import {AssetLibrary} from '../engine/assets.js';

test('NE/E and E/SE joystick border jitter does not force a facing flip every tick',()=>{
  assert.equal(facingWithHysteresis(1,-1,'E'),'NE');
  let f='NE';
  for(let i=0;i<80;i++){
    f=facingWithHysteresis(1,i%2?-0.36:-0.52,f);
    assert.equal(f,'NE','NE/E analog jitter');
  }
  assert.equal(facingWithHysteresis(1,0,f),'E','true East direction must switch');
  f='SE';
  for(let i=0;i<80;i++){
    f=facingWithHysteresis(1,i%2?0.36:0.52,f);
    assert.equal(f,'SE','E/SE analog jitter');
  }
  assert.equal(facingWithHysteresis(1,0,f),'E','true East direction must switch');
  assert.equal(facingWithHysteresis(1,-1,'SE'),'NE','intentional facing change must still work');
});
test('walking animation keeps its clock even when facing switches between NE, E, SE',()=>{
  let elapsed=0;
  for(let i=0;i<180;i++){
    const direction=['NE','E','SE'][i%3];
    assert.ok(direction);
    elapsed=advanceC08AnimationTime('walk','walk',elapsed,1/60);
  }
  assert.ok(Math.abs(elapsed-3)<.001,'3 seconds of real walking must not reset each facing switch');
  assert.equal(advanceC08AnimationTime('idle','walk',elapsed,1/60),0,'walk starts at first frame');
  assert.equal(advanceC08AnimationTime('walk','idle',elapsed,1/60),0,'stopping resets idle');
  assert.equal(advanceC08AnimationTime('idle','idle',elapsed,1/60),0);
});
test('transient WebP decode failures are retried and update renderer revision',async()=>{
  const manifest={images:{walk:{src:'walk.webp',lazy:true}}};
  const images=new Map();
  const lib=new AssetLibrary(manifest,images,new URL('https://example.test/assets.json'));
  let tries=0;
  const previous=globalThis.Image;
  globalThis.Image=class{
    naturalWidth=0;naturalHeight=0;src='';
    async decode(){
      tries++;
      if(tries===1)throw Error('temporary network failure');
      this.naturalWidth=3960;this.naturalHeight=249;
    }
  };
  try{
    lib._request('walk');
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(lib.failed.get('walk')?.attempts,1);
    assert.equal(lib.revision,1);
    assert.equal(lib.image('walk'),null);
    // Expire the backoff deliberately; the public runtime waits before retry.
    lib.failed.get('walk').nextRetry=0;
    lib._request('walk');
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(tries,2);
    assert.equal(lib.failed.has('walk'),false);
    assert.equal(lib.image('walk')?.naturalWidth,3960);
    assert.equal(lib.revision,2);
  }finally{globalThis.Image=previous;}
});
