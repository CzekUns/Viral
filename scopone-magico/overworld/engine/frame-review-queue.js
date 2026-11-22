/**
 * Persisted review queue for the visual walking laboratory.
 * Storage is local to this browser; exporting an issue or sending copied text
 * is required to share selections with an agent/developer.
 */
export const REDO_STORAGE_KEY='scopone-alchemico:overworld:frames-da-rifare:v1';
export const REDO_LIMIT=1024;
const allowedDirections=new Set(['S','SE','E','NE','N','NW','W','SW']);
const cleanString=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';

export function frameReviewKey({avatar,direction,src,frame}){
 return JSON.stringify([avatar,direction,src,frame]);
}
export function validReview(row){
 return row&&typeof row==='object'&&
  typeof row.avatar==='string'&&/^(?:player|s08-player|b08-player|d08-player|c08-v01-player|c08-v02-player)$/.test(row.avatar)&&
  allowedDirections.has(row.direction)&&
  typeof row.src==='string'&&row.src.startsWith('characters/')&&row.src.endsWith('.webp')&&
  Number.isInteger(row.frame)&&row.frame>=0&&row.frame<=21;
}
export function normalizeReviewQueue(input){
 const rows=Array.isArray(input)?input:input?.marks;
 if(!Array.isArray(rows))return [];
 const byKey=new Map();
 for(const value of rows){
  if(!validReview(value))continue;
  const item={avatar:value.avatar,direction:value.direction,src:value.src,frame:value.frame,
   note:cleanString(value.note,300),
   savedAt:typeof value.savedAt==='string'?value.savedAt.slice(0,40):''};
  byKey.set(frameReviewKey(item),item);
  if(byKey.size>=REDO_LIMIT)break;
 }
 return [...byKey.values()].sort((a,b)=>
  a.avatar.localeCompare(b.avatar)||a.direction.localeCompare(b.direction)||
  a.src.localeCompare(b.src)||a.frame-b.frame
 );
}
export function addReviewMarks(current,marks,{note='',savedAt=''}={}){
 const rows=normalizeReviewQueue(current),map=new Map(rows.map(x=>[frameReviewKey(x),x]));
 const trimmed=cleanString(note,300);
 for(const candidate of marks){
  if(!validReview(candidate))continue;
  const key=frameReviewKey(candidate),old=map.get(key);
  map.set(key,{avatar:candidate.avatar,direction:candidate.direction,src:candidate.src,frame:candidate.frame,
   note:trimmed||old?.note||'',savedAt:savedAt||old?.savedAt||''});
 }
 return normalizeReviewQueue([...map.values()]);
}
export function removeReviewMarks(current,marks){
 const remove=new Set(marks.map(frameReviewKey));
 return normalizeReviewQueue(current).filter(x=>!remove.has(frameReviewKey(x)));
}
export function readReviewQueue(storage){
 try{return normalizeReviewQueue(JSON.parse(storage.getItem(REDO_STORAGE_KEY)||'[]'));}
 catch{return [];}
}
export function saveReviewQueue(storage,marks){
 const rows=normalizeReviewQueue(marks);
 storage.setItem(REDO_STORAGE_KEY,JSON.stringify(rows));
 return rows;
}
export function formatReviewQueue(marks,avatarNames={}){
 const rows=normalizeReviewQueue(marks);
 if(!rows.length)return '';
 const lines=['SCOPONE ALCHEMICO — ELENCO FOTOGRAMMI DA RIFARE',
   'Stato: DA RIFARE (non sostituiti; nessuna modifica agli asset)','Totale: '+rows.length,''];
 let previous='';
 for(const row of rows){
  const group=row.avatar+'|'+row.direction+'|'+row.src;
  if(group!==previous){
   if(previous)lines.push('');
   lines.push('PERSONAGGIO: '+(avatarNames[row.avatar]||row.avatar)+
    ' · DIREZIONE: '+row.direction);
   lines.push('SPRITESHEET: '+row.src);
   previous=group;
  }
  lines.push('  - Fotogramma '+(row.frame+1)+' (indice '+row.frame+')'+
   (row.note?' — '+row.note:''));
 }
 lines.push('','Queste sono pose da rifare, NON sostituzioni già approvate. Conservare gli originali.');
 return lines.join('\n');
}
