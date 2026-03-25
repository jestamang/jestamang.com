#!/usr/bin/env python3
import re, os

PAGES = [
    'index.html', 'albums.html', 'entities.html', 'lyrics.html',
    'merch.html', 'photos.html', 'videos.html', 'email.html',
    'comix.html', 'games.html', 'instagram.html', 'youtube.html',
    'spotify.html', 'apple-music.html', 'blog.html', 'shows.html'
]

BASE = '/Users/jestamang/Desktop/jestamang.com'

TOPNAV_BLOCK = '''<!-- JESTAMANG TOP NAV START -->
<style>
  /* ── TOP NAV ─────────────────────────────────────────── */
  #jtnav {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 52px;
    z-index: 1000;
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(201, 168, 76, 0.3);
  }

  #jtnav-logo {
    display: flex;
    align-items: center;
    margin-left: 16px;
    flex-shrink: 0;
    text-decoration: none;
  }

  #jtnav-logo img {
    height: 32px;
    width: auto;
    display: block;
  }

  #jtnav-links {
    display: flex;
    align-items: center;
    gap: 0;
    flex: 1;
    justify-content: center;
    flex-wrap: nowrap;
  }

  .jtnav-link {
    font-family: 'Luminari', serif;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    padding: 0 8px;
    white-space: nowrap;
    transition: color 0.2s ease;
    line-height: 52px;
  }

  .jtnav-link:hover {
    color: #c9a84c;
  }

  .jtnav-link.jtnav-active {
    color: #c9a84c;
  }

  .jtnav-dot {
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.6rem;
    padding: 0 2px;
    line-height: 52px;
    user-select: none;
  }

  #jtnav-divider {
    width: 1px;
    height: 20px;
    background: rgba(201, 168, 76, 0.3);
    margin: 0 10px;
    flex-shrink: 0;
  }

  #jtnav-platforms {
    display: flex;
    align-items: center;
    margin-right: 16px;
    flex-shrink: 0;
    gap: 0;
  }

  /* Mobile toggle */
  #jtnav-mobile-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    flex-shrink: 0;
  }

  #jtnav-mobile-toggle img {
    height: 32px;
    width: auto;
    display: block;
  }

  /* Mobile overlay */
  #jtnav-mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0, 0, 0, 0.95);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    overflow: hidden;
  }

  #jtnav-mobile-overlay.jtnav-mob-open {
    display: flex;
  }

  #jtnav-mob-bg {
    position: absolute;
    inset: 0;
    background-image: url('assets/homepage/background/Gif2.gif');
    background-size: cover;
    background-position: center;
    opacity: 0.06;
    pointer-events: none;
  }

  #jtnav-mob-close {
    position: absolute;
    top: 18px;
    right: 22px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.5);
    font-size: 1.6rem;
    cursor: pointer;
    line-height: 1;
    font-family: sans-serif;
    z-index: 1;
  }

  #jtnav-mob-close:hover {
    color: #c9a84c;
  }

  .jtnav-mob-link {
    font-family: 'Luminari', serif;
    font-size: 1.5rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    padding: 14px 0;
    position: relative;
    z-index: 1;
    transition: color 0.2s ease;
  }

  .jtnav-mob-link:hover,
  .jtnav-mob-link.jtnav-active {
    color: #c9a84c;
  }

  .jtnav-mob-divider {
    width: 60px;
    height: 1px;
    background: rgba(201, 168, 76, 0.3);
    margin: 10px 0;
    position: relative;
    z-index: 1;
  }

  /* Responsive */
  @media (max-width: 767px) {
    #jtnav-links,
    #jtnav-divider,
    #jtnav-platforms {
      display: none;
    }
    #jtnav-mobile-toggle {
      display: flex;
      margin-left: auto;
    }
  }

  /* Body offset */
  body {
    padding-top: 52px !important;
  }
</style>

<div id="jtnav">
  <a id="jtnav-logo" href="index.html">
    <img src="assets/homepage/logo png.png" alt="Jestamang">
  </a>

  <div id="jtnav-links">
    <a class="jtnav-link" href="entities.html" data-page="entities.html">Entities</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="albums.html" data-page="albums.html">Albums</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="lyrics.html" data-page="lyrics.html">Lyrics</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="merch.html" data-page="merch.html">Merch</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="photos.html" data-page="photos.html">Photos</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="videos.html" data-page="videos.html">Videos</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="shows.html" data-page="shows.html">Shows</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="blog.html" data-page="blog.html">Blog</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="comix.html" data-page="comix.html">Comix</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="games.html" data-page="games.html">Games</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="email.html" data-page="email.html">Email</a>
  </div>

  <div id="jtnav-divider"></div>

  <div id="jtnav-platforms">
    <a class="jtnav-link" href="instagram.html" data-page="instagram.html">IG</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="youtube.html" data-page="youtube.html">YT</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="spotify.html" data-page="spotify.html">SP</a>
    <span class="jtnav-dot">·</span>
    <a class="jtnav-link" href="apple-music.html" data-page="apple-music.html">AM</a>
  </div>

  <button id="jtnav-mobile-toggle" aria-label="Open navigation">
    <img src="assets/homepage/jestamang-badge.png" alt="Menu">
  </button>
</div>

<div id="jtnav-mobile-overlay">
  <div id="jtnav-mob-bg"></div>
  <button id="jtnav-mob-close" aria-label="Close navigation">✕</button>
  <a class="jtnav-mob-link" href="index.html" data-page="index.html">Home</a>
  <a class="jtnav-mob-link" href="entities.html" data-page="entities.html">Entities</a>
  <a class="jtnav-mob-link" href="albums.html" data-page="albums.html">Albums</a>
  <a class="jtnav-mob-link" href="lyrics.html" data-page="lyrics.html">Lyrics</a>
  <a class="jtnav-mob-link" href="merch.html" data-page="merch.html">Merch</a>
  <a class="jtnav-mob-link" href="photos.html" data-page="photos.html">Photos</a>
  <a class="jtnav-mob-link" href="videos.html" data-page="videos.html">Videos</a>
  <a class="jtnav-mob-link" href="shows.html" data-page="shows.html">Shows</a>
  <a class="jtnav-mob-link" href="blog.html" data-page="blog.html">Blog</a>
  <a class="jtnav-mob-link" href="comix.html" data-page="comix.html">Comix</a>
  <a class="jtnav-mob-link" href="games.html" data-page="games.html">Games</a>
  <a class="jtnav-mob-link" href="email.html" data-page="email.html">Email</a>
  <div class="jtnav-mob-divider"></div>
  <a class="jtnav-mob-link" href="instagram.html" data-page="instagram.html">Instagram</a>
  <a class="jtnav-mob-link" href="youtube.html" data-page="youtube.html">YouTube</a>
  <a class="jtnav-mob-link" href="spotify.html" data-page="spotify.html">Spotify</a>
  <a class="jtnav-mob-link" href="apple-music.html" data-page="apple-music.html">Apple Music</a>
</div>

<script>
(function() {
  // Active page detection
  var page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.jtnav-link, .jtnav-mob-link').forEach(function(el) {
    if (el.getAttribute('data-page') === page) {
      el.classList.add('jtnav-active');
    }
  });

  // Mobile overlay toggle
  var toggle = document.getElementById('jtnav-mobile-toggle');
  var overlay = document.getElementById('jtnav-mobile-overlay');
  var closeBtn = document.getElementById('jtnav-mob-close');

  if (toggle && overlay) {
    toggle.addEventListener('click', function() {
      overlay.classList.add('jtnav-mob-open');
    });
    closeBtn.addEventListener('click', function() {
      overlay.classList.remove('jtnav-mob-open');
    });
    overlay.querySelectorAll('.jtnav-mob-link').forEach(function(link) {
      link.addEventListener('click', function() {
        overlay.classList.remove('jtnav-mob-open');
      });
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') overlay.classList.remove('jtnav-mob-open');
    });
  }
})();
</script>
<!-- JESTAMANG TOP NAV END -->'''

def inject(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove any previous injection
    content = re.sub(
        r'<!-- JESTAMANG TOP NAV START -->.*?<!-- JESTAMANG TOP NAV END -->',
        '', content, flags=re.DOTALL
    )

    # Inject right after <body...>
    content = re.sub(
        r'(<body[^>]*>)',
        r'\1\n' + TOPNAV_BLOCK,
        content, count=1
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'  ✓ {os.path.basename(path)}')

print('Injecting top nav...')
for page in PAGES:
    inject(os.path.join(BASE, page))
print('Done.')
