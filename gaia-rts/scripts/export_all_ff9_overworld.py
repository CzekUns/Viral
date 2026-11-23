"""Batch-export original FF9 world models from a *local* Steam/GOG install.
Run: python export_all_ff9_overworld.py --game "C:/.../FINAL FANTASY IX"
Prereq: install source toolkit with pip install -e ".[assets]" (from its ff9mapkit folder).
No Square Enix data is included in this script or repository.
"""
import argparse
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from datetime import datetime, timezone
from ff9mapkit import catalog

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", default=None, help="FF9 installation path; optional if auto-detected")
    parser.add_argument("--out", default="FF9_MiniOverworld", help="Output folder")
    parser.add_argument("--dry-run", action="store_true", help="List models only")
    args = parser.parse_args()
    models = sorted(catalog.models("GEO_SUB_W0_"), key=lambda m: m.name)
    categories = {"walker": "personaggi", "chocobo": "chocobo", "vehicle": "veicoli"}
    entries = []
    for m in models:
        role = catalog.world_role(m.id) or "other"
        entries.append({"geo": m.name, "id": m.id, "role": role,
                        "category": categories.get(role, "altri"),
                        "identity": catalog.world_character(m.id)})
    print(f"Found {len(entries)} original world-model IDs")
    for e in entries:
        print(e["geo"], e["category"], e["identity"])
    if args.dry_run:
        return 0
    from ff9mapkit.config import find_game_path
    from ff9mapkit.models.gltf import export_gltf
    game = find_game_path(args.game)
    for number in (4, 5):
        path = game / "StreamingAssets" / f"p0data{number}.bin"
        if not path.is_file():
            raise SystemExit(f"Game asset missing: {path}")
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    for e in entries:
        folder = out / e["category"]
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / (e["geo"] + ".glb")
        try:
            if target.exists() and target.stat().st_size > 1024:
                e["status"] = "ok"
            else:
                info = export_gltf(e["geo"], str(target), anims="all", game=game)
                e["animations"] = info.get("anims", [])
                e["status"] = "ok"
            e["file"] = str(target.relative_to(out)).replace("\\", "/")
            e["bytes"] = target.stat().st_size
            print("OK:", e["geo"])
        except Exception as error:
            e["status"] = "error"
            e["error"] = str(error)
            if target.exists():
                target.unlink()
            print("ERROR:", e["geo"], error)
    (out / "manifest.json").write_text(json.dumps({
        "format": "gaia-rts/ff9-world-models-v1",
        "extracted_utc": datetime.now(timezone.utc).isoformat(),
        "source": "local FF9 PC installation (Steam/GOG)",
        "models": entries
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    archive = out.with_suffix(".zip")
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as z:
        for f in out.rglob("*"):
            if f.is_file():
                z.write(f, f.relative_to(out))
    success = sum(x["status"] == "ok" for x in entries)
    print(f"Exported {success}/{len(entries)} models into {archive}")
    return 0 if success else 2

if __name__ == "__main__":
    raise SystemExit(main())
