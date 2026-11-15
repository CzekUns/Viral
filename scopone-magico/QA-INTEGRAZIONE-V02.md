# Scopone Alchemico — integrazione grafica V02

**Ambito:** soltanto `scopone-magico/`. SVG importati dalla PR #1, **direzione artistica non approvata**.

## Modifiche

- `assets/board/menu-v01.svg`: fondale del menù, preso senza alterazioni dalla PR #1.
- `assets/board/board-v02.svg`: fondale della plancia, preso senza alterazioni dalla PR #1.
- `index.html`: primo accesso al menù separato, titolo HTML, pulsanti Partita rapida (`quick`), Modalità 2 (`draw`) e Regole. Nella partita scompare l'intestazione con titolo e selettori di modalità; rimangono HUD compatto, ritorno al menù con conferma, tasto schermo intero, regole e riavvio.
- Riorganizzazione responsive per computer in alto, tavolo centrale scorrevole verticalmente, mano orizzontale sticky in basso, prese e punteggi sempre dinamici. Safe area incluse.
- Sfondi come risorse CSS esterne, sostituibili senza cambiare la struttura DOM.

## Ambiti non modificati

`scopone-magico/engine.js`, `scopone-magico/test-engine.js`, regole, turni, IA, abilità e punteggi. L'implementazione `ScoponeEngine` incorporata in `index.html` è **byte-per-byte identica** a quella su `main` (SHA-256: `cfb6471fa0c13d04ae6a9ea405d1ad26101adc1e9d1bfb253a7f3ca830a992b0`).

## Verifiche effettuate

- **Node / motore puro:** 1.000 partite `quick` + 1.000 `draw` complete, 0 eccezioni, invarianti di conservazione delle carte e conclusione soddisfatte.
- **Browser Chromium**, viewport **320×700, 390×844 e 430×932**: apertura del menù, Regole, avvio delle due modalità, selezione carta, anteprima della carta dell'IA per circa 1 secondo, conferma di abbandono, pulsante fullscreen e scorrimento della mano. Nessun errore JavaScript rilevato.
- **Tavolo affollato:** stress DOM con 17 carte aggiuntive temporanee; area tavolo effettivamente scorrevole, nessun overflow orizzontale pagina, mano separata e non coperta.
- **Partite da browser:** Partita rapida completata con 20 giocate; Modalità 2 completata con 40 giocate; mostrato regolarmente l'esito.
- I test del motore non dimostrano equilibrio strategico: il vantaggio del secondo giocatore preesiste ed è fuori mandato.

## Limite di verifica dell'ambiente

L'ambiente di test blocca la navigazione del Chromium a indirizzi HTTP con `ERR_BLOCKED_BY_ADMINISTRATOR`, anche su `localhost`. I test browser sono pertanto stati eseguiti **caricando gli stessi byte HTML in Chromium con `set_content`**, non mediante navigazione HTTP effettiva. Gli screenshot sono autentici screenshot Chromium di tale rendering, ma non includono gli SVG esterni (background color avorio di fallback). 

Gli SVG sono presenti nel ramo GitHub e referenziati correttamente in CSS; **la resa finale con SVG e il deployment GitHub Pages non sono ancora verificati in un browser via HTTP**. Si raccomanda la revisione su URL di preview/Pages e di mantenere questa PR in bozza finché l'art direction non sarà approvata.

## Concorrenti

Durante l'esecuzione, `main` ha ricevuto ulteriori commit per asset artistici di carte. Non modificano `scopone-magico/index.html` o `engine.js`; il ramo di integrazione è stato creato dal main disponibile all'inizio dell'esecuzione. Nessuno di tali asset è stato cambiato.
