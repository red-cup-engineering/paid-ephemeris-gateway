// Opportunity-observation die. Discovers real open Algora bounties.
//
// Verified surface (2026-07-18): the algora.io/bounties route is dead and the read API
// returns empty; the working discovery path is GitHub issue-search for the "💎 Bounty"
// label, then reading each issue's algora-pbc[bot] comment for reward + the attempts table.
// The hired GitHub provider owns transport credentials. Injectable provider instances keep
// this observer deterministic without allowing credentials across its membrane.
import { rewardFromBody } from "./parse-bounty-comment.mjs";
import { githubApi } from "@red-cup-engineering/github-services-section";

const DEFAULT_QUERY = 'label:"💎 Bounty" state:open';

function repoFromApiUrl(repositoryUrl) {
  const m = /\/repos\/(.+)$/.exec(repositoryUrl || "");
  return m ? m[1] : null;
}

export async function searchBountyIssues({
  query = DEFAULT_QUERY,
  perPage = 30,
  page = 1,
  fetchImpl = fetch,
  api = githubApi({ fetchImpl }),
} = {}) {
  const data = await api.searchIssues({ query, perPage, page });
  return (data.items || []).map((it) => ({
    repo: repoFromApiUrl(it.repository_url),
    issueNumber: it.number,
    title: it.title,
    url: it.html_url,
    labels: (it.labels || []).map((l) => l.name),
  }));
}

// Identify the Algora bot's bounty comment among an issue's comments.
export function findBotComment(comments) {
  for (const c of comments || []) {
    const login = c.user?.login || "";
    const body = c.body || "";
    const isBot = /algora/i.test(login) || /\*\*algora-pbc\[bot\]\*\*/i.test(body);
    const looksLikeBounty = /💎/.test(body) && /attempt|<t(able|body|r)\b/i.test(body);
    if (isBot && looksLikeBounty) return body;
  }
  return null;
}

export async function fetchIssueBotComment({
  repo,
  issueNumber,
  fetchImpl = fetch,
  api = githubApi({ fetchImpl }),
}) {
  const comments = await api.getIssueComments(repo, issueNumber);
  const body = findBotComment(comments);
  return body ? { commentMarkdown: body, rewardFormatted: rewardFromBody(body) } : null;
}

// Discover up to `limit` live candidates ready for parseBountyCandidate. Skips issues with
// no readable bot comment. `onSkip` reports what was dropped (no silent truncation).
export async function discoverCandidates({
  query = DEFAULT_QUERY,
  limit = 20,
  fetchImpl = fetch,
  api = githubApi({ fetchImpl }),
  onSkip = () => {},
} = {}) {
  const issues = await searchBountyIssues({ query, perPage: limit, api });
  const candidates = [];
  for (const issue of issues) {
    if (!issue.repo) { onSkip(issue, "no repo"); continue; }
    let botComment;
    try {
      botComment = await fetchIssueBotComment({ repo: issue.repo, issueNumber: issue.issueNumber, api });
    } catch (err) {
      onSkip(issue, err.message);
      continue;
    }
    if (!botComment) { onSkip(issue, "no algora bot comment"); continue; }
    candidates.push({
      commentMarkdown: botComment.commentMarkdown,
      meta: {
        repo: issue.repo,
        issueNumber: issue.issueNumber,
        title: issue.title,
        url: issue.url,
        rewardFormatted: botComment.rewardFormatted,
      },
    });
  }
  return candidates;
}
