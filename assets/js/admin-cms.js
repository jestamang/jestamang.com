(function(){
/* ── Album Manager ── */
var ALM_SECTIONS = ['Quarter Days','2K2323','2K2123','NONS'];
var _almDocs = {}; /* docId -> data */

function almEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* Resolve an artwork value to a usable src path.
   Values that already start with assets/, / or http(s) are used as-is.
   Bare relative values (e.g. "2K2323/ace of chase/2k2323nov.jpg") get the albums prefix. */
function _artSrc(val){
  if(!val)return'';
  if(/^(https?:\/\/|\/|assets\/)/.test(val))return val;
  return'assets/albums/'+val;
}

/* ── Build edit/add form HTML ── */
function almBuildForm(data, prefix) {
  data = data || {};
  var tracks = data.tracks || [];
  var pfx = prefix || 'almf';

  var sectionOpts = ALM_SECTIONS.map(function(s){
    return '<option value="'+almEsc(s)+'"'+(data.section===s?' selected':'')+'>'+almEsc(s)+'</option>';
  }).join('');

  var trackRows = '';
  tracks.forEach(function(t, i){
    var tt = typeof t === 'string' ? {title:t} : (t||{});
    trackRows += almTrackRowHtml(pfx, i, tt);
  });

  return '<div class="alm-form-grid">'
    +'<div><label class="field-label" style="margin-top:0">Title</label><input class="field-input" id="'+pfx+'-title" value="'+almEsc(data.title||'')+'"></div>'
    +'<div><label class="field-label" style="margin-top:0">Artist</label><input class="field-input" id="'+pfx+'-artist" value="'+almEsc(data.artist||'')+'"></div>'
    +'<div><label class="field-label">Section</label><select class="field-select" id="'+pfx+'-section">'+sectionOpts+'</select></div>'
    +'<div><label class="field-label">Year</label><input class="field-input" id="'+pfx+'-year" type="text" value="'+almEsc(String(data.year||''))+'"></div>'
    +'<div><label class="field-label">Genre</label><input class="field-input" id="'+pfx+'-genre" value="'+almEsc(data.genre||'')+'"></div>'
    +'<div><label class="field-label">Order #</label><input class="field-input" id="'+pfx+'-order" type="number" value="'+almEsc(String(data.order||'0'))+'"></div>'
    +'<div style="grid-column:1/-1"><label class="field-label">Artwork filename (e.g. <em>jestress melody.jpg</em>)</label>'
    +'<input class="field-input" id="'+pfx+'-artwork" value="'+almEsc(data.artwork||'')+'" oninput="almPreviewArt(\''+pfx+'\')">'
    +'<img id="'+pfx+'-art-preview" class="alm-art-preview" src="'+(data.artwork?almEsc(_artSrc(data.artwork)):'')+'" style="'+(data.artwork?'':'display:none')+'">'
    +'<div class="alm-compress-placeholder" data-compress-pfx="'+pfx+'"></div>'
    +'</div>'
    +'<div><label class="field-label">Spotify URL (album)</label><input class="field-input" id="'+pfx+'-sp" value="'+almEsc(data.spotifyUrl||'')+'"></div>'
    +'<div><label class="field-label">YouTube URL (album)</label><input class="field-input" id="'+pfx+'-yt" value="'+almEsc(data.youtubeUrl||'')+'"></div>'
    +'<div><label class="field-label">Apple Music URL</label><input class="field-input" id="'+pfx+'-am" value="'+almEsc(data.appleUrl||'')+'"></div>'
    +'<div><label class="field-label">Bandcamp URL</label><input class="field-input" id="'+pfx+'-bc" value="'+almEsc(data.bandcampUrl||'')+'"></div>'
    +'<div style="grid-column:1/-1"><label class="field-label">Bandcamp Embed Src</label><input class="field-input" id="'+pfx+'-bc-embed" value="'+almEsc(data.bandcampEmbedSrc||'')+'"></div>'
    +'</div>'
    +'<div style="margin-top:14px">'
    +'<div style="font-size:0.6rem;letter-spacing:0.28em;text-transform:uppercase;color:rgba(201,168,76,0.7);margin-bottom:6px;">Tracklist</div>'
    +'<div class="alm-track-list" id="'+pfx+'-tracks">'+trackRows+'</div>'
    +'<button type="button" class="btn-ghost btn-sm" style="margin-top:8px;" onclick="almAddTrack(\''+pfx+'\')">+ Add Track</button>'
    +'</div>';
}

function almTrackRowHtml(pfx, i, t) {
  return '<div class="alm-track-row" id="'+pfx+'-tr-'+i+'">'
    +'<span class="alm-track-num">'+(i+1)+'.</span>'
    +'<input class="field-input alm-track-title" placeholder="Track title" value="'+almEsc(t.title||'')+'"> '
    +'<input class="field-input alm-track-url" placeholder="Spotify URL" value="'+almEsc(t.spotifyUrl||'')+'"> '
    +'<input class="field-input alm-track-url" placeholder="YouTube URL" value="'+almEsc(t.youtubeUrl||'')+'"> '
    +'<input class="field-input alm-track-url" placeholder="Apple URL" value="'+almEsc(t.appleUrl||'')+'"> '
    +'<input class="field-input alm-track-url" placeholder="Bandcamp URL" value="'+almEsc(t.bandcampUrl||'')+'"> '
    +'<button type="button" class="btn-danger btn-sm" onclick="almRemoveTrack(this)" style="flex-shrink:0;">✕</button>'
    +'</div>';
}

window.almPreviewArt = function(pfx) {
  var inp = document.getElementById(pfx+'-artwork');
  var img = document.getElementById(pfx+'-art-preview');
  if (!inp || !img) return;
  var v = inp.value.trim();
  if (v) { img.src = _artSrc(v); img.style.display = 'block'; }
  else   { img.src = ''; img.style.display = 'none'; }
};

window.almAddTrack = function(pfx) {
  var list = document.getElementById(pfx+'-tracks');
  if (!list) return;
  var count = list.querySelectorAll('.alm-track-row').length;
  var div = document.createElement('div');
  div.innerHTML = almTrackRowHtml(pfx, count, {});
  list.appendChild(div.firstChild);
  almRenumberTracks(pfx);
};

window.almRemoveTrack = function(btn) {
  var row = btn.closest('.alm-track-row');
  if (row) row.remove();
  /* re-number — find prefix from parent id */
  var list = btn.closest('.alm-track-list');
  if (list) almRenumberTracksList(list);
};

function almRenumberTracks(pfx) {
  var list = document.getElementById(pfx+'-tracks');
  if (list) almRenumberTracksList(list);
}

function almRenumberTracksList(list) {
  list.querySelectorAll('.alm-track-row').forEach(function(row, i){
    var numEl = row.querySelector('.alm-track-num');
    if (numEl) numEl.textContent = (i+1)+'.';
  });
}

function almReadForm(pfx) {
  function val(id){ var el=document.getElementById(pfx+'-'+id); return el?el.value.trim():''; }
  var tracks = [];
  var list = document.getElementById(pfx+'-tracks');
  if (list) {
    list.querySelectorAll('.alm-track-row').forEach(function(row){
      var inputs = row.querySelectorAll('input');
      var title = inputs[0] ? inputs[0].value.trim() : '';
      if (!title) return;
      tracks.push({
        title:      title,
        spotifyUrl: inputs[1] ? inputs[1].value.trim() : '',
        youtubeUrl: inputs[2] ? inputs[2].value.trim() : '',
        appleUrl:   inputs[3] ? inputs[3].value.trim() : '',
        bandcampUrl:inputs[4] ? inputs[4].value.trim() : ''
      });
    });
  }
  return {
    title:           val('title'),
    artist:          val('artist'),
    section:         val('section'),
    year:            val('year'),
    genre:           val('genre'),
    order:           parseInt(val('order'),10)||0,
    artwork:         val('artwork'),
    spotifyUrl:      val('sp'),
    youtubeUrl:      val('yt'),
    appleUrl:        val('am'),
    bandcampUrl:     val('bc'),
    bandcampEmbedSrc:val('bc-embed'),
    visible:         true,
    tracks:          tracks
  };
}

/* ── Render album list ── */
function almRenderList(docs) {
  var container = document.getElementById('alm-list-inner');
  if (!container) return;
  if (!docs || docs.length === 0) {
    container.innerHTML = '<div style="color:rgba(201,168,76,0.4);font-size:0.7rem;letter-spacing:0.15em;">No albums found in Firestore. Add the first one →</div>';
    return;
  }

  var grouped = {};
  ALM_SECTIONS.forEach(function(s){ grouped[s] = []; });
  docs.forEach(function(item){
    var sec = item.data.section;
    if (grouped[sec]) grouped[sec].push(item);
    else { if (!grouped['Other']) grouped['Other']=[]; grouped['Other'].push(item); }
  });

  var html = '';
  ALM_SECTIONS.forEach(function(sec){
    var list = grouped[sec];
    if (!list || list.length === 0) return;
    html += '<div class="alm-section-group"><div class="alm-section-label">'+almEsc(sec)+'</div>';
    list.forEach(function(item){
      html += almRowHtml(item.id, item.data);
    });
    html += '</div>';
  });
  container.innerHTML = html;
  almAttachCompressWidgets(container);

  /* attach listeners */
  container.querySelectorAll('.alm-visible-toggle input').forEach(function(chk){
    chk.addEventListener('change', function(){
      var docId = chk.dataset.id;
      if (!docId || !window.jestaDB) return;
      window.jestaDB.collection('releases').doc(docId).update({visible: chk.checked}).catch(function(){});
    });
  });
}

function almRowHtml(docId, d) {
  var artSrc = d.artwork ? almEsc(_artSrc(d.artwork)) : '';
  var imgHtml = artSrc
    ? '<img class="alm-thumb" src="'+artSrc+'" alt="" onerror="this.style.opacity=0.2">'
    : '<div class="alm-thumb" style="display:flex;align-items:center;justify-content:center;color:rgba(201,168,76,0.3);font-size:1.2rem;">◈</div>';
  var vis = d.visible !== false;
  return '<div class="alm-row" id="alm-row-'+almEsc(docId)+'">'
    +'<div class="alm-row-header">'
    +imgHtml
    +'<div class="alm-row-info"><div class="alm-row-title">'+almEsc(d.title||'(untitled)')+'</div>'
    +'<div class="alm-row-meta">'+almEsc(d.artist||'')+(d.year?' · '+almEsc(String(d.year)):'')+(d.genre?' · '+almEsc(d.genre):'')+'</div></div>'
    +'<div class="alm-row-actions">'
    +'<label class="alm-visible-toggle"><input type="checkbox" data-id="'+almEsc(docId)+'"'+(vis?' checked':'')+'>Visible</label>'
    +'<button class="btn-ghost btn-sm" onclick="almToggleEdit(\''+almEsc(docId)+'\')">Edit</button>'
    +'<button class="btn-ghost btn-sm" onclick="almMoveOrder(\''+almEsc(docId)+'\',\'up\')">↑</button>'
    +'<button class="btn-ghost btn-sm" onclick="almMoveOrder(\''+almEsc(docId)+'\',\'dn\')">↓</button>'
    +'<button class="btn-danger btn-sm" onclick="almConfirmDelete(\''+almEsc(docId)+'\')">Delete</button>'
    +'</div></div>'
    +'<div class="alm-confirm-row" id="alm-confirm-'+almEsc(docId)+'">'
    +'<span class="alm-confirm-q">Delete "'+almEsc(d.title||'')+'\"?</span>'
    +'<button class="btn-danger btn-sm" onclick="almDoDelete(\''+almEsc(docId)+'\')">Yes, Delete</button>'
    +'<button class="btn-ghost btn-sm" onclick="almCancelDelete(\''+almEsc(docId)+'\')">Cancel</button>'
    +'</div>'
    +'<div class="alm-edit-panel" id="alm-edit-'+almEsc(docId)+'">'
    +almBuildForm(d, 'alme-'+docId)
    +'<div class="btn-row" style="margin-top:12px;">'
    +'<button class="btn-gold" onclick="almSave(\''+almEsc(docId)+'\')">Save</button>'
    +'<button class="btn-ghost" onclick="almToggleEdit(\''+almEsc(docId)+'\')">Cancel</button>'
    +'</div>'
    +'<p class="status-msg" id="alm-edit-status-'+almEsc(docId)+'"></p>'
    +'</div>'
    +'</div>';
}

window.almToggleEdit = function(docId) {
  var panel = document.getElementById('alm-edit-'+docId);
  if (!panel) return;
  panel.classList.toggle('open');
};

window.almConfirmDelete = function(docId) {
  var row = document.getElementById('alm-confirm-'+docId);
  if (row) row.classList.add('visible');
};
window.almCancelDelete = function(docId) {
  var row = document.getElementById('alm-confirm-'+docId);
  if (row) row.classList.remove('visible');
};
window.almDoDelete = function(docId) {
  if (!window.jestaDB) return;
  window.jestaDB.collection('releases').doc(docId).delete().then(function(){
    var rowEl = document.getElementById('alm-row-'+docId);
    if (rowEl) rowEl.remove();
    delete _almDocs[docId];
  }).catch(function(e){
    var statusEl = document.getElementById('alm-status');
    if (statusEl) { statusEl.textContent = 'Delete failed: '+(e.message||e); statusEl.className='status-msg status-err'; }
  });
};

window.almSave = function(docId) {
  if (!window.jestaDB) return;
  var data = almReadForm('alme-'+docId);
  var statusEl = document.getElementById('alm-edit-status-'+docId);
  var saveBtn = document.querySelector('#alm-edit-'+docId+' .btn-gold');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
  window.jestaDB.collection('releases').doc(docId).set(data, {merge:true})
    .then(function(){
      _almDocs[docId] = data;
      /* Re-render this row */
      var rowEl = document.getElementById('alm-row-'+docId);
      if (rowEl) {
        var newDiv = document.createElement('div');
        newDiv.innerHTML = almRowHtml(docId, data);
        rowEl.parentNode.replaceChild(newDiv.firstChild, rowEl);
        /* Re-attach visible toggle listener */
        var newChk = document.querySelector('#alm-row-'+docId+' .alm-visible-toggle input');
        if (newChk) newChk.addEventListener('change', function(){
          window.jestaDB.collection('releases').doc(docId).update({visible: newChk.checked}).catch(function(){});
        });
      }
      if (statusEl) { statusEl.textContent = 'Saved.'; statusEl.className='status-msg status-ok'; }
    })
    .catch(function(e){
      if (statusEl) { statusEl.textContent = 'Save failed: '+(e.message||e); statusEl.className='status-msg status-err'; }
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    });
};

window.almMoveOrder = function(docId, dir) {
  if (!window.jestaDB || !_almDocs[docId]) return;
  var sec = _almDocs[docId].section;
  var peers = Object.keys(_almDocs).filter(function(id){ return _almDocs[id].section === sec; });
  peers.sort(function(a,b){ return (_almDocs[a].order||0) - (_almDocs[b].order||0); });
  var idx = peers.indexOf(docId);
  var swapIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= peers.length) return;
  var swapId = peers[swapIdx];
  var myOrder = _almDocs[docId].order || 0;
  var swapOrder = _almDocs[swapId].order || 0;
  var batch = window.jestaDB.batch();
  batch.update(window.jestaDB.collection('releases').doc(docId), {order: swapOrder});
  batch.update(window.jestaDB.collection('releases').doc(swapId), {order: myOrder});
  batch.commit().then(function(){
    _almDocs[docId].order = swapOrder;
    _almDocs[swapId].order = myOrder;
    almRefreshList();
  }).catch(function(){});
};

function almRefreshList() {
  var docs = Object.keys(_almDocs).map(function(id){ return {id:id, data:_almDocs[id]}; });
  docs.sort(function(a,b){ return (a.data.order||0)-(b.data.order||0); });
  almRenderList(docs);
}

/* ── Load catalog from Firestore ── */
function almLoad() {
  if (!window.jestaDB) return;
  var container = document.getElementById('alm-list-inner');
  if (container) container.innerHTML = '<div style="color:rgba(201,168,76,0.4);font-size:0.7rem;letter-spacing:0.2em;">Loading catalog...</div>';
  window.jestaDB.collection('releases').orderBy('order').get()
    .then(function(snap){
      var docs = [];
      snap.forEach(function(doc){ _almDocs[doc.id] = doc.data(); docs.push({id:doc.id, data:doc.data()}); });
      almRenderList(docs);
    })
    .catch(function(e){
      var container2 = document.getElementById('alm-list-inner');
      if (container2) container2.innerHTML = '<div style="color:rgba(251,56,56,0.7);font-size:0.7rem;">Failed to load: '+(e.message||e)+'</div>';
    });
}

/* ── Add new album ── */
function almInitAddForm() {
  var formEl = document.getElementById('alm-add-form');
  if (!formEl) return;
  formEl.innerHTML = almBuildForm({section:'Quarter Days', order:0, visible:true}, 'almn');
  almAttachCompressWidgets(formEl);
}

function almAttachCompressWidgets(container) {
  if (!window.__adminUtils || !window.__adminUtils.buildCompressWidget) return;
  container.querySelectorAll('.alm-compress-placeholder:not([data-wired])').forEach(function(el) {
    var pfx = el.getAttribute('data-compress-pfx');
    if (!pfx) return;
    el.setAttribute('data-wired', '1');
    el.appendChild(window.__adminUtils.buildCompressWidget({
      maxDim: 500, quality: 0.82,
      title: 'Compress Artwork for Upload',
      onDownload: function(baseName) {
        var inp = document.getElementById(pfx + '-artwork');
        if (inp) { inp.value = baseName; window.almPreviewArt(pfx); }
      }
    }));
  });
}

/* ── Tab switching ── */
var _almTabList=document.getElementById('alm-tab-list');if(_almTabList)_almTabList.addEventListener('click', function(){
  document.getElementById('alm-tab-list').classList.add('active');
  document.getElementById('alm-tab-add').classList.remove('active');
  document.getElementById('alm-pane-list').classList.add('active');
  document.getElementById('alm-pane-add').classList.remove('active');
});
var _almTabAdd=document.getElementById('alm-tab-add');if(_almTabAdd)_almTabAdd.addEventListener('click', function(){
  document.getElementById('alm-tab-add').classList.add('active');
  document.getElementById('alm-tab-list').classList.remove('active');
  document.getElementById('alm-pane-add').classList.add('active');
  document.getElementById('alm-pane-list').classList.remove('active');
});

var _almAddBtn=document.getElementById('alm-add-btn');if(_almAddBtn)_almAddBtn.addEventListener('click', function(){
  if (!window.jestaDB) { var s=document.getElementById('alm-add-status'); if(s){s.textContent='Firestore not ready.';s.className='status-msg status-err';} return; }
  var data = almReadForm('almn');
  if (!data.title) { var s2=document.getElementById('alm-add-status'); if(s2){s2.textContent='Title is required.';s2.className='status-msg status-err';} return; }
  var btn = document.getElementById('alm-add-btn');
  btn.disabled = true; btn.textContent = 'Adding…';
  window.jestaDB.collection('releases').add(data)
    .then(function(ref){
      _almDocs[ref.id] = data;
      /* switch to list and refresh */
      document.getElementById('alm-tab-list').click();
      almRefreshList();
      almInitAddForm(); /* clear the form */
      var s3=document.getElementById('alm-add-status'); if(s3){s3.textContent='Album added.';s3.className='status-msg status-ok';}
      btn.disabled = false; btn.textContent = 'Add Album';
    })
    .catch(function(e){
      var s4=document.getElementById('alm-add-status'); if(s4){s4.textContent='Failed: '+(e.message||e);s4.className='status-msg status-err';}
      btn.disabled = false; btn.textContent = 'Add Album';
    });
});

var _almAddClearBtn=document.getElementById('alm-add-clear-btn');if(_almAddClearBtn)_almAddClearBtn.addEventListener('click', function(){ almInitAddForm(); });

/* ── Boot ── */
(function(){
  almInitAddForm();
  var _jt=0,_jiv=setInterval(function(){
    if(window.jestaDB){ clearInterval(_jiv); almLoad(); }
    else if(++_jt>80){ clearInterval(_jiv); var c=document.getElementById('alm-list-inner'); if(c) c.innerHTML='<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Firestore unavailable.</div>'; }
  },100);
})();
})();

