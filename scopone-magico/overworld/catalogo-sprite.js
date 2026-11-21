/* Scopone Alchemico — visual inventory of original committed C08/S08 WebPs.
 * "In uso" is computed from the actual default animations map, not the stale
 * player.directions or the existence of a manifest sprite ID.
 * Does not modify the actual Overworld runtime, saves, or artwork. */
const $=id=>document.getElementById(id);
const directions=['S','SE','E','NE','N','NW','W','SW'];
const directionNames={S:'Sud',SE:'Sud-est',E:'Est',NE:'Nord-est',N:'Nord',NW:'Nord-ovest',W:'Ovest',SW:'Sud-ovest'};
const state={items:[],status:'all',character:'all',direction:'all',pose:'all',version:'all',search:'',from:null,to:null,changes:[],detail:null};
const grid=$('catalog-grid');
const visible=new Set();
let observer;
let toastTimer;
function safe(value){return String(value??'');}
function itemLabel(x){return (x.character==='C08'?'8 Coppe':'8 Spade')+' · '+directionNames[x.direction]+' · '+(x.state==='walk'?'Camminata':'Standing');}
function infoChoice(chosen){
 if(!chosen)return '';
 return chosen.item.code+(chosen.frame===null?'':' · fotogramma '+(chosen.frame+1)+'/'+chosen.item.frames);
}
function drawFrame(canvas,img,item,frame){
 const context=canvas.getContext('2d');
 context.clearRect(0,0,canvas.width,canvas.height);
 if(!img||!img.naturalWidth)return;
 const sw=img.naturalWidth/item.frames,sh=img.naturalHeight;
 if(!sw||!sh)return;
 const scale=Math.min((canvas.width-12)/sw,(canvas.height-11)/sh);
 const dw=sw*scale,dh=sh*scale;
 context.imageSmoothingEnabled=true;
 context.imageSmoothingQuality='high';
 context.drawImage(img,frame*sw,0,sw,sh,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);
}
function toast(message){
 let el=$('inventory-toast');
 if(!el){
   el=document.createElement('div');el.id='inventory-toast';el.setAttribute('role','status');
   el.style.cssText='position:fixed;z-index:50;bottom:18px;left:50%;transform:translateX(-50%);background:#352e25;color:#ffeed7;padding:11px 16px;border-radius:11px;box-shadow:0 9px 30px #0006;font:700 12px system-ui;max-width:92vw;text-align:center;pointer-events:none;';
   document.body.append(el);
 }
 el.textContent=message;el.hidden=false;clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{el.hidden=true;},2600);
}
function classify(raw,manifest){
 const usedPaths=new Set();
 const usages=new Map();
 for(const id of ['player','s08-player']){
   const spec=manifest.images[id];
   if(!spec)throw Error('Personaggio mancante dal manifest: '+id);
   for(const phase of ['idle','walk']){
     for(const [direction,src] of Object.entries(spec.animations[phase].directions)){
       usedPaths.add(src);
       usages.set(src,{character:spec.characterId,state:phase,direction});
     }
   }
 }
 const result=raw.items.map(x=>({...x,used:usedPaths.has(x.src),usage:usages.get(x.src)||null}));
 if(result.some(x=>!directions.includes(x.direction)))throw Error('Direzione assente nel catalogo');
 if(result.length!==new Set(result.map(x=>x.src)).size)throw Error('File duplicati nel catalogo');
 if(result.some(x=>x.used&&(!x.usage||x.usage.character!==x.character||x.usage.state!==x.state||x.usage.direction!==x.direction))){
   throw Error('Uno o più file risultano utilizzati in una direzione differente');
 }
 return result;
}
function updateCounts(){
 $('total-count').textContent=String(state.items.length);
 $('used-count').textContent=String(state.items.filter(x=>x.used).length);
 $('unused-count').textContent=String(state.items.filter(x=>!x.used).length);
}
function filtered(){
 const term=state.search.toLowerCase().trim();
 return state.items.filter(x=>
   (state.status==='all'||(state.status==='used')===x.used)&&
   (state.character==='all'||state.character===x.character)&&
   (state.direction==='all'||state.direction===x.direction)&&
   (state.pose==='all'||state.pose===x.state)&&
   (state.version==='all'||state.version===x.version)&&
   (!term||[x.code,x.src,x.version,itemLabel(x)].join(' ').toLowerCase().includes(term))
 ).sort((a,b)=>{
   const ca=a.character.localeCompare(b.character);
   if(ca)return ca;
   const dd=directions.indexOf(a.direction)-directions.indexOf(b.direction);
   if(dd)return dd;
   if(a.state!==b.state)return a.state==='idle'?-1:1;
   if(a.used!==b.used)return a.used?-1:1;
   return a.version.localeCompare(b.version)||a.code.localeCompare(b.code);
 });
}
function renderCatalog(){
 if(observer)observer.disconnect();
 visible.clear();grid.replaceChildren();
 const rows=filtered();
 $('visible-count').textContent=rows.length+' di '+state.items.length+' file mostrati';
 $('empty-result').hidden=rows.length>0;
 const frag=document.createDocumentFragment();
 for(const item of rows){
   const card=document.createElement('article');card.className='sprite-card';card.dataset.used=String(item.used);
   const preview=document.createElement('button');preview.type='button';preview.className='sprite-preview';preview.setAttribute('aria-label','Apri '+item.code+' e visualizza tutti i fotogrammi');
   const canvas=document.createElement('canvas');canvas.width=180;canvas.height=175;canvas.setAttribute('aria-hidden','true');preview.append(canvas);
   const status=document.createElement('span');status.className='sprite-status';status.textContent=item.used?'IN USO':'NON IN USO';preview.append(status);
   const pill=document.createElement('span');pill.className='frames-pill';pill.textContent=item.frames+' '+(item.frames===1?'frame':'frame');preview.append(pill);
   preview.addEventListener('click',()=>openDetail(item));
   const body=document.createElement('div');body.className='sprite-body';
   const name=document.createElement('h3');name.className='sprite-name';name.textContent=itemLabel(item);
   const subtitle=document.createElement('small');subtitle.className='sprite-subtitle';subtitle.textContent=item.version;
   const code=document.createElement('code');code.className='sprite-code';code.textContent=item.code;
   const file=document.createElement('code');file.className='sprite-path';file.textContent=item.src.split('/').slice(-2).join('/');
   const buttons=document.createElement('div');buttons.className='sprite-buttons';
   const from=document.createElement('button');from.type='button';from.textContent='A · Da sostituire';from.addEventListener('click',()=>choose('from',item,null));
   const to=document.createElement('button');to.type='button';to.textContent='B · Con questo';to.addEventListener('click',()=>choose('to',item,null));
   buttons.append(from,to);body.append(name,subtitle,code,file,buttons);card.append(preview,body);frag.append(card);
   const tile={element:card,canvas,item,img:null,loading:false,active:false,lastFrame:-1,token:0};
   card._spriteTile=tile;
 }
 grid.append(frag);
 observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
     const tile=entry.target._spriteTile;if(!tile)continue;
     if(entry.isIntersecting){
       tile.active=true;visible.add(tile);
       if(!tile.img&&!tile.loading)loadTile(tile);
     }else{
       tile.active=false;visible.delete(tile);tile.img=null;tile.loading=false;tile.lastFrame=-1;tile.token++;
     }
   }
 },{rootMargin:'180px'});
 for(const card of grid.children)observer.observe(card);
}
async function loadTile(tile){
 const token=++tile.token;tile.loading=true;
 const img=new Image();img.decoding='async';
 img.src=tile.item.src;
 try{
   await img.decode();
   if(tile.active&&token===tile.token){tile.img=img;tile.lastFrame=-1;drawFrame(tile.canvas,img,tile.item,0);}
 }catch(err){
   if(tile.active&&token===tile.token){
     const ctx=tile.canvas.getContext('2d');ctx.clearRect(0,0,tile.canvas.width,tile.canvas.height);
     ctx.fillStyle='#8c4737';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('Errore nel caricamento',90,87);
     tile.element.title=safe(err);
   }
 }finally{if(token===tile.token)tile.loading=false;}
}
function loop(now){
 for(const tile of visible){
   if(!tile.active||!tile.img)continue;
   const item=tile.item;
   const frame=item.frames>1?Math.floor(now/1000*item.fps)%item.frames:0;
   if(frame!==tile.lastFrame){drawFrame(tile.canvas,tile.img,item,frame);tile.lastFrame=frame;}
 }
 if(state.detail&&!state.detail.paused&&state.detail.img){
   const d=state.detail;
   const frame=Math.floor((now-d.start)/1000*d.item.fps)%d.item.frames;
   if(d.frame!==frame){d.frame=frame;renderDetailFrame();}
 }
 requestAnimationFrame(loop);
}
function choose(which,item,frame){
 state[which]={item,frame};
 $('chosen-from').textContent=state.from?infoChoice(state.from):'Tocca «Da sostituire» su uno sprite';
 $('chosen-to').textContent=state.to?infoChoice(state.to):'Tocca «Con questo» su un altro sprite';
 $('add-replacement').disabled=!(state.from&&state.to);
 toast((which==='from'?'A · Da sostituire: ':'B · Con questo: ')+infoChoice(state[which]));
}
function openDetail(item){
 const d={item,img:null,frame:0,paused:item.frames===1,manual:false,start:performance.now()};
 state.detail=d;
 $('detail-title').textContent=itemLabel(item);
 $('detail-status').textContent=(item.used?'IN USO':'NON IN USO')+' · '+item.version;
 $('detail-code').textContent=item.code;
 $('detail-path').textContent=item.src;
 $('detail-meta').textContent='File WebP · '+item.frames+' fotogramm'+(item.frames===1?'a':'i')+' · '+item.fps+' FPS · '+item.frameSize.join('×')+' px/cella';
 const range=$('detail-range');range.min='0';range.max=String(Math.max(0,item.frames-1));range.value='0';range.disabled=item.frames===1;
 $('detail-strip').replaceChildren();
 $('detail-play').disabled=item.frames===1;
 $('detail-play').textContent=d.paused?'Riproduci':'Pausa';
 $('detail-frame-label').textContent='1/'+item.frames;
 $('sprite-dialog').showModal();
 const image=new Image();image.decoding='async';image.src=item.src;
 image.decode().then(()=>{
   if(state.detail!==d)return;
   d.img=image;drawFrame($('detail-canvas'),image,item,0);
   createFilmstrip(d);
 }).catch(()=>{
   if(state.detail===d)$('detail-meta').textContent='Impossibile decodificare il file '+item.src;
 });
}
function createFilmstrip(d){
 const row=$('detail-strip');const frag=document.createDocumentFragment();
 for(let i=0;i<d.item.frames;i++){
   const button=document.createElement('button');button.type='button';button.dataset.frame=String(i);
   button.setAttribute('aria-label','Visualizza fotogramma '+(i+1));button.setAttribute('aria-pressed',String(i===d.frame));
   const canvas=document.createElement('canvas');canvas.width=54;canvas.height=52;
   drawFrame(canvas,d.img,d.item,i);
   const label=document.createElement('small');label.textContent=String(i+1);
   button.append(canvas,label);button.addEventListener('click',()=>selectDetailFrame(i));
   frag.append(button);
 }
 row.replaceChildren(frag);
}
function renderDetailFrame(){
 const d=state.detail;if(!d)return;
 if(d.img)drawFrame($('detail-canvas'),d.img,d.item,d.frame);
 $('detail-frame-label').textContent=(d.frame+1)+'/'+d.item.frames;
 $('detail-range').value=String(d.frame);
 for(const button of $('detail-strip').children)button.setAttribute('aria-pressed',String(Number(button.dataset.frame)===d.frame));
}
function selectDetailFrame(index){
 const d=state.detail;if(!d)return;
 d.frame=Math.max(0,Math.min(d.item.frames-1,Number(index)||0));
 d.paused=true;d.manual=true;
 $('detail-play').textContent='Riproduci';
 renderDetailFrame();
}
function detailPick(role){
 const d=state.detail;if(!d)return;
 choose(role,d.item,d.manual?d.frame:null);
 $('sprite-dialog').close();
}
function changeToText(change){
 const from=change.from,to=change.to;
 const detail=x=>x.item.code+(x.frame===null?'':' [fotogramma '+(x.frame+1)+'/'+x.item.frames+']')+
  '\n   File: '+x.item.src;
 return 'DA: '+detail(from)+'\nCON: '+detail(to);
}
function outputInstructions(){
 if(!state.changes.length)return '';
 return 'SCOPONE ALCHEMICO — CORREZIONI SPRITE DA ESEGUIRE\n'+
 state.changes.map((c,i)=>'\n'+(i+1)+') '+changeToText(c)).join('\n')+
 '\n\nUsa questi file già presenti nella repository. Conserva gli originali e non modificare altre direzioni senza indicazione.';
}
function renderChanges(){
 const list=$('replacement-list');list.replaceChildren();
 for(let i=0;i<state.changes.length;i++){
   const change=state.changes[i],li=document.createElement('li');
   const name=document.createElement('span');name.textContent=infoChoice(change.from)+' → '+infoChoice(change.to);
   const remove=document.createElement('button');remove.type='button';remove.textContent='Elimina';
   remove.addEventListener('click',()=>{state.changes.splice(i,1);renderChanges();});
   li.append(name,remove);list.append(li);
 }
 $('replacement-text').value=outputInstructions();
 $('copy-replacements').disabled=state.changes.length===0;
}
async function copyChanges(){
 const text=outputInstructions();if(!text)return;
 try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
   else{const field=$('replacement-text');field.focus();field.select();if(!document.execCommand('copy'))throw Error('clipboard API');}
   $('copy-status').textContent='Istruzioni copiate. Incollale nella chat per indicarmi cosa sostituire.';
   toast('Elenco copiato');
 }catch{
   $('copy-status').textContent='Seleziona e copia il testo nel riquadro sottostante.';
   $('replacement-text').focus();$('replacement-text').select();
 }
}
function bindControls(){
 const statusButtons=[...document.querySelectorAll('[data-status]')];
 for(const button of statusButtons)button.addEventListener('click',()=>{
   state.status=button.dataset.status;
   for(const b of statusButtons)b.setAttribute('aria-pressed',String(b===button));
   renderCatalog();
 });
 const selects=[['filter-character','character'],['filter-direction','direction'],['filter-pose','pose'],['filter-version','version']];
 for(const [id,key] of selects)$(id).addEventListener('change',e=>{state[key]=e.target.value;renderCatalog();});
 $('filter-search').addEventListener('input',e=>{state.search=e.target.value;renderCatalog();});
 $('reset-filters').addEventListener('click',()=>{
   state.status='all';state.character='all';state.direction='all';state.pose='all';state.version='all';state.search='';
   for(const button of statusButtons)button.setAttribute('aria-pressed',String(button.dataset.status==='all'));
   for(const [id] of selects)$(id).value='all';$('filter-search').value='';renderCatalog();
 });
 $('add-replacement').addEventListener('click',()=>{
   if(!state.from||!state.to)return;
   state.changes.push({from:state.from,to:state.to});state.from=null;state.to=null;
   $('chosen-from').textContent='Tocca «Da sostituire» su uno sprite';
   $('chosen-to').textContent='Tocca «Con questo» su un altro sprite';
   $('add-replacement').disabled=true;
   renderChanges();toast('Sostituzione aggiunta all’elenco');
 });
 $('clear-replacements').addEventListener('click',()=>{state.changes=[];renderChanges();$('copy-status').textContent='';});
 $('copy-replacements').addEventListener('click',copyChanges);
 $('detail-close').addEventListener('click',()=>$('sprite-dialog').close());
 $('sprite-dialog').addEventListener('close',()=>{state.detail=null;});
 $('detail-range').addEventListener('input',e=>selectDetailFrame(e.target.value));
 $('detail-play').addEventListener('click',()=>{
   const d=state.detail;if(!d||d.item.frames===1)return;
   d.paused=!d.paused;
   if(!d.paused){d.manual=false;d.start=performance.now()-d.frame/d.item.fps*1000;}
   $('detail-play').textContent=d.paused?'Riproduci':'Pausa';
 });
 $('detail-from').addEventListener('click',()=>detailPick('from'));
 $('detail-to').addEventListener('click',()=>detailPick('to'));
}
async function start(){
 try{
   const [rawResponse,manifestResponse]=await Promise.all([
     fetch('catalogo-sprite-data.json',{cache:'no-store'}),
     fetch('assets.json',{cache:'no-store'})
   ]);
   if(!rawResponse.ok||!manifestResponse.ok)throw Error('Archivio o manifest non raggiungibili');
   const [raw,manifest]=await Promise.all([rawResponse.json(),manifestResponse.json()]);
   state.items=classify(raw,manifest);
   const versions=[...new Set(state.items.map(x=>x.version))].sort();
   for(const version of versions){const opt=document.createElement('option');opt.value=version;opt.textContent=version;$('filter-version').append(opt);}
   const params=new URLSearchParams(location.search);
   const char=params.get('personaggio')?.toUpperCase();
   const dir=params.get('direzione')?.toUpperCase();
   if(['C08','S08'].includes(char)){state.character=char;$('filter-character').value=char;}
   if(directions.includes(dir)){state.direction=dir;$('filter-direction').value=dir;}
   updateCounts();bindControls();renderCatalog();requestAnimationFrame(loop);
 }catch(error){
   $('empty-result').hidden=false;
   $('empty-result').textContent='Impossibile caricare il catalogo: '+safe(error.message);
 }
}
start();
