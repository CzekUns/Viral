# Scopone Alchemico — Contadino di Bastoni (v1)
Stato: **approvato** dal proprietario; successivamente normalizzato per il gioco al formato comune 600×1000.

## Riferimento stilistico reale e riproducibile
- **Scansione dell'intero seme di Bastoni di un mazzo napoletano**, autore/fotografo **Despues**, caricata su Wikimedia Commons nel 2006: https://commons.wikimedia.org/wiki/File:Carte_da_gioco_napoletane_bastoni.jpg
- Immagine originale (1275×1650): https://upload.wikimedia.org/wikipedia/commons/6/67/Carte_da_gioco_napoletane_bastoni.jpg
- Licenza della scansione: **CC BY-SA 3.0** (attribuzione, indicazione delle modifiche, stessa licenza per adattamenti della scansione): https://creativecommons.org/licenses/by-sa/3.0/
- Nel foglio, Fante, Cavallo e Re di Bastoni sono le tre carte in basso. È **lo stesso mazzo** per tutti e tre i confronti.
- Il riferimento originale è conservato mediante collegamenti persistenti e attribuzione in questo file: la scansione esterna NON viene spacciata per un asset creato dal progetto.

## Caratteristiche del modello da preservare
1. Carte verticali a figura **intera**, non specchiate; sfondo chiaro e contorno sottile.
2. Linea di base **verde** delle figure di Bastoni, senza paesaggio alle spalle.
3. Tratto scuro netto; campiture semplici rosso, verde, giallo, blu e bianco.
4. Bastone napoletano allungato con testa verde, decorazione gialla e raccordi rossi; il seme è un oggetto della scena.
5. Figura centrale quasi a piena altezza; nessun pittogramma duplicato negli angoli.
6. Vestiario popolare in luogo di armatura o iconografia fantasy.

## Asset realizzati
- `contadino-bastoni-originale.webp` — illustrazione alla risoluzione artistica 922×1536 (rapporto circa 50:83,5). L'originale di generazione PNG resta disponibile nella consegna dell'artista.
- `contadino-bastoni-gioco.webp` — immagine 600×1000, proporzioni preservate, sfondo avorio comune, fascia inferiore del 25% **vuota**, riservata ai testi DOM/CSS.
- `contadino-bastoni.json` — metadati indipendenti dalle regole.

Il valore **2**, il nome **Contadino**, il seme **Bastoni** e gli eventuali effetti devono essere mostrati dall'interfaccia in un livello testo separato. **Non** sono incorporati nei pixel delle immagini.

## Controllo di qualità e limiti (v1)
Confronto visivo con Fante, Cavallo e Re della scansione citata:
- Coerenti: personaggio intero, fascia verde alla base, bastone decorato, palette tradizionale, sfondo quasi bianco, colori ampi e contorni scuri.
- Da valutare in approvazione: il viso e il tratteggio del nuovo Contadino risultano **più dettagliati e moderni** delle figure storiche; la versione iniziale di gioco mostrava un contorno interno, rimosso nella normalizzazione 600×1000. È una proposta stilistica, **non una replica fedele certificata** dell'illustratore tradizionale.
- Non è stata alterata alcuna carta numerale, nessun file dell'app e nessun motore/regola di gioco.

## Standard futuro proposto
Riferimento unico per tutto il mazzo: la scansione citata, con ancoraggio alle tre figure dello stesso seme; figure intere; base cromatica del seme; palette piatta; niente cornici decorative o fondali fantasy; testo delle abilità sempre esterno al disegno. La figura è stata approvata; la guida tecnica attuale è in `STANDARD_FORMATO_600x1000.md`.
