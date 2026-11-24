# Aggiornamento animazioni 3D · 24 novembre 2026

**[Avvia Gaia RTS](https://czekuns.github.io/Viral/gaia-rts/)** · [Animatore procedurale](procedural-animator.js) · [6 test automatici](tests/animation.test.mjs)

### Stato attuale — animazioni nel gioco

Gli asset di partenza sono i **13 modelli GLB originali** del pacchetto starter, estratti da FF9 e convertiti mantenendo mesh, UV, materiali e texture. L'ispezione reale dei GLB ha confermato **0 rig/skins e 0 animation clips** per tutti i 13 modelli. Non è quindi possibile riprodurre già le clip native.

**Implementato in-game:** l'animatore prepara 4 morph target per ogni mesh statica (passo sinistro, passo destro, attacco, reazione ai colpi), una sola volta per modello, riutilizzandoli tra tutte le unità. I morph vengono applicati dalla GPU; l'animazione procedurale **non sostituisce i GLB originali** e non cambia le texture. La caduta finale usa una rotazione progressiva del modello e dura circa 1,25 s prima che l'unità venga rimossa. Sono presenti idle, walk, attack, hit, death e transizioni in base al gameplay reale; terminato il movimento, i piedi non saltellano più.

**Per provarli:** apri il gioco, premi **▣ Tutte**, tocca un punto vicino del terreno per far marciare la squadra. Premi **⚔ Attacca** per visualizzare subito l'animazione d'attacco delle unità selezionate; tocca un nemico per avviare un attacco reale con danno, reazione e morte.

**Priorità animazioni originali:** se in futuro si importano GLB con rig e clip native, l'animatore usa automaticamente quelle che corrispondono a `idle/stand/wait`, `walk/run`, `attack/strike/swing`, `hit/damage/hurt` e `death/dead/fall`, usando i morph solo come fallback quando mancano clip. Per recuperare le animazioni autentiche FF9 serve accedere ai dati dell'installazione PC Steam/GOG: il repository già include `scripts/export_all_ff9_overworld.py` e il toolkit Dream World IX consente l'esportazione `model-gltf --anims all`. Al momento **non sono state estratte né caricate nuove animazioni originali**, per mancanza dei file di gioco.

**QA:** 6/6 test unitari Node superati su GitHub Actions (`Gaia RTS — Animation QA`), verifica della sintassi JS in `authentic.html`, CRC del pacchetto starter e 13 GLB con intestazione valida. Deploy GitHub Pages confermato. La resa effettiva in WebGL su Android **non è ancora stata collaudata**: verificare visivamente le deformazioni e gli FPS sul dispositivo.

---

# Gaia RTS · Final Fantasy IX 3D (GitHub Pages)

**Stato aggiornato — 23 novembre 2026.** L'utente ha autorizzato esplicitamente l'uso e la pubblicazione nel proprio repository di tutti i modelli FF9 estratti e convertiti, per un prototipo personale non commerciale. La repository `CzekUns/Viral` è stata resa nuovamente pubblica dal proprietario.

## Avvio diretto del gioco

**Gioca:** https://czekuns.github.io/Viral/gaia-rts/

Il gioco carica **automaticamente** `gaia-rts/assets/FF9_GaiaRTS_Starter_Originali.zip` dal medesimo dominio GitHub Pages. Il pacchetto include **l'Overworld autentico di FF9 in GLB + 13 modelli di personaggi originali** (7 alleati e 6 avversari). Dopo il download, il browser apre una schermaglia con selezione touch, movimento RTS sul terreno 3D, combattimento base, reclutamento, IA nemica e conquista di tre città-segnaposto. Non serve più scaricare o scegliere file GLB/ZIP manualmente.

L'intero catalogo di **70 GLB** (85,7 MB non compressi) è presente e referenziabile da `gaia-rts/assets/all/`; i metadati sono in `gaia-rts/assets/catalog.json`. Il gioco iniziale carica **13 dei 70**, per evitare di saturare la RAM di smartphone modesti. Gli altri modelli sono disponibili per gli sviluppi successivi, ma non sono già tutti unità attive in partita.

L'importazione manuale da ZIP resta disponibile dal pannello ⚙ per i test. Il gioco memorizza gli asset in IndexedDB quando lo spazio lo consente.

## Verifiche e limitazioni attuali

- Gli ZIP originari dell'utente e i **70 file GLB** sono stati convalidati, compreso l'Overworld e i materiali/texture.
- I tre punti di generazione di Lindblum, Burmecia e Alexandria sono stati verificati geometricamente sulla mesh `Terrain-material` della mappa reale; rappresentano ancora coordinate tattiche provvisorie, non georeferenziazione definitiva.
- La sintassi JavaScript del caricatore è stata validata; il job GitHub Pages è riuscito con gli asset nella directory pubblicata. **Non equivale a un test end-to-end WebGL su Android**, che resta da eseguire.
- Gli archivi esportati non contengono animazioni complete di camminata/combattimento. Le unità si muovono sul terreno reale con un leggero ciclo procedurale.
- I modelli rimangono proprietà dei rispettivi titolari; l'uso personale/non commerciale non costituisce automaticamente una licenza di ridistribuzione.

## Struttura

- `index.html` → ingresso e redirect al renderer autentico.
- `authentic.html` → Three.js, UI smartphone, combattimenti RTS e caricamento ZIP automatico.
- `assets/FF9_GaiaRTS_Starter_Originali.zip` → pacchetto di avvio autocaricato (~12,7 MB).
- `assets/all/` → 70 file GLB originali suddivisi per categoria.
- `assets/catalog.json` → manifest dei 70 GLB con hash e origine.
- `scripts/` → strumenti per conversione e verifica.
- `legacy-prototype.html` → vecchia demo stilizzata, **non** il gioco principale.

---

## Build privata con asset FF9 originali — novembre 2026

La repository `CzekUns/Viral` è **pubblica** (verificato via GitHub): gli asset non devono essere aggiunti qui per il solo fatto che il proprietario conosce l'URL. L'interfaccia pubblica del progetto **non contiene** i GLB o gli ZIP Square Enix.

Per evitare l'importazione manuale continua, il motore supporta ora due modalità:

1. **Build HTML privata**: file `Gaia_RTS_FF9_Privato.html` preparato e consegnato all'utente nella conversazione. Ha il pacchetto starter originale incorporato e non richiede caricamento manuale dei modelli. Scaricarlo dal messaggio; non è pubblicato né ospitato su GitHub.
2. **Deploy privato con asset accanto al codice**: `authentic.html` prova automaticamente a recuperare `assets/FF9_GaiaRTS_Starter_Originali.zip` da un server **con accesso protetto**. Se assente, usa il caricamento manuale con ZIP come prima. Attenzione: mettere il file sotto una directory servita da GitHub Pages rende il suo contenuto normalmente accessibile agli utenti del sito anche quando il repository sorgente è privato.

Il singolo HTML privato carica le librerie Three.js da CDN (richiede Internet), ma incorpora la geometria e le texture FF9 direttamente nel file. Include navigazione su terreno a griglia derivata dal GLB, unità originali e combattimenti sperimentali. Sono stati verificati il parsing JavaScript e l'identità SHA-256 del pacchetto incorporato; **il rendering reale su Android non è ancora stato collaudato**.

---

## Aggiornamento — pacchetto completo di 67 asset (23/11/2026)

È stato acquisito dall'utente `FF9_67_Asset_Originali.zip`, catalogo The Models Resource con **67 ZIP originali**. Nessun ZIP è stato caricato su questa repository pubblica.

Verifica tecnica e conversione **fuori da GitHub**:
- 66 archivi DAE non-Overworld analizzati e convertiti senza errori in 69 file GLB statici.
- Per 3 archivi sono presenti due varianti/scenari DAE, quindi il numero di GLB supera quello degli archivi.
- Il GLB dell'Overworld già preparato completa **70 file GLB**.
- I 69 GLB sono stati ricaricati con trimesh e tutte le mesh hanno materiali/texture originali collegati. Le normali, UV e triangoli derivano dal COLLADA estratto.
- **Non sono comprese animazioni walk/attack** nei DAE del catalogo. L'RTS utilizza temporaneamente una piccola oscillazione procedurale nel movimento.

### Importazione in un solo ZIP — Android e PC

L'utente ha a disposizione, come allegato nella propria conversazione (non su GitHub):
- `FF9_GaiaRTS_Starter_Originali.zip` — ~12,7 MB, Overworld autentico + **13** modelli originali selezionati, con manifest `starter.json` e assegnazione di fazione (7 alleati, 6 avversari).
- `FF9_GaiaRTS_70_GLB_Completo.zip` — ~49,3 MB, **70** GLB e manifest completo per evoluzioni successive.

In [Gaia RTS](https://czekuns.github.io/Viral/gaia-rts/) è presente il campo **Importazione rapida — un solo ZIP**: seleziona lo **starter**, attendi l'importazione 3D, poi il gioco avvia automaticamente la prima schermaglia. Tutti i modelli vengono letti direttamente dalla ZIP nel browser e, se la quota del dispositivo lo consente, conservati localmente tramite IndexedDB. La mappa e le miniature non sono mai servite da GitHub Pages.

Il motore associa correttamente i modelli `ally` agli alleati e `enemy` agli avversari, gestisce la selezione delle unità con tap sullo schermo, movimento sul terreno reale, AI basica, reclutamento e conquista; modello/unità 3D ancora da testare in Chrome/Android prima di definire il prototipo completo.

**QA:** zip originale 67/67 valido; conversioni 66/66 DAE processate; 69 GLB statici validati come scene 3D; zip starter/completo CRC senza errori; parser JavaScript della pagina aggiornato OK. **Non è stato fatto un test WebGL end-to-end su Android**. Coordinate iniziali delle città sono ancora provvisorie.

---

# Gaia RTS — Final Fantasy IX / Original Assets

Prototipo RTS in Three.js basato sugli **asset 3D originali dell'overworld di Final Fantasy IX**, importati localmente dal giocatore. Il codice del motore è nella repository; gli asset Square Enix **non** sono distribuiti da GitHub Pages.

## Stato del 23 novembre 2026

- **Terreno autentico acquisito** dall'archivio condiviso dall'utente `PC _ Computer - Final Fantasy IX - Maps - Overworld.zip`.
- Sorgente: `Overworld/Overworld.dae` (33.862.524 byte), 29 file texture PNG.
- Convertito e verificato: `FF9_Overworld_Original.glb` (32.797.576 byte), **282.810 triangoli**, 32 mesh/materiali, 30 immagini/texture incorporate nel GLB. Modello visualizzato anche come proiezione dall'alto: quattro continenti originali riconoscibili.
- Il GLB è stato consegnato all'utente nella conversazione, **non caricato nella repository pubblica**.
- Importer GLB funzionante a livello di codice: carica mesh, materiali/texture; il mondo viene scalato, centrato e visualizzato sul renderer WebGL.
- Nuovo indice spaziale ricavato dai triangoli autentici di `Terrain-material` e `Beach*-material` per trovare le superfici calpestabili, con A* tra punti di terraferma. Previsto blocco del movimento attraverso il mare.
- Scenario iniziale: Lindblum, Burmecia, Alexandria; posizioni provvisorie su coordinate di terreno reale. Entrambe le città nemiche sono collegate via superficie terrestre alle unità di Lindblum. **Posizioni non ancora verificate come canoniche.**
- **Mancano i GLB dei mini-personaggi originali** (`GEO_SUB_W0_*`); senza di essi è attiva solo l'esplorazione 3D della mappa, non il combattimento RTS.
- **QA**: parsing JavaScript verificato; GLB validato con `trimesh` e controlli di header, indici, immagini e materiali. Rendering Chrome/Android con il GLB completo **non ancora collaudato**.

## Giocare / esplorare la mappa autentica

1. Apri [Gaia RTS](https://czekuns.github.io/Viral/gaia-rts/) (reindirizza a `authentic.html`).
2. Scarica `FF9_Overworld_Original.glb` dalla conversazione in cui è stato prodotto (non è pubblicato nel repository).
3. Nel pannello degli asset premi **Overworld 3D originale** e seleziona il GLB.
4. Premi **Avvia l'RTS**: la mappa è esplorabile in 3D, con drag e pinch per zoom.
5. Per attivare unità e combattimenti, importa almeno un GLB originale dei piccoli personaggi FF9 nel campo **Mini-personaggi**.
6. Il browser salva i dati in **IndexedDB locale**, così i GLB si possono riutilizzare alla sessione successiva.

**Comandi**: tap sulla miniatura per selezionare; tap sul terreno per muovere, tap su un nemico per ingaggiare. Pulsanti Tutte, Marcia, Attacca, Recluta, Pausa. Camera mobile drag/pinch e controlli zoom.

## Conversione dell'archivio originale

L'archivio condiviso contiene una scena COLLADA con mesh e texture. Sono disponibili due conversioni:

- Python testato per questo archivio: `scripts/convert_overworld_collada.py`
- Blender: `scripts/convert_overworld_blender.py`

Con Python:

```bash
python -m pip install lxml numpy trimesh Pillow
python scripts/convert_overworld_collada.py "Overworld/Overworld.dae" "FF9_Overworld_Original.glb"
```

La cartella `Textures/` deve rimanere accanto al DAE. La conversione Python produce un GLB con texture incorporate e mantiene i nomi dei gruppi di materiali originali.

## Mini-personaggi originali di FF9

Il toolkit [Dream World IX / ff9mapkit](https://github.com/GameJawnsInc/Dream-World-IX) può esportare dalla propria installazione di FF9 PC i mini-modelli `GEO_SUB_W0_*` in GLB, con texture e animazioni.

Esempio (verificare i prerequisiti del progetto ff9mapkit):

```powershell
ff9mapkit model-gltf GEO_SUB_W0_001 --anims all --out GidanOverworld.glb
ff9mapkit model-gltf GEO_SUB_W0_002 --anims all --out GarnetOverworld.glb
```

Lo script `scripts/export_ff9_units.ps1` contiene una lista iniziale di identificativi. Una volta importati, le unità vengono istanziate dai modelli originali con animazioni disponibili; gli anelli colorati identificano la fazione senza modificare la texture.

## File

- `authentic.html` — renderer del mondo 3D autentico, controlli e primo RTS.
- `index.html` — ingresso, redirect alla modalità autentica.
- `scripts/convert_overworld_collada.py` — conversione verificata di mesh e texture dal DAE fornito.
- `scripts/convert_overworld_blender.py` — convertitore alternativo.
- `scripts/export_ff9_units.ps1` — esportazione dei modelli piccoli da un'installazione FF9.
- `legacy-prototype.html` — precedente prova procedurale, **non approvata come stile**, conservata solo a riferimento.

## Limiti e diritti

Il motore RTS è ancora un prototipo: collisioni, pendenze, animazioni e navigazione richiedono collaudo reale con i mini-personaggi. Le località della campagna hanno marcatori tattici e non ancora gli edifici 3D originali calibrati.

Final Fantasy IX, modelli, texture, personaggi e topografia originale appartengono ai titolari dei diritti. L'estrazione dalla copia del gioco non implica una licenza di ridistribuzione pubblica: per questo il sito non carica automaticamente il GLB originale da GitHub. Progetto fan-made non affiliato a Square Enix.

## Esportazione automatica di tutti i 21 modelli overworld

Lo ZIP `Dream-World-IX-master.zip` è **solo il toolkit**, non contiene le mesh/texture originali dei mini-personaggi. Serve una installazione originale FF9 per PC Steam/GOG con `StreamingAssets/p0data4.bin` e `p0data5.bin`.

Dopo avere installato `ff9mapkit[assets]`, esegui:

```powershell
python scripts/export_all_ff9_overworld.py --game "C:\\SteamLibrary\\steamapps\\common\\FINAL FANTASY IX" --out FF9_MiniOverworld
```

Lo script legge direttamente il catalogo del toolkit, identifica i 21 `GEO_SUB_W0_*`, li esporta con le clip originali e produce `FF9_MiniOverworld.zip` con `manifest.json`, separando personaggi, chocobo, veicoli e altri. La cartella sorgente del gioco non viene modificata. Alcune esportazioni potrebbero fallire e vengono annotate nel manifest senza interrompere l'intero processo.
