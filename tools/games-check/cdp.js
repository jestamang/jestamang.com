// Minimal Chrome DevTools Protocol driver (Node 22+, native WebSocket). Read-only against the live site.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
async function launch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
  const port = 9222 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) break; } catch (e) {} await new Promise((r) => setTimeout(r, 200)); }
  return { proc, port, dir };
}
class Page {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) this.handlers.forEach((h) => h(m)); }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
  on(fn) { this.handlers.push(fn); }
  async eval(expr, awaitPromise = true) { const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : JSON.stringify(r.exceptionDetails)); return r.result.value; }
}
async function openPage(port) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const p = new Page(ws); p.targetId = t.id;
  await p.send('Runtime.enable'); await p.send('Network.enable'); await p.send('Page.enable'); await p.send('Log.enable');
  return p;
}
async function closePage(port, p) { try { p.ws.close(); } catch (e) {} try { await fetch(`http://127.0.0.1:${port}/json/close/${p.targetId}`); } catch (e) {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = { launch, openPage, closePage, sleep };
