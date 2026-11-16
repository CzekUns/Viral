# Scopone Alchemico · Denari classici (D01–D10)

**Stato: bozza per approvazione grafica.** Dieci illustrazioni delle carte napoletane originali, senza generazione AI.

## Provenienza e integrità
Le immagini JPG provengono tutte dalla stessa collezione, la cartella `data/cards/Napoletane` del progetto [OMerkel/scopa_marco](https://github.com/OMerkel/scopa_marco/tree/master/data/cards/Napoletane), che le attribuisce al pubblico dominio tramite [Wikimedia Commons, Naples deck](https://commons.wikimedia.org/wiki/Category:Naples_deck). Licenza dichiarata per le singole immagini in `README` della repository originale.

Ogni `Dxx-nome-originale.jpg` coincide **byte per byte** con il rispettivo file `{1..10}d.jpg` della fonte: verifica tramite identico SHA di blob GitHub per tutte e dieci le carte. Per il gioco, i JPEG intatti sono conservati indipendentemente dalle varianti impaginate.

## Composizioni intoccabili
- **Asso**: motivo a due rapaci, anelli, testo "DAL NEGRO TREVISO" e "MADE IN ITALY" conservati così come nella fonte. Non abbiamo eliminato il foro bianco né il marchio.
- **2–7**: rispettati i denari dorati con volti solari, le distanze e le composizioni effettive.
- **Fante, Cavallo, Re**: posture, abiti, copricapo, cavallo, monete e colori originali senza ritocchi artistici.

## File da usare
- `Dxx-nome-originale.jpg` = originale canonico intatto
- `Dxx-nome-gioco.svg` = SVG auto-contenuto 600×1000, immagine originale incorporata con proporzioni non deformate, fondo avorio `#F8F2E7`, fascia inferiore 25% per il testo degli effetti.
- Il micro-sigillo geometrico si trova **sulla linea di divisione**, non sopra il disegno. Testi, valore, effetti sono livelli HTML esterni al file.

Lo SVG usa il metodo grafico `mix-blend-mode:multiply` per far armonizzare le aree bianche della fonte sull'avorio del mazzo; il JPEG canonico rimane esattamente intatto. Nessuna ricostruzione o upscaling artistico. Il materiale raster originale ha limiti di definizione.

La galleria `anteprima.html` mostra tutte e dieci le carte con collegamenti diretti ai file sorgente.

**Non sostituire automaticamente le carte, non cambiare il motore né integrare su main prima di approvazione.**