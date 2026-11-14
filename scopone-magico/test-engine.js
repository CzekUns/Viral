const E=require('./engine.js');
const assert=require('node:assert/strict');
let summaries={matches:1000,wins:[0,0],ties:0,totalScopes:0,totalCaptured:0,types:{},attacks:{}};
function test(seed){const s=E.start(seed);E.validate(s);let ctr=0;
 while(!s.finished){if(++ctr>20)throw Error('endless');const p=s.turn;const move=E.bestMove(s,p,E.rng(seed*97+s.plays+34));assert(move,'missing move');const options=E.legalMoves(s,p,move.cardId);assert(options.some(o=>o.key===move.key));if(s.plays<2)assert.equal(move.kind,'place');if(s.plays>=2&&move.kind==='place'){for(const id of s.hands[p])if(id===move.cardId)assert(!E.legalMoves(s,p,id).some(m=>m.kind==='take'));}
 if(move.mode!=='Base'&&move.mode!=='Deposito')summaries.attacks[move.mode]=(summaries.attacks[move.mode]||0)+1;
 E.play(s,p,move.cardId,move.key);E.validate(s);
 }
 assert.equal(s.plays,20);assert.equal(s.hands[0].length,0);assert.equal(s.hands[1].length,0);assert.equal(s.table.length,0);assert.equal(s.captured[0].length+s.captured[1].length+s.discard.length,20);
 summaries.wins[s.winner??0]+=s.winner!==null?1:0;summaries.ties+=s.winner===null?1:0;summaries.totalCaptured+=s.captured[0].length+s.captured[1].length;summaries.totalScopes+=s.scopes[0]+s.scopes[1];return s;
}
for(let i=1;i<=summaries.matches;i++)test(i);
// conditions, identities, dynamic defence and cap
const state=E.start(888);state.turn=0;state.plays=2;state.hands[0]=['coppe-contadino'];state.table=[{id:'bastoni-monaco',owner:1},{id:'spade-dama',owner:1}];assert(E.attackModes(E.cards['coppe-contadino'],state.table).some(m=>m.name==='Soglia'&&m.value===16));
state.table=[{id:'bastoni-dama',owner:1},{id:'denari-re',owner:1}];assert.equal(E.defenseValue(state.table[0],state.table),8);
state.table=[{id:'coppe-mago',owner:1},{id:'coppe-contadino',owner:1},{id:'denari-re',owner:1}];assert.equal(E.defenseValue(state.table[1],state.table),6);
state.hands[0]=['spade-giullare'];state.table=[{id:'coppe-giullare',owner:1},{id:'bastoni-giullare',owner:1}];assert(E.attackModes(E.cards['spade-giullare'],state.table).some(m=>m.name==='Specchio'));
state.hands[0]=['coppe-asso'];state.table=[{id:'bastoni-asso',owner:1}];assert(E.legalMoves(state,0,'coppe-asso').some(m=>m.mode==='Identità'));
console.log(JSON.stringify(summaries,null,2));
