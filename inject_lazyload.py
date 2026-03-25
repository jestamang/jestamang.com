#!/usr/bin/env python3
"""
Add loading="lazy" to all img tags except:
  - Images inside #jtnav (top nav bar)
  - All images on index.html (single-viewport, no scroll)
  - jestamang-badge.png (nav toggle)

Also inject IntersectionObserver fade-in for photos.html and entities.html.
"""
import re, os

PAGES = [
    'index.html', 'albums.html', 'entities.html', 'lyrics.html',
    'merch.html', 'photos.html', 'videos.html', 'email.html',
    'comix.html', 'games.html', 'instagram.html', 'youtube.html',
    'spotify.html', 'apple-music.html', 'blog.html', 'shows.html'
]

BASE = '/Users/jestamang/Desktop/jestamang.com'

# Intersection Observer block for photos + entities pages
OBSERVER_BLOCK = '<style>.lazy-img{opacity:0;transition:opacity 0.4s ease}.lazy-img.lazy-visible{opacity:1}</style><script>(function(){var imgs=document.querySelectorAll("img[loading=\'lazy\']");imgs.forEach(function(img){img.classList.add("lazy-img")});var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("lazy-visible");obs.unobserve(e.target)}})},{rootMargin:"50px"});imgs.forEach(function(img){obs.observe(img)})})();</script>'

def add_lazy_to_img(tag):
    """Add loading="lazy" to a single <img ...> tag if not already present."""
    if 'loading=' in tag:
        return tag
    # Insert before the closing > or />
    return re.sub(r'(\s*/?>)$', r' loading="lazy"\1', tag)

def process_file(path, skip_all=False, add_observer=False):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    if skip_all:
        return 0

    total_added = 0

    # Split on #jtnav block to protect nav images
    # Strategy: tokenize the HTML into jtnav sections vs rest
    # We'll use a marker approach: protect everything inside #jtnav...closing div

    # Protect #jtnav div (top nav bar — find from <div id="jtnav"> to its closing </div>)
    protected = {}
    counter = [0]

    def protect_block(m):
        key = f'XPROTECTX{counter[0]}X'
        protected[key] = m.group(0)
        counter[0] += 1
        return key

    # Protect the entire jtnav div
    html = re.sub(r'<div id="jtnav">.*?</div>\s*</div>', protect_block, html, flags=re.DOTALL)
    # Also protect jtnav-mobile-toggle button
    html = re.sub(r'<button id="jtnav-mobile-toggle".*?</button>', protect_block, html, flags=re.DOTALL)

    # Now add loading="lazy" to all remaining img tags
    def lazy_replacer(m):
        nonlocal total_added
        tag = m.group(0)
        if 'loading=' in tag:
            return tag
        # Skip badge image
        if 'jestamang-badge.png' in tag:
            return tag
        new_tag = re.sub(r'(\s*/?>\s*)$', r' loading="lazy"\1', tag)
        total_added += 1
        return new_tag

    html = re.sub(r'<img\b[^>]*>', lazy_replacer, html, flags=re.DOTALL)

    # Restore protected blocks
    for key, val in protected.items():
        html = html.replace(key, val)

    # Inject observer for photos/entities
    if add_observer:
        html = html.replace('</body>', OBSERVER_BLOCK + '</body>', 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

    return total_added

grand_total = 0
print('Adding lazy loading...\n')

for page in PAGES:
    path = os.path.join(BASE, page)
    skip = (page == 'index.html')
    observer = page in ('photos.html', 'entities.html')
    n = process_file(path, skip_all=skip, add_observer=observer)
    tag = ' + observer' if observer else ''
    skip_tag = ' (skipped — single viewport)' if skip else ''
    print(f'  ✓ {page:22s}  {n} img tags{tag}{skip_tag}')
    grand_total += n

print(f'\nTotal img tags updated: {grand_total}')
