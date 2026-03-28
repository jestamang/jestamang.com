#!/usr/bin/env python3
"""Full mobile audit and redesign for jestamang.com — all CSS inside @media (max-width:768px) only."""

import os

BASE = "/Users/jestamang/Desktop/jestamang.com"

GLOBAL_BLOCK = """@media (max-width: 768px) {
  /* Prevent iOS input zoom */
  input, textarea, select { font-size: 16px !important; }
  /* Overflow lock */
  body { overflow-x: hidden; }
  /* background-attachment fix for iOS */
  body, .bg-wrap { background-attachment: scroll !important; }
  /* All containers box-sizing */
  * { box-sizing: border-box; }
  /* Video bg: use absolute not fixed on mobile */
  #jt-bg { position: absolute !important; }
  /* Minimum touch targets */
  button, a, [role="button"] { min-height: 44px; }
  /* Hide home-btn on mobile */
  .home-btn { display: none !important; }
}"""

GLOBAL_SENTINEL = "/* jt-mobile-global-base */"

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def inject_before_style_close(html, css_block, sentinel=None):
    """Insert css_block before the FIRST </style> tag. Skip if sentinel already present."""
    if sentinel and sentinel in html:
        print(f"  SKIP global (already present)")
        return html
    # Find first </style>
    idx = html.find("</style>")
    if idx == -1:
        print(f"  WARNING: no </style> found")
        return html
    insertion = css_block + "\n"
    if sentinel:
        insertion = sentinel + "\n" + insertion
    return html[:idx] + insertion + html[idx:]

def inject_before_nth_style_close(html, css_block, n=1):
    """Insert css_block before the Nth </style> tag."""
    pos = 0
    count = 0
    while True:
        idx = html.find("</style>", pos)
        if idx == -1:
            print(f"  WARNING: </style> #{n} not found")
            return html
        count += 1
        if count == n:
            return html[:idx] + css_block + "\n" + html[idx:]
        pos = idx + 1

# ── albums.html ──────────────────────────────────────────────────────────────
def fix_albums():
    path = os.path.join(BASE, "albums.html")
    html = read(path)

    # Global base (first </style>)
    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    # Page-specific: albums already has some 768px rules but needs drawer/tracklist/platform fixes
    ALBUMS_MOBILE = """@media (max-width: 768px) {
  /* Album drawer full-width on mobile */
  .album-drawer, .album-drawer.open { padding: 20px 16px 24px; }
  /* Tracklist readable on small screens */
  .drawer-tracklist li { font-size: 0.85rem; padding: 10px 12px; }
  /* Platform links wrap */
  .drawer-platform-row { flex-wrap: wrap; gap: 8px; justify-content: center; }
  /* Expanded cover art */
  .album-art { max-width: 200px; margin: 0 auto; }
  /* Content padding */
  .page-wrap { padding: 16px 16px 60px; }
}"""
    # Check if already added
    if "/* jt-mobile-albums */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-albums */\n" + ALBUMS_MOBILE)

    write(path, html)
    print("  albums.html — drawer, tracklist, platform-links, cover art, padding")

