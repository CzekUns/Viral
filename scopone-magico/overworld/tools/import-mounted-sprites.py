"""Import generated 5-column, 8-direction rider sheets. Usage: script SOURCE_DIR.
Only slices and pads source art; anatomy and motion still need visual review.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
import hashlib, json, shutil, sys
from collections import deque

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
directions = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']
sheets = [
    ('s09', 'Spade', 'Cavaliere di spade blu in marcia.png'),
    ('b09', 'Bastoni', 'Spritesheet del Cavaliere del Nove.png'),
    ('d09', 'Denari', 'Spritesheet equestre del 9 di Denari.png'),
]
assets = json.loads((root/'assets.json').read_text())
catalog = json.loads((root/'catalogo-sprite-data.json').read_text())
for code, suit, filename in sheets:
    folder = root/'characters'/code/'v01-mounted-test'
    for sub in ['source', 'standing', 'walk']:
        (folder/sub).mkdir(parents=True, exist_ok=True)
    src = source/filename
    shutil.copyfile(src, folder/'source/spritesheet.png')
    im = Image.open(src).convert('RGBA')
    rows = []
    for row in range(8):
        poses = []
        for col in range(5):
            box = (round(col*im.width/5), round(row*im.height/8),
                   round((col+1)*im.width/5), round((row+1)*im.height/8))
            cell = im.crop(box)
            # Remove disconnected fragments leaking from neighbouring grid cells.
            alpha = cell.getchannel('A')
            pixels = alpha.load()
            seen = set()
            components = []
            for y in range(cell.height):
                for x in range(cell.width):
                    if pixels[x,y] <= 20 or (x,y) in seen:
                        continue
                    component = []
                    queue = deque([(x,y)])
                    seen.add((x,y))
                    while queue:
                        px,py = queue.popleft()
                        component.append((px,py))
                        for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                            if 0<=nx<cell.width and 0<=ny<cell.height and (nx,ny) not in seen and pixels[nx,ny]>20:
                                seen.add((nx,ny)); queue.append((nx,ny))
                    components.append(component)
            main = max(components, key=len)
            mask = Image.new('L', cell.size)
            for point in main:
                mask.putpixel(point,255)
            mask = mask.filter(ImageFilter.MaxFilter(5))
            cell.putalpha(ImageChops.multiply(alpha,mask))
            xs,ys = zip(*main)
            bounds = (max(0,min(xs)-2),max(0,min(ys)-2),min(cell.width,max(xs)+3),min(cell.height,max(ys)+3))
            poses.append((cell,bounds))
        # One shared box per direction retains relative motion between its poses.
        union = (min(b[0] for _,b in poses), min(b[1] for _,b in poses),
                 max(b[2] for _,b in poses), max(b[3] for _,b in poses))
        rows.append((poses,union))
    scale = min(440/max(b[3]-b[1] for _,b in rows), 460/max(b[2]-b[0] for _,b in rows))
    for direction,(poses,union) in zip(directions,rows):
        rendered = []
        for cell,bounds in poses:
            clean = cell.crop(bounds)
            clean = clean.resize((round(clean.width*scale), round(clean.height*scale)), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA',(512,512))
            x = round(256+(bounds[0]-(union[0]+union[2])/2)*scale)
            y = round(461+(bounds[1]-union[3])*scale)
            frame.paste(clean,(x,y))
            rendered.append(frame)
        rendered[0].save(folder/'standing'/f'{direction}.webp',lossless=True)
        strip=Image.new('RGBA',(2048,512))
        for i,frame in enumerate(rendered[1:]):
            strip.paste(frame,(i*512,0))
        strip.save(folder/'walk'/f'{direction}.webp',lossless=True)
    text = json.dumps(assets['images']['c09-player']).replace('c09', code).replace('C09', code.upper()).replace('Coppe', suit)
    assets['images'][f'{code}-player'] = json.loads(text)
    for key, value in list(assets['images'].items()):
        if key.startswith('c09-player-'):
            assets['images'][key.replace('c09', code)] = json.loads(json.dumps(value).replace('c09', code).replace('C09', code.upper()))
    catalog['items'] = [x for x in catalog['items'] if x['character'] != code.upper()]
    for item in [x for x in catalog['items'] if x['character'] == 'C09']:
        entry = json.loads(json.dumps(item).replace('c09', code).replace('C09', code.upper()).replace('Coppe', suit))
        entry['bytes'] = (root/entry['src']).stat().st_size
        catalog['items'].append(entry)
    manifest = json.loads((root/'characters/c09/v01-mounted-test/manifest.json').read_text().replace('C09', code.upper()).replace('Coppe', suit))
    manifest['source'] = {'file': 'source/spritesheet.png', 'originalName': filename,
                          'sha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'size': list(im.size)}
    manifest['fps'] = 7
    manifest['notes'].append('Griglia 5x8: prima colonna standing, quattro pose walk. Frammenti marginali esclusi dal ritaglio; scala comune, box condiviso per direzione. Nessuna approvazione estetica implicita.')
    (folder/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    (folder/'README.md').write_text(f'# 9 {suit} V01 cavaliere — TEST DA REVISIONARE\n\n8 standing e 8 strip da 4 passi, WebP lossless, celle 512×512. Originale PNG in source/.\n\nSelezionabile nel gestore e presente nel catalogo. Anatomia, bordi e continuità del ciclo richiedono revisione visiva.\n')
(root/'assets.json').write_text(json.dumps(assets, ensure_ascii=False, indent=2)+'\n')
(root/'catalogo-sprite-data.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n')
roster_path = root/'engine/avatar-roster.js'
roster = roster_path.read_text()
for code, suit, _ in sheets:
    if f"id:'{code}-player'" not in roster:
        roster = roster.replace('\n]);', f"\n  Object.freeze({{id:'{code}-player',name:'9 {suit} V01 · Cavaliere',short:'9 {suit}',suit:'{suit}',version:'V01 CAVALIERE TEST',emoji:'🏇'}}),\n]);")
roster_path.write_text(roster)
print('Imported Spade, Bastoni, Denari: 48 WebP files; roster and catalog updated.')
