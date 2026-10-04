#!/usr/bin/env node
/**
 * build.js: generates assets/js/jesta-search-index.js, the data behind the sitewide search
 * overlay, from the same sources the pages render at runtime: Firestore releases, lyrics,
 * entities, merch, blogPosts and videos (public REST reads, same web key the site ships), plus the
 * short static lists of pages and games kept in this file.
 *
 * Usage:  node tools/search-index/build.js            write the file and print what changed
 *         node tools/search-index/build.js --check    compare only; exit 1 when the committed file is stale
 *         node tools/search-index/build.js --quiet    only the one-line summary
 * Options: --repo /path/to/jestamang.com (default: the repo this script lives in). Node 18+, no deps.
 *
 * drift-check requires this module (buildIndex, serialize, parseIndex, diffSummary) so the
 * pre-push hook fails when the committed index no longer matches a fresh build.
 *
 * Link rules (decided 2026-10-03):
 *   track with lyrics      -> /lyrics.html#lp-<artist slug>-<album slug>-<song position>
 *   track without lyrics   -> /albums.html#album-<bandcamp slug>, or the album's section when it has no slug
 *   album                  -> /albums.html#album-<bandcamp slug> (section anchor when it has no slug)
 *   entity / child         -> /entities.html#entity-<slug> or #child-<slug> (ENT_SLUG map read from entities.html)
 *   merch item             -> /merch.html#merch-<slug of the name>
 *   blog post              -> /blog.html#post-<Firestore document id>
 *   video                  -> /videos.html#video-<YouTube id> (videos.html opens that video's player on load)
 * Members, Dossier and Profile are not indexed (they need a signed-in account); Login is.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO_DEFAULT = fs.existsSync(path.join(__dirname, '..', '..', 'sw.js')) ? path.resolve(__dirname, '..', '..') : path.join(process.env.HOME || '', 'Desktop', 'jestamang.com');
const INDEX_REL = 'assets/js/jesta-search-index.js';
const DASH = '–'; // en dash: the "Track – Album" category separator the overlay displays

// ---------- static lists ----------
// [name, url, icon, keywords]. Order here is the order in the file, which is the tie-break the overlay uses.
const PAGES = [
  ['Home', '/index.html', '⌂', 'homepage start jestamang main collective'],
  ['Entities', '/entities.html', '✶', 'characters cartoons children cosmos'],
  ['Albums', '/albums.html', '◈', 'music releases discography records'],
  ['Lyrics', '/lyrics.html', '♁', 'words songs text poetry'],
  ['Radio', '/radio.html', '◎', 'listening chamber stream stations listen tune in live'],
  ['Merch', '/merch.html', '◉', 'shop buy store clothing cassettes artifacts'],
  ['Photos', '/photos.html', '◉', 'images gallery visual photography'],
  ['Videos', '/videos.html', '▷', 'film visual youtube watch'],
  ['Shows', '/shows.html', '◉', 'events live tour concerts appearances dates'],
  ['Blog', '/blog.html', '◇', 'posts writing press news'],
  ['Comix', '/comix.html', '◉', 'comics art illustration graphic'],
  ['Games', '/arcade.html', '✦', 'arcade play interactive'],
  ['Email', '/email.html', '✉', 'contact subscribe mailing list newsletter'],
  ['Login', '/login.html', '☽', 'sign in invitation access account'],
  ['Privacy Policy', '/privacy.html', '◉', 'privacy policy data'],
  ['Terms of Service', '/terms.html', '◉', 'terms service legal'],
  ['Refund Policy', '/refund.html', '◉', 'refund returns policy'],
  ['Accessibility', '/accessibility.html', '◉', 'accessibility ada compliance'],
];
// Game pages; the display name and tagline come from each page's <title> ("Name · Jestamang Games · Tagline").
const GAME_FILES = ['game-memory.html', 'game-oracle.html', 'games/void.html', 'games/cosmic-conductor.html', 'games/pitch-oracle.html', 'games/rhythm-architect.html', 'games/chord-conjurer.html', 'games/entity-pair.html', 'games/harmony-oracle.html'];
const ICON = { page: '◉', game: '✦', series: '◈', album: '◈', entity: '✶', child: '◉', track: '♁', merch: '◉', blog: '◇', video: '▷' };
// Video categories as videos.html groups them (mirror of window.jestaVideoCategories in assets/js/jesta-auth.js).
const VIDEO_CATEGORIES = { live: 'Live', music: 'Music Videos', circus: 'The Circus Speaks', film: 'Short Films', other: 'Other' };
const videoCategory = (v) => VIDEO_CATEGORIES[v.category] || (/circus speaks/i.test(String(v.title || '')) ? VIDEO_CATEGORIES.circus : VIDEO_CATEGORIES.other);

// ---------- helpers ----------
const read = (repo, rel) => fs.readFileSync(path.join(repo, rel), 'utf8');
const isOn = (v) => !(v === false || v === 'False' || v === 'false');
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 1e9; };
// lyrics.html toSlug, copied exactly (entities.html uses the same shape without the accent step)
const toSlug = (s) => String(s || '').toLowerCase().replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìíî]/g, 'i').replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const entSlugPlain = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// matching key: accent-folded, lowercase, letters and digits only; titles made of mirrored glyphs keep their raw text
const norm = (s) => { const t = String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ''); return t || String(s || '').trim().toLowerCase(); };
const words = (...parts) => { const seen = new Set(); const out = []; for (const p of parts) for (const w of String(p || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u)) { if (w && !seen.has(w)) { seen.add(w); out.push(w); } } return out.join(' '); };
const readMap = (repo, rel, varName) => { const m = new RegExp('var ' + varName + '=(\\{[\\s\\S]*?\\});').exec(read(repo, rel)); if (!m) throw new Error(varName + ' not found in ' + rel); return new Function('return ' + m[1])(); };
const bandcampSlug = (url) => { const m = /\/album\/([^/?#]+)/.exec(String(url || '')); return m && m[1] !== '-' ? m[1] : null; };

// ---------- Firestore (public REST) ----------
function firebaseConfig(repo) {
  const src = read(repo, 'assets/js/firebase-config.js');
  const apiKey = (/apiKey:\s*"([^"]+)"/.exec(src) || [])[1]; const projectId = (/projectId:\s*"([^"]+)"/.exec(src) || [])[1];
  if (!apiKey || !projectId) throw new Error('could not read apiKey/projectId from assets/js/firebase-config.js');
  return { apiKey, projectId };
}
function decode(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue; if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null; if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  return v;
}
async function fsList(cfg, coll) {
  const base = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/`;
  let out = [], token = null;
  do {
    const r = await fetch(`${base}${coll}?pageSize=300&key=${cfg.apiKey}` + (token ? `&pageToken=${token}` : ''));
    const j = await r.json();
    if (j.error) throw new Error(`${coll}: ${j.error.status} ${j.error.message}`);
    out = out.concat((j.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, decode(x)])) })));
    token = j.nextPageToken || null;
  } while (token);
  return out;
}
async function fetchSources(repo) {
  const cfg = firebaseConfig(repo);
  const [releases, lyrics, entities, merch, blogPosts, videos] = await Promise.all(['releases', 'lyrics', 'entities', 'merch', 'blogPosts', 'videos'].map((c) => fsList(cfg, c)));
  return { releases, lyrics, entities, merch, blogPosts, videos };
}

// ---------- the build ----------
function buildIndex(data, repo) {
  repo = repo || REPO_DEFAULT;
  const warnings = [];
  const entries = [];
  const add = (n, u, c, i, t) => entries.push({ n: String(n).trim(), u, c, i, t });
  const artistNames = readMap(repo, 'lyrics.html', 'ARTIST_NAMES');   // slug -> display name, as lyrics.html resolves panels
  const entSlugMap = readMap(repo, 'entities.html', 'ENT_SLUG');       // name -> slug, as entities.html assigns ids
  const artistSlug = (name) => { const nl = String(name || '').toLowerCase(); for (const k in artistNames) if (artistNames[k].toLowerCase() === nl) return k; return toSlug(name); };
  const entSlug = (name) => entSlugMap[name] || entSlugPlain(name);
  const albumsHtml = read(repo, 'albums.html'); const entitiesHtml = read(repo, 'entities.html'); const lyricsHtml = read(repo, 'lyrics.html');

  // pages
  for (const [n, u, i, t] of PAGES) add(n, u, 'Page', i, t);
  // games
  for (const f of GAME_FILES) {
    if (!fs.existsSync(path.join(repo, f))) { warnings.push(`game page missing: ${f}`); continue; }
    const title = (/<title>([^<]*)<\/title>/.exec(read(repo, f)) || [])[1] || f;
    const seg = title.split('·').map((s) => s.trim());
    add(seg[0], '/' + f, 'Game', ICON.game, words(seg[0], seg[2] || '', 'game play arcade'));
  }

  // releases, in page order
  const releases = (data.releases || []).filter((r) => isOn(r.visible) && r.title).sort((a, b) => num(a.order) - num(b.order) || String(a.title).localeCompare(String(b.title)));
  const sections = [];
  for (const r of releases) { const sid = String(r.sectionId || toSlug(r.section || '')).toLowerCase(); if (sid && !sections.some((s) => s.id === sid)) sections.push({ id: sid, name: r.section || sid }); }
  for (const s of sections) {
    if (!new RegExp(`id="${s.id}"`).test(albumsHtml)) warnings.push(`albums.html has no section anchor #${s.id} (series "${s.name}")`);
    add(s.name, `/albums.html#${s.id}`, 'Album Series', ICON.series, words(s.name, 'albums series collection'));
  }
  const albumUrl = (r) => { const slug = bandcampSlug(r.bandcampUrl); const sid = String(r.sectionId || toSlug(r.section || '')).toLowerCase(); return slug ? `/albums.html#album-${slug}` : `/albums.html#${sid}`; };
  for (const r of releases) add(r.title, albumUrl(r), 'Album', ICON.album, words(r.title, r.artist, r.searchTags, r.section, r.year, r.genre, 'album release'));

  // entities
  const entities = (data.entities || []).filter((e) => isOn(e.visible) && e.name).sort((a, b) => num(a.order) - num(b.order) || String(a.name).localeCompare(String(b.name)));
  for (const e of entities) {
    const child = String(e.type || '').toLowerCase() === 'child';
    const id = (child ? 'child-' : 'entity-') + entSlug(e.name);
    if (!new RegExp(`id="${id}"`).test(entitiesHtml)) warnings.push(`entities.html static markup has no anchor #${id} (${e.name})`);
    add(e.name, `/entities.html#${id}`, child ? 'One of the Children' : 'Cartoon Entity', child ? ICON.child : ICON.entity, words(e.name, child ? 'child children entity' : 'cartoon character entity', e.canonicalAlbum));
  }

  // tracks: every release track, linked to its lyrics song when one exists, else to the album drawer
  const lyrics = (data.lyrics || []).filter((d) => isOn(d.visible) && d.albumTitle).sort((a, b) => num(a.order) - num(b.order));
  const lyricsByAlbum = new Map();
  for (const d of lyrics) { const k = norm(d.albumTitle); if (lyricsByAlbum.has(k)) warnings.push(`two lyrics documents share the album title "${d.albumTitle}"`); lyricsByAlbum.set(k, d); }
  const lyricsSongUrl = (d, pos) => `/lyrics.html#lp-${artistSlug(d.artist)}-${toSlug(d.albumTitle)}-${pos}`;
  const usedLyricsSongs = new Set();
  const seenTrack = new Set();
  for (const r of releases) {
    const d = lyricsByAlbum.get(norm(r.title));
    if (d && !new RegExp(`data-aslug="${artistSlug(d.artist)}" data-alslug="${toSlug(d.albumTitle)}"`).test(lyricsHtml)) warnings.push(`lyrics.html static markup has no panel for ${artistSlug(d.artist)} / ${toSlug(d.albumTitle)} ("${d.albumTitle}")`);
    const songs = d ? (d.songs || []) : [];
    const tracks = (r.tracks || []).map((t) => (typeof t === 'string' ? { title: t } : t)).filter((t) => t && t.title);
    for (const t of tracks) {
      const key = norm(r.title) + '|' + norm(t.title);
      if (seenTrack.has(key)) { warnings.push(`duplicate track "${t.title}" on "${r.title}" skipped`); continue; }
      seenTrack.add(key);
      let pos = songs.findIndex((s) => s && norm(s.title) === norm(t.title));
      const u = pos >= 0 ? lyricsSongUrl(d, pos + 1) : albumUrl(r);
      if (pos >= 0) usedLyricsSongs.add(norm(d.albumTitle) + '|' + pos);
      add(t.title, u, `Track ${DASH} ${r.title}`, ICON.track, words(t.title, r.title, r.artist, r.searchTags, pos >= 0 ? 'song lyrics' : 'song'));
    }
  }
  // lyrics songs that no release lists (bonus versions, songs under a lyrics-only album)
  for (const d of lyrics) {
    (d.songs || []).forEach((s, i) => {
      if (!s || !s.title || usedLyricsSongs.has(norm(d.albumTitle) + '|' + i)) return;
      const key = norm(d.albumTitle) + '|' + norm(s.title);
      if (seenTrack.has(key)) return;
      seenTrack.add(key);
      add(s.title, lyricsSongUrl(d, i + 1), `Track ${DASH} ${d.albumTitle}`, ICON.track, words(s.title, d.albumTitle, d.artist, 'song lyrics'));
    });
  }

  // merch
  const merch = (data.merch || []).filter((m) => isOn(m.active) && m.name).sort((a, b) => num(a.order) - num(b.order) || String(a.name).localeCompare(String(b.name)));
  for (const m of merch) add(m.name, `/merch.html#merch-${toSlug(m.name)}`, 'Merch', ICON.merch, words(m.name, m.subtitle, 'merch buy shop artifact'));

  // blog
  const posts = (data.blogPosts || []).filter((p) => isOn(p.published) && p.title).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(a.title).localeCompare(String(b.title)));
  for (const p of posts) add(p.title, `/blog.html#post-${p.id}`, 'Blog Post', ICON.blog, words(p.title, p.subtitle, p.category, 'blog post writing'));

  // videos: published, in the page's order (order ascending, missing last), linked to the player on videos.html
  const videos = (data.videos || []).filter((v) => isOn(v.published) && v.title && v.youtubeId).sort((a, b) => (a.order != null ? num(a.order) : 9e15) - (b.order != null ? num(b.order) : 9e15) || String(a.title).localeCompare(String(b.title)));
  for (const v of videos) add(v.title, `/videos.html#video-${encodeURIComponent(String(v.youtubeId))}`, 'Video', ICON.video, words(v.title, videoCategory(v), v.description, 'video youtube watch film'));

  return { entries, warnings };
}

function serialize(entries) {
  return '/* GENERATED FILE. Built by tools/search-index/build.js from Firestore (releases, lyrics, entities, merch, blogPosts, videos)\n' +
    '   plus the page and game lists in that script. Do not edit by hand: run  node tools/search-index/build.js  and commit.\n' +
    `   ${entries.length} entries. Shape: n name, u link, c category, i icon, t extra keywords. */\n` +
    'var IDX=[\n' + entries.map((e) => JSON.stringify(e)).join(',\n') + '\n];\n';
}
function parseIndex(src) { try { return new Function(src + ';return IDX;')(); } catch (e) { return []; } }
const keyOf = (e) => `${e.c}|${e.n}`;
function diffSummary(oldEntries, newEntries) {
  const o = new Map(oldEntries.map((e) => [keyOf(e), e])), n = new Map(newEntries.map((e) => [keyOf(e), e]));
  const added = [...n.keys()].filter((k) => !o.has(k)), removed = [...o.keys()].filter((k) => !n.has(k));
  const retargeted = [...n.keys()].filter((k) => o.has(k) && o.get(k).u !== n.get(k).u);
  const count = (list) => { const c = {}; for (const e of list) { const cat = e.c.split(` ${DASH} `)[0]; c[cat] = (c[cat] || 0) + 1; } return c; };
  return { added, removed, retargeted, oldCounts: count(oldEntries), newCounts: count(newEntries) };
}

// ---------- CLI ----------
async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const CHECK = args.includes('--check'), QUIET = args.includes('--quiet');
  const repo = path.resolve(opt('--repo') || process.env.JESTAMANG_REPO || REPO_DEFAULT);
  if (!fs.existsSync(path.join(repo, 'sw.js'))) { console.error('repo not found at ' + repo + ' (use --repo)'); process.exit(2); }
  const t0 = Date.now();
  const data = await fetchSources(repo);
  const { entries, warnings } = buildIndex(data, repo);
  const fresh = serialize(entries);
  const target = path.join(repo, INDEX_REL);
  const committed = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const same = fresh === committed;
  const d = diffSummary(parseIndex(committed), entries);
  for (const w of warnings) console.log('WARN   ' + w);
  if (!QUIET) {
    const cats = [...new Set([...Object.keys(d.oldCounts), ...Object.keys(d.newCounts)])];
    for (const c of cats) console.log(`       ${c.padEnd(20)} ${String(d.oldCounts[c] || 0).padStart(4)} -> ${String(d.newCounts[c] || 0).padStart(4)}`);
    const show = (label, list) => { if (list.length) console.log(`       ${label} (${list.length}): ` + list.slice(0, 40).join('; ') + (list.length > 40 ? '; ...' : '')); };
    show('added', d.added); show('removed', d.removed); show('retargeted', d.retargeted);
  }
  if (CHECK) {
    console.log(same ? `OK     ${INDEX_REL} matches a fresh build (${entries.length} entries) in ${((Date.now() - t0) / 1000).toFixed(1)}s` : `STALE  ${INDEX_REL}: +${d.added.length} new, -${d.removed.length} gone, ${d.retargeted.length} retargeted. Run: node tools/search-index/build.js`);
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(target, fresh);
  console.log(`${same ? 'OK    ' : 'WROTE '} ${INDEX_REL}: ${entries.length} entries${same ? ' (unchanged)' : ` (+${d.added.length} new, -${d.removed.length} gone, ${d.retargeted.length} retargeted)`} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

module.exports = { buildIndex, serialize, parseIndex, diffSummary, fetchSources, INDEX_REL };
if (require.main === module) main().catch((e) => { console.error('search index build failed:', e.message); process.exit(2); });
