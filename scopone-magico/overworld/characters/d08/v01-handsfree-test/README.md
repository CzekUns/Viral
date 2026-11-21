# D08 Fante di Denari — V01 mani libere — TEST

Riferimento identita': D08-fante-estratto-album.jpg originale napoletano da Drive; riferimento di stile: S08 V01. Berretto a bordo rosso e corona gialla senza piuma, capelli grigi, grandi risvolti bianchi, corpetto rosso con pannello oro, maniche verdi/gialle e polsini blu, calzoni verdi, calze rosse, scarpe gialle. Denaro decorato al fianco destro, borsello dorato al sinistro, mani libere.

## File
8 standing e 32 keyframe PNG RGBA; 8 strip walk e 8 standing WebP lossless; atlas standing; GIF normali/lente per direzione e panoramiche; tavole QA e tavola 32 frame numerata; inventario CSV; manifest completo con provenienza e manifest runtime. Celle 512x512, root proposta (256,390), render 96x96, 7fps.

## Stato e limiti
V01 TEST, per revisione puntuale dei singoli frame. Controllati alpha, dimensioni, margini, completezza e quattro disegni distinti per ciclo. Nessuna riflessione/deformazione/interpolazione di pose. Registrazione uniforme di scala sul bordo rosso del berretto, rispetto alla standing della stessa direzione.

I nomi delle fasi nel manifest descrivono le pose richieste dal prompt, non una certificazione biomeccanica. Restano da rivedere alternanza degli arti, transizioni, coerenza degli oggetti e della foggia dei risvolti nelle viste posteriori; alcune pose di contatto possono essere troppo simili. Il ciclo NE va rivisto per alternanza, i dettagli posteriori di N/NE possono differire dalla standing. La correzione NW ha rimesso gli accessori sui rispettivi fianchi e il colletto posteriore a triangolo. Nessun test nel motore e nessuna pubblicazione nel gioco. C08/S08/B08 non modificati.

## Revisione
Indicare direzione e numero visibile 1-4, per esempio D08-NE-3. File master: walk/NE_02.png. Indice sorgente del foglio 2x2 e registrazione presenti in manifest.json. La sorgente NW con accessori scambiati e' conservata ma NON utilizzata.

## Prompt di generazione
image_gen: carta D08 per identita' e S08 per stile; camera ortografica isometrica rialzata, otto direzioni; oggetti alla cintura e mani vuote. Una chiamata per ciclo di quattro pose, contatti e passaggi alternati richiesti, piedi/ginocchia/bacino sullo stesso asse del busto, nessun testo o pavimento, fondo trasparente. Correzione del solo foglio NW per lati degli accessori/colletto posteriore.

## Archivio completo
[PNG, sorgenti, GIF, QA e frame numerati su Drive](https://drive.google.com/file/d/1aR0tlBcQmsK2I7ppb4I_83lJ2GX2V9oC/view)
