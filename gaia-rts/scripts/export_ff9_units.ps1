<#
Estrae i modelli PICCOLI originali dell'overworld di FF9 (PC Steam/GOG)
senza scaricare o redistribuire asset del gioco.
Prerequisiti:
  py -m pip install "ff9mapkit[assets]"
  ff9mapkit setup
Uso:
  powershell -ExecutionPolicy Bypass -File .\export_ff9_units.ps1
  powershell -ExecutionPolicy Bypass -File .\export_ff9_units.ps1 -GamePath "D:\SteamLibrary\steamapps\common\FINAL FANTASY IX"
#>
param([string] $GamePath = "", [string] $Output = ".\ff9-export")
$ErrorActionPreference = "Stop"
if ($GamePath) { $env:FF9_GAME_PATH = $GamePath }
$null = New-Item -ItemType Directory -Force -Path $Output
foreach ($id in @("001","002","003","008","009","010")) {
    $geo = "GEO_SUB_W0_$id"
    $out = Join-Path $Output "$geo.glb"
    Write-Host "Export modello FF9 reale: $geo"
    & ff9mapkit model-gltf $geo --anims all --out $out
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Export fallito per $geo. Verifica la versione del kit e l'installazione FF9."
    }
}
Write-Host "Termine. Importa i GLB desiderati in Gaia RTS -> Impostazioni asset."
Write-Host "Attenzione: 003 = Chocobo, 008/009/010 = veicoli; 001/002 sono i personaggi."
