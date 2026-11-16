# SCOPONE ALCHEMICO — COPPE CLASSICHE · C01–C10

**Stato: in attesa di approvazione grafica.**

## Regola fondamentale
Queste sono le **immagini originali delle carte napoletane**: non sono state rigenerate o ridisegnate dall'AI. Nessuna modifica pittorica a coppe, figure, cavalli, posture, composizioni o colori originali.

## Provenienza e licenza
Dieci JPEG di pubblico dominio da Marco Scarpetta / OMerkel, repository `scopa_marco`, cartella `data/cards/Napoletane/`:
https://github.com/OMerkel/scopa_marco/tree/master/data/cards/Napoletane
Il README originale dichiara che i JPEG Napoletane sono immagini di pubblico dominio provenienti da Wikimedia Commons:
https://github.com/OMerkel/scopa_marco#licensing
Collezione principale su Commons:
https://commons.wikimedia.org/wiki/Category:Naples_deck

Sono **copie JPEG byte-per-byte** dei file sorgenti; i Git blob SHA corrispondono ai sorgenti nel progetto OMerkel. Questi file sono i riferimenti canonici, separati da qualsiasi impaginazione.

## Asset
Per ognuno dei 10 valori (Asso, 2–7, Fante, Cavallo, Re):
- `Cxx-<nome>-originale.jpg`: originale intatto
- `Cxx-<nome>-gioco.svg`: SVG autoconclusivo 600×1000 con il JPEG originale incorporato, senza deformazioni, fascia inferiore 25% libera per l'interfaccia e il piccolo sigillo geometrico sul divisorio, **esterno all'illustrazione storica**.

Colore nominale dell'avorio `#F8F2E7`. Il disegno mantiene la sua composizione; lo SVG impagina il JPEG con fusione moltiplica per uniformare le aree bianche. Il testo di abilità, valore e nome resta **separato**.

## Avvertenze di qualità
L'illustrazione storica è un'immagine raster piccola, quindi il formato 600×1000 non aggiunge nuovi dettagli. La resa SVG/WebView va verificata sul dispositivo di destinazione; la copia originale resta il confronto incontestabile.
Le Coppe alternative `CO-A01–CO-A10` su Google Drive sono una **serie sperimentale distinta**. Non vanno scambiate per queste carte originali.

Nessuna modifica a `index.html`, al motore matematico o ad altre carte del gioco. Non integrare in `main` senza revisione grafica.
