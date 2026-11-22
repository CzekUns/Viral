import {OVERWORLD_AVATARS,resolveAvatar} from './engine/avatar-roster.js';
import {collectWalkCandidates} from './engine/frame-candidates.js';
const $=id=>document.getElementById(id);
const DIRECTION_LABELS={S:'Sud',SE:'Sud-est',E:'Est',NE:'Nord-est',N:'Nord',NW:'Nord-ovest',W:'Ovest',SW:'Sud-ovest'};
const images=new Map();
const ctx={manifest:null,inventory:[],avatar:'s08-player',direction:'E',source:null,sourceItem:null,
 mappings:[],history:[],selected:null,playing:true,fps:7,frame:0,lastAt:0,token:0,pools:null};
function getImage(src){
 if(!images.has(src)){
   const img=new Image();img.decoding='async';img.src=src;
   images.set(src,img.decode().then(()=>img));
 }
 return images.get(src);
}
function safeText(text){return String(text??'');}
function framePicture(canvas,src,frame,frames){
 const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);
 if(!src)return;
 const entry=images.get(src);
 if(!entry)return;
 entry.then(img=>{
   if(!img.naturalWidth||!canvas.isConnected)return;
   // Data may have changed since asynchronous decode: reject stale renders.
   if(canvas._spriteKey!==src+'#'+frame+'#'+frames)return;
   const w=img.naturalWidth/frames,h=img.naturalHeight;
   const scale=Math.min((canvas.width-14)/w,(canvas.height-12)/h);
   g.clearRect(0,0,canvas.width,canvas.height);
   g.imageSmoothingEnabled=true;
   g.drawImage(img,frame*w,0,w,h,(canvas.width-w*scale)/2,(canvas.height-h*scale)/2,w*scale,h*scale);
 }).catch(()=>{});
}
function draw(canvas,part){
 if(!part){canvas._spriteKey=null;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);return;}
 canvas._spriteKey=part.src+'#'+part.frame+'#'+part.frames;
 framePicture(canvas,part.src,part.frame,part.frames);
}
function sourceAt(index){return {src:ctx.source.src,frame:index,frames:ctx.source.frames};}
function currentFrameAt(index){return ctx.mappings[index]||sourceAt(index);}
function listChanges(){return ctx.mappings.map((to,i)=>({index:i,from:sourceAt(i),to})).filter(x=>x.to.src!==x.from.src||x.to.frame!==x.from.frame);}
function setStatus(text){$('lab-status').textContent=text;}
function infoFor(src){return ctx.inventory.find(i=>i.src===src);}
function chooseTarget(index){
 ctx.selected=index;
 renderCurrent();
 $('lab-help').textContent='Hai selezionato il frame '+(index+1)+'/'+ctx.source.frames+'. Tocca un fotogramma alternativo per vederlo subito nell’animazione.';
}
function replaceTarget(choice){
 if(ctx.selected===null){setStatus('Prima scegli uno dei fotogrammi della camminata in uso.');return;}
 const prev=ctx.mappings.map(x=>({...x}));
 ctx.history.push(prev);
 ctx.mappings[ctx.selected]={...choice};
 renderCurrent();renderChanges();
 const source=infoFor(choice.src);
 const warning=source?.direction!==ctx.direction?' ATTENZIONE: il sostituto guarda '+(DIRECTION_LABELS[source.direction]||source.direction)+', non '+DIRECTION_LABELS[ctx.direction]+'.':source?.state==='idle'?' ATTENZIONE: è uno standing, non un passo.':'';
 setStatus('Frame '+(ctx.selected+1)+' sostituito in anteprima. Confronta l’animazione con l’originale.'+warning);
}
function makeCard(part,caption,css,click){
 const button=document.createElement('button');
 button.type='button';button.className='frame-button '+css;
 const canvas=document.createElement('canvas');canvas.width=124;canvas.height=134;
 canvas.setAttribute('aria-hidden','true');
 const label=document.createElement('small');label.textContent=caption;
 button.append(canvas,label);button.addEventListener('click',click);
 draw(canvas,part);
 return button;
}
function renderCurrent(){
 const list=$('lab-frames');list.replaceChildren();
 ctx.mappings.forEach((part,index)=>{
   const changed=part.src!==ctx.source.src||part.frame!==index;
   const button=makeCard(part,'#'+(index+1)+(changed?' ✓':''),[index===ctx.selected?'active':'',changed?'changed':''].join(' '),()=>chooseTarget(index));
   button.setAttribute('aria-label','Sostituisci fotogramma '+(index+1)+(changed?' già modificato':''));
   button.setAttribute('aria-pressed',String(index===ctx.selected));
   list.append(button);
 });
}
function renderCandidateGroup(title,item,active){
 const section=document.createElement('div');section.className='candidate-group';
 section.dataset.src=item.src;
 void getImage(item.src).catch(()=>{section.classList.add('decode-failed');});
 const h=document.createElement('h3');h.textContent=title;
 const meta=document.createElement('p');meta.textContent=item.src;
 const cells=document.createElement('div');cells.className='candidate-grid';
 for(let frame=0;frame<item.frames;frame++){
   const part={src:item.src,frame,frames:item.frames};
   const button=makeCard(part,'#'+(frame+1), 'candidate-button',()=>replaceTarget(part));
   button.setAttribute('aria-label','Usa '+title+' fotogramma '+(frame+1));
   button.dataset.src=item.src;button.dataset.frame=String(frame);
   cells.append(button);
 }
 section.append(h,meta,cells);
 if(active)section.classList.add('current-variant');
 return section;
}
function renderCandidates(){
 const view=$('lab-candidates');view.replaceChildren();
 const pool=ctx.pools=collectWalkCandidates(ctx.inventory,ctx.manifest,ctx.avatar,ctx.direction);
 const c=pool.counts;
 const banner=$('lab-availability');
 banner.replaceChildren();
 const heading=document.createElement('strong');
 heading.textContent=c.sameWalkFrames+' fotogrammi di camminata alternativi · '+c.standingFrames+' standing · '+c.otherWalkFrames+' fotogrammi da altre direzioni';
 banner.append(heading);
 const msg=document.createElement('p');
 msg.textContent=c.sameWalkFrames
   ?'I candidati per '+DIRECTION_LABELS[ctx.direction]+' sono elencati subito sotto.'
   :'Non c’è una seconda camminata '+DIRECTION_LABELS[ctx.direction]+' per '+resolveAvatar(ctx.avatar).name+' su GitHub. I quattro frame attuali non sono “extra”.';
 banner.append(msg);
 if(!c.sameWalkFrames){
   const example=document.createElement('button');example.type='button';example.className='extra-example';
   example.textContent='Vedi i veri candidati Bastoni Est (R01)';
   example.addEventListener('click',()=>{
     ctx.avatar='b08-player';ctx.direction='E';
     $('lab-avatar').value=ctx.avatar;$('lab-direction').value=ctx.direction;
     void load();
   });
   banner.append(example);
 }
 const own=ctx.sourceItem||{...ctx.source,version:'Versione corrente',src:ctx.source.src};
 view.append(renderCandidateGroup('Sequenza corrente · riordina o duplica',own,true));
 const directHead=document.createElement('h3');directHead.className='candidate-section-title';
 directHead.textContent='Alternative di camminata '+DIRECTION_LABELS[ctx.direction]+' · '+c.sameWalkFrames+' frame';
 view.append(directHead);
 if(!pool.sameWalk.length){
   const empty=document.createElement('p');empty.className='candidate-empty';
   empty.textContent='Nessun’altra camminata archiviata per questa direzione.';
   view.append(empty);
 } else for(const item of pool.sameWalk){
   const status=item.inAnyAvatar?'IN USO IN UNA VERSIONE':'NON IN USO';
   view.append(renderCandidateGroup(item.version+' · '+item.frames+' frame · '+status,item,false));
 }
 const idleHead=document.createElement('h3');idleHead.className='candidate-section-title';
 idleHead.textContent='Standing '+DIRECTION_LABELS[ctx.direction]+' · '+c.standingFrames+' frame';
 view.append(idleHead);
 const idleNote=document.createElement('p');idleNote.className='candidate-advice';
 idleNote.textContent='Questi sono disegni fermi. Puoi usarli come prova di sostituzione, ma potrebbero interrompere la fluidità della camminata.';
 view.append(idleNote);
 for(const item of pool.sameStanding){
   const status=item.inAnyAvatar?'IN USO IN UN AVATAR':'NON IN USO';
   view.append(renderCandidateGroup(item.version+' · standing · '+status,item,false));
 }
 const outside=document.createElement('details');outside.className='other-direction-panel';
 outside.id='lab-other-directions';
 const summary=document.createElement('summary');
 summary.textContent='Altre direzioni dello stesso personaggio · '+c.otherWalkFrames+' frame';
 outside.append(summary);
 const info=document.createElement('p');info.className='candidate-direction-warning';
 info.textContent='Questi frame appartengono ad altre direzioni: un personaggio potrebbe guardare dalla parte sbagliata. Utilizzali soltanto dopo averli confrontati visivamente.';
 outside.append(info);
 const groups=document.createElement('div');groups.className='other-direction-groups';outside.append(groups);
 let mounted=false;
 outside.addEventListener('toggle',()=>{
   if(!outside.open||mounted)return;
   mounted=true;
   for(const [direction,rows] of Object.entries(pool.otherWalk)){
     if(!rows.length)continue;
     const hdr=document.createElement('h3');hdr.className='candidate-section-title';
     hdr.textContent=DIRECTION_LABELS[direction]+' · '+rows.reduce((n,x)=>n+x.frames,0)+' frame';
     groups.append(hdr);
     for(const item of rows)groups.append(renderCandidateGroup(
       DIRECTION_LABELS[direction]+' · '+item.version+' · '+(item.inAnyAvatar?'IN USO IN ALTRA DIREZIONE':'NON IN USO'),item,false
     ));
   }
 });
 view.append(outside);
}
function renderChanges(){
 const changes=listChanges(),box=$('lab-changes');box.replaceChildren();
 if(!changes.length){
   box.textContent='Nessuna modifica. L’animazione originale e la preview coincidono.';
   $('lab-instructions').value='';return;
 }
 const ul=document.createElement('ul');
 for(const change of changes){
   const li=document.createElement('li');
   li.textContent='Frame '+(change.index+1)+' → '+(change.to.frame+1)+'/'+change.to.frames+
     ' da '+(infoFor(change.to.src)?.version||'originale')+(change.to.src===ctx.source.src?' (stesso foglio)':'');
   ul.append(li);
 }
 box.append(ul);
 const lines=[
  'SCOPONE ALCHEMICO — SOSTITUZIONI PER SINGOLO FRAME',
  'Personaggio: '+resolveAvatar(ctx.avatar).name,
  'Direzione: '+ctx.direction+' ('+DIRECTION_LABELS[ctx.direction]+')',
  'Animazione originale: '+ctx.source.src,
  'Totale fotogrammi: '+ctx.source.frames,
  '',
  ...changes.map(c=>[
    'FRAME '+(c.index+1)+' (indice '+c.index+')',
    'DA: '+c.from.src+' — fotogramma '+(c.from.frame+1)+'/'+c.from.frames,
    'CON: '+c.to.src+' — fotogramma '+(c.to.frame+1)+'/'+c.to.frames+
    (infoFor(c.to.src)?.direction!==ctx.direction?' [ATTENZIONE: ALTRA DIREZIONE '+infoFor(c.to.src)?.direction+']':infoFor(c.to.src)?.state==='idle'?' [STANDING, NON CAMMINATA]':'')
  ].join('\n')),
  '',
  'Questa è una prova: crea una nuova spritesheet per la direzione indicata, conserva gli originali e pubblica solo dopo QA.'
 ];
 $('lab-instructions').value=lines.join('\n');
}
function animate(now){
 if(ctx.playing&&ctx.source){
   const next=Math.floor(now/1000*ctx.fps)%ctx.source.frames;
   ctx.frame=next;
 }
 if(ctx.source){
   draw($('lab-original'),sourceAt(ctx.frame));
   draw($('lab-preview'),currentFrameAt(ctx.frame));
 }
 requestAnimationFrame(animate);
}
async function load(){
 const token=++ctx.token;
 const avatar=ctx.manifest.images[ctx.avatar];
 const walk=avatar?.animations.walk,src=walk?.directions[ctx.direction];
 if(!src){setStatus('Animazione non trovata');return;}
 const meta=walk.perDirection?.[ctx.direction]||{};
 ctx.fps=meta.fps||walk.fps||7;
 ctx.source={src,frames:meta.frames||walk.frames||4,character:avatar.characterId};
 ctx.sourceItem=infoFor(src);
 ctx.pools=collectWalkCandidates(ctx.inventory,ctx.manifest,ctx.avatar,ctx.direction);
 ctx.mappings=Array.from({length:ctx.source.frames},(_,i)=>sourceAt(i));
 ctx.history=[];ctx.selected=null;
 $('lab-fps').value=String(ctx.fps);$('lab-fps-value').textContent=ctx.fps+' FPS';
 $('lab-meta').textContent=avatar.name+' · '+ctx.source.frames+' fotogrammi · '+ctx.fps+' FPS · '+(avatar.artStatus||'Test')+
   ' · '+ctx.source.src.split('/').slice(-3).join('/');
 $('lab-help').textContent='Seleziona un fotogramma in uso e poi uno dei sostituti: la preview cambierà immediatamente.';
 renderCurrent();renderCandidates();renderChanges();setStatus('Caricamento dei fotogrammi...');
 const sources=[ctx.source.src,...new Set([...ctx.pools.sameWalk,...ctx.pools.sameStanding].map(i=>i.src))];
 const settled=await Promise.allSettled(sources.map(src=>getImage(src)));
 if(token!==ctx.token)return;
 const failures=settled.filter(x=>x.status==='rejected').length;
 if(failures)setStatus(failures+' file non sono stati decodificati; gli altri sono visualizzabili.');
 else setStatus('Anteprime pronte · scegli il frame sbagliato e prova un’alternativa.');
 renderCurrent();renderCandidates();
}
function configure(){
 const chooser=$('lab-avatar');
 for(const item of OVERWORLD_AVATARS){
   const option=document.createElement('option');option.value=item.id;
   option.textContent=item.emoji+' '+item.name;
   chooser.append(option);
 }
 const params=new URLSearchParams(location.search);
 const aid=params.get('avatar');
 if(OVERWORLD_AVATARS.some(x=>x.id===aid))ctx.avatar=aid;
 const dir=params.get('direzione')?.toUpperCase();
 if(DIRECTION_LABELS[dir])ctx.direction=dir;
 chooser.value=ctx.avatar;$('lab-direction').value=ctx.direction;
 chooser.addEventListener('change',e=>{ctx.avatar=e.target.value;void load();});
 $('lab-direction').addEventListener('change',e=>{ctx.direction=e.target.value;void load();});
 $('lab-play').addEventListener('click',()=>{
   ctx.playing=!ctx.playing;
   $('lab-play').textContent=ctx.playing?'Pausa':'Riproduci';
 });
 $('lab-fps').addEventListener('input',e=>{
   ctx.fps=Number(e.target.value);$('lab-fps-value').textContent=ctx.fps+' FPS';
 });
 $('lab-reset').addEventListener('click',()=>{
   ctx.mappings=Array.from({length:ctx.source.frames},(_,i)=>sourceAt(i));
   ctx.history=[];renderCurrent();renderChanges();setStatus('Sequenza ripristinata nella preview.');
 });
 $('lab-undo').addEventListener('click',()=>{
   const previous=ctx.history.pop();
   if(!previous){setStatus('Non ci sono modifiche da annullare.');return;}
   ctx.mappings=previous;renderCurrent();renderChanges();setStatus('Ultima sostituzione annullata.');
 });
 $('lab-copy').addEventListener('click',async()=>{
   const value=$('lab-instructions').value;
   if(!value){setStatus('Non hai ancora sostituito nessun frame.');return;}
   try{
     await navigator.clipboard.writeText(value);
     setStatus('Istruzioni copiate. Incollale in chat per applicare le modifiche.');
   }catch{
     $('lab-instructions').focus();$('lab-instructions').select();
     setStatus('Copia il testo selezionato per inviarlo nella chat.');
   }
 });
}
async function start(){
 try{
   const [data,manifest]=await Promise.all(['catalogo-sprite-data.json','assets.json'].map(async url=>{
     const response=await fetch(url,{cache:'no-store'});
     if(!response.ok)throw Error('File non disponibile: '+url);
     return response.json();
   }));
   ctx.manifest=manifest;ctx.inventory=data.items;
   configure();
   await load();
   requestAnimationFrame(animate);
 }catch(err){setStatus('Laboratorio non disponibile: '+safeText(err.message));}
}
start();
