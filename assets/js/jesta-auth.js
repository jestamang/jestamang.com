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
    '#jtnav-auth-sep{width:1px;height:20px;background:rgba(201,168,76,0.3);margin:0 10px;flex-shrink:0}',
    '.jtnav-auth-link{font-family:\'Luminari\',serif;font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:rgba(201,168,76,0.75);text-decoration:none;padding:0 8px;white-space:nowrap;transition:color 0.2s;line-height:52px}',
    '.jtnav-auth-link:hover{color:#c9a84c}',
    '.jtnav-auth-star{font-size:0.8rem;color:rgba(201,168,76,0.55);text-decoration:none;padding:0 6px;line-height:52px;transition:color 0.2s}',
    '.jtnav-auth-star:hover{color:#c9a84c}',
    '@media(max-width:767px){#jtnav-auth{display:none}}'
  ].join('');
  document.head.appendChild(style);

  // ── Insert auth container into #jtnav ────────────────────────
  function insertAuthNav() {
    var toggle = document.getElementById('jtnav-mobile-toggle');
    if (!toggle) return;
    var wrap = document.createElement('div');
    wrap.id = 'jtnav-auth';
    toggle.parentNode.insertBefore(wrap, toggle);

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

  // ── Update nav based on auth state ───────────────────────────
  function updateNav(user) {
    var wrap = document.getElementById('jtnav-auth');
    var mobWrap = document.getElementById('jtnav-mob-auth');
    if (!wrap) return;

    if (user) {
      var name = (user.displayName || user.email || '').split('@')[0];
      var shortName = name.length > 14 ? name.slice(0, 12) + '…' : name;
      wrap.innerHTML =
        '<div id="jtnav-auth-sep"></div>' +
        '<a class="jtnav-auth-link" href="profile.html" title="Your Dossier">' + shortName + '</a>' +
        '<a class="jtnav-auth-star" href="members.html" title="Inner Circle">✦</a>';
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
    } else {
      wrap.innerHTML =
        '<div id="jtnav-auth-sep"></div>' +
        '<a class="jtnav-auth-link" href="login.html">Log in</a>';
      if (mobWrap) {
        mobWrap.innerHTML =
          '<div class="jtnav-mob-divider"></div>' +
          '<a class="jtnav-mob-link" href="login.html">Enter the Circle</a>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertAuthNav);
  } else {
    insertAuthNav();
  }
})();
