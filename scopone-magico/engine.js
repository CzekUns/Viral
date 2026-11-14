/* Scopone Magico — prototype game engine, browser + Node. No dependencies. */
(function(root, factory){const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api; root.ScoponeEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SUITS=[{id:'coppe',name:'Coppe',symbol:'🏆',color:'#b64e36'},{id:'bastoni',name:'Bastoni',symbol:'♣',color:'#47856b'},{id:'spade',name:'Spade',symbol:'⚔',color:'#6686b7'},{id:'denari',name:'Denari',symbol:'✺',color:'#d4a849'}];
const TYPES=[{id:'asso',name:'Asso',v:1,order:0},{id:'contadino',name:'Contadino',v:2,order:1},{id:'monaco',name:'Monaco',v:3,order:2},{id:'dama',name:'Dama',v:4,order:3},{id:'giullare',name:'Giullare',v:5,order:4},{id:'mago',name:'Mago',v:6,order:5},{id:'numerale',name:'Numerale',v:7,order:6},{id:'fante',name:'Fante',v:8,order:7},{id:'cavallo',name:'Cavallo',v:9,order:8},{id:'re',name:'Re',v:10,order:9}];
const NUMERALS={coppe:2,bastoni:3,spade:5,denari:7};
const cards=Object.fromEntries(SUITS.flatMap(s=>TYPES.map(t=>{const n=t.id==='numerale'?NUMERALS[s.id]:t.v;return [`${s.id}-${t.id}`,{id:`${s.id}-${t.id}`,suit:s.id,type:t.id,name:t.id==='numerale'?`${n} di ${s.name}`:`${t.name} di ${s.name}`,number:n,base:t.v,order:t.order}]})));
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function start(seed=Date.now()>>>0){const random=rng(seed);const shuffled=Object.keys(cards);for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];} const dealt=shuffled.slice(0,20);return{seed,turn:0,plays:0,hands:[dealt.slice(0,10),dealt.slice(10,20)],table:[],captured:[[],[]],scopes:[0,0],lastTaker:null,finished:false,winner:null,history:[],discard:[],openingNoCapture:2};}
function defenseValue(tableCard, table){const c=cards[tableCard.id];let v=c.type==='asso'?10:c.type==='numerale'?(tableCard.defenseChoice??7):c.base;
 if(c.type==='dama'&&table.some(t=>cards[t.id].type==='re'))v*=2;
 if(v<6&&table.some(t=>{const d=cards[t.id];return d.type==='mago'&&d.suit===c.suit;}))v=6;
 return Math.max(1,Math.min(40,v));}
function tableValues(table){return table.map(t=>({id:t.id,value:defenseValue(t,table)}));}
function attackModes(c,table){const modes=[{name:'Base',value:c.type==='asso'?1:c.base,mirror:false}];if(c.type==='contadino'&&table.some(t=>cards[t.id].type==='monaco')&&table.some(t=>cards[t.id].type==='dama'))modes.push({name:'Soglia',value:16,mirror:false});
 if(c.type==='monaco'&&table.some(t=>cards[t.id].suit===c.suit))modes.push({name:'Affinità',value:6,mirror:false});
 if(c.type==='giullare'&&table.some(t=>cards[t.id].type==='giullare'&&cards[t.id].suit!==c.suit))modes.push({name:'Specchio',value:5,mirror:true});return modes;}
