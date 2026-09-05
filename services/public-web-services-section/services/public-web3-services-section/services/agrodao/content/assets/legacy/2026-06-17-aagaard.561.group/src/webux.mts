// webux — the operator's WebUX for the Aagaard fleet, served behind the same
// Google-OAuth gate the other 561 surfaces use.
//
// The page itself is a thin shell (HTML + a little vanilla JS): it carries no
// fleet logic. It drives the gated `/ops/*` JSON control plane, and it gets its
// bearer token by running the standard PKCE authorization-code flow against the
// in-process `/oauth/*` endpoints — register a public client, redirect to
// `/oauth/authorize` (which bounces through Google and the single-allowed-email
// confinement), exchange the returned code at `/oauth/token`, keep the access
// token in sessionStorage, and send it as `Authorization: Bearer …` on every
// control call. So the shell is public; everything it can DO is gated.
//
// Served at `/ui` (and `/ui` is also the OAuth redirect target). Transport only.

import type { App } from "@emsenn/http-server";

function page(publicBaseUrl: string): string {
  // The client config the browser needs. The redirect target is this same page.
  const cfg = JSON.stringify({ base: publicBaseUrl, redirectUri: `${publicBaseUrl}/ui` });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aagaard — fleet operations</title>
<style>
  :root { color-scheme: dark; --bg:#0b0e14; --fg:#cdd6f4; --mut:#7f849c; --acc:#89b4fa; --ok:#a6e3a1; --warn:#f9e2af; --bad:#f38ba8; --pan:#11151f; --bd:#1e2536; }
  * { box-sizing: border-box; }
  body { margin:0; font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; background:var(--bg); color:var(--fg); }
  header { display:flex; align-items:center; gap:1rem; padding:.75rem 1rem; border-bottom:1px solid var(--bd); }
  header h1 { font-size:1rem; margin:0; letter-spacing:.04em; }
  header .sp { flex:1; }
  .pill { padding:.15rem .55rem; border-radius:999px; border:1px solid var(--bd); font-size:.8rem; }
  .pill.on { color:var(--ok); border-color:var(--ok); }
  .pill.off { color:var(--mut); }
  .pill.live { color:var(--bad); border-color:var(--bad); }
  main { padding:1rem; display:grid; gap:1rem; max-width:1100px; margin:0 auto; }
  .panel { background:var(--pan); border:1px solid var(--bd); border-radius:8px; padding:1rem; }
  .panel h2 { font-size:.85rem; margin:0 0 .75rem; color:var(--mut); text-transform:uppercase; letter-spacing:.08em; }
  button { font:inherit; background:#1b2230; color:var(--fg); border:1px solid var(--bd); border-radius:6px; padding:.4rem .8rem; cursor:pointer; }
  button:hover { border-color:var(--acc); }
  button.danger:hover { border-color:var(--bad); color:var(--bad); }
  .row { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; }
  table { width:100%; border-collapse:collapse; font-size:.85rem; }
  th,td { text-align:left; padding:.35rem .5rem; border-bottom:1px solid var(--bd); }
  th { color:var(--mut); font-weight:normal; }
  .locked { color:var(--warn); }
  .muted { color:var(--mut); }
  pre { background:#0a0d13; border:1px solid var(--bd); border-radius:6px; padding:.75rem; overflow:auto; max-height:22rem; font-size:.8rem; }
  a { color:var(--acc); }
  #gate { text-align:center; padding:3rem 1rem; }
</style>
</head>
<body>
<header>
  <h1>AAGAARD</h1>
  <span class="muted">fleet operations</span>
  <span class="sp"></span>
  <span id="hdr-live" class="pill off">live?</span>
  <span id="hdr-run" class="pill off">loop?</span>
  <button id="signout" hidden>sign out</button>
</header>
<main>
  <section id="gate" class="panel">
    <p class="muted">This control plane is confined to the operator's Google account.</p>
    <button id="signin">Sign in with Google</button>
  </section>

  <section id="app" hidden>
    <div class="panel">
      <h2>Fleet</h2>
      <div class="row" style="margin-bottom:.75rem">
        <button id="btn-arm" class="danger">Arm (allow broadcasts)</button>
        <button id="btn-disarm">Disarm</button>
        <button id="btn-pause">Pause loop</button>
        <button id="btn-resume">Resume loop</button>
        <button id="btn-tick">Run tick now</button>
        <button id="btn-refresh">Refresh</button>
      </div>
      <table id="accounts"><thead><tr><th>account</th><th>capabilities</th><th>trading-live</th><th>posting key</th><th>active key</th></tr></thead><tbody></tbody></table>
    </div>

    <div class="panel">
      <h2>Capability lanes</h2>
      <table id="caps"><thead><tr><th>lane</th><th>state</th><th></th></tr></thead><tbody></tbody></table>
      <p class="muted" style="margin:.5rem 0 0">Locked lanes (posting, gaming) are prepared but cannot be enabled here — a human unlocks them in source.</p>
    </div>

    <div class="panel">
      <h2>Alpha radar</h2>
      <div class="row" style="margin-bottom:.5rem">
        <select id="radar-account"></select>
        <button id="btn-radar">Read radar</button>
      </div>
      <pre id="radar">—</pre>
    </div>

    <div class="panel">
      <h2>Incentive nominations <span class="muted">(do X, get Y — human gate)</span></h2>
      <div class="row" style="margin-bottom:.5rem"><button id="btn-incentives">Refresh queue</button></div>
      <table id="incentives"><thead><tr><th>EV</th><th>source</th><th>actions</th><th>reward</th><th>disposition</th></tr></thead><tbody></tbody></table>
      <p class="muted" style="margin:.5rem 0 0">llm-draft writes into the LOCKED posting store for review — nothing broadcasts until posting is unlocked in source.</p>
    </div>

    <div class="panel">
      <h2>Last tick</h2>
      <pre id="last">—</pre>
    </div>
  </section>
</main>

<script type="module">
const CFG = ${cfg};
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
async function sha256(s){ return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
const rand = (n=48) => { const a=new Uint8Array(n); crypto.getRandomValues(a); return b64url(a.buffer); };

const TKN = 'aagaard.token';
let token = sessionStorage.getItem(TKN) || '';

async function registerClient(){
  let id = sessionStorage.getItem('aagaard.client');
  if (id) return id;
  const r = await fetch(CFG.base + '/oauth/register', { method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ client_name:'aagaard-webux', redirect_uris:[CFG.redirectUri], token_endpoint_auth_method:'none' }) });
  if (!r.ok) throw new Error('client registration failed');
  id = (await r.json()).client_id;
  sessionStorage.setItem('aagaard.client', id);
  return id;
}
async function beginLogin(){
  const clientId = await registerClient();
  const verifier = rand(48);
  const state = rand(16);
  sessionStorage.setItem('aagaard.pkce', verifier);
  sessionStorage.setItem('aagaard.state', state);
  const challenge = await sha256(verifier);
  const u = new URL(CFG.base + '/oauth/authorize');
  u.searchParams.set('response_type','code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', CFG.redirectUri);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method','S256');
  u.searchParams.set('state', state);
  location.href = u.toString();
}
async function completeLogin(code, state){
  if (state !== sessionStorage.getItem('aagaard.state')) throw new Error('state mismatch');
  const clientId = sessionStorage.getItem('aagaard.client');
  const verifier = sessionStorage.getItem('aagaard.pkce');
  const body = new URLSearchParams({ grant_type:'authorization_code', code, client_id:clientId, code_verifier:verifier, redirect_uri:CFG.redirectUri });
  const r = await fetch(CFG.base + '/oauth/token', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
  if (!r.ok) throw new Error('token exchange failed');
  token = (await r.json()).access_token;
  sessionStorage.setItem(TKN, token);
  history.replaceState({}, '', CFG.redirectUri);
}

async function api(path, method='GET'){
  const r = await fetch(CFG.base + '/ops' + path, { method, headers:{ 'authorization':'Bearer '+token } });
  if (r.status === 401 || r.status === 403){ token=''; sessionStorage.removeItem(TKN); showGate(); throw new Error('unauthorized'); }
  return r.json();
}

const $ = (id) => document.getElementById(id);
function showGate(){ $('gate').hidden=false; $('app').hidden=true; $('signout').hidden=true; }
function showApp(){ $('gate').hidden=true; $('app').hidden=false; $('signout').hidden=false; }

function renderStatus(s){
  $('hdr-live').textContent = s.live ? 'LIVE' : 'safe';
  $('hdr-live').className = 'pill ' + (s.live ? 'live' : 'off');
  $('hdr-run').textContent = s.running ? 'loop on' : 'paused';
  $('hdr-run').className = 'pill ' + (s.running ? 'on' : 'off');
  const tb = $('accounts').querySelector('tbody'); tb.innerHTML='';
  const sel = $('radar-account'); sel.innerHTML='';
  for (const a of s.accounts){
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>'+a.account+'</td><td class="muted">'+a.capabilities.join(', ')+'</td><td>'+(a.tradingLive?'<span class="pill live">yes</span>':'<span class="muted">no</span>')+'</td><td>'+(a.hasPosting?'✓':'·')+'</td><td>'+(a.hasActive?'✓':'·')+'</td>';
    tb.appendChild(tr);
    const o = document.createElement('option'); o.value=a.account; o.textContent=a.account; sel.appendChild(o);
  }
}
function renderCaps(c){
  const tb = $('caps').querySelector('tbody'); tb.innerHTML='';
  for (const lane of c.capabilities){
    const tr = document.createElement('tr');
    const state = lane.locked ? '<span class="locked">LOCKED</span>' : (lane.enabled ? '<span class="pill on">enabled</span>' : '<span class="muted">disabled</span>');
    let btn = '';
    if (!lane.locked) btn = '<button data-cap="'+lane.capability+'" data-act="'+(lane.enabled?'disable':'enable')+'">'+(lane.enabled?'disable':'enable')+'</button>';
    tr.innerHTML = '<td>'+lane.capability+'</td><td>'+state+'</td><td>'+btn+'</td>';
    tb.appendChild(tr);
  }
  tb.querySelectorAll('button').forEach(bn => bn.onclick = async () => { await api('/capabilities/'+bn.dataset.cap+'/'+bn.dataset.act,'POST'); refresh(); });
}

async function refresh(){
  try {
    renderStatus(await api('/'));
    renderCaps(await api('/capabilities'));
    const last = await api('/last').catch(()=>({note:'no tick yet'}));
    $('last').textContent = JSON.stringify(last, null, 2);
    renderIncentives();
  } catch {}
}

$('signin').onclick = () => beginLogin().catch(e => alert(e.message));
$('signout').onclick = () => { token=''; sessionStorage.removeItem(TKN); sessionStorage.setItem('aagaard.autologin','1'); showGate(); };
$('btn-arm').onclick = async () => { if(confirm('Arm the fleet? Broadcasts become permitted on enabled, account-eligible lanes.')){ await api('/arm','POST'); refresh(); } };
$('btn-disarm').onclick = async () => { await api('/disarm','POST'); refresh(); };
$('btn-pause').onclick = async () => { await api('/pause','POST'); refresh(); };
$('btn-resume').onclick = async () => { await api('/resume','POST'); refresh(); };
$('btn-tick').onclick = async () => { $('last').textContent='ticking…'; const r = await api('/tick','POST'); $('last').textContent = JSON.stringify(r,null,2); refresh(); };
$('btn-refresh').onclick = refresh;
$('btn-radar').onclick = async () => { $('radar').textContent='reading…'; const acc=$('radar-account').value; const r = await api('/alpha/'+encodeURIComponent(acc)); $('radar').textContent = JSON.stringify(r,null,2); };

async function renderIncentives(){
  const data = await api('/incentives').catch(()=>({pending:[],dispositioned:[]}));
  const tb = $('incentives').querySelector('tbody'); tb.innerHTML='';
  const rows = [...(data.pending||[]), ...(data.dispositioned||[])];
  if (!rows.length){ tb.innerHTML='<tr><td colspan="5" class="muted">no nominations</td></tr>'; return; }
  for (const r of rows){
    const tr = document.createElement('tr');
    const reward = r.reward ? ((r.reward.amount||'')+' '+r.reward.token).trim()+' (~'+(r.rewardHbd||0).toFixed(3)+' HBD)' : '—';
    let cell;
    if (r.status==='pending'){
      cell = '<button data-id="'+r.offerId+'" data-c="llm-draft">llm-draft</button> <button data-id="'+r.offerId+'" data-c="manual">manual</button> <button class="danger" data-id="'+r.offerId+'" data-c="ignore">ignore</button>';
    } else { cell = '<span class="'+(r.status==='ignored'?'muted':'locked')+'">'+r.status+'</span>'; }
    tr.innerHTML = '<td>'+(r.ev||0).toFixed(3)+'</td><td>'+r.source.author+'/'+r.source.permlink.slice(0,18)+'</td><td class="muted">'+(r.requiredActions||[]).join(',')+'</td><td>'+reward+'</td><td>'+cell+'</td>';
    tb.appendChild(tr);
  }
  tb.querySelectorAll('button').forEach(bn => bn.onclick = async () => {
    await api('/incentives/'+encodeURIComponent(bn.dataset.id)+'/'+bn.dataset.c,'POST');
    renderIncentives();
  });
}
$('btn-incentives').onclick = renderIncentives;

// Boot: finish a redirect, then show the app if authenticated — otherwise
// AUTO-START the OAuth flow once (bounce through Google with the single-allowed
// -email confinement, so the operator lands logged-in as admin with no click).
// Guarded against loops: if the exchange fails or the email is rejected, or
// Google returns an error, fall back to the manual gate and do not re-bounce.
const AL = 'aagaard.autologin';
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.get('error')){ history.replaceState({}, '', CFG.redirectUri); showGate(); return; }
  if (q.get('code')){
    try { await completeLogin(q.get('code'), q.get('state')); sessionStorage.removeItem(AL); }
    catch(e){ sessionStorage.setItem(AL,'1'); showGate(); return; }
  }
  if (token){ showApp(); refresh(); return; }
  if (!sessionStorage.getItem(AL)){
    sessionStorage.setItem(AL,'1');
    try { await beginLogin(); return; } catch(e){ showGate(); return; }
  }
  showGate();
})();
</script>
</body>
</html>`;
}

/** The WebUX shell (UNGATED). Its data and actions hit the gated `/ops/*`. */
export function createWebuxApp(publicBaseUrl: string): App {
  const html = page(publicBaseUrl.replace(/\/$/, ""));
  const serve = () => ({ status: 200, type: "text/html; charset=utf-8", body: html });
  return {
    resources: [
      { match: "/ui", methods: ["GET"], produces: ["text/html"], handler: serve },
    ],
  };
}
