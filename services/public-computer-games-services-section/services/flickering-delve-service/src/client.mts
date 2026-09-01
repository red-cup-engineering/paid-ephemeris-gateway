/**
 * `client` — the no-build, dependency-free browser client for flickering.
 *
 * One self-contained HTML document (served at `/`). It speaks the same session-carrier
 * protocol FeltOS's client does — `POST /session` to log in, `EventSource /stream?token=…` for
 * the feed, `POST /input` to act — but renders a graphical idle UI driven by the JSON `state`
 * frames the tick emits, not a text terminal.
 *
 * The signature behaviour lives here: the interface **collapses as you automate**. Each manual
 * action's button disappears once its standing order is learned; when every order is learned the
 * whole action bar folds into a single **Delve/Pause** toggle and the **strategy editor** — the
 * Lisp the tick runs for you — becomes the place you actually play. Playing → strategizing.
 *
 * The 561 shelf chrome (mark + footer line) is vendored from `./chrome.mts` and spliced into
 * this template at three points: the shared CSS before `</style>`, the mark next to the page
 * title, and the "part of the 561 shelf" line before `</body>` — see chrome.mts's own header
 * for the provenance note and the dark-only-theme override it carries.
 *
 * The inner script avoids template literals and `${…}` so the whole document can be one outer
 * template string without escaping gymnastics.
 */
import { SHELF_CHROME_CSS, SHELF_MARK_SVG, SHELF_FOOTER_LINE } from "./chrome.mts";

