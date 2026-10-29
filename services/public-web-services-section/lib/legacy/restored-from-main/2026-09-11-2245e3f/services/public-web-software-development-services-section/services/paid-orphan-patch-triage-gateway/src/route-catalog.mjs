import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

/**
 * Route identity, price, and Bazaar-discovery schema shared by every
 * transport this gateway runs on (the Express/Cloud Run `server.mjs` and
 * the Fetch/Cloudflare-Workers `worker.mjs`), so the two entrypoints never
 * carry two copies of the same product declaration.
 */
export const ORPHAN_PATCH_SCORE_PRICE = "$0.02";
export const ORPHAN_PATCH_SCORE_ROUTE = "/v1/orphan-patch/score";
export const STATUS_ROUTE = "/v1/status";

const harvestInputSchema = {
  type: "object",
  required: ["advisories", "maintenance", "dependents"],
  properties: {
    advisories: {
      type: "array",
      description: "{id, package, ecosystem, severity, published, fixedVersion} rows; fixedVersion is null when no fix is known.",
    },
    maintenance: {
      type: "array",
      description: "{package, ecosystem, lastReleaseDaysAgo, openIssueResponseDaysMedian} rows; openIssueResponseDaysMedian is null when no issue response was ever recorded.",
    },
    dependents: {
      type: "array",
      description: "{package, ecosystem, dependentCount} rows.",
    },
  },
};

export const orphanPatchScoreDiscovery = declareDiscoveryExtension({
  input: {
    advisories: [{
      id: "GHSA-2026-0001",
      package: "left-pad-example",
      ecosystem: "npm",
      severity: "high",
      published: "2026-01-15T00:00:00Z",
      fixedVersion: null,
    }],
    maintenance: [{
      package: "left-pad-example",
      ecosystem: "npm",
      lastReleaseDaysAgo: 900,
      openIssueResponseDaysMedian: null,
    }],
    dependents: [{ package: "left-pad-example", ecosystem: "npm", dependentCount: 4200 }],
  },
  inputSchema: harvestInputSchema,
  output: {
    schema: {
      type: "object",
      required: ["candidates"],
      properties: {
        candidates: {
          type: "array",
          items: {
            type: "object",
            required: ["package", "ecosystem", "score", "reasons", "advisoryIds"],
            properties: {
              package: { type: "string" },
              ecosystem: { type: "string" },
              score: { type: "number" },
              reasons: { type: "array", items: { type: "string" } },
              advisoryIds: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    example: {
      candidates: [{
        package: "left-pad-example",
        ecosystem: "npm",
        score: 62.5,
        reasons: [
          "unpatched high advisory GHSA-2026-0001 (published 2026-01-15T00:00:00Z)",
          "last release 900 days ago",
          "no issue response recorded",
          "4200 known dependents",
        ],
        advisoryIds: ["GHSA-2026-0001"],
      }],
    },
  },
});
