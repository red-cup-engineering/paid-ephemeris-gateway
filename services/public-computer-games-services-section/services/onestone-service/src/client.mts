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
 *
 * The 561 shelf chrome (mark + footer line) is vendored from `./chrome.mts` and spliced in at
 * three points via the one deliberate `${...}` interpolation each: the shared CSS before
 * `</style>`, the mark next to the persistent map-HUD wordmark, and the "part of the 561
 * shelf" line on the login screen — see chrome.mts's own header for the provenance note and
 * why gameplay-screen HUDs are left untouched.
 */
import { SHELF_CHROME_CSS, SHELF_MARK_SVG, SHELF_FOOTER_LINE } from "./chrome.mts";

export const CLIENT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>TileSlots</title>
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
  .login-title{font-size:1.5rem;margin-bottom:.2rem}
  /* ---------- TileSlots wordmark (display-name-only rebrand, TILESLOTS-DESIGN.md §5) ----------
     A font-weight/letter-spacing/gradient-text treatment reusing the existing --gold token and
     glass-panel language — no new color system, no new visual language, purely CSS. Applied to
     the login header (.login-title.wordmark) and the small persistent map-HUD mark
     (.hud-wordmark.wordmark); both read the same DISPLAY_NAME constant from the script below. */
  .wordmark{font-weight:800;letter-spacing:.03em;
    background:linear-gradient(135deg,var(--gold),var(--violet-2) 55%,var(--cyan));
    -webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 2px 10px rgba(255,204,102,.25))}
  .hud-wordmark{font-size:.92rem;padding:.2rem .1rem}
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
  .chapter-tab.locked{opacity:.4;filter:grayscale(.7);cursor:not-allowed}
  .chapter-tab.locked .ct-lock-icon{color:var(--ink-faint)}

  /* Saga map trail (TILESLOTS-DESIGN.md §4.1): one <svg> per chapter, a <path> stroked through
     every level node's center plus one <g data-level> per node — real SVG geometry, not a CSS
     zigzag of stacked divs, so the "path" is an actual drawn line players can trace. */
  #level-trail{max-width:380px;margin:0 auto;padding:.6rem 0 2.2rem;display:flex;justify-content:center}
  #trail-svg{width:100%;height:auto;overflow:visible}
  .trail-path{fill:none;stroke:var(--glass-brd);stroke-width:5;stroke-linecap:round;stroke-dasharray:1 13}
  .trail-node{cursor:pointer}
  .trail-node-bg{fill:#201c3a;stroke:var(--glass-brd);stroke-width:2}
  .trail-node.done .trail-node-bg{stroke:var(--good)}
  .trail-node.next .trail-node-bg{stroke:var(--gold);stroke-width:3;animation:trail-pulse 2.2s ease-in-out infinite}
  .trail-node.locked{cursor:not-allowed}
  .trail-node.locked .trail-node-bg{opacity:.4}
  .trail-node.locked .trail-lock{color:var(--ink-faint)}
  .trail-num{font:800 1rem/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;fill:var(--ink)}
  .trail-star{color:var(--ink-faint)}
  .trail-star.on{color:var(--gold)}
  .trail-node:active:not(.locked) .trail-node-bg{transform-origin:center;transform:scale(.93)}
  @keyframes trail-pulse{0%,100%{filter:drop-shadow(0 0 4px rgba(255,204,102,.5))}
    50%{filter:drop-shadow(0 0 13px rgba(255,204,102,.9))}}

  /* ---------- chapter reveal (a new tiling, shown once per chapter — §4.1's "reveal") ---------- */
  #chapter-reveal{position:fixed;inset:0;pointer-events:none;z-index:45;display:flex;
    flex-direction:column;align-items:center;justify-content:center;gap:.6rem;
    background:radial-gradient(600px 400px at 50% 45%,rgba(139,107,242,.28),transparent 70%)}
  #chapter-reveal.burst{animation:reveal-burst 2.1s var(--ease) forwards}
  .reveal-sym{width:88px;height:88px;color:var(--violet-2);filter:drop-shadow(0 0 24px rgba(201,168,255,.55))}
  .reveal-text{text-align:center}
  .reveal-kicker{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-dim)}
  .reveal-name{font-size:1.6rem;font-weight:800}
  .reveal-sub{font-size:.88rem;color:var(--ink-dim)}
  @keyframes reveal-burst{0%{opacity:0;transform:scale(.85)}14%{opacity:1;transform:scale(1)}
    82%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}

  /* ---------- map booster inventory (design §4.4: earnable, no payment changes) ---------- */
  #map-boosters{max-width:380px;margin:.2rem auto 0;padding:0 1rem}
  #map-boosters .mb-label{font-size:.74rem;color:var(--ink-dim);margin-bottom:.4rem;text-align:center}
  #map-boosters .mb-row{display:flex;gap:.55rem;justify-content:center;flex-wrap:wrap}
  .mb-chip{display:flex;align-items:center;gap:.32rem;padding:.32rem .6rem;border-radius:12px;
    background:var(--glass);border:1px solid var(--glass-brd);font-size:.8rem;font-weight:700}
  .mb-chip svg{width:16px;height:16px;color:var(--ink-dim)}
  .mb-chip.mb-empty{opacity:.45}

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
  /* Two-layer canvas board (replaces the old SVG/DOM tile tree — see the PURE RENDER CORE /
     paintFrame split in the inline script). --board-ar is set from JS per level's geometry
     (geom.width/geom.height) so the wrap sizes itself without ever exceeding 94vw/560px/62vh,
     the same effective bound the old <svg viewBox> got for free from the browser. */
  #board-canvas-wrap{position:relative;margin:0 auto;aspect-ratio:var(--board-ar,1);
    width:min(94vw,560px,calc(62vh * var(--board-ar,1)));
    filter:drop-shadow(0 24px 40px rgba(0,0,0,.5))}
  #lattice-canvas,#tile-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  #lattice-canvas{pointer-events:none}
  #tile-canvas{touch-action:none;cursor:pointer}
  #board-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;border-radius:10px;transition:opacity .12s ease-out}
  #board-flash.on{opacity:.55;transition:opacity 0s}
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
${SHELF_CHROME_CSS}
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
  <symbol id="glyph-mute" viewBox="0 0 24 24"><path d="M4,9 H8 L14,4 V20 L8,15 H4 Z" fill="currentColor"/><path d="M17,9 L21,15 M21,9 L17,15" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></symbol>
  <symbol id="glyph-unmute" viewBox="0 0 24 24"><path d="M4,9 H8 L14,4 V20 L8,15 H4 Z" fill="currentColor"/><path d="M17,8 C19,10 19,14 17,16 M19,5 C23,9 23,15 19,19" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></symbol>

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
      <h1 class="login-title wordmark" id="brand-title"></h1>
      <p class="login-sub">every tile is a proof. every board, a different tiling.</p>
      <form id="login-form">
        <input type="text" id="login-name" placeholder="choose a name" autocomplete="username" maxlength="24">
        <button type="submit" class="btn btn-primary" id="login-btn">Enter the lattice</button>
      </form>
      <div id="login-msg"></div>
      ${SHELF_FOOTER_LINE}
    </div>
  </section>

  <section id="screen-map" class="screen">
    <div class="hud">
      <span class="wordmark hud-wordmark" id="map-wordmark"></span>
      ${SHELF_MARK_SVG}
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
    <div id="map-boosters"></div>
  </section>

  <section id="screen-board" class="screen">
    <div class="hud" id="board-hud">
      <button class="btn btn-ghost" id="board-back" title="Back to map"><svg><use href="#glyph-back"/></svg></button>
      <span class="hud-chip"><svg><use href="#glyph-hourglass"/></svg><span id="hud-moves">0</span></span>
      <span class="hud-chip"><svg><use href="#glyph-star"/></svg><span id="hud-score">0</span></span>
      <span class="hud-spacer"></span>
      <span class="hud-chip shards"><svg><use href="#glyph-shard"/></svg><span id="hud-shards-b">0</span></span>
      <button class="btn btn-ghost" id="audio-mute" title="Mute sound"><svg><use href="#glyph-unmute"/></svg></button>
    </div>
    <div id="goal-list"></div>
    <div id="board-wrap">
      <div id="board-canvas-wrap">
        <canvas id="lattice-canvas"></canvas>
        <canvas id="tile-canvas"></canvas>
        <div id="board-flash"></div>
      </div>
      <div id="board-loading" class="hidden"><span class="spin"></span><span>opening the board…</span></div>
    </div>
    <div id="booster-bar"></div>
  </section>

  <div id="chaos-flourish" class="hidden"><span class="cf-word">CHAOS SIX</span></div>

  <div id="chapter-reveal" class="hidden">
    <svg class="reveal-sym" id="reveal-sym" viewBox="0 0 24 24"></svg>
    <div class="reveal-text">
      <div class="reveal-kicker">New tiling</div>
      <div class="reveal-name" id="reveal-name"></div>
      <div class="reveal-sub" id="reveal-sub"></div>
    </div>
  </div>

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
// TILESLOTS-DESIGN.md §5: display-only rebrand. "onestone" stays the engineering identity
// (package name, directory, route paths, env vars, save/ledger/SKU shapes — all untouched);
// DISPLAY_NAME is the one storefront/marketing string every player-facing surface reads from,
// so a future name change is a one-line edit here, not a text search through this file.
var DISPLAY_NAME = "TileSlots";
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

