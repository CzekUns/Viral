# Caricamento asset originali FF9 (solo repository privata)

Questo ramo/directory è destinato esclusivamente ad asset di cui l'utente dispone per uso personale. Non attivare l'importatore se la repository è pubblica. Non pubblicare la cartella `gaia-rts/private-assets/` tramite GitHub Pages.

### Importa i 70 modelli in una sola operazione

1. Assicurati che `CzekUns/Viral` sia **Private** nelle impostazioni GitHub.
2. Passa al ramo **`gaia-private-assets`** (non `main`).
3. Entra in **`gaia-rts/incoming/`** e seleziona **Add file → Upload files**.
4. Carica insieme questi tre archivi preparati nella chat:
   - `FF9_GaiaRTS_Parte_01.zip` (~15,5 MiB, 19 GLB)
   - `FF9_GaiaRTS_Parte_02.zip` (~15,7 MiB, 25 GLB)
   - `FF9_GaiaRTS_Parte_03.zip` (~15,7 MiB, 26 GLB)
5. Conferma il commit sul ramo `gaia-private-assets`. L'azione automatica controlla i file, estrae **70 GLB**, crea un catalogo, genera uno starter ZIP con 13 unità e produce una build HTML privata avviabile.
6. La build è reperibile come artifact in **Actions → Install private FF9 Gaia RTS assets** dopo l'esecuzione. Rimane inoltre nel ramo privato `gaia-private-assets`.

**Note importanti:** i tre archivi sono suddivisioni tecniche dei file GLB già convertiti. Non sono da ricomprimere o rinominare. La GitHub Action non esegue download da siti esterni. Non caricare file se prevedi di rendere pubblica la repository senza prima migrare gli asset a una repository separata: eliminarli dal ramo non elimina automaticamente le versioni recuperabili nella cronologia Git.
