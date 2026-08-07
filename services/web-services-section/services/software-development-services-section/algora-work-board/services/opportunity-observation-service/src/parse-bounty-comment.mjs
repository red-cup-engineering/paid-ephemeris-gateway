// Opportunity-observation die. Parse the Algora bot's issue comment — the authoritative
// competition surface — plus issue metadata, into a normalized candidate.
//
// The REAL bot comment (verified 2026 against live github.com issues) uses an HTML table:
//   ## 💎 $250 bounty [• Org](...)
//   ...
//   <table><thead><tr><th>Attempt</th><th>Started (GMT+0)</th><th>Solution</th></tr></thead>
//   <tbody><tr><td>🟢 @ alice</td><td>Apr 24, 2024, 3:27:47 PM</td><td>WIP</td></tr>...</tbody></table>
// Status emoji: 🟢 active, 🟡 warned/stale, 🔴 inactive. Handles render as "@ handle"
// (GitHub injects a space to suppress the mention). We also accept a markdown pipe table.

const STATUS_BY_EMOJI = { "🟢": "active", "🟡": "warned", "🔴": "inactive" };

export function parseRewardFormatted(formatted) {
  if (!formatted) return null;
  const cash = /\$\s*([\d,]+(?:\.\d{2})?)/.exec(String(formatted));
  if (cash) {
    const amount = Number.parseFloat(cash[1].replace(/,/g, ""));
    return { amountUsd: amount, currency: "USD", kind: "cash", formatted: String(formatted).trim() };
  }
  return { amountUsd: 0, currency: null, kind: "point", formatted: String(formatted).trim() };
}

// Pull a "💎 $250 bounty" reward out of a bot-comment body header.
export function rewardFromBody(body) {
  const m = /💎\s*\$\s*([\d,]+(?:\.\d{2})?)/.exec(String(body || ""));
  return m ? `$${m[1]}` : null;
}

function stripTags(html) {
  return String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseHandles(cell) {
  const handles = [];
  // Accept "@handle" and "@ handle" (GitHub's space-injected form).
  const re = /@\s*([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/g;
  let m;
  while ((m = re.exec(cell))) handles.push(m[1]);
  return handles;
}

function parseEmoji(cell) {
  for (const [emoji, status] of Object.entries(STATUS_BY_EMOJI)) {
    if (cell.includes(emoji)) return status;
  }
  return "unknown";
}

function firstUrl(rawCell) {
  // Look at raw HTML so we catch href="https://...".
  const m = /(https?:\/\/[^\s"'|)\]<>]+)/.exec(rawCell);
  return m ? m[1] : null;
}

// Extract [attemptCell, startedCell, solutionCell] rows from an HTML <table>.
function htmlTableRows(body) {
  const text = String(body || "");
  const tbody = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(text);
  const scope = tbody ? tbody[1] : text;
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(scope))) {
    const cells = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let td;
    while ((td = tdRe.exec(tr[1]))) cells.push(td[1]);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

// Extract rows from a markdown pipe table.
function markdownTableRows(body) {
  const rows = [];
  let inTable = false;
  for (const line of String(body || "").split("\n")) {
    if (!line.trim().startsWith("|")) { if (inTable && line.trim() === "") inTable = false; continue; }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    if (/^attempt$/i.test(cells[0])) { inTable = true; continue; }
    if (/^:?-+:?$/.test(cells[0])) continue;
    if (inTable) rows.push(cells);
  }
  return rows;
}

export function parseAttempts(body) {
  const hasHtml = /<t(able|body|r)\b/i.test(String(body || ""));
  const rows = hasHtml ? htmlTableRows(body) : markdownTableRows(body);
  const attempts = [];
  for (const cells of rows) {
    const attemptCell = stripTags(cells[0] || "");
    if (/^attempt$/i.test(attemptCell)) continue; // header row (HTML thead can share tbody)
    const who = parseHandles(attemptCell);
    const status = parseEmoji(attemptCell);
    if (who.length === 0 && status === "unknown") continue;
    attempts.push({
      who,
      status,
      startedRaw: stripTags(cells[1] || "") || null,
      pr: firstUrl(cells[2] || ""),
    });
  }
  return attempts;
}

// Build a normalized candidate. `meta`: { repo, issueNumber, title, url, body?,
// rewardFormatted, autopay? }. `observedAt` (ISO 8601) is passed in — no hidden clock.
export function parseBountyCandidate({ commentMarkdown, meta, observedAt }) {
  if (!meta || !meta.repo || meta.issueNumber == null) {
    throw new Error("parseBountyCandidate: meta.repo and meta.issueNumber are required");
  }
  if (!observedAt) throw new Error("parseBountyCandidate: observedAt is required");
  const rewardFormatted = meta.rewardFormatted ?? rewardFromBody(commentMarkdown);
  const attempts = parseAttempts(commentMarkdown);
  const competition = {
    total: attempts.length,
    active: attempts.filter((a) => a.status === "active").length,
    warned: attempts.filter((a) => a.status === "warned").length,
    inactive: attempts.filter((a) => a.status === "inactive").length,
  };
  return {
    source: "algora",
    repo: meta.repo,
    issueNumber: meta.issueNumber,
    title: meta.title ?? null,
    url: meta.url ?? `https://github.com/${meta.repo}/issues/${meta.issueNumber}`,
    body: meta.body ?? null,
    reward: parseRewardFormatted(rewardFormatted),
    autopay: typeof meta.autopay === "boolean" ? meta.autopay : null,
    attempts,
    competition,
    observedAt,
  };
}
