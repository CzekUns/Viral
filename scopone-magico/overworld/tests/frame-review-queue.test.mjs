import test from 'node:test';
import assert from 'node:assert/strict';
import {
 REDO_STORAGE_KEY,frameReviewKey,validReview,normalizeReviewQueue,addReviewMarks,
 removeReviewMarks,readReviewQueue,saveReviewQueue,formatReviewQueue
} from '../engine/frame-review-queue.js';
const src='characters/b08/v01-handsfree-test/walk/E.webp';
const b=(frame)=>({avatar:'b08-player',direction:'E',src,frame});
const c=(frame)=>({avatar:'c08-v02-player',direction:'NW',
 src:'characters/c08/v02-compact-test/walk/NW.webp',frame});
function storage(){
 const rows=new Map();
 return {
  getItem:key=>rows.get(key)||null,
  setItem:(key,value)=>rows.set(key,value),
  rows
 };
}
test('Can mark any set of frames from one animation with a shared note',()=>{
 const marked=addReviewMarks([], [b(0),b(2),b(3)],{note:'piede a nord, deve guardare est',savedAt:'2026-11-22T09:00:00Z'});
 assert.equal(marked.length,3);
 assert.deepEqual(marked.map(m=>m.frame),[0,2,3]);
 assert.ok(marked.every(m=>m.note==='piede a nord, deve guardare est'));
 assert.ok(marked.every(m=>m.savedAt==='2026-11-22T09:00:00Z'));
 const again=addReviewMarks(marked,[b(2)],{savedAt:'2026-11-22T10:00:00Z'});
 assert.equal(again.length,3,'No duplicated marks on repeated selection');
 assert.equal(again.find(x=>x.frame===2).note,'piede a nord, deve guardare est','Note should persist unless replaced');
 const revised=addReviewMarks(again,[b(2)],{note:'TEST: la gamba cade'});
 assert.equal(revised.find(x=>x.frame===2).note,'TEST: la gamba cade');
});
test('Separate character/direction identity, stable across list order',()=>{
 const marks=addReviewMarks([c(1)], [b(1),b(3)]);
 assert.equal(marks.length,3);
 assert.notEqual(frameReviewKey(b(1)),frameReviewKey(c(1)));
 const withoutOne=removeReviewMarks(marks,[b(1)]);
 assert.equal(withoutOne.length,2);
 assert.ok(withoutOne.some(x=>x.avatar==='c08-v02-player'));
 assert.ok(withoutOne.some(x=>x.avatar==='b08-player'&&x.frame===3));
});
test('Saving and reloading persists all marked frames even when switching avatars',()=>{
 const mock=storage();
 let queue=addReviewMarks([], [b(0),b(1),c(3)],{note:'Da ridisegnare'});
 queue=saveReviewQueue(mock,queue);
 assert.equal(mock.rows.has(REDO_STORAGE_KEY),true);
 assert.deepEqual(readReviewQueue(mock),queue);
 assert.deepEqual(JSON.parse(mock.getItem(REDO_STORAGE_KEY)).map(x=>x.frame),[0,1,3]);
 saveReviewQueue(mock,removeReviewMarks(queue,[c(3)]));
 assert.equal(readReviewQueue(mock).length,2);
});
test('Handles invalid entries, corrupted localStorage and never accepts arbitrary paths',()=>{
 const fake=storage();fake.setItem(REDO_STORAGE_KEY,'not JSON');
 assert.deepEqual(readReviewQueue(fake),[]);
 assert.equal(validReview({...b(0),frame:-1}),false);
 assert.equal(validReview({...b(0),frame:42}),false);
 assert.equal(validReview({...b(0),src:'../evil.html'}),false);
 assert.equal(validReview({...b(0),avatar:'unknown'}),false);
 assert.deepEqual(normalizeReviewQueue([{...b(0),src:'../evil.html'},b(0)]).map(x=>x.frame),[0]);
 assert.deepEqual(normalizeReviewQueue(null),[]);
});
test('Copy report contains exact source, individual frame number, optional notes and redo state',()=>{
 const queue=addReviewMarks([b(0),b(2)], [c(3)],{note:'il braccio cambia verso'});
 const text=formatReviewQueue(queue,{
  'b08-player':'8 Bastoni V01','c08-v02-player':'8 Coppe V02 compatto'
 });
 assert.match(text,/SCOPONE ALCHEMICO — ELENCO FOTOGRAMMI DA RIFARE/);
 assert.match(text,/Stato: DA RIFARE/);
 assert.match(text,/Totale: 3/);
 assert.match(text,/8 Bastoni V01 · DIREZIONE: E/);
 assert.match(text,/SPRITESHEET: characters\/b08\/v01-handsfree-test\/walk\/E\.webp/);
 assert.match(text,/Fotogramma 1 \(indice 0\)/);
 assert.match(text,/Fotogramma 3 \(indice 2\)/);
 assert.match(text,/8 Coppe V02 compatto · DIREZIONE: NW/);
 assert.match(text,/Fotogramma 4 \(indice 3\) — il braccio cambia verso/);
 assert.match(text,/NON sostituzioni già approvate/);
});
