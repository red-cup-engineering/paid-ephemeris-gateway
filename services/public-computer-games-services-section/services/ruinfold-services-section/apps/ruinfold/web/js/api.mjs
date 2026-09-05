// api.mjs — thin fetch wrappers around server.mts's routes. No caching, no retries: every export
// returns the parsed JSON body or throws (with `.status`/`.body` attached) so callers just `await`
// and `catch`. This file adds no logic of its own beyond "build the URL, send the request."

async function request(path, init) {
  const res = await fetch(path, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message = (body && (body.rejected || body.error)) || `request failed: ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function getDaily(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return request(`/daily${q}`);
}

// submitRun — `moves` is the exact `{tick,seq,intent}[]` shape #engine/run.mts's RunLog expects;
// this function does no shaping of its own beyond the wire envelope. `clientClaimedScore` is
// advisory only (design §2.1) — the server never consults it, it is echoed back only for the
// "your client thought / server says" comparison the UI shows.
export function submitRun({ player, date, seed, mode, moves, clientClaimedScore }) {
  return request("/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player, date, seed, mode, intentLog: moves, clientClaimedScore }),
  });
}

export function getLeaderboard(date) {
  return request(`/leaderboard/${encodeURIComponent(date)}`);
}

export function getReplay(runId) {
  return request(`/replay/${encodeURIComponent(runId)}`);
}

export function getBoons(player) {
  return request(`/boons/${encodeURIComponent(player)}`);
}
