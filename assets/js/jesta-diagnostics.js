(function () {
  'use strict';
  window._jestaDiagnostics = [];

  function record(type, detail) {
    var entry = { type: type, detail: detail, ts: new Date().toISOString() };
    window._jestaDiagnostics.push(entry);
    console.log('[JESTA-DIAG]', type, detail);
  }

  var _origError = console.error;
  var _origWarn = console.warn;

  console.error = function () {
    record('console.error', Array.prototype.slice.call(arguments).join(' '));
    _origError.apply(console, arguments);
  };

  console.warn = function () {
    record('console.warn', Array.prototype.slice.call(arguments).join(' '));
    _origWarn.apply(console, arguments);
  };

  window.onerror = function (msg, src, line, col, err) {
    record('window.onerror', {
      message: msg,
      source: src,
      line: line,
      col: col,
      error: err ? err.toString() : null
    });
    return false;
  };

  window.addEventListener('unhandledrejection', function (e) {
    record('unhandledrejection', {
      reason: e.reason ? (typeof e.reason.toString === 'function' ? e.reason.toString() : String(e.reason)) : String(e.reason)
    });
  });

  window.addEventListener('unload', function () {
    if (window._jestaDiagnostics.length > 0) {
      console.log('[JESTA-DIAG] FULL LOG:', JSON.stringify(window._jestaDiagnostics, null, 2));
    }
  });
}());
