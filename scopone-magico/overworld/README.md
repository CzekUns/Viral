# SCOPONE ALCHEMICO — Overworld v0.1 (isometria canonica)

**Stato:** prima versione esplorabile da smartphone; grafica provvisoria sostituibile. Le altre due modalità, `quick` e `draw`, continuano a usare l'originale `ScoponeEngine` e non dipendono da questi file.

## Avvio

Selezionare **Overworld** dal menù di `scopone-magico/index.html`. Per vedere la modalità isolata aprire `scopone-magico/overworld/index.html`. Servire la repository tramite HTTP(S), per esempio `python -m http.server 8765`, poi usare il browser. Il motore usa moduli ES ed esegue `fetch()` dei JSON: non aprire il file HTML con `file://`.

**Comandi:** joystick touch in basso a sinistra, tocco su una piastrella per seguire un percorso A*, pulsanti +/− per zoom (0.65–1.9). Su desktop anche frecce o WASD. Aggiungere `?debug=1` a `overworld/index.html` per visualizzare coordinate, chunk caricati e provare il portale verso D. Torna al menù salva la posizione.

## Geometria non negoziabile

- Proiezione ortografica vera isometrica (due assi orizzontali con inclinazione **±29.98°**, angolo interno di **circa 120.04°**); niente prospettiva, rotazione o riduzione in profondità.
- Sprite tile sorgente **104×60 px**. Scala logica predefinita **0.5** → rombo **52×30 px** con zoom regolabile; rapporto **1.733:1** (approssimazione raster di √3).
- Con coordinate di cella (non pixel): `screenX = originX + (x-y) * (52/2)`; `screenY = originY + (x+y) * (30/2)` prima di camera e zoom. Formule inverse in `engine/geometry.js`.
- `x` positivo scende verso destra; `y` positivo scende verso sinistra. I personaggi hanno posizione globale fluttuante, ancorata **ai piedi** e disegnata dopo il terreno, con futura sovrapposizione ordinata per `x+y`.
- La telecamera segue e trasla; lo zoom si applica nel rendering e **non** modifica collisioni, mappe o coordinate.

## Mondo, zone e chunk

`maps/world.json` descrive un mondo 64×64 tile. Quattro zone da **32×32** (1.024 tile per zona) compongono una matrice 2×2: A nordovest, B nordest, C sudovest, D sudest. Ogni zona viene suddivisa in **4 chunk da 16×16**; il motore predispone i chunk visibili e quelli vicini a un confine. Nessuna schermata o dissolvenza viene usata passando da A a B, B a D, ecc.: il personaggio mantiene coordinate globali continue.

I singoli JSON `maps/A.json` … `D.json` contengono:

- `id`, `worldX`, `worldY`, `width`, `height` (si supportano zone da 64×64 con lo stesso formato);
- `floor`, `floorVariants` e `tileOverrides` (tile scelti via ID dell'asset manifest);
- `collision: { defaultBlocked, blocked: [[tileX,tileY],…], open: […] }` — materializzata come vera griglia logica `Uint8Array`, con eventuali footprint occupati da oggetti;
- `entrances`, `exits`, `portals`, `entities`, `objects`, `layers`, `assetRefs`.

Un oggetto futuro può essere `{ "x": 4, "y": 6, "assetId": "chest", "solid": true, "footprint": [2,1], "layer": "objects" }`. Non c'è alcun oggetto nel prototipo: soltanto pavimento e personaggio. L'estensione decorativa delle piastrelle ai bordi esterni evita spazi vuoti nella camera, mentre le **collisioni impediscono** di uscire dalle zone reali.

Per aggiungere una zona, definirla in un JSON, inserirne il percorso nell'array `world.zones`, estendere `width`/`height` e fornire i vicini in `exits`. Per portali/porte usare il campo `portals` con `active:true`, `tileX`, `tileY`, `toZone`, `entrance`: il metodo `portal(zoneId, entrance)` esegue breve dissolvenza e raggiunge l'ingresso predefinito.

## Contratto asset — per l'agente grafico

```text
overworld/
  assets.json       Manifest, riferimento canonico a tutti i PNG/WebP
  maps/             world.json e una definizione per ogni zona
  tiles/            PNG/WebP con rombo 104×60px, ripetibile, trasparenza esterna
  characters/       Sprite WEBP/PNG trasparenti e spritesheet direzionali
  objects/          Futuri oggetti e descrizioni footprint
  effects/          Futuri effetti non bloccanti
  ui/               Comandi e stili
  engine/           Geometry, World, Renderer, Pathfinding, Input, AssetLibrary
  tests/            Test unitari Node
```

Per cambiare tutto il pavimento, basta sostituire gli asset `tiles/*.webp` o le relative voci `images` in `assets.json`: la geometria, le collisioni e i file delle zone **non vanno toccati**. Le 8 texture attuali sono quattro coppie di sfumature chiare e anticate senza edifici o ornamenti.

Personaggi: `images.player.src` indica il raster provvisorio (autore: generazione originale per il prototipo) con `anchor:[.5,.99]`, base ai piedi. `directions:{N,NE,E,SE,S,SW,W,NW}` può indirizzare 8 sprite sostitutivi; una direzione assente riutilizza il raster di base e applica la riflessione destra/sinistra. `animations` può dichiarare `frames` e `fps` per spritesheet orizzontali; `renderSize` è la misura logica. Per nuove entità, fornire `assetId`, posizione globale, footprint, scala, punto d'ancoraggio e ordine di livello. La silhouette provvisoria **non** è artwork definitivo approvato.

## Salvataggio e integrazione con la partita a carte

Salvataggio autonomo, senza librerie: chiave `localStorage` `scopone-alchemico:overworld:v1` (versione, x, y, zona, zoom, timestamp). Viene aggiornato mentre si cammina, cambiando zoom, attraversando portali e uscendo.

`window.ScoponeOverworld` espone `position()`, `portal(zoneId, entranceId)`, `on(event, handler)`, `save()`, `launchScopone(details)` e `reward(details)`. Emette i CustomEvent `scopone:overworld:ready`, `zonechange`, `portal`, `challenge-request`, `reward`. Se in iframe, `launchScopone()` può inoltrare al parent `postMessage({type:'scopone-overworld-challenge',payload})`. **La sfida vera e le ricompense non sono ancora attivate:** sono punti d'aggancio per la fase RPG successiva.

Il menù principale carica `overworld/index.html` in un iframe solo alla selezione della terza modalità. Il messaggio di uscita riporta al menù, salvando prima la posizione. La logica di partita in `index.html` e `engine.js` resta invariata.

## Collaudo

- `cd scopone-magico/overworld && node --test tests/*.test.mjs` — geometria, inversa, angoli, zone, chunk, collisioni, movimento e ricerca percorso.
- QA con Chromium: viewport 360×640 (9:16), 360×780 (9:19.5), 390×844, 412×915 e 430×956 (~9:20); immagini caricate, controlli e mappe in uno schermo verticale.
- QA interattiva: attraversamenti continui A→B e B→D, tocco per raggiungere una cella, zoom senza modifica posizione, portale verso C e ridimensionamento camera.
- **Limite dell'ambiente di test:** la navigazione a URL HTTP/file è bloccata in Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`). È stata usata una *copia di prova* dell'HTML che contiene gli stessi JS e le stesse immagini originali con URL `data:` e un sostituto locale del `fetch` dei JSON; la build distribuita mantiene file separati ed `import`/`fetch` normali. Non rivendichiamo una navigazione GitHub Pages verificata dal browser in questa esecuzione.

## Fuori ambito

NPC, nemici, inventario, missioni, combattimenti, connessione effettiva delle sfide con lo Scopone, asset finali. Nessuna modifica alle regole delle modalità Partita rapida / Modalità 2.


## Overworld esterno V01 — Campania / Golfo di Napoli

La voce **Overworld** nel menu originale continua a caricare `overworld/index.html`, ma ora l'apertura iniziale porta alla **mappa esterna**. `maps/external/world.json` definisce città, coordinate, etichette, scala e punti di uscita; `maps/external/campania.json` descrive la costa, il golfo, il promontorio sorrento, le isole e il terreno naturale. La silhouette campana è **illustrativa**, non cartografia GIS. `engine/terrain.js` interpreta la topografia e genera la griglia di collisioni (mare bloccato, terreno percorribile). Gli asset sono in `tiles/outside/` e `objects/outside/`, registrati esclusivamente in `assets.json`.

**Scala esterna:** mondo 96×96, joystick e tap-to-move A*, camera isometrica; sprite C08 in piccolo (48×48 logici, zoom 0.88). Entrando nella **cella** di un borgo (Napoli, Pozzuoli, Torre del Greco, Caserta, Sorrento, Salerno) si attiva il fade. I borghi hanno `id`, `name`, `x/y`, `assetId`, `map`, `entry`, `exitInside` e `returnOutside`. Le coordinate dei borghi sono celle della mappa esterna, non latitudine/longitudine.

**Scala interna:** riusa senza duplicarlo il mondo storico `maps/world.json` e le sue 4 zone A/B/C/D da 32×32. Pavimento a scacchiera isometrica vuota, C08 a 110×110 logici e zoom 1.08. La via d'uscita è il cerchietto **USCITA** nella cella locale [16,19]; in alternativa è presente **Esci dalla città**. L'uscita restituisce il personaggio al punto `returnOutside` del relativo borgo, lontano dalla cella d'ingresso per evitare rientri ripetuti. La mappa interna è ancora un'unica *base tecnica condivisa* tra i sei borghi, progettata per essere sostituita in seguito con mappe distinte (riferimento `map` già previsto nei manifest).

**Dati e salvataggio:** la nuova chiave `localStorage scopone-alchemico:overworld:v2` contiene `scene` (`outside` o `city`), `cityId`, coordinate e zoom indipendenti per ciascuna scena. Alla prima migrazione da `v1`, la precedente posizione viene preservata per una futura mappa cittadina, ma il gioco si avvia all'esterno. Dopo un riavvio di un salvataggio v2 dentro una città, si riparte all'interno. Le API già esistenti (`position`, `portal`, `save`, `launchScopone`) restano, con `enterCity`/`leaveCity` e gli eventi `cityenter`, `cityexit`, `scenechange`.

**Sostituzione asset:** per inserire nuovi WebP/PNG al posto degli SVG provvisori, cambiare i percorsi `images.outer-*` in `assets.json`, mantenendo per i tile il rombo trasparente 104×60. Per città e Vesuvio usare sprite trasparenti con `anchor` ai piedi. `maps/external/campania.json.terrain.tiles` associa tipi di terreno agli ID di texture. I futuri mondi interni potranno avere manifest e file di zone separati; la V01 riusa volutamente il prototipo originale.

**Test:** `cd scopone-magico/overworld && npm test` (o `node --test tests/*.test.mjs`). Controllare inoltre su telefono verticale joystick, tap, zoom, fade, ingresso/uscita, persistenza, e le modalità Partita rapida / Modalità 2. I test Node non sostituiscono un collaudo su un dispositivo Android fisico.
