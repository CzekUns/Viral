# VIRAL — Satisfying Games

Raccolta di minigiochi touch-first ispirati ai gesti dei video ASMR e oddly satisfying, con grafica e meccaniche originali.

## Gioco 01 — Soap Cutting (giocabile)

Apri index.html in un browser moderno, anche da smartphone.

- Trascina il dito per incidere e staccare cubetti dal sapone.
- Le incisioni seguono il percorso reale del dito, anche in diagonale.
- Cubetti e frammenti simulano gravità e rimbalzi.
- Suoni ASMR sintetizzati con Web Audio API, senza audio esterni.
- Feedback aptico dove supportato; barra di avanzamento, punteggio e bonus.
- Ricomincia o scegli un colore diverso.
- Interfaccia verticale, nessuna libreria e nessun backend.

## Pubblicazione con GitHub Pages

In Settings → Pages seleziona Deploy from a branch, main, /(root), poi Save. Il sito sarà visibile all'indirizzo fornito nelle impostazioni Pages.

## Prossimi giochi

1. Kinetic Sand: comprimi forme colorate in un bicchiere.
2. Color Mixing: mescola pigmenti con spatola.
3. Power Wash: lava le superfici con un getto guidato dal touch.

## Struttura

- index.html: layout responsive.
- game.js: motore Canvas 2D, particelle, fisica, collisioni, suoni e input.

Il progetto non riutilizza i video, le immagini o le registrazioni audio dei creator. Nessun tracciamento integrato nel prototipo.
