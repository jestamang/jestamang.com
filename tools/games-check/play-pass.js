const { launch, openPage, closePage, sleep } = require('./cdp.js');
const fs = require('fs');
const BLACKLIST = /accept|decline|cosmic scrolls|how to play|games$|replay|hear again|enter without saving|learn|close|✕|×|menu|log in|home/i;
const GAMES = [
  { p: 'games/void.html', start: '#startBtn', play: 'idle', over: ['#finalScore', '#lb-name-modal'], maxWait: 45 },
  { p: 'games/cosmic-conductor.html', start: '#startBtn', play: 'idle', over: ['#finalScore', '#lb-name-modal'], maxWait: 60 },
  { p: 'game-memory.html', start: null, play: 'memory', over: ['#win-overlay', '#lb-name-modal'], maxWait: 40 },
  { p: 'games/entity-pair.html', start: null, play: 'entity', over: ['#win-overlay', '#lb-name-modal'], maxWait: 40 },
  { p: 'games/chord-conjurer.html', start: '#startBtn', play: 'answers', over: ['#finalScore', '#lb-name-modal'], maxWait: 70 },
  { p: 'games/rhythm-architect.html', start: '#startBtn', play: 'answers', over: ['#scr-over', '#score-final', '#lb-name-modal'], maxWait: 70 },
  { p: 'games/harmony-oracle.html', start: null, play: 'answers', over: ['#finalScore', '#lb-name-modal'], maxWait: 70 },
  { p: 'games/pitch-oracle.html', start: null, play: 'answers', over: ['#finalScore', '#lb-name-modal'], maxWait: 70 },
  { p: 'game-oracle.html', start: '#draw-btn', play: 'oracle', over: ['#oracle-card'], maxWait: 10 },
];
const VIS = `function(el){ if(!el) return false; var r=el.getBoundingClientRect(); var cs=getComputedStyle(el); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&cs.opacity!=='0'; }`;
(async () => {
  const { proc, port, dir } = await launch();
  const results = {};
  for (const g of GAMES) {
    const page = await openPage(port);
    const rec = { page: g.p, phases: {}, notes: [] };
    let exc = []; let failed = [];
    page.on((m) => {
      if (m.method === 'Runtime.exceptionThrown') exc.push(((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text || '').split('\n')[0].slice(0, 160));
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) failed.push(m.params.response.status + ' ' + m.params.response.url.replace('https://jestamang.com/', ''));
    });
    const snapshot = () => { const e = exc.slice(); const f = failed.slice(); exc = []; failed = []; return { exceptions: e.length, sample: [...new Set(e)].slice(0, 2), failed: [...new Set(f)].slice(0, 6) }; };
    const shot = async (tag) => { const s = await page.send('Page.captureScreenshot', { format: 'png' }); const f = `${__dirname}/play_${g.p.replace(/[\/.]/g, '_')}_${tag}.png`; fs.writeFileSync(f, Buffer.from(s.data, 'base64')); return f.split('/').pop(); };
    const state = () => page.eval(`(function(){ var vis=${VIS}; var t=function(sel){var el=document.querySelector(sel); return el&&vis(el)?el.textContent.replace(/\\s+/g,' ').trim().slice(0,80):null;};
      return { hud: t('#hud')||t('#ho-hud')||t('#po-hud')||t('#ra-hud')||t('#cc-score-lbl')||t('#s-moves')||t('#s-score')||t('#streak-display'),
               finalScore: t('#finalScore')||t('#score-final')||t('#win-score-big')||t('#win-stat-txt'),
               nameModal: !!(document.querySelector('#lb-name-modal')&&vis(document.querySelector('#lb-name-modal'))),
               winOverlay: !!(document.querySelector('#win-overlay')&&vis(document.querySelector('#win-overlay'))),
               over: !!(document.querySelector('#scr-over')&&vis(document.querySelector('#scr-over'))),
               oracle: t('#oracle-card') }; })()`);
    try {
      await page.send('Page.navigate', { url: 'https://jestamang.com/' + g.p }); await sleep(5000);
      rec.phases.load = snapshot(); rec.phases.load.state = await state();
      // dismiss cookie banner if present
      await page.eval(`(function(){ var b=[...document.querySelectorAll('button')].find(x=>/^accept$/i.test(x.textContent.trim())); if(b) b.click(); return !!b; })()`);
      if (g.start) { const ok = await page.eval(`(function(){ var b=document.querySelector('${g.start}'); if(!b) return 'no button'; b.click(); return 'clicked'; })()`); rec.notes.push('start: ' + ok); }
      await sleep(4000);
      rec.phases.afterStart = snapshot(); rec.phases.afterStart.state = await state(); rec.phases.afterStart.shot = await shot('started');
      // play
      const t0 = Date.now(); let clicks = 0; let done = false; let lastState = null;
      while (Date.now() - t0 < g.maxWait * 1000 && !done) {
        if (g.play === 'memory' || g.play === 'entity') {
          const r = await page.eval(`(function(){ var vis=${VIS}; var cards=[...document.querySelectorAll('#grid .card, #ep-grid .ep-card, #ep-grid [class*="card"]')].filter(function(c){return vis(c)&&!/matched|done|solved/.test(c.className);});
            if(!cards.length) return 'no cards'; var key=function(c){return c.dataset.id||c.dataset.key||c.dataset.pair||c.dataset.entity||c.dataset.name||c.getAttribute('data-id')||'';};
            var groups={}; cards.forEach(function(c){var k=key(c); if(k) (groups[k]=groups[k]||[]).push(c);});
            var pair=Object.values(groups).find(function(a){return a.length>=2;});
            if(!pair){ cards[0].click(); return 'clicked first (no key match; keys='+Object.keys(cards[0].dataset).join(',')+')'; }
            pair[0].click(); setTimeout(function(){pair[1].click();},250); return 'pair '+key(pair[0]); })()`);
          clicks++; if (r === 'no cards') { rec.notes.push('memory: no cards found'); break; }
          await sleep(1400);
        } else if (g.play === 'answers') {
          const r = await page.eval(`(function(){ var vis=${VIS}; var bl=${BLACKLIST.toString()}; var bad=/^(lb-|jsearch|cookie|htp|how|ltn|learn|nav|jt)/;
            var all=[...document.querySelectorAll('button')].filter(function(b){return vis(b)&&!b.disabled&&!bad.test(b.id||'')&&!bl.test(b.textContent.trim())&&!b.closest('#lb-modal,#lb-name-modal,#jtnav,#jsearch-overlay');});
            var nxt=all.find(function(b){return /next|continue|→/.test(b.textContent)}); if(nxt){nxt.click();return 'next';}
            var st=all.find(function(b){return /begin|start|hear|listen|play/i.test(b.textContent)&&b.id!=='restartBtn'}); 
            var ans=all.filter(function(b){return !/begin|start|again|restart/i.test(b.textContent)&&b.id!=='restartBtn'});
            var pick=ans.length?ans[Math.floor(Math.random()*ans.length)]:st; if(!pick) return 'nothing clickable'; pick.click(); return 'clicked '+(pick.id||pick.className||pick.textContent.trim().slice(0,20)); })()`);
          clicks++; if (clicks % 10 === 0) rec.notes.push(`click ${clicks}: ${r}`); await sleep(1300);
        } else if (g.play === 'oracle') { await sleep(2000); done = true; }
        else { await sleep(2000); }
        lastState = await state();
        if (lastState.nameModal || lastState.winOverlay || lastState.over || (lastState.finalScore && g.play !== 'oracle')) done = true;
      }
      rec.phases.play = snapshot(); rec.phases.play.state = lastState || await state(); rec.phases.play.clicks = clicks; rec.phases.play.seconds = Math.round((Date.now() - t0) / 1000); rec.phases.play.reachedEnd = done; rec.phases.play.shot = await shot('end');
      // leaderboard submit while signed out
      const sub = await page.eval(`(function(){ var vis=${VIS}; var inp=document.querySelector('#lb-name-input,#lb-name-inp'); var btn=document.querySelector('#lb-name-submit,#lb-name-confirm,#btn-submit-win');
        if(btn&&vis(btn)&&/enter leaderboard/i.test(btn.textContent)){btn.click(); return 'opened via btn-submit-win';}
        if(!inp||!vis(inp)) return 'no name modal visible'; inp.value='Headless Test'; inp.dispatchEvent(new Event('input')); var b=document.querySelector('#lb-name-submit,#lb-name-confirm'); if(b){b.click(); return 'submitted';} return 'no submit button'; })()`);
      if (/opened/.test(sub)) { await sleep(1500); await page.eval(`(function(){ var inp=document.querySelector('#lb-name-input,#lb-name-inp'); if(inp){inp.value='Headless Test'; inp.dispatchEvent(new Event('input'));} var b=document.querySelector('#lb-name-submit,#lb-name-confirm'); if(b) b.click(); })()`); }
      await sleep(4000);
      rec.phases.submit = snapshot(); rec.phases.submit.action = sub;
      rec.phases.submit.status = await page.eval(`(function(){ var els=[...document.querySelectorAll('#lb-name-modal *, #lb-modal *, .status-msg, [id*="status"], #lb-new-banner')]; return [...new Set(els.map(function(e){return e.children.length?'':e.textContent.trim();}).filter(function(t){return t&&t.length<120;}))].slice(0,6); })()`);
      rec.phases.submit.shot = await shot('submit');
    } catch (e) { rec.notes.push('harness error: ' + e.message); }
    results[g.p] = rec;
    console.log(JSON.stringify(rec));
    await closePage(port, page);
  }
  fs.writeFileSync(__dirname + '/last-play-pass.json', JSON.stringify(results, null, 1));
  proc.kill(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
})().catch((e) => { console.error('harness failed:', e); process.exit(2); });
