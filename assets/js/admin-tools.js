// ── Backup Dashboard ──
(function(){
  /* ══════════════ SECTION 20: BACKUP DASHBOARD ══════════════ */
  function initBackupDashboard() {
    var MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

    function toRomanLocal(n) {
      var v=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
      var s=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
      var r=''; for(var i=0;i<v.length;i++){while(n>=v[i]){r+=s[i];n-=v[i];}} return r;
    }

    function ritualDateLocal(d) {
      return MONTHS[d.getMonth()] + ' \u00b7 ' + toRomanLocal(d.getDate()) + ' \u00b7 ' + toRomanLocal(d.getFullYear());
    }

    function updateLastBackupUI() {
      var ts = localStorage.getItem('lastBackupDate');
      var lastEl = document.getElementById('bk-last');
      var reminderEl = document.getElementById('bk-reminder');
      if (!ts) {
        lastEl.textContent = 'NO BACKUP ON RECORD';
        reminderEl.style.display = 'none';
        return;
      }
      var d = new Date(parseInt(ts, 10));
      lastEl.textContent = 'LAST BACKUP: ' + ritualDateLocal(d);
      var daysSince = (Date.now() - d.getTime()) / 86400000;
      reminderEl.style.display = daysSince > 30 ? 'block' : 'none';
    }
    updateLastBackupUI();

    function downloadJSON(data, filename) {
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem('lastBackupDate', String(Date.now()));
      updateLastBackupUI();
      var mb = (json.length / 1048576).toFixed(2);
      return mb;
    }

    function dateStamp() {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    function readCollection(col) {
      return window.jestaDB.collection(col).get().then(function (snap) {
        var docs = [];
        snap.forEach(function (doc) {
          var raw = doc.data();
          // Serialize Firestore Timestamps to ISO strings
          var serialized = {};
          Object.keys(raw).forEach(function (k) {
            var v = raw[k];
            serialized[k] = (v && v.toDate) ? v.toDate().toISOString() : v;
          });
          docs.push({ id: doc.id, data: serialized });
        });
        return docs;
      });
    }

    // Individual collection buttons
    document.getElementById('bk-individual-grid').querySelectorAll('[data-bk-col]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var col    = this.getAttribute('data-bk-col');
        var file   = this.getAttribute('data-bk-file');
        var statusEl = document.getElementById('bk-ind-status');
        this.disabled = true;
        statusEl.textContent = 'Archiving...';
        statusEl.className = 'status-msg';
        var self = this;
        readCollection(col).then(function (docs) {
          var mb = downloadJSON({ exportedAt: new Date().toISOString(), collection: col, docs: docs },
            'jestamang-' + file + '-' + dateStamp() + '.json');
          statusEl.textContent = 'BACKUP DOWNLOADED \u2726 ' + mb + ' MB';
          statusEl.className = 'status-msg status-ok';
          self.disabled = false;
        }).catch(function (e) {
          statusEl.textContent = 'Error: ' + e.message;
          statusEl.className = 'status-msg status-err';
          self.disabled = false;
        });
      });
    });

    // Full backup
    var allBtn    = document.getElementById('bk-all-btn');
    var allStatus = document.getElementById('bk-all-status');
    var ALL_COLS  = ['users','blogPosts','shows','pressArticles','releases',
                     'leaderboards','notifications','inquiries','guestbook',
                     'navBadges','emailCampaigns','videos','merch','sigilCards'];

    allBtn.addEventListener('click', function () {
      allBtn.disabled = true;
      allStatus.textContent = 'ARCHIVING THE UNIVERSE...';
      allStatus.className = 'status-msg';

      var promises = ALL_COLS.map(function (col) {
        return readCollection(col).then(function (docs) { return { col: col, docs: docs }; })
          .catch(function () { return { col: col, docs: [] }; });
      });

      Promise.all(promises).then(function (results) {
        var payload = { exportedAt: new Date().toISOString(), collections: {} };
        results.forEach(function (r) { payload.collections[r.col] = r.docs; });
        var mb = downloadJSON(payload, 'jestamang-full-backup-' + dateStamp() + '.json');
        allStatus.textContent = 'BACKUP DOWNLOADED \u2726 ' + mb + ' MB';
        allStatus.className = 'status-msg status-ok';
        allBtn.disabled = false;
      }).catch(function (e) {
        allStatus.textContent = 'Error: ' + e.message;
        allStatus.className = 'status-msg status-err';
        allBtn.disabled = false;
      });
    });
  }

  window.initBackupDashboard = initBackupDashboard;
})();

