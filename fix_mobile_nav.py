#!/usr/bin/env python3
"""Apply all mobile nav fixes to all HTML files."""

import os
import glob

# ─── TASK 1: Old JS → New JS ────────────────────────────────────────────────
OLD_JS = (
    "var toggle=document.getElementById('jtnav-mobile-toggle');"
    "var overlay=document.getElementById('jtnav-mobile-overlay');"
    "var closeBtn=document.getElementById('jtnav-mob-close');"
    "if(toggle&&overlay){"
    "toggle.addEventListener('click',function(){overlay.classList.add('jtnav-mob-open');});"
    "closeBtn.addEventListener('click',function(){overlay.classList.remove('jtnav-mob-open');});"
    "overlay.querySelectorAll('.jtnav-mob-link').forEach(function(link){"
    "link.addEventListener('click',function(){overlay.classList.remove('jtnav-mob-open');});"
    "});"
    "document.addEventListener('keydown',function(e){if(e.key==='Escape')overlay.classList.remove('jtnav-mob-open');});"
    "}"
)

NEW_JS = (
    "var toggle=document.getElementById('jtnav-mobile-toggle');"
    "var overlay=document.getElementById('jtnav-mobile-overlay');"
    "var closeBtn=document.getElementById('jtnav-mob-close');"
    "var scrollPos=0;"
    "function openMenu(){"
    "scrollPos=window.scrollY;"
    "document.body.style.top='-'+scrollPos+'px';"
    "document.body.style.position='fixed';"
    "document.body.style.width='100%';"
    "overlay.classList.add('jtnav-mob-open');"
    "}"
    "function closeMenu(){"
    "overlay.classList.remove('jtnav-mob-open');"
    "document.body.style.position='';"
    "document.body.style.top='';"
    "document.body.style.width='';"
    "window.scrollTo(0,scrollPos);"
    "}"
    "if(toggle&&overlay){"
    "toggle.addEventListener('click',openMenu);"
    "closeBtn.addEventListener('click',closeMenu);"
    "overlay.addEventListener('click',function(e){if(e.target===overlay)closeMenu();});"
    "overlay.querySelectorAll('.jtnav-mob-link').forEach(function(link){"
    "link.addEventListener('click',closeMenu);"
    "});"
    "document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu();});"
    "}"
)

# ─── TASK 2: Old overlay CSS → New overlay CSS ──────────────────────────────
OLD_OVERLAY_CSS = (
    "#jtnav-mobile-overlay{display:none;position:fixed;inset:0;z-index:1100;"
    "background:rgba(0,0,0,0.95);flex-direction:column;align-items:center;"
    "justify-content:center;gap:0;overflow:hidden}"
    "#jtnav-mobile-overlay.jtnav-mob-open{display:flex}"
    "#jtnav-mob-bg{position:absolute;inset:0;background-image: #000;"
    "background-size:cover;background-position:center;opacity:0.06;pointer-events:none}"
    "#jtnav-mob-close{position:absolute;top:18px;right:22px;background:none;border:none;"
    "color:rgba(255,255,255,0.5);font-size:1.6rem;cursor:pointer;line-height:1;"
    "font-family:sans-serif;z-index:1}"
    "#jtnav-mob-close:hover{color:#c9a84c}"
    ".jtnav-mob-link{font-family:'Luminari',serif;font-size:1.5rem;letter-spacing:0.14em;"
    "text-transform:uppercase;color:rgba(255,255,255,0.85);text-decoration:none;padding:14px 0;"
    "position:relative;z-index:1;transition:color 0.2s ease}"
    ".jtnav-mob-link:hover,.jtnav-mob-link.jtnav-active{color:#c9a84c}"
    ".jtnav-mob-divider{width:60px;height:1px;background:rgba(201,168,76,0.3);margin:10px 0;"
    "position:relative;z-index:1}"
)

NEW_OVERLAY_CSS = (
    "#jtnav-mobile-overlay{display:none;position:fixed;inset:0;z-index:1100;"
    "background:rgba(0,0,0,0.96);flex-direction:column;align-items:center;"
    "justify-content:center;gap:0;overflow:hidden;opacity:0;transition:opacity 0.3s ease}"
    "#jtnav-mobile-overlay.jtnav-mob-open{display:flex;opacity:1}"
    "#jtnav-mob-bg{position:absolute;inset:0;"
    "background-image:url('assets/homepage/background/Gif2.gif');"
    "background-size:cover;background-position:center;opacity:0.08;pointer-events:none}"
    "#jtnav-mob-close{position:absolute;top:18px;right:22px;background:none;border:none;"
    "color:#c9a84c;font-size:1.5rem;cursor:pointer;line-height:1;"
    "font-family:sans-serif;z-index:1}"
    "#jtnav-mob-close:hover{color:#c9a84c}"
    ".jtnav-mob-link{font-family:'Luminari',serif;font-size:0.85rem;letter-spacing:0.2em;"
    "text-transform:uppercase;color:rgba(240,230,210,0.8);text-decoration:none;padding:14px 0;"
    "position:relative;z-index:1;transition:color 0.2s ease;font-weight:normal;line-height:2.2}"
    ".jtnav-mob-link:hover,.jtnav-mob-link.jtnav-active{color:#c9a84c}"
    ".jtnav-mob-divider{width:60px;height:1px;background:rgba(201,168,76,0.3);margin:10px 0;"
    "position:relative;z-index:1}"
    ".jtnav-mob-divider::after{content:'\\2726';display:block;text-align:center;"
    "color:rgba(201,168,76,0.4);font-size:0.7rem;margin:4px 0}"
)

