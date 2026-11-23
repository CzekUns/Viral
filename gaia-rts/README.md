# Gaia RTS — **Final Fantasy IX: asset originali**

Questa cartella contiene un esperimento non ufficiale: un RTS che usa direttamente i **modelli 3D e le texture originali di FF9**, una volta importati dal proprietario del gioco. **Nella repository non ci sono asset Square Enix.**

## Avvio
- Apri \`index.html\` (reindirizza a \`authentic.html\`) in Chrome/Firefox con rete disponibile.
- L'interfaccia richiede due file reali: **(1) il GLB della mappa 3D originale dell'overworld** e **(2) almeno un GLB dei mini-personaggi originali**.
- Il gioco carica GLB veri nel renderer Three.js; conserva texture/UV/materiali e, per i personaggi, riproduce quando presenti le clip idle/walk.
- Dopo l'import seleziona **Avvia l'RTS**. I file sono memorizzati localmente in IndexedDB; non vengono inviati al server.
- Puoi importare più personaggi insieme; sono assegnati alle unità come varianti cicliche. Un esercito può contenere più copie dello stesso personaggio. La fazione è distinguibile dall'anello colorato, non altera le texture del modello originale.

**Comandi:** tocca un personaggio per selezionarlo; tocca la superficie per muovere le unità selezionate; tocca un nemico per impostare l'inseguimento; trascina per spostare la camera; pinch per zoom. I pulsanti permettono selezione totale, reclutamento e pausa.

**Scenario:** Lindblum contro Burmecia e Alexandria. I tre segnaposto sono posizionati *approssimativamente* tramite coordinate normalizzate all'interno della geometria caricata; non dichiarano di essere già calibrati sulle posizioni geografiche esatte di FF9. Il pathfinding nel codice attuale segue la superficie trovata dai raycast, senza ancora distinguere bene ogni fiume, costa, collisione, strada o nave. Questi sono i prossimi passaggi tecnici.

## Come ottenere i mini-personaggi reali (da FF9 Steam / GOG)
Il tool open source [Dream World IX / ff9mapkit](https://github.com/GameJawnsInc/Dream-World-IX) esporta i modelli \`GEO_SUB_W0_*\` dalla tua installazione del gioco.

Su Windows con FF9 installato:

\`\`\`powershell
py -m pip install "ff9mapkit[assets]"
ff9mapkit setup
ff9mapkit model-gltf GEO_SUB_W0_001 --anims all --out gidansmall.glb
ff9mapkit model-gltf GEO_SUB_W0_002 --anims all --out garnetsmall.glb
\`\`\`

Puoi anche eseguire \`scripts/export_ff9_units.ps1\` per esportare sei attori confermati. Tra quelli noti:
- \`W0_001\` = Gidan/Zidane (mini);
- \`W0_002\` = Garnet/Dagger (mini);
- \`W0_003\` = Chocobo;
- \`W0_008\` = Blue Narciss;
- \`W0_009\` = Hilda Garde 3;
- \`W0_010\` = Invincible.

Nel catalogo sono identificati **21** modelli di tipo overworld, ma **non tutti sono piccoli guerrieri**: ci sono mezzi e varianti. Per trovare il catalogo di ogni identificativo usa \`ff9mapkit models GEO_SUB_W0_001\` e la documentazione del toolkit.

## Come ottenere il terreno 3D autentico
Risorsa reperibile: [Final Fantasy IX → Overworld (The Models Resource)](https://models.spriters-resource.com/pc_computer/finalfantasyix/asset/303153/).

1. Scarica il pacchetto e estrailo **sul tuo dispositivo**, senza committarlo nella repo.
2. Se il contenuto è OBJ/FBX/DAE con texture, usa Blender per convertire la scena a **un GLB**. Lo script \`scripts/convert_overworld_blender.py\` importa questi formati e crea un GLB (controlla in Blender che i materiali e la posizione dei blocchi siano corretti).
3. Esempio, con Blender nel PATH:

\`\`\`powershell
blender -b --python scripts/convert_overworld_blender.py -- "C:\FF9\Overworld" "C:\FF9\overworld.glb"
\`\`\`

4. In \`authentic.html\`, apri le impostazioni asset e scegli il GLB del terreno e quelli dei personaggi.

**Limite verificabile:** la composizione/UV originali dell'archivio 303153 non sono state testate qui, perché il server di download non ha restituito l'archivio al nostro ambiente. Non dare per scontato che qualsiasi rip del terreno sia già pronto da importare o che tutte le texture siano collegate automaticamente.

## Codice e test
- \`authentic.html\`: motore renderer WebGL, input touch e interfaccia per GLB autentici.
- \`scripts/export_ff9_units.ps1\`: comandi batch di estrazione dalla tua installazione.
- \`scripts/convert_overworld_blender.py\`: convertitore dati scaricati in GLB.
- \`legacy-prototype.html\`: primo test di gameplay con geometria disegnata procedurale; **non è la versione approvata**.

**QA effettuato:** il codice JavaScript del renderer 3D supera il controllo di parsing. **Non è ancora stato provato con gli asset reali** né validato con un test touch su browser Android. Non considerare la modalità 3D un prodotto completo fino a queste verifiche.

## Licenze
Il codice originale dell'esperimento è distinto dai dati del gioco. I modelli e le texture di FF9 sono protetti da copyright e l'estrazione dalla propria installazione non concede automaticamente il diritto a distribuirli tramite GitHub Pages o altri canali. L'esperimento è fan-made, non affiliato a Square Enix, e **non redistribuisce asset del gioco**. Verifica l'autorizzazione/licenza applicabile prima di qualunque pubblicazione con asset originali.
