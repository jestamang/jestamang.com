// ════════════════════════════════════════════════════════════════
// JESTA LEADERBOARD SHARED FORMATTER — jesta-leaderboard.js
// Exposes window.JestaLeaderboard with date/score/avatar helpers
// ════════════════════════════════════════════════════════════════
(function () {
  var MON = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  var RD   = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX','XXXI'];
  var MROM = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

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
      return MROM[d.getMonth()] + ' · ' + RD[d.getDate() - 1] + ' · ' + toRom(d.getFullYear());
    } catch (e) { return '—'; }
  }

  function formatScrollScore(value, type) {
    if (type === 'time') return parseFloat(value).toFixed(1) + 's';
    return parseInt(value, 10).toLocaleString();
  }

  function scrollAvatar(entry) {
    var nm = entry.name || '?';
    if (entry.photoURL) {
      return '<img class="lb-av" src="' + esc(entry.photoURL) + '" data-name="' + esc(nm) + '" alt="" loading="lazy" width="28" height="28" onerror="lbAvErr(this)">';
    }
    if (entry.uid) {
      return '<img class="lb-av" src="/assets/homepage/jesta jr.jpg" data-lb-uid="' + esc(entry.uid) + '" data-lb-name="' + esc(nm) + '" alt="" loading="lazy" width="28" height="28">';
    }
    return '<img class="lb-av" src="/assets/homepage/jesta jr.jpg" alt="" loading="lazy" width="28" height="28">';
  }

  function lbFetchMissingAvatars(container) {
    if (!window.jestaDB) return;
    var imgs = (container || document).querySelectorAll('img.lb-av[data-lb-uid]');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        var uid = img.getAttribute('data-lb-uid');
        window.jestaDB.collection('users').doc(uid).get().then(function (doc) {
          if (!doc.exists) return;
          var data = doc.data();
          if (!data.photoURL) return;
          img.removeAttribute('data-lb-uid');
          img.onerror = function () { lbAvErr(img); };
          img.src = data.photoURL;
        }).catch(function () {});
      })(imgs[i]);
    }
  }

  window.lbAvErr = function (img) {
    img.onerror = null;
    img.src = '/assets/homepage/jesta jr.jpg';
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
