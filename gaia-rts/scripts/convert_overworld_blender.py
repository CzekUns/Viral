# Convertire un asset OVERWORLD 3D di FF9 in GLB per il prototipo Gaia RTS.
# Esecuzione con Blender 4.x:
# blender -b --python convert_overworld_blender.py -- "C:\FF9\Overworld" "C:\FF9\gaia-overworld.glb"
#
# Nessuna parte del gioco è distribuita da questo script.
import sys
from pathlib import Path
import bpy

if "--" not in sys.argv or len(sys.argv[sys.argv.index("--")+1:]) < 2:
    raise SystemExit('Uso: blender -b --python convert_overworld_blender.py -- "<file|cartella>" "<output.glb>"')

src, dst = map(Path, sys.argv[sys.argv.index("--")+1:sys.argv.index("--")+3])
src = src.expanduser().resolve()
dst = dst.expanduser().resolve()

if not src.exists():
    raise SystemExit(f"Origine inesistente: {src}")
dst.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
types = {".obj", ".fbx", ".dae", ".gltf", ".glb"}
files = sorted([p for p in src.rglob("*") if p.suffix.lower() in types]) if src.is_dir() else [src]
if not files:
    raise SystemExit("Nessun .obj / .fbx / .dae / .gltf / .glb trovato. Estrai prima l'archivio del modello.")

# If identical geometry exists in multiple formats, prefer the GLB/GLTF scene.
priority = {".glb":0, ".gltf":1, ".fbx":2, ".dae":3, ".obj":4}
if src.is_dir():
    groups = {}
    for p in files:
        key = str(p.with_suffix("")).lower()
        if key not in groups or priority[p.suffix.lower()] < priority[groups[key].suffix.lower()]:
            groups[key] = p
    files = list(groups.values())

for f in files:
    suff = f.suffix.lower()
    print(f"IMPORT {f}")
    if suff == ".obj":
        bpy.ops.wm.obj_import(filepath=str(f))
    elif suff == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(f))
    elif suff == ".dae":
        bpy.ops.wm.collada_import(filepath=str(f))
    else:
        bpy.ops.import_scene.gltf(filepath=str(f))

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
if not meshes:
    raise SystemExit("L'importazione non ha prodotto geometria 3D. Controlla i file originali.")

# Export the complete scene without destroying original vertex positions, UVs or materials.
bpy.ops.export_scene.gltf(
    filepath=str(dst),
    export_format="GLB",
    export_apply=False,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_yup=True,
)
print(f"OK - {len(meshes)} mesh esportate in {dst}")
print("Apri il GLB in Blender e controlla le texture prima dell'importazione nel browser.")
