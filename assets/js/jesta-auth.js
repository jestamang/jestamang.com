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
    '#jtnav-mob-login{font-family:\'Luminari\',serif!important;color:#c9a84c!important;font-size:0.62rem!important;letter-spacing:0.16em!important;text-transform:uppercase!important;transition:opacity 0.2s!important}',
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
        '<a class="jtnav-mob-link" href="members.html">Inner Circle</a>' +
        '<a class="jtnav-mob-link" href="#" id="jtnav-mob-so">Depart for Now</a>';
      var so = document.getElementById('jtnav-mob-so');
      if (so) so.addEventListener('click', function (e) {
        e.preventDefault();
        window.jestaAuth.signOut();
      });
    }
  }

  // ── Update nav based on auth state ───────────────────────────
  function updateNav(user) {
    var wrap = document.getElementById('jtnav-auth');
    var mobWrap = document.getElementById('jtnav-mob-auth');
    if (!wrap) return;

    var mobLogin = document.getElementById('jtnav-mob-login');
    if (user) {
      var fallback = (user.displayName || user.email || '').split('@')[0];
      renderAuthNav(wrap, mobWrap, fallback);
      if (mobLogin) { mobLogin.href = 'profile.html'; mobLogin.textContent = fallback.length > 10 ? fallback.slice(0,9)+'\u2026' : fallback; }
      if (window.jestaDB) {
        window.jestaDB.collection('users').doc(user.uid).get()
          .then(function (doc) {
            var name = (doc.exists && doc.data().username) ? doc.data().username : fallback;
            renderAuthNav(wrap, mobWrap, name);
            if (mobLogin) { mobLogin.href = 'profile.html'; mobLogin.textContent = name.length > 10 ? name.slice(0,9)+'\u2026' : name; }
          })
          .catch(function () {});
      }
    } else {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertAuthNav);
  } else {
    insertAuthNav();
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
