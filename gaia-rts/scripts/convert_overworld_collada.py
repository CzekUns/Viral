#!/usr/bin/env python3
"""Convert an extracted, user-owned FF9 Overworld.dae + Textures into a single GLB.
Install: python -m pip install lxml numpy trimesh Pillow
Usage:   python convert_overworld_collada.py /path/Overworld.dae /path/Overworld.glb
No source game data is included with this script.
"""
from pathlib import Path
import sys
from lxml import etree
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals
from PIL import Image

if len(sys.argv) != 3:
    raise SystemExit("Usage: convert_overworld_collada.py SOURCE.dae DESTINATION.glb")
source, dest = Path(sys.argv[1]), Path(sys.argv[2])
if not source.is_file():
    raise SystemExit(f"Missing source: {source}")
dest.parent.mkdir(parents=True, exist_ok=True)
NS = "{http://www.collada.org/2005/11/COLLADASchema}"
root = etree.parse(str(source), etree.XMLParser(huge_tree=True))
mesh = root.find(".//" + NS + "mesh")
if mesh is None:
    raise ValueError("No COLLADA mesh found")
images = {e.get("id"): e.findtext(NS + "init_from") for e in root.findall(".//" + NS + "library_images/" + NS + "image")}
effects = {e.get("id"): e for e in root.findall(".//" + NS + "library_effects/" + NS + "effect")}
materials = {e.get("id"): e.find(NS + "instance_effect").get("url").lstrip("#") for e in root.findall(".//" + NS + "library_materials/" + NS + "material")}
sources = {}
for e in mesh.findall(NS + "source"):
    a = e.find(NS + "float_array")
    if a is not None:
        stride = int(e.find(".//" + NS + "accessor").get("stride"))
        sources[e.get("id")] = np.fromstring(a.text, sep=" ", dtype=np.float32).reshape(-1, stride)

vertex_source = mesh.find(NS + "vertices").find(NS + "input").get("source").lstrip("#")
image_cache, scene, tris = {}, trimesh.Scene(base_frame="world"), 0
for primitive in mesh.findall(NS + "polylist"):
    name = primitive.get("material")
    count = int(primitive.get("count"))
    if count == 0: continue
    triangle_sizes = np.fromstring(primitive.findtext(NS + "vcount"), sep=" ", dtype=np.int32)
    if not np.all(triangle_sizes == 3):
        raise ValueError("Nontriangular polylist: " + name)
    inputs = {e.get("semantic"): (int(e.get("offset")), e.get("source").lstrip("#")) for e in primitive.findall(NS + "input")}
    stride = max(offset for offset, _ in inputs.values()) + 1
    idx = np.fromstring(primitive.findtext(NS + "p"), sep=" ", dtype=np.int32).reshape(-1, stride)
    if len(idx) != count * 3: raise ValueError("Bad triangle count: " + name)
    position = sources[vertex_source][idx[:, inputs["VERTEX"][0]]]
    normals = sources[inputs["NORMAL"][1]][idx[:, inputs["NORMAL"][0]]]
    uvs = sources[inputs["TEXCOORD"][1]][idx[:, inputs["TEXCOORD"][0]]]
    # Source geometry already has elevation in column Y, despite COLLADA Z_UP metadata.
    effect = effects.get(materials.get(name, ""))
    texture = None
    if effect is not None:
        diffuse = effect.find(".//" + NS + "diffuse")
        tex = diffuse.find(NS + "texture") if diffuse is not None else None
        if tex is not None:
            params = {e.get("sid"): e for e in effect.findall(".//" + NS + "newparam")}
            sampler = params.get(tex.get("texture"))
            surface_id = sampler.findtext(".//" + NS + "source") if sampler is not None else None
            surface = params.get(surface_id)
            image_id = surface.findtext(".//" + NS + "init_from") if surface is not None else None
            tex_path = images.get(image_id)
            if tex_path:
                f = source.parent / tex_path
                if f not in image_cache:
                    image_cache[f] = Image.open(f).convert("RGBA")
                texture = image_cache[f]
    overlay = any(s in name.lower() for s in ("fog", "sky", "cloud", "thunder", "arch", "sphere", "twister"))
    material = PBRMaterial(name=name, baseColorTexture=texture, roughnessFactor=1.0, metallicFactor=0.0, doubleSided=True, alphaMode="BLEND" if overlay else "OPAQUE")
    meshout = trimesh.Trimesh(vertices=np.asarray(position, dtype=np.float32),
                              vertex_normals=np.asarray(normals, dtype=np.float32),
                              faces=np.arange(len(position), dtype=np.uint32).reshape(-1, 3),
                              process=False, validate=False)
    meshout.visual = TextureVisuals(uv=np.asarray(uv, dtype=np.float32), material=material)
    scene.add_geometry(meshout, node_name=name, geom_name=name)
    tris += count

dest.write_bytes(scene.export(file_type="glb"))
print(f"Done: {tris:,} triangles; {len(scene.geometry)} mesh groups; {dest.stat().st_size:,} bytes")
