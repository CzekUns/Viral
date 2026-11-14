# Scopone Alchemico — prototipo giocabile v0.3

**Prova il gioco:** https://czekuns.github.io/Viral/scopone-magico/

Interfaccia smartphone con mano scorrevole, selezione testo disabilitata, tasto schermo intero e gioco contro il computer. Il computer **cala e mostra la carta per un secondo** prima che la presa venga risolta; le carte bersaglio sono evidenziate.

## Modalità

- **Partita rapida** — 10 carte casuali a giocatore, 20 mosse totali, senza ulteriori pescate.
- **Modalità 2** — 10 carte iniziali a giocatore; dopo ciascuna mossa il giocatore pesca 1 carta da un mazzo comune di altre 20 finché si esaurisce. Si giocano così tutte le 40 carte, per 40 mosse totali. Dopo l'esaurimento del mazzo la mano si riduce a zero e la partita termina.

La modalità si seleziona sopra il punteggio; cambiarla avvia una nuova partita (con conferma se una partita è in corso).

## Regole del prototipo

Primi due depositi senza catture. Successivamente sono obbligatorie le prese disponibili per la carta calata. Nessuna priorità alla presa per identità rispetto alle combinazioni per valore. La presa per identità rimane valida anche con valore modificato. Una scopa vale 1; vittoria per numero di carte catturate, scope come spareggio. Le carte rimaste a terra vanno all'ultima presa.

Asso 1 attacco / 10 difesa; Contadino 2 (Soglia 16 con Monaco e Dama a terra); Monaco 3 (Affinità 6); Dama 4 (Gemellanza 8 quando c'è Re a terra); Giullare 5 (Specchio); **Alchimista 6** (Progressione: carte del proprio seme sotto 6 assumono 6); numerali simbolici 7 in attacco con difesa 7 o cifra stampata; Fante 8, Cavallo 9, Re 10. Quattro semi napoletani; grafica provvisoria.

## Codice e verifiche

- `index.html`: pagina HTML indipendente con motore incorporato
- `engine.js`: motore riutilizzabile con API `start(seed, 'quick' | 'draw')`
- `test-engine.js`: 1.000 partite automatiche per ciascuna modalità, invarianti sulla conservazione delle carte, pesca e conclusione, più casi per gli effetti.

```bash
node test-engine.js
```

Sono stati inoltre verificati con Chromium i passaggi di modalità, l'anteprima temporizzata della carta AI, la pescata e il reset in tre larghezze mobili (320, 375 e 768 pixel). Questi test non garantiscono il bilanciamento strategico: attualmente il secondo giocatore vince più spesso.

**Documento di progetto e bozze:** https://drive.google.com/drive/folders/1ZDsbDb_l-zdxFAll1vgqbRJnb2J33APe
