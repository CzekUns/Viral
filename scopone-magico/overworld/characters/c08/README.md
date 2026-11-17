# Scopone Alchemico — Overworld: Fante di Coppe (C08) sprite v0.2

**Asset sorgenti:** Drive progetto, cartella `06 — Archivio bozze grafiche`:
- `C08 WALK V04 — 01 Destra avanti.png`
- `C08 WALK V04 — 02 Mezza destra avanti.png`
- `C08 WALK V04 — 03 Sinistra avanti.png`

Le 3 tavole PNG 1536×768 hanno 8 celle 384×384 ciascuna, orientate nell'ordine S, SE, E, NE / N, NW, W, SW. Sono state tagliate senza alterare il disegno, traslate **solo entro la rispettiva cella** per allineare i piedi a `(192, 365)` e ricomposte in 8 sprite idle da 384×384 e 8 spritesheet di camminata da 1152×384 (3 frame orizzontali).

L'illustrazione della V03 statica è stata esaminata; contiene residui di raster/artefatti geometrici al di fuori delle sagome ed è rimasta esclusa dalla versione giocabile. **La posa idle attuale riutilizza temporaneamente il primo frame di camminata**, senza fingere che sia una vera posa di riposo. Una quarta fase di camminata separata non è ancora presente nel Drive: il ciclo utilizza i tre frame disponibili. La coppa resta alla cintura, come richiesto.

La libreria degli asset risolve ora percorsi separati per `idle` e `walk` in tutte le 8 direzioni, senza riflessioni che spostino la coppa sul fianco sbagliato; il manifest contiene `frameSize`, `frames`, `fps=7`, `anchor` e `renderSize`. L'animazione usa un orologio che si azzera al passaggio da fermo a camminata. Il motore di mappe, collisioni e la modalità Scopone restano intatti.

## QA

- Tutti i 16 file WebP esistono e sono RGBA; 8 × 1 frame idle, 8 × 3 frame walk.
- Per ogni direzione e ogni frame V04 il pixel più basso della sagoma è allineato a y=365 entro la cella da 384 px.
- Le immagini e la logica di selezione direzionale sono esterne al renderer: per sostituire il personaggio servirà soltanto aggiornare il manifest e gli asset.
