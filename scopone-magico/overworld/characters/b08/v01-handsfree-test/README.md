# B08 Fante di Bastoni — V01 mani libere — TEST

Riferimento costume: B08-fante-napoletano.jpg (carta napoletana originale da Drive); riferimento di stile: S08 V01 approvato nella conversazione. Berretto verde/piuma rossa, capelli grigi, gorgiera bianca, corpetto giallo, spalle verdi/maniche blu, calzoni rossi, legacci verdi, calze gialle, scarpe bianche. Un bastone rosso/verde con decoro dorato e' fissato al fianco destro, lasciando libere le mani.

8 standing e 32 keyframe di camminata PNG RGBA, 8 strip walk e 8 standing WebP lossless, atlante standing, GIF normali/lente per direzione e panoramiche, tavole QA e manifest completo con provenienza. Celle 512x512, root proposta (256,390), render 96x96 e 7fps. GitHub contiene l'export WebP; il pacchetto Drive contiene tutti i master PNG e le sorgenti.

## Verifiche e limiti
Alpha, dimensioni, margini e completezza verificati; quattro frame non identici per ciclo. Riordinamento E e sostituzioni isolate NW; W rigenerato per eliminare l'accessorio improprio sul fianco vicino, bastone nascosto dietro il corpo. Nessuna riflessione, deformazione o interpolazione di pose. Le GIF di QA includono il pavimento; gli export PNG/WebP restano trasparenti.

Stato TEST: variazioni residue in busto, berretto e bastone tra disegni generati. Registrazione uniforme di scala e traslazione sul berretto verde, rispetto alla standing della stessa direzione; nessuna certificazione biomeccanica o del contatto a terra. Prova nel motore e approvazione estetica ancora necessarie. Nessuna modifica ai personaggi C08/S08 e nessuna integrazione/pubblicazione nel gioco.

## Prompt di generazione
image_gen: carta B08 per identita', S08 approvato solo per stile; camera ortografica isometrica rialzata, otto direzioni; bastone originale al fianco destro e mani libere. Per ogni ciclo: quattro disegni con contatti destra/sinistra e piedi sollevati alternati, passo contenuto, braccia in controfase, costume/camera/accessorio invarianti, fondo trasparente e nessun testo/pavimento. Correzioni mirate Ovest (occlusione) e Nord-Ovest (pose alternate e rimozione secondo bastone).

Pacchetto completo Drive: https://drive.google.com/file/d/1PqO9FwdJ2Kit407mJYx5dtT2Fml9Rcd_/view?usp=drivesdk
