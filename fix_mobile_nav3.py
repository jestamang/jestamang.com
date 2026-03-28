#!/usr/bin/env python3
"""Fix dossier.html — overlay CSS and close button."""

import os
BASE = "/Users/jestamang/Desktop/jestamang.com"

# dossier.html uses slightly different CSS (background:#000 vs background-image:#000)
DOSSIER_OLD_CSS = (
    "#jtnav-mobile-overlay{display:none;position:fixed;inset:0;z-index:1100;"
    "background:rgba(0,0,0,0.95);flex-direction:column;align-items:center;"
    "justify-content:center;gap:0;overflow:hidden}"
    "#jtnav-mobile-overlay.jtnav-mob-open{display:flex}"
    "#jtnav-mob-bg{position:absolute;inset:0;background:#000;"
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

DOSSIER_NEW_CSS = (
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

# HTML entity form of ✕
DOSSIER_OLD_CLOSE = '<button id="jtnav-mob-close" aria-label="Close navigation">&#x2715;</button>'
DOSSIER_NEW_CLOSE = '<button id="jtnav-mob-close" aria-label="Close navigation">&#x2726;</button>'

filepath = os.path.join(BASE, "dossier.html")
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

changed = False
for old, new, label in [
    (DOSSIER_OLD_CSS, DOSSIER_NEW_CSS, "Task 2: overlay CSS redesign"),
    (DOSSIER_OLD_CLOSE, DOSSIER_NEW_CLOSE, "Task 3: close btn ✕→✦"),
]:
    if old in content:
        content = content.replace(old, new)
        print(f"  + {label}")
        changed = True
    else:
        print(f"  ~ {label}: NOT FOUND")

if changed:
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("  => SAVED")
else:
    print("  => No changes.")
