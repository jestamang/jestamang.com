#!/usr/bin/env python3
"""
Minify all HTML files in jestamang.com/:
  - Strip HTML comments (except ADD NEW SHOWS HERE on shows.html)
  - Minify inline <style> blocks via rcssmin
  - Minify inline <script> blocks via rjsmin
  - Collapse HTML whitespace (preserve pre/textarea content)
"""
import re, os
import rcssmin, rjsmin

PAGES = [
    'index.html', 'albums.html', 'entities.html', 'lyrics.html',
    'merch.html', 'photos.html', 'videos.html', 'email.html',
    'comix.html', 'games.html', 'instagram.html', 'youtube.html',
    'spotify.html', 'apple-music.html', 'blog.html', 'shows.html'
]

BASE = '/Users/jestamang/Desktop/jestamang.com'

# ── Helpers ──────────────────────────────────────────────────────────────────

def minify_css_block(m):
    css = m.group(1)
    minified = rcssmin.cssmin(css)
    return '<style>' + minified + '</style>'

def minify_js_block(m):
    js = m.group(1)
    minified = rjsmin.jsmin(js)
    return '<script>' + minified + '</script>'

def minify_js_block_with_type(m):
    attrs = m.group(1)
    js = m.group(2)
    minified = rjsmin.jsmin(js)
    return '<script' + attrs + '>' + minified + '</script>'

def strip_html_comments(html, keep_show_comment=False):
    def replacer(m):
        comment = m.group(0)
        if keep_show_comment and 'ADD NEW SHOWS HERE' in comment:
            return comment
        return ''
    return re.sub(r'<!--.*?-->', replacer, html, flags=re.DOTALL)

def collapse_html_whitespace(html):
    # Protect pre and textarea content
    protected = {}
    counter = [0]

    def protect(m):
        key = f'\x00PROTECT{counter[0]}\x00'
        protected[key] = m.group(0)
        counter[0] += 1
        return key

    # Protect pre, textarea, script, style blocks from whitespace collapse
    html = re.sub(r'<(pre|textarea|script|style)[^>]*>.*?</\1>', protect, html, flags=re.DOTALL | re.IGNORECASE)

    # Collapse whitespace between tags
    html = re.sub(r'>\s+<', '> <', html)
    # Collapse multiple spaces/newlines to single space
    html = re.sub(r'[ \t]{2,}', ' ', html)
    html = re.sub(r'\n\s*\n', '\n', html)
    # Remove leading/trailing whitespace on lines
    html = re.sub(r'^\s+', '', html, flags=re.MULTILINE)
    html = re.sub(r'\s+$', '', html, flags=re.MULTILINE)
    # Remove blank lines
    html = re.sub(r'\n+', '\n', html)

    # Restore protected blocks
    for key, val in protected.items():
        html = html.replace(key, val)

    return html.strip()

def minify_file(path, keep_show_comment=False):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    original_size = len(html.encode('utf-8'))

    # 1. Minify <style> blocks
    html = re.sub(r'<style>(.*?)</style>', minify_css_block, html, flags=re.DOTALL | re.IGNORECASE)

    # 2. Minify <script> blocks (with and without attributes)
    html = re.sub(r'<script>(.*?)</script>', minify_js_block, html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<script(\s[^>]*)>(.*?)</script>', minify_js_block_with_type, html, flags=re.DOTALL | re.IGNORECASE)

    # 3. Strip HTML comments
    html = strip_html_comments(html, keep_show_comment=keep_show_comment)

    # 4. Collapse HTML whitespace
    html = collapse_html_whitespace(html)

    new_size = len(html.encode('utf-8'))
    saved = original_size - new_size
    pct = (saved / original_size * 100) if original_size else 0

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f'  ✓ {os.path.basename(path):22s}  {original_size//1024:>5}KB → {new_size//1024:>5}KB  (saved {saved//1024}KB, {pct:.0f}%)')

print('Minifying...\n')
for page in PAGES:
    path = os.path.join(BASE, page)
    keep = (page == 'shows.html')
    minify_file(path, keep_show_comment=keep)

print('\nDone.')
