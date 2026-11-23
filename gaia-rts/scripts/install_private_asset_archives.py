#!/usr/bin/env python3
"""Install the user's three FF9 GLB ZIPs in the PRIVATE assets branch.

Run only inside a private GitHub repository. Does not download external content.
Expected: gaia-rts/incoming/FF9_GaiaRTS_Parte_01.zip ... _03.zip.
"""
from __future__ import annotations
import base64
import hashlib
import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INBOX = ROOT / "gaia-rts" / "incoming"
OUTPUT = ROOT / "gaia-rts" / "private-assets"
PARTS = [INBOX / f"FF9_GaiaRTS_Parte_{i:02}.zip" for i in range(1, 4)]
WORLD = "08_Maps/FF9_Overworld_Original.glb"
STARTER_MODELS = [
    ("Zidane__303117.glb", "Zidane", "ally"),
    ("Vivi__303115.glb", "Vivi", "ally"),
    ("Steiner__303113.glb", "Steiner", "ally"),
    ("Freya__303108.glb", "Freya", "ally"),
    ("Garnet___Dagger__303110.glb", "Garnet / Dagger", "ally"),
    ("Chocobo__317911.glb", "Chocobo", "ally"),
    ("Beatrix__312356.glb", "Beatrix", "ally"),
    ("Alexandrian_Soldier_01__317905.glb", "Alexandrian Soldier 01", "enemy"),
    ("Alexandrian_Soldier_02__317904.glb", "Alexandrian Soldier 02", "enemy"),
    ("Knight_of_Pluto_01__317907.glb", "Knight of Pluto 01", "enemy"),
    ("Knight_of_Pluto_02__317908.glb", "Knight of Pluto 02", "enemy"),
    ("Alexandrian_Soldier__317903.glb", "Alexandrian Soldier", "enemy"),
    ("Knight_of_Pluto__317906.glb", "Knight of Pluto", "enemy"),
]

def main():
    missing = [p.name for p in PARTS if not p.is_file()]
    if missing:
        raise SystemExit("Missing ZIP uploads: " + ", ".join(missing))
    if (ROOT / ".git").is_dir():
        import subprocess
        origin = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=ROOT, capture_output=True, text=True
        )
        print("Asset importer, private repository check required from workflow.")
    # Do not extract directly into final destinations; validate all archives first.
    with tempfile.TemporaryDirectory(prefix="gaia-ingest-", dir=ROOT) as tmp:
        directory = Path(tmp)
        found = {}
        source_manifest = None
        for part in PARTS:
            with zipfile.ZipFile(part) as source:
                bad = source.testzip()
                if bad:
                    raise ValueError(f"Corrupted ZIP: {part.name}: {bad}")
                for member in source.infolist():
                    name = member.filename
                    pure = Path(name)
                    if member.is_dir():
                        continue
                    if pure.is_absolute() or ".." in pure.parts or "\\" in name:
                        raise ValueError("Unsafe ZIP member: " + name)
                    if name == "manifest.json":
                        source_manifest = source.read(name).decode("utf-8")
                        continue
                    if not name.lower().endswith(".glb"):
                        raise ValueError("Unexpected file: " + name)
                    if name in found:
                        raise ValueError("Duplicate GLB: " + name)
                    if member.file_size <= 0 or member.file_size > 100_000_000:
                        raise ValueError("Out-of-range GLB: " + name)
                    payload = source.read(name)
                    if payload[:4] != b"glTF":
                        raise ValueError("Not a binary GLB: " + name)
                    destination = directory / "all" / pure
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(payload)
                    found[name] = {
                        "file": name, "bytes": len(payload),
                        "sha256": hashlib.sha256(payload).hexdigest()
                    }
        if len(found) != 70:
            raise ValueError(f"Expected 70 GLBs, found {len(found)}")
        if WORLD not in found:
            raise ValueError("Authentic FF9 overworld is missing")
        if source_manifest is None:
            raise ValueError("Original catalog manifest.json missing")
        manifest = json.loads(source_manifest)
        for name, _, _ in STARTER_MODELS:
            choices = [p for p in found if Path(p).name == name]
            if len(choices) != 1:
                raise ValueError(f"Expected one copy of {name}, found {len(choices)}")
        starter = directory / "FF9_GaiaRTS_Starter_Originali.zip"
        config = {
            "format": "gaia-rts/starter-v1",
            "source": "Original FF9 assets provided by repository owner",
            "world": "world/FF9_Overworld_Original.glb",
            "units": [],
            "license_notice": "Private. Proprietary Square Enix materials; do not publish."
        }
        with zipfile.ZipFile(starter, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            z.write(directory / "all" / WORLD, config["world"])
            for filename, label, side in STARTER_MODELS:
                match = next(p for p in found if Path(p).name == filename)
                output_path = "units/" + filename
                z.write(directory / "all" / match, output_path)
                config["units"].append({
                    "name": label, "side": side, "path": output_path
                })
            z.writestr("starter.json", json.dumps(config, indent=2, ensure_ascii=False))
        catalog = {
            "private": True,
            "count": len(found),
            "models": sorted(found.values(), key=lambda x: x["file"]),
            "source_manifest": manifest,
            "note": "Keep in a private repository branch. GitHub Pages can expose file bytes."
        }
        (directory / "catalog.json").write_text(
            json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf8"
        )
        page_source = (ROOT / "gaia-rts" / "authentic.html").read_text(encoding="utf8")
        encoded = base64.b64encode(starter.read_bytes()).decode("ascii")
        marker = '<script type="module">'
        if marker not in page_source:
            raise ValueError("The 3D RTS loader HTML is not available")
        page = page_source.replace(
            marker,
            '<script id="embedded-gaia-starter" type="application/octet-stream">'
            + encoded + '</script>\n' + marker, 1
        )
        (directory / "Gaia_RTS_FF9_Privato.html").write_text(page, encoding="utf8")
        if OUTPUT.exists():
            shutil.rmtree(OUTPUT)
        shutil.move(str(directory), str(OUTPUT))
    print(f"Installed {len(found)} original GLB models")
    print("All assets on the private branch. Keep this branch private.")
    print("Playable private HTML:", OUTPUT / "Gaia_RTS_FF9_Privato.html")
    return 0

if __name__ == "__main__":
    sys.exit(main())
