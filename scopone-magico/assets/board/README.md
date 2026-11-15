# Scopone Alchemico · Asset grafici V02 (proposta)

Asset **separati** per la futura integrazione: il gioco pubblico non viene modificato in questa PR.

- `board-v02.svg`: plancia verticale 1080 × 1920, **senza intestazione riservata**, cornice più sottile, parte centrale destinata alle carte a terra, mano nella parte inferiore. Nessuna carta/testo/pulsante incorporati.
- `menu-v01.svg`: fondale indipendente per menu prima della partita; cartiglio superiore lasciato vuoto per il titolo in HTML, zona centrale disponibile per pulsanti dinamici, baia di Napoli nella parte bassa. Nessun comando o testo incorporato.

Direzione: colori rosso/azzurro/giallo/verde, oro e nero tipici delle carte napoletane; incisione popolare, carta antica, quattro semi; alchimia come filigrana e ampolle.

## Indicazioni al developer

Creare vista iniziale/menu e vista di gioco distinte. Menu con pulsanti HTML accessibili per **Partita rapida** (mode=quick) e **Modalità 2** (mode=draw), **Regole**, ed eventualmente opzioni; usare i metodi già presenti per avviare la partita. Nella vista gioco rimuovere il grande header/titolo/selector della versione corrente (spostare la selezione delle modalità nel menu), lasciando solo informazioni essenziali. Sovrapporre i componenti esistenti (AI, tavolo, mano orizzontale, prese, scope, mazzo, turno, options) agli sfondi via CSS. Non modificare `ScoponeEngine`, regole, score o gestione delle prese. Progettare contenitori responsive, evitare `overflow:hidden` su carte al centro, preferire scroll verticale nell'area tavolo e sticky hand in basso, rispettando `safe-area-inset-*`. Gli asset SVG funzionano senza build e senza librerie.

## Stato

Bozza grafica **da approvare**; non integrata nell'interfaccia pubblica. Sono disponibili anche rendering ImageGen (PNG/WebP) come riferimenti estetici, consegnati nella conversazione, che possono sostituire i vettoriali dopo il giudizio.