(function(){
/* ── Entity Manager ── */
var _entDocs = {};

function entEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function entBuildForm(d,pfx){
  d=d||{};
  var n=d.natal||{};
  var typeOpts=['cartoon','child'].map(function(v){
    return '<option value="'+v+'"'+(d.type===v?' selected':'')+'>'+v+'</option>';
  }).join('');
  var html='<div class="ent-form-grid">'
    +'<div><label class="field-label">Name</label><input class="field-input" id="'+pfx+'-name" value="'+entEsc(d.name||'')+'" maxlength="120"></div>'
    +'<div><label class="field-label">Type</label><select class="field-input" id="'+pfx+'-type">'+typeOpts+'</select></div>'
    +'<div><label class="field-label">Image Path</label><input class="field-input" id="'+pfx+'-image" value="'+entEsc(d.image||'')+'" placeholder="assets/entities/..." onchange="entPreviewArt(\''+pfx+'\')"><div class="ent-compress-placeholder" data-compress-pfx="'+pfx+'"></div></div>'
    +'<div><label class="field-label">Art Preview</label><img class="ent-art-preview" id="'+pfx+'-art-preview" src="'+entEsc(d.image||'')+'" onerror="this.src=\'\'"></div>'
    +'<div><label class="field-label">Bg Color</label><input class="field-input" id="'+pfx+'-bgColor" value="'+entEsc(d.bgColor||'')+'" placeholder="rgba(15,50,25,0.25)"></div>'
    +'<div><label class="field-label">Albums</label><input class="field-input" id="'+pfx+'-albums" value="'+entEsc(d.albums||'')+'" placeholder="Album (year) · Album (year)"></div>'
    +'<div><label class="field-label">Likes</label><input class="field-input" id="'+pfx+'-likes" value="'+entEsc(d.likes||'')+'"></div>'
    +'<div><label class="field-label">Hates</label><input class="field-input" id="'+pfx+'-hates" value="'+entEsc(d.hates||'')+'"></div>'
    +'<div><label class="field-label">Order</label><input class="field-input" id="'+pfx+'-order" type="number" value="'+(d.order||0)+'"></div>'
    +'<div><label class="field-label" style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="'+pfx+'-visible"'+(d.visible===false?'':' checked')+'> Visible</label></div>'
  +'</div>'
  +'<div style="margin-top:10px;"><label class="field-label">Bio (children)</label><textarea class="field-input" id="'+pfx+'-bio" rows="4" style="resize:vertical;min-height:70px;">'+entEsc(d.bio||'')+'</textarea></div>'
  +'<div style="margin-top:10px;"><label class="field-label">Chart Image Path (children)</label><input class="field-input" id="'+pfx+'-chartImage" value="'+entEsc(d.chartImage||'')+'" placeholder="assets/entities/children/charts/..."></div>'
  +'<div style="margin-top:12px;"><div class="field-label" style="margin-bottom:6px;letter-spacing:0.2em;">Natal Positions (children)</div>'
  +'<div class="ent-natal-grid">'
  +['sun','moon','rising','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'].map(function(pl){
    return '<div><label class="field-label" style="font-size:0.58rem;">'+pl.charAt(0).toUpperCase()+pl.slice(1)+'</label><input class="field-input" id="'+pfx+'-natal-'+pl+'" value="'+entEsc(n[pl]||'')+'" placeholder="Sign deg (House)" style="font-size:0.72rem;"></div>';
  }).join('')
  +'</div></div>';
  return html;
}

function entReadForm(pfx){
  function v(id){var el=document.getElementById(pfx+'-'+id);return el?el.value.trim():'';}
  var natal={};
  ['sun','moon','rising','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'].forEach(function(pl){
    var val=v('natal-'+pl);if(val)natal[pl]=val;
  });
  return {
    name:v('name'),type:v('type'),image:v('image'),bgColor:v('bgColor'),
    albums:v('albums'),likes:v('likes'),hates:v('hates'),bio:v('bio'),
    chartImage:v('chartImage'),natal:natal,
    order:parseInt(v('order'))||0,
    visible:document.getElementById(pfx+'-visible')?document.getElementById(pfx+'-visible').checked:true
  };
}

window.entPreviewArt=function(pfx){
  var img=document.getElementById(pfx+'-art-preview');
  var inp=document.getElementById(pfx+'-image');
  if(img&&inp)img.src=inp.value.trim();
};

function entRowHtml(docId,d){
  var thumb=d.image?'<img class="ent-thumb" src="'+entEsc(d.image)+'" onerror="this.style.display=\'none\'">':'<div class="ent-thumb"></div>';
  return '<div class="ent-row" id="ent-row-'+entEsc(docId)+'">'
    +'<div class="ent-row-header">'
    +thumb
    +'<div class="ent-row-info"><div class="ent-row-title">'+entEsc(d.name||'(unnamed)')+'</div><div class="ent-row-meta">'+entEsc(d.type||'cartoon')+(d.albums?' · '+entEsc(d.albums):'')+'</div></div>'
    +'<div class="ent-row-actions">'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;" onclick="entMoveOrder(\''+entEsc(docId)+'\',\'up\')">▲</button>'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;" onclick="entMoveOrder(\''+entEsc(docId)+'\',\'dn\')">▼</button>'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;" onclick="entToggleEdit(\''+entEsc(docId)+'\')">Edit</button>'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;color:rgba(251,56,56,0.7);" onclick="entConfirmDelete(\''+entEsc(docId)+'\')">Del</button>'
    +'<label class="ent-visible-toggle"><input type="checkbox" '+(d.visible===false?'':'checked')+' onchange="entSetVisible(\''+entEsc(docId)+'\',this.checked)"> Vis</label>'
    +'</div></div>'
    +'<div class="ent-confirm-row" id="ent-confirm-'+entEsc(docId)+'">'
    +'<span class="ent-confirm-q">Delete "'+entEsc(d.name||'')+'\"?</span>'
    +'<button class="btn-gold" style="padding:3px 10px;font-size:0.62rem;" onclick="entDoDelete(\''+entEsc(docId)+'\')">Yes</button>'
    +'<button class="btn-ghost" style="padding:3px 10px;font-size:0.62rem;" onclick="entCancelDelete(\''+entEsc(docId)+'\')">No</button>'
    +'</div>'
    +'<div class="ent-edit-panel" id="ent-edit-'+entEsc(docId)+'">'
    +entBuildForm(d,'ent-e-'+docId)
    +'<div class="btn-row" style="margin-top:12px;">'
    +'<button class="btn-gold" onclick="entSave(\''+entEsc(docId)+'\')">Save</button>'
    +'<button class="btn-ghost" onclick="entToggleEdit(\''+entEsc(docId)+'\')">Cancel</button>'
    +'</div>'
    +'<p class="status-msg" id="ent-save-status-'+entEsc(docId)+'"></p>'
    +'</div>'
  +'</div>';
}

function entRenderList(docs){
  var children=[],cartoons=[];
  Object.keys(docs).forEach(function(id){
    var d=docs[id];
    if(d.type==='child')children.push({id:id,d:d});
    else cartoons.push({id:id,d:d});
  });
  children.sort(function(a,b){return(a.d.order||0)-(b.d.order||0);});
  cartoons.sort(function(a,b){return(a.d.order||0)-(b.d.order||0);});
  var html='';
  if(children.length){
    html+='<div class="ent-group"><div class="ent-group-label">One of the Children</div>';
    children.forEach(function(e){html+=entRowHtml(e.id,e.d);});
    html+='</div>';
  }
  if(cartoons.length){
    html+='<div class="ent-group"><div class="ent-group-label">Cartoon Entity</div>';
    cartoons.forEach(function(e){html+=entRowHtml(e.id,e.d);});
    html+='</div>';
  }
  if(!html)html='<div style="color:rgba(201,168,76,0.3);font-size:0.7rem;">No entities found.</div>';
  var c=document.getElementById('ent-list-inner');if(c){c.innerHTML=html;entAttachCompressWidgets(c);}
}

window.entToggleEdit=function(docId){
  var p=document.getElementById('ent-edit-'+docId);
  if(p)p.classList.toggle('open');
};

window.entConfirmDelete=function(docId){
  var r=document.getElementById('ent-confirm-'+docId);if(r)r.classList.add('visible');
};
window.entCancelDelete=function(docId){
  var r=document.getElementById('ent-confirm-'+docId);if(r)r.classList.remove('visible');
};
window.entDoDelete=function(docId){
  window.jestaDB.collection('entities').doc(docId).delete()
    .then(function(){
      delete _entDocs[docId];
      var row=document.getElementById('ent-row-'+docId);if(row)row.remove();
      var s=document.getElementById('ent-status');if(s){s.textContent='Entity deleted.';s.className='status-msg status-ok';}
    })
    .catch(function(e){
      var s=document.getElementById('ent-status');if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}
    });
};

window.entSave=function(docId){
  var data=entReadForm('ent-e-'+docId);
  if(!data.name){var s=document.getElementById('ent-save-status-'+docId);if(s){s.textContent='Name required.';s.className='status-msg status-err';}return;}
  window.jestaDB.collection('entities').doc(docId).set(data,{merge:true})
    .then(function(){
      _entDocs[docId]=data;
      var row=document.getElementById('ent-row-'+docId);
      if(row)row.outerHTML=entRowHtml(docId,data);
      var s=document.getElementById('ent-status');if(s){s.textContent='Saved.';s.className='status-msg status-ok';}
    })
    .catch(function(e){
      var s=document.getElementById('ent-save-status-'+docId);if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}
    });
};

window.entSetVisible=function(docId,vis){
  window.jestaDB.collection('entities').doc(docId).set({visible:vis},{merge:true})
    .then(function(){if(_entDocs[docId])_entDocs[docId].visible=vis;})
    .catch(function(){});
};

window.entMoveOrder=function(docId,dir){
  var d=_entDocs[docId];if(!d)return;
  var sameType=Object.keys(_entDocs).filter(function(id){return _entDocs[id].type===d.type;});
  sameType.sort(function(a,b){return(_entDocs[a].order||0)-(_entDocs[b].order||0);});
  var idx=sameType.indexOf(docId);
  var swapIdx=dir==='up'?idx-1:idx+1;
  if(swapIdx<0||swapIdx>=sameType.length)return;
  var swapId=sameType[swapIdx];
  var a=_entDocs[docId].order||0,b=_entDocs[swapId].order||0;
  var batch=window.jestaDB.batch();
  batch.set(window.jestaDB.collection('entities').doc(docId),{order:b},{merge:true});
  batch.set(window.jestaDB.collection('entities').doc(swapId),{order:a},{merge:true});
  batch.commit().then(function(){
    _entDocs[docId].order=b;_entDocs[swapId].order=a;
    entRenderList(_entDocs);
  }).catch(function(){});
};

function entInitAddForm(){
  var c=document.getElementById('ent-add-form');
  if(c){c.innerHTML=entBuildForm(null,'ent-new');entAttachCompressWidgets(c);}
}

function entAttachCompressWidgets(container) {
  if (!window.__adminUtils || !window.__adminUtils.buildCompressWidget) return;
  container.querySelectorAll('.ent-compress-placeholder:not([data-wired])').forEach(function(el) {
    var pfx = el.getAttribute('data-compress-pfx');
    if (!pfx) return;
    el.setAttribute('data-wired', '1');
    el.appendChild(window.__adminUtils.buildCompressWidget({
      maxDim: 800, quality: 0.82,
      title: 'Compress Image for Upload',
      onDownload: function(baseName) {
        var inp = document.getElementById(pfx + '-image');
        if (inp) { inp.value = 'assets/entities/' + baseName; window.entPreviewArt(pfx); }
      }
    }));
  });
}

function entLoad(){
  window.jestaDB.collection('entities').orderBy('order').get()
    .then(function(snap){
      _entDocs={};
      snap.forEach(function(doc){_entDocs[doc.id]=doc.data();});
      entRenderList(_entDocs);
    })
    .catch(function(e){
      var c=document.getElementById('ent-list-inner');
      if(c)c.innerHTML='<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Load error: '+entEsc(e.message)+'</div>';
    });
}

/* ── Add new entity ── */
(function(){
  var addBtn=document.getElementById('ent-add-btn');
  if(addBtn)addBtn.addEventListener('click',function(){
    var data=entReadForm('ent-new');
    if(!data.name){var s=document.getElementById('ent-add-status');if(s){s.textContent='Name required.';s.className='status-msg status-err';}return;}
    addBtn.disabled=true;addBtn.textContent='Adding\u2026';
    window.jestaDB.collection('entities').add(data)
      .then(function(ref){
        _entDocs[ref.id]=data;
        document.getElementById('ent-tab-list').click();
        entRenderList(_entDocs);
        entInitAddForm();
        var s=document.getElementById('ent-add-status');if(s){s.textContent='Entity added.';s.className='status-msg status-ok';}
        addBtn.disabled=false;addBtn.textContent='Add Entity';
      })
      .catch(function(e){
        var s=document.getElementById('ent-add-status');if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}
        addBtn.disabled=false;addBtn.textContent='Add Entity';
      });
  });
  var clearBtn=document.getElementById('ent-add-clear-btn');
  if(clearBtn)clearBtn.addEventListener('click',entInitAddForm);
})();

/* ── Tab switching ── */
(function(){
  var t1=document.getElementById('ent-tab-list'),t2=document.getElementById('ent-tab-add');
  var p1=document.getElementById('ent-pane-list'),p2=document.getElementById('ent-pane-add');
  if(!t1||!t2)return;
  t1.addEventListener('click',function(){t1.classList.add('active');t2.classList.remove('active');p1.classList.add('active');p2.classList.remove('active');});
  t2.addEventListener('click',function(){t2.classList.add('active');t1.classList.remove('active');p2.classList.add('active');p1.classList.remove('active');});
})();

/* ── Boot ── */
(function(){
  entInitAddForm();
  var _jt=0,_jiv=setInterval(function(){
    if(window.jestaDB){clearInterval(_jiv);entLoad();}
    else if(++_jt>80){clearInterval(_jiv);var c=document.getElementById('ent-list-inner');if(c)c.innerHTML='<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Firestore unavailable.</div>';}
  },100);
})();
})();

(function(){
/* ── Lyrics Manager ── */
var _lymDocs = {};

function lymEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _artSrc(val){
  if(!val)return'';
  if(/^(https?:\/\/|\/|assets\/)/.test(val))return val;
  return'assets/albums/'+val;
}

function lymSongRowHtml(pfx,i,song){
  song=song||{};
  return '<div class="lym-song-row" data-song-row draggable="true">'
    +'<div class="lym-song-row-head">'
    +'<span class="lym-drag-handle" title="Drag to reorder">⠿</span>'
    +'<span class="lym-song-num">'+(i+1)+'.</span>'
    +'<input class="field-input lym-song-title" placeholder="Song title" value="'+lymEsc(song.title||'')+'" style="flex:1;">'
    +'<input class="field-input lym-song-yt" placeholder="YouTube URL" value="'+lymEsc(song.youtubeUrl||'')+'">'
    +'<button class="lym-song-del" onclick="lymRemoveSong(this)">✕</button>'
    +'</div>'
    +'<label class="field-label" style="font-size:0.58rem;margin-bottom:2px;">Lyrics</label>'
    +'<textarea class="lym-lyr-ta" placeholder="Paste full lyric text here. Newlines preserved.">'+lymEsc(song.lyrics||'')+'</textarea>'
    +'</div>';
}

function lymBuildForm(d,pfx){
  d=d||{};
  var songs=d.songs&&d.songs.length?d.songs:[{title:'',youtubeUrl:'',lyrics:''}];
  var songsHtml='';songs.forEach(function(s,i){songsHtml+=lymSongRowHtml(pfx,i,s);});
  return '<div class="lym-form-grid">'
    +'<div><label class="field-label">Album Title</label><input class="field-input" id="'+pfx+'-albumTitle" value="'+lymEsc(d.albumTitle||'')+'" maxlength="200"></div>'
    +'<div><label class="field-label">Artist</label><input class="field-input" id="'+pfx+'-artist" value="'+lymEsc(d.artist||'')+'" maxlength="200"></div>'
    +'<div><label class="field-label">Artwork Filename</label><input class="field-input" id="'+pfx+'-artwork" value="'+lymEsc(d.artwork||'')+'" placeholder="filename.jpg" onchange="lymPreviewArt(\''+pfx+'\')"><div class="lym-compress-placeholder" data-compress-pfx="'+pfx+'"></div></div>'
    +'<div><label class="field-label">Art Preview</label><img class="lym-art-preview" id="'+pfx+'-art-preview" src="'+(d.artwork?lymEsc(_artSrc(d.artwork)):'')+'" onerror="this.src=\'\'"></div>'
    +'<div><label class="field-label">Album YouTube URL</label><input class="field-input" id="'+pfx+'-youtubeUrl" value="'+lymEsc(d.youtubeUrl||'')+'" placeholder="https://youtube.com/..."></div>'
    +'<div><label class="field-label" style="display:flex;align-items:center;gap:6px;margin-top:18px;"><input type="checkbox" id="'+pfx+'-visible"'+(d.visible===false?'':' checked')+'> Visible</label>'
    +'<label class="field-label" style="margin-top:8px;">Order</label><input class="field-input" id="'+pfx+'-order" type="number" value="'+(d.order||0)+'"></div>'
    +'</div>'
    +'<div class="lym-song-list" id="'+pfx+'-song-list">'+songsHtml+'</div>'
    +'<button class="btn-ghost" style="margin-top:8px;font-size:0.62rem;padding:4px 12px;" onclick="lymAddSong(\''+pfx+'\')">+ Add Song</button>';
}

function lymReadSongs(pfx){
  var list=document.getElementById(pfx+'-song-list');if(!list)return[];
  var rows=list.querySelectorAll('[data-song-row]');
  var songs=[];
  rows.forEach(function(row){
    var title=row.querySelector('.lym-song-title');
    var yt=row.querySelector('.lym-song-yt');
    var lyr=row.querySelector('.lym-lyr-ta');
    songs.push({title:title?title.value.trim():'',youtubeUrl:yt?yt.value.trim():'',lyrics:lyr?lyr.value:''});
  });
  return songs;
}

function lymReadForm(pfx){
  function v(id){var el=document.getElementById(pfx+'-'+id);return el?el.value.trim():'';}
  var visEl=document.getElementById(pfx+'-visible');
  return {albumTitle:v('albumTitle'),artist:v('artist'),artwork:v('artwork'),youtubeUrl:v('youtubeUrl'),
    order:parseInt(v('order'))||0,visible:visEl?visEl.checked:true,songs:lymReadSongs(pfx)};
}

window.lymPreviewArt=function(pfx){
  var img=document.getElementById(pfx+'-art-preview');
  var inp=document.getElementById(pfx+'-artwork');
  if(img&&inp)img.src=inp.value.trim()?_artSrc(inp.value.trim()):'';
};

window.lymAddSong=function(pfx){
  var list=document.getElementById(pfx+'-song-list');if(!list)return;
  var rows=list.querySelectorAll('[data-song-row]');
  var div=document.createElement('div');
  div.innerHTML=lymSongRowHtml(pfx,rows.length,{});
  list.appendChild(div.firstChild);
};

window.lymRemoveSong=function(btn){
  var row=btn.closest('[data-song-row]');if(row)row.remove();
};

function lymWireDragDrop(list){
  var dragged=null;
  list.addEventListener('dragstart',function(e){
    dragged=e.target.closest('[data-song-row]');
    if(dragged)e.dataTransfer.effectAllowed='move';
  });
  list.addEventListener('dragover',function(e){
    e.preventDefault();
    var target=e.target.closest('[data-song-row]');
    list.querySelectorAll('[data-song-row]').forEach(function(r){r.classList.remove('lym-drag-over');});
    if(target&&target!==dragged)target.classList.add('lym-drag-over');
  });
  list.addEventListener('dragleave',function(e){
    var target=e.target.closest('[data-song-row]');
    if(target)target.classList.remove('lym-drag-over');
  });
  list.addEventListener('drop',function(e){
    e.preventDefault();
    var target=e.target.closest('[data-song-row]');
    list.querySelectorAll('[data-song-row]').forEach(function(r){r.classList.remove('lym-drag-over');});
    if(!target||!dragged||target===dragged)return;
    var rows=Array.from(list.querySelectorAll('[data-song-row]'));
    var fromIdx=rows.indexOf(dragged),toIdx=rows.indexOf(target);
    if(fromIdx<toIdx)list.insertBefore(dragged,target.nextSibling);
    else list.insertBefore(dragged,target);
    dragged=null;
  });
  list.addEventListener('dragend',function(){
    list.querySelectorAll('[data-song-row]').forEach(function(r){r.classList.remove('lym-drag-over');});
    dragged=null;
  });
}

function lymRowHtml(docId,d){
  var artSrc=d.artwork?lymEsc(_artSrc(d.artwork)):'';
  var songCount=(d.songs&&d.songs.length)||0;
  return '<div class="lym-row" id="lym-row-'+lymEsc(docId)+'">'
    +'<div class="lym-row-header">'
    +(artSrc?'<img class="lym-thumb" src="'+artSrc+'" onerror="this.style.display=\'none\'">':'<div class="lym-thumb"></div>')
    +'<div class="lym-row-info"><div class="lym-row-title">'+lymEsc(d.albumTitle||'(untitled)')+'</div><div class="lym-row-meta">'+lymEsc(d.artist||'')+'  ·  '+songCount+' song'+(songCount===1?'':'s')+'</div></div>'
    +'<div class="lym-row-actions">'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;" onclick="lymMoveOrder(\''+lymEsc(docId)+'\',\'up\')">▲</button>'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;" onclick="lymMoveOrder(\''+lymEsc(docId)+'\',\'dn\')">▼</button>'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;" onclick="lymToggleEdit(\''+lymEsc(docId)+'\')">Edit</button>'
    +'<button class="btn-ghost" style="padding:4px 8px;font-size:0.6rem;color:rgba(251,56,56,0.7);" onclick="lymConfirmDelete(\''+lymEsc(docId)+'\')">Del</button>'
    +'<label class="lym-visible-toggle"><input type="checkbox" '+(d.visible===false?'':'checked')+' onchange="lymSetVisible(\''+lymEsc(docId)+'\',this.checked)"> Vis</label>'
    +'</div></div>'
    +'<div class="lym-confirm-row" id="lym-confirm-'+lymEsc(docId)+'">'
    +'<span class="lym-confirm-q">Delete "'+lymEsc(d.albumTitle||'')+'"?</span>'
    +'<button class="btn-gold" style="padding:3px 10px;font-size:0.62rem;" onclick="lymDoDelete(\''+lymEsc(docId)+'\')">Yes</button>'
    +'<button class="btn-ghost" style="padding:3px 10px;font-size:0.62rem;" onclick="lymCancelDelete(\''+lymEsc(docId)+'\')">No</button>'
    +'</div>'
    +'<div class="lym-edit-panel" id="lym-edit-'+lymEsc(docId)+'">'
    +lymBuildForm(d,'lym-e-'+docId)
    +'<div class="btn-row" style="margin-top:14px;">'
    +'<button class="btn-gold" onclick="lymSave(\''+lymEsc(docId)+'\')">Save</button>'
    +'<button class="btn-ghost" onclick="lymToggleEdit(\''+lymEsc(docId)+'\')">Cancel</button>'
    +'</div>'
    +'<p class="status-msg" id="lym-save-status-'+lymEsc(docId)+'"></p>'
    +'</div>'
  +'</div>';
}

function lymRenderList(docs){
  var sorted=Object.keys(docs).map(function(id){return{id:id,d:docs[id]};});
  sorted.sort(function(a,b){return(a.d.order||0)-(b.d.order||0);});
  var html='';sorted.forEach(function(e){html+=lymRowHtml(e.id,e.d);});
  if(!html)html='<div style="color:rgba(201,168,76,0.3);font-size:0.7rem;">No albums found.</div>';
  var c=document.getElementById('lym-list-inner');if(c){c.innerHTML=html;c.querySelectorAll('.lym-song-list').forEach(lymWireDragDrop);lymAttachCompressWidgets(c);}
}

window.lymToggleEdit=function(docId){var p=document.getElementById('lym-edit-'+docId);if(p)p.classList.toggle('open');};
window.lymConfirmDelete=function(docId){var r=document.getElementById('lym-confirm-'+docId);if(r)r.classList.add('visible');};
window.lymCancelDelete=function(docId){var r=document.getElementById('lym-confirm-'+docId);if(r)r.classList.remove('visible');};

window.lymDoDelete=function(docId){
  window.jestaDB.collection('lyrics').doc(docId).delete()
    .then(function(){delete _lymDocs[docId];var row=document.getElementById('lym-row-'+docId);if(row)row.remove();var s=document.getElementById('lym-status');if(s){s.textContent='Album deleted.';s.className='status-msg status-ok';}})
    .catch(function(e){var s=document.getElementById('lym-status');if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}});
};

window.lymSave=function(docId){
  var data=lymReadForm('lym-e-'+docId);
  if(!data.albumTitle){var s=document.getElementById('lym-save-status-'+docId);if(s){s.textContent='Album title required.';s.className='status-msg status-err';}return;}
  window.jestaDB.collection('lyrics').doc(docId).set(data,{merge:true})
    .then(function(){_lymDocs[docId]=data;var row=document.getElementById('lym-row-'+docId);if(row)row.outerHTML=lymRowHtml(docId,data);var s=document.getElementById('lym-status');if(s){s.textContent='Saved.';s.className='status-msg status-ok';}})
    .catch(function(e){var s=document.getElementById('lym-save-status-'+docId);if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}});
};

window.lymSetVisible=function(docId,vis){
  window.jestaDB.collection('lyrics').doc(docId).set({visible:vis},{merge:true})
    .then(function(){if(_lymDocs[docId])_lymDocs[docId].visible=vis;})
    .catch(function(){});
};

window.lymMoveOrder=function(docId,dir){
  var all=Object.keys(_lymDocs).sort(function(a,b){return(_lymDocs[a].order||0)-(_lymDocs[b].order||0);});
  var idx=all.indexOf(docId);
  var swapIdx=dir==='up'?idx-1:idx+1;
  if(swapIdx<0||swapIdx>=all.length)return;
  var swapId=all[swapIdx];
  var a=_lymDocs[docId].order||0,b=_lymDocs[swapId].order||0;
  var batch=window.jestaDB.batch();
  batch.set(window.jestaDB.collection('lyrics').doc(docId),{order:b},{merge:true});
  batch.set(window.jestaDB.collection('lyrics').doc(swapId),{order:a},{merge:true});
  batch.commit().then(function(){_lymDocs[docId].order=b;_lymDocs[swapId].order=a;lymRenderList(_lymDocs);}).catch(function(){});
};

function lymInitAddForm(){
  var c=document.getElementById('lym-add-form');
  if(c){c.innerHTML=lymBuildForm(null,'lym-new');var sl=document.getElementById('lym-new-song-list');if(sl)lymWireDragDrop(sl);lymAttachCompressWidgets(c);}
}

function lymAttachCompressWidgets(container) {
  if (!window.__adminUtils || !window.__adminUtils.buildCompressWidget) return;
  container.querySelectorAll('.lym-compress-placeholder:not([data-wired])').forEach(function(el) {
    var pfx = el.getAttribute('data-compress-pfx');
    if (!pfx) return;
    el.setAttribute('data-wired', '1');
    el.appendChild(window.__adminUtils.buildCompressWidget({
      maxDim: 700, quality: 0.82,
      title: 'Compress Artwork for Upload',
      onDownload: function(baseName) {
        var inp = document.getElementById(pfx + '-artwork');
        if (inp) { inp.value = baseName; window.lymPreviewArt(pfx); }
      }
    }));
  });
}

function lymLoad(){
  window.jestaDB.collection('lyrics').orderBy('order').get()
    .then(function(snap){_lymDocs={};snap.forEach(function(doc){_lymDocs[doc.id]=doc.data();});lymRenderList(_lymDocs);})
    .catch(function(e){var c=document.getElementById('lym-list-inner');if(c)c.innerHTML='<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Load error: '+lymEsc(e.message)+'</div>';});
}

/* ── Add new album ── */
(function(){
  var addBtn=document.getElementById('lym-add-btn');
  if(addBtn)addBtn.addEventListener('click',function(){
    var data=lymReadForm('lym-new');
    if(!data.albumTitle){var s=document.getElementById('lym-add-status');if(s){s.textContent='Album title required.';s.className='status-msg status-err';}return;}
    addBtn.disabled=true;addBtn.textContent='Adding\u2026';
    window.jestaDB.collection('lyrics').add(data)
      .then(function(ref){_lymDocs[ref.id]=data;document.getElementById('lym-tab-list').click();lymRenderList(_lymDocs);lymInitAddForm();var s=document.getElementById('lym-add-status');if(s){s.textContent='Album added.';s.className='status-msg status-ok';}addBtn.disabled=false;addBtn.textContent='Add Album';})
      .catch(function(e){var s=document.getElementById('lym-add-status');if(s){s.textContent='Error: '+e.message;s.className='status-msg status-err';}addBtn.disabled=false;addBtn.textContent='Add Album';});
  });
  var clearBtn=document.getElementById('lym-add-clear-btn');
  if(clearBtn)clearBtn.addEventListener('click',lymInitAddForm);
})();

/* ── Tab switching ── */
(function(){
  var t1=document.getElementById('lym-tab-list'),t2=document.getElementById('lym-tab-add');
  var p1=document.getElementById('lym-pane-list'),p2=document.getElementById('lym-pane-add');
  if(!t1||!t2)return;
  t1.addEventListener('click',function(){t1.classList.add('active');t2.classList.remove('active');p1.classList.add('active');p2.classList.remove('active');});
  t2.addEventListener('click',function(){t2.classList.add('active');t1.classList.remove('active');p2.classList.add('active');p1.classList.remove('active');});
})();

/* ── Boot ── */
(function(){
  lymInitAddForm();
  var _jt=0,_jiv=setInterval(function(){
    if(window.jestaDB){clearInterval(_jiv);lymLoad();}
    else if(++_jt>80){clearInterval(_jiv);var c=document.getElementById('lym-list-inner');if(c)c.innerHTML='<div style="color:rgba(251,56,56,0.6);font-size:0.7rem;">Firestore unavailable.</div>';}
  },100);
})();
})();