# ── entities.html ─────────────────────────────────────────────────────────────
def fix_entities():
    path = os.path.join(BASE, "entities.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    ENTITIES_MOBILE = """@media (max-width: 768px) {
  .dossier-body { padding: 16px; }
  .dossier-name { font-size: clamp(1.4rem, 5vw, 2rem); padding: 20px 16px 0; }
  .dossier-top { grid-template-columns: 1fr; }
  .dossier-chart-img { max-width: 280px; margin: 0 auto; display: block; }
}"""
    if "/* jt-mobile-entities */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-entities */\n" + ENTITIES_MOBILE)

    write(path, html)
    print("  entities.html — dossier-body, dossier-name, dossier-top grid, chart-img")

# ── merch.html ────────────────────────────────────────────────────────────────
def fix_merch():
    path = os.path.join(BASE, "merch.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    MERCH_MOBILE = """@media (max-width: 768px) {
  /* Product grid single column */
  .product-grid, .merch-grid { grid-template-columns: 1fr !important; }
  /* Cards full width */
  .product-card, .merch-card { width: 100% !important; max-width: 100% !important; margin: 0 0 20px !important; }
  /* Product images */
  .product-image, .merch-img, .product-card img { max-height: 280px; object-fit: contain; width: 100%; }
  /* Acquire / buy buttons */
  .acquire-btn, .buy-btn, .merch-btn { width: 100% !important; padding: 16px !important; font-size: 0.8rem !important; }
  /* Modal */
  .modal-panel, .inquiry-panel, #inquiry-modal .modal-content { width: 95vw !important; padding: 28px 20px !important; }
  /* Modal inputs already covered by global, but enforce width */
  .modal-panel input, .modal-panel textarea, .modal-panel select { width: 100% !important; }
}"""
    if "/* jt-mobile-merch */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-merch */\n" + MERCH_MOBILE)

    write(path, html)
    print("  merch.html — product grid 1col, cards full-width, images, buttons, modal")

# ── blog.html ─────────────────────────────────────────────────────────────────
def fix_blog():
    path = os.path.join(BASE, "blog.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    BLOG_MOBILE = """@media (max-width: 768px) {
  .post { width: 100%; padding: 20px 16px; }
  .post-body { font-size: 0.9rem; line-height: 1.7; }
  .page-wrap { padding: 80px 16px 60px; }
  /* Comment form if present */
  .comment-textarea, textarea { font-size: 16px !important; width: 100%; }
  .comment-submit, .submit-btn { width: 100%; padding: 14px; }
}"""
    if "/* jt-mobile-blog */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-blog */\n" + BLOG_MOBILE)

    write(path, html)
    print("  blog.html — post cards, body text, comment form, submit button")

# ── shows.html ────────────────────────────────────────────────────────────────
def fix_shows():
    path = os.path.join(BASE, "shows.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    SHOWS_MOBILE = """@media (max-width: 768px) {
  .show-card { width: 100%; padding: 16px; }
  .show-grid { grid-template-columns: 1fr; }
  .show-date, .show-city { font-size: 0.85rem; }
  .show-venue { font-size: clamp(1.1rem, 4vw, 1.4rem); }
  .page-wrap { padding: 80px 16px 60px; }
  .past-entry { grid-template-columns: 1fr; gap: 4px; }
}"""
    if "/* jt-mobile-shows */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-shows */\n" + SHOWS_MOBILE)

    write(path, html)
    print("  shows.html — show cards, grid 1col, date/venue text, past entries")

# ── email.html ────────────────────────────────────────────────────────────────
def fix_email():
    path = os.path.join(BASE, "email.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    EMAIL_MOBILE = """@media (max-width: 768px) {
  input[type="text"], input[type="email"], textarea { font-size: 16px !important; width: 100%; }
  .submit-btn { width: 100%; padding: 16px; min-height: 52px; align-self: stretch; }
  .form-wrap { padding: 20px 16px; }
  .page { padding: 80px 16px 40px; }
}"""
    if "/* jt-mobile-email */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-email */\n" + EMAIL_MOBILE)

    write(path, html)
    print("  email.html — inputs 16px, submit full-width, form padding")

# ── login.html ────────────────────────────────────────────────────────────────
def fix_login():
    path = os.path.join(BASE, "login.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    LOGIN_MOBILE = """@media (max-width: 768px) {
  .login-panel { padding: 32px 20px !important; width: 95vw !important; max-width: 95vw !important; }
  .auth-input { font-size: 16px !important; }
  .sso-btn { padding: 16px !important; min-height: 52px !important; width: 100% !important; }
  #submit-btn { padding: 16px !important; min-height: 52px !important; width: 100% !important; }
}"""
    if "/* jt-mobile-login */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-login */\n" + LOGIN_MOBILE)

    write(path, html)
    print("  login.html — login panel, inputs 16px, sso/submit buttons")

# ── profile.html ──────────────────────────────────────────────────────────────
def fix_profile():
    path = os.path.join(BASE, "profile.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    PROFILE_MOBILE = """@media (max-width: 768px) {
  input, select, textarea { font-size: 16px !important; width: 100% !important; }
  .dark-card, .profile-card, .settings-panel { padding: 20px 16px !important; }
  #page-content { padding: 40px 16px 60px !important; }
  /* Natal chart SVG */
  .natal-chart, #natal-chart-svg, svg.natal { width: 100% !important; max-width: 340px !important; margin: 0 auto !important; display: block !important; }
  /* Save / calculate buttons */
  .save-btn, .calc-btn, button[type="submit"] { width: 100% !important; min-height: 52px !important; }
}"""
    if "/* jt-mobile-profile */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-profile */\n" + PROFILE_MOBILE)

    write(path, html)
    print("  profile.html — inputs 16px, cards/panels padding, natal chart SVG, save/calc buttons")

# ── videos.html ───────────────────────────────────────────────────────────────
def fix_videos():
    path = os.path.join(BASE, "videos.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    VIDEOS_MOBILE = """@media (max-width: 768px) {
  .video-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
  .video-card { width: 100%; }
  .video-thumb img, .video-thumb { width: 100%; }
  .video-title, .video-card h3, .video-card p { font-size: 0.8rem; }
  .content { padding: 16px 12px 60px; }
}"""
    if "/* jt-mobile-videos */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-videos */\n" + VIDEOS_MOBILE)

    write(path, html)
    print("  videos.html — video grid 2col, thumbnails full-width, title text size")

# ── comix.html ────────────────────────────────────────────────────────────────
def fix_comix():
    path = os.path.join(BASE, "comix.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    COMIX_MOBILE = """@media (max-width: 768px) {
  .comic-img, .comic-panel img { width: 100% !important; max-width: 100% !important; height: auto !important; }
  .comic-nav-btn, .nav-arrow, .prev-btn, .next-btn { min-width: 52px !important; min-height: 52px !important; font-size: 1.8rem !important; }
  .page-num, .comic-page-indicator { font-size: 0.75rem; }
  .comic-container, .comic-wrap { padding: 8px !important; }
  .content, .page-wrap { padding: 16px 8px 60px; }
}"""
    if "/* jt-mobile-comix */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-comix */\n" + COMIX_MOBILE)

    write(path, html)
    print("  comix.html — comic image full-width, nav arrows touch-friendly, page number, container padding")

# ── photos.html ───────────────────────────────────────────────────────────────
def fix_photos():
    path = os.path.join(BASE, "photos.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    PHOTOS_MOBILE = """@media (max-width: 768px) {
  .photo-grid, .photos-grid { column-count: 2 !important; column-gap: 8px !important; }
  .load-more-btn, #load-more { width: 100% !important; padding: 14px !important; }
}"""
    if "/* jt-mobile-photos */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-photos */\n" + PHOTOS_MOBILE)

    write(path, html)
    print("  photos.html — photo grid 2col at 768px, load-more full-width")

# ── games.html ────────────────────────────────────────────────────────────────
def fix_games():
    path = os.path.join(BASE, "games.html")
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    GAMES_MOBILE = """@media (max-width: 768px) {
  .game-card, .game-item { width: 100% !important; margin-bottom: 20px !important; }
  .game-instructions, .game-info { font-size: 0.85rem !important; padding: 12px 16px !important; }
  canvas { max-width: 100% !important; height: auto !important; }
  .games-grid { grid-template-columns: 1fr !important; }
}"""
    if "/* jt-mobile-games */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-games */\n" + GAMES_MOBILE)

    write(path, html)
    print("  games.html — game cards full-width, instructions text, canvas max-width")

# ── instagram.html / youtube.html / spotify.html / apple-music.html ───────────
def fix_social(filename):
    path = os.path.join(BASE, filename)
    html = read(path)

    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)

    SOCIAL_MOBILE = """@media (max-width: 768px) {
  iframe, .embed-wrap iframe { width: 100% !important; min-height: 60vh !important; }
  .portal, .embed-container { padding: 8px !important; }
  .portal-title { letter-spacing: 0.2em; font-size: clamp(1.8rem, 7vw, 3rem); }
}"""
    sentinel = f"/* jt-mobile-{filename.replace('.html','').replace('-','_')} */"
    if sentinel not in html:
        html = inject_before_style_close(html, sentinel + "\n" + SOCIAL_MOBILE)

    write(path, html)
    print(f"  {filename} — iframe full-width 60vh, portal padding, title size")

# ── dossier.html (extra page found) ──────────────────────────────────────────
def fix_dossier():
    path = os.path.join(BASE, "dossier.html")
    if not os.path.exists(path):
        return
    html = read(path)
    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)
    DOSSIER_MOBILE = """@media (max-width: 768px) {
  .dossier-body { padding: 16px; }
  .dossier-name { font-size: clamp(1.4rem, 5vw, 2rem); padding: 20px 16px 0; }
  .dossier-top { grid-template-columns: 1fr !important; }
  .dossier-chart-img { max-width: 280px; margin: 0 auto; display: block; }
}"""
    if "/* jt-mobile-dossier */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-dossier */\n" + DOSSIER_MOBILE)
    write(path, html)
    print("  dossier.html — dossier-body, name, top grid, chart img")

# ── arcade.html ────────────────────────────────────────────────────────────────
def fix_arcade():
    path = os.path.join(BASE, "arcade.html")
    if not os.path.exists(path):
        return
    html = read(path)
    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)
    ARCADE_MOBILE = """@media (max-width: 768px) {
  .game-card, .arcade-card { width: 100% !important; margin-bottom: 20px !important; }
  canvas { max-width: 100% !important; height: auto !important; }
  .arcade-grid { grid-template-columns: 1fr !important; }
}"""
    if "/* jt-mobile-arcade */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-arcade */\n" + ARCADE_MOBILE)
    write(path, html)
    print("  arcade.html — cards full-width, canvas max-width, grid 1col")

# ── members.html ───────────────────────────────────────────────────────────────
def fix_members():
    path = os.path.join(BASE, "members.html")
    if not os.path.exists(path):
        return
    html = read(path)
    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)
    MEMBERS_MOBILE = """@media (max-width: 768px) {
  .member-grid, .members-grid { grid-template-columns: 1fr !important; }
  .member-card { width: 100% !important; padding: 20px 16px !important; }
}"""
    if "/* jt-mobile-members */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-members */\n" + MEMBERS_MOBILE)
    write(path, html)
    print("  members.html — member grid 1col, cards full-width")

# ── lyrics.html ────────────────────────────────────────────────────────────────
def fix_lyrics():
    path = os.path.join(BASE, "lyrics.html")
    if not os.path.exists(path):
        return
    html = read(path)
    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)
    LYRICS_MOBILE = """@media (max-width: 768px) {
  .lyrics-body, .lyric-text { font-size: 0.9rem !important; line-height: 1.8 !important; padding: 16px !important; }
  .page-wrap { padding: 80px 16px 60px; }
}"""
    if "/* jt-mobile-lyrics */" not in html:
        html = inject_before_style_close(html, "/* jt-mobile-lyrics */\n" + LYRICS_MOBILE)
    write(path, html)
    print("  lyrics.html — lyrics text size, line-height, padding")

# ── game-memory.html / game-oracle.html ────────────────────────────────────────
def fix_game_page(filename):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        return
    html = read(path)
    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)
    GAME_PAGE_MOBILE = """@media (max-width: 768px) {
  canvas { max-width: 100% !important; height: auto !important; touch-action: manipulation; }
  .game-ui, .game-panel { padding: 12px 16px !important; font-size: 0.85rem !important; }
}"""
    sentinel = f"/* jt-mobile-{filename.replace('.html','').replace('-','_')} */"
    if sentinel not in html:
        html = inject_before_style_close(html, sentinel + "\n" + GAME_PAGE_MOBILE)
    write(path, html)
    print(f"  {filename} — canvas full-width, touch-action, game-ui padding")

# ── index.html ─────────────────────────────────────────────────────────────────
def fix_index():
    path = os.path.join(BASE, "index.html")
    if not os.path.exists(path):
        return
    html = read(path)
    html = inject_before_style_close(html, GLOBAL_BLOCK, GLOBAL_SENTINEL)
    write(path, html)
    print("  index.html — global base block added")

# ── RUN ALL ────────────────────────────────────────────────────────────────────
print("=== Jestamang Mobile Audit ===\n")

fix_albums()
fix_entities()
fix_merch()
fix_blog()
fix_shows()
fix_email()
fix_login()
fix_profile()
fix_videos()
fix_comix()
fix_photos()
fix_games()
fix_social("instagram.html")
fix_social("youtube.html")
fix_social("spotify.html")
fix_social("apple-music.html")
fix_dossier()
fix_arcade()
fix_members()
fix_lyrics()
fix_game_page("game-memory.html")
fix_game_page("game-oracle.html")
fix_index()

print("\n=== All pages processed ===")
