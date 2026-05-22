// ════════════════════════════════════════════════════════════════
// JESTA LEADERBOARD SHARED FORMATTER — jesta-leaderboard.js
// Exposes window.JestaLeaderboard with date/score/avatar helpers
// ════════════════════════════════════════════════════════════════
(function () {
  var MON = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  var RD  = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX','XXXI'];

  function toRom(y) {
    var t = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    var r = '';
    t.forEach(function (p) { while (y >= p[0]) { r += p[1]; y -= p[0]; } });
    return r;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  function formatScrollDate(ts) {
    try {
      var d;
      if (ts && typeof ts.toDate === 'function') { d = ts.toDate(); }
      else if (ts instanceof Date) { d = ts; }
      else { d = new Date(ts); }
      if (isNaN(d.getTime())) return '—';
      return MON[d.getMonth()].slice(0, 3) + ' · ' + RD[d.getDate() - 1] + ' · ' + toRom(d.getFullYear());
    } catch (e) { return '—'; }
  }

  function formatScrollScore(value, type) {
    if (type === 'time') return parseFloat(value).toFixed(1) + 's';
    return parseInt(value, 10).toLocaleString();
  }

  function scrollAvatar(entry) {
    var nm   = entry.name || '?';
    var init = nm.charAt(0).toUpperCase();
    if (entry.photoURL) {
      return '<img class="lb-av" src="' + esc(entry.photoURL) + '" data-name="' + esc(nm) + '" alt="" loading="lazy" width="28" height="28" onerror="lbAvErr(this)">';
    }
    if (entry.uid) {
      return '<span class="lb-av-init" data-lb-uid="' + esc(entry.uid) + '" data-lb-name="' + esc(nm) + '">' + init + '</span>';
    }
    return '<span class="lb-av-init">' + init + '</span>';
  }

  function lbFetchMissingAvatars(container) {
    if (!window.jestaDB) return;
    var spans = (container || document).querySelectorAll('.lb-av-init[data-lb-uid]');
    for (var i = 0; i < spans.length; i++) {
      (function (span) {
        var uid = span.getAttribute('data-lb-uid');
        var nm  = span.getAttribute('data-lb-name') || '?';
        window.jestaDB.collection('users').doc(uid).get().then(function (doc) {
          if (!doc.exists) return;
          var data = doc.data();
          if (!data.photoURL) return;
          var img = document.createElement('img');
          img.className = 'lb-av';
          img.src = data.photoURL;
          img.setAttribute('data-name', nm);
          img.alt = '';
          img.loading = 'lazy';
          img.width = 28;
          img.height = 28;
          img.onerror = function () { lbAvErr(img); };
          if (span.parentNode) span.parentNode.replaceChild(img, span);
        }).catch(function () {});
      })(spans[i]);
    }
  }

  window.lbAvErr = function (img) {
    img.onerror = null;
    var nm = img.getAttribute('data-name') || '?';
    var sp = document.createElement('span');
    sp.className = 'lb-av-init';
    sp.textContent = nm.charAt(0).toUpperCase();
    if (img.parentNode) img.parentNode.replaceChild(sp, img);
  };

  window.JestaLeaderboard = {
    formatScrollDate:      formatScrollDate,
    formatScrollScore:     formatScrollScore,
    scrollAvatar:          scrollAvatar,
    lbFetchMissingAvatars: lbFetchMissingAvatars,
    SCROLL_PB_MARKER:      '★',
    SCROLL_RANK1_MARKER:   '✦'
  };
}());
