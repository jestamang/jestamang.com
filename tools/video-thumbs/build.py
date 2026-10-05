#!/usr/bin/env python3
"""build.py: measures the black bars baked into each published video's YouTube thumbnail and writes
assets/data/video-thumb-crops.json, which videos.html reads to zoom past the bars (or, for extreme
cases, to show the frame whole over a blurred copy of itself).

Usage:  python3 tools/video-thumbs/build.py          write the file and print what changed
        python3 tools/video-thumbs/build.py --check  compare only; exit 1 when the committed file is stale
Needs Python 3 with Pillow (pip install pillow). Reads the public videos collection with the site's web key.

Entry shape per YouTube id: t, b, l, r = bar fractions of height/width; mode = none | zoom | ambient.
  none    no bars worth cropping
  zoom    scale and shift the image so the visible picture fills the tile (zoom under AMBIENT_AT)
  ambient the visible picture would need a zoom of AMBIENT_AT or more, so the page shows it whole
          over a blurred fill instead (vertical and near-square sources)
Run it again whenever videos are added; drift-check warns about published videos with no entry.
"""
import io, json, os, re, sys, urllib.request
try:
    from PIL import Image
except ImportError:
    print('Pillow is required: pip install pillow'); sys.exit(2)

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(REPO, 'assets', 'data', 'video-thumb-crops.json')
DARK = 18          # mean luminance below this counts as a bar row or column
BAR_MAX = 120      # and no sampled pixel in it may be brighter than this, so a caption reaching into the bar is kept
# The measurement cannot tell a black bar from a black stage. Per-video overrides, id -> 'none' | 'zoom' | 'ambient',
# win over the measured mode; 'none' also clears the measured insets.
OVERRIDES = {
    'F25D2ZOVgsE': 'none',      # ATTENCHUN!: a dark stage with lights in the middle, not letterboxed
    '31DacId6G1E': 'ambient',   # Jestamang Live at Prison Break: vertical phone video, shown whole over its own blur
    'yQugxfPBo68': 'ambient',   # The Circus Speaks (III): near-square frame with captions above and below
    'H0EoIEza8hA': 'ambient',   # Magician's Trick (Flashback): 4:3 frame with a wide right bar
}
MIN_BAR = 0.02     # bars thinner than 2 percent of the frame are ignored
AMBIENT_AT = 2.0   # zoom factor at which the page switches to the ambient fill

def firebase_config():
    src = open(os.path.join(REPO, 'assets', 'js', 'firebase-config.js'), encoding='utf-8').read()
    key = re.search(r'apiKey:\s*["\']([^"\']+)', src).group(1); pid = re.search(r'projectId:\s*["\']([^"\']+)', src).group(1)
    return key, pid

def published_videos():
    key, pid = firebase_config(); out = []; token = None
    while True:
        url = f'https://firestore.googleapis.com/v1/projects/{pid}/databases/(default)/documents/videos?pageSize=300&key={key}' + (f'&pageToken={token}' if token else '')
        d = json.load(urllib.request.urlopen(url, timeout=30))
        for doc in d.get('documents', []):
            f = doc.get('fields', {})
            if f.get('published', {}).get('booleanValue', True) is False: continue
            vid = f.get('youtubeId', {}).get('stringValue'); title = f.get('title', {}).get('stringValue', '')
            if vid: out.append((vid, title))
        token = d.get('nextPageToken')
        if not token: break
    return out

def bars(img):
    g = img.convert('L'); w, h = g.size; px = g.load()
    def dark(samples):
        vals = list(samples); return sum(vals) / len(vals) < DARK and max(vals) < BAR_MAX
    rowdark = lambda y: dark(px[x, y] for x in range(0, w, 4))
    coldark = lambda x: dark(px[x, y] for y in range(0, h, 4))
    t = 0
    while t < h - 1 and rowdark(t): t += 1
    b = 0
    while b < h - 1 and rowdark(h - 1 - b): b += 1
    l = 0
    while l < w - 1 and coldark(l): l += 1
    r = 0
    while r < w - 1 and coldark(w - 1 - r): r += 1
    f = lambda v, n: round(v / n, 3) if v / n >= MIN_BAR else 0.0
    return f(t, h), f(b, h), f(l, w), f(r, w)

def measure(vid):
    data = urllib.request.urlopen(f'https://img.youtube.com/vi/{vid}/mqdefault.jpg', timeout=30).read()
    t, b, l, r = bars(Image.open(io.BytesIO(data)))
    vis_h, vis_w = 1 - t - b, 1 - l - r
    zoom = max(1 / vis_h, 1 / vis_w) if vis_h > 0 and vis_w > 0 else 1
    mode = 'none' if (t + b + l + r) == 0 else ('ambient' if zoom >= AMBIENT_AT else 'zoom')
    mode = OVERRIDES.get(vid, mode)
    if mode == 'none': t = b = l = r = 0.0
    return {'t': t, 'b': b, 'l': l, 'r': r, 'mode': mode}

def main():
    check = '--check' in sys.argv
    vids = published_videos()
    entries = {}
    for vid, title in vids:
        try: entries[vid] = measure(vid)
        except Exception as e: print(f'  {title}: thumbnail could not be read ({e})'); entries[vid] = {'t': 0.0, 'b': 0.0, 'l': 0.0, 'r': 0.0, 'mode': 'none'}
    old = {}
    if os.path.exists(OUT):
        try: old = json.load(open(OUT, encoding='utf-8')).get('videos', {})
        except Exception: old = {}
    changed = [v for v in entries if old.get(v) != entries[v]] + [v for v in old if v not in entries]
    modes = {}
    for e in entries.values(): modes[e['mode']] = modes.get(e['mode'], 0) + 1
    summary = f"{len(entries)} published videos: {modes.get('none', 0)} clean, {modes.get('zoom', 0)} zoom, {modes.get('ambient', 0)} ambient"
    if check:
        if changed: print(f'STALE  {OUT}: {len(changed)} entries differ from a fresh measurement. Run: python3 tools/video-thumbs/build.py'); sys.exit(1)
        print('OK     ' + summary); return
    json.dump({'generated': __import__('datetime').date.today().isoformat(), 'source': 'img.youtube.com mqdefault', 'videos': entries}, open(OUT, 'w', encoding='utf-8'), indent=1, sort_keys=True)
    print(f'WROTE  {os.path.relpath(OUT, REPO)}: {summary}; {len(changed)} changed')
    for vid, title in vids:
        e = entries[vid]
        if e['mode'] != 'none': print(f"  {e['mode']:7} {title[:40]:40} t={e['t']} b={e['b']} l={e['l']} r={e['r']}")

if __name__ == '__main__': main()