function sameType(a,b){return cards[a].type===cards[b].type;}
function moveKey(m){return `${m.kind}|${m.mode}|${m.take.join(',')}|${m.defenseChoice??''}`;}
function legalMoves(state,player,cardId){if(state.finished||player!==state.turn||!state.hands[player].includes(cardId))return[];
 const card=cards[cardId];const table=state.table;const options=[];const keys=new Set();function add(m){m.key=moveKey(m);if(!keys.has(m.key)){keys.add(m.key);options.push(m);}}
 if(state.plays>=state.openingNoCapture){for(const t of table){if(sameType(t.id,cardId))add({kind:'take',mode:'Identità',attack:card.type==='asso'?1:card.base,take:[t.id]});}
   for(const mode of attackModes(card,table)){
     const targets=table.map(t=>{const mirror=mode.mirror&&cards[t.id].type===card.type&&cards[t.id].suit!==card.suit;return {id:t.id,value:mirror?1:defenseValue(t,table)};});
     const limit=300;let found=0;
     function visit(i,remain,selection){if(found>=limit)return;if(remain===0){if(selection.length){add({kind:'take',mode:mode.name,attack:mode.value,take:selection.slice()});found++;}return;}if(i>=targets.length)return;
       for(let j=i;j<targets.length;j++){const t=targets[j];if(t.value<=remain){selection.push(t.id);visit(j+1,remain-t.value,selection);selection.pop();if(found>=limit)return;}}
     }
     visit(0,mode.value,[]);
   }
 }
 if(options.length===0){const choices=card.type==='numerale'&&card.number!==7?[7,card.number]:[undefined];for(const defenseChoice of choices)add({kind:'place',mode:'Deposito',attack:card.base,take:[],defenseChoice});}
 return options;
}
function bestMove(state,player,random=Math.random){let best=null,bestScore=-Infinity;for(const cardId of state.hands[player]){const moves=legalMoves(state,player,cardId);for(const m of moves){let score=0; if(m.kind==='take'){score=m.take.length*5+(m.take.length===state.table.length?12:0)+random()*2;
 const atk=cards[cardId];if(atk.type==='contadino'&&m.mode==='Soglia')score+=0.35;
 }else {const c=cards[cardId];score=-1+(c.type==='asso'?1.8:0)+(c.type==='mago'?1.2:0)+(c.type==='numerale'&&m.defenseChoice===7?.3:0)+random()*3;}
 if(score>bestScore){best=m;best.cardId=cardId;bestScore=score;}}}return best;}
function finish(state){if(state.table.length){if(state.lastTaker!==null){const remains=state.table.map(t=>t.id);state.captured[state.lastTaker].push(...remains);state.history.push(`Le ${remains.length} carte rimaste vanno all’ultima presa.`);}else{state.discard.push(...state.table.map(t=>t.id));}}state.table=[];state.finished=true;const count=state.captured.map(c=>c.length);const scopes=state.scopes;state.winner=count[0]===count[1]?(scopes[0]===scopes[1]?null:(scopes[0]>scopes[1]?0:1)):(count[0]>count[1]?0:1);state.history.push(state.winner===null?'Partita pari.':`Vince ${state.winner===0?'il giocatore':'il computer'}: ${count[0]}–${count[1]} carte.`);return state;}
function play(state,player,cardId,key){const choices=legalMoves(state,player,cardId);const move=choices.find(m=>m.key===key);if(!move)throw new Error('Mossa illegale.'); const c=cards[cardId];state.hands[player].splice(state.hands[player].indexOf(cardId),1);let phrase='';
 if(move.kind==='take'){const set=new Set(move.take);state.table=state.table.filter(t=>!set.has(t.id));state.captured[player].push(cardId,...move.take);state.lastTaker=player;const names=move.take.map(id=>cards[id].name).join(', ');phrase=`${c.name}: prende ${names}${move.mode!=='Base'?` (${move.mode})`:''}.`;if(state.table.length===0&&state.plays<19){state.scopes[player]++;phrase+=' SCOPA!';}}
 else{state.table.push({id:cardId,owner:player,defenseChoice:move.defenseChoice});phrase=`${c.name} viene calata${move.defenseChoice!==undefined?` (difesa ${move.defenseChoice})`:''}.`;}
 state.plays++;state.history.push(`${player===0?'Tu':'Computer'} · ${phrase}`);if(state.history.length>35)state.history.shift();if(state.plays===20)return finish(state);state.turn=1-player;return state;}
function allIds(state){return [...state.hands[0],...state.hands[1],...state.table.map(t=>t.id),...state.captured[0],...state.captured[1],...state.discard];}
function validate(state){const ids=allIds(state);if(ids.length!==20||new Set(ids).size!==20)throw new Error('Conservazione carte violata');if(state.plays!==20-state.hands[0].length-state.hands[1].length)throw new Error('Contatore turni errato');if(state.captured.some(a=>a.length<0))throw new Error('Punteggio errato');if(!state.finished&&state.plays!==20&&state.turn!==state.plays%2)throw new Error('Turno errato');return true;}
return {SUITS,TYPES,NUMERALS,cards,rng,start,legalMoves,play,finish,bestMove,validate,defenseValue,tableValues,attackModes};
});