# ─── TASK 3: Close button ✕ → ✦ ─────────────────────────────────────────────
OLD_CLOSE_BTN = '<button id="jtnav-mob-close" aria-label="Close navigation">✕</button>'
NEW_CLOSE_BTN = '<button id="jtnav-mob-close" aria-label="Close navigation">✦</button>'

# ─── TASK 4: home-btn hide in mobile media query ─────────────────────────────
# We'll append to the existing @media (max-width:767px) block
OLD_MEDIA_END = "#jtnav{position:relative}}"
NEW_MEDIA_END = "#jtnav{position:relative}.home-btn{display:none!important}}"

# ─── TASK 5 (albums.html only): tab wrapping ─────────────────────────────────
ALBUMS_OLD_TAB_CSS = (
    "@media (max-width:768px){.page-wrap{padding:48px 16px 60px}"
    ".tab-btn{padding:14px 16px;font-size:0.65rem;letter-spacing:0.18em}"
)
ALBUMS_NEW_TAB_CSS = (
    "@media (max-width:768px){.page-wrap{padding:48px 16px 60px}"
    ".tab-btn{padding:14px 16px;font-size:0.65rem;letter-spacing:0.18em}"
    ".tab-nav,.tab-nav-wrap{flex-wrap:wrap;gap:6px}"
    ".tab-btn{padding:8px 16px;font-size:0.75rem;letter-spacing:0.15em;min-height:unset}"
)


def apply_fixes(html: str, filename: str) -> tuple[str, list[str]]:
    changes = []

    # Task 1: JS replacement
    if OLD_JS in html:
        html = html.replace(OLD_JS, NEW_JS)
        changes.append("Task 1: scroll lock JS")
    else:
        changes.append("Task 1: JS NOT FOUND (skipped)")

    # Task 2: overlay CSS
    if OLD_OVERLAY_CSS in html:
        html = html.replace(OLD_OVERLAY_CSS, NEW_OVERLAY_CSS)
        changes.append("Task 2: overlay CSS redesign")
    else:
        changes.append("Task 2: overlay CSS NOT FOUND (skipped)")

    # Task 3: close button symbol
    if OLD_CLOSE_BTN in html:
        html = html.replace(OLD_CLOSE_BTN, NEW_CLOSE_BTN)
        changes.append("Task 3: close btn ✕→✦")
    else:
        changes.append("Task 3: close btn NOT FOUND (skipped)")

    # Task 4: home-btn hide
    if OLD_MEDIA_END in html:
        html = html.replace(OLD_MEDIA_END, NEW_MEDIA_END)
        changes.append("Task 4: home-btn hide in media query")
    else:
        changes.append("Task 4: media end NOT FOUND (skipped)")

    # Task 5: albums.html only
    if filename == "albums.html":
        if ALBUMS_OLD_TAB_CSS in html:
            html = html.replace(ALBUMS_OLD_TAB_CSS, ALBUMS_NEW_TAB_CSS)
            changes.append("Task 5: albums tab wrapping CSS")
        else:
            changes.append("Task 5: albums tab CSS NOT FOUND (skipped)")

    return html, changes


def main():
    base = "/Users/jestamang/Desktop/jestamang.com"
    html_files = glob.glob(os.path.join(base, "*.html"))
    html_files.sort()

    total_files = 0
    fully_updated = 0

    for filepath in html_files:
        filename = os.path.basename(filepath)
        with open(filepath, "r", encoding="utf-8") as f:
            original = f.read()

        updated, changes = apply_fixes(original, filename)

        skipped = [c for c in changes if "NOT FOUND" in c]
        applied = [c for c in changes if "NOT FOUND" not in c]

        if updated != original:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated)
            total_files += 1
            fully_updated += 1 if len(skipped) == 0 else 0
            status = "UPDATED"
        else:
            status = "UNCHANGED"

        print(f"[{status}] {filename}")
        for c in applied:
            print(f"  + {c}")
        for c in skipped:
            print(f"  ~ {c}")

    print(f"\nDone. {total_files} files modified.")


if __name__ == "__main__":
    main()
