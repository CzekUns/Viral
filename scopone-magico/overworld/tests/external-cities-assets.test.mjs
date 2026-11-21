import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets=JSON.parse(readFileSync(resolve(root,'assets.json'),'utf8'));
const world=JSON.parse(readFileSync(resolve(root,'maps/external/world.json'),'utf8'));
const required=['napoli','pozzuoli','torre','caserta','sorrento','salerno'];

test('all six outside cities use their own large transparent raster asset',()=>{
 assert.deepEqual(world.cities.map(city=>city.id).sort(),[...required].sort());
 for(const city of world.cities){
  assert.equal(city.assetId,'outer-city-'+city.id);
  assert.ok(city.renderSize[0]>=150&&city.renderSize[1]>=150,'renderSize for '+city.id);
  const spec=assets.images[city.assetId];
  assert.equal(spec?.type,'prop');
  assert.deepEqual(spec?.anchor,[0.5,0.96]);
  assert.ok(spec.src.endsWith('/'+city.id+'.webp'));
  assert.ok(existsSync(resolve(root,spec.src)),'missing image '+spec.src);
 }
});

test('city triggers remain in same cells and old generic asset remains for rollback',()=>{
 assert.ok(assets.images['outer-city'].src.endsWith('town.svg'));
 assert.deepEqual(world.cities.map(({id,x,y})=>[id,x,y]),[
 ['napoli',48,39],['pozzuoli',29,43],['torre',67,47],
 ['caserta',52,17],['sorrento',82,71],['salerno',92,64]
 ]);
});
