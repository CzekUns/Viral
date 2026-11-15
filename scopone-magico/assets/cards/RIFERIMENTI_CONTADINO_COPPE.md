# Scopone Alchemico — Contadino di Coppe · correzione sfondo
Stato: ripristinato il personaggio originario e verificata l'uniformità dell'avorio del mazzo.

## Sorgenti e identità
- Autentico repertorio Coppe (Fante, Cavallo, Re), scansione Despues, CC BY-SA 3.0: https://commons.wikimedia.org/wiki/File:Carte_da_gioco_napoletane_coppe.jpg
- Base di confronto per la **tinta del fondo**: `contadino-bastoni-originale.webp` (approvato).
- Origine della figura: l'immagine originale del Contadino di Coppe già mostrata e accettata (berretto rosso floscio, gilet blu, camicia bianca, pantaloni gialli, calze verdi, coppa alzata).

## Verifica e correzione
La visualizzazione precedente aveva mostrato un'ulteriore **generazione** con vestiario diverso. Verificando gli asset già presenti sulla branch `main`, si è constatato che l'immagine salvata nel repository conteneva **già** il Contadino di Coppe originario; la preview non corrispondeva all'asset pubblicato.

Per eliminare qualsiasi ambiguità:
1. L'immagine originale prima della correzione è stata recuperata.
2. È stata individuata la sagoma completa (personaggio, coppa e base verde).
3. Sono stati copiati nell'immagine finale **senza alcuna modifica** tutti i pixel all'interno della sagoma: **399.892 pixel originali**.
4. Esclusivamente la carta fuori sagoma ha ricevuto la correzione colorimetrica.
5. Mediana del fondo misurata sul Bastoni: **RGB(247,240,231)**; mediana del Coppe ripristinato: **RGB(247,240,231)**. Le variazioni di grana della stampa restano naturali.
6. L'illustrazione è stata esportata in WebP ad alta qualità e la variante per il gioco a 600 × 1007.

## Standard del mazzo
- **Tinta della carta comune fra tutti i semi**, misurata sul modello approvato. Valore nominale di riferimento: `#F8F2E6`, soggetto a variazioni minime per la grana.
- I personaggi di semi differenti devono avere **autonomia di pose, fisionomia, abiti e colori**, pur rispettando il tratto napoletano.
- I testi delle abilità non fanno parte dell'illustrazione.

## File della carta
- `contadino-coppe-originale.webp`: figura autentica del progetto con fondo uniformato
- `contadino-coppe-gioco.webp`: formato mobile con fascia inferiore libera
- `contadino-coppe.json`: metadati, nessuna logica di gioco

Questa modifica non altera il motore matematico, né le altre carte.
