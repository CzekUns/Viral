# C08 Fante di Coppe — V02 compatto — WALK TEST

Camminate del nuovo modello compatto approvato in chat il 21 novembre 2026. Il modello master e' source/standing_source.png: testa e mani piu' grandi, arti piu' corti, volumi pieni, pittura morbida con meno tratteggio. Abiti e colori Coppe, coppa aperta al fianco anatomico destro, spadino al sinistro, mani libere.

## Contenuto
8 standing, 32 frame PNG RGBA, 8 strip walk e 8 standing WebP lossless, atlante standing, GIF normali e lente, tavole numerate, inventario CSV, manifest completo e runtime separato, sorgenti e prompt. I frame provengono da nuove generazioni sul modello V02; i vecchi cicli V01 non sono riutilizzati.

## Identificatori
C08-V02-DIREZIONE-NUMERO, con numero 1–4. Esempio C08-V02-NW-3 = walk/NW_02.png. File e indice originale nel CSV e nel manifest.

## Esportazione
Celle 512x512, strip 2048x512. Registrazione con sola scala uniforme sulla larghezza del berretto verde rispetto alla standing della stessa direzione e margine superiore costante. Nessuna specchiatura, deformazione o interpolazione. Root proposta [256,390], render [96,96], 7 fps; parametri da verificare nel gioco. Alpha generato preservato.

## Stato
Modello grafico approvato; cicli di camminata TEST_VISUAL_REVIEW. Nessuna integrazione nel motore o sostituzione degli asset attivi. Le fasi nel manifest sono candidate; i controlli tecnici non certificano alternanza degli arti, transizioni, coerenza accessori o appoggio a terra. GIF e tavole servono alla revisione dei singoli frame.

## Generazione
Tool image_gen integrato, una chiamata per direzione con 4 pose (contatto/passaggio/contatto opposto/passaggio opposto) richieste, usando soltanto la standing V02 della stessa direzione. Prompt integrali in prompts.json. Nessun percorso CLI/API.

## Prima revisione
Lo stile compatto e la pittura morbida sono mantenuti. Nelle diagonali NE/NW/SW alcuni contatti e movimenti delle braccia restano simili: l'alternanza degli arti richiede revisione puntuale. Anche forma della coppa, visibilita' dello spadino e continuita' della piuma vanno confrontate fra i frame. Questi cicli sono consegnati per selezionare le correzioni, senza approvazione finale del movimento.

## Archivio completo
[PNG, sorgenti, prompt, GIF e tavole numerate su Drive](https://drive.google.com/file/d/19M-RdwCPoUkB1Y9S0UFMlivHjwwlV2de/view?usp=drivesdk)
