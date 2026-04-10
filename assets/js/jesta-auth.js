// ════════════════════════════════════════════════════════════════
// JESTAMANG AUTH NAV — injected into every page
// Listens to Firebase auth state and updates the top nav bar
// ════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── Inject auth CSS ───────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#jtnav-auth{display:flex;align-items:center;flex-shrink:0}',
    '#jtnav-auth-sep{width:1px;height:20px;background:rgba(201,168,76,0.3);margin:0 8px;flex-shrink:0}',
    '.jtnav-auth-link{font-family:\'Luminari\',serif;font-size:0.55rem;letter-spacing:0.12em;text-transform:uppercase;color:rgba(201,168,76,0.75);text-decoration:none;padding:0 6px;white-space:nowrap;transition:color 0.2s;line-height:52px}',
    '.jtnav-auth-link:hover{color:#c9a84c}',
    '.jtnav-auth-star{font-size:0.8rem;color:rgba(201,168,76,0.55);text-decoration:none;padding:0 6px;line-height:52px;transition:color 0.2s}',
    '.jtnav-auth-star:hover{color:#c9a84c}',
    /* On mobile: hide the desktop auth div, show only the right mob-login link */
    '@media(max-width:767px){#jtnav-auth{display:none!important}}',
    '@media(max-width:767px){#jtnav-mob-auth{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;width:100%;gap:8px}#jtnav-mob-auth .jtnav-mob-link{width:60%;max-width:220px;text-align:center}#jtnav-mob-auth .jtnav-mob-divider{width:100%}}',
    '#jtnav-mob-login{display:none!important}',
    '@media(max-width:767px){#jtnav-mob-login{display:flex!important;align-items:center;font-family:\'Luminari\',serif!important;color:#c9a84c!important;font-size:0.62rem!important;letter-spacing:0.16em!important;text-transform:uppercase!important;transition:opacity 0.2s!important}}',
    '#jtnav-mob-login:hover{opacity:0.75}'
  ].join('');
  document.head.appendChild(style);

  // ── Insert auth container into #jtnav ────────────────────────
  function insertAuthNav() {
    var toggle = document.getElementById('jtnav-mobile-toggle');
    if (!toggle) return;
    var wrap = document.getElementById('jtnav-auth');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'jtnav-auth';
      toggle.parentNode.insertBefore(wrap, toggle);
    }

    // Mobile overlay auth
    var overlay = document.getElementById('jtnav-mobile-overlay');
    if (overlay) {
      var mobWrap = document.createElement('div');
      mobWrap.id = 'jtnav-mob-auth';
      overlay.appendChild(mobWrap);
    }

    // Listen
    if (window.jestaAuth) {
      window.jestaAuth.onAuthStateChanged(updateNav);
    }
  }

  // ── Render logged-in nav with a display name ─────────────────
  function renderAuthNav(wrap, mobWrap, displayName) {
    var shortName = displayName.length > 14 ? displayName.slice(0, 12) + '\u2026' : displayName;
    wrap.innerHTML =
      '<div id="jtnav-auth-sep"></div>' +
      '<a class="jtnav-auth-link" href="profile.html" title="Your Dossier">' + shortName + '</a>' +
      '<a class="jtnav-auth-star" href="members.html" title="Inner Circle">\u2736</a>';
    if (mobWrap) {
      mobWrap.innerHTML =
        '<div class="jtnav-mob-divider"></div>' +
        '<a class="jtnav-mob-link" href="profile.html">My Dossier</a>' +
        '<a class="jtnav-mob-link" href="members.html">Members</a>' +
        '<a class="jtnav-mob-link" href="#" id="jtnav-mob-so">Depart for Now</a>';
      var so = document.getElementById('jtnav-mob-so');
      if (so) so.addEventListener('click', function (e) {
        e.preventDefault();
        window.jestaAuth.signOut();
      });
    }
  }

  // ── In-app notification banner ────────────────────────────────
  function checkNotifications(user) {
    if (!window.jestaDB) {
      var _t = 0, _iv = setInterval(function () {
        if (window.jestaDB) { clearInterval(_iv); checkNotifications(user); }
        else if (++_t > 80) { clearInterval(_iv); }
      }, 100);
      return;
    }
    var lastCheck = parseInt(localStorage.getItem('lastNotifCheck') || '0', 10);
    window.jestaDB.collection('notifications')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get()
      .then(function (snap) {
        if (snap.empty) return;
        var doc = snap.docs[0];
        var data = doc.data();
        var seen = data.seen || [];
        if (seen.indexOf(user.uid) !== -1) return;
        var notifTime = data.timestamp ? data.timestamp.seconds * 1000 : 0;
        if (notifTime <= lastCheck) return;
        showNotifBanner(doc.id, data, user);
      })
      .catch(function () {});
  }

  function showNotifBanner(id, data, user) {
    if (document.getElementById('j-notif-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'j-notif-banner';
    banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:99998;background:rgba(0,0,0,0.95);border:1px solid #c9a84c;padding:16px 48px 16px 20px;max-width:500px;width:90%;font-family:Luminari,Georgia,serif;border-radius:4px;box-shadow:0 4px 24px rgba(0,0,0,0.6);';
    var linkHtml = (data.link && data.link !== '/')
      ? '<a href="' + data.link + '" style="color:#c9a84c;display:block;margin-top:6px;font-size:11px;letter-spacing:2px;">VIEW \u2192</a>'
      : '';
    banner.innerHTML =
      '<div style="color:#c9a84c;font-size:13px;letter-spacing:3px;text-transform:uppercase;">' + esc(data.title) + '</div>' +
      '<div style="color:#e8e0d0;font-size:12px;margin-top:4px;">' + esc(data.body) + '</div>' +
      linkHtml +
      '<button onclick="window._jDismissNotif(\'' + id + '\',\'' + user.uid + '\')" style="position:absolute;top:8px;right:12px;background:none;border:none;color:#c9a84c;font-size:18px;cursor:pointer;">\u00d7</button>';
    document.body.appendChild(banner);
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Nav badges ────────────────────────────────────────────────
  var _badgeUnsub = null;

  function checkNavBadges() {
    if (!window.jestaDB) {
      var _t = 0, _iv = setInterval(function () {
        if (window.jestaDB) { clearInterval(_iv); checkNavBadges(); }
        else if (++_t > 80) { clearInterval(_iv); }
      }, 100);
      return;
    }
    // Only attach once per page load
    if (_badgeUnsub) return;
    var now = firebase.firestore ? firebase.firestore.Timestamp.now() : new Date();
    // Query badges that either have no expiresAt or haven't expired yet
    // We fetch all and filter client-side to avoid a compound index requirement
    _badgeUnsub = window.jestaDB.collection('navBadges').onSnapshot(function (snap) {
      document.querySelectorAll('.nav-badge').forEach(function (b) { b.remove(); });
      var nowMs = Date.now();
      snap.forEach(function (doc) {
        var d = doc.data();
        // Skip expired badges
        if (d.expiresAt && d.expiresAt.toMillis && d.expiresAt.toMillis() < nowMs) return;
        // Find nav link — try both relative and absolute href patterns
        var link = document.querySelector('a[href="' + d.page + '"]')
          || document.querySelector('a[href*="/' + d.page + '"]');
        if (!link) return;
        var badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.textContent = d.type === 'dot' ? '' : (d.text || d.type);
        badge.style.cssText = getBadgeStyle(d.type);
        link.style.position = 'relative';
        link.appendChild(badge);
      });
    }, function () {});
  }

  function getBadgeStyle(type) {
    var base = 'position:absolute;top:-4px;right:-4px;border-radius:10px;'
      + 'font-family:Georgia,serif;font-size:9px;letter-spacing:1px;'
      + 'padding:2px 5px;z-index:999;line-height:1;pointer-events:none;';
    if (type === 'dot') return base
      + 'width:8px;height:8px;padding:0;background:#e53935;border-radius:50%;';
    if (type === 'LIVE') return base + 'background:#e53935;color:#fff;';
    if (type === 'HOT')  return base + 'background:#ff6d00;color:#fff;';
    return base + 'background:#c9a84c;color:#000;';
  }

  // ── Maintenance mode ──────────────────────────────────────────
  function checkMaintenance(user) {
    var isAdmin = user && user.email === 'thejestamang@gmail.com';
    if (isAdmin) return;
    if (!window.jestaDB) {
      var _t = 0, _iv = setInterval(function () {
        if (window.jestaDB) { clearInterval(_iv); checkMaintenance(user); }
        else if (++_t > 80) { clearInterval(_iv); }
      }, 100);
      return;
    }
    window.jestaDB.collection('siteConfig').doc('maintenance').onSnapshot(function (doc) {
      if (!doc.exists || !doc.data().active) { hideMaintenanceOverlay(); return; }
      showMaintenanceOverlay(doc.data().message || 'THE UNIVERSE IS BEING RECALIBRATED. RETURN SHORTLY.');
    }, function () {});
  }

  function showMaintenanceOverlay(message) {
    var existing = document.getElementById('j-maint-overlay');
    if (existing) {
      var msgEl = document.getElementById('j-maint-msg');
      if (msgEl) msgEl.textContent = message;
      return;
    }
    var overlay = document.createElement('div');
    overlay.id = 'j-maint-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;';
    var safeMsg = String(message || '').replace(/[&<>"]/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});
    overlay.innerHTML =
      '<img src="/assets/icons/icon-192.png" alt="Jestamang" style="width:80px;height:80px;margin-bottom:32px;opacity:0.85;" onerror="this.style.display=\'none\'">' +
      '<div id="j-maint-msg" style="font-family:Luminari,Georgia,serif;font-size:clamp(0.9rem,3vw,1.3rem);letter-spacing:0.3em;text-transform:uppercase;color:#c9a84c;text-align:center;max-width:480px;line-height:1.8;">' + safeMsg + '</div>' +
      '<div style="margin-top:24px;font-size:0.65rem;letter-spacing:0.4em;text-transform:uppercase;color:rgba(201,168,76,0.4);">CHECK BACK SOON</div>';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  function hideMaintenanceOverlay() {
    var overlay = document.getElementById('j-maint-overlay');
    if (overlay) { overlay.remove(); document.body.style.overflow = ''; }
  }

  window._jDismissNotif = function (id, uid) {
    localStorage.setItem('lastNotifCheck', String(Date.now()));
    if (window.jestaDB) {
      window.jestaDB.collection('notifications').doc(id).update({
        seen: firebase.firestore.FieldValue.arrayUnion(uid)
      }).catch(function () {});
    }
    var banner = document.getElementById('j-notif-banner');
    if (banner) banner.remove();
  };

  // ── Update nav based on auth state ───────────────────────────
  function updateNav(user) {
    var wrap = document.getElementById('jtnav-auth');
    var mobWrap = document.getElementById('jtnav-mob-auth');
    if (!wrap) return;

    var mobLogin = document.getElementById('jtnav-mob-login');
    if (user) {
      var CACHE_KEY = 'jesta_uname_' + user.uid;
      var cached = localStorage.getItem(CACHE_KEY);
      var fallback = (user.displayName || user.email || '').split('@')[0];
      // Show cached username instantly — no flash to email
      var initialName = cached || fallback;
      renderAuthNav(wrap, mobWrap, initialName);
      if (mobLogin) { mobLogin.href = 'profile.html'; mobLogin.textContent = initialName.length > 10 ? initialName.slice(0,9)+'\u2026' : initialName; }
      checkNotifications(user);
      if (window.jestaDB) {
        window.jestaDB.collection('users').doc(user.uid).get()
          .then(function (doc) {
            var name = (doc.exists && doc.data().username) ? doc.data().username : fallback;
            localStorage.setItem(CACHE_KEY, name);
            if (name !== initialName) {
              renderAuthNav(wrap, mobWrap, name);
              if (mobLogin) { mobLogin.href = 'profile.html'; mobLogin.textContent = name.length > 10 ? name.slice(0,9)+'\u2026' : name; }
            }
          })
          .catch(function () {});
      }
    } else {
      // Clear cached name on logout
      wrap.innerHTML =
        '<div id="jtnav-auth-sep"></div>' +
        '<a class="jtnav-auth-link" href="login.html">Log in</a>';
      if (mobWrap) {
        mobWrap.innerHTML =
          '<div class="jtnav-mob-divider"></div>' +
          '<a class="jtnav-mob-link" href="login.html">Enter the Circle</a>';
      }
      if (mobLogin) { mobLogin.href = 'login.html'; mobLogin.textContent = 'Log In'; }
    }
    checkMaintenance(user);
    checkNavBadges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertAuthNav);
  } else {
    insertAuthNav();
  }

  // ── Cookie consent banner ────────────────────────────────────
  function initCookieBanner() {
    if (document.getElementById('ck-banner')) return; // already present
    var v = localStorage.getItem('cookieAccepted');
    // Inject CSS
    var cs = document.createElement('style');
    cs.id = 'ck-styles';
    cs.textContent =
      '#ck-banner{position:fixed;bottom:0;left:0;right:0;z-index:99998;background:rgba(0,0,0,0.85);border-top:1px solid #c9a84c;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}' +
      '#ck-banner.ck-hidden{display:none!important}' +
      '#ck-text{font-family:\'Luminari\',serif;font-size:0.72rem;letter-spacing:0.05em;color:rgba(240,230,210,0.85);line-height:1.7;flex:1;min-width:180px;margin:0}' +
      '#ck-btns{display:flex;gap:10px;flex-shrink:0;align-items:center}' +
      '#ck-accept,#ck-decline{font-family:\'Luminari\',serif;font-size:0.68rem;letter-spacing:0.22em;text-transform:uppercase;cursor:pointer;padding:10px 18px;min-height:44px;transition:background 0.2s,color 0.2s,border-color 0.2s,box-shadow 0.2s;white-space:nowrap}' +
      '#ck-accept{background:#c9a84c;color:#000;border:none}' +
      '#ck-accept:hover{background:#dfc060;box-shadow:0 0 16px rgba(201,168,76,0.3)}' +
      '#ck-decline{background:transparent;border:1px solid rgba(201,168,76,0.55);color:rgba(201,168,76,0.8)}' +
      '#ck-decline:hover{border-color:#c9a84c;color:#c9a84c}' +
      '@media(max-width:768px){#ck-banner{flex-direction:column;align-items:stretch;padding:14px 16px;gap:12px}#ck-btns{flex-direction:column}#ck-accept,#ck-decline{width:100%;text-align:center}}';
    document.head.appendChild(cs);
    // Inject HTML
    var banner = document.createElement('div');
    banner.id = 'ck-banner';
    banner.className = 'ck-hidden';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<p id="ck-text">This site uses cookies for login and anonymous analytics. By continuing you accept this.</p>' +
      '<div id="ck-btns">' +
      '<button id="ck-accept" type="button">Accept</button>' +
      '<button id="ck-decline" type="button">Decline</button>' +
      '</div>';
    document.body.appendChild(banner);
    // Init
    if (!v) { banner.classList.remove('ck-hidden'); }
    document.getElementById('ck-accept').addEventListener('click', function () {
      localStorage.setItem('cookieAccepted', 'true');
      banner.classList.add('ck-hidden');
    });
    document.getElementById('ck-decline').addEventListener('click', function () {
      localStorage.setItem('cookieAccepted', 'false');
      banner.classList.add('ck-hidden');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieBanner);
  } else {
    initCookieBanner();
  }

  // ── Button press animation ────────────────────────────────────
  var ps = document.createElement('style');
  ps.textContent =
    '@keyframes jtPress{0%,100%{transform:scale(1)}45%{transform:scale(0.93)filter:brightness(1.18)}}' +
    '.jt-press{animation:jtPress 0.19s cubic-bezier(0.36,0.07,0.19,0.97) forwards!important}';
  document.head.appendChild(ps);
  document.addEventListener('pointerdown', function(e) {
    var el = e.target.closest(
      'button, .tab, .tab-btn, .al-card, .album-card, .art-btn, .circ-btn,' +
      ' .load-more-btn, .home-link, .merch-card, .entity-card, .video-card,' +
      ' .album-card, .game-card, .jtnav-mob-link'
    );
    if (!el || el.disabled) return;
    el.classList.remove('jt-press');
    void el.offsetWidth;
    el.classList.add('jt-press');
    el.addEventListener('animationend', function() { el.classList.remove('jt-press'); }, { once: true });
  }, { passive: true });
})();
