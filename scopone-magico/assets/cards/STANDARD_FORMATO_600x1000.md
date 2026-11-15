# Scopone Alchemico · Standard di dimensionamento carte per smartphone

**Versione 1, novembre 2026.** Applicato ai Contadini di Bastoni e Coppe.

## File di gioco
- File principali: `contadino-bastoni-gioco.webp`, `contadino-coppe-gioco.webp`
- Dimensioni identiche: **600 × 1000 pixel**, ritratto **3:5**
- Anteprime opzionali: `contadino-bastoni-anteprima-300x500.webp` e `contadino-coppe-anteprima-300x500.webp`, **300 × 500 pixel**
- Zona superiore per l'illustrazione: **0–748 px** (75% circa)
- Fascia inferiore libera per testi e abilità: **749–999 px** (25% circa); sottile riga divisoria sul confine
- Stesso sfondo nominale avorio `#F8F2E7`, stessa cornice sottile scura, arrotondata.
- Figure e semi sono diverse per pose, abiti, fisionomie, colori e scala orizzontale naturale; si uniformano **l'altezza occupata e la linea di base**, senza deformazioni.

## Struttura separata
L'illustrazione è un **asset immagine**; valore, nome, seme e testo degli effetti rimangono gestiti da **HTML/CSS** e dal motore.
La fascia inferiore deve essere popolata dall'interfaccia dinamicamente e non contiene parole disegnate nei file WebP.

## Metodologia
- Ridimensionamento con interpolazione Lanczos e rapporto d'aspetto bloccato.
- Recupero delle illustrazioni già accettate; **nessuna rigenerazione artistica**.
- Uniformazione dello sfondo esterno alle figure e creazione di un'unica cornice per carta.
- Sono stati lasciati intatti gli **originali** `*-originale.webp`, che non devono essere ridimensionati né sovrascritti durante l'ottimizzazione del gioco.
- Nessuna modifica al motore matematico, alle regole o alle carte numerali.

## Test manuale
Le immagini sono state aperte e confrontate affiancate: proporzioni 3:5, fondi uguali, silhouette complete, linea di terra allineata, parte inferiore vuota. La leggibilità effettiva del testo a schermo resta responsabilità della UI del gioco.
