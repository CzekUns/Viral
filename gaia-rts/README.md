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
