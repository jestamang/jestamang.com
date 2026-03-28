#!/usr/bin/env python3
"""Apply remaining fixes to pages with non-standard nav formatting."""

import os

BASE = "/Users/jestamang/Desktop/jestamang.com"

# ─── arcade.html: add .home-btn hide to its different media query end ─────────
arcade_old = "#jtnav-mobile-toggle{display:flex;margin-left:auto}}"
arcade_new = "#jtnav-mobile-toggle{display:flex;margin-left:auto}.home-btn{display:none!important}}"

# ─── merch.html: multi-line CSS and JS ───────────────────────────────────────
MERCH_OLD_OVERLAY_CSS = """#jtnav-mobile-overlay {
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

#jtnav-mobile-overlay.jtnav-mob-open { display: flex; }

#jtnav-mob-bg {
  position: absolute;
  inset: 0;
  background-image: #000;
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
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.6rem;
  cursor: pointer;
  line-height: 1;
  font-family: sans-serif;
  z-index: 1;
}

#jtnav-mob-close:hover { color: #c9a84c; }

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
.jtnav-mob-link.jtnav-active { color: #c9a84c; }

.jtnav-mob-divider {
  width: 60px;
  height: 1px;
  background: rgba(201, 168, 76, 0.3);
  margin: 10px 0;
  position: relative;
  z-index: 1;
}"""

MERCH_NEW_OVERLAY_CSS = """#jtnav-mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.96);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
}

#jtnav-mobile-overlay.jtnav-mob-open { display: flex; opacity: 1; }

#jtnav-mob-bg {
  position: absolute;
  inset: 0;
  background-image: url('assets/homepage/background/Gif2.gif');
  background-size: cover;
  background-position: center;
  opacity: 0.08;
  pointer-events: none;
}

#jtnav-mob-close {
  position: absolute;
  top: 18px;
  right: 22px;
  background: none;
  border: none;
  color: #c9a84c;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  font-family: sans-serif;
  z-index: 1;
}

#jtnav-mob-close:hover { color: #c9a84c; }

.jtnav-mob-link {
  font-family: 'Luminari', serif;
  font-size: 0.85rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(240, 230, 210, 0.8);
  text-decoration: none;
  padding: 14px 0;
  position: relative;
  z-index: 1;
  transition: color 0.2s ease;
  font-weight: normal;
  line-height: 2.2;
}

.jtnav-mob-link:hover,
.jtnav-mob-link.jtnav-active { color: #c9a84c; }

.jtnav-mob-divider {
  width: 60px;
  height: 1px;
  background: rgba(201, 168, 76, 0.3);
  margin: 10px 0;
  position: relative;
  z-index: 1;
}

.jtnav-mob-divider::after {
  content: '\\2726';
  display: block;
  text-align: center;
  color: rgba(201, 168, 76, 0.4);
  font-size: 0.7rem;
  margin: 4px 0;
}"""

MERCH_OLD_MEDIA = """@media (max-width: 767px) {
  #jtnav-links, #jtnav-divider, #jtnav-platforms { display: none; }
  #jtnav-mobile-toggle { display: flex; margin-left: auto; }
}"""

MERCH_NEW_MEDIA = """@media (max-width: 767px) {
  #jtnav-links, #jtnav-divider, #jtnav-platforms { display: none; }
  #jtnav-mobile-toggle { display: flex; margin-left: auto; }
  .home-btn { display: none !important; }
}"""

MERCH_OLD_JS = """  if (toggle && overlay) {
    toggle.addEventListener('click', function () { overlay.classList.add('jtnav-mob-open'); });
    closeBtn.addEventListener('click', function () { overlay.classList.remove('jtnav-mob-open'); });
    overlay.querySelectorAll('.jtnav-mob-link').forEach(function (link) {
      link.addEventListener('click', function () { overlay.classList.remove('jtnav-mob-open'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') overlay.classList.remove('jtnav-mob-open');
    });
  }"""

MERCH_NEW_JS = """  var scrollPos = 0;
  function openMenu() {
    scrollPos = window.scrollY;
    document.body.style.top = '-' + scrollPos + 'px';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    overlay.classList.add('jtnav-mob-open');
  }
  function closeMenu() {
    overlay.classList.remove('jtnav-mob-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollPos);
  }
  if (toggle && overlay) {
    toggle.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeMenu(); });
    overlay.querySelectorAll('.jtnav-mob-link').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }"""

# close btn
MERCH_OLD_CLOSE = '<button id="jtnav-mob-close" aria-label="Close navigation">✕</button>'
MERCH_NEW_CLOSE = '<button id="jtnav-mob-close" aria-label="Close navigation">✦</button>'


def fix_file(filepath, replacements):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    changed = False
    for old, new, label in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"  + {label}")
            changed = True
        else:
            print(f"  ~ {label}: NOT FOUND")
    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  => SAVED")
    return changed


# ─── arcade.html ─────────────────────────────────────────────────────────────
print("[arcade.html]")
fix_file(os.path.join(BASE, "arcade.html"), [
    (arcade_old, arcade_new, "Task 4: home-btn hide in media query"),
])

# ─── merch.html ──────────────────────────────────────────────────────────────
print("[merch.html]")
fix_file(os.path.join(BASE, "merch.html"), [
    (MERCH_OLD_OVERLAY_CSS, MERCH_NEW_OVERLAY_CSS, "Task 2: overlay CSS redesign"),
    (MERCH_OLD_MEDIA, MERCH_NEW_MEDIA, "Task 4: home-btn hide in media query"),
    (MERCH_OLD_JS, MERCH_NEW_JS, "Task 1: scroll lock JS"),
    (MERCH_OLD_CLOSE, MERCH_NEW_CLOSE, "Task 3: close btn ✕→✦"),
])

print("\nDone.")
