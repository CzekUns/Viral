const E=require('./engine.js');
const assert=require('node:assert/strict');
const totals={};
for(const mode of ['quick','draw']){
 let wins=[0,0],ties=0,scopes=0,draws=0;
 for(let seed=1;seed<=1000;seed++){
  const s=E.start(seed,mode), expected=mode==='draw'?40:20;
  assert.equal(s.totalPlays,expected);assert.equal(s.deck.length,mode==='draw'?20:0);
  E.validate(s);
  while(!s.finished){
    const p=s.turn;const oldDeck=s.deck.length;const choice=E.bestMove(s,p,E.rng(seed*97+s.plays+34));
    assert(choice,`No legal choice in ${mode} at ${s.plays}`);
    assert(E.legalMoves(s,p,choice.cardId).some(m=>m.key===choice.key));
    if(s.plays<2)assert.equal(choice.kind,'place');
    E.play(s,p,choice.cardId,choice.key);
    E.validate(s);
    if(mode==='draw'&&oldDeck>0){assert.equal(s.deck.length,oldDeck-1);draws++;}
  }
  assert.equal(s.plays,expected);
  assert.equal(s.deck.length,0);
  assert.equal(s.hands[0].length+s.hands[1].length,0);
  assert.equal(s.captured[0].length+s.captured[1].length+s.discard.length,expected);
  assert.equal(s.table.length,0);
  if(s.winner===null)ties++;else wins[s.winner]++;
  scopes+=s.scopes[0]+s.scopes[1];
 }
 totals[mode]={matches:1000,wins,ties,scopes,draws};
}
const base=E.start(9);assert.equal(base.mode,'quick');
assert(E.cards['spade-alchimista']);assert.equal(E.cards['spade-alchimista'].name,'Alchimista di Spade');
const s=E.start(888);s.turn=0;s.plays=2;s.hands[0]=['coppe-contadino'];s.table=[{id:'bastoni-monaco',owner:1},{id:'spade-dama',owner:1}];assert(E.attackModes(E.cards['coppe-contadino'],s.table).some(m=>m.name==='Soglia'&&m.value===16));
s.table=[{id:'bastoni-dama',owner:1},{id:'denari-re',owner:1}];assert.equal(E.defenseValue(s.table[0],s.table),8);
s.table=[{id:'coppe-alchimista',owner:1},{id:'coppe-contadino',owner:1}];assert.equal(E.defenseValue(s.table[1],s.table),6);
s.hands[0]=['spade-giullare'];s.table=[{id:'coppe-giullare',owner:1},{id:'bastoni-giullare',owner:1}];assert(E.attackModes(E.cards['spade-giullare'],s.table).some(m=>m.name==='Specchio'));
s.hands[0]=['coppe-asso'];s.table=[{id:'bastoni-asso',owner:1}];assert(E.legalMoves(s,0,'coppe-asso').some(m=>m.mode==='Identità'));
console.log(JSON.stringify(totals,null,2));
