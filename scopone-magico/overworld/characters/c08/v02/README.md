# C08 — runtime V02 AutoSprite (TEST)

**Scopone Alchemico · Fante di Coppe · 18/11/2026.**
Fonte grafica integrata in prova senza rigenerare figure: [Drive — ancoraggi V02](https://drive.google.com/drive/folders/1kW7QBuMmW7na6A2Mw9I-_xQiy44OsavV).
Backup completo dei 132 PNG originali: [ZIP in Drive](https://drive.google.com/file/d/1Jvrix2WlyA0bnfguuq-u0HeHb3ovqN64/view).

## Modalità predefinita

| Direzione | Asset in movimento | Stato artistico |
|---|---|---|
| W | c08-v02-auto-W-22f.webp · 22 fotogrammi | TEST |
| NW | c08-v02-auto-NW-22f.webp · 22 fotogrammi | TEST |
| N | c08-v02-auto-N-22f.webp · 22 fotogrammi | TEST |
| NE | c08-v02-auto-NE-22f.webp · 22 fotogrammi | TEST |
| SW | c08-v02-auto-SW-22f.webp · 22 fotogrammi | TEST |
| S | c08-approved-S-4f.webp · 4 fotogrammi | APPROVATO V08 |
| SE | c08-approved-SE-4f.webp · 4 fotogrammi | APPROVATO V07 |
| E | characters/c08/idle/E.webp · statico | IN ATTESA |

Sud AutoSprite è incluso come **alternativa di confronto**, non selezionato normalmente. Sul link diretto Overworld usare \`?c08-sud=auto\` per la prova; tornare all'URL senza query per la Sud approvata.
Per confronto con i precedenti raster V04 a tre frame si può usare \`?c08=legacy\`. Gli asset legacy sono rimasti invariati.

## Esportazione e prestazioni

- Estratti e controllati 132 PNG RGBA 470×650; sette correzioni di allineamento erano già contenute nel ZIP Drive. Nessuna ricostruzione anatomica, deformazione o interpolazione di pose.
- Strip AutoSprite: 22 celle da **180×249**, dimensione 3960×249, WebP con alpha; 22 frame conservati, 22 FPS in runtime. Le sei strisce comprendono la Sud alternativa.
- Strip approvate: quattro celle da **180×180** (720×180), WebP con alpha; 8 FPS in runtime. Conversione dai GIF approvati, non modificati.
- Idle per direzione esportato dalla prima posa della stessa fonte per evitare un cambio di disegno quando si ferma.
- Scala AUTO proporzionale alla sorgente: \`[.76,1.05]\` rispetto al vecchio canvas quadrato. L'ancoraggio è basato sui piedi; il renderer usa la scala direzionale senza allargare il personaggio.
- Caricamento **lazy** dei fogli walk con massimo **4 fogli decodificati** nel cache LRU. Tutti gli idle rimangono piccoli e subito disponibili. Alla prima richiesta di una direzione non caricata si mostra temporaneamente il relativo idle; dopo la decodifica parte la camminata.
- Entrambi gli Overworld (Campania esterna e scacchiere cittadine) usano lo stesso C08 e conservano movimento, collisioni, camera e salvataggio; nessuna modifica al motore delle carte.

## Verifiche e limiti

I test Node controllano conteggi, provenienza, dimensioni VP8X, limite 4096px, fallback e cache. Il workflow Chromium 390×844 percorre la mappa, entra in Napoli, verifica la persistenza e salva screenshot in \`browser-qa/c08-{DIREZIONE}-city.png\` per le otto direzioni, usando il renderer Canvas reale. Verifica anche che due fasi della sequenza W siano pixel-differenti.

**Limite:** il test di integrazione non vale come approvazione estetica dei 5 cicli AutoSprite. I 22 frame sono una sequenza estratta da video e potrebbero contenere discontinuità d'arto/loop non rilevabili dai test automatici. Il controllo sul telefono fisico spetta alla fase di collaudo con il proprietario. Il Sud predefinito resta V08, Sud-Est V07; Est non viene dichiarato animato.

Origini approvate:
- [Sud V08](https://drive.google.com/file/d/1OAy-m0qv-9rEhTyoC7wm65gqFhcMIMXE/view)
- [Sud-Est V07](https://drive.google.com/file/d/152UMAb6rubK8KMkTOo5RJx0OdJeMpWMr/view)