// ── Caption Editor ──
(function(){
/* ── Caption Editor ── */
var _capDocs = [];  // flat array of caption objects (with ._idx)

function capEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function capLoad(){
  var el = document.getElementById('cap-list-inner');
  if(el) el.innerHTML = '<div style="color:rgba(201,168,76,0.35);font-size:0.7rem;letter-spacing:0.2em;">Loading\u2026</div>';
  window.jestaDB.collection('siteConfig').doc('captions').get()
    .then(function(doc){
      _capDocs = [];
      if(doc.exists){
        var data = doc.data();
        _capDocs = (data.captions || []).map(function(c,i){ return Object.assign({},c,{_idx:i}); });
      }
      capRenderList();
    })
    .catch(function(e){
      var el2 = document.getElementById('cap-list-inner');
      if(el2) el2.innerHTML = '<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Load error: '+capEsc(e.message)+'</div>';
    });
}

function capRenderList(){
  var el = document.getElementById('cap-list-inner');
  if(!el) return;
  if(!_capDocs.length){ el.innerHTML = '<div style="color:rgba(201,168,76,0.3);font-size:0.7rem;letter-spacing:0.18em;">No captions saved yet.</div>'; return; }
  var html = '<table style="width:100%;border-collapse:collapse;font-size:0.68rem;">'
    + '<thead><tr style="border-bottom:1px solid rgba(201,168,76,0.2);">'
    + '<th style="text-align:left;padding:6px 8px;color:rgba(201,168,76,0.6);letter-spacing:0.2em;font-weight:normal;">Label</th>'
    + '<th style="text-align:left;padding:6px 8px;color:rgba(201,168,76,0.6);letter-spacing:0.2em;font-weight:normal;">Page</th>'
    + '<th style="text-align:left;padding:6px 8px;color:rgba(201,168,76,0.6);letter-spacing:0.2em;font-weight:normal;">Selector</th>'
    + '<th style="text-align:left;padding:6px 8px;color:rgba(201,168,76,0.6);letter-spacing:0.2em;font-weight:normal;">Text Preview</th>'
    + '<th style="padding:6px 8px;"></th>'
    + '</tr></thead><tbody>';
  _capDocs.forEach(function(c){
    var preview = (c.text||'').length > 60 ? c.text.slice(0,57)+'\u2026' : (c.text||'');
    html += '<tr id="cap-row-'+c._idx+'" style="border-bottom:1px solid rgba(201,168,76,0.07);">'
      + '<td style="padding:7px 8px;color:rgba(240,230,210,0.85);">'+capEsc(c.label||'')+'</td>'
      + '<td style="padding:7px 8px;color:rgba(201,168,76,0.55);">'+capEsc(c.page||'')+'</td>'
      + '<td style="padding:7px 8px;color:rgba(201,168,76,0.45);font-family:monospace;font-size:0.62rem;">'+capEsc(c.selector||'')+'</td>'
      + '<td style="padding:7px 8px;color:rgba(240,230,210,0.6);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+capEsc(preview)+'</td>'
      + '<td style="padding:7px 8px;white-space:nowrap;text-align:right;">'
      + '<button class="btn-ghost" style="font-size:0.6rem;padding:3px 8px;margin-right:4px;" onclick="capEdit('+c._idx+')">Edit</button>'
      + '<button class="btn-ghost" style="font-size:0.6rem;padding:3px 8px;color:rgba(251,56,56,0.75);" onclick="capDelete('+c._idx+')">Delete</button>'
      + '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

window.capEdit = function(idx){
  var c = _capDocs[idx];
  if(!c) return;
  document.getElementById('cap-page').value    = c.page     || 'all';
  document.getElementById('cap-label').value   = c.label    || '';
  document.getElementById('cap-selector').value= c.selector || '';
  document.getElementById('cap-text').value    = c.text     || '';
  document.getElementById('cap-preview').textContent = c.text || '';
  document.getElementById('cap-save-btn').dataset.editIdx = idx;
  document.getElementById('cap-save-btn').textContent = 'Update Caption';
  document.getElementById('sec-30').scrollIntoView({behavior:'smooth',block:'start'});
};

window.capDelete = function(idx){
  var c = _capDocs[idx];
  if(!c) return;
  if(!confirm('Delete caption "' + (c.label||c.selector) + '"?')) return;
  var newList = _capDocs.filter(function(x){ return x._idx !== idx; }).map(function(x,i){
    return { id: x.id||'', page: x.page||'all', selector: x.selector||'', text: x.text||'', label: x.label||'' };
  });
  var statusEl = document.getElementById('cap-status');
  window.jestaDB.collection('siteConfig').doc('captions').set({ captions: newList }, { merge: false })
    .then(function(){
      if(statusEl){ statusEl.textContent = 'Caption deleted \u2726'; statusEl.className = 'status-msg status-ok'; }
      capLoad();
    })
    .catch(function(e){
      if(statusEl){ statusEl.textContent = 'Delete failed: '+(e.message||String(e)); statusEl.className = 'status-msg status-err'; }
    });
};

function capSave(){
  var page     = (document.getElementById('cap-page').value     || '').trim();
  var label    = (document.getElementById('cap-label').value    || '').trim();
  var selector = (document.getElementById('cap-selector').value || '').trim();
  var text     = (document.getElementById('cap-text').value     || '');
  var statusEl = document.getElementById('cap-status');
  if(!selector){ if(statusEl){ statusEl.textContent = 'CSS Selector is required.'; statusEl.className = 'status-msg status-err'; } return; }
  if(!text.trim()){ if(statusEl){ statusEl.textContent = 'Caption text is required.'; statusEl.className = 'status-msg status-err'; } return; }
  var saveBtn = document.getElementById('cap-save-btn');
  var editIdx = saveBtn.dataset.editIdx !== undefined && saveBtn.dataset.editIdx !== '' ? parseInt(saveBtn.dataset.editIdx, 10) : -1;
  // Generate id from label or selector
  var id = label ? label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') : selector.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  id = id || ('cap-' + Date.now());
  var entry = { id: id, page: page, selector: selector, text: text, label: label };
  var newList;
  if(editIdx >= 0 && _capDocs[editIdx]){
    newList = _capDocs.map(function(c,i){
      if(c._idx === editIdx) return entry;
      return { id: c.id||'', page: c.page||'all', selector: c.selector||'', text: c.text||'', label: c.label||'' };
    });
  } else {
    newList = _capDocs.map(function(c){ return { id: c.id||'', page: c.page||'all', selector: c.selector||'', text: c.text||'', label: c.label||'' }; });
    newList.push(entry);
  }
  if(saveBtn){ saveBtn.disabled = true; saveBtn.textContent = 'Saving\u2026'; }
  window.jestaDB.collection('siteConfig').doc('captions').set({ captions: newList }, { merge: false })
    .then(function(){
      if(statusEl){ statusEl.textContent = editIdx >= 0 ? 'Caption updated \u2726' : 'Caption saved \u2726'; statusEl.className = 'status-msg status-ok'; }
      capClear();
      capLoad();
    })
    .catch(function(e){
      if(statusEl){ statusEl.textContent = 'Save failed: '+(e.message||String(e)); statusEl.className = 'status-msg status-err'; }
      if(saveBtn){ saveBtn.disabled = false; saveBtn.textContent = 'Save Caption'; }
    });
}

function capClear(){
  var saveBtn = document.getElementById('cap-save-btn');
  document.getElementById('cap-page').value     = 'all';
  document.getElementById('cap-label').value    = '';
  document.getElementById('cap-selector').value = '';
  document.getElementById('cap-text').value     = '';
  document.getElementById('cap-preview').textContent = '';
  if(saveBtn){ saveBtn.disabled = false; saveBtn.textContent = 'Save Caption'; delete saveBtn.dataset.editIdx; }
}

function capPublish(){
  var statusEl = document.getElementById('cap-status');
  window.jestaDB.collection('siteConfig').doc('cacheVersion').set({ v: Date.now() }, { merge: true })
    .then(function(){
      if(statusEl){ statusEl.textContent = 'Published \u2014 cache busted \u2726'; statusEl.className = 'status-msg status-ok'; }
    })
    .catch(function(e){
      if(statusEl){ statusEl.textContent = 'Publish failed: '+(e.message||String(e)); statusEl.className = 'status-msg status-err'; }
    });
}

/* ── Boot ── */
(function(){
  var textEl = document.getElementById('cap-text');
  var previewEl = document.getElementById('cap-preview');
  if(textEl && previewEl){ textEl.addEventListener('input', function(){ previewEl.textContent = this.value; }); }
  var saveBtn   = document.getElementById('cap-save-btn');
  var clearBtn  = document.getElementById('cap-clear-btn');
  var publishBtn= document.getElementById('cap-publish-btn');
  if(saveBtn)    saveBtn.addEventListener('click', capSave);
  if(clearBtn)   clearBtn.addEventListener('click', capClear);
  if(publishBtn) publishBtn.addEventListener('click', capPublish);
  var _jt=0, _jiv=setInterval(function(){
    if(window.jestaDB){ clearInterval(_jiv); capLoad(); }
    else if(++_jt>80){ clearInterval(_jiv); var el=document.getElementById('cap-list-inner'); if(el) el.innerHTML='<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Firestore unavailable.</div>'; }
  },100);
})();
})();

// ── Text Style Editor ──
(function(){
/* ── Text Style Editor ── */
var _tseStyles = [];
var _tseEditIdx = -1;

function tseEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function tseUpdatePreview(){
  var el=document.getElementById('tse-preview-text');if(!el)return;
  var color=document.getElementById('tse-color-hex').value.trim()||'#c9a84c';
  var opacity=parseFloat(document.getElementById('tse-opacity').value)||1;
  var fsEn=document.getElementById('tse-fs-enable').checked;
  var fsNum=document.getElementById('tse-fs-num').value||'1.4';
  var fsUnit=document.getElementById('tse-fs-unit').value||'rem';
  el.style.color=color;
  el.style.opacity=opacity;
  el.style.fontSize=fsEn?(fsNum+fsUnit):'1.4rem';
}

function tseReadForm(){
  var fsEn=document.getElementById('tse-fs-enable').checked;
  var fsNum=document.getElementById('tse-fs-num').value||'';
  var fsUnit=document.getElementById('tse-fs-unit').value||'rem';
  var id=_tseEditIdx>=0&&_tseStyles[_tseEditIdx]?_tseStyles[_tseEditIdx].id:('rule-'+Date.now());
  return {
    id:id,
    page:document.getElementById('tse-page').value||'all',
    selector:document.getElementById('tse-selector').value.trim(),
    label:document.getElementById('tse-label').value.trim(),
    color:document.getElementById('tse-color-hex').value.trim(),
    opacity:parseFloat(document.getElementById('tse-opacity').value),
    fontSize:fsEn&&fsNum?(fsNum+fsUnit):''
  };
}

function tseClearForm(){
  _tseEditIdx=-1;
  document.getElementById('tse-page').value='all';
  document.getElementById('tse-selector').value='';
  document.getElementById('tse-label').value='';
  document.getElementById('tse-color-wheel').value='#c9a84c';
  document.getElementById('tse-color-hex').value='#c9a84c';
  document.getElementById('tse-opacity').value='1';
  document.getElementById('tse-opacity-val').textContent='1.0';
  document.getElementById('tse-fs-enable').checked=false;
  document.getElementById('tse-fs-num').value='1.4';
  document.getElementById('tse-fs-num').disabled=true;
  document.getElementById('tse-fs-unit').value='rem';
  document.getElementById('tse-fs-unit').disabled=true;
  tseUpdatePreview();
  var btn=document.getElementById('tse-add-btn');if(btn)btn.textContent='Add Rule';
}

function tsePopulateForm(rule){
  _tseEditIdx=_tseStyles.indexOf(rule);
  document.getElementById('tse-page').value=rule.page||'all';
  document.getElementById('tse-selector').value=rule.selector||'';
  document.getElementById('tse-label').value=rule.label||'';
  document.getElementById('tse-color-wheel').value=rule.color||'#c9a84c';
  document.getElementById('tse-color-hex').value=rule.color||'#c9a84c';
  document.getElementById('tse-opacity').value=typeof rule.opacity==='number'?rule.opacity:1;
  document.getElementById('tse-opacity-val').textContent=parseFloat(document.getElementById('tse-opacity').value).toFixed(2);
  var hasFontSize=!!(rule.fontSize);
  document.getElementById('tse-fs-enable').checked=hasFontSize;
  document.getElementById('tse-fs-num').disabled=!hasFontSize;
  document.getElementById('tse-fs-unit').disabled=!hasFontSize;
  if(hasFontSize){
    var fsMatch=rule.fontSize.match(/^([\d.]+)(rem|em|px|vw)$/);
    if(fsMatch){document.getElementById('tse-fs-num').value=fsMatch[1];document.getElementById('tse-fs-unit').value=fsMatch[2];}
  }
  tseUpdatePreview();
  var btn=document.getElementById('tse-add-btn');if(btn)btn.textContent='Save Rule';
  document.getElementById('sec-28').scrollIntoView({behavior:'smooth',block:'start'});
}

function tseRenderRules(){
  var wrap=document.getElementById('tse-rules-wrap');if(!wrap)return;
  if(!_tseStyles.length){wrap.innerHTML='<div style="color:rgba(201,168,76,0.3);font-size:0.7rem;letter-spacing:0.1em;">No rules saved yet.</div>';return;}
  var html='<table class="tse-rule-table"><thead><tr><th>Label</th><th>Page</th><th>Selector</th><th>Color</th><th>Opacity</th><th>Font Size</th><th></th></tr></thead><tbody>';
  _tseStyles.forEach(function(r,i){
    html+='<tr>'
      +'<td>'+tseEsc(r.label||r.id)+'</td>'
      +'<td>'+tseEsc(r.page||'all')+'</td>'
      +'<td style="font-family:monospace;font-size:0.65rem;">'+tseEsc(r.selector||'')+'</td>'
      +'<td><span class="tse-swatch" style="background:'+tseEsc(r.color||'#c9a84c')+'"></span> '+tseEsc(r.color||'')+'</td>'
      +'<td>'+(typeof r.opacity==='number'?r.opacity.toFixed(2):'—')+'</td>'
      +'<td>'+(r.fontSize?tseEsc(r.fontSize):'—')+'</td>'
      +'<td style="white-space:nowrap;">'
      +'<button class="tse-edit-btn" onclick="tseEditRule('+i+')">Edit</button>'
      +'<button class="tse-del-btn" onclick="tseDeleteRule('+i+')">Del</button>'
      +'</td>'
    +'</tr>';
  });
  html+='</tbody></table>';
  wrap.innerHTML=html;
}

window.tseEditRule=function(i){
  var r=_tseStyles[i];if(!r)return;
  tsePopulateForm(r);
};

window.tseDeleteRule=function(i){
  _tseStyles.splice(i,1);
  tseSaveToFirestore(function(){tseRenderRules();});
};

function tseSaveToFirestore(cb){
  if(!window.jestaDB){var s=document.getElementById('tse-status');if(s){s.textContent='Firestore not ready.';s.className='status-msg status-err';}return;}
  window.jestaDB.collection('siteConfig').doc('textStyles').set({styles:_tseStyles},{merge:true})
    .then(function(){if(cb)cb();})
    .catch(function(e){var s=document.getElementById('tse-status');if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}});
}

function tseLoad(){
  if(!window.jestaDB)return;
  window.jestaDB.collection('siteConfig').doc('textStyles').get()
    .then(function(doc){
      _tseStyles=doc.exists&&Array.isArray(doc.data().styles)?doc.data().styles:[];
      tseRenderRules();
    })
    .catch(function(){tseRenderRules();});
}

/* ── Wire up controls ── */
(function(){
  /* Color wheel ↔ hex sync */
  var wheel=document.getElementById('tse-color-wheel');
  var hex=document.getElementById('tse-color-hex');
  if(wheel)wheel.addEventListener('input',function(){hex.value=wheel.value;tseUpdatePreview();});
  if(hex)hex.addEventListener('input',function(){
    var v=hex.value.trim();
    if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)){wheel.value=v;}
    tseUpdatePreview();
  });

  /* Opacity slider */
  var op=document.getElementById('tse-opacity');
  var opVal=document.getElementById('tse-opacity-val');
  if(op)op.addEventListener('input',function(){opVal.textContent=parseFloat(op.value).toFixed(2);tseUpdatePreview();});

  /* Font size enable toggle */
  var fsEn=document.getElementById('tse-fs-enable');
  var fsNum=document.getElementById('tse-fs-num');
  var fsUnit=document.getElementById('tse-fs-unit');
  if(fsEn)fsEn.addEventListener('change',function(){
    fsNum.disabled=!fsEn.checked;fsUnit.disabled=!fsEn.checked;tseUpdatePreview();
  });
  if(fsNum)fsNum.addEventListener('input',tseUpdatePreview);
  if(fsUnit)fsUnit.addEventListener('change',tseUpdatePreview);

  /* Add / Save rule */
  var addBtn=document.getElementById('tse-add-btn');
  if(addBtn)addBtn.addEventListener('click',function(){
    var rule=tseReadForm();
    if(!rule.selector){var s=document.getElementById('tse-status');if(s){s.textContent='CSS selector required.';s.className='status-msg status-err';}return;}
    addBtn.disabled=true;addBtn.textContent='Saving\u2026';
    if(_tseEditIdx>=0&&_tseEditIdx<_tseStyles.length){
      _tseStyles[_tseEditIdx]=rule;
    } else {
      _tseStyles.push(rule);
    }
    tseSaveToFirestore(function(){
      tseRenderRules();
      tseClearForm();
      var s=document.getElementById('tse-status');if(s){s.textContent='STYLE RULE SAVED ✦';s.className='status-msg status-ok';}
      addBtn.disabled=false;addBtn.textContent='Add Rule';
    });
  });

  /* Clear button */
  var clearBtn=document.getElementById('tse-clear-btn');
  if(clearBtn)clearBtn.addEventListener('click',function(){tseClearForm();var s=document.getElementById('tse-status');if(s)s.textContent='';});

  /* Apply All (cache bust) */
  var applyBtn=document.getElementById('tse-apply-btn');
  if(applyBtn)applyBtn.addEventListener('click',function(){
    if(!window.jestaDB)return;
    applyBtn.disabled=true;
    window.jestaDB.collection('siteConfig').doc('cacheVersion').set({v:Date.now()},{merge:true})
      .then(function(){var s=document.getElementById('tse-status');if(s){s.textContent='Cache busted ✦';s.className='status-msg status-ok';}applyBtn.disabled=false;})
      .catch(function(e){var s=document.getElementById('tse-status');if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}applyBtn.disabled=false;});
  });

  /* Boot: poll for jestaDB then load */
  var _jt=0,_jiv=setInterval(function(){
    if(window.jestaDB){clearInterval(_jiv);tseLoad();}
    else if(++_jt>80){clearInterval(_jiv);var w=document.getElementById('tse-rules-wrap');if(w)w.innerHTML='<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Firestore unavailable.</div>';}
  },100);
})();
})();

