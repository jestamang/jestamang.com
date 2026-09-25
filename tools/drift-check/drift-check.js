#!/usr/bin/env node
/**
 * drift-check.js — read-only. Compares what Firestore / R2 will render at runtime
 * against the static fallbacks committed in the jestamang.com repo, and prints one
 * line per mismatch. Exit 1 when any ERROR is found (--strict: WARN also fails).
 * Nothing is written anywhere.
 *
 * Usage:  node drift-check.js [--repo /path/to/jestamang.com] [--strict] [--quiet]
 * Default repo: the repo this script lives in (tools/drift-check), else ~/Desktop/jestamang.com; override with --repo or env JESTAMANG_REPO. Node 18+, no deps.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const STRICT = args.includes('--strict');
const QUIET = args.includes('--quiet');
const REPO_DEFAULT = fs.existsSync(path.join(__dirname, '..', '..', 'sw.js')) ? path.resolve(__dirname, '..', '..') : path.join(process.env.HOME, 'Desktop', 'jestamang.com');
const REPO = path.resolve(opt('--repo') || process.env.JESTAMANG_REPO || REPO_DEFAULT);
const MANIFEST_URL = 'https://pub-75f71ff978d340cfa0ee8e4b628e3ea4.r2.dev/manifest.json';

const findings = [];
const report = (level, area, msg) => findings.push({ level, area, msg });
const ERR = (a, m) => report('ERROR', a, m);
const WARN = (a, m) => report('WARN', a, m);
const INFO = (a, m) => { if (!QUIET) report('INFO', a, m); };
const hasErr = (area) => findings.some((f) => f.area === area && f.level === 'ERROR');

// ---------- helpers ----------
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(REPO, rel));
const git = (cmd) => execSync(cmd, { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
const unescape = (s) => String(s || '')
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const norm = (s) => unescape(s).replace(/\u2019/g, "'");
const jsUnescape = (s) => String(s || '')
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\(['"\\])/g, '$1');
const isTemplate = (s) => /'\s*\+|\+\s*'|\$\{/.test(String(s || ''));
const first = (re, s) => { const m = re.exec(String(s || '')); return m ? m[1] : null; };
const firstFull = (re, s) => { const m = re.exec(String(s || '')); return m ? m[0] : null; };
const all = (re, s) => { const out = []; let m; const str = String(s || ''); while ((m = re.exec(str))) out.push(m[1]); return out; };
const allFull = (re, s) => { const out = []; let m; const str = String(s || ''); while ((m = re.exec(str))) out.push(m[0]); return out; };
const jsonLd = (html, type) => {
  for (const b of all(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g, html)) {
    try { const j = JSON.parse(b); if (j['@type'] === type) return j; } catch (e) { ERR('json-ld', 'unparseable JSON-LD block: ' + e.message); }
  }
  return null;
};
const fmtShortDate = (d) => { const dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ", '" + String(dt.getFullYear()).slice(2); };
const fmtTime = (t) => { if (!t) return ''; const [hh, mm = '00'] = t.split(':'); let h = parseInt(hh, 10); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `Doors ${h}:${mm} ${ap}`; };
const setDiff = (a, b) => [...a].filter((x) => !b.has(x));
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Firestore (public REST, same web key the site ships) ----------
function firebaseConfig() {
  const src = read('assets/js/firebase-config.js');
  const apiKey = first(/apiKey:\s*"([^"]+)"/, src); const projectId = first(/projectId:\s*"([^"]+)"/, src);
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
const docFields = (d) => Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, decode(x)]));
async function fsList(cfg, coll) {
  const base = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/`;
  let out = [], token = null;
  do {
    const r = await fetch(`${base}${coll}?pageSize=300&key=${cfg.apiKey}` + (token ? `&pageToken=${token}` : ''));
    const j = await r.json();
    if (j.error) throw new Error(`${coll}: ${j.error.status} ${j.error.message}`);
    out = out.concat((j.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...docFields(d) })));
    token = j.nextPageToken || null;
  } while (token);
  return out;
}
async function fsDoc(cfg, p) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/${p}?key=${cfg.apiKey}`);
  const j = await r.json(); return j.error ? null : docFields(j);
}

// ---------- checks ----------
function checkHomepageShowCard(index, extras) {
  const area = 'index.html show card';
  if (!extras) { WARN(area, 'no shows extras in siteConfig/indexSections; nothing to compare'); return; }
  const pick = (cls) => norm(first(new RegExp(`class="${cls}"[^>]*>([^<]*)<`), index));
  const pairs = [['date', pick('hp-show-date-ritual')], ['venue', pick('hp-show-venue-name')], ['lineup', pick('hp-show-lineup')], ['location', pick('hp-show-location')],
    ['btnText', norm(first(/class="hp-show-btn-c">([^<]*)</, index))], ['btnUrl', first(/href="([^"]+)"[^>]*class="hp-show-btn-c"/, index)]];
  for (const [k, sv] of pairs) { const fv = norm(extras[k]); if (fv !== sv) ERR(area, `${k}: static ${JSON.stringify(sv)} vs Firestore ${JSON.stringify(fv)}`); }
  if (!hasErr(area)) INFO(area, 'matches Firestore indexSections.shows.extras (6/6)');
}
function splitShows(shows) {
  const t = today();
  const upcoming = shows.filter((s) => s.date && s.date >= t && s.active !== false).sort((a, b) => a.date.localeCompare(b.date));
  const past = shows.filter((s) => s.date && s.date < t).sort((a, b) => b.date.localeCompare(a.date));
  return { next: upcoming[0] || null, upcoming, past };
}
function checkEventLd(html, file, next) {
  const area = `${file} Event JSON-LD`;
  const ev = jsonLd(html, 'Event'); if (!ev) { WARN(area, 'no Event JSON-LD found'); return; }
  if ((ev.startDate || '').slice(0, 10) < today()) ERR(area, `startDate ${ev.startDate} is in the past`);
  if (ev.image) { const rel = decodeURIComponent(new URL(ev.image).pathname.slice(1)); if (!exists(rel)) ERR(area, 'image file does not exist in repo: ' + ev.image); }
  if (!next) { WARN(area, 'Firestore has no upcoming show; the static Event should be removed'); return; }
  if ((ev.startDate || '').slice(0, 10) !== next.date) ERR(area, `startDate ${ev.startDate} vs next show ${next.date} (${next.venue})`);
  if (norm(ev.location && ev.location.name) !== norm(next.venue)) ERR(area, `location.name ${JSON.stringify(ev.location && ev.location.name)} vs venue ${JSON.stringify(next.venue)}`);
  const loc = norm((next.city || '').split(',')[0]);
  if (norm(ev.location && ev.location.address && ev.location.address.addressLocality) !== loc) ERR(area, `addressLocality vs city ${JSON.stringify(next.city)}`);
  if (!hasErr(area)) INFO(area, `matches next show ${next.date} ${next.venue}; image exists`);
}
function checkShowsPage({ next, past }) {
  const html = read('shows.html');
  const area = 'shows.html static card';
  const fb = first(/<div id="shows-fallback">([\s\S]*?)<\/div>\s*<section/, html) || '';
  if (!next) { if (/<article/.test(fb)) ERR(area, 'static upcoming card present but Firestore has no upcoming show'); else INFO(area, 'no upcoming show in Firestore and no static card'); }
  else if (!/<article/.test(fb)) ERR(area, `Firestore has upcoming show ${next.date} ${next.venue} but #shows-fallback is empty`);
  else {
    const pick = (cls) => norm(first(new RegExp(`class="${cls}"[^>]*>([^<]*)<`), fb));
    const details = all(/class="show-detail"[^>]*>([^<]*)</g, fb).map(norm);
    const exp = { 'show-date': fmtShortDate(next.date), 'show-venue': norm(next.venue), 'show-city': norm(next.city) };
    for (const [cls, ev] of Object.entries(exp)) { const sv = pick(cls); if (sv !== ev) ERR(area, `${cls}: static ${JSON.stringify(sv)} vs Firestore ${JSON.stringify(ev)}`); }
    if (next.tagline && !details.includes(norm(next.tagline))) ERR(area, `tagline: Firestore ${JSON.stringify(next.tagline)} not in static ${JSON.stringify(details)}`);
    const td = next.time ? fmtTime(next.time) + (next.price ? ' \u00b7 ' + next.price : '') : (next.price || '');
    if (td && !details.includes(norm(td))) ERR(area, `time/price line: expected ${JSON.stringify(td)} in ${JSON.stringify(details)}`);
    const hasTicket = /show-ticket-btn/.test(fb); const wantTicket = !!(next.ticketUrl && next.ticketUrl.trim() && next.ticketUrl !== '#');
    if (hasTicket !== wantTicket) ERR(area, `ticket button ${hasTicket ? 'present' : 'absent'} but Firestore ticketUrl ${wantTicket ? 'set' : 'empty'}`);
    if (!hasErr(area)) INFO(area, `matches next show ${next.date} ${next.venue}`);
  }
  const parea = 'shows.html static past list';
  const sec = firstFull(/<section id="shows-past-fallback"[\s\S]*?<\/section>/, html) || '';
  const staticPast = all(/<li class="past-entry">([\s\S]*?)<\/li>/g, sec).map((li) => [norm(first(/past-date">([^<]*)</, li)), norm(first(/past-venue">([^<]*)</, li)), norm(first(/past-city">([^<]*)</, li))].join(' | '));
  const fsPast = past.map((s) => [fmtShortDate(s.date), norm(s.venue), norm(s.city)].join(' | '));
  const missing = fsPast.filter((x) => !staticPast.includes(x)); const extra = staticPast.filter((x) => !fsPast.includes(x));
  missing.forEach((x) => ERR(parea, 'Firestore past show missing from static list: ' + x));
  extra.forEach((x) => ERR(parea, 'static entry not in Firestore past shows: ' + x));
  if (!missing.length && !extra.length) {
    if (staticPast.join('\n') !== fsPast.join('\n')) WARN(parea, 'same entries but different order (runtime sorts newest first)');
    else INFO(parea, `${staticPast.length} entries match Firestore, same order`);
  }
  checkEventLd(html, 'shows.html', next);
}
function checkAlbums(releases, entities) {
  const html = read('albums.html'); const area = 'albums.html';
  const cards = allFull(/<div class="album-card"[^>]*>/g, html).filter((t) => /data-album=/.test(t))
    .map((tag) => [norm(first(/data-album="([^"]*)"/, tag)), norm(first(/data-artist="([^"]*)"/, tag))].join(' — '));
  const fsSet = new Set(releases.filter((r) => r.visible !== false).map((r) => [norm(r.title), norm(r.artist)].join(' — ')));
  const stSet = new Set(cards);
  setDiff(fsSet, stSet).forEach((x) => ERR(area, 'release in Firestore but not in static cards: ' + x));
  setDiff(stSet, fsSet).forEach((x) => ERR(area, 'static card not in Firestore releases: ' + x));
  if (!hasErr(area)) INFO(area, `${cards.length} static cards match ${fsSet.size} Firestore releases (title + artist)`);
  const title = norm(first(/<title>([^<]+)</, html));
  const want = `${fsSet.size} Releases Across ${entities.filter((e) => e.visible !== false).length} Entities`;
  if (!title.includes(want)) ERR(area, `title ${JSON.stringify(title)} should contain ${JSON.stringify(want)}`);
  const colorKeys = new Set([...all(/'((?:[^'\\]|\\.)+)':'#[0-9a-fA-F]{6}'/g, html), ...all(/"((?:[^"\\]|\\.)+)":'#[0-9a-fA-F]{6}'/g, html)].map((k) => norm(jsUnescape(k))));
  if (colorKeys.size) releases.forEach((r) => { if (!colorKeys.has(norm(r.title))) WARN(area, 'no color-map entry for release title: ' + r.title); });
}
function checkEntities(entities) {
  const html = read('entities.html'); const area = 'entities.html';
  const names = all(/class="(?:entity-name|dossier-name)"[^>]*>([^<]+)</g, html).filter((x) => !isTemplate(x)).map(norm);
  const fsNames = entities.filter((e) => e.visible !== false).map((e) => norm(e.name));
  const cnt = (arr) => arr.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
  const a = cnt(names), b = cnt(fsNames);
  for (const k of new Set([...names, ...fsNames])) if ((a[k] || 0) !== (b[k] || 0)) ERR(area, `entity ${JSON.stringify(k)}: static x${a[k] || 0} vs Firestore x${b[k] || 0}`);
  const title = norm(first(/<title>([^<]+)</, html));
  if (!title.includes(`${fsNames.length} Entities`)) ERR(area, `title ${JSON.stringify(title)} should contain "${fsNames.length} Entities"`);
  if (!hasErr(area)) INFO(area, `${names.length} static entities match Firestore; title count ok`);
  const grid = all(/class="hp-entity-name"[^>]*>([^<]+)</g, read('index.html')).filter((x) => !isTemplate(x)).map(norm);
  grid.forEach((n) => { if (!fsNames.includes(n)) ERR('index.html entity grid', 'name not in Firestore entities: ' + n); });
  if (!hasErr('index.html entity grid')) INFO('index.html entity grid', `${grid.length} names all exist in Firestore`);
}
function checkLyrics(lyrics) {
  const html = read('lyrics.html'); const area = 'lyrics.html';
  const labels = new Set(all(/class="al-label">([^<]+)</g, html).filter((x) => !isTemplate(x)).map(norm));
  const fsTitles = new Set(lyrics.filter((l) => l.visible !== false).map((l) => norm(l.albumTitle)));
  setDiff(fsTitles, labels).forEach((x) => ERR(area, 'lyrics doc albumTitle not in static album list (runtime will show this spelling): ' + x));
  setDiff(labels, fsTitles).forEach((x) => ERR(area, 'static album label with no matching lyrics doc: ' + x));
  const songs = lyrics.reduce((n, l) => n + ((l.songs || []).length), 0);
  const m = /(\d+)\+? Songs/.exec(norm(first(/<title>([^<]+)</, html)));
  if (!m) WARN(area, 'title has no song count'); else if (Number(m[1]) !== songs) ERR(area, `title says ${m[1]} songs, Firestore has ${songs}`);
  if (!hasErr(area)) INFO(area, `${labels.size} static album labels match ${fsTitles.size} lyrics docs; title song count ${songs} ok`);
}
function checkRadio(manifest) {
  const html = read('radio.html'); const area = 'radio.html';
  const tracks = manifest.tracks.length; const albums = new Set(manifest.tracks.map((t) => t.album)).size; const artists = new Set(manifest.tracks.map((t) => t.artist)).size;
  const stat = (k) => norm(first(new RegExp(`data-rk="${k}"[^>]*>([^<]*)<`), html));
  const exp = { 'stat0-num': String(albums), 'stat1-num': tracks.toLocaleString('en-US'), 'stat2-num': String(artists) };
  for (const [k, v] of Object.entries(exp)) if (stat(k) !== v) ERR(area, `${k}: static ${JSON.stringify(stat(k))} vs manifest ${JSON.stringify(v)}`);
  const desc = norm(first(/<meta name="description" content="([^"]+)"/, html));
  const want = `${tracks.toLocaleString('en-US')} tracks across ${artists} artists`;
  if (!desc.includes(want)) ERR(area, `description should contain ${JSON.stringify(want)}`);
  if (manifest.trackCount && manifest.trackCount !== tracks) WARN(area, `manifest trackCount ${manifest.trackCount} != tracks array ${tracks}`);
  if (!hasErr(area)) INFO(area, `stat block + description match manifest (${albums} albums, ${tracks} tracks, ${artists} artists)`);
}
function checkPhotos(galleries) {
  const area = 'photos';
  let files, thumbs;
  try { // git knows the exact case GitHub Pages serves; macOS readdir folds case
    const tracked = git('git ls-files -z assets/photos').split('\0').filter(Boolean);
    files = new Set(tracked.filter((f) => f.split('/').length === 3).map((f) => f.split('/').pop()));
    thumbs = new Set(tracked.filter((f) => f.includes('/thumbs/')).map((f) => f.split('/').pop()));
  } catch (e) {
    const dir = path.join(REPO, 'assets/photos'); files = new Set(fs.readdirSync(dir)); thumbs = new Set(fs.readdirSync(path.join(dir, 'thumbs')));
    WARN(area, 'git unavailable; using filesystem names (case-insensitive on macOS)');
  }
  let n = 0;
  for (const g of galleries) for (const p of g.photos || []) {
    const fn = typeof p === 'string' ? p : p.filename; n++;
    if (!files.has(fn)) ERR(area, `gallery "${g.id}" references missing file: ${fn}`);
    else if (!thumbs.has(fn)) ERR(area, `no thumbnail (case-sensitive) for: ${fn} (gallery ${g.id})`);
  }
  if (!hasErr(area)) INFO(area, `${n} gallery photos all exist with thumbnails`);
}
function checkSitemap() {
  const area = 'sitemap.xml'; const xml = read('sitemap.xml');
  const entries = []; let m; const re = /<loc>https:\/\/jestamang\.com\/([^<]*)<\/loc><lastmod>([^<]+)<\/lastmod>/g;
  while ((m = re.exec(xml))) entries.push([m[1] || 'index.html', m[2]]);
  entries.forEach(([p]) => { if (!exists(decodeURIComponent(p))) ERR(area, 'sitemap entry has no file: ' + p); });
  const skip = new Set(['admin.html', 'offline.html', 'listen.html', 'verify.html', 'login.html', 'members.html', 'profile.html', '404.html', 'dossier.html']);
  const pages = [...fs.readdirSync(REPO).filter((f) => f.endsWith('.html')), ...fs.readdirSync(path.join(REPO, 'games')).filter((f) => f.endsWith('.html')).map((f) => 'games/' + f)];
  for (const p of pages) {
    if (skip.has(p) || /^yandex_/.test(p)) continue;
    const robots = first(/name="robots" content="([^"]+)"/, read(p)) || '';
    if (/noindex/.test(robots)) continue;
    if (!entries.some(([e]) => e === p)) WARN(area, `indexable page not in sitemap: ${p}${robots ? '' : ' (no robots tag either)'}`);
  }
  try {
    for (const [p, lm] of entries) {
      const last = git(`git log -1 --format=%cs -- "${p}"`).trim();
      if (last && last > lm) { const days = Math.round((new Date(last) - new Date(lm)) / 864e5); (days > 7 ? WARN : INFO)(area, `${p}: lastmod ${lm} older than last commit ${last} (${days}d)`); }
    }
  } catch (e) { INFO(area, 'git not available; lastmod freshness skipped'); }
  if (!findings.some((f) => f.area === area && f.level !== 'INFO')) INFO(area, `${entries.length} entries, all files exist, all indexable pages listed`);
}
function checkSwBump() {
  const area = 'service worker';
  try {
    const status = git('git status --porcelain').split('\n').filter(Boolean);
    const changed = status.map((l) => l.slice(3).trim().replace(/^"|"$/g, '')).filter((f) => /\.(html|js|css)$/.test(f) && f !== 'sw.js');
    if (!changed.length) { INFO(area, 'no uncommitted HTML/JS/CSS changes; bump check not needed'); return; }
    const cur = first(/CACHE_NAME = '([^']+)'/, read('sw.js')); const head = first(/CACHE_NAME = '([^']+)'/, git('git show HEAD:sw.js'));
    if (cur === head) ERR(area, `${changed.length} HTML/JS/CSS file(s) modified (${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ', ...' : ''}) but CACHE_NAME is still ${cur}; bump it`);
    else INFO(area, `CACHE_NAME bumped ${head} -> ${cur} for ${changed.length} changed file(s)`);
  } catch (e) { WARN(area, 'git status unavailable: ' + e.message); }
}
function checkPageMeta(pageMeta) {
  const area = 'pageMeta override';
  const pages = (pageMeta && pageMeta.pages) || {};
  if (!Object.keys(pages).length) { INFO(area, 'no overrides'); return; }
  for (const [f, ov] of Object.entries(pages)) {
    if (!exists(f)) { WARN(area, `override for missing page ${f}`); continue; }
    const h = read(f); const t = norm(first(/<title>([^<]+)</, h)); const d = norm(first(/<meta name="description" content="([^"]*)"/, h));
    const tDiff = ov.title && norm(ov.title) !== t, dDiff = ov.desc && norm(ov.desc) !== d;
    if (tDiff) WARN(area, `${f}: Firestore title ${JSON.stringify(ov.title)} overrides static ${JSON.stringify(t)}`);
    if (dDiff) WARN(area, `${f}: Firestore description differs from static`);
    if (!tDiff && !dDiff) INFO(area, `${f}: override equals static (no visible effect)`);
  }
}

// ---------- main ----------
(async () => {
  const t0 = Date.now();
  if (!exists('index.html') || !exists('sw.js')) { console.error('repo not found at ' + REPO + ' (use --repo)'); process.exit(2); }
  const cfg = firebaseConfig();
  const [shows, releases, entities, lyrics, photos, indexSections, pageMeta, manifest] = await Promise.all([
    fsList(cfg, 'shows'), fsList(cfg, 'releases'), fsList(cfg, 'entities'), fsList(cfg, 'lyrics'), fsList(cfg, 'photos'),
    fsDoc(cfg, 'siteConfig/indexSections'), fsDoc(cfg, 'siteConfig/pageMeta'), fetch(MANIFEST_URL).then((r) => r.json()),
  ]);
  const extras = ((indexSections && indexSections.sections) || []).find((s) => s.key === 'shows');
  const index = read('index.html');
  const split = splitShows(shows);
  checkHomepageShowCard(index, extras && extras.extras);
  checkEventLd(index, 'index.html', split.next);
  checkShowsPage(split);
  checkAlbums(releases, entities);
  checkEntities(entities);
  checkLyrics(lyrics);
  checkRadio(manifest);
  checkPhotos(photos);
  checkSitemap();
  checkPageMeta(pageMeta);
  checkSwBump();

  const order = { ERROR: 0, WARN: 1, INFO: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  for (const f of findings) console.log(`${f.level.padEnd(5)}  ${f.area}: ${f.msg}`);
  const errors = findings.filter((f) => f.level === 'ERROR').length, warns = findings.filter((f) => f.level === 'WARN').length;
  console.log(`\n${errors} error(s), ${warns} warning(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s  [repo ${REPO}]`);
  process.exit(errors || (STRICT && warns) ? 1 : 0);
})().catch((e) => { console.error('drift-check failed:', e.message); process.exit(2); });
