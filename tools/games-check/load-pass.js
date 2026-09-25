const { launch, openPage, closePage, sleep } = require('./cdp.js');
const BASE = (process.env.GAMES_BASE || 'https://jestamang.com/').replace(/\/?$/, '/');
const QUIET = process.argv.includes('--quiet');
// third-party beacons that reject non-production origins (Cloudflare Web Analytics); never a site defect
const IGNORE = /cloudflareinsights\.com/;
const PAGES = ['game-memory.html', 'game-oracle.html', 'games/chord-conjurer.html', 'games/cosmic-conductor.html', 'games/entity-pair.html', 'games/harmony-oracle.html', 'games/pitch-oracle.html', 'games/rhythm-architect.html', 'games/void.html'];
(async () => {
  const { proc, port, dir } = await launch();
  const out = {};
  for (const p of PAGES) {
    const page = await openPage(port);
    const rec = { errors: [], failed: [], consoleErrors: [] };
    const urls = {};
    page.on((m) => {
      if (m.method === 'Runtime.exceptionThrown') rec.errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text || '').split('\n')[0].slice(0, 220));
      if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) rec.consoleErrors.push(m.params.type + ': ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));
      if (m.method === 'Network.requestWillBeSent') urls[m.params.requestId] = m.params.request.url;
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) rec.failed.push(m.params.response.status + ' ' + m.params.response.url.replace(BASE, ''));
      if (m.method === 'Network.loadingFailed' && !m.params.canceled && !IGNORE.test(urls[m.params.requestId] || '')) rec.failed.push('FAILED ' + (m.params.errorText || '') + ' ' + (m.params.type || '') + ' ' + (urls[m.params.requestId] || '').replace(BASE, ''));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') rec.consoleErrors.push('log: ' + m.params.entry.text.slice(0, 200));
    });
    await page.send('Page.navigate', { url: BASE + p });
    await sleep(7000);
    try {
      rec.dom = await page.eval(`(function(){
        var lb = document.querySelector('#lb-list, .lb-list, #leaderboard, [id*="leaderboard"], [id*="lb-"]');
        return { title: document.title, jestaDB: !!window.jestaDB, firebase: typeof firebase, canvas: document.querySelectorAll('canvas').length,
          buttons: document.querySelectorAll('button').length, lbText: lb ? lb.textContent.replace(/\\s+/g,' ').trim().slice(0,160) : null,
          bodyLen: document.body.innerText.length };
      })()`);
    } catch (e) { rec.dom = { error: e.message }; }
    out[p] = rec;
    if (!QUIET) console.log(`\n=== ${p} ===`);
    if (!QUIET) console.log(' dom:', JSON.stringify(rec.dom));
    if (!QUIET) console.log(' exceptions:', rec.errors.length, rec.errors.slice(0, 5));
    if (!QUIET) console.log(' console errors/warnings:', rec.consoleErrors.length, rec.consoleErrors.slice(0, 5));
    if (!QUIET) console.log(' failed requests:', rec.failed.length, rec.failed.slice(0, 12));
    await closePage(port, page);
  }
  require('fs').writeFileSync(__dirname + '/last-load-pass.json', JSON.stringify(out, null, 1));
  const bad = Object.entries(out).filter(([, r]) => r.errors.length || r.failed.length);
  if (QUIET) for (const [p, r] of bad) { console.log(`\n${p}`); for (const e of r.errors.slice(0, 5)) console.log('  exception:', e); for (const f of r.failed.slice(0, 12)) console.log('  request:', f); }
  console.log(`\nload pass against ${BASE}: ${Object.keys(out).length} games, ${bad.length} with exceptions or failed requests${bad.length ? ': ' + bad.map(([p]) => p).join(', ') : ''}`);
  process.exitCode = bad.length ? 1 : 0;
  proc.kill(); try { require('fs').rmSync(dir, { recursive: true, force: true }); } catch (e) {}
})().catch((e) => { console.error('harness failed:', e); process.exit(2); });
