# C08 Fante di Coppe — stile Denari V01 — TEST

Rifacimento grafico dell'8 di Coppe nello stile del D08 V01: illustrazione dipinta con contorni a inchiostro, dettagli dei tessuti e proporzioni adulte. Identita' dalla carta originale napoletana, non dalla carta Denari: berretto verde con fascia blu e piuma rossa, capelli grigi, collare giallo, tunica verde con banda frontale blu/bianca, maniche rosse, pantaloni gialli, calze verdi con fiocchi rossi e scarpe bianche. Coppa al fianco anatomico destro e spadino al sinistro, mani libere.

## Contenuto
8 standing e 32 frame PNG RGBA; 8 strip walk e 8 standing WebP lossless; atlante standing; GIF normali e lente per direzione e insieme; tavole numerate; inventario CSV; manifest con provenienza; manifest runtime separato e prompt completi.

## Identificatori
Usare C08-DIREZIONE-NUMERO, con numero 1–4. Esempio C08-NW-3 corrisponde a walk/NW_02.png (indice file 0–3). L'inventario CSV riporta file, cella originale e hash.

## Esportazione
Celle 512x512, strip 2048x512. Registrazione con sola scala uniforme basata sulla larghezza del berretto verde e margine superiore costante, rispetto alla standing della stessa direzione. Nessuna specchiatura, deformazione o interpolazione di pose. Alpha generato preservato. Root proposta [256,390], dimensione nel gioco proposta [96,96], 7 fps: parametri ancora da verificare nel motore.

## Stato
TEST_VISUAL_REVIEW. Non e' integrato nel gioco e non sostituisce i C08 esistenti. Controlli tecnici su dimensioni, alpha, margini, completezza e disegni distinti; la qualita' dell'alternanza, delle transizioni, degli accessori e dell'appoggio a terra richiede revisione visiva. Le fasi nel manifest sono candidate, non una certificazione biomeccanica. Fonti e prompt restano disponibili per sostituire un singolo frame.

## Generazione
Tool image_gen integrato: una tavola standing 4x2 e un foglio 2x2 per ciascuna delle otto direzioni. Carta C08 originale per identita', D08 V01 per stile, nuova standing C08 per coerenza dei cicli. Prompt integrali in prompts.json. Non usato il percorso CLI/API.

## Revisione visiva iniziale
Il Nord usa il foglio ripulito dall'alone semitrasparente. In NE l'alternanza degli arti resta insufficiente: due tentativi aggiuntivi sono conservati in source/candidates_unused/ e NON vengono consumati. Anche SW ha contatti troppo simili e merita una revisione puntuale. Gli accessori restano su lati anatomici fissi, con possibili variazioni di forma/scala da controllare fra pose. Le GIF e la tavola numerata servono per scegliere le sostituzioni.

## Archivio completo
[PNG, sorgenti, prompt, GIF e tavole numerate su Drive](https://drive.google.com/file/d/195ybq4GU-ZEL_65g4w_OekOg7qp2FP2M/view?usp=drivesdk)
