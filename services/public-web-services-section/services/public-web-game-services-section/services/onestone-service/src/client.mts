/**
 * `client` — the no-build, dependency-free browser client for onestone.
 *
 * One self-contained HTML document (served at `/`). It speaks the wire protocol in
 * `./types.mts` verbatim — `POST /session {name}` to log in, `EventSource /stream?token=…`
 * for `ClientFrame` pushes, `POST /input {token,input}` to act, `GET /skus` + `POST /pay`
 * for the shop — and renders every board from `ClientFrame.geometry` alone: the client
 * never computes a match, a fall, or a color. It is presentation over a pure server
 * engine (determinism doctrine, DESIGN.md) and cannot cheat because it has no rules to
 * cheat with — the SVG polygons and the settle animation are the only things it owns.
 *
 * Screens: login → level map (3 chapters, lock/star/HUD state derived from `PlayerMeta`
 * alone — the client hardcodes the 20-levels-per-chapter boundary from DESIGN.md rather
 * than fetching a level catalog, since none is on the wire) → board (SVG built fresh from
 * `geometry.cells[].poly` whenever the level changes; tiles keyed by cell id so a settle's
 * `lastSteps` can be replayed as clear-flash → fall-translate → spawn-pop before the
 * authoritative `tiles` array is painted verbatim) → win/loss sheet, shop sheet, and the
 * Lattice Garden trophy case.
 *
 * The inner script avoids template literals and backtick characters entirely (and never
 * types the two-character sequence `$` + `{`) so the whole document can be one outer
 * template string with zero escaping gymnastics — see the sibling flickering-delve-service
 * client for the same convention. Every JS string below is single-quoted when it needs to
 * hold a literal `"`, so no backslash escaping is needed anywhere in this file.
 */