/* ===================== PURE RENDER CORE (tested directly, no DOM/canvas) =====================
 * Everything from here to the matching END marker is a plain function of its arguments — no
 * document, no CanvasRenderingContext2D, no Math.random(), no Date.now()/performance.now()
 * called internally (time is always taken as a parameter). That is deliberate: this is the
 * "pure projection function" the design doc (TILESLOTS-DESIGN.md §2.3) calls the renderer's
 * testable seam, and render-projection.test.mts extracts exactly this block's source text
 * (between the two marker comments) and evaluates it standalone to unit-test projectFrame and
 * its helpers without a browser — the same trick client.test.mts already uses (new Function on
 * the whole script) taken one step further: eval only the DOM-free prefix, then call into it.
 */
var BASE_FALL_MS = 220, MIN_FALL_MS = 120, MAX_FALL_MS = 340;
var FLASH_MS = 90, CLEAR_MS = 140, SPAWN_MS = 260, POPUP_MS = 520, PARTICLE_MS = 340;
var STAGGER_MS = 12, STAGGER_CAP = 96;
var SHAKE_MAX = 0.18;

function clamp01(x){ return x < 0 ? 0 : (x > 1 ? 1 : x); }
function easeOutCubic(t){ var u = 1 - t; return 1 - u * u * u; }
function easeInCubic(t){ return t * t * t; }
// Ease-out to "over" (a fraction >1) by "turnFrac" of the duration, then ease back to 1 over
// the remainder — the "overshoot-settle" the design doc's §1.4 timing table specifies for
// falls (over=1.06 at turnFrac=.92) and spawns (over=1.15 at turnFrac=.85, tuned so the scale
// curve below peaks at the documented 1.12).
function overshootCurve(t, over, turnFrac){
  t = clamp01(t);
  if(t <= turnFrac){
    var u = turnFrac > 0 ? t / turnFrac : 1;
    return easeOutCubic(u) * over;
  }
  var v = (1 - turnFrac) > 0 ? (t - turnFrac) / (1 - turnFrac) : 1;
  return over + (1 - over) * easeOutCubic(v);
}
function fallProgress(t){ return overshootCurve(t, 1.06, 0.92); }
function spawnScaleProgress(t){ return overshootCurve(t, 1.15, 0.85); }
// dur scales with the fall's actual geometric distance (design §1.3) — a no-op today since
// square/hex/rhombille all ship unit-length fallTo edges, but load-bearing the moment a
// non-uniform aperiodic prototile (Cairo/Penrose/hat) lands, per that section's own note.
function fallDuration(dist, unitSpan){
  var span = unitSpan > 0 ? unitSpan : 1;
  var ms = BASE_FALL_MS * (dist / span);
  return clamp(ms, MIN_FALL_MS, MAX_FALL_MS);
}
// Deterministic pseudo-random +-6deg shatter jitter, keyed off the cell id — NOT Math.random():
// projectFrame must stay a pure function of (geom,tiles,tweens,now) so it can be unit-tested by
// asserting on a fixed output, not just "it doesn't throw."
function jitterForCell(cellId){
  var h = ((cellId * 2654435761) >>> 0) % 1000;
  return (h / 1000) * 12 - 6;
}
// Depth of a fall within its own chain this settling step: 0 = nearest the spawn mouth (moves
// first), +1 for every fall whose destination cell is this fall's own origin cell (i.e. another
// tile is following into the slot this one just vacated). Drives the per-tile stagger so a tall
// single-column drain reads as a cascade, not a jump-cut (design §1.4).
function fallDepths(falls){
  var byFrom = {};
  falls.forEach(function(f){ byFrom[f.to] = f; });
  var memo = {};
  function depthOf(f, guard){
    var key = f.from + '>' + f.to;
    if(memo[key] !== undefined) return memo[key];
    if(guard > falls.length) return 0; // fallTo is acyclic by construction; belt-and-braces only
    var pred = byFrom[f.from];
    var d = pred ? depthOf(pred, guard + 1) + 1 : 0;
    memo[key] = d;
    return d;
  }
  var out = {};
  falls.forEach(function(f){ out[f.to] = depthOf(f, 0); });
  return out;
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
function cellSpan(cell){
  var xs = [], ys = [];
  for(var i = 0; i + 1 < cell.poly.length; i += 2){ xs.push(cell.poly[i]); ys.push(cell.poly[i + 1]); }
  return Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
}
function railAngleForCell(geom, cellId){
  // Derive the glyph rotation from the rail's own cell centers rather than a hardcoded table
  // keyed by family — family is just a build-order index (tiling-core.mts), not a fixed angle.
  var rs = geom.railsAt && geom.railsAt[cellId];
  if(!rs || !rs.length) return 0;
  var rail = geom.rails[rs[0]];
  var cells = rail && rail.cells;
  if(!cells || cells.length < 2) return 0;
  var a = geom.cells[cells[0]], b = geom.cells[cells[cells.length - 1]];
  if(!a || !b) return 0;
  return Math.atan2(b.cy - a.cy, b.cx - a.cx) * 180 / Math.PI;
}
// Standard ray-casting point-in-polygon test, board-unit coordinates, used both by pointer hit
// testing (imperative shell) and exercised directly by tests below.
function pointInPolygon(x, y, poly){
  var inside = false;
  var n = poly.length / 2;
  for(var i = 0, j = n - 1; i < n; j = i++){
    var xi = poly[i * 2], yi = poly[i * 2 + 1];
    var xj = poly[j * 2], yj = poly[j * 2 + 1];
    var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if(intersect) inside = !inside;
  }
  return inside;
}
function hitTestCell(geom, x, y){
  for(var i = 0; i < geom.cells.length; i++){
    if(pointInPolygon(x, y, geom.cells[i].poly)) return geom.cells[i].id;
  }
  // Fallback for a point that lands exactly on a shared edge/vertex (ray-cast ties): nearest
  // centroid never leaves a dead zone between two adjacent cells.
  var best = null, bestD = Infinity;
  for(var j = 0; j < geom.cells.length; j++){
    var c = geom.cells[j], dx = c.cx - x, dy = c.cy - y, d = dx * dx + dy * dy;
    if(d < bestD){ bestD = d; best = c.id; }
  }
  return best;
}
// Pure tween-list transform (design section 1.2's activeTweens.filter(advance(dt)), reframed as
// filtering by absolute end-time against "now" rather than mutating per-frame state).
function pruneTweens(tweens, now){
  return tweens.filter(function(t){ return now - t.t0 < t.dur; });
}
function shakeOffsetAt(tween, now){
  var dt = now - tween.t0;
  var amp = tween.amp * Math.exp(-dt / 60);
  return { x: amp * Math.sin(dt * 0.09 + tween.seed), y: amp * Math.cos(dt * 0.13 + tween.seed) };
}
function particleAt(tween, now){
  var dt = now - tween.t0;
  var t = clamp01(dt / tween.dur);
  if(t >= 1) return null;
  var tsec = dt / 1000;
  var x = tween.x0 + tween.vx * tsec;
  var y = tween.y0 + tween.vy * tsec + 0.5 * tween.gravity * tsec * tsec;
  var fadeStart = tween.dur - 120;
  var alpha = dt <= fadeStart ? 1 : clamp01(1 - (dt - fadeStart) / 120);
  return { kind: 'particle', x: x, y: y, scale: 1, rotation: 0, alpha: alpha, color: tween.color, active: true };
}
function popupAt(tween, now){
  var dt = now - tween.t0;
  var t = clamp01(dt / tween.dur);
  if(t >= 1) return null;
  var rise = tween.rise * easeOutCubic(t);
  var alpha = 1;
  if(dt < 60) alpha = dt / 60;
  else if(dt > tween.dur - 150) alpha = clamp01((tween.dur - dt) / 150);
  return { kind: 'popup', x: tween.x0, y: tween.y0 - rise, scale: 1, rotation: 0, alpha: alpha, text: tween.text, active: true };
}
function applyFallTween(cmd, tween, now){
  var t = clamp01((now - tween.t0) / tween.dur);
  var p = tween.reduced ? easeOutCubic(t) : fallProgress(t);
  cmd.x = tween.from.x + (tween.to.x - tween.from.x) * p;
  cmd.y = tween.from.y + (tween.to.y - tween.from.y) * p;
  if(tween.reduced) cmd.alpha = 0.5 + 0.5 * easeOutCubic(t);
}
function applyClearTween(cmd, tween, now){
  var dt = now - tween.t0;
  if(tween.reduced){
    cmd.alpha = clamp01(1 - dt / tween.dur);
    return;
  }
  if(dt < tween.flashDur){
    cmd.flash = 1 - (dt / tween.flashDur) * 0.35;
  } else {
    var t = clamp01((dt - tween.flashDur) / (tween.dur - tween.flashDur));
    var p = easeInCubic(t);
    cmd.scale = 1 - p * 0.85;
    cmd.alpha = 1 - p;
    cmd.rotation = tween.jitter * p;
  }
}
function applySpawnTween(cmd, tween, now){
  var t = clamp01((now - tween.t0) / tween.dur);
  if(tween.reduced){
    cmd.alpha = t;
    return;
  }
  cmd.scale = 0.2 + 0.8 * spawnScaleProgress(t);
  cmd.alpha = clamp01(t / 0.25);
  cmd.y = cmd.y - (1 - easeOutCubic(t)) * tween.rise;
}
function applyFireTween(cmd, tween, now){
  var t = clamp01((now - tween.t0) / tween.dur);
  cmd.flash = 1 - t;
}
// The one function the design doc calls the renderer's testable seam: geometry + authoritative
// tile state + the active tween list + a timestamp, in; a flat declarative draw-command list,
// out. No canvas, no DOM, nothing time-sourced internally.
function projectFrame(geom, tiles, tweens, now){
  var tileTweens = {}, shake = null, extras = [];
  for(var i = 0; i < tweens.length; i++){
    var tw = tweens[i];
    if(tw.kind === 'fall' || tw.kind === 'clear' || tw.kind === 'spawn' || tw.kind === 'fire') tileTweens[tw.cell] = tw;
    else if(tw.kind === 'shake') shake = tw;
    else extras.push(tw);
  }
  var cmds = [];
  var off = shake ? shakeOffsetAt(shake, now) : {x: 0, y: 0};
  cmds.push({kind: 'shakeOffset', x: off.x, y: off.y, scale: 1, rotation: 0, alpha: 1, active: !!shake});
  for(var c = 0; c < geom.cells.length; c++){
    var cell = geom.cells[c];
    var tile = tiles[cell.id];
    if(!tile) continue;
    var cmd = {
      kind: 'tile', cell: cell.id, x: cell.cx, y: cell.cy, scale: 1, rotation: 0, alpha: 1, flash: 0,
      color: tile.color, special: tile.special,
      blockers: {moss: tile.moss, frost: tile.frost, cage: tile.cage, geode: tile.geode},
      active: false,
    };
    var tw2 = tileTweens[cell.id];
    if(tw2 && now >= tw2.t0){
      cmd.active = true;
      if(tw2.kind === 'fall') applyFallTween(cmd, tw2, now);
      else if(tw2.kind === 'clear') applyClearTween(cmd, tw2, now);
      else if(tw2.kind === 'spawn') applySpawnTween(cmd, tw2, now);
      else if(tw2.kind === 'fire') applyFireTween(cmd, tw2, now);
    }
    cmds.push(cmd);
  }
  for(var e = 0; e < extras.length; e++){
    var ex = extras[e];
    if(ex.kind === 'particle'){ var p = particleAt(ex, now); if(p) cmds.push(p); }
    else if(ex.kind === 'popup'){ var pu = popupAt(ex, now); if(pu) cmds.push(pu); }
  }
  return cmds;
}
function commandBBox(geom, cmd){
  if(cmd.kind === 'tile'){
    var cell = geom.cells[cmd.cell];
    var half = (cell ? cellSpan(cell) : 1) / 2 * Math.max(1, cmd.scale) + 0.3;
    return {x: cmd.x - half, y: cmd.y - half, w: half * 2, h: half * 2};
  }
  var pad = 0.25;
  return {x: cmd.x - pad, y: cmd.y - pad, w: pad * 2, h: pad * 2};
}
function unionRect(a, b){
  if(!a) return b; if(!b) return a;
  var x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  var x1 = Math.max(a.x + a.w, b.x + b.w), y1 = Math.max(a.y + a.h, b.y + b.h);
  return {x: x0, y: y0, w: x1 - x0, h: y1 - y0};
}
function rectsIntersect(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
// Union bounding box (board units, ±0.3 spill padding baked into commandBBox) of every command
// an active tween is driving this frame — the dirty rect the imperative paint step clips/clears
// to instead of the whole canvas (design §2.4).
function computeDirtyRect(geom, cmds){
  var rect = null;
  for(var i = 0; i < cmds.length; i++){
    var cmd = cmds[i];
    if(cmd.kind === 'shakeOffset' || !cmd.active) continue;
    rect = unionRect(rect, commandBBox(geom, cmd));
  }
  return rect;
}
/* ===================== END PURE RENDER CORE ===================== */

// TILESLOTS-DESIGN.md §5: the header wordmark and the persistent map-HUD mark both read
// DISPLAY_NAME rather than hardcoding the name twice. (Deliberately placed after the pure-core
// marker above, not before it — render-projection.test.mts extracts and evals everything from
// the top of this script down through that marker with no DOM available, so nothing here may
// touch document/DOM at top level.)
setText("brand-title", DISPLAY_NAME);
setText("map-wordmark", DISPLAY_NAME);

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
  selected: null,
  dragCell: null,
  armedBooster: null,
  animating: false,
  pendingFrame: null,
  lastChaosSig: null,
  shownResultSig: null,
  lastFinishedLevelId: null,
  lastFinishedWon: null,
  // ---- canvas renderer state (TILESLOTS-DESIGN.md §2) ----
  cellPaths: null, dpr: 1, boardScale: 1,
  activeTweens: [], rafHandle: null, tweenSeq: 0, stepWatch: null,
  awaitingSwapResult: false,
  // ---- audio (§1.5) ----
  audioCtx: null, masterGain: null, audioVoices: [], audioMuted: false
};
try { state.audioMuted = localStorage.getItem("onestone-audio-muted") === "1"; } catch(err) { /* private mode / disabled storage — default unmuted */ }

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
 * scene.mts's slugAccount doc), with no secret — the same "token identity" doctrine the
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

  // A pending swap is "answered" by the very next frame for this level, legal or not — an
  // illegal swap (no match) still pushes a frame (scene.mts's handleSwap returns
  // frameFromRun(...NO_SETTLE) on !settle.legal), just with empty lastSteps and unchanged
  // movesLeft. That is the only client-visible signal an illegal swap gets; there is no
  // separate wire field for it. See playIllegalSwapFeedback.
  var wasAwaitingSwap = state.awaitingSwapResult;
  state.awaitingSwapResult = false;

  show("board-loading", false);
  state.pendingLevel = null;
  if(state.screen !== "board") showScreen("board");

  if(state.curLevelId !== frame.levelId){
    state.curLevelId = frame.levelId;
    buildLattice(frame.geometry);
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
    if(wasAwaitingSwap) playIllegalSwapFeedback();
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
    if(state.lastChaosSig !== sig){ state.lastChaosSig = sig; flourishChaos(); playChaosFlourish(); }
  }
  if(frame.finished){
    showResultSheet(frame.finished, frame.meta);
    // A win on a chapter's last level (20 within-chapter) just unlocked the next chapter — jump
    // the map's chapter tab there so returning to the map lands straight on the newly revealed
    // tiling and the chapter-reveal (maybeShowChapterReveal, called from renderMap) fires as
    // part of the transition itself, not only if the player happens to click that tab later.
    if(frame.finished.won){
      var finishedChapter = Math.floor((frame.finished.levelId - 1) / LEVELS_PER_CHAPTER);
      var levelInFinishedChapter = frame.finished.levelId - finishedChapter * LEVELS_PER_CHAPTER;
      if(levelInFinishedChapter === LEVELS_PER_CHAPTER && CHAPTERS[finishedChapter + 1]){
        state.chapterTab = finishedChapter + 1;
      }
    }
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

/* ===================== map screen =====================
 * Saga map (TILESLOTS-DESIGN.md §4.1): each chapter's 20 levels laid out as an actual SVG path
 * — a stroked <path> through every node's center plus one <g data-level> circle/star/lock per
 * node — locked/unlocked and star state read straight from PlayerMeta.stars/unlocked (the
 * existing account/progress storage; no new persistence). Chapter tabs gain their own
 * locked state (a chapter is locked until its first level unlocks) and switching into a
 * newly-unlocked chapter plays a one-time reveal (§4.1's "chapter transitions ... like a
 * reveal") of that chapter's tiling.
 */
function chapterLevelIds(chapterId){
  var start = chapterId * LEVELS_PER_CHAPTER + 1, ids = [];
  for(var i = 0; i < LEVELS_PER_CHAPTER; i++) ids.push(start + i);
  return ids;
}
function chapterFirstLevelId(chapterId){ return chapterId * LEVELS_PER_CHAPTER + 1; }
function chapterLocked(m, chapterId){ return !!m && m.unlocked < chapterFirstLevelId(chapterId); }

function renderChapterTabs(){
  var m = state.meta;
  var box = el("chapter-tabs");
  box.innerHTML = CHAPTERS.map(function(c){
    var locked = chapterLocked(m, c.id);
    return '<button class="chapter-tab' + (c.id === state.chapterTab ? " on" : "") + (locked ? " locked" : "") + '" data-chapter="' + c.id + '">' +
      '<svg' + (locked ? ' class="ct-lock-icon"' : '') + '><use href="#' + (locked ? "glyph-lock" : c.sym) + '"/></svg>' +
      '<span><span class="ct-name">' + esc(c.name) + '</span><br><span class="ct-sub">' + esc(locked ? "locked" : c.sub) + '</span></span>' +
      "</button>";
  }).join("");
}

// A gentle winding "serpentine" so the SVG path actually reads as a path through the lattice,
// rather than a straight column — amplitude/spacing are tuned to the 380px trail width set in
// CSS (#level-trail's max-width) so nodes never clip the viewBox at any screen size.
function computeTrailLayout(n){
  var vbW = 320, spacing = 74, amp = 100, cx = vbW / 2, topPad = 42, botPad = 42;
  var pts = [];
  for(var i = 0; i < n; i++){
    pts.push({x: cx + amp * Math.sin(i * 0.82), y: topPad + i * spacing});
  }
  return {pts: pts, width: vbW, height: n > 0 ? topPad + (n - 1) * spacing + botPad : topPad};
}

function renderTrailSvg(ids, m){
  var nextId = clamp(m.unlocked, 1, 60);
  var layout = computeTrailLayout(ids.length);
  var pathD = layout.pts.map(function(p, i){ return (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
  var nodes = ids.map(function(id, i){
    var p = layout.pts[i];
    var locked = id > m.unlocked;
    var stars = (m.stars && m.stars[id]) || 0;
    var cls = "trail-node" + (locked ? " locked" : "") + (id === nextId ? " next" : "") + (stars > 0 ? " done" : "");
    var inner = locked ?
      '<use href="#glyph-lock" class="trail-lock" x="-11" y="-11" width="22" height="22"/>' :
      '<text class="trail-num" x="0" y="-2" text-anchor="middle" dominant-baseline="middle">' + id + "</text>" +
      [0, 1, 2].map(function(si){
        return '<use href="#glyph-star" class="trail-star' + (si < stars ? " on" : "") + '" x="' + (-16 + si * 16) + '" y="14" width="13" height="13"/>';
      }).join("");
    return '<g class="' + cls + '" data-level="' + id + '" transform="translate(' + p.x.toFixed(1) + "," + p.y.toFixed(1) + ')">' +
      '<circle class="trail-node-bg" r="27"/>' + inner + "</g>";
  }).join("");
  return '<svg id="trail-svg" viewBox="0 0 ' + layout.width + " " + layout.height + '" preserveAspectRatio="xMidYMin meet">' +
    '<path class="trail-path" d="' + pathD + '"/>' + nodes + "</svg>";
}

function renderMap(){
  var m = state.meta; if(!m) return;
  renderChapterTabs();
  var chapter = CHAPTERS[state.chapterTab];
  if(chapter && !chapterLocked(m, chapter.id)) maybeShowChapterReveal(chapter);
  var ids = chapterLevelIds(state.chapterTab);
  el("level-trail").innerHTML = renderTrailSvg(ids, m);
  renderMapBoosters();
}

/* ---------- chapter reveal: shown once per chapter, first time it's viewed unlocked ---------- */
function seenChapters(){
  try { return JSON.parse(localStorage.getItem("onestone-seen-chapters") || "[]"); } catch(err) { return []; }
}
function markChapterSeen(id){
  var seen = seenChapters();
  if(seen.indexOf(id) < 0){
    seen.push(id);
    try { localStorage.setItem("onestone-seen-chapters", JSON.stringify(seen)); } catch(err) { /* private mode — reveal just replays next time, harmless */ }
  }
}
function maybeShowChapterReveal(chapter){
  if(seenChapters().indexOf(chapter.id) >= 0) return;
  markChapterSeen(chapter.id);
  var sym = el("reveal-sym");
  sym.innerHTML = '<use href="#' + chapter.sym + '"/>';
  setText("reveal-name", chapter.name);
  setText("reveal-sub", chapter.sub);
  var ov = el("chapter-reveal");
  ov.classList.remove("hidden");
  ov.classList.remove("burst");
  void ov.offsetWidth;
  ov.classList.add("burst");
  setTimeout(function(){ ov.classList.add("hidden"); ov.classList.remove("burst"); }, 2100);
}

/* ---------- map booster inventory (design §4.4: earnable via checkpoint clears, no payment
 * changes needed — see progression.mts's checkpoint grant) ---------- */
function renderMapBoosters(){
  var box = el("map-boosters");
  if(!box) return;
  var m = state.meta;
  var boosters = (m && m.boosters) || {};
  var kinds = ["hammer", "shuffle", "extraMoves", "prismStart"];
  var rows = kinds.map(function(k){
    var n = boosters[k] || 0;
    return '<span class="mb-chip' + (n > 0 ? "" : " mb-empty") + '"><svg><use href="#' + BOOSTER_ICON[k] + '"/></svg>' + n + "</span>";
  }).join("");
  box.innerHTML = '<div class="mb-label">Boosters — earned on every 5th level\\u2019s first clear, or bought in the shop</div>' +
    '<div class="mb-row">' + rows + "</div>";
}

function startLevel(id){
  var m = state.meta;
  if(m && id > m.unlocked){ toast("Locked — clear the level before it first."); return; }
  // Sparks (design §4.3) never hard-block a fresh level: if this is an immediate retry of the
  // level just lost and a spark is banked for it, the start must go through even at 0 lives —
  // the server (scene.mts::handleStart) is the actual authority on this, this is only the
  // client-side UX guard mirroring it so the button isn't wrongly disabled.
  var sparkReady = state.lastFinishedLevelId === id && state.lastFinishedWon === false &&
    m && m.sparks && m.sparks[id] && m.sparks[id].n > 0;
  if(m && m.lives <= 0 && !sparkReady){ toast("No lives left. Wait for one to regenerate, or visit the shop."); return; }
  state.pendingLevel = id;
  state.curLevelId = null;
  showScreen("board");
  show("board-loading", true);
  sendInput({kind:"start", levelId: id});
}

/* ===================== board geometry / rendering (layered Canvas 2D) =====================
 * Two stacked canvases (TILESLOTS-DESIGN.md §2.2): #lattice-canvas is repainted only on
 * geometry load/resize (cell polygons, never per animation frame); #tile-canvas is repainted
 * every rAF tick while activeTweens is non-empty and left untouched — no wasted clear/redraw —
 * the moment it's empty. Both share one Path2D cache (state.cellPaths, built once per level
 * load) of each cell's polygon in LOCAL coordinates (shifted so the cell's own center is the
 * origin), so animating a tile is just ctx.translate/rotate/scale before ctx.fill(path) — no
 * per-frame tiling math, per the design doc's §2.5 "never recompute tiling math per frame."
 */
var REDUCED_MOTION_MQ = (typeof window !== "undefined" && window.matchMedia) ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
function reducedMotion(){ return !!(REDUCED_MOTION_MQ && REDUCED_MOTION_MQ.matches); }
function nextTweenId(){ return ++state.tweenSeq; }

// Glyph paths, hand-ported once from the <symbol> defs above (same coordinate data, shifted so
// each glyph is centered at its own origin instead of viewBox (12,12) — see module docs). A
// straight geometry port, not a redesign (design §2.5/§3.3): the five color-blind shape marks,
// the four special-tile glyphs, built lazily so this never touches Path2D before first use
// (Path2D does not exist under node --test, which is exactly why this lives outside the pure
// render core above and is never called by it).
var GLYPHS = null;
function buildGlyphs(){
  if(GLYPHS) return GLYPHS;
  var g = {};
  g.shape0 = new Path2D(); g.shape0.arc(0, 0, 6, 0, Math.PI * 2);
  g.shape1 = new Path2D("M0,-7 L7,7 L-7,7 Z");
  g.shape2 = new Path2D("M0,-8 L8,0 L0,8 L-8,0 Z");
  g.shape3 = new Path2D("M-6,-6 h12 v12 h-12 Z");
  g.shape4 = new Path2D("M-2,-8 h4 v6 h6 v4 h-6 v6 h-4 v-6 h-6 v-4 h6 Z");
  g.shapes = [g.shape0, g.shape1, g.shape2, g.shape3, g.shape4];
  g.striped = new Path2D("M-10,-4.5 h20 v3 h-20 Z M-10,1.5 h20 v3 h-20 Z");
  g.nova = new Path2D();
  g.nova.arc(0, 0, 6.4, 0, Math.PI * 2);
  [[0, -11, 0, -7.6], [0, 7.6, 0, 11], [-11, 0, -7.6, 0], [7.6, 0, 11, 0],
   [-7.8, -7.8, -5.4, -5.4], [5.4, 5.4, 7.8, 7.8], [7.8, -7.8, 5.4, -5.4], [-5.4, 5.4, -7.8, 7.8]].forEach(function(l){
    g.nova.moveTo(l[0], l[1]); g.nova.lineTo(l[2], l[3]);
  });
  g.prism = new Path2D("M0,-9.5 L2.7,-2.8 L9.8,-2.4 L4.2,2 L6.2,9 L0,5 L-6.2,9 L-4.2,2 L-9.8,-2.4 L-2.7,-2.8 Z");
  g.ring = new Path2D(); g.ring.arc(0, 0, 7.6, 0, Math.PI * 2);
  GLYPHS = g;
  return g;
}

function boardCtx(id){
  var ctx = el(id).getContext("2d");
  ctx.setTransform(state.boardScale * state.dpr, 0, 0, state.boardScale * state.dpr, 0, 0);
  return ctx;
}
function resizeCanvases(){
  if(!state.curGeom) return;
  var wrap = el("board-canvas-wrap");
  var rect = wrap.getBoundingClientRect();
  if(rect.width <= 0 || rect.height <= 0) return;
  state.dpr = window.devicePixelRatio || 1;
  state.boardScale = rect.width / state.curGeom.width;
  ["lattice-canvas", "tile-canvas"].forEach(function(id){
    var cv = el(id);
    cv.width = Math.max(1, Math.round(rect.width * state.dpr));
    cv.height = Math.max(1, Math.round(rect.height * state.dpr));
  });
  drawLattice();
  paintFull();
}
window.addEventListener("resize", function(){ resizeCanvases(); });
if(window.matchMedia){
  var dprMq = window.matchMedia("(resolution: 1dppx)");
  if(dprMq.addEventListener) dprMq.addEventListener("change", function(){ resizeCanvases(); });
}

function buildLattice(geom){
  state.curGeom = geom;
  state.cellPaths = new Map();
  geom.cells.forEach(function(cell){
    var p = new Path2D();
    for(var i = 0; i + 1 < cell.poly.length; i += 2){
      var lx = cell.poly[i] - cell.cx, ly = cell.poly[i + 1] - cell.cy;
      if(i === 0) p.moveTo(lx, ly); else p.lineTo(lx, ly);
    }
    p.closePath();
    state.cellPaths.set(cell.id, p);
  });
  el("board-canvas-wrap").style.setProperty("--board-ar", String(geom.width / geom.height));
  state.activeTweens = [];
  state.stepWatch = null;
  state.selected = null;
  resizeCanvases();
}
function drawLattice(){
  if(!state.curGeom) return;
  var ctx = boardCtx("lattice-canvas");
  ctx.clearRect(0, 0, state.curGeom.width, state.curGeom.height);
  ctx.fillStyle = "rgba(255,255,255,.03)";
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.lineWidth = 0.03;
  state.curGeom.cells.forEach(function(cell){
    var path = state.cellPaths.get(cell.id);
    ctx.save();
    ctx.translate(cell.cx, cell.cy);
    ctx.fill(path);
    ctx.stroke(path);
    ctx.restore();
  });
}

function drawSelectionHighlight(ctx, geom){
  if(state.selected == null) return;
  var cell = geom.cells[state.selected];
  var path = cell && state.cellPaths.get(cell.id);
  if(!cell || !path) return;
  ctx.save();
  ctx.translate(cell.cx, cell.cy);
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = "#fff";
  ctx.stroke(path);
  ctx.restore();
}

function drawTileCommand(ctx, geom, cmd){
  var cell = geom.cells[cmd.cell];
  var path = state.cellPaths.get(cmd.cell);
  if(!cell || !path) return;
  ctx.save();
  ctx.translate(cmd.x, cmd.y);
  if(cmd.rotation) ctx.rotate(cmd.rotation * Math.PI / 180);
  if(cmd.scale !== 1) ctx.scale(cmd.scale, cmd.scale);
  ctx.globalAlpha = cmd.alpha;
  var span = cellSpan(cell);
  if(cmd.blockers && cmd.blockers.geode > 0){
    ctx.fillStyle = "#5b6070";
    ctx.fill(path);
    var pipR = span * 0.06;
    for(var p = 0; p < 3; p++){
      ctx.beginPath();
      ctx.fillStyle = p < cmd.blockers.geode ? "#e8e2ff" : "rgba(255,255,255,.18)";
      ctx.arc(-span * 0.18 + p * span * 0.18, 0, pipR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = colorForCell(cmd.color, cell.shade);
  ctx.fill(path);
  ctx.lineWidth = 0.02;
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.stroke(path);
  if(cmd.flash > 0){
    ctx.save();
    ctx.globalAlpha = cmd.alpha * cmd.flash;
    ctx.fillStyle = "#fff";
    ctx.fill(path);
    ctx.restore();
  }
  var glyphs = buildGlyphs();
  ctx.save();
  ctx.globalAlpha = cmd.alpha * 0.32;
  ctx.fillStyle = "#000";
  var shapeScale = (span * 0.16) / 24;
  ctx.scale(shapeScale, shapeScale);
  ctx.fill(glyphs.shapes[cmd.color % 5]);
  ctx.restore();
  if(cmd.special !== "none"){
    var sz = (span * 0.5) / 24;
    ctx.save();
    var rot = cmd.special === "striped" ? railAngleForCell(geom, cmd.cell) : 0;
    if(rot) ctx.rotate(rot * Math.PI / 180);
    ctx.scale(sz, sz);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.8;
    var gp = glyphs[cmd.special];
    if(cmd.special === "striped" || cmd.special === "prism") ctx.fill(gp); else ctx.stroke(gp);
    ctx.restore();
  }
  if(cmd.blockers){
    if(cmd.blockers.moss){
      ctx.beginPath();
      ctx.fillStyle = "rgba(61,220,151,.75)";
      ctx.arc(0, span * 0.3, span * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    if(cmd.blockers.frost){
      ctx.save();
      ctx.fillStyle = "rgba(160,220,255,.28)";
      ctx.fill(path);
      ctx.strokeStyle = "#bfe8ff";
      ctx.lineWidth = 0.02;
      ctx.stroke(path);
      ctx.restore();
    }
    if(cmd.blockers.cage){
      ctx.save();
      ctx.strokeStyle = "#c9b48a";
      ctx.lineWidth = 0.05;
      ctx.setLineDash([0.12, 0.08]);
      ctx.stroke(path);
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawParticleCommand(ctx, cmd){
  ctx.save();
  ctx.globalAlpha = cmd.alpha;
  ctx.fillStyle = cmd.color;
  var s = 0.08;
  ctx.fillRect(cmd.x - s / 2, cmd.y - s / 2, s, s);
  ctx.restore();
}
function drawPopupCommand(ctx, cmd){
  ctx.save();
  ctx.globalAlpha = cmd.alpha;
  ctx.fillStyle = "#ffcc66";
  ctx.font = "bold 0.5px -apple-system,BlinkMacSystemFont,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cmd.text, cmd.x, cmd.y);
  ctx.restore();
}
function paintCommandList(ctx, geom, cmds){
  var shakeCmd = cmds[0];
  ctx.save();
  if(shakeCmd && shakeCmd.kind === "shakeOffset") ctx.translate(shakeCmd.x, shakeCmd.y);
  for(var i = 0; i < cmds.length; i++){
    var cmd = cmds[i];
    if(cmd.kind === "tile") drawTileCommand(ctx, geom, cmd);
    else if(cmd.kind === "particle") drawParticleCommand(ctx, cmd);
    else if(cmd.kind === "popup") drawPopupCommand(ctx, cmd);
  }
  drawSelectionHighlight(ctx, geom);
  ctx.restore();
}
function paintFull(){
  if(!state.curGeom || !state.curTiles) return;
  var ctx = boardCtx("tile-canvas");
  ctx.clearRect(0, 0, state.curGeom.width, state.curGeom.height);
  var cmds = projectFrame(state.curGeom, state.curTiles, state.activeTweens, performance.now());
  paintCommandList(ctx, state.curGeom, cmds);
}
// Dirty-rect redraw (design §2.4): clip+clear only the union bounding box of what an active
// tween is touching this frame, then redraw every command (idle tiles included — canvas has no
// partial-persistence semantics) whose own bounding box overlaps that rect. A cascade confined
// to one column of an 8x8 board repaints a handful of cells, not sixty-four, every frame.
function paintDirty(cmds, now){
  var geom = state.curGeom;
  var rect = computeDirtyRect(geom, cmds);
  if(!rect) return;
  var ctx = boardCtx("tile-canvas");
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
  var shakeCmd = cmds[0];
  ctx.save();
  if(shakeCmd && shakeCmd.kind === "shakeOffset") ctx.translate(shakeCmd.x, shakeCmd.y);
  for(var i = 0; i < cmds.length; i++){
    var cmd = cmds[i];
    if(cmd.kind === "shakeOffset") continue;
    if(!rectsIntersect(commandBBox(geom, cmd), rect)) continue;
    if(cmd.kind === "tile") drawTileCommand(ctx, geom, cmd);
    else if(cmd.kind === "particle") drawParticleCommand(ctx, cmd);
    else if(cmd.kind === "popup") drawPopupCommand(ctx, cmd);
  }
  ctx.restore();
  ctx.restore();
}

function renderTilesInstant(geom, tiles){
  state.curGeom = geom;
  state.curTiles = tiles;
  state.activeTweens = [];
  paintFull();
}

/* ===================== cascade animation: rAF tween-list driver (design §1.2) =====================
 * One requestAnimationFrame loop drives everything — falls, clears, spawns, particles, popups,
 * screen shake — as entries in state.activeTweens, each with its own duration (distance-scaled
 * for falls, per §1.3/§1.4), instead of the old fixed two-setTimeout-per-step chain this
 * replaces. The loop stops entirely (no rAF rescheduled) whenever activeTweens is empty,
 * including during a cascade's inter-step gap — an idle board costs 0 CPU per frame.
 */
function ensureLoopRunning(){
  if(state.rafHandle != null) return;
  state.rafHandle = requestAnimationFrame(tick);
}
function tick(now){
  state.activeTweens = pruneTweens(state.activeTweens, now);
  var watch = state.stepWatch;
  if(watch && !watch.fired && now >= watch.endAt){
    watch.fired = true;
    state.stepWatch = null;
    watch.onDone(); // may update state.curTiles and/or arm a new state.stepWatch for the next step
  }
  var cmds = projectFrame(state.curGeom, state.curTiles, state.activeTweens, now);
  if(state.activeTweens.length) paintDirty(cmds, now); else paintFull();
  if(state.activeTweens.length || state.stepWatch){
    state.rafHandle = requestAnimationFrame(tick);
  } else {
    state.rafHandle = null;
  }
}

function flashOverlay(){
  // prefers-reduced-motion's screen-shake fallback (design §1.4): a single quick flash instead
  // of any positional motion.
  var f = el("board-flash");
  f.classList.remove("on");
  void f.offsetWidth;
  f.classList.add("on");
  setTimeout(function(){ f.classList.remove("on"); }, 90);
}

function buildStepTweens(step, geom, stepIndex, now){
  var tweens = [];
  var reduced = reducedMotion();
  step.cleared.forEach(function(cellId){
    tweens.push({id: nextTweenId(), kind: "clear", cell: cellId, t0: now, dur: reduced ? 90 : (FLASH_MS + CLEAR_MS), flashDur: FLASH_MS, jitter: jitterForCell(cellId), reduced: reduced});
  });
  step.fired.forEach(function(f){
    if(step.cleared.indexOf(f.cell) < 0){
      tweens.push({id: nextTweenId(), kind: "fire", cell: f.cell, t0: now, dur: reduced ? 90 : FLASH_MS});
    }
  });
  var depths = fallDepths(step.falls);
  step.falls.forEach(function(f){
    var fromCell = geom.cells[f.from], toCell = geom.cells[f.to];
    if(!fromCell || !toCell) return;
    var dist = Math.hypot(fromCell.cx - toCell.cx, fromCell.cy - toCell.cy);
    var dur = fallDuration(dist, 1);
    var delay = Math.min((depths[f.to] || 0) * STAGGER_MS, STAGGER_CAP);
    tweens.push({
      id: nextTweenId(), kind: "fall", cell: f.to, t0: now + delay, dur: reduced ? 90 : dur,
      from: {x: fromCell.cx, y: fromCell.cy}, to: {x: toCell.cx, y: toCell.cy}, reduced: reduced,
    });
  });
  step.spawned.forEach(function(s){
    tweens.push({id: nextTweenId(), kind: "spawn", cell: s.cell, t0: now, dur: reduced ? 90 : SPAWN_MS, rise: 0.5, reduced: reduced});
  });
  if(!reduced && step.cleared.length > 0){
    var count = Math.min(4 + Math.floor(stepIndex * 0.6), 10);
    step.cleared.forEach(function(cellId){
      var cell = geom.cells[cellId];
      if(!cell) return;
      var tile = state.curTiles && state.curTiles[cellId];
      var color = tile ? colorForCell(tile.color, cell.shade) : PALETTE[0];
      for(var k = 0; k < count; k++){
        var angle = ((cellId * 37 + k * 53) % 360) * Math.PI / 180;
        var speed = 0.9 + ((cellId * 13 + k * 7) % 70) / 100;
        tweens.push({
          id: nextTweenId(), kind: "particle", t0: now, dur: PARTICLE_MS,
          x0: cell.cx, y0: cell.cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          gravity: 0.4, color: color,
        });
      }
    });
  }
  if(step.score > 0){
    var originCell = (step.matches && step.matches.length) ? geom.cells[step.matches[0].origin] : null;
    if(!originCell && step.cleared.length){
      var sx = 0, sy = 0, n = 0;
      step.cleared.forEach(function(id){ var c = geom.cells[id]; if(c){ sx += c.cx; sy += c.cy; n++; } });
      if(n) originCell = {cx: sx / n, cy: sy / n};
    }
    if(originCell){
      tweens.push({id: nextTweenId(), kind: "popup", t0: now, dur: reduced ? 300 : POPUP_MS, x0: originCell.cx, y0: originCell.cy, rise: reduced ? 0 : 0.6, text: "+" + step.score});
    }
  }
  if(step.cleared.length >= 8 || step.fired.length > 0){
    if(reduced) flashOverlay();
    else tweens.push({id: nextTweenId(), kind: "shake", t0: now, dur: 260, amp: Math.min(0.06 * Math.sqrt(step.cleared.length), SHAKE_MAX), seed: stepIndex * 1.7});
  }
  return tweens;
}
function stepMaxEnd(tweens){
  var end = 0;
  tweens.forEach(function(t){ end = Math.max(end, t.t0 + t.dur); });
  return end;
}
function applyStepToTiles(step, geom){
  var tiles = state.curTiles.slice();
  step.falls.forEach(function(f){ tiles[f.to] = tiles[f.from]; });
  step.spawned.forEach(function(s){ tiles[s.cell] = s.tile; });
  state.curTiles = tiles;
}
function animateCascade(geom, steps, finalTiles){
  state.animating = true;
  return new Promise(function(resolve){
    var idx = 0;
    function stepDone(){
      applyStepToTiles(steps[idx], geom);
      idx++;
      if(idx >= steps.length){
        state.curTiles = finalTiles;
        state.activeTweens = [];
        state.animating = false;
        resolve();
        return;
      }
      var gap = Math.max(40, 260 - 18 * idx);
      setTimeout(startStep, gap);
    }
    function startStep(){
      var step = steps[idx];
      var now = performance.now();
      var tweens = buildStepTweens(step, geom, idx, now);
      state.activeTweens = state.activeTweens.concat(tweens);
      playStepAudio(step, idx);
      state.stepWatch = {endAt: stepMaxEnd(tweens), onDone: stepDone, fired: false};
      ensureLoopRunning();
    }
    startStep();
  });
}

/* ===================== audio: WebAudio-synthesized, zero assets (design §1.5) ===================== */
function ensureAudioCtx(){
  if(state.audioCtx) return state.audioCtx;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = AC ? new AC() : null;
  } catch(err) { state.audioCtx = null; }
  return state.audioCtx;
}
function ensureMasterGain(ctx){
  if(state.masterGain && state.masterGain.context === ctx) return state.masterGain;
  state.masterGain = ctx.createGain();
  state.masterGain.gain.value = state.audioMuted ? 0 : 1;
  state.masterGain.connect(ctx.destination);
  return state.masterGain;
}
function registerVoice(stopFn){
  state.audioVoices.push(stopFn);
  if(state.audioVoices.length > 8){
    var old = state.audioVoices.shift();
    try { old(true); } catch(err) { /* voice already finished naturally */ }
  }
}
function toneVoice(ctx, opts){
  var osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = opts.type || "sine";
  osc.frequency.setValueAtTime(opts.freq, ctx.currentTime);
  if(opts.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), ctx.currentTime + (opts.decay || 100) / 1000);
  var attack = (opts.attack || 4) / 1000, decay = (opts.decay || 90) / 1000;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(opts.gain, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + attack + decay);
  osc.connect(gain);
  gain.connect(state.masterGain);
  osc.start();
  osc.stop(ctx.currentTime + attack + decay + 0.02);
  var stopped = false;
  registerVoice(function(fade){
    if(stopped) return; stopped = true;
    if(fade){
      var now2 = ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(now2);
        gain.gain.setValueAtTime(gain.gain.value, now2);
        gain.gain.linearRampToValueAtTime(0.0001, now2 + 0.015);
        osc.stop(now2 + 0.02);
      } catch(err) { /* already stopped */ }
    }
  });
}
function playPop(stepIndex){
  var ctx = ensureAudioCtx(); if(!ctx || state.audioMuted) return;
  ensureMasterGain(ctx);
  toneVoice(ctx, {type: "triangle", freq: 220 + 80 * Math.min(stepIndex, 6), attack: 4, decay: 90, gain: 0.22});
}
function playBoom(index){
  var ctx = ensureAudioCtx(); if(!ctx || state.audioMuted) return;
  ensureMasterGain(ctx);
  setTimeout(function(){
    if(!state.audioCtx || state.audioMuted) return;
    toneVoice(ctx, {type: "sine", freq: 180, freqEnd: 60, attack: 2, decay: 160, gain: 0.30});
    toneVoice(ctx, {type: "square", freq: 340, attack: 1, decay: 30, gain: 0.12});
  }, index * 25);
}
function playChaosFlourish(){
  var ctx = ensureAudioCtx(); if(!ctx || state.audioMuted) return;
  ensureMasterGain(ctx);
  [330, 440, 550].forEach(function(freq, i){
    setTimeout(function(){
      if(!state.audioCtx || state.audioMuted) return;
      toneVoice(ctx, {type: "sawtooth", freq: freq, attack: 5, decay: 300, gain: 0.28});
    }, i * 60);
  });
}
var BLOCKER_TONE = {moss: 900, frost: 1400, cage: 500, geode: 700};
function playBlockerBreak(kind){
  var ctx = ensureAudioCtx(); if(!ctx || state.audioMuted) return;
  ensureMasterGain(ctx);
  var bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.08));
  var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  var data = buffer.getChannelData(0);
  for(var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  var noise = ctx.createBufferSource();
  noise.buffer = buffer;
  var band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = BLOCKER_TONE[kind] || 800;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.073);
  noise.connect(band); band.connect(gain); gain.connect(state.masterGain);
  noise.start();
  noise.stop(ctx.currentTime + 0.09);
  registerVoice(function(){});
}
function playIllegalSwap(){
  var ctx = ensureAudioCtx(); if(!ctx || state.audioMuted) return;
  ensureMasterGain(ctx);
  toneVoice(ctx, {type: "sine", freq: 140, attack: 2, decay: 60, gain: 0.12});
}
function playStepAudio(step, stepIndex){
  if(state.audioMuted) return;
  if(step.cleared.length > 0) playPop(stepIndex);
  step.fired.forEach(function(f, i){ playBoom(i); });
  var blockerKinds = [];
  if(step.mossCleared.length) blockerKinds.push("moss");
  if(step.frostBroken.length) blockerKinds.push("frost");
  if(step.cageBroken.length) blockerKinds.push("cage");
  if(step.geodeHit.length) blockerKinds.push("geode");
  blockerKinds.forEach(function(kind, i){ setTimeout(function(){ playBlockerBreak(kind); }, 40 + i * 30); });
}
function playIllegalSwapFeedback(){
  playIllegalSwap();
  if(reducedMotion()){ flashOverlay(); return; }
  var now = performance.now();
  state.activeTweens = state.activeTweens.concat([{id: nextTweenId(), kind: "shake", t0: now, dur: 180, amp: 0.035, seed: 0.4}]);
  ensureLoopRunning();
}
function setAudioMuted(muted){
  state.audioMuted = muted;
  if(state.masterGain) state.masterGain.gain.value = muted ? 0 : 1;
  try { localStorage.setItem("onestone-audio-muted", muted ? "1" : "0"); } catch(err) { /* ignore */ }
  var btn = el("audio-mute");
  if(btn) btn.innerHTML = '<svg><use href="#' + (muted ? "glyph-mute" : "glyph-unmute") + '"/></svg>';
}
setAudioMuted(state.audioMuted);
el("audio-mute").addEventListener("click", function(e){ e.stopPropagation(); setAudioMuted(!state.audioMuted); });
document.addEventListener("pointerdown", function(){ ensureAudioCtx(); }, {once: true, capture: true});

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
  var c = state.curGeom && state.curGeom.cells[a];
  return !!(c && c.neighbors.indexOf(b) >= 0);
}
function setSelected(cellId){
  state.selected = cellId;
  if(state.curGeom) paintFull();
}
function trySwap(a, b){
  state.awaitingSwapResult = true; // see handleFrame's illegal-swap detection
  sendInput({kind:"swap", a: a, b: b});
}
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

// Pointer -> board-unit -> cellId, via the same point-in-polygon hit test the pure core exposes
// (hitTestCell) — the canvas board has no per-cell DOM node to read a data-cell attribute from,
// so hit testing is geometry math against the live canvas's own bounding rect instead.
function boardPointToCell(e){
  if(!state.curGeom) return null;
  var rect = el("tile-canvas").getBoundingClientRect();
  if(rect.width <= 0 || rect.height <= 0) return null;
  var sx = state.curGeom.width / rect.width, sy = state.curGeom.height / rect.height;
  return hitTestCell(state.curGeom, (e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
}
el("tile-canvas").addEventListener("pointerdown", function(e){
  state.dragCell = boardPointToCell(e);
});
el("tile-canvas").addEventListener("pointerup", function(e){
  if(state.dragCell == null) return;
  var startCell = state.dragCell;
  state.dragCell = null;
  if(state.animating) return; // a cascade is still animating — the same guard tapSelect applies
  var endCell = boardPointToCell(e);
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
  if(chap){
    var chId = Number(chap.getAttribute("data-chapter"));
    if(chapterLocked(state.meta, chId)){ toast("Locked — clear the previous chapter first."); return; }
    state.chapterTab = chId;
    renderMap();
    return;
  }
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
  state.lastFinishedWon = result.won;
  // Sparks (design §4.3): a loss with a spark banked for this level means the very next retry
  // is free — surface that on the button itself rather than leaving it a silent server detail.
  var sparks = !result.won && meta && meta.sparks && meta.sparks[result.levelId];
  setText("result-retry", sparks && sparks.n > 0 ? "Retry (free \\u2014 spark)" : "Retry");
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
