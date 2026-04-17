// Shared admin compression utilities — loaded before all admin manager scripts.
(function () {
  window.__adminUtils = window.__adminUtils || {};

  // Compress a File to a JPEG Blob.
  // Returns a Promise that resolves to Blob, or rejects with an Error.
  // Callers should catch and fall back to the original file on rejection.
  window.__adminUtils.compressImage = function (file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
        else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('canvas.toBlob returned null')); return; }
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Image failed to load: ' + file.name));
      };
      img.src = url;
    });
  };

  // Build a "Compress for Upload" UI section.
  // opts:
  //   maxDim     {number}    max dimension for resize (e.g. 1200)
  //   quality    {number}    JPEG quality 0–1 (e.g. 0.82)
  //   title      {string}    section heading (default: 'Compress for Upload')
  //   onDownload {function}  called with (baseName) when user clicks a download link
  //
  // Returns a DOM element ready to be appended.
  window.__adminUtils.buildCompressWidget = function (opts) {
    opts = opts || {};
    var maxDim    = opts.maxDim    != null ? opts.maxDim    : 1200;
    var quality   = opts.quality   != null ? opts.quality   : 0.82;
    var title     = opts.title     || 'Compress for Upload';
    var onDownload = typeof opts.onDownload === 'function' ? opts.onDownload : null;

    var wrap = document.createElement('div');

    var heading = document.createElement('div');
    heading.style.cssText = 'font-size:0.62rem;letter-spacing:0.22em;color:rgba(201,168,76,0.45);text-transform:uppercase;margin-bottom:8px;';
    heading.textContent = title;

    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.multiple = true;
    fileInput.style.cssText = 'display:none;';

    var pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'btn-ghost btn-sm';
    pickBtn.textContent = 'CHOOSE FILES';
    pickBtn.onclick = function () { fileInput.click(); };

    var results = document.createElement('div');
    results.style.cssText = 'margin-top:10px;';

    fileInput.onchange = function () {
      results.innerHTML = '';
      Array.prototype.forEach.call(fileInput.files, function (file) {
        var item = document.createElement('div');
        item.style.cssText = 'padding:6px 0;border-bottom:1px solid rgba(201,168,76,0.06);font-size:0.62rem;color:rgba(201,168,76,0.5);display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

        var nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'flex:1;word-break:break-all;';
        var beforeKB = (file.size / 1024).toFixed(0);
        nameSpan.textContent = file.name + ' (' + beforeKB + ' KB)';
        item.appendChild(nameSpan);

        var statusSpan = document.createElement('span');
        statusSpan.style.cssText = 'color:rgba(201,168,76,0.3);';
        statusSpan.textContent = 'compressing\u2026';
        item.appendChild(statusSpan);
        results.appendChild(item);

        window.__adminUtils.compressImage(file, maxDim, quality).then(function (blob) {
          var afterKB = (blob.size / 1024).toFixed(0);
          statusSpan.textContent = beforeKB + ' KB \u2192 ' + afterKB + ' KB';
          statusSpan.style.color = '#02E127';

          var baseName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          var dlBtn = document.createElement('a');
          dlBtn.href = URL.createObjectURL(blob);
          dlBtn.download = baseName;
          dlBtn.className = 'btn-ghost btn-sm';
          dlBtn.style.cssText = 'font-size:0.5rem;padding:3px 8px;text-decoration:none;';
          dlBtn.textContent = '\u2193 ' + baseName;
          dlBtn.addEventListener('click', function () {
            if (onDownload) onDownload(baseName);
          });
          item.appendChild(dlBtn);
        }).catch(function (err) {
          console.warn('[__adminUtils] compressImage failed — original file should be used:', err);
          statusSpan.textContent = 'compression failed \u2014 use original file';
          statusSpan.style.color = 'rgba(251,56,56,0.6)';
        });
      });
      fileInput.value = '';
    };

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;';
    row.appendChild(pickBtn);
    row.appendChild(fileInput);

    wrap.appendChild(heading);
    wrap.appendChild(row);
    wrap.appendChild(results);
    return wrap;
  };
})();
