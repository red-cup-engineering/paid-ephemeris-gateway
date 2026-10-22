// Public ActivityPub/A2A boundary for the sandbox-execution die.  It can only
// dispatch a bounded patch to the named disposable GitHub Actions carrier.
// It never imports the local executor and never reads host process state.
const ACTOR = "urn:ame:software-sandbox-execution-service";
const OPERATION = "execute-software-in-sandbox";
const ACCOUNT = "eip155:31337:0xe584349271546267d4775ef54a4f993662933c83";

function json(body, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(body), {status, headers: {"content-type": contentType, "access-control-allow-origin": "*", "cache-control": "no-store"}});
}

function refusal(reason, status = 400) {
  return json({type: "SoftwareSandboxExecutionRefusal", actor: ACTOR, operation: OPERATION, reason}, status);
}

function configured(env) {
  return typeof env?.GITHUB_RUNNER_REPO === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(env.GITHUB_RUNNER_REPO)
    && typeof env?.GITHUB_ACTIONS_TOKEN === "string" && env.GITHUB_ACTIONS_TOKEN.length > 0;
}

function offer(origin) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams", type: "Offer", id: `${origin}/offers/current`, actor: ACTOR,
    object: {type: "Service", operation: OPERATION, action: `${origin}/invoke`, carrier: "github-actions-disposable-runner"},
    price: {protocol: "x402", asset: "USD", amount: "0", network: "eip155:31337", payTo: ACCOUNT},
  };
}

function validInvocation(input) {
  if (!input || input.operation !== OPERATION) return "operation must be execute-software-in-sandbox";
  if (typeof input.repo !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(input.repo)) return "repo must be an owner/repository identifier";
  if (typeof input.patch !== "string" || input.patch.trim().length === 0 || input.patch.length > 1024 * 1024) return "patch must be a nonempty unified diff of at most 1 MiB";
  return null;
}

async function github(fetchImpl, token, path, init = {}) {
  const response = await fetchImpl(`https://api.github.com${path}`, {
    ...init,
    headers: {accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", ...(init.headers || {})},
  });
  if (!response.ok) throw new Error(`github ${init.method || "GET"} ${path} returned ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export function createSandboxActuator({fetchImpl = fetch, uuid = () => crypto.randomUUID()} = {}) {
  return async function fetch(request, env = {}) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ok: true, actor: ACTOR, account: ACCOUNT, operation: OPERATION, configured: configured(env)});
    if (request.method === "GET" && url.pathname === "/actor") return json({"@context": "https://www.w3.org/ns/activitystreams", id: ACTOR, type: "Service", inbox: `${url.origin}/inbox`, outbox: `${url.origin}/outbox`}, 200, "application/activity+json");
    if (request.method === "GET" && url.pathname === "/outbox") return json({"@context": "https://www.w3.org/ns/activitystreams", type: "OrderedCollection", totalItems: 1, orderedItems: [offer(url.origin)]}, 200, "application/activity+json");
    if (request.method === "GET" && url.pathname === "/offers/current") return json(offer(url.origin), 200, "application/activity+json");
    if (request.method !== "POST" || (url.pathname !== "/invoke" && url.pathname !== "/inbox")) return refusal("not-found", 404);
    if (!configured(env)) return refusal("remote-runner-authority-unconfigured: bind GITHUB_RUNNER_REPO and secret GITHUB_ACTIONS_TOKEN at deployment", 503);
    let input;
    try { input = await request.json(); } catch { return refusal("request body must be JSON"); }
    const invalid = validInvocation(input);
    if (invalid) return refusal(invalid);
    const correlationId = uuid();
    try {
      const gist = await github(fetchImpl, env.GITHUB_ACTIONS_TOKEN, "/gists", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({public: false, description: `sandbox patch ${correlationId}`, files: {"patch.diff": {content: input.patch}}})});
      const patchUrl = gist?.files?.["patch.diff"]?.raw_url;
      if (!gist?.id || !patchUrl) throw new Error("github gist response lacked patch authority");
      try {
        await github(fetchImpl, env.GITHUB_ACTIONS_TOKEN, `/repos/${env.GITHUB_RUNNER_REPO}/actions/workflows/${encodeURIComponent(env.GITHUB_RUNNER_WORKFLOW || "solve-and-test.yml")}/dispatches`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({ref: env.GITHUB_RUNNER_REF || "main", inputs: {target_repo: input.repo, target_ref: input.ref || "", patch_url: patchUrl, correlation_id: correlationId}})});
      } catch (error) {
        await github(fetchImpl, env.GITHUB_ACTIONS_TOKEN, `/gists/${gist.id}`, {method: "DELETE"}).catch(() => {});
        throw error;
      }
      return json({type: "SoftwareSandboxExecutionDispatchReceipt", actor: ACTOR, operation: OPERATION, disposition: "dispatched", correlationId, carrier: {type: "GitHubActionsDisposableRunner", repository: env.GITHUB_RUNNER_REPO, workflow: env.GITHUB_RUNNER_WORKFLOW || "solve-and-test.yml"}} , 202);
    } catch (error) { return refusal(error?.message || String(error), 502); }
  };
}

export default {fetch: createSandboxActuator()};
