# S08 V02 — 6 pose da rifare — R01 CANDIDATI NON APPROVATI

Richiesta dell'utente: NE fotogrammi 3/4 (indici 2/3), NW 1/2 (0/1), SE 1 (0, piede sinistro), SW 3 (2). Lo stato della richiesta rimane DA RIFARE finche' non arriva l'approvazione estetica. Nessuna sostituzione attiva autorizzata o effettuata.

## Originali
originals/ conserva quattro spritesheet WebP e le sei celle originali estratte, senza modifiche. Gli hash Git delle quattro strip sono confrontati con i file del repository al commit riportato in request.json: corrispondenza esatta verificata prima della generazione. Le references/ contengono celle di contesto e standing della V02; il personaggio non e' stato ridisegnato secondo le versioni di altri semi.

## Candidati e prove
candidates/ contiene sei PNG RGBA 512x512 e sei WebP lossless. generated_sources/ conserva i risultati di image_gen prima della registrazione. La registrazione applica soltanto una scala uniforme e una traslazione per allineare testa e corpetto rosso all'originale dello stesso slot. Non vengono specchiati, deformati o interpolati gli arti.

trial_cycles/ e' SOLO una simulazione: nelle quattro direzioni combina le sei nuove pose candidate con i dieci frame originali non segnalati. I dieci frame rimanenti sono identici pixel per pixel alle celle originali; non vengono riregistrati. Queste strip non sostituiscono characters/s08/v02-handsfree-test/walk/*.webp e non sono collegate al motore.

previews/ mostra originale a sinistra e prova non approvata a destra, in velocita' normale e lenta. Il bordo azzurro appare soltanto sugli slot candidati. qa/ contiene confronti affiancati per posa e una tavola riepilogativa. manifest.json e frame_inventory.csv riportano numeri visibili 1–4, indici 0–3, fonti e hash.

## Stato
CANDIDATI DA VALUTARE, approved=false, applied=false, active_replacements=0. I controlli tecnici verificano completezza, trasparenza, margini e conservazione degli originali; non equivalgono ad approvazione del movimento. Verificare direzione dei piedi, sovrapposizione degli arti, fase del passo, contatto a terra e continuita' con i frame adiacenti.

## Generazione
Tool image_gen integrato, una posa per chiamata, con gli originali V02 come target e fotogrammi adiacenti come riferimento. I tentativi successivi rimangono archiviati; il manifest identifica il sorgente scelto per ogni candidato. Prompt completi in prompts.json. Non usato il percorso CLI/API.

## Materiale di revisione
[Raccolta Drive: ZIP completo con sorgenti, tavola e GIF lente](https://drive.google.com/drive/folders/1C6lfLVo1EB2KoxYNMe4Q12fKP4DyPorQ)

Questo ramo contiene solo materiale candidato e di confronto in una cartella separata; i risultati grezzi e tutti i prompt sono nel pacchetto Drive. Gli asset in uso sotto s08/v02-handsfree-test/ non sono modificati.