// ── Theme Manager ──
(function(){
  /* ── Theme Manager ── */
  var TD = {
    goldColor: '#c9a84c', bgOverlayOpacity: '0.92', fontSizeBase: '16',
    bodyTextOpacity: '0.9', cardBgOpacity: '0.55', cardBorderOpacity: '0.3',
    navBgOpacity: '0.75', sectionSpacing: '40', cardPadding: '32',
    headingSize: 'clamp(2.2rem,5.5vw,3.6rem)'
  };
  var CTRLS = [
    {key:'goldColor',    id:'th-gold',  valId:'th-gold-v',  type:'color'},
    {key:'bgOverlayOpacity', id:'th-bgop', valId:'th-bgop-v', suffix:''},
    {key:'navBgOpacity', id:'th-nbgop', valId:'th-nbgop-v', suffix:''},
    {key:'bodyTextOpacity',  id:'th-btop', valId:'th-btop-v',  suffix:''},
    {key:'cardBgOpacity',    id:'th-cbgop',valId:'th-cbgop-v', suffix:''},
    {key:'cardBorderOpacity',id:'th-cbrop',valId:'th-cbrop-v', suffix:''},
    {key:'fontSizeBase', id:'th-fsize', valId:'th-fsize-v', suffix:'px'},
    {key:'sectionSpacing',   id:'th-ssp',  valId:'th-ssp-v',  suffix:'px'},
    {key:'cardPadding',  id:'th-cpad', valId:'th-cpad-v', suffix:'px'}
  ];

  function getEl(id){ return document.getElementById(id); }

  function getVals() {
    var out = {};
    CTRLS.forEach(function(c){ var el=getEl(c.id); if(el) out[c.key]=el.value; });
    return out;
  }

  function setVals(data) {
    CTRLS.forEach(function(c) {
      var el=getEl(c.id), valEl=getEl(c.valId);
      var v = (data && data[c.key] !== undefined) ? data[c.key] : TD[c.key];
      if(el) el.value = v;
      if(valEl) valEl.textContent = v + (c.suffix || '');
    });
    updatePreview();
  }

  function updatePreview() {
    var vals = getVals();
    var card = getEl('theme-preview-card');
    var heading = getEl('theme-preview-heading');
    var text = getEl('theme-preview-text');
    var btn = getEl('theme-preview-btn');
    if (!card) return;
    var gold = vals.goldColor || '#c9a84c';
    card.style.background   = 'rgba(0,0,0,' + (vals.cardBgOpacity || '0.55') + ')';
    card.style.borderColor  = 'rgba(201,168,76,' + (vals.cardBorderOpacity || '0.3') + ')';
    card.style.padding      = (vals.cardPadding || '32') + 'px';
    if (heading) heading.style.color = gold;
    if (text)    text.style.color    = 'rgba(240,230,210,' + (vals.bodyTextOpacity || '0.9') + ')';
    if (btn)   { btn.style.background = gold; btn.style.color = '#000'; }
    /* live-update :root CSS vars so the admin page itself reflects changes */
    var r = document.documentElement;
    r.style.setProperty('--gold', gold);
    r.style.setProperty('--card-bg-opacity',     vals.cardBgOpacity     || '0.55');
    r.style.setProperty('--card-border-opacity', vals.cardBorderOpacity || '0.3');
    r.style.setProperty('--body-text-opacity',   vals.bodyTextOpacity   || '0.9');
  }

  function showStatus(msg, isErr) {
    var el = getEl('th-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-msg ' + (isErr ? 'status-err' : 'status-ok');
  }

  function attachListeners() {
    CTRLS.forEach(function(c) {
      var el = getEl(c.id), valEl = getEl(c.valId);
      if (!el) return;
      el.addEventListener('input', function() {
        if (valEl) valEl.textContent = el.value + (c.suffix || '');
        updatePreview();
      });
    });

    var saveBtn  = getEl('th-save');
    var resetBtn = getEl('th-reset');

    if (saveBtn) saveBtn.addEventListener('click', function() {
      if (!window.jestaDB) { showStatus('Firestore not ready.', true); return; }
      var vals = getVals();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving\u2026';
      var batch = window.jestaDB.batch();
      batch.set(window.jestaDB.collection('siteConfig').doc('theme'), vals, {merge:true});
      batch.set(window.jestaDB.collection('siteConfig').doc('cacheVersion'),
        {v: Date.now(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
      batch.commit()
        .then(function() {
          showStatus('Theme saved. Changes propagate on next page load.', false);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Theme';
        })
        .catch(function(e) {
          showStatus('Save failed: ' + (e.message || e), true);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Theme';
        });
    });

    if (resetBtn) resetBtn.addEventListener('click', function() {
      setVals(TD);
      showStatus('Defaults restored. Press Save to apply sitewide.', false);
    });
  }

  function loadFromFirestore() {
    if (!window.jestaDB) {
      var _jt=0, _jiv=setInterval(function(){
        if(window.jestaDB){clearInterval(_jiv);loadFromFirestore();}
        else if(++_jt>80){clearInterval(_jiv);setVals(TD);attachListeners();}
      },100);
      return;
    }
    window.jestaDB.collection('siteConfig').doc('theme').get()
      .then(function(doc){ setVals(doc.exists ? doc.data() : TD); attachListeners(); })
      .catch(function(){ setVals(TD); attachListeners(); });
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadFromFirestore);
  else loadFromFirestore();
})();
