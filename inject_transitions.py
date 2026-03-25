#!/usr/bin/env python3
import re, os

PAGES = [
    'index.html', 'albums.html', 'entities.html', 'lyrics.html',
    'merch.html', 'photos.html', 'videos.html', 'email.html',
    'comix.html', 'games.html', 'instagram.html', 'youtube.html',
    'spotify.html', 'apple-music.html', 'blog.html', 'shows.html'
]

BASE = '/Users/jestamang/Desktop/jestamang.com'

BLOCK = '''<!-- JESTA PAGE TRANSITION START -->
<style>
  #jesta-curtain {
    position: fixed;
    inset: 0;
    z-index: 999999;
    opacity: 1;
    transition: opacity 0.4s ease;
    pointer-events: none;
    overflow: hidden;
    background: #000;
  }
  #jesta-curtain.jesta-clear {
    opacity: 0;
  }
  /* Spinning rainbow layer 1 */
  #jesta-curtain::before {
    content: '';
    position: absolute;
    inset: -60%;
    background: conic-gradient(from 0deg at 50% 50%,
      #ff0055, #ff6600, #ffee00, #00ff88, #00aaff, #cc00ff, #ff0055);
    animation: jestaSpin 0.55s linear infinite;
    filter: brightness(1.3) saturate(2);
  }
  /* Spinning rainbow layer 2 — counter-rotate, blend */
  #jesta-curtain::after {
    content: '';
    position: absolute;
    inset: -60%;
    background: conic-gradient(from 120deg at 40% 65%,
      #00ffee, #ff00cc, #aaff00, #ff4400, #0044ff, #ff00aa, #00ffee);
    animation: jestaSpin 0.75s linear infinite reverse;
    mix-blend-mode: screen;
    opacity: 0.75;
    filter: brightness(1.2) saturate(2);
  }
  @keyframes jestaSpin {
    from { transform: rotate(0deg) scale(1.1); }
    to   { transform: rotate(360deg) scale(1.1); }
  }
</style>
<div id="jesta-curtain"></div>
<script>
(function() {
  var curtain = document.getElementById('jesta-curtain');

  // Fade in on load
  window.addEventListener('load', function() {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        curtain.classList.add('jesta-clear');
      });
    });
  });

  // Fade out on internal navigation
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a');
    if (!anchor) return;
    if (anchor.target === '_blank') return;
    var href = anchor.getAttribute('href');
    if (!href || href === '' || href.charAt(0) === '#' ||
        href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 ||
        href.indexOf('javascript:') === 0) return;

    e.preventDefault();
    curtain.classList.remove('jesta-clear');
    setTimeout(function() {
      window.location.href = href;
    }, 420);
  });
})();
</script>
<!-- JESTA PAGE TRANSITION END -->'''

def inject(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove previous injection
    content = re.sub(
        r'\s*<!-- JESTA PAGE TRANSITION START -->.*?<!-- JESTA PAGE TRANSITION END -->',
        '', content, flags=re.DOTALL
    )

    content = content.replace('</body>', BLOCK + '\n</body>', 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  ✓ {os.path.basename(path)}')

print('Injecting psychedelic transitions...')
for page in PAGES:
    inject(os.path.join(BASE, page))
print('Done.')
