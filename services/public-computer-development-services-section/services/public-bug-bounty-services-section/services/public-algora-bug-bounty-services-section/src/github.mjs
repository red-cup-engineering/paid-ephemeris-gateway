import { Bounty, parseAttempts, parseReward } from "./bounty.mjs";

const DEFAULT_QUERY = 'label:"💎 Bounty" state:open';

function apiUrl(path) { return new URL(path, "https://api.github.com").toString(); }
function repositoryFromUrl(url) { return /\/repos\/([^/]+\/[^/]+)$/.exec(url ?? "")?.[1] ?? null; }

async function getJson(fetchImpl, path, token) {
  const response = await fetchImpl(apiUrl(path), { headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}) for ${path}`);
  return response.json();
}

export function findAlgoraComment(comments) {
  return comments.find((comment) => /algora/i.test(comment.user?.login ?? "") && /💎/.test(comment.body ?? ""))?.body ?? null;
}

/** Read current bounty facts from GitHub. This does not write, claim, or post anything. */
export async function listBounties({ query = DEFAULT_QUERY, limit = 20, token, fetchImpl = fetch, observedAt } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("limit must be an integer from 1 to 100");
  const search = await getJson(fetchImpl, `/search/issues?q=${encodeURIComponent(query)}&per_page=${limit}`, token);
  const bounties = [];
  for (const issue of search.items ?? []) {
    const repository = repositoryFromUrl(issue.repository_url);
    if (!repository) continue;
    const comments = await getJson(fetchImpl, `/repos/${repository}/issues/${issue.number}/comments`, token);
    const comment = findAlgoraComment(comments);
    const rewardUsd = parseReward(comment);
    if (comment && rewardUsd !== null) {
      bounties.push(new Bounty({ repository, issueNumber: issue.number, title: issue.title, url: issue.html_url, rewardUsd, attempts: parseAttempts(comment), observedAt }));
    }
  }
  return bounties;
}
