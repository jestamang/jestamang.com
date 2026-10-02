/* Jestamang inline track audio.
   Plays a catalog track from the same R2 files Radio uses, through one shared <audio> element
   and a slim inline bar (seek + time). No embeds, no external player.

   The catalog (Firestore `releases`) stores only titles and platform links, so the audio file is
   found in the radio manifest:
     1. album title + track position, when the manifest has the same number of tracks for that
        album numbered 1..n (true for every regular album; survives respelled titles);
     2. otherwise a title that names exactly one file in that album;
     3. for a compilation with no folder of its own, a title that names exactly one file anywhere.
   A track with no file resolves to null and the caller shows no play button.

   API: window.jestaTrackAudio = { prefetch, ready, find, findByArtist, toggle, stop } */
(function () {
  'use strict';
  if (window.jestaTrackAudio) return;

  var MANIFEST = 'https://pub-75f71ff978d340cfa0ee8e4b628e3ea4.r2.dev/manifest.json';
  /* compilations: tracks live in their source albums. alias = compilation title -> file title;
     pick = file title -> source album, for titles that exist as two different recordings */
  var COMPILATIONS = {
    'revolution epilogue: 2k2123 & 2k2323': {
      alias: { 'when to her lute corinna sings': 'when to her lute corinna sings bwv 5' },
      pick: { 'share your earth': 'you and the 7.5 evils of the world', 'evol': 'alissa orange', 'god song': 'the boston society of the temple of psychick youth' }
    }
  };
  /* a silent clip: played inside the tap when the manifest is still loading, so iOS lets the
     real track start once it arrives */
  var SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  var PLAY  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:block"><polygon points="8,5 19,12 8,19"/></svg>';
  var PAUSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:block"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';

  var byAlbum = null, byTitle = null, loadP = null;
  var audio = null, cur = null, seeking = false;

  function akey(s) { return String(s || '').trim().toLowerCase(); }
  function norm(s) {
    var low = String(s || '').toLowerCase().replace(/​/g, '');
    var n = low.replace(/[^a-z0-9]+/g, ' ').trim();
    return n || low.trim();
  }

  function build(data) {
    var raw = Array.isArray(data) ? data : (data && data.tracks) || [];
    var a = {}, t = {};
    raw.forEach(function (tr) {
      if (!tr || !tr.url) return;
      (a[akey(tr.album)] = a[akey(tr.album)] || []).push(tr);
      (t[norm(tr.title)] = t[norm(tr.title)] || []).push(tr);
    });
    Object.keys(a).forEach(function (k) {
      var list = a[k];
      list.sort(function (x, y) { return (x.trackNum || 0) - (y.trackNum || 0); });
      list.positional = list.every(function (tr, i) { return tr.trackNum === i + 1; });
    });
    byAlbum = a; byTitle = t;
    return true;
  }

  /* Resolves true when the manifest is in, false when it could not be loaded (a later call retries). */
  function load() {
    if (byAlbum) return Promise.resolve(true);
    if (loadP) return loadP;
    loadP = fetch(MANIFEST, { mode: 'cors' })
      .then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
      .then(build)
      .catch(function (e) { console.warn('[track-audio] manifest unavailable:', e && e.message); loadP = null; return false; });
    return loadP;
  }

  /* q = { album, index (0-based), count (tracks the catalog lists for the album), title } */
  function find(q) {
    if (!byAlbum || !q) return null;
    var list = byAlbum[akey(q.album)];
    var n = norm(q.title);
    if (list) {
      if (list.positional && typeof q.index === 'number' && q.index >= 0 && q.count === list.length) return list[q.index] || null;
      var hits = list.filter(function (tr) { return norm(tr.title) === n; });
      return hits.length === 1 ? hits[0] : null;
    }
    var comp = COMPILATIONS[akey(q.album)];
    if (comp) {
      if (comp.alias[n]) n = comp.alias[n];
      var any = byTitle[n] || [];
      if (any.length > 1 && comp.pick && comp.pick[n]) any = any.filter(function (tr) { return akey(tr.album) === comp.pick[n]; });
      return any.length === 1 ? any[0] : null;   /* two recordings share the title and none was picked: no guess */
    }
    return null;
  }

  /* For lists that know the artist but not the album (homepage). Exactly one file, or nothing.
     Members of the Children collective are credited as "Children" on R2; "Chapter N (Title)"
     entries are filed under the bare title. */
  var ARTIST_ALIAS = { austinich: 'children', israel: 'children', porphigen: 'children' };
  function findByArtist(artist, title) {
    if (!byTitle) return null;
    var a = akey(artist); a = ARTIST_ALIAS[a] || a;
    var n = norm(title);
    var hits = (byTitle[n] || []).filter(function (tr) { return akey(tr.artist) === a; });
    if (!hits.length && /^chapter \d+ /.test(n)) hits = (byTitle[n.replace(/^chapter \d+ /, '')] || []).filter(function (tr) { return akey(tr.artist) === a; });
    return hits.length === 1 ? hits[0] : null;
  }
  function lookup(spec) { return spec.track || (spec.album ? find(spec) : findByArtist(spec.artist, spec.title)); }

  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function injectCss() {
    if (document.getElementById('jta-css')) return;
    var st = document.createElement('style');
    st.id = 'jta-css';
    st.textContent =
      '.jta-bar{display:flex;align-items:center;gap:10px;list-style:none;padding:6px 12px 8px;margin:0;' +
        'background:rgba(var(--gold-rgb,201,168,76),0.06);border-top:1px solid rgba(var(--gold-rgb,201,168,76),0.35);' +
        'border-bottom:1px solid rgba(var(--gold-rgb,201,168,76),0.12);font-family:\'Luminari\',serif}' +
      '.jta-time,.jta-dur{font-size:0.72rem;letter-spacing:0.04em;color:rgba(var(--gold-rgb,201,168,76),0.85);min-width:34px;' +
        'font-variant-numeric:tabular-nums;flex-shrink:0}' +
      '.jta-dur{text-align:right}' +
      '.jta-seek{flex:1;min-width:0;height:28px;margin:0;accent-color:var(--gold,#c9a84c);cursor:pointer;background:transparent}' +
      '.jta-seek:disabled{opacity:0.4;cursor:default}' +
      '.jta-msg{flex:1;font-size:0.75rem;letter-spacing:0.05em;color:rgba(255,255,255,0.65);font-style:italic}' +
      '.jta-seek:focus-visible{outline:2px solid var(--gold,#c9a84c);outline-offset:2px}' +
      '@media(max-width:767px){.jta-bar{padding:2px 10px 4px}.jta-seek{height:44px}}';
    document.head.appendChild(st);
  }

  function setBtn(spec, state) {
    var btn = spec && spec.btn, title = spec && spec.title;
    if (!btn) return;
    btn.innerHTML = state === 'pause' ? (spec.pauseHtml || PAUSE) : (spec.playHtml || PLAY);
    if (state === 'play') btn.classList.remove('playing'); else btn.classList.add('playing');
    btn.setAttribute('aria-pressed', state === 'play' ? 'false' : 'true');
    btn.setAttribute('aria-label', (state === 'pause' ? 'Pause ' : 'Play ') + (title || 'track'));
    btn.title = state === 'pause' ? 'Pause' : 'Play';
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.addEventListener('timeupdate', function () {
      if (!cur || !cur.real || seeking) return;
      cur.tEl.textContent = fmt(audio.currentTime);
      if (isFinite(audio.duration) && audio.duration > 0) cur.seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
    });
    audio.addEventListener('loadedmetadata', function () {
      if (!cur || !cur.real) return;
      cur.dEl.textContent = fmt(audio.duration);
      cur.seek.disabled = false;
    });
    audio.addEventListener('play',  function () { if (cur && cur.real) setBtn(cur.spec, 'pause'); });
    audio.addEventListener('pause', function () { if (cur && cur.real && !audio.ended) setBtn(cur.spec, 'play'); });
    audio.addEventListener('ended', function () {
      if (!cur || !cur.real) return;
      var next = cur.spec.next;
      stop();
      if (typeof next === 'function') next();
    });
    audio.addEventListener('error', function () {
      if (!cur || !cur.real) return;
      message('This track could not be loaded.');
      setBtn(cur.spec, 'play');
    });
    return audio;
  }

  function message(text) {
    if (!cur) return;
    cur.bar.innerHTML = '';
    var m = document.createElement('span');
    m.className = 'jta-msg';
    m.textContent = text;
    cur.bar.appendChild(m);
  }

  function buildBar(spec) {
    injectCss();
    var anchor = spec.anchor;
    var bar = document.createElement(anchor && anchor.tagName === 'LI' ? 'li' : 'div');
    bar.className = 'jta-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Now playing: ' + (spec.title || 'track'));
    var tEl = document.createElement('span'); tEl.className = 'jta-time'; tEl.textContent = '0:00';
    var seek = document.createElement('input');
    seek.type = 'range'; seek.className = 'jta-seek'; seek.min = '0'; seek.max = '1000'; seek.value = '0'; seek.disabled = true;
    seek.setAttribute('aria-label', 'Seek');
    var dEl = document.createElement('span'); dEl.className = 'jta-dur'; dEl.textContent = '0:00';
    seek.addEventListener('input', function () {
      seeking = true;
      if (isFinite(audio.duration)) tEl.textContent = fmt(seek.value / 1000 * audio.duration);
    });
    seek.addEventListener('change', function () {
      if (isFinite(audio.duration)) audio.currentTime = seek.value / 1000 * audio.duration;
      seeking = false;
    });
    bar.appendChild(tEl); bar.appendChild(seek); bar.appendChild(dEl);
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    return { spec: spec, bar: bar, seek: seek, tEl: tEl, dEl: dEl, real: false };
  }

  function start(track) {
    if (!cur) return;
    cur.real = true;
    audio.src = track.url;
    var p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(function () { if (cur) setBtn(cur.spec, 'play'); });
    if ('mediaSession' in navigator && window.MediaMetadata) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: cur.spec.title || track.title, artist: cur.spec.artist || track.artist, album: cur.spec.album || track.album,
          artwork: track.artwork ? [{ src: track.artwork }] : []
        });
      } catch (e) {}
    }
  }

  function stop() {
    seeking = false;
    if (audio) { try { audio.pause(); } catch (e) {} }
    if (!cur) return;
    if (cur.bar && cur.bar.parentNode) cur.bar.parentNode.removeChild(cur.bar);
    setBtn(cur.spec, 'play');
    cur = null;
  }

  /* spec = { album, index, count, title, artist, btn, anchor, next?, track?, playHtml?, pauseHtml? }
     Without an album the track is looked up by artist and title (homepage lists).
     Same button again pauses or resumes; another button switches to that track. */
  function toggle(spec) {
    ensureAudio();
    if (cur && cur.spec.btn === spec.btn) {
      if (!cur.real) { stop(); return; }      /* still loading, or showing a message: dismiss */
      if (audio.paused) { var rp = audio.play(); if (rp && rp.catch) rp.catch(function () {}); }
      else audio.pause();
      return;
    }
    stop();
    cur = buildBar(spec);
    setBtn(spec, 'pause');
    var known = lookup(spec);
    if (known) { start(known); return; }
    if (byAlbum) { stop(); return; }           /* manifest is in and has no file for this track */
    /* manifest still loading: unlock audio inside this tap, start when it arrives */
    try { audio.src = SILENT; var sp = audio.play(); if (sp && sp.catch) sp.catch(function () {}); } catch (e) {}
    var mine = cur;
    load().then(function (ok) {
      if (cur !== mine) return;
      var tr = ok ? lookup(spec) : null;
      if (tr) start(tr);
      else { message(ok ? 'No audio file for this track.' : 'Audio is unavailable right now.'); setBtn(spec, 'play'); }
    });
  }

  function state() {
    return { active: !!cur, src: audio ? audio.currentSrc || audio.src : '', paused: audio ? audio.paused : true,
             time: audio ? audio.currentTime : 0, duration: audio ? audio.duration : 0 };
  }

  window.jestaTrackAudio = { prefetch: load, ready: load, find: find, findByArtist: findByArtist, toggle: toggle, stop: stop, state: state };
})();