export const CLIENT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>onestone</title>
<style>
  :root{
    --bg-0:#06070d; --bg-1:#0c0e1a; --bg-2:#12142400;
    --glass:rgba(255,255,255,.05); --glass-brd:rgba(255,255,255,.10); --glass-hi:rgba(255,255,255,.14);
    --ink:#f4f2ec; --ink-dim:#9aa1ba; --ink-faint:#5c6280;
    --violet:#8b6bf2; --violet-2:#c9a8ff; --cyan:#3fd0e0; --gold:#ffcc66; --rose:#ff6f91;
    --good:#3ddc97; --bad:#ff5d6c;
    --c0:#ff5470; --c1:#ffb020; --c2:#22c55e; --c3:#38bdf8; --c4:#a78bfa;
    --shadow:0 20px 50px -18px rgba(0,0,0,.65);
    --shadow-sm:0 8px 20px -10px rgba(0,0,0,.55);
    --spring:cubic-bezier(.34,1.56,.64,1);
    --ease:cubic-bezier(.22,.9,.3,1);
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:
      radial-gradient(1000px 560px at 18% -8%, #241a3a 0%, transparent 60%),
      radial-gradient(900px 520px at 100% 0%, #0d2b33 0%, transparent 55%),
      linear-gradient(180deg,var(--bg-1),var(--bg-0));
    color:var(--ink); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;
    -webkit-font-smoothing:antialiased; overflow-x:hidden}
  h1,h2,h3{margin:0;font-weight:700;letter-spacing:.01em}
  button{font:inherit;color:inherit;background:none;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .glass{background:var(--glass);border:1px solid var(--glass-brd);border-radius:22px;
    -webkit-backdrop-filter:blur(20px) saturate(150%);backdrop-filter:blur(20px) saturate(150%);
    box-shadow:var(--shadow)}
  .hidden{display:none !important}
  .screen{display:none;min-height:100vh;flex-direction:column}
  .screen.active{display:flex}
  .btn{display:inline-flex;align-items:center;gap:.45rem;padding:.7rem 1.3rem;border-radius:14px;
    background:var(--glass);border:1px solid var(--glass-brd);color:var(--ink);font-weight:600;
    transition:transform .18s var(--spring),box-shadow .18s var(--ease),border-color .18s var(--ease)}
  .btn:hover{border-color:var(--glass-hi);box-shadow:var(--shadow-sm)}
  .btn:active{transform:scale(.95)}
  .btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .btn-primary{background:linear-gradient(135deg,var(--violet),#5f7cf2);border-color:transparent;color:#fff;
    box-shadow:0 10px 26px -10px rgba(139,107,242,.7)}
  .btn-primary:hover{box-shadow:0 14px 30px -8px rgba(139,107,242,.85)}
  .btn-gold{background:linear-gradient(135deg,var(--gold),#ff9a4d);border-color:transparent;color:#241400}
  .btn-ghost{background:transparent;border-color:var(--glass-brd)}
  .small{font-size:.8rem;color:var(--ink-dim)}
  .center{display:flex;align-items:center;justify-content:center}
  input[type=text]{font:inherit;background:#0e1020;color:var(--ink);border:1px solid var(--glass-brd);
    border-radius:12px;padding:.65rem .9rem;width:100%}
  input[type=text]:focus{outline:none;border-color:var(--violet)}

  /* ---------- login ---------- */
  #screen-login{align-items:center;justify-content:center;padding:1.5rem}
  .login-card{width:min(360px,92vw);padding:2rem 1.7rem;text-align:center}
  .login-mark{width:64px;height:64px;margin:0 auto .9rem;filter:drop-shadow(0 8px 18px rgba(139,107,242,.5))}
  .login-title{font-size:1.5rem;background:linear-gradient(135deg,var(--violet-2),var(--cyan));
    -webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:.2rem}
  .login-sub{color:var(--ink-dim);font-size:.86rem;margin-bottom:1.3rem}
  #login-form{display:flex;flex-direction:column;gap:.7rem}
  #login-msg{min-height:1.2em;color:var(--bad);font-size:.82rem}

  /* ---------- top HUD (map + board share it) ---------- */
  .hud{display:flex;align-items:center;gap:.9rem;padding:.7rem 1rem;flex-wrap:wrap}
  .hud-chip{display:flex;align-items:center;gap:.35rem;padding:.35rem .7rem;border-radius:999px;
    background:var(--glass);border:1px solid var(--glass-brd);font-weight:600;font-size:.86rem}
  .hud-chip svg{width:16px;height:16px}
  .hud-chip.lives svg{color:var(--rose)}
  .hud-chip.shards svg{color:var(--gold)}
  .hud-chip.prisms svg{color:var(--violet-2)}
  .hud-chip.streak svg{color:#ff8a3d}
  .hud-spacer{flex:1}
  .hud-name{color:var(--ink-dim);font-size:.82rem}

  /* ---------- map ---------- */
  #screen-map{padding-bottom:2rem}
  .chapters{display:flex;gap:.6rem;padding:.4rem 1rem 1rem;overflow-x:auto}
  .chapter-tab{flex:0 0 auto;padding:.6rem 1rem;border-radius:16px;background:var(--glass);
    border:1px solid var(--glass-brd);display:flex;align-items:center;gap:.5rem;transition:all .2s var(--ease)}
  .chapter-tab svg{width:22px;height:22px}
  .chapter-tab.on{background:linear-gradient(135deg,rgba(139,107,242,.35),rgba(63,208,224,.25));
    border-color:var(--violet-2);box-shadow:0 0 0 1px rgba(201,168,255,.25) inset}
  .chapter-tab .ct-name{font-weight:700;font-size:.88rem}
  .chapter-tab .ct-sub{font-size:.72rem;color:var(--ink-dim)}
  #level-trail{max-width:520px;margin:0 auto;padding:1.2rem 1.4rem 3rem;display:flex;flex-direction:column;align-items:center}
  .lvl-node{position:relative;width:76px;height:76px;border-radius:50%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;margin:-.3rem 0;background:radial-gradient(circle at 32% 26%,#2a2748,#171432);
    border:2px solid var(--glass-brd);box-shadow:var(--shadow-sm);transition:transform .18s var(--spring)}
  .lvl-node:nth-child(4n+2){margin-left:-92px}
  .lvl-node:nth-child(4n){margin-left:92px}
  .lvl-node.next{border-color:var(--gold);box-shadow:0 0 0 5px rgba(255,204,102,.16),var(--shadow-sm);
    animation:pulse-glow 2.2s ease-in-out infinite}
  .lvl-node.done{border-color:var(--good)}
  .lvl-node.locked{opacity:.42;filter:grayscale(.6)}
  .lvl-node .lvl-num{font-weight:800;font-size:1.05rem}
  .lvl-node .lvl-stars{display:flex;gap:1px;margin-top:2px}
  .lvl-node .lvl-stars svg{width:9px;height:9px;color:var(--ink-faint)}
  .lvl-node .lvl-stars svg.on{color:var(--gold)}
  .lvl-node .lvl-lock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .lvl-node .lvl-lock svg{width:22px;height:22px;color:var(--ink-faint)}
  .lvl-node:active:not(.locked){transform:scale(.93)}
  @keyframes pulse-glow{0%,100%{box-shadow:0 0 0 5px rgba(255,204,102,.16),var(--shadow-sm)}
    50%{box-shadow:0 0 0 9px rgba(255,204,102,.05),var(--shadow-sm)}}

  /* ---------- board ---------- */
  #screen-board{align-items:stretch}
  #board-hud{padding:.6rem 1rem}
  #board-hud .btn-ghost{padding:.5rem}
  #board-hud .btn-ghost svg{width:18px;height:18px}
  #goal-list{display:flex;gap:.5rem;flex-wrap:wrap;padding:0 1rem .5rem;justify-content:center}
  .goal-chip{display:flex;align-items:center;gap:.4rem;padding:.35rem .65rem;border-radius:12px;
    background:var(--glass);border:1px solid var(--glass-brd);font-size:.78rem;font-weight:600}
  .goal-chip svg{width:15px;height:15px}
  .goal-chip.met{border-color:var(--good);color:var(--good)}
  .goal-chip .g-swatch{width:11px;height:11px;border-radius:3px;display:inline-flex;align-items:center;justify-content:center}
  .goal-chip .g-swatch-shape{width:8px;height:8px;fill:rgba(0,0,0,.55);pointer-events:none}
  #board-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:.5rem 1rem;position:relative;min-height:0}
  #board-svg{width:min(94vw,560px);height:auto;max-height:62vh;filter:drop-shadow(0 24px 40px rgba(0,0,0,.5))}
  .cellbg{fill:rgba(255,255,255,.03);stroke:rgba(255,255,255,.07);stroke-width:.03;transition:fill .15s}
  .tile{cursor:pointer}
  .tile .face{stroke:rgba(0,0,0,.25);stroke-width:.02;transition:filter .12s var(--ease)}
  .tile.selected .face{filter:brightness(1.28) saturate(1.15);stroke:#fff;stroke-width:.05}
  .tile.flash-clear .face{animation:flash-clear .32s var(--ease) forwards}
  .tile.flash-fire .face{animation:flash-fire .38s var(--ease)}
  .tile.clearing-out{animation:clear-shrink .22s var(--ease) forwards}
  .tile.spawn-in{animation:pop-in .32s var(--spring)}
  .tile .shape-mark{opacity:.32;pointer-events:none}
  .tile .special-mark{pointer-events:none}
  .tile .special-mark.glyph-prism{color:#fff}
  .tile .special-mark.glyph-nova{color:#fff}
  .tile .special-mark.glyph-striped{color:#fff}
  .tile .special-mark.glyph-ring{color:#fff}
  .tile .blocker{pointer-events:none}
  @keyframes flash-clear{0%{filter:brightness(1)}45%{filter:brightness(2.4) saturate(1.6)}100%{filter:brightness(2.4);opacity:0}}
  @keyframes flash-fire{0%{filter:brightness(1)}50%{filter:brightness(2.1) saturate(1.5) drop-shadow(0 0 6px #fff)}100%{filter:brightness(1)}}
  @keyframes clear-shrink{to{opacity:0;transform:scale(.2)}}
  @keyframes pop-in{0%{opacity:0;transform:scale(.2) translateY(-14px)}70%{opacity:1;transform:scale(1.12) translateY(0)}100%{transform:scale(1)}}
  #booster-bar{display:flex;gap:.6rem;justify-content:center;padding:.6rem 1rem 1.1rem;flex-wrap:wrap}
  .booster-btn{position:relative;width:52px;height:52px;border-radius:16px}
  .booster-btn svg{width:24px;height:24px}
  .booster-btn .bb-count{position:absolute;bottom:-4px;right:-4px;background:var(--violet);color:#fff;
    font-size:.66rem;font-weight:800;border-radius:999px;padding:.05rem .35rem;border:2px solid var(--bg-0)}
  .booster-btn.armed{border-color:var(--gold);box-shadow:0 0 0 4px rgba(255,204,102,.22)}
  .booster-btn.buyable{opacity:.75}
  .booster-btn .bb-price{position:absolute;bottom:-4px;right:-4px;background:var(--cyan);color:#06070d;
    font-size:.62rem;font-weight:800;border-radius:999px;padding:.05rem .35rem;border:2px solid var(--bg-0)}

  #chaos-flourish{position:fixed;inset:0;pointer-events:none;z-index:40;display:flex;align-items:center;justify-content:center}
  #chaos-flourish.burst{animation:chaos-burst .95s var(--ease) forwards}
  #chaos-flourish .cf-word{font-size:clamp(2rem,9vw,4.2rem);font-weight:900;letter-spacing:.05em;
    background:linear-gradient(135deg,var(--gold),var(--rose),var(--violet-2));-webkit-background-clip:text;
    background-clip:text;color:transparent;filter:drop-shadow(0 0 30px rgba(255,204,102,.55))}
  @keyframes chaos-burst{0%{opacity:0;transform:scale(.7)}18%{opacity:1;transform:scale(1.05)}30%{transform:scale(1)}
    82%{opacity:1}100%{opacity:0;transform:scale(1.18)}}

  /* ---------- sheets (modal overlays) ---------- */
  .sheet-overlay{position:fixed;inset:0;background:rgba(4,4,10,.6);-webkit-backdrop-filter:blur(6px);
    backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem}
  .sheet-overlay.hidden{display:none}
  .sheet{width:min(420px,94vw);max-height:88vh;overflow-y:auto;padding:1.6rem;animation:pop-in .28s var(--spring)}
  .sheet h2{font-size:1.15rem;margin-bottom:.2rem}
  .sheet .close-x{position:absolute;top:1rem;right:1rem}
  .sheet-inner{position:relative}
  .result-stars{display:flex;gap:.5rem;justify-content:center;margin:1.1rem 0}
  .result-stars svg{width:44px;height:44px;color:var(--ink-faint);transform:scale(.4);opacity:0}
  .result-stars svg.on{color:var(--gold);animation:star-pop .5s var(--spring) forwards;filter:drop-shadow(0 0 10px rgba(255,204,102,.6))}
  .result-stars svg:nth-child(1){animation-delay:.05s}
  .result-stars svg:nth-child(2){animation-delay:.2s}
  .result-stars svg:nth-child(3){animation-delay:.35s}
  @keyframes star-pop{0%{transform:scale(.2) rotate(-35deg);opacity:0}65%{transform:scale(1.25) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0)}}
  .result-title{text-align:center;font-size:1.4rem;margin-bottom:.15rem}
  .result-sub{text-align:center;color:var(--ink-dim);font-size:.85rem;margin-bottom:.2rem}
  .result-row{display:flex;justify-content:space-between;padding:.35rem 0;border-top:1px solid var(--glass-brd);font-size:.88rem}
  .result-row:first-of-type{border-top:0}
  .result-actions{display:flex;gap:.6rem;margin-top:1.1rem}
  .result-actions .btn{flex:1;justify-content:center}

  .sku-row,.trophy-card{display:flex;align-items:center;gap:.8rem;padding:.7rem 0;border-top:1px solid var(--glass-brd)}
  .sku-row:first-child,.trophy-card:first-child{border-top:0}
  .sku-title{font-weight:700;font-size:.92rem}
  .sku-desc{color:var(--ink-dim);font-size:.76rem}
  .sku-buy{margin-left:auto;flex:0 0 auto}
  .trophy-mini{width:56px;height:56px;flex:0 0 auto;opacity:.35}
  .trophy-mini.earned{opacity:1;filter:drop-shadow(0 4px 12px rgba(201,168,255,.4))}
  .trophy-name{font-weight:700}
  .trophy-state{font-size:.76rem;color:var(--ink-dim)}

  #toast{position:fixed;bottom:1.3rem;left:50%;transform:translateX(-50%) translateY(20px);z-index:60;
    padding:.7rem 1.1rem;font-size:.85rem;font-weight:600;opacity:0;pointer-events:none;transition:all .28s var(--spring)}
  #toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

  #board-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:.6rem;color:var(--ink-dim)}
  .spin{width:22px;height:22px;border-radius:50%;border:3px solid var(--glass-brd);border-top-color:var(--violet-2);
    animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}

  @media(max-width:420px){ .lvl-node:nth-child(4n+2){margin-left:-70px} .lvl-node:nth-child(4n){margin-left:70px} }
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute">
<defs>
  <symbol id="glyph-shape-0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></symbol>
  <symbol id="glyph-shape-1" viewBox="0 0 24 24"><polygon points="12,5 19,19 5,19"/></symbol>
  <symbol id="glyph-shape-2" viewBox="0 0 24 24"><polygon points="12,4 20,12 12,20 4,12"/></symbol>
  <symbol id="glyph-shape-3" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.4"/></symbol>
  <symbol id="glyph-shape-4" viewBox="0 0 24 24"><path d="M10,4 h4 v6 h6 v4 h-6 v6 h-4 v-6 h-6 v-4 h6 z"/></symbol>

  <symbol id="glyph-striped" viewBox="0 0 24 24">
    <rect x="2" y="7.5" width="20" height="3" rx="1.5"/>
    <rect x="2" y="13.5" width="20" height="3" rx="1.5"/>
  </symbol>
  <symbol id="glyph-nova" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="6.4" fill="none" stroke="currentColor" stroke-width="2.6"/>
    <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <line x1="12" y1="1" x2="12" y2="4.4"/><line x1="12" y1="19.6" x2="12" y2="23"/>
      <line x1="1" y1="12" x2="4.4" y2="12"/><line x1="19.6" y1="12" x2="23" y2="12"/>
      <line x1="4.2" y1="4.2" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="19.8" y2="19.8"/>
      <line x1="19.8" y1="4.2" x2="17.4" y2="6.6"/><line x1="6.6" y1="17.4" x2="4.2" y2="19.8"/>
    </g>
  </symbol>
  <symbol id="glyph-prism" viewBox="0 0 24 24">
    <path d="M12,2.5 L14.7,9.2 L21.8,9.6 L16.2,14 L18.2,21 L12,17 L5.8,21 L7.8,14 L2.2,9.6 L9.3,9.2 Z"/>
  </symbol>
  <symbol id="glyph-ring" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="7.6" fill="none" stroke="currentColor" stroke-width="2.4"/>
  </symbol>

  <symbol id="glyph-heart" viewBox="0 0 24 24"><path d="M12,20.5 C6,16 2,12.3 2,8.4 2,5.4 4.4,3 7.4,3 9.2,3 10.8,3.9 12,5.3 13.2,3.9 14.8,3 16.6,3 19.6,3 22,5.4 22,8.4 22,12.3 18,16 12,20.5 Z"/></symbol>
  <symbol id="glyph-shard" viewBox="0 0 24 24"><polygon points="12,2 20,9 16,22 8,22 4,9"/></symbol>
  <symbol id="glyph-prismcur" viewBox="0 0 24 24"><polygon points="12,2 21,8.5 17.5,21 6.5,21 3,8.5"/></symbol>
  <symbol id="glyph-flame" viewBox="0 0 24 24"><path d="M12,2 C12,7 7,8 7,13 A5,5 0 0,0 17,13 C17,10.5 15.5,9.5 15.5,9.5 C16.5,12 15,15.5 12,17 C15,17.6 19,15.4 19,11 19,6 15,4 12,2 Z"/></symbol>
  <symbol id="glyph-lock" viewBox="0 0 24 24"><path d="M7,10 V7.5 A5,5 0 0,1 17,7.5 V10" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="5" y="10" width="14" height="10" rx="2.4"/></symbol>
  <symbol id="glyph-star" viewBox="0 0 24 24"><path d="M12,2.5 L14.7,9.2 L21.8,9.6 L16.2,14 L18.2,21 L12,17 L5.8,21 L7.8,14 L2.2,9.6 L9.3,9.2 Z"/></symbol>
  <symbol id="glyph-back" viewBox="0 0 24 24"><path d="M15,4 L7,12 L15,20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="glyph-shop" viewBox="0 0 24 24"><path d="M4,8 L6,3 H18 L20,8 M4,8 H20 M4,8 V19 A1,1 0 0,0 5,20 H19 A1,1 0 0,0 20,20 V8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></symbol>
  <symbol id="glyph-garden" viewBox="0 0 24 24"><path d="M12,3 L20,8 L12,13 L4,8 Z M4,12 L12,17 L20,12 M4,16 L12,21 L20,16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>
  <symbol id="glyph-hourglass" viewBox="0 0 24 24"><path d="M6,3 H18 M6,21 H18 M6,3 C6,9 12,10 12,12 C12,10 18,9 18,3 M6,21 C6,15 12,14 12,12 C12,14 18,15 18,21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="glyph-hammer" viewBox="0 0 24 24"><path d="M14,3 L21,10 L18,13 L11,6 Z M11,6 L3,14 L6,20 L14,13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="glyph-shuffle" viewBox="0 0 24 24"><path d="M3,7 H8 L18,17 H21 M18,7 H21 M3,17 H8 L13,12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M18,4 L21,7 L18,10 M18,14 L21,17 L18,20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="glyph-extramoves" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12,7 V12 L15.5,14.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20,5 L22,3 M22,3 L24,5 M22,3 V7" stroke="currentColor" stroke-width="1.5" fill="none"/></symbol>
  <symbol id="glyph-prismstart" viewBox="0 0 24 24"><polygon points="12,2 21,8.5 17.5,21 6.5,21 3,8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>

  <symbol id="tri-square" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></symbol>
  <symbol id="tri-hex" viewBox="0 0 24 24"><polygon points="12,2 21,7.2 21,16.8 12,22 3,16.8 3,7.2"/></symbol>
  <symbol id="tri-rhombille" viewBox="0 0 24 24"><polygon points="12,2 21,9 12,16 3,9"/><polygon points="12,16 21,9 21,18 12,22"/></symbol>
</defs>
</svg>

<div id="app">

  <section id="screen-login" class="screen active">
    <div class="glass login-card">
      <svg class="login-mark" viewBox="0 0 24 24" fill="none" stroke="url(#lg-grad)" stroke-width="1.4">
        <defs><linearGradient id="lg-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9a8ff"/><stop offset="1" stop-color="#3fd0e0"/></linearGradient></defs>
        <polygon points="12,2 21,9 12,16 3,9" fill="rgba(201,168,255,.18)"/>
        <polygon points="12,16 21,9 21,18 12,22" fill="rgba(63,208,224,.18)"/>
      </svg>
      <h1 class="login-title">onestone</h1>
      <p class="login-sub">every tile is a proof. every board, a different tiling.</p>
      <form id="login-form">
        <input type="text" id="login-name" placeholder="choose a name" autocomplete="username" maxlength="24">
        <button type="submit" class="btn btn-primary" id="login-btn">Enter the lattice</button>
      </form>
      <div id="login-msg"></div>
    </div>
  </section>

  <section id="screen-map" class="screen">
    <div class="hud">
      <span class="hud-chip lives"><svg><use href="#glyph-heart"/></svg><span id="hud-lives">5</span></span>
      <span class="hud-chip shards"><svg><use href="#glyph-shard"/></svg><span id="hud-shards">0</span></span>
      <span class="hud-chip prisms"><svg><use href="#glyph-prismcur"/></svg><span id="hud-prisms">0</span></span>
      <span class="hud-chip streak hidden" id="hud-streak-chip"><svg><use href="#glyph-flame"/></svg><span id="hud-streak">0</span></span>
      <span class="hud-spacer"></span>
      <span class="hud-name" id="hud-name"></span>
      <button class="btn btn-ghost" id="open-garden" title="Lattice Garden"><svg style="width:18px;height:18px"><use href="#glyph-garden"/></svg></button>
      <button class="btn btn-ghost" id="open-shop" title="Shop"><svg style="width:18px;height:18px"><use href="#glyph-shop"/></svg></button>
    </div>
    <nav class="chapters" id="chapter-tabs"></nav>
    <div id="level-trail"></div>
  </section>

  <section id="screen-board" class="screen">
    <div class="hud" id="board-hud">
      <button class="btn btn-ghost" id="board-back" title="Back to map"><svg><use href="#glyph-back"/></svg></button>
      <span class="hud-chip"><svg><use href="#glyph-hourglass"/></svg><span id="hud-moves">0</span></span>
      <span class="hud-chip"><svg><use href="#glyph-star"/></svg><span id="hud-score">0</span></span>
      <span class="hud-spacer"></span>
      <span class="hud-chip shards"><svg><use href="#glyph-shard"/></svg><span id="hud-shards-b">0</span></span>
    </div>
    <div id="goal-list"></div>
    <div id="board-wrap">
      <svg id="board-svg" viewBox="0 0 10 10" preserveAspectRatio="xMidYMid meet">
        <g id="cells-bg"></g>
        <g id="tiles-layer"></g>
      </svg>
      <div id="board-loading" class="hidden"><span class="spin"></span><span>opening the board…</span></div>
    </div>
    <div id="booster-bar"></div>
  </section>

  <div id="chaos-flourish" class="hidden"><span class="cf-word">CHAOS SIX</span></div>

  <div class="sheet-overlay hidden" id="sheet-result">
    <div class="glass sheet sheet-inner">
      <div class="result-stars" id="result-stars">
        <svg><use href="#glyph-star"/></svg><svg><use href="#glyph-star"/></svg><svg><use href="#glyph-star"/></svg>
      </div>
      <h2 class="result-title" id="result-title">Level clear</h2>
      <p class="result-sub" id="result-sub"></p>
      <div class="result-row"><span>Score</span><span id="result-score">0</span></div>
      <div class="result-row"><span>Moves left</span><span id="result-moves">0</span></div>
      <div class="result-row hidden" id="result-reward-row"><span>Reward</span><span id="result-reward"></span></div>
      <div class="result-actions">
        <button class="btn btn-ghost" id="result-retry">Retry</button>
        <button class="btn btn-primary" id="result-continue">Continue</button>
      </div>
    </div>
  </div>

  <div class="sheet-overlay hidden" id="sheet-shop">
    <div class="glass sheet sheet-inner">
      <button class="btn btn-ghost close-x" id="shop-close">✕</button>
      <h2>Shop</h2>
      <p class="small">Time and convenience — never a shortcut through a level's own math.</p>
      <div id="sku-list"></div>
      <p class="small" id="shop-msg"></p>
      <h2>Redeem prisms</h2>
      <p class="small">Prisms are earned (3-star clears) or bought above — spend them here on boosters.</p>
      <div id="prism-redeem"></div>
    </div>
  </div>

  <div class="sheet-overlay hidden" id="sheet-garden">
    <div class="glass sheet sheet-inner">
      <button class="btn btn-ghost close-x" id="garden-close">✕</button>
      <h2>Lattice Garden</h2>
      <p class="small">One trophy tiling per chapter cleared.</p>
      <div id="garden-grid"></div>
    </div>
  </div>

  <div id="toast"></div>
</div>

<script>
"use strict";

/* ===================== constants & tiny helpers ===================== */
var PALETTE = ["#ff5470","#ffb020","#22c55e","#38bdf8","#a78bfa"];
var COLOR_NAMES = ["Ruby","Amber","Jade","Azure","Violet"];
var LIFE_CAP = 5, LIFE_CAP_PASS = 8;
var LEVELS_PER_CHAPTER = 20;
var CHAPTERS = [
  {id:0, tiling:"square", sym:"tri-square", name:"Square Reaches", sub:"where it begins"},
  {id:1, tiling:"hex", sym:"tri-hex", name:"Hex Marches", sub:"six neighbors"},
  {id:2, tiling:"rhombille", sym:"tri-rhombille", name:"Rhombille Vault", sub:"tumbling cubes"}
];
var GOAL_ICON = {score:"glyph-star", clearMoss:"glyph-garden", breakGeodes:"glyph-shard", collectColor:null};
var GOAL_LABEL = {score:"Score", clearMoss:"Moss", breakGeodes:"Geodes", collectColor:"Collect"};
var BOOSTER_ICON = {hammer:"glyph-hammer", shuffle:"glyph-shuffle", extraMoves:"glyph-extramoves", prismStart:"glyph-prismstart"};
// Mirrors economy.mts's BOOSTER_PRICES — display-only (the server is the sole source of
// truth on affordability; buyBooster silently no-ops if the wallet can't cover it).
var BOOSTER_PRICES = {shuffle:40, hammer:60, extraMoves:90, prismStart:140};
// Mirrors economy.mts's PRISM_BOOSTER_PRICES — prisms are the paid/rare currency, so this is
// the one place a player can actually spend one (see the shop's "Redeem prisms" section);
// without it prisms were a purchasable dead end with no redemption anywhere in the game.
var PRISM_BOOSTER_PRICES = {shuffle:2, hammer:3, extraMoves:5, prismStart:7};
var STEP_MS = 95, FLASH_MS = 45;

function el(id){ return document.getElementById(id); }
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function show(elId, on){ el(elId).classList.toggle("hidden", !on); }
function setText(id, t){ var e = el(id); if(e && e.textContent !== t) e.textContent = t; }
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
function fmt(n){
  if(!isFinite(n)) return "\\u221e";
  var x = Math.abs(n), s = n < 0 ? "-" : "";
  if(x < 1000) return s + (Number.isInteger(x) ? x : x.toFixed(1));
  var suf = ["","K","M","B","T"], t = Math.floor(Math.log10(x) / 3);
  if(t < suf.length) return s + (x / Math.pow(10, t * 3)).toFixed(2) + suf[t];
  return s + x.toExponential(2);
}

var toastTimer = null;
function toast(msg){
  var t = el("toast");
  t.textContent = msg;
  t.classList.add("show");
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 2600);
}

/* ===================== state ===================== */
var state = {
  token: null, account: null, es: null,
  meta: null,
  screen: "login",
  chapterTab: 0,
  pendingLevel: null,
  curLevelId: null, curGeom: null, curTiles: null,
  tileEls: new Map(),
  selected: null,
  dragCell: null,
  armedBooster: null,
  animating: false,
  pendingFrame: null,
  lastChaosSig: null,
  shownResultSig: null,
  lastFinishedLevelId: null
};

function showScreen(name){
  ["login","map","board"].forEach(function(s){ el("screen-" + s).classList.toggle("active", s === name); });
  state.screen = name;
}

/* ===================== networking ===================== */
function apiPost(path, body){
  return fetch(path, {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(body || {})})
    .then(function(r){ return r.json().catch(function(){ return r.ok ? {} : {error:"request failed"}; }); });
}
function apiGet(path){
  return fetch(path).then(function(r){ return r.json().catch(function(){ return {}; }); });
}
function sendInput(input){
  if(!state.token) return Promise.resolve();
  return apiPost("/input", {token: state.token, input: input});
}
function openStream(){
  if(state.es) state.es.close();
  state.es = new EventSource("/stream?token=" + encodeURIComponent(state.token));
  // server.mts emits frames as a named "state" SSE event (sseWrite(res, "state", ...)),
  // not the default unnamed "message" event — listen on the actual event name it sends.
  state.es.addEventListener("state", function(ev){
    try { handleFrame(JSON.parse(ev.data)); } catch(err) { /* malformed/heartbeat frame — ignore */ }
  });
}
/* Scene.login derives the account deterministically from whatever key it is handed (see
 * accounts.mts's tokenActorId doc), with no secret — the same "token identity" doctrine the
 * sibling flickering-delve-service ships. That is only safe when the key is an opaque,
 * unguessable value nobody but this device ever holds. Sending the human-typed display name
 * straight through as that key (the old behavior here) broke that assumption: anyone who
 * could guess or read a player's display name could log in AS them and get a bearer session
 * over their wallet/progress. So this device mints and persists its own opaque key once,
 * separate from the cosmetic name the player types, and authenticates with the key — the
 * typed name is local display flavor only, never sent as the identity. */
function deviceKey(){
  var STORAGE_KEY = "onestone-device-key";
  function randomKey(){
    if(window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    if(window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for(var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(bytes, function(b){ return b.toString(16).padStart(2, "0"); }).join("");
  }
  try {
    var k = localStorage.getItem(STORAGE_KEY);
    if(!k){ k = randomKey(); localStorage.setItem(STORAGE_KEY, k); }
    return k;
  } catch(err) {
    // Storage unavailable (private mode, disabled) — still never fall back to the human-typed
    // name, which is exactly the guessable identity this key exists to avoid.
    return randomKey();
  }
}
function login(displayName){
  return apiPost("/session", {name: deviceKey()}).then(function(j){
    if(j.error || !j.token){ return Promise.reject(j.error || "login failed"); }
    state.token = j.token;
    state.account = displayName || j.account || "";
    try { localStorage.setItem("onestone-display-name", displayName || ""); } catch(err) { /* ignore */ }
    openStream();
    return j;
  });
}

/* ===================== frame handling ===================== */
function handleFrame(frame){
  state.meta = frame.meta;
  renderHudChips();
  if(state.screen === "map") renderMap();

  var mine = state.screen === "board" || frame.levelId === state.pendingLevel;
  if(!mine) return;

  show("board-loading", false);
  state.pendingLevel = null;
  if(state.screen !== "board") showScreen("board");

  if(state.curLevelId !== frame.levelId){
    state.curLevelId = frame.levelId;
    state.curGeom = frame.geometry;
    buildBoardShell(frame.geometry);
    renderTilesInstant(frame.geometry, frame.tiles);
    finishFrame(frame);
    return;
  }
  if(state.animating){
    // A prior cascade's animation is still playing when this same-level frame arrived. The
    // input paths guard against sending a second input mid-animation, but this can still
    // happen (e.g. an SSE push racing an in-flight response) — queue the latest frame instead
    // of dropping it: silently discarding it here used to leave the board/HUD showing stale,
    // already-superseded data and could swallow a win/loss result outright.
    state.pendingFrame = frame;
    return;
  }
  if(frame.lastSteps && frame.lastSteps.length){
    animateCascade(frame.geometry, frame.lastSteps, frame.tiles).then(function(){
      finishFrame(frame);
      drainPendingFrame();
    });
  } else {
    renderTilesInstant(frame.geometry, frame.tiles);
    finishFrame(frame);
  }
}
function drainPendingFrame(){
  var next = state.pendingFrame;
  if(!next) return;
  state.pendingFrame = null;
  handleFrame(next);
}

function finishFrame(frame){
  state.curTiles = frame.tiles;
  renderGoals(frame.goals);
  setText("hud-moves", String(frame.movesLeft));
  setText("hud-score", fmt(frame.score));
  setText("hud-shards-b", fmt(frame.meta.wallet.shards));
  renderBoosterBar(frame.meta.boosters);
  var moveEl = el("hud-moves").closest(".hud-chip");
  if(moveEl) moveEl.style.color = frame.movesLeft <= 3 ? "var(--bad)" : "";

  if(frame.chaosSix){
    var sig = frame.levelId + "|" + frame.score;
    if(state.lastChaosSig !== sig){ state.lastChaosSig = sig; flourishChaos(); }
  }
  if(frame.finished){
    showResultSheet(frame.finished, frame.meta);
  }
}

/* ===================== HUD ===================== */
function renderHudChips(){
  var m = state.meta; if(!m) return;
  var cap = m.passUntil && m.passUntil > Date.now() ? LIFE_CAP_PASS : LIFE_CAP;
  setText("hud-lives", m.lives + "/" + cap);
  setText("hud-shards", fmt(m.wallet.shards));
  setText("hud-prisms", fmt(m.wallet.prisms));
  setText("hud-name", state.account || "");
  show("hud-streak-chip", m.streak > 0);
  setText("hud-streak", String(m.streak));
}

/* ===================== map screen ===================== */
function chapterLevelIds(chapterId){
  var start = chapterId * LEVELS_PER_CHAPTER + 1, ids = [];
  for(var i = 0; i < LEVELS_PER_CHAPTER; i++) ids.push(start + i);
  return ids;
}

function renderChapterTabs(){
  var box = el("chapter-tabs");
  box.innerHTML = CHAPTERS.map(function(c){
    return '<button class="chapter-tab ' + (c.id === state.chapterTab ? "on" : "") + '" data-chapter="' + c.id + '">' +
      '<svg><use href="#' + c.sym + '"/></svg>' +
      '<span><span class="ct-name">' + esc(c.name) + '</span><br><span class="ct-sub">' + esc(c.sub) + '</span></span>' +
      "</button>";
  }).join("");
}

function renderMap(){
  var m = state.meta; if(!m) return;
  renderChapterTabs();
  var ids = chapterLevelIds(state.chapterTab);
  var nextId = clamp(m.unlocked, 1, 60);
  el("level-trail").innerHTML = ids.map(function(id){
    var locked = id > m.unlocked;
    var stars = (m.stars && m.stars[id]) || 0;
    var cls = "lvl-node" + (locked ? " locked" : "") + (id === nextId ? " next" : "") + (stars > 0 ? " done" : "");
    var starRow = [0,1,2].map(function(i){ return '<svg class="' + (i < stars ? "on" : "") + '"><use href="#glyph-star"/></svg>'; }).join("");
    return '<div class="' + cls + '" data-level="' + id + '">' +
      (locked ? '<div class="lvl-lock"><svg><use href="#glyph-lock"/></svg></div>' :
        '<div class="lvl-num">' + id + '</div><div class="lvl-stars">' + starRow + "</div>") +
      "</div>";
  }).join("");
}

function startLevel(id){
  var m = state.meta;
  if(m && id > m.unlocked){ toast("Locked — clear the level before it first."); return; }
  if(m && m.lives <= 0){ toast("No lives left. Wait for one to regenerate, or visit the shop."); return; }
  state.pendingLevel = id;
  state.curLevelId = null;
  showScreen("board");
  show("board-loading", true);
  sendInput({kind:"start", levelId: id});
}

/* ===================== board geometry / rendering ===================== */
function cellById(geom, id){ return geom.cells[id]; }
function polyPoints(poly){
  var pts = [];
  for(var i = 0; i + 1 < poly.length; i += 2) pts.push(poly[i] + "," + poly[i + 1]);
  return pts.join(" ");
}

function hexToRgb(hex){
  var n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b){
  function h(v){ v = clamp(Math.round(v), 0, 255); var s = v.toString(16); return s.length < 2 ? "0" + s : s; }
  return "#" + h(r) + h(g) + h(b);
}
function shadeHex(hex, deltaPct){
  var rgb = hexToRgb(hex);
  var f = deltaPct >= 0 ? function(v){ return v + (255 - v) * deltaPct; } : function(v){ return v * (1 + deltaPct); };
  return rgbToHex(f(rgb[0]), f(rgb[1]), f(rgb[2]));
}
function colorForCell(colorId, shade){
  var base = PALETTE[colorId % PALETTE.length];
  if(shade === 1) return shadeHex(base, 0.16);
  if(shade === 2) return shadeHex(base, -0.16);
  return base;
}

function railAngleForCell(geom, cellId){
  // Derive the glyph rotation from the rail's own cell centers rather than a hardcoded table
  // keyed by family. family is just the sorted index of a tiling's direction buckets
  // (tiling-core.mts), which is build-order/tiling-dependent — it does not correspond to any
  // fixed angle, so a fixed lookup table (e.g. treating family 1 as "60 degrees") mis-renders
  // whichever family doesn't happen to land on the table's guess (square's vertical family,
  // in particular, rendered striped tiles rotated to 60 degrees instead of the real 90).
  // Reading two of the rail's actual cell centers is correct for every tiling by construction.
  var rs = geom.railsAt && geom.railsAt[cellId];
  if(!rs || !rs.length) return 0;
  var rail = geom.rails[rs[0]];
  var cells = rail && rail.cells;
  if(!cells || cells.length < 2) return 0;
  var a = geom.cells[cells[0]], b = geom.cells[cells[cells.length - 1]];
  if(!a || !b) return 0;
  return Math.atan2(b.cy - a.cy, b.cx - a.cx) * 180 / Math.PI;
}

function buildBoardShell(geom){
  var svg = el("board-svg");
  svg.setAttribute("viewBox", "0 0 " + geom.width + " " + geom.height);
  var bg = el("cells-bg");
  bg.innerHTML = geom.cells.map(function(c){
    return '<polygon class="cellbg" data-cell="' + c.id + '" points="' + polyPoints(c.poly) + '"/>';
  }).join("");
  el("tiles-layer").innerHTML = "";
  state.tileEls = new Map();
  state.selected = null;
}

function tileMarkup(cell, tile){
  var out = "";
  if(tile.geode > 0){
    out += '<polygon class="face" points="' + polyPoints(cell.poly) + '" fill="#5b6070"/>';
    var pipR = cellSpan(cell) * 0.06;
    for(var p = 0; p < 3; p++){
      out += '<circle cx="' + (cell.cx - cellSpan(cell) * 0.18 + p * cellSpan(cell) * 0.18) + '" cy="' + cell.cy + '" r="' + pipR + '" fill="' + (p < tile.geode ? "#e8e2ff" : "rgba(255,255,255,.18)") + '"/>';
    }
    return out;
  }
  var fill = colorForCell(tile.color, cell.shade);
  out += '<polygon class="face" points="' + polyPoints(cell.poly) + '" fill="' + fill + '"/>';
  var sh = cellSpan(cell) * 0.16, cx = cell.cx, cy = cell.cy;
  out += '<use class="shape-mark" href="#glyph-shape-' + (tile.color % 5) + '" x="' + (cx - sh / 2) + '" y="' + (cy - sh / 2) + '" width="' + sh + '" height="' + sh + '" color="#000"/>';
  if(tile.special !== "none"){
    var sz = cellSpan(cell) * 0.5;
    var rot = tile.special === "striped" ? railAngleForCell(state.curGeom, cell.id) : 0;
    var tf = rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : "";
    out += '<use class="special-mark glyph-' + tile.special + '" href="#glyph-' + tile.special + '" x="' + (cx - sz / 2) + '" y="' + (cy - sz / 2) + '" width="' + sz + '" height="' + sz + '" color="#fff"' + tf + "/>";
  }
  if(tile.moss) out += '<circle class="blocker" cx="' + cx + '" cy="' + (cy + cellSpan(cell) * 0.3) + '" r="' + (cellSpan(cell) * 0.08) + '" fill="#3ddc97" opacity=".75"/>';
  if(tile.frost) out += '<polygon class="blocker" points="' + polyPoints(cell.poly) + '" fill="rgba(160,220,255,.28)" stroke="#bfe8ff" stroke-width=".02"/>';
  if(tile.cage) out += '<polygon class="blocker" points="' + polyPoints(cell.poly) + '" fill="none" stroke="#c9b48a" stroke-width=".05" stroke-dasharray=".12,.08"/>';
  return out;
}
function cellSpan(cell){
  var xs = [], ys = [];
  for(var i = 0; i + 1 < cell.poly.length; i += 2){ xs.push(cell.poly[i]); ys.push(cell.poly[i + 1]); }
  return Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
}

function makeTileEl(cell, tile){
  var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "tile");
  g.setAttribute("data-cell", String(cell.id));
  g.innerHTML = tileMarkup(cell, tile);
  return g;
}

function renderTilesInstant(geom, tiles){
  var layer = el("tiles-layer");
  geom.cells.forEach(function(cell){
    var tile = tiles[cell.id];
    if(!tile) return;
    var existing = state.tileEls.get(cell.id);
    if(existing) layer.removeChild(existing);
    var g = makeTileEl(cell, tile);
    layer.appendChild(g);
    state.tileEls.set(cell.id, g);
  });
}

/* ===================== cascade animation ===================== */
function flashClear(cellId){
  var g = state.tileEls.get(cellId);
  if(g) g.classList.add("flash-clear");
}
function flashFire(cellId){
  var g = state.tileEls.get(cellId);
  if(g) g.classList.add("flash-fire");
}
function removeTileEl(cellId){
  var g = state.tileEls.get(cellId);
  if(!g) return;
  state.tileEls.delete(cellId);
  g.classList.add("clearing-out");
  setTimeout(function(){ if(g.parentNode) g.parentNode.removeChild(g); }, FLASH_MS + 40);
}
function moveTileEl(fromId, toId, geom){
  var g = state.tileEls.get(fromId);
  if(!g) return;
  state.tileEls.delete(fromId);
  var fromCell = cellById(geom, fromId), toCell = cellById(geom, toId);
  var dx = fromCell.cx - toCell.cx, dy = fromCell.cy - toCell.cy;
  g.style.transition = "none";
  g.style.transform = "translate(" + dx + "px," + dy + "px)";
  g.setAttribute("data-cell", String(toId));
  requestAnimationFrame(function(){
    g.style.transition = "transform " + STEP_MS + "ms var(--spring)";
    requestAnimationFrame(function(){ g.style.transform = "translate(0px,0px)"; });
  });
  state.tileEls.set(toId, g);
}
function spawnTileEl(cellId, tile, geom){
  var cell = cellById(geom, cellId);
  var g = makeTileEl(cell, tile);
  g.classList.add("spawn-in");
  el("tiles-layer").appendChild(g);
  var old = state.tileEls.get(cellId);
  if(old && old !== g && old.parentNode) old.parentNode.removeChild(old);
  state.tileEls.set(cellId, g);
}

function runStep(geom, step){
  return new Promise(function(resolve){
    step.cleared.forEach(flashClear);
    step.fired.forEach(function(f){ flashFire(f.cell); });
    setTimeout(function(){
      step.cleared.forEach(removeTileEl);
      step.falls.forEach(function(f){ moveTileEl(f.from, f.to, geom); });
      step.spawned.forEach(function(s){ spawnTileEl(s.cell, s.tile, geom); });
      setTimeout(resolve, STEP_MS);
    }, FLASH_MS);
  });
}
function animateCascade(geom, steps, finalTiles){
  state.animating = true;
  var i = 0;
  return new Promise(function(resolve){
    function next(){
      if(i >= steps.length){
        renderTilesInstant(geom, finalTiles);
        state.animating = false;
        resolve();
        return;
      }
      var step = steps[i]; i++;
      runStep(geom, step).then(next);
    }
    next();
  });
}

/* ===================== goals / boosters ===================== */
function renderGoals(goals){
  el("goal-list").innerHTML = (goals || []).map(function(g){
    var icon = GOAL_ICON[g.kind];
    var met = g.progress >= g.target;
    // A collectColor goal names its target color the same way every tile on the board does —
    // with the same glyph-shape-N overlay (client.mts's own color-blind affordance) alongside
    // the swatch, not the swatch alone. A hue swatch by itself is exactly the one thing a
    // color-blind player can't reliably read, on the one HUD element whose entire job is to
    // name a color.
    var swatch = g.kind === "collectColor" ?
      '<span class="g-swatch" style="background:' + PALETTE[g.color % PALETTE.length] + '">' +
        '<svg class="g-swatch-shape" viewBox="0 0 24 24"><use href="#glyph-shape-' + (g.color % 5) + '"/></svg>' +
      '</span>' :
      '<svg><use href="#' + icon + '"/></svg>';
    return '<span class="goal-chip' + (met ? " met" : "") + '">' + swatch + esc(GOAL_LABEL[g.kind]) + " " + g.progress + "/" + g.target + "</span>";
  }).join("");
}

function renderBoosterBar(boosters){
  var kinds = ["hammer","shuffle","extraMoves","prismStart"];
  var shards = state.meta ? state.meta.wallet.shards : 0;
  el("booster-bar").innerHTML = kinds.map(function(k){
    var n = (boosters && boosters[k]) || 0;
    if(n > 0){
      return '<button class="btn booster-btn' + (state.armedBooster === k ? " armed" : "") + '" data-booster="' + k + '">' +
        '<svg><use href="#' + BOOSTER_ICON[k] + '"/></svg><span class="bb-count">' + n + "</span></button>";
    }
    // Owned zero: the button becomes a shard purchase (data-buy) instead of a use — the only
    // reachable spend path for the shard economy (winReward earns shards; buyBooster/BUY was
    // otherwise wired end-to-end but never surfaced anywhere a player could reach it).
    // Disabled below the price purely as a UX hint; the server is still the actual gate.
    var affordable = shards >= (BOOSTER_PRICES[k] || 0);
    return '<button class="btn booster-btn buyable" data-buy="' + k + '" title="Buy for ' + BOOSTER_PRICES[k] + ' shards"' + (affordable ? "" : " disabled") + '>' +
      '<svg><use href="#' + BOOSTER_ICON[k] + '"/></svg><span class="bb-price">' + BOOSTER_PRICES[k] + "</span></button>";
  }).join("");
}

/* ===================== interaction ===================== */
function cellsAdjacent(a, b){
  var c = state.curGeom && cellById(state.curGeom, a);
  return !!(c && c.neighbors.indexOf(b) >= 0);
}
function setSelected(cellId){
  if(state.selected != null){
    var prev = state.tileEls.get(state.selected);
    if(prev) prev.classList.remove("selected");
  }
  state.selected = cellId;
  if(cellId != null){
    var g = state.tileEls.get(cellId);
    if(g) g.classList.add("selected");
  }
}
function trySwap(a, b){ sendInput({kind:"swap", a: a, b: b}); }
function tapSelect(cellId){
  if(state.animating) return;
  if(state.armedBooster === "hammer"){
    sendInput({kind:"booster", booster:"hammer", cell: cellId});
    state.armedBooster = null;
    renderBoosterBar(state.meta ? state.meta.boosters : {});
    return;
  }
  if(state.selected == null){ setSelected(cellId); return; }
  if(state.selected === cellId){ setSelected(null); return; }
  if(cellsAdjacent(state.selected, cellId)){
    trySwap(state.selected, cellId);
    setSelected(null);
    return;
  }
  setSelected(cellId);
}

document.addEventListener("pointerdown", function(e){
  var t = e.target.closest("[data-cell]");
  if(!t || !state.curGeom) return;
  state.dragCell = Number(t.getAttribute("data-cell"));
});
document.addEventListener("pointerup", function(e){
  if(state.dragCell == null) return;
  var startCell = state.dragCell;
  state.dragCell = null;
  if(state.animating) return; // a cascade is still animating — the same guard tapSelect applies
  var t = e.target.closest("[data-cell]");
  var endCell = t ? Number(t.getAttribute("data-cell")) : null;
  if(endCell != null && endCell !== startCell && cellsAdjacent(startCell, endCell)){
    if(state.armedBooster === "hammer") return;
    trySwap(startCell, endCell);
    setSelected(null);
  } else {
    tapSelect(startCell);
  }
});

document.addEventListener("click", function(e){
  var chap = e.target.closest("[data-chapter]");
  if(chap){ state.chapterTab = Number(chap.getAttribute("data-chapter")); renderMap(); return; }
  var lvl = e.target.closest("[data-level]");
  if(lvl){ startLevel(Number(lvl.getAttribute("data-level"))); return; }
  var b = e.target.closest("[data-booster]");
  if(b){
    var kind = b.getAttribute("data-booster");
    if(kind === "hammer"){
      state.armedBooster = state.armedBooster === "hammer" ? null : "hammer";
      renderBoosterBar(state.meta ? state.meta.boosters : {});
    } else if(!state.animating){
      sendInput({kind:"booster", booster: kind});
    }
    return;
  }
  var buy = e.target.closest("[data-buy]");
  if(buy){
    sendInput({kind:"buy", booster: buy.getAttribute("data-buy")});
    return;
  }
});

/* ===================== chaos flourish ===================== */
function flourishChaos(){
  var f = el("chaos-flourish");
  f.classList.remove("hidden");
  f.classList.remove("burst");
  void f.offsetWidth;
  f.classList.add("burst");
  setTimeout(function(){ f.classList.add("hidden"); f.classList.remove("burst"); }, 950);
}

/* ===================== result sheet ===================== */
function showResultSheet(result, meta){
  var sig = result.levelId + "|" + result.score + "|" + result.won;
  el("sheet-result").classList.remove("hidden");
  state.lastFinishedLevelId = result.levelId;
  if(state.shownResultSig === sig) return;
  state.shownResultSig = sig;

  setText("result-title", result.won ? "Level clear" : "Out of moves");
  setText("result-sub", result.won ? "The lattice holds." : "The board did not settle in time.");
  setText("result-score", fmt(result.score));
  setText("result-moves", String(result.movesLeft));
  var stars = el("result-stars").querySelectorAll("svg");
  stars.forEach(function(s, i){ s.classList.toggle("on", i < result.stars); s.style.animation = "none"; void s.offsetWidth; s.style.animation = ""; });
  show("result-reward-row", result.won);
}
function closeResult(){ el("sheet-result").classList.add("hidden"); }

el("result-continue").addEventListener("click", function(){
  closeResult();
  showScreen("map");
  renderMap();
});
el("result-retry").addEventListener("click", function(){
  closeResult();
  if(state.lastFinishedLevelId) startLevel(state.lastFinishedLevelId);
});
el("board-back").addEventListener("click", function(){
  sendInput({kind:"abandon"});
  showScreen("map");
  renderMap();
});

/* ===================== shop ===================== */
function loadShop(){
  apiGet("/skus").then(function(skus){
    var list = Array.isArray(skus) ? skus : (skus.skus || []);
    el("sku-list").innerHTML = list.map(function(sku){
      return '<div class="sku-row"><div><div class="sku-title">' + esc(sku.title) + '</div>' +
        '<div class="sku-desc">' + skuBlurb(sku) + '</div></div>' +
        '<button class="btn btn-gold sku-buy" data-sku="' + esc(sku.id) + '">$' + (sku.cents / 100).toFixed(2) + "</button></div>";
    }).join("");
  });
}
function skuBlurb(sku){
  var g = sku.grant;
  if(!g) return "";
  if(g.kind === "prisms") return g.amount + " prisms";
  if(g.kind === "booster") return g.amount + " " + esc(g.booster);
  if(g.kind === "lives") return "full life refill";
  if(g.kind === "pass") return g.days + "-day pass";
  return "";
}
function renderPrismRedeem(){
  var kinds = ["hammer","shuffle","extraMoves","prismStart"];
  var prisms = state.meta ? state.meta.wallet.prisms : 0;
  el("prism-redeem").innerHTML = kinds.map(function(k){
    var price = PRISM_BOOSTER_PRICES[k];
    var affordable = prisms >= price;
    return '<div class="sku-row"><div><div class="sku-title">' + esc(k) + " booster</div>" +
      '<div class="sku-desc">+1 ' + esc(k) + "</div></div>" +
      '<button class="btn btn-gold" data-redeem-prism="' + k + '"' + (affordable ? "" : " disabled") + '>' + price + " prisms</button></div>";
  }).join("");
}
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-sku]");
  if(b){
    var skuId = b.getAttribute("data-sku");
    b.disabled = true;
    apiPost("/pay", {token: state.token, skuId: skuId, provider: "mock"}).then(function(r){
      b.disabled = false;
      setText("shop-msg", r.error ? r.error : "Purchase complete — check your wallet.");
      if(!r.error) toast("Purchase complete.");
    });
    return;
  }
  var redeem = e.target.closest("[data-redeem-prism]");
  if(redeem){
    var kind = redeem.getAttribute("data-redeem-prism");
    redeem.disabled = true;
    sendInput({kind:"buy", booster: kind, currency: "prisms"}).then(function(){
      setText("shop-msg", "Redeemed — check your wallet.");
      renderPrismRedeem();
    });
    return;
  }
});
el("open-shop").addEventListener("click", function(){ loadShop(); renderPrismRedeem(); el("sheet-shop").classList.remove("hidden"); });
el("shop-close").addEventListener("click", function(){ el("sheet-shop").classList.add("hidden"); });

/* ===================== Lattice Garden ===================== */
function miniTilingSvg(kind){
  if(kind === "square"){
    return '<svg viewBox="0 0 60 60"><g fill="none" stroke="#c9a8ff" stroke-width="1.4">' +
      '<rect x="6" y="6" width="20" height="20" fill="rgba(139,107,242,.35)"/>' +
      '<rect x="28" y="6" width="20" height="20" fill="rgba(63,208,224,.3)"/>' +
      '<rect x="6" y="28" width="20" height="20" fill="rgba(63,208,224,.3)"/>' +
      '<rect x="28" y="28" width="20" height="20" fill="rgba(139,107,242,.35)"/>' +
      "</g></svg>";
  }
  if(kind === "hex"){
    return '<svg viewBox="0 0 60 60"><g fill="rgba(139,107,242,.35)" stroke="#c9a8ff" stroke-width="1.2">' +
      '<polygon points="30,4 47,14 47,34 30,44 13,34 13,14"/>' +
      '<polygon points="30,20 47,30 47,50 30,60 13,50 13,30" fill="rgba(63,208,224,.28)"/>' +
      "</g></svg>";
  }
  return '<svg viewBox="0 0 60 60"><g stroke="#c9a8ff" stroke-width="1.2">' +
    '<polygon points="30,4 50,20 30,36 10,20" fill="rgba(139,107,242,.4)"/>' +
    '<polygon points="30,36 50,20 50,44 30,60" fill="rgba(63,208,224,.32)"/>' +
    '<polygon points="10,20 30,36 30,60 10,44" fill="rgba(255,204,102,.28)"/>' +
    "</g></svg>";
}
function renderGarden(){
  var earned = (state.meta && state.meta.garden) || [];
  el("garden-grid").innerHTML = CHAPTERS.map(function(c){
    var got = earned.indexOf(c.tiling) >= 0;
    return '<div class="trophy-card"><div class="trophy-mini' + (got ? " earned" : "") + '">' + miniTilingSvg(c.tiling) + "</div>" +
      '<div><div class="trophy-name">' + esc(c.name) + '</div><div class="trophy-state">' + (got ? "Trophy earned" : "Clear the chapter to earn it") + "</div></div></div>";
  }).join("");
}
el("open-garden").addEventListener("click", function(){ renderGarden(); el("sheet-garden").classList.remove("hidden"); });
el("garden-close").addEventListener("click", function(){ el("sheet-garden").classList.add("hidden"); });

/* ===================== login ===================== */
try {
  var savedName = localStorage.getItem("onestone-display-name");
  if(savedName) el("login-name").value = savedName;
} catch(err) { /* storage unavailable — nothing to prefill */ }
el("login-form").addEventListener("submit", function(e){
  e.preventDefault();
  var name = el("login-name").value.trim();
  if(!name){ setText("login-msg", "Pick a name first."); return; }
  el("login-btn").disabled = true;
  login(name).then(function(){
    showScreen("map");
    renderMap();
  }).catch(function(err){
    setText("login-msg", String(err));
  }).finally(function(){
    el("login-btn").disabled = false;
  });
});

</script>
</body>
</html>`;
