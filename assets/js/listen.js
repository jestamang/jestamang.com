(function () {
  'use strict';

  var MANIFEST     = 'https://pub-75f71ff978d340cfa0ee8e4b628e3ea4.r2.dev/manifest.json';
  var RECENT_KEY   = 'listenRecentTransmissions';
  var STATION_KEY  = 'listenSelectedStation';
  var MAX_RECENT   = 10;
  var FADE_STEPS   = 10;
  var FADE_MS      = 20;

  var allTracks  = [];
  var tracks     = [];
  var queue      = [];
  var hist       = [];
  var cur        = -1;
  var shuffleOn  = true;
  var audio      = null;
  var fadeTmr    = null;
  var skipTmr    = null;

  /* waveform — synthetic only */
  var wCtx      = null;
  var NUM_BARS  = 18;
  var synthBars = [];

  /* ---- station ---- */
  function applyStation(id) {
    if (id === 'STATION_COLLECTIVE') {
      tracks = allTracks.filter(function (t) { return t.album !== 'Sounds Across the World'; });
    } else if (id === 'STATION_WORLD') {
      tracks = allTracks.filter(function (t) { return t.album === 'Sounds Across the World'; });
    } else {
      id = 'STATION_ALL';
      tracks = allTracks.slice();
    }
    hist  = [];
    queue = [];
    buildQ();
    var btns = ['lc-st-all', 'lc-st-collective', 'lc-st-world'];
    var ids  = ['STATION_ALL', 'STATION_COLLECTIVE', 'STATION_WORLD'];
    for (var i = 0; i < btns.length; i++) {
      var b = $id(btns[i]);
      if (b) {
        if (ids[i] === id) b.classList.add('active');
        else               b.classList.remove('active');
      }
    }
  }

  function switchStation(id) {
    localStorage.setItem(STATION_KEY, id);
    applyStation(id);
    if (audio && !audio.paused) {
      var steps = 50, sv = audio.volume, step = 0;
      clearFade();
      fadeTmr = setInterval(function () {
        step++;
        audio.volume = Math.max(0, sv * (1 - step / steps));
        if (step >= steps) { clearFade(); playNext(false); }
      }, 20);
    } else {
      playNext(false);
    }
  }

  /* ---- queue ---- */
  function _shuf(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
  }

  function buildQ() {
    var idx = [];
    for (var i = 0; i < tracks.length; i++) idx.push(i);
    if (shuffleOn) {
      _shuf(idx);
      if (cur >= 0 && idx.length > 1 && idx[0] === cur) {
        var tmp = idx[0]; idx[0] = idx[1]; idx[1] = tmp;
      }
    }
    queue = idx;
  }

  function deq() {
    if (!queue.length) buildQ();
    return queue.shift();
  }

  /* ---- fade ---- */
  function clearFade() {
    if (fadeTmr) { clearInterval(fadeTmr); fadeTmr = null; }
  }

  function fadeTo(vol, cb) {
    clearFade();
    if (!audio) { if (cb) cb(); return; }
    var sv = audio.volume, step = 0;
    fadeTmr = setInterval(function () {
      step++;
      audio.volume = Math.max(0, Math.min(1, sv + (vol - sv) * step / FADE_STEPS));
      if (step >= FADE_STEPS) { clearFade(); audio.volume = vol; if (cb) cb(); }
    }, FADE_MS);
  }

  /* ---- helpers ---- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    var m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function $id(id) { return document.getElementById(id); }

  /* ---- UI ---- */
  function setArt(url) {
    var el = $id('lc-artwork');
    if (el) el.src = url || 'assets/homepage/logo png.png';
  }

  function setInfo(t) {
    var te = $id('lc-title'), me = $id('lc-meta');
    if (te) te.textContent = t ? t.title : '…';
    if (me) me.textContent = t ? (t.artist === t.album ? t.artist : t.artist + (t.album ? ' · ' + t.album : '')) : '';
    setArt(t && t.artwork ? t.artwork : null);
    document.title = t ? (t.title + ' — Jestamang Radio') : 'Listen | Jestamang';
  }

  function updProg() {
    if (!audio || !audio.duration) return;
    var p  = audio.currentTime / audio.duration;
    var f  = $id('lc-fill'), ti = $id('lc-time');
    if (f)  f.style.width = (p * 100).toFixed(2) + '%';
    if (ti) ti.innerHTML = '<span>' + fmt(audio.currentTime) + '</span><span>' + fmt(audio.duration) + '</span>';
  }

  function setPlayBtn(p) {
    var b = $id('lc-play');
    if (!b) return;
    b.textContent = p ? '⏸' : '▶';
    b.setAttribute('aria-label', p ? 'Pause' : 'Play');
    b.setAttribute('data-playing', p ? '1' : '0');
    var dot = $id('lc-onair-dot');
    if (dot) {
      if (p) dot.classList.remove('paused');
      else   dot.classList.add('paused');
    }
  }

  function showLoad(v) {
    var el = $id('lc-loading');
    if (el) el.style.display = v ? 'flex' : 'none';
  }

  function showErr(msg) {
    var el = $id('lc-error'), rb = $id('lc-retry');
    if (el) { el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
    if (rb) rb.style.display = msg ? 'inline-block' : 'none';
  }

  /* ---- recent ---- */
  function loadRec() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; }
  }

  function saveRec(t) {
    var r = loadRec().filter(function (x) { return String(x.id) !== String(t.id); });
    r.unshift({ id: t.id, title: t.title, artist: t.artist, album: t.album });
    if (r.length > MAX_RECENT) r.length = MAX_RECENT;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } catch (e) {}
    renderRec(r);
  }

  function renderRec(r) {
    var list = $id('lc-recent-list');
    if (!list) return;
    if (!r) r = loadRec();
    if (!r.length) {
      list.innerHTML = '<li class="lc-re-empty">— No transmissions logged yet —</li>';
      return;
    }
    var html = '';
    for (var i = 0; i < r.length; i++) {
      var ri = r[i];
      html += '<li class="lc-re-item" data-id="' + esc(String(ri.id)) + '">' +
        '<span class="lc-re-n">' + (i + 1) + '</span>' +
        '<span class="lc-re-body">' +
          '<span class="lc-re-t">' + esc(ri.title) + '</span>' +
          '<span class="lc-re-m">' + (ri.artist === ri.album ? esc(ri.artist) : esc(ri.artist) + (ri.album ? ' · ' + esc(ri.album) : '')) + '</span>' +
        '</span></li>';
    }
    list.innerHTML = html;
    var items = list.querySelectorAll('.lc-re-item');
    for (var j = 0; j < items.length; j++) {
      (function (item) {
        item.addEventListener('click', function () {
          var id = item.getAttribute('data-id');
          for (var k = 0; k < tracks.length; k++) {
            if (String(tracks[k].id) === id) { playAt(k); return; }
          }
        });
      })(items[j]);
    }
  }

  /* ---- waveform (synthetic only — no Web Audio API to avoid CORS audio muting) ---- */
  function initSynthBars() {
    synthBars = [];
    for (var i = 0; i < NUM_BARS; i++) {
      synthBars.push({
        h:    0.08 + Math.random() * 0.35,
        v:    (0.004 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1),
        tgt:  0.08 + Math.random() * 0.35
      });
    }
  }

  function drawWave() {
    var canvas = $id('lc-wave');
    if (!canvas || !wCtx) { requestAnimationFrame(drawWave); return; }
    var W = canvas.offsetWidth  || 320;
    var H = canvas.offsetHeight || 40;
    if (canvas.width  !== W) canvas.width  = W;
    if (canvas.height !== H) canvas.height = H;
    var pb      = $id('lc-play');
    var playing = pb && pb.getAttribute('data-playing') === '1';
    var barW    = Math.max(2, Math.floor((W - (NUM_BARS + 1) * 2) / NUM_BARS));
    wCtx.clearRect(0, 0, W, H);

    for (var j = 0; j < synthBars.length; j++) {
      if (playing) {
        /* smoothly interpolate toward a random target */
        synthBars[j].h += (synthBars[j].tgt - synthBars[j].h) * 0.12;
        if (Math.abs(synthBars[j].tgt - synthBars[j].h) < 0.01) {
          synthBars[j].tgt = 0.06 + Math.random() * 0.82;
        }
      }
      var bH    = Math.max(2, synthBars[j].h * H);
      var alpha = playing ? (0.4 + synthBars[j].h * 0.6) : (0.25 + synthBars[j].h * 0.3);
      wCtx.fillStyle = 'rgba(201,168,76,' + alpha + ')';
      wCtx.fillRect(2 + j * (barW + 2), (H - bH) / 2, barW, bH);
    }
    requestAnimationFrame(drawWave);
  }

  function initWave() {
    var canvas = $id('lc-wave');
    if (!canvas) return;
    wCtx = canvas.getContext('2d');
    initSynthBars();
    requestAnimationFrame(drawWave);
  }

  /* ---- playback ---- */
  function playAt(idx) {
    if (idx < 0 || idx >= tracks.length) return;
    if (cur >= 0) { hist.push(cur); if (hist.length > 50) hist = hist.slice(-50); }
    cur = idx;
    var t = tracks[idx];
    setInfo(t);
    showErr(null);
    showLoad(true);
    clearFade();
    clearTimeout(skipTmr);
    audio.pause();
    audio.src = t.url;
    audio.volume = 1;
    audio.load();
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        showLoad(false);
        setPlayBtn(true);
        saveRec(t);
      }).catch(function () {
        showLoad(false);
        setPlayBtn(false);
      });
    } else {
      showLoad(false);
    }
    skipTmr = setTimeout(function () {
      var b = $id('lc-play');
      if (b && b.getAttribute('data-playing') !== '1' && audio.readyState < 2) {
        playNext(false);
      }
    }, 5000);
  }

  function playNext(fade) {
    if (!tracks.length) return;
    var idx = deq();
    if (fade && audio && !audio.paused) {
      fadeTo(0, function () { audio.volume = 1; playAt(idx); });
    } else {
      playAt(idx);
    }
  }

  function playPrev() {
    if (audio && audio.currentTime > 3 && cur >= 0) { audio.currentTime = 0; return; }
    if (hist.length) { var p = hist.pop(); cur = -1; playAt(p); }
    else if (cur >= 0) { audio.currentTime = 0; if (audio.paused) audio.play(); }
  }

  function togglePlay() {
    if (!audio) return;
    if (audio.paused || audio.ended) {
      if (!audio.src && tracks.length) { playNext(false); return; }
      audio.play().then(function () { setPlayBtn(true); }).catch(function () {});
    } else {
      audio.pause(); setPlayBtn(false);
    }
  }

  /* ---- progress bar seek ---- */
  function initSeek() {
    var bar = $id('lc-progress');
    if (!bar) return;
    function seek(clientX) {
      if (!audio || !audio.duration) return;
      var r = bar.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      audio.currentTime = pct * audio.duration;
      updProg();
    }
    bar.addEventListener('click', function (e) { seek(e.clientX); });
    var drag = false;
    bar.addEventListener('mousedown', function () { drag = true; });
    document.addEventListener('mousemove', function (e) { if (drag) seek(e.clientX); });
    document.addEventListener('mouseup', function () { drag = false; });
    bar.addEventListener('touchend', function (e) {
      e.preventDefault();
      seek(e.changedTouches[0].clientX);
    });
  }

  /* ---- manifest ---- */
  function fetchManifest() {
    showLoad(true);
    showErr(null);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', MANIFEST, true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          var raw = Array.isArray(data) ? data : (data.tracks || []);
          console.log('[listen] manifest loaded, tracks:', raw.length);
          if (!raw.length) { showLoad(false); showErr('Empty catalog.'); return; }
          allTracks = raw;
          applyStation(localStorage.getItem(STATION_KEY) || 'STATION_ALL');
          var isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          if (isIos) {
            var idx = deq(); cur = idx;
            setInfo(tracks[idx]);
            showLoad(false);
            var ov = $id('lc-ios');
            if (ov) ov.style.display = 'flex';
          } else {
            playNext(false);
          }
        } catch (ex) {
          showLoad(false); showErr('Catalog error. ✦ Retry?');
        }
      } else {
        showLoad(false); showErr('Catalog unavailable. ✦ Retry?');
      }
    };
    xhr.onerror = function () { showLoad(false); showErr('Network error. ✦ Retry?'); };
    xhr.send();
  }

  /* ---- init ---- */
  function init() {
    renderRec();

    audio = $id('lc-audio');
    if (!audio) { audio = document.createElement('audio'); audio.id = 'lc-audio'; document.body.appendChild(audio); }
    audio.preload = 'auto';

    audio.addEventListener('play',      function () { setPlayBtn(true); });
    audio.addEventListener('pause',     function () { setPlayBtn(false); });
    audio.addEventListener('ended',     function () { playNext(false); });
    audio.addEventListener('error',     function () {
      showLoad(false); clearTimeout(skipTmr);
      skipTmr = setTimeout(function () { if (tracks.length) playNext(false); }, 300);
    });
    audio.addEventListener('timeupdate', updProg);
    audio.addEventListener('canplay',   function () { showLoad(false); });
    audio.addEventListener('waiting',   function () { showLoad(true); });

    var pb   = $id('lc-play');
    var prev = $id('lc-prev');
    var next = $id('lc-next');
    var rt   = $id('lc-retry');
    var ios  = $id('lc-ios');
    var stAll = $id('lc-st-all');
    var stCol = $id('lc-st-collective');
    var stWld = $id('lc-st-world');

    if (pb)    pb.addEventListener('click', togglePlay);
    if (prev)  prev.addEventListener('click', playPrev);
    if (next)  next.addEventListener('click', function () { playNext(true); });
    if (rt)    rt.addEventListener('click', fetchManifest);
    if (stAll) stAll.addEventListener('click', function () { switchStation('STATION_ALL'); });
    if (stCol) stCol.addEventListener('click', function () { switchStation('STATION_COLLECTIVE'); });
    if (stWld) stWld.addEventListener('click', function () { switchStation('STATION_WORLD'); });
    if (ios)  ios.addEventListener('click', function () {
      ios.style.display = 'none';
      if (cur >= 0 && tracks[cur]) {
        if (!audio.src) { audio.src = tracks[cur].url; audio.load(); }
        audio.play().then(function () { setPlayBtn(true); saveRec(tracks[cur]); }).catch(function () {});
      }
    });

    initSeek();
    initWave();
    fetchManifest();

    /* restart rAF loop if it went dark while page was backgrounded */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && wCtx) requestAnimationFrame(drawWave);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
