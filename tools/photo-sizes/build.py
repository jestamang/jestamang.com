#!/usr/bin/env python3
"""build.py: records the pixel size of every photo thumbnail in assets/photos/thumbs so photos.html can lay out
justified rows before the images load. Writes assets/data/photo-sizes.json as {"generated", "source", "photos": {filename: [w, h]}}.

  python3 tools/photo-sizes/build.py          write the file
  python3 tools/photo-sizes/build.py --check  exit 1 when the file no longer matches the thumbnails on disk

Run it again whenever photos are added; drift-check warns about gallery photos with no entry. Needs Pillow.
"""
import json, os, sys
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THUMBS = os.path.join(REPO, 'assets/photos/thumbs')
FULL = os.path.join(REPO, 'assets/photos')
OUT = os.path.join(REPO, 'assets/data/photo-sizes.json')

def measure():
    sizes = {}
    names = sorted(f for f in os.listdir(THUMBS) if not f.startswith('.'))
    for f in names:
        try:
            with Image.open(os.path.join(THUMBS, f)) as im: sizes[f] = [im.width, im.height]
        except Exception as e:
            print(f'  {f}: unreadable ({e})')
    # a full-size photo with no thumbnail still gets a size, from the full file (the page falls back to it)
    for f in sorted(os.listdir(FULL)):
        if f in sizes or f.startswith('.') or os.path.isdir(os.path.join(FULL, f)): continue
        try:
            with Image.open(os.path.join(FULL, f)) as im: sizes[f] = [im.width, im.height]
        except Exception: pass
    return sizes

def main():
    check = '--check' in sys.argv
    sizes = measure()
    old = {}
    if os.path.exists(OUT):
        try: old = json.load(open(OUT, encoding='utf-8')).get('photos', {})
        except Exception: old = {}
    changed = [f for f in sizes if old.get(f) != sizes[f]] + [f for f in old if f not in sizes]
    summary = f'{len(sizes)} photos measured'
    if check:
        if changed: print(f'STALE  {OUT}: {len(changed)} entries differ from the files on disk. Run: python3 tools/photo-sizes/build.py'); sys.exit(1)
        print('OK     ' + summary); return
    json.dump({'generated': __import__('datetime').date.today().isoformat(), 'source': 'assets/photos/thumbs', 'photos': sizes}, open(OUT, 'w', encoding='utf-8'), separators=(',', ':'), sort_keys=True)
    print(f'WROTE  {os.path.relpath(OUT, REPO)}: {summary}; {len(changed)} changed')

if __name__ == '__main__': main()
