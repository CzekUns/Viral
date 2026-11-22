import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectWalkCandidates} from '../engine/frame-candidates.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'assets.json'),'utf8'));
const items=JSON.parse(readFileSync(path.join(root,'catalogo-sprite-data.json'),'utf8')).items;

test('S08 East has no extra East walking frames, but 2 standing and 28 frames from other directions',()=>{
 const p=collectWalkCandidates(items,manifest,'s08-player','E');
 assert.equal(p.counts.sameWalkFrames,0);
 assert.equal(p.counts.sameWalkFiles,0);
 assert.equal(p.counts.standingFrames,2);
 assert.equal(p.counts.otherWalkFrames,28);
 assert.equal(p.counts.unusedSameDirectionFrames,1); // V01 historical standing
 assert.deepEqual(p.sameStanding.map(x=>x.version).sort(),['Spade V01','Spade V02 mani libere']);
 assert.equal(p.otherWalk.NE[0].frames,4);
 assert.equal(p.src,'characters/s08/v02-handsfree-test/walk/E.webp');
});
test('B08 East exposes authentic R01 replacement strips and single candidate frame',()=>{
 const p=collectWalkCandidates(items,manifest,'b08-player','E');
 assert.equal(p.counts.sameWalkFiles,2);
 assert.equal(p.counts.sameWalkFrames,5);
 assert.ok(p.sameWalk.every(x=>!x.inAnyAvatar));
 assert.equal(p.counts.standingFrames,1);
 assert.equal(p.counts.otherWalkFrames,34); // includes NW R02 candidates
 assert.ok(p.sameWalk.some(x=>x.src.endsWith('/E_frame04_candidate.webp')&&x.frames===1));
});
test('B08 NW retains real R02 4-frame strip plus two individual new poses',()=>{
 const p=collectWalkCandidates(items,manifest,'b08-player','NW');
 assert.equal(p.counts.sameWalkFiles,3);
 assert.equal(p.counts.sameWalkFrames,6);
 assert.ok(p.sameWalk.some(x=>x.src.endsWith('NW_frame01_candidate.webp')));
 assert.ok(p.sameWalk.some(x=>x.src.endsWith('NW_frame02_candidate.webp')));
});
test('D08 East has no other East walk sources while C08 has several valid alternate East walks',()=>{
 const d=collectWalkCandidates(items,manifest,'d08-player','E');
 assert.equal(d.counts.sameWalkFrames,0);
 assert.equal(d.counts.standingFrames,1);
 assert.equal(d.counts.otherWalkFrames,28);
 const c=collectWalkCandidates(items,manifest,'c08-v02-player','E');
 assert.ok(c.counts.sameWalkFrames>=20);
 assert.ok(c.sameWalk.some(x=>x.src.includes('v04-stabilized/')));
});
test('Invalid avatar and direction cannot silently fall through',()=>{
 assert.throws(()=>collectWalkCandidates(items,manifest,'bad','E'));
 assert.throws(()=>collectWalkCandidates(items,manifest,'s08-player','BAD'));
});
