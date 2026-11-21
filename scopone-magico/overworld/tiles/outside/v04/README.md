# Overworld esterno — V04 integrata (21 novembre 2026)

50 WebP 104×60: 21 varianti, 24 raccordi (NW NE SE SW), 5 segmenti di strada, conservati in `tiles/outside/v04/`. I sette V03 rimangono in `tiles/outside/v03/` e le vecchie SVG non sono eliminate.

- Il modulo `engine/terrain.js` costruisce tutti gli ID una volta per zona. Il renderer e la sua cache 16×16 non vengono modificati.
- `maps/external/campania.json` dichiara le varianti, le transizioni e gli asset di sentiero; il codice non ruota mai una texture.
- La versione V04 è quella predefinita.
- `?terrain=v03` disabilita le variazioni e i raccordi V04 lasciando le sette V03.
- `?terrain=legacy` utilizza le sette SVG storiche, senza nuove transizioni.
- Si preservano collisioni, vie di accesso alle città, sprite C08 e animazioni.
- I cinque sentieri si applicano solo quando esiste una configurazione di vicini corrispondente e fuori dai centri abitati; negli altri casi rimane lo sterrato V03/varianti.
- Le tessere possono avere più frontiere, ma V04 offre un raccordo per singolo lato: i bordi complessi richiedono QA sul telefono.
- Caricamento statico con WebP leggeri; nessun redraw continuo o animazione aggiunta.
