(function(){
  'use strict';
  // ── Shared helpers ──
  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function fmtDate(ts){ if(!ts)return'\u2014'; var d=ts.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  function fmtTime(ts){ if(!ts)return'\u2014'; var d=ts.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }

  /* ══════════════ SECTION 11: LEADERBOARD MANAGER ══════════════ */
  var lbCurrentGame = 'void';
  var lbAllScores   = [];
  var lbFilter      = '';

  var LB_GAMES = {
    'void':             'The Void',
    'cosmic-conductor': 'Cosmic Conductor',
    'pitch-oracle':     'Pitch Oracle',
    'rhythm-architect': 'Rhythm Architect',
    'chord-conjurer':   'Chord Conjurer',
    'memory':           'Memory Vault'
  };

  function initLeaderboards() {
    document.getElementById('lb-tab-bar').querySelectorAll('.tab-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        document.getElementById('lb-tab-bar').querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
        this.classList.add('active');
        lbCurrentGame = this.getAttribute('data-lbtab');
        lbFilter = document.getElementById('lb-search').value.toLowerCase();
        loadLbScores();
      });
    });
    var _lbSearch=document.getElementById('lb-search');if(_lbSearch)_lbSearch.addEventListener('input', function(){
      lbFilter = this.value.toLowerCase();
      renderLbTable();
    });
    var _lbSelectAll=document.getElementById('lb-select-all');if(_lbSelectAll)_lbSelectAll.addEventListener('change', function(){
      document.querySelectorAll('.lb-row-check').forEach(function(cb){cb.checked=this.checked;},this);
    });
    var _lbThCheck=document.getElementById('lb-th-check');if(_lbThCheck)_lbThCheck.addEventListener('change', function(){
      document.querySelectorAll('.lb-row-check').forEach(function(cb){cb.checked=this.checked;},this);
    });
    var _lbDeleteSelected=document.getElementById('lb-delete-selected');if(_lbDeleteSelected)_lbDeleteSelected.addEventListener('click', function(){
      var checked = Array.from(document.querySelectorAll('.lb-row-check:checked'));
      if(!checked.length){document.getElementById('lb-status').textContent='None selected.';return;}
      if(!confirm('Delete '+checked.length+' selected score(s)?')) return;
      var batch = window.jestaDB.batch();
      checked.forEach(function(cb){
        batch.delete(window.jestaDB.collection('leaderboards').doc(lbCurrentGame).collection('scores').doc(cb.value));
      });
      batch.commit().then(function(){
        document.getElementById('lb-status').textContent='Deleted '+checked.length+' score(s) \u2726';
        document.getElementById('lb-status').className='status-msg status-ok';
        loadLbScores();
      }).catch(function(e){
        document.getElementById('lb-status').textContent='Error: '+e.message;
        document.getElementById('lb-status').className='status-msg status-err';
      });
    });
    loadLbScores();
  }

  function loadLbScores() {
    var tbody = document.getElementById('lb-table-body');
    tbody.innerHTML='<tr><td colspan="6" style="color:rgba(201,168,76,0.2);font-size:0.7rem;padding:14px 0;">Loading...</td></tr>';
    document.getElementById('lb-stats').innerHTML='';
    // Try nested scores sub-collection first
    window.jestaDB.collection('leaderboards').doc(lbCurrentGame).collection('scores')
      .orderBy('score','desc').limit(100).get()
      .then(function(snap){
        lbAllScores=[];
        snap.forEach(function(doc){ lbAllScores.push({id:doc.id,d:doc.data()}); });
        if(!lbAllScores.length){
          // Fallback: flat collection keyed by game
          return window.jestaDB.collection('leaderboards').where('game','==',lbCurrentGame).orderBy('score','desc').limit(100).get()
            .then(function(s2){ s2.forEach(function(doc){ lbAllScores.push({id:doc.id,d:doc.data()}); }); });
        }
      }).catch(function(){
        return window.jestaDB.collection('leaderboards').where('game','==',lbCurrentGame).orderBy('score','desc').limit(100).get()
          .catch(function(){});
      }).finally(function(){
        renderLbTable();
        renderLbStats();
      });
  }

  function renderLbTable() {
    var filtered = lbAllScores.filter(function(s){
      if(!lbFilter) return true;
      return (s.d.name||s.d.displayName||'').toLowerCase().includes(lbFilter)
          || (s.d.username||'').toLowerCase().includes(lbFilter);
    });
    var tbody = document.getElementById('lb-table-body');
    if(!filtered.length){tbody.innerHTML='<tr><td colspan="6" style="color:rgba(201,168,76,0.2);font-size:0.7rem;padding:14px 0;">No scores found.</td></tr>';return;}
    var html='';
    filtered.forEach(function(s,i){
      var d=s.d;
      var name=esc(d.name||d.displayName||d.username||'Unknown');
      var score=esc(String(d.score||0));
      var date=fmtDate(d.timestamp||d.date);
      html+='<tr id="lb-row-'+s.id+'">'
        +'<td><input type="checkbox" class="lb-row-check" value="'+s.id+'" style="accent-color:#c9a84c;width:13px;height:13px;"></td>'
        +'<td style="color:#c9a84c;">'+(i+1)+'</td>'
        +'<td>'+name+'</td>'
        +'<td>'+score+'</td>'
        +'<td style="font-size:0.65rem;">'+date+'</td>'
        +'<td><button class="btn-danger btn-sm" onclick="deleteLbScore(\''+s.id+'\')">Delete</button></td>'
        +'</tr>';
    });
    tbody.innerHTML=html;
  }

  function renderLbStats() {
    var el=document.getElementById('lb-stats');
    if(!lbAllScores.length){el.innerHTML='';return;}
    var scores=lbAllScores.map(function(s){return s.d.score||0;});
    var highest=Math.max.apply(null,scores);
    var playerCounts={};
    lbAllScores.forEach(function(s){
      var n=s.d.name||s.d.displayName||s.d.username||'Unknown';
      playerCounts[n]=(playerCounts[n]||0)+1;
    });
    var topPlayer=Object.keys(playerCounts).sort(function(a,b){return playerCounts[b]-playerCounts[a];})[0]||'—';
    var latest=lbAllScores[0]?fmtDate(lbAllScores[0].d.timestamp||lbAllScores[0].d.date):'—';
    el.innerHTML=[
      ['Total Scores',lbAllScores.length],
      ['Highest',highest],
      ['Most Active',topPlayer],
      ['Latest',latest]
    ].map(function(s){
      return '<div class="stat-card" style="min-width:100px;padding:12px 10px;">'
        +'<div class="stat-num" style="font-size:1.1rem;">'+esc(String(s[1]))+'</div>'
        +'<div class="stat-label">'+s[0]+'</div></div>';
    }).join('');
  }

  window.deleteLbScore = function(id){
    if(!confirm('Delete this score from the scrolls?')) return;
    var statusEl = document.getElementById('lb-status');
    var rowEl = document.getElementById('lb-row-'+id);
    if(rowEl){ rowEl.style.opacity='0.4'; rowEl.style.pointerEvents='none'; }
    window.jestaDB.collection('leaderboards').doc(lbCurrentGame).collection('scores').doc(id).delete()
      .then(function(){
        if(rowEl) rowEl.remove();
        lbAllScores=lbAllScores.filter(function(s){return s.id!==id;});
        renderLbStats();
        if(statusEl){ statusEl.textContent='Score deleted \u2726'; statusEl.className='status-msg status-ok'; }
      })
      .catch(function(e){
        console.error('deleteLbScore error:', e);
        if(rowEl){ rowEl.style.opacity=''; rowEl.style.pointerEvents=''; }
        if(statusEl){
          statusEl.textContent='Delete failed: '+(e.message||e.code||String(e));
          statusEl.className='status-msg status-err';
        }
      });
  };


  /* ══════════════ SECTION 16: GAME ANALYTICS ══════════════ */
  function initGameAnalytics() {
    var LB_KEYS = Object.keys(LB_GAMES);
    var allData = {};

    function timeAgo(ts) {
      if (!ts) return '\u2014';
      var d = ts.toDate ? ts.toDate() : new Date(ts);
      var sec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (sec < 60)    return sec + 's ago';
      if (sec < 3600)  return Math.floor(sec / 60) + 'm ago';
      if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
      return Math.floor(sec / 86400) + 'd ago';
    }

    var promises = LB_KEYS.map(function (k) {
      return window.jestaDB.collection('leaderboards').doc(k).collection('scores')
        .orderBy('score','desc').limit(200).get()
        .then(function (snap) {
          allData[k] = [];
          snap.forEach(function (doc) { allData[k].push({ id: doc.id, d: doc.data() }); });
        }).catch(function () { allData[k] = []; });
    });

    Promise.all(promises).then(function () {
      renderMostPlayed();
      renderTopPlayers();
      renderRecentActivity();
      renderGameHealth();
    });

    function renderMostPlayed() {
      var el = document.getElementById('ga-most-played');
      var counts = LB_KEYS.map(function (k) { return { name: LB_GAMES[k], count: (allData[k]||[]).length }; });
      counts.sort(function (a,b) { return b.count - a.count; });
      var max = counts.length && counts[0].count > 0 ? counts[0].count : 1;
      el.innerHTML = counts.map(function (g) {
        var pct = Math.round((g.count / max) * 100);
        return '<div style="margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:0.68rem;letter-spacing:0.1em;margin-bottom:4px;"><span>' + esc(g.name) + '</span><span style="color:#c9a84c;">' + g.count + ' plays</span></div>'
          + '<div style="height:5px;background:rgba(201,168,76,0.08);border-radius:3px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#c9a84c,rgba(201,168,76,0.35));border-radius:3px;"></div>'
          + '</div></div>';
      }).join('') || '<div style="color:rgba(201,168,76,0.2);font-size:0.7rem;">No data yet.</div>';
    }

    function renderTopPlayers() {
      var el = document.getElementById('ga-top-players');
      var playerMap = {};
      LB_KEYS.forEach(function (k) {
        (allData[k]||[]).forEach(function (s) {
          var name = s.d.name || s.d.displayName || s.d.username || 'Unknown';
          var uid  = s.d.uid || name;
          if (!playerMap[uid]) playerMap[uid] = { name: name, total: 0, games: {} };
          playerMap[uid].total++;
          playerMap[uid].games[k] = true;
        });
      });
      var players = Object.keys(playerMap).map(function(k){return playerMap[k];})
        .sort(function(a,b){return b.total - a.total;}).slice(0,10);
      if (!players.length) { el.innerHTML='<div style="color:rgba(201,168,76,0.2);font-size:0.7rem;">No data yet.</div>'; return; }
      el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.7rem;">'
        + '<thead><tr style="color:rgba(201,168,76,0.4);text-align:left;">'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">#</th>'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">Player</th>'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">Submissions</th>'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">Games</th>'
        + '</tr></thead><tbody>'
        + players.map(function (p, i) {
            return '<tr style="border-bottom:1px solid rgba(201,168,76,0.06);">'
              + '<td style="padding:6px 8px;color:#c9a84c;">' + (i+1) + '</td>'
              + '<td style="padding:6px 8px;">' + esc(p.name) + '</td>'
              + '<td style="padding:6px 8px;">' + p.total + '</td>'
              + '<td style="padding:6px 8px;">' + Object.keys(p.games).length + '</td>'
              + '</tr>';
          }).join('')
        + '</tbody></table>';
    }

    function renderRecentActivity() {
      var el = document.getElementById('ga-recent');
      var all = [];
      LB_KEYS.forEach(function (k) {
        (allData[k]||[]).forEach(function (s) { all.push({ gameName: LB_GAMES[k], d: s.d }); });
      });
      all.sort(function (a,b) {
        var ta = a.d.timestamp || a.d.date; var tb = b.d.timestamp || b.d.date;
        return ((tb&&tb.seconds)||0) - ((ta&&ta.seconds)||0);
      });
      var recent = all.slice(0,10);
      if (!recent.length) { el.innerHTML='<div style="color:rgba(201,168,76,0.2);font-size:0.7rem;">No activity yet.</div>'; return; }
      el.innerHTML = recent.map(function (r) {
        var name = r.d.name || r.d.displayName || r.d.username || 'Unknown';
        return '<div style="padding:8px 0;border-bottom:1px solid rgba(201,168,76,0.06);font-size:0.7rem;">'
          + '<span style="color:#c9a84c;">' + esc(name) + '</span>'
          + ' scored <span style="color:#c9a84c;">' + (r.d.score || 0) + '</span>'
          + ' in ' + esc(r.gameName)
          + ' <span style="color:rgba(201,168,76,0.3);font-size:0.62rem;">' + timeAgo(r.d.timestamp || r.d.date) + '</span>'
          + '</div>';
      }).join('');
    }

    function renderGameHealth() {
      var el = document.getElementById('ga-health');
      el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.7rem;">'
        + '<thead><tr style="color:rgba(201,168,76,0.4);text-align:left;">'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">Game</th>'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">Plays</th>'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">High Score</th>'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">Avg</th>'
        + '<th style="padding:6px 8px;font-weight:normal;letter-spacing:0.15em;">Last Played</th>'
        + '</tr></thead><tbody>'
        + LB_KEYS.map(function (k) {
            var scores = (allData[k]||[]).map(function(s){return s.d.score||0;});
            var count  = scores.length;
            var high   = count ? Math.max.apply(null, scores) : '\u2014';
            var avg    = count ? Math.round(scores.reduce(function(a,b){return a+b;},0)/count) : '\u2014';
            var ts     = (allData[k]||[]).map(function(s){return s.d.timestamp||s.d.date;}).filter(Boolean)
                          .sort(function(a,b){return((b&&b.seconds)||0)-((a&&a.seconds)||0);})[0];
            return '<tr style="border-bottom:1px solid rgba(201,168,76,0.06);">'
              + '<td style="padding:6px 8px;color:#c9a84c;">' + esc(LB_GAMES[k]) + '</td>'
              + '<td style="padding:6px 8px;">' + count + '</td>'
              + '<td style="padding:6px 8px;">' + high + '</td>'
              + '<td style="padding:6px 8px;">' + avg + '</td>'
              + '<td style="padding:6px 8px;font-size:0.62rem;">' + (ts ? fmtDate(ts) : '\u2014') + '</td>'
              + '</tr>';
          }).join('')
        + '</tbody></table>';
    }
  }


  /* ══════════════ SECTION 22: SIGIL CARD EDITOR ══════════════ */
  var _sigilCards = [
    {arcana:'I \u00b7 The Jester',       name:'The Jester',        glyph:'\u03a8', reading:'What is given freely multiplies. What is hoarded rots. The Jester sees your open hands and grins \u2014 this is the correct posture.'},
    {arcana:'II \u00b7 Origin',           name:'The Prickly Being', glyph:'\u2736', reading:'A small divine presence has left its marks on your chest. Do not wash them. They are proof of something most will never receive.'},
    {arcana:'III \u00b7 Motion',          name:'The Parade',        glyph:'\u21af', reading:'Movement is the ritual. The direction matters less than the act of beginning. Set your feet in motion \u2014 the path reveals itself under moving feet.'},
    {arcana:'IV \u00b7 Season',           name:'The New \u00c6on',  glyph:'\u00c6', reading:'The old season does not argue with the new one. It simply yields. Something in you is ready to yield. Let it.'},
    {arcana:'V \u00b7 Signal',            name:'The Metropolis',    glyph:'\u2318', reading:'The city speaks to those who have learned its dialect. What sounds like noise to others is transmission to you. Listen deeper.'},
    {arcana:'VI \u00b7 Whole',            name:'The 600',           glyph:'\u229b', reading:'The number is not large \u2014 it is complete. One contains the whole. You already hold everything required for this moment.'},
    {arcana:'VII \u00b7 Freedom',         name:'The Circus',        glyph:'\u03a9', reading:'Your cage was assembled from your own hesitation. The door was never locked. You simply forgot to check.'},
    {arcana:'VIII \u00b7 Sleep',          name:'The Dream',         glyph:'\u224b', reading:'What visited you while you slept was not imaginary. The frenzied realm of dreams is where the real work is done.'},
    {arcana:'IX \u00b7 Depth',            name:'The Swamp',         glyph:'\u223f', reading:'From the murk rise the most vivid creatures. The clarity you seek is not found in clean water \u2014 it is found in depth.'},
    {arcana:'X \u00b7 Wheel',             name:'The Solstice',      glyph:'\u273a', reading:'The calendar is not neutral. Whoever controls the seasons controls the energy. Reclaim your place on the wheel.'},
    {arcana:'XI \u00b7 Recognition',      name:'The Chosen Few',    glyph:'\u2042', reading:'To be chosen is not to be selected. It is to have always been. You were not called \u2014 you were recognized.'},
    {arcana:'XII \u00b7 Threshold',       name:'The Portal',        glyph:'\u2295', reading:'A door appears only to those already standing before it. You would not sense the threshold if you were not meant to cross it.'},
    {arcana:'XIII \u00b7 Time',           name:'The Rhythm',        glyph:'\u2341', reading:'Every soul moves in time whether it hears the music or not. The question is not whether you are dancing \u2014 it is whether you know it.'},
    {arcana:'XIV \u00b7 Light',           name:'The Gold',          glyph:'\u25ca', reading:'Not all that shines asks to be spent. Some things are kept luminous simply by being witnessed. Bear witness today.'},
    {arcana:'XV \u00b7 Mark',             name:'The Claws',         glyph:'\u2357', reading:'The small marks on your chest are not wounds \u2014 they are signatures. Something vast has signed its name into your skin.'},
    {arcana:'XVI \u00b7 Unseen',          name:'The Veil',          glyph:'\u2240', reading:'What you cannot see is watching with tremendous interest. This is not threat. This is the most affectionate form of attention there is.'},
    {arcana:'XVII \u00b7 Rite',           name:'The Pagan',         glyph:'\u2297', reading:'No institution owns your ceremony. No government holds the patent on your reverence. The rite you build yourself is the only holy one.'},
    {arcana:'XVIII \u00b7 Memory',        name:'The Blood',         glyph:'\u2347', reading:'The wound remembers what the mind chooses to forget. What pulses in you is older than your name and wiser than your fear.'},
    {arcana:'XIX \u00b7 Mirror',          name:'The Fat Head',      glyph:'\u2299', reading:'The jesting being grins when you call it deity. But you are right to call it so. Feed it no further flattery \u2014 it has quite enough already.'},
    {arcana:'XX \u00b7 Witness',          name:'The Children',      glyph:'\u2055', reading:'Core 6. Chosen few. Born from the dew of a swampy imagination. They do not ask to be understood \u2014 only witnessed. Are you watching?'},
    {arcana:'XXI \u00b7 Fire',            name:'The Circus Spits',  glyph:'\u2051', reading:'Free, free, FREE! Marvellous \u2014 miraculous \u2014 meticulous creations beyond the limits of those fussy gods. Today you are one of them. Create without a single shred of doubt.'},
    {arcana:'XXII \u00b7 Void',           name:'The Drift',         glyph:'\u25cb', reading:'There is no floor here and that is the point. Stop searching for solid ground in a place that was never meant to hold weight. Float. The drift is not failure \u2014 it is the oldest form of navigation.'},
    {arcana:'XXIII \u00b7 Return',        name:'The Coming Back',   glyph:'\u21ba', reading:'You have left this place before and returned changed. You will do it again. The leaving is not abandonment \u2014 it is how the self collects what it needs before walking back through the door.'}
  ];

  function initSigilCardEditor() {
    var container = document.getElementById('sc-cards');
    var allStatus = document.getElementById('sc-all-status');

    // Load from Firestore if saved; otherwise use defaults
    window.jestaDB.collection('sigilCards').doc('cards').get().then(function(doc) {
      if (doc.exists && doc.data().cards && doc.data().cards.length) {
        _sigilCards = doc.data().cards;
      }
      renderCards();
    }).catch(function() { renderCards(); });

    function renderCards() {
      container.innerHTML = '';
      _sigilCards.forEach(function(card, i) {
        var wrap = document.createElement('div');
        wrap.id = 'sc-card-' + i;
        wrap.style.cssText = 'background:rgba(5,3,1,0.6);border:1px solid rgba(201,168,76,0.12);padding:18px;margin-bottom:14px;border-radius:2px;';
        wrap.innerHTML =
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">'
          // Left: edit fields
          + '<div>'
          + '<div style="font-size:0.58rem;letter-spacing:0.28em;text-transform:uppercase;color:rgba(201,168,76,0.35);margin-bottom:12px;">Card ' + (i+1) + '</div>'
          + '<label class="field-label">Arcana</label>'
          + '<input class="field-input sc-arcana" data-idx="' + i + '" value="' + esc(card.arcana) + '" maxlength="60" style="margin-bottom:8px;">'
          + '<label class="field-label">Name</label>'
          + '<input class="field-input sc-name" data-idx="' + i + '" value="' + esc(card.name) + '" maxlength="60" style="margin-bottom:8px;">'
          + '<label class="field-label">Glyph</label>'
          + '<input class="field-input sc-glyph" data-idx="' + i + '" value="' + esc(card.glyph) + '" maxlength="2" style="width:60px;margin-bottom:8px;text-align:center;font-size:1.2rem;">'
          + '<label class="field-label">Reading</label>'
          + '<textarea class="field-input field-textarea sc-reading" data-idx="' + i + '" rows="3" maxlength="500" style="margin-bottom:12px;">' + esc(card.reading) + '</textarea>'
          + '<button class="btn-ghost btn-sm sc-save-one" data-idx="' + i + '" style="letter-spacing:0.2em;">SAVE CARD \u2746</button>'
          + '<div class="sc-card-status status-msg" style="margin-top:6px;font-size:0.65rem;"></div>'
          + '</div>'
          // Right: live preview
          + '<div>'
          + '<div style="font-size:0.58rem;letter-spacing:0.28em;text-transform:uppercase;color:rgba(201,168,76,0.35);margin-bottom:12px;">Preview</div>'
          + '<div class="sc-preview" data-idx="' + i + '" style="background:#0a0804;border:1px solid rgba(201,168,76,0.35);border-radius:4px;padding:20px;min-height:180px;text-align:center;">'
          + '<div class="sc-prev-glyph" style="font-size:2rem;color:rgba(201,168,76,0.6);margin-bottom:8px;">' + esc(card.glyph) + '</div>'
          + '<div class="sc-prev-arcana" style="font-size:0.55rem;letter-spacing:0.3em;text-transform:uppercase;color:rgba(201,168,76,0.4);margin-bottom:4px;">' + esc(card.arcana) + '</div>'
          + '<div class="sc-prev-name" style="font-family:\'Luminari\',Georgia,serif;font-size:0.85rem;letter-spacing:0.2em;color:#c9a84c;margin-bottom:12px;">' + esc(card.name) + '</div>'
          + '<div class="sc-prev-reading" style="font-size:0.62rem;color:rgba(240,230,210,0.85);line-height:1.7;font-style:italic;">' + esc(card.reading) + '</div>'
          + '</div>'
          + '</div>'
          + '</div>';
        container.appendChild(wrap);
      });

      // Wire live preview updates
      container.querySelectorAll('.sc-arcana,.sc-name,.sc-glyph,.sc-reading').forEach(function(inp) {
        inp.addEventListener('input', function() {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          var wrap = document.getElementById('sc-card-' + idx);
          var prev = wrap.querySelector('.sc-preview');
          prev.querySelector('.sc-prev-arcana').textContent  = wrap.querySelector('.sc-arcana').value;
          prev.querySelector('.sc-prev-name').textContent    = wrap.querySelector('.sc-name').value;
          prev.querySelector('.sc-prev-glyph').textContent   = wrap.querySelector('.sc-glyph').value;
          prev.querySelector('.sc-prev-reading').textContent = wrap.querySelector('.sc-reading').value;
          // Keep _sigilCards in sync
          _sigilCards[idx].arcana  = wrap.querySelector('.sc-arcana').value;
          _sigilCards[idx].name    = wrap.querySelector('.sc-name').value;
          _sigilCards[idx].glyph   = wrap.querySelector('.sc-glyph').value;
          _sigilCards[idx].reading = wrap.querySelector('.sc-reading').value;
        });
      });

      // Individual save buttons
      container.querySelectorAll('.sc-save-one').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          var statusEl = document.getElementById('sc-card-' + idx).querySelector('.sc-card-status');
          btn.disabled = true;
          window.jestaDB.collection('sigilCards').doc('cards').set({
            cards: _sigilCards,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(function() {
            statusEl.textContent = 'SAVED \u2726';
            statusEl.className = 'sc-card-status status-msg status-ok';
            btn.disabled = false;
            setTimeout(function(){ statusEl.textContent=''; }, 2500);
          }).catch(function(e) {
            statusEl.textContent = 'Error: ' + e.message;
            statusEl.className = 'sc-card-status status-msg status-err';
            btn.disabled = false;
          });
        });
      });
    }

    // Save All button
    var _scSaveAllBtn=document.getElementById('sc-save-all-btn');if(_scSaveAllBtn)_scSaveAllBtn.addEventListener('click', function() {
      this.disabled = true;
      allStatus.textContent = 'Saving all cards...';
      allStatus.className = 'status-msg';
      window.jestaDB.collection('sigilCards').doc('cards').set({
        cards: _sigilCards,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function() {
        allStatus.textContent = 'ALL CARDS SAVED \u2726';
        allStatus.className = 'status-msg status-ok';
        document.getElementById('sc-save-all-btn').disabled = false;
      }).catch(function(e) {
        allStatus.textContent = 'Error: ' + e.message;
        allStatus.className = 'status-msg status-err';
        document.getElementById('sc-save-all-btn').disabled = false;
      });
    });
  }


  // Expose init functions globally so the main admin IIFE can call them
  window.LB_GAMES             = LB_GAMES;
  window.initLeaderboards     = initLeaderboards;
  window.initGameAnalytics    = initGameAnalytics;
  window.initSigilCardEditor  = initSigilCardEditor;
})();
