# Scopone Alchemico — Spade classiche S01–S10

**Stato: bozza da approvare.** Dieci carte napoletane tradizionali recuperate senza generazione AI.

## Provenienza
Fonte unitaria: [OMerkel/scopa_marco — Napoletane](https://github.com/OMerkel/scopa_marco/tree/master/data/cards/Napoletane), foto del mazzo napoletano dichiarate di **pubblico dominio** nel README del progetto ([categoria originale Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Naples_deck)).

Ogni `Sxx-[nome]-originale.jpg` è la copia **byte-per-byte** della sorgente `data/cards/Napoletane/{n}s.jpg`: gli SHA Git sono stati confrontati e coincidono. Non è stata ritoccata alcuna illustrazione.

## Grafica di gioco
Per ognuna delle carte Asso, 2–7, Fante, Cavallo e Re:
- `Sxx-[nome]-originale.jpg` — file storico originale intatto;
- `Sxx-[nome]-gioco.svg` — SVG 600×1000 autonomo, con JPEG originale incorporato, inquadratura non deformata, sfondo avorio nominale `#F8F2E7`, fascia effetti inferiore dal 75%, bordo sottile e piccolissimo sigillo geometrico sul divisorio (mai sul disegno).

Le composizioni delle figure numerali, in particolare **il 5 di Spade** (due scene in bianco e nero tra le spade azzurre), non sono state modificate. Il testo di abilità e il valore saranno inseriti con HTML/CSS.

## Verifiche
- Sorgente autentica controllata visivamente su Asso, Tre, Cinque, Fante, Cavallo e Re.
- Dieci originali e dieci asset SVG, un'unica sorgente coerente.
- Immagini raster di origine a bassa risoluzione: l'impaginazione non crea dettaglio aggiuntivo.
- Il game asset adotta una modalità di fusione `multiply`, limitata alla resa delle aree bianche sulla tinta avorio; i JPEG originali restano intatti.
- Non sono stati cambiati né il motore matematico né le regole né altre carte.

Queste Spade **non sono** i Contadini alternativi SP-01, SP-02, SP-03: quelle figure rimangono asset indipendenti.

Consulta `anteprima.html` per vedere tutte le carte in galleria.