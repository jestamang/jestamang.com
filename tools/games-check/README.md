# games-check

Headless functional test for the nine Jestamang games. Drives the real site (or a local
server) in Chrome over the DevTools protocol, no npm install needed (Node 22+, Google Chrome).

```
node load-pass.js                 # load every game: exceptions, console errors, failed requests, DOM sanity (~1.5 min)
node play-pass.js                 # start, play, reach game over / win, submit a score signed out (~10 min)
```

Both write a JSON report beside the script and print a per-game summary. `play-pass.js`
also saves a screenshot per game and phase (`play_<game>_<phase>.png`).

What play-pass proves per game: the start control works, scoring changes the HUD, the
win or game-over screen appears, the name modal opens, and what the page shows after a
signed-out submit (must read "score not saved", never a fake row). Signed-in saves cannot
be tested here; verify one by hand.

Notes
- Runs against https://jestamang.com/ by default. To test a branch before merge, serve the repo
  (`python3 -m http.server 8765 --bind 127.0.0.1` from the repo root) and change BASE/URLs to
  `http://127.0.0.1:8765/`. The public Firebase key is not referrer-restricted, so Firestore works.
- The generic clicker is random; ear-training games sometimes need a second run to reach the end.
  Entity Pair and Memory Vault need their solvers (see the pass scripts for the dataset.id /
  aria-label approach) to reach the win screen deterministically.
- cdp.js is the whole browser layer (launch, one page per game, evaluate, screenshot).
