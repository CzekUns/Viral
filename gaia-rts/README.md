# Gaia Tactics — RTS Overworld (prototipo non ufficiale)

## Stato
**Vertical slice giocabile, solo front-end.** Sceneggiatura ispirata al Continente della Nebbia di FINAL FANTASY IX. Nessun asset originale del gioco è incluso nel repository: mappa e miniature attuali sono disegnate proceduralmente e servono a provare il motore di gioco.

Avvia [index.html](./index.html) in browser moderno, anche da Android. Nessuna build, nessuna dipendenza esterna.

## Gameplay funzionante
- Telecamera mobile: trascina la mappa con un dito, pizzica con due dita per lo zoom, oppure usa +/−; su PC funzionano drag e rotellina.
- Seleziona un'unità alleata toccandola, poi tocca il terreno per impartire un ordine di movimento. Il tasto **Tutte** seleziona tutto l'esercito.
- Toccando un nemico selezionato lo attacchi; combattimento in tempo reale con danni, punti vita, distanze e velocità differenti.
- Pathfinding A* con restrizioni su montagne e mare; forze avversarie controllate da IA elementare.
- Conquista automatica di città quando mantieni delle truppe nel loro raggio senza nemici presenti.
- Reclutamento a Lindblum, entrate di gil, mappa tattica, pausa e condizioni di vittoria/sconfitta.
- Prima missione: conquistare **Alexandria** e **Burmecia**, partendo da Lindblum. Sono presenti anche Cleyra, Dali e Treno.

## Miniature sostituibili
Se possiedi sprite che puoi legittimamente utilizzare, puoi posizionare sei immagini WebP con trasparenza in:

```
gaia-rts/assets/miniatures/
  ally-guard.webp
  ally-lancer.webp
  ally-mage.webp
  enemy-guard.webp
  enemy-lancer.webp
  enemy-mage.webp
```

Ogni miniatura è disegnata nel mondo di gioco a circa **44 × 70 unità Canvas**. Il motore carica le immagini solo se presenti; altrimenti usa le miniature vettoriali provvisorie. Per un aspetto più fedele a FF9 conviene renderizzare il modello 3D originale in 4/8 direzioni in un atlante di sprite (passaggio successivo). Attualmente il prototipo visualizza una direzione per file: le animazioni e l'orientamento degli sprite importati richiedono un modulo aggiuntivo.

## Limiti reali della V0.1
- Non contiene la **mappa esatta** di Final Fantasy IX: la costa e le location sono una reinterpretazione originale del Continente della Nebbia per testare il gameplay.
- I personaggini disegnati nel prototipo sono **segnaposto**, non i modelli 3D originali di FF9.
- Non comprende ancora navi, chocobo, aeronavi, tutti e quattro i continenti, produzioni, edifici costruibili, salvataggi o multiplayer.
- Il pathfinding ha una griglia di navigazione semplice; non rappresenta ancora elevazione, ponti o interi mesh 3D.
- Test automatico effettuato: sintassi JavaScript verificata. **Gameplay non ancora sottoposto a QA con browser reale.**

## Proposta evolutiva
1. Importare una mappa 3D/low-poly autorizzata o una ricostruzione originale molto fedele all'overworld e sviluppare un sistema di camera orbitale.
2. Integrare piccoli modelli 3D con skin e animazioni (stand/walk/attack) o sprite prerenderizzati in otto direzioni.
3. Eserciti con formazioni, classi, produzione/reclutamento e tre fazioni.
4. Navigazione continentale, trasporti, costruzioni e singola campagna.

## Proprietà intellettuale
**Progetto fan-made non ufficiale e non affiliato a Square Enix.** FF9, personaggi, luoghi e asset originali appartengono ai rispettivi titolari. Scaricare modelli da portali di ripping o estrarli dalla propria copia **non concede automaticamente** il diritto di distribuirli pubblicamente. Non committare o pubblicare gli originali in questo repository senza adeguata autorizzazione. Un'implementazione completamente pubblicabile richiede asset originali o licenze esplicite.
