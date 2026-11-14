# Scopone Magico · prototipo giocabile v0.1

**Gioca:** https://czekuns.github.io/Viral/scopone-magico/  
*(il link funziona se GitHub Pages è attivo su `CzekUns/Viral`, branch `main`, cartella `/(root)`)*

Gioco da browser, anche smartphone, contro un computer che sceglie le prese disponibili. Nessuna installazione, nessun backend, immagini temporaneamente sostituite da semplici carte testuali.

## Regole implementate
- 40 carte base: quattro semi (Coppe, Bastoni, Spade, Denari), dieci tipi.
- 10 carte casuali a ogni giocatore, 20 giocate alternando i due giocatori.
- Le prime due giocate non consentono prese.
- Se esistono prese disponibili per la carta giocata, è obbligatorio sceglierne una. Nessuna priorità alla presa per identità.
- Presa per identità del tipo (indipendente dal valore) oppure per somma dei valori difensivi delle carte a terra uguale al valore d'attacco della carta calata.
- Asso 1 attacco/10 difesa; Contadino 2 con Soglia (16 se Monaco e Dama a terra); Monaco 3 con Affinità (6 se c'è una carta dello stesso seme); Dama 4 con Gemellanza in resistenza (8 se c'è un Re); Giullare 5 con Specchio in attacco (altri Giullari di altri semi valgono 1); Mago 6 con Progressione in resistenza (carte del proprio seme sotto 6 diventano 6); numerali simboliche attacco 7 e difesa a scelta tra 7 e numero stampato; Fante 8, Cavallo 9, Re 10 senza abilità.
- La difesa dei numerali si sceglie quando vengono depositate e rimane fissata. Gli effetti condizionati sono calcolati sullo stato corrente del tavolo.
- Scopa: presa che svuota il tavolo, salvo l'ultima giocata. Le carte residue vanno all'ultima presa.
- Vince chi ha raccolto più carte; le scope fanno da spareggio.

## Da confermare con il creatore
Obbligo di presa in tutte le situazioni, assegnazione delle carte residue, eventuale valore delle scope oltre lo spareggio, timing della difesa dei numerali, approfondimento degli effetti e bilanciamento del vantaggio del secondo giocatore.

## File
- `index.html` — prototipo standalone con motore incorporato, giocabile senza dipendenze.
- `engine.js` — motore puro, utilizzabile anche da Node.
- `test-engine.js` — simulazione deterministica di 1.000 partite e controlli sulle abilità.

## Test
```bash
node test-engine.js
```

Il test verifica la conservazione delle 20 carte, la legalità delle giocate, la conclusione della partita e i valori di alcuni effetti. In 1.000 simulazioni l'AI che massimizza le prese mostra ancora un vantaggio consistente del secondo giocatore: è un problema aperto, non una caratteristica bilanciata.

## Documento progetto
[Decisioni e bozze su Google Drive](https://drive.google.com/drive/folders/1ZDsbDb_l-zdxFAll1vgqbRJnb2J33APe).