export const CLIENT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>the Gnaw — flickering</title>
<style>
  :root{
    --bg:#0b0a0d; --panel:#15131a; --panel2:#1d1a24; --ink:#e8e2d8; --dim:#9a9189;
    --ember:#ff7a2f; --ember2:#ffb061; --echo:#7fd3ff; --good:#7fe0a6; --bad:#ff6b6b; --line:#2a2632;
  }
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#1a1620,#0b0a0d);color:var(--ink);
       font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  a{color:var(--ember2)}
  header{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;align-items:baseline;padding:.7rem 1rem;border-bottom:1px solid var(--line);
         background:linear-gradient(#1a1620,#0b0a0d);position:sticky;top:0;z-index:5}
  header h1{font-size:1rem;margin:0;color:var(--ember);letter-spacing:.06em}
  header .stat{color:var(--dim)} header .stat b{color:var(--ink)}
  header .echo b{color:var(--echo)}
  .boost{color:var(--ember2)}
  main{display:grid;grid-template-columns:1fr 360px;gap:1rem;max-width:1100px;margin:0 auto;padding:1rem}
  @media(max-width:860px){main{grid-template-columns:1fr}}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:.85rem 1rem;margin-bottom:1rem}
  .panel h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;color:var(--dim);margin:0 0 .6rem}
  .hidden{display:none}
  .floor{font-size:1.05rem;color:var(--ember2);margin:.1rem 0 .3rem}
  .blurb{color:var(--dim);font-size:.86rem;margin:.15rem 0 .5rem}
  .bar{height:14px;border-radius:7px;background:#241f2b;overflow:hidden;border:1px solid var(--line);margin:.25rem 0 .6rem}
  .bar > span{display:block;height:100%;transition:width .25s ease}
  .bar.hp > span{background:linear-gradient(90deg,#3a8f5e,#7fe0a6)}
  .bar.foe > span{background:linear-gradient(90deg,#8f3a3a,#ff6b6b)}
  .actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.4rem}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--line);border-radius:8px;
         padding:.5rem .8rem;cursor:pointer}
  button:hover:not(:disabled){border-color:var(--ember)}
  button:disabled{opacity:.4;cursor:not-allowed}
  button.primary{background:linear-gradient(#c4561e,#8f3a12);border-color:var(--ember);color:#fff;font-weight:600}
  button.big{font-size:1.1rem;padding:.8rem 1.4rem}
  .row{display:flex;justify-content:space-between;align-items:center;gap:.6rem;padding:.45rem 0;border-top:1px solid var(--line)}
  .row:first-child{border-top:0}
  .row .nm{font-weight:600}.row .meta{color:var(--dim);font-size:.82rem}
  .cost{color:var(--ember2)} .cost.echo{color:var(--echo)} .owned{color:var(--good)}
  #log{height:220px;overflow:auto;background:#0f0d12;border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;font-size:.86rem}
  #log div{padding:.08rem 0;border-bottom:1px solid #16131b;color:var(--dim)}
  #log div:last-child{color:var(--ink)}
  textarea{width:100%;min-height:140px;background:#0f0d12;color:var(--echo);border:1px solid var(--line);border-radius:8px;
           padding:.6rem;font:13px/1.45 ui-monospace,monospace;resize:vertical}
  .small{font-size:.8rem;color:var(--dim)}
  .ed-msg{min-height:1.2em;font-size:.82rem}
  input[type=text],input[type=password]{background:#0f0d12;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:.45rem .6rem;font:inherit}
  .tag{display:inline-block;font-size:.7rem;color:var(--dim);border:1px solid var(--line);border-radius:6px;padding:.05rem .4rem;margin-left:.3rem}
  .me{color:var(--ember)}
${SHELF_CHROME_CSS}
</style>
</head>
<body>
<header>
  ${SHELF_MARK_SVG}
  <h1>the Gnaw</h1>
  <span class="stat">essence <b id="h-essence">0</b> <span id="h-eps" class="small"></span></span>
  <span class="stat echo">echoes <b id="h-echoes">0</b></span>
  <span class="stat">deepest <b id="h-fame">0</b></span>
  <span class="stat">rekindled <b id="h-prestige">0</b>×</span>
  <span class="boost" id="h-boost"></span>
  <span class="stat" style="margin-left:auto" id="h-who"></span>
</header>
<main>
  <section>
    <div class="panel" id="p-descent">
      <h2>The Descent</h2>
      <div id="d-where"></div>
      <div id="d-foe"></div>
      <div class="small">your light</div>
      <div class="bar hp"><span id="d-hp" style="width:100%"></span></div>
      <div class="actions" id="d-actions"></div>
    </div>

    <div class="panel hidden" id="p-shop">
      <h2>Expedition</h2>
      <div id="shop-list"></div>
    </div>

    <div class="panel hidden" id="p-gear">
      <h2>Arm the Delver</h2>
      <p class="small">Pour essence into the delver to reach deeper. Attack <b id="g-atk">4</b> · health <b id="g-hp">20</b>.</p>
      <div id="combat-list"></div>
      <h2 style="margin-top:.8rem">Lasting Gear</h2>
      <div id="gear-list"></div>
    </div>

    <div class="panel hidden" id="p-auto">
      <h2>Standing Orders</h2>
      <p class="small">Each order the expedition learns acts on its own — and folds its button out of your hands.</p>
      <div id="auto-list"></div>
    </div>

    <div class="panel hidden" id="p-strategy">
      <h2>Strategy — the cave's own tongue</h2>
      <p class="small">This is the program the tick runs for you each turn. It reads your cells and decides one action. Edit it, or leave it to your standing orders. Actions: <span class="me">attack descend retreat rekindle buy wait</span>.</p>
      <textarea id="strat" spellcheck="false" aria-label="strategy program"></textarea>
      <div class="actions">
        <button id="strat-save">Set orders</button>
        <button id="strat-reset">Reset to standing orders</button>
        <span class="small">patience <input type="text" id="patience" size="4" inputmode="numeric"> ticks</span>
      </div>
      <div class="ed-msg" id="strat-msg"></div>
    </div>

    <div class="panel hidden" id="p-rekindle">
      <h2>Rekindle</h2>
      <p class="blurb" id="rk-blurb"></p>
      <button id="rk-btn" class="primary">Rekindle the flame</button>
    </div>
  </section>

  <aside>
    <div class="panel">
      <h2>Field Log</h2>
      <div id="log" aria-live="polite"></div>
    </div>

    <div class="panel" id="p-account">
      <h2>Carry On (account)</h2>
      <p class="small">You're playing as a guest; your progress is saved on this device. Claim a name to carry it anywhere.</p>
      <div class="actions">
        <input type="text" id="acc-name" placeholder="a name" autocomplete="username" size="12">
        <input type="password" id="acc-secret" placeholder="a secret word" autocomplete="current-password" size="12">
        <button id="acc-login">Claim / sign in</button>
      </div>
      <div class="ed-msg" id="acc-msg"></div>
    </div>

    <div class="panel" id="p-store">
      <h2>The Trading Post</h2>
      <p class="small">Optional. Time and convenience, never power. Providers: <span id="store-providers"></span></p>
      <div id="store-list"></div>
      <div class="ed-msg" id="store-msg"></div>
    </div>
  </aside>
</main>
<script>
"use strict";
var token=null, guestKey=null, es=null, sigs={};
function el(id){return document.getElementById(id)}
function api(path, body, tok){
  var headers={"content-type":"application/json"};
  if(tok) headers["authorization"]="Bearer "+tok;
  return fetch(path,{method:"POST",headers:headers,body:JSON.stringify(body||{})}).then(function(r){
    return r.json().catch(function(){ return r.ok ? {} : {error:(path.indexOf("session")>=0?"wrong name or secret":"request failed")}; });
  });
}
function send(line){ if(token) api("input",{token:token,line:line}); }
function fmt(n){
  if(!isFinite(n)) return "\\u221e";
  var x=Math.abs(n), s=n<0?"-":"";
  if(x<1000) return s+(Number.isInteger(x)?x:x.toFixed(1));
  var suf=["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"], t=Math.floor(Math.log10(x)/3);
  if(t<suf.length) return s+(x/Math.pow(10,t*3)).toFixed(2)+suf[t];
  return s+x.toExponential(2);
}
function guest(){
  guestKey=localStorage.getItem("flickering-guest");
  if(!guestKey){ guestKey=(Date.now().toString(36)+Math.random().toString(36).slice(2,10)); localStorage.setItem("flickering-guest",guestKey); }
  return "guest-"+guestKey;
}
function connect(name, secret){
  return api("session",{name:name,secret:secret,guest:name.indexOf("guest-")===0}).then(function(j){
    if(j.error||!j.token){ return Promise.reject(j.error||"login failed"); }
    token=j.token; openStream(); return j;
  });
}
function openStream(){
  if(es) es.close();
  es=new EventSource("stream?token="+encodeURIComponent(token));
  es.addEventListener("out",function(ev){ logLine(JSON.parse(ev.data)); });
  es.addEventListener("state",function(ev){ render(JSON.parse(ev.data)); });
}
function logLine(text){
  var box=el("log"); var d=document.createElement("div"); d.textContent=text; box.appendChild(d);
  while(box.children.length>120) box.removeChild(box.firstChild);
  box.scrollTop=box.scrollHeight;
}

// ── rendering ──────────────────────────────────────────────────────────────
function show(id,on){ el(id).classList.toggle("hidden",!on); }
function setText(id,t){ var e=el(id); if(e.textContent!==t) e.textContent=t; }

function render(s){
  setText("h-essence",fmt(s.essence));
  setText("h-eps", s.essencePerSec>0 ? "(+"+fmt(s.essencePerSec)+"/s)" : "");
  setText("h-echoes",fmt(s.echoes));
  setText("h-fame",String(s.fameDepth));
  setText("h-prestige",String(s.prestigeCount));
  setText("h-boost", s.boostSecondsLeft>0 ? ("\\u2756 boost \\u00d7"+s.boostMult+" "+Math.ceil(s.boostSecondsLeft/60)+"m") : "");
  setText("h-who", s.actor.indexOf("guest-")===0 ? "guest" : ("\\u2756 "+s.actor.replace(/^delver-/,"")));

  // descent
  if(s.onSurface){
    setText("d-where","You stand at the mouth of the Gnaw, wild country at your back.");
    el("d-foe").innerHTML="";
  } else if(s.floor){
    el("d-where").innerHTML='<div class="floor">'+esc(s.floor.name)+'</div>'+
      '<div class="blurb">'+esc(s.floor.monster)+(s.floor.hazard?(" \\u2014 "+esc(s.floor.hazard)):"")+(s.floor.trickster?(' <span class="tag">'+esc(s.floor.trickster)+'</span>'):"")+'</div>';
    var pct=s.floor.monsterMaxHp>0?Math.max(0,Math.round(100*s.floor.monsterHp/s.floor.monsterMaxHp)):0;
    el("d-foe").innerHTML='<div class="small">'+(s.floor.monsterHp>0?"the foe":"cleared")+'</div><div class="bar foe"><span style="width:'+pct+'%"></span></div>';
  }
  el("d-hp").style.width=Math.max(0,Math.round(100*s.hp/s.maxHp))+"%";
  renderActions(s);

  // shop / gear / automation / strategy / rekindle visibility
  var rev={}; s.revealed.forEach(function(r){rev[r]=true;});
  show("p-shop",rev.shop); show("p-gear",rev.shop); show("p-auto",rev.automation);
  show("p-strategy",rev.strategy); show("p-rekindle",rev.rekindle);

  renderList("shop-list","shop",s.generators,function(g){
    var aff=s.essence>=g.cost;
    return row(g.name,"owned "+g.owned+" \\u00b7 "+esc(g.blurb),
      btn("buy:"+g.id, "hire \\u00b7 "+fmt(g.cost), !aff, "buy "+g.id));
  });
  setText("g-atk",String(s.atk)); setText("g-hp",String(s.maxHp));
  renderList("combat-list","combat",s.combat,function(c){
    return row(c.name+" \\u00d7"+c.owned,(c.atk?("+"+c.atk+" atk"):("+"+c.maxHp+" hp"))+" \\u00b7 "+esc(c.blurb),
      btn("buy:"+c.id, "buy \\u00b7 "+fmt(c.cost), !c.affordable, "buy "+c.id));
  });
  renderList("gear-list","gear",s.upgrades,function(u){
    if(u.owned) return row(u.name,esc(u.blurb),'<span class="owned">owned</span>');
    return row(u.name,esc(u.blurb),
      btn("buy:"+u.id, fmt(u.cost)+" "+(u.currency==="echoes"?"echoes":"essence"), !u.affordable, "buy "+u.id, u.currency));
  });
  renderList("auto-list","auto",s.automations,function(a){
    if(a.owned) return row(a.name,"folds away: "+a.replaces+" \\u00b7 "+esc(a.blurb),'<span class="owned">learned</span>');
    return row(a.name,"replaces: "+a.replaces+" \\u00b7 "+esc(a.blurb),
      btn("auto:"+a.id, fmt(a.cost)+" "+(a.currency==="echoes"?"echoes":"essence"), !a.affordable, "automate "+a.id, a.currency));
  });

  // strategy editor — don't stomp the box while it's focused
  var ta=el("strat");
  if(document.activeElement!==ta) ta.value=s.strategy;
  var pi=el("patience"); if(document.activeElement!==pi) pi.value=String(s.patience);

  // rekindle
  el("rk-blurb").textContent = s.canRekindle
    ? ("The flame would rise again for +"+s.rekindleReward+" echo"+(s.rekindleReward===1?"":"es")+". Run state burns; echoes, fame, and standing orders endure.")
    : "Reach depth 8 to rekindle. The deeper you fall, the brighter you return.";
  el("rk-btn").disabled=!s.canRekindle;
}

function renderActions(s){
  var owned={}; s.automations.forEach(function(a){ if(a.owned) owned[a.id]=true; });
  var box=el("d-actions"); var html="";
  if(s.fullyAutonomous){
    // The endgame: one button. Playing is now strategizing.
    html=btn("auto-toggle", s.auto?"\\u23f8 Pause the descent":"\\u25b6 Delve", false, s.auto?"auto off":"auto on", "", "primary big");
  } else if(s.onSurface){
    html=btn("delve","\\u25b6 Delve into the Gnaw",false,"delve","","primary big");
  } else {
    if(!owned["auto-attack"]) html+=btn("attack","\\u2694 Attack", s.floor&&s.floor.monsterHp<=0, "attack","","primary");
    if(!owned["auto-descend"]) html+=btn("descend","\\u2193 Descend", !(s.floor&&s.floor.monsterHp<=0), "descend");
    if(!owned["auto-retreat"]) html+=btn("retreat","\\u2191 Retreat", false, "retreat");
  }
  // an auto toggle is available once any order exists (and not already the single endgame button)
  if(!s.fullyAutonomous && s.revealed.indexOf("automation")>=0)
    html+=btn("auto-t2", s.auto?"orders: on":"orders: off", false, s.auto?"auto off":"auto on");
  box.innerHTML=html;
}

function esc(t){ return String(t).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];}); }
function btn(key,label,disabled,cmd,currency,cls){
  return '<button data-cmd="'+esc(cmd)+'" class="'+(cls||"")+'"'+(disabled?" disabled":"")+'>'+label+'</button>';
}
function row(name,meta,right){
  return '<div class="row"><div><div class="nm">'+esc(name)+'</div><div class="meta">'+meta+'</div></div><div>'+right+'</div></div>';
}
function renderList(id,sig,items,fn){
  var key=JSON.stringify(items.map(function(i){return [i.id,i.owned,i.affordable,i.cost,i.owned].join(",");}));
  if(sigs[sig]===key) { return; } // structure unchanged — skip rebuild (keeps it smooth)
  sigs[sig]=key;
  el(id).innerHTML=items.map(fn).join("");
}

// delegated clicks for all command buttons
document.addEventListener("click",function(e){
  var b=e.target.closest("button[data-cmd]");
  if(b){ send(b.getAttribute("data-cmd")); }
});

// strategy editor
el("strat-save").addEventListener("click",function(){
  var v=el("strat").value.trim();
  send("strategy "+v);
  el("strat-msg").textContent="Orders set. The tick will obey on its next turn.";
});
el("strat-reset").addEventListener("click",function(){ send("strategy clear"); el("strat-msg").textContent="Back to your standing orders."; });
el("patience").addEventListener("change",function(){ var n=parseInt(el("patience").value,10); if(n>0) send("patience "+n); });

// account claim / sign-in
el("acc-login").addEventListener("click",function(){
  var name=el("acc-name").value.trim(), secret=el("acc-secret").value;
  if(!name||!secret){ el("acc-msg").textContent="Pick a name and a secret word."; return; }
  api("session",{name:name,secret:secret}).then(function(j){
    if(j.error||!j.token){ el("acc-msg").textContent=(j.error||"could not sign in"); return; }
    var newTok=j.token;
    // claim the guest progress into the account, then switch over
    api("claim",{guestKey:guestKey},newTok).then(function(c){
      token=newTok; openStream();
      el("acc-msg").textContent=(c.migrated?"Carried your run into ":"Signed in as ")+name+".";
    });
  });
});

// store
function loadStore(){
  fetch("store").then(function(r){return r.json()}).then(function(d){
    el("store-providers").textContent=d.providers.map(function(p){return p.id+(p.configured?"":"(off)");}).join(", ");
    el("store-list").innerHTML=d.skus.map(function(s){
      return row(s.name, esc(s.blurb)+" \\u00b7 $"+s.priceUsd+" / "+s.priceHive+" HIVE",
        '<button data-sku="'+esc(s.id)+'">buy</button>');
    }).join("");
  });
}
document.addEventListener("click",function(e){
  var b=e.target.closest("button[data-sku]"); if(!b) return;
  var sku=b.getAttribute("data-sku");
  api("pay/intent",{sku:sku},token).then(function(intent){
    if(intent.error){ el("store-msg").textContent=intent.error; return; }
    var ins=intent.instructions||{};
    if(ins.kind==="stripe"){ el("store-msg").textContent="Stripe intent created (client_secret issued). Confirms via webhook."; return; }
    if(ins.kind==="hive"){ el("store-msg").textContent="Send "+ins.amount+" to @"+ins.to+" with memo "+ins.memo+", then press buy again to confirm."; }
    // mock + hive: try to settle (mock clears instantly; hive confirms once the transfer lands)
    api("pay/settle",{orderId:intent.orderId},token).then(function(r){
      el("store-msg").textContent=r.cleared?"Cleared \\u2014 boost granted. Light it up.":"Not cleared yet.";
    });
  });
});

// boot
connect(guest()).then(function(){ loadStore(); }).catch(function(err){ logLine("could not reach the Gnaw: "+err); });
</script>
${SHELF_FOOTER_LINE}
</body>
</html>`;
