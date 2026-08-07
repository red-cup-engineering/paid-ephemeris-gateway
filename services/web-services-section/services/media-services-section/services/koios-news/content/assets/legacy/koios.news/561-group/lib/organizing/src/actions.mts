/**
 * actions — organizing's registered operations, each a cocone leg over the relating
 * boundary. `induceBins` over this list (in the scripts) assembles the discovery
 * apex from which CLI/OpenAPI/MCP/web are projected by the one relating dispatcher;
 * this package invents no second transport.
 *
 * The surface is the social gluing node: `organize` (the apex: three social faces →
 * the organization), `adjudicate` (the gluing act standalone), `face` (one faculty →
 * local section), `project` (the organization → its three boundary views), and
 * `federate` (the spiral re-seed to the next scale).
 */
import { action, jsonResource, type Action, type JsonRecord, type JsonValue } from "@emsenn/relating";
import { admitSeed, descend, type Agent } from "@emsenn/animating";
import { verificationTournament } from "@emsenn/gaming";
import {
  organize,
  adjudicate,
  socialBecoming,
  relate,
  community,
  institute,
  socialSymmetry,
  socialStance,
  cohesion,
  governance,
  type GovernanceInput,
  socialFactor,
  assemble,
  face,
  project,
  reseed,
  federate,
  type SocialBoundary,
  type OrganizationOptions,
} from "./organizing.mjs";
import {
  admitOfficeEligibilityRequest,
  officeEligibility,
  officeEligibilityTerm,
} from "./authority.mjs";
import {
  accountingInputUtterances,
  admitAccountingInput,
} from "./accounting.mjs";
import {
  accountingBalance,
  admitAccountingTransaction,
} from "./accounting-balance.mjs";
import { accountingInstitutionActions } from "./accounting/institution.mjs";
import { capitalActions } from "./accounting/capital.mjs";
import { commodityActions } from "./accounting/commodity.mjs";
import { exchangeActions } from "./accounting/exchange.mjs";
import { strategyActions } from "./accounting/strategy.mjs";
import { valueActions } from "./accounting/value.mjs";
import {
  directorySubstrateCarrier,
  directorySubstrateResource,
  readDirectorySubstrate,
} from "./substrate/index.mjs";
import {
  JupyterNotebookSchema,
  jupyterNotebookCarrier,
  organizingNotebook,
  type OrganizingNotebookInput,
} from "./jupyter.mjs";
import {
  organizingDefaultJupyterViewArtifacts,
  type OrganizingDefaultJupyterViewsInput,
} from "./default-jupyter-views.mjs";
import { runCells } from "./writing/jupyter/index.mjs";
import { x402Actions } from "./writing/x402/index.mjs";
import type { Organization } from "./schemas.mjs";
import type { AccountingEntry } from "./schemas.mjs";

export { capitalActions, commodityActions, exchangeActions, strategyActions, valueActions };

const ACCOUNTING_ENTRY_ID = "organizing/accounting-entry";
const ACCOUNTING_UTTERANCES_ID = "organizing/accounting-utterances";
const ACCOUNTING_BALANCE_ID = "organizing/accounting-balance";
const OFFICE_ELIGIBILITY_REQUEST_ID = "organizing/office-eligibility-request";
const OFFICE_ELIGIBILITY_DECISION_ID = "organizing/office-eligibility-decision";
const ORGANIZATION_ID = "organizing/organization";
const FACE_ID = "organizing/face";
const SOCIAL_BECOMING_ID = "organizing/social-becoming";
const RELATING_ID = "organizing/relating";
const COMMUNITY_ID = "organizing/community";
const INSTITUTION_ID = "organizing/institution";
const SOCIAL_FACTORIZATION_ID = "organizing/social-factorization";
const ADJUDICATION_ID = "organizing/adjudication";
const FEDERATION_ID = "organizing/federation";
const PROJECTION_ID = "organizing/projection";
const SYMMETRY_ID = "organizing/symmetry";
const STANCE_ID = "organizing/stance";
const GOVERNANCE_ID = "organizing/governance";
const COHESION_ID = "organizing/cohesion";
const DIRECTORY_SUBSTRATE_ID = "organizing/substrate/directory";
const JUPYTER_DEFAULT_VIEW_ARTIFACTS_ID = "organizing/jupyter/default-view-artifacts";
const GAMING_VERIFICATION_TOURNAMENT_ID = "gaming/verification-tournament";

const ref = (id: string): JsonRecord => Object.freeze({ $ref: id });

const SEED_SCHEMA: JsonRecord = Object.freeze({
  title: "SocialSeed",
  description: "an inter-agent membrane: newline-separated `agent|predicate` lines (string wire), or a JSON array of `[agent, predicate]` / `{ subject, predicate }` items.",
  type: ["string", "array"],
});

const SOCIAL_SCHEMA: JsonRecord = Object.freeze({
  title: "SocialBoundary",
  type: "object",
  description: "the three social boundary faces: an inter-agent membrane seed per Gen-2 faculty (socializing across, computing inside, gaming outside); any face may be omitted.",
  properties: { socializing: SEED_SCHEMA, computing: SEED_SCHEMA, gaming: SEED_SCHEMA },
});

const ACCOUNTING_INPUT_SCHEMA: JsonRecord = Object.freeze({
  title: "AccountingInput",
  oneOf: [
    { $ref: ACCOUNTING_ENTRY_ID },
    { type: "array", items: { $ref: ACCOUNTING_ENTRY_ID } },
  ],
});

const JUPYTER_NOTEBOOK_INPUT_SCHEMA: JsonRecord = Object.freeze({
  title: "OrganizingNotebookInput",
  type: "object",
  required: ["id", "title"],
  properties: {
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    summary: { type: "string" },
    metadata: { type: "object", additionalProperties: true },
    cells: { type: "array", items: { type: "object", additionalProperties: true } },
  },
  additionalProperties: true,
});

const JUPYTER_RUN_CELLS_SCHEMA: JsonRecord = Object.freeze({
  title: "OrganizingJupyterRunCells",
  type: "object",
  required: ["id", "title", "cells"],
  properties: {
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    summary: { type: "string" },
    metadata: { type: "object", additionalProperties: true },
    cells: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
});

const JUPYTER_DEFAULT_VIEWS_INPUT_SCHEMA: JsonRecord = Object.freeze({
  title: "OrganizingDefaultJupyterViewsInput",
  type: "object",
  required: ["instance"],
  properties: {
    instance: { type: "string", minLength: 1 },
    exportedAt: { type: "string" },
    witnessRows: { type: "array", items: { type: "object", additionalProperties: true } },
    sessionEvents: { type: "array", items: { type: "object", additionalProperties: true } },
    camps: { type: "array", items: { type: "object", additionalProperties: true } },
    federationReports: { type: "array", items: { type: "object", additionalProperties: true } },
    accountableTransactions: { type: "array", items: { type: "object", additionalProperties: true } },
    accountabilityReports: { type: "array", items: { type: "object", additionalProperties: true } },
    accountableClaims: { type: "array", items: { type: "object", additionalProperties: true } },
    packageMesh: { type: "object", additionalProperties: true },
  },
  additionalProperties: false,
});

const JUPYTER_DEFAULT_VIEW_ARTIFACTS_SCHEMA: JsonRecord = Object.freeze({
  title: "OrganizingDefaultJupyterViewArtifacts",
  type: "object",
  required: ["data", "notebooks"],
  properties: {
    data: { type: "array", items: { type: "object", additionalProperties: true } },
    notebooks: { type: "array", items: { type: "object", additionalProperties: true } },
  },
  additionalProperties: false,
});

/** Admit a social boundary `{ socializing?, computing?, gaming? }` from the json wire. */
function admitBoundary(input: JsonValue, verb: string): SocialBoundary {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a { socializing?, computing?, gaming? } boundary object`);
  }
  const record = input as JsonRecord;
  return {
    ...(record["socializing"] === undefined ? {} : { socializing: record["socializing"] }),
    ...(record["computing"] === undefined ? {} : { computing: record["computing"] }),
    ...(record["gaming"] === undefined ? {} : { gaming: record["gaming"] }),
  };
}

function admitFederationInput(input: JsonValue, verb: string): SocialBoundary | Organization {
  if (input !== null && typeof input === "object" && !Array.isArray(input) && (input as JsonRecord)["kind"] === "organizing.organization") {
    return input as unknown as Organization;
  }
  return admitBoundary(input, verb);
}

/** Admit a governance input `{ preferences?, knowledge?, dominance? }` from the json wire. */
function admitGovernanceInput(input: JsonValue): GovernanceInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("govern: expected a { preferences?, knowledge?, dominance? } object");
  }
  const r = input as JsonRecord;
  return {
    ...(r["preferences"] === undefined ? {} : { preferences: r["preferences"] }),
    ...(r["knowledge"] === undefined ? {} : { knowledge: r["knowledge"] }),
    ...(r["dominance"] === undefined ? {} : { dominance: r["dominance"] }),
  };
}

function optionsFromArgs(args: Record<string, unknown>): OrganizationOptions {
  const identity = typeof args["identity"] === "string" && args["identity"].trim() !== "" ? args["identity"].trim() : undefined;
  return identity === undefined ? {} : { identity };
}

function requireRecord(input: unknown, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input as JsonRecord;
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function requiredNonemptyString(record: JsonRecord, key: string, verb: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: ${key} must be a non-empty string`);
  return value;
}

function optionalJsonRecord(record: JsonRecord, key: string): JsonRecord | undefined {
  const value = record[key];
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function admitOrganizingNotebookInput(input: unknown, verb: string): OrganizingNotebookInput {
  const record = requireRecord(input, verb);
  const cells = record["cells"];
  const summary = optionalString(record, "summary");
  const metadata = optionalJsonRecord(record, "metadata");
  const admitted: {
    id: string;
    title: string;
    summary?: string;
    metadata?: JsonRecord;
    cells?: NonNullable<OrganizingNotebookInput["cells"]>;
  } = {
    id: requiredNonemptyString(record, "id", verb),
    title: requiredNonemptyString(record, "title", verb),
  };
  if (summary !== undefined) admitted.summary = summary;
  if (metadata !== undefined) admitted.metadata = metadata;
  if (Array.isArray(cells)) admitted.cells = cells as NonNullable<OrganizingNotebookInput["cells"]>;
  return admitted;
}

function admitRunCellsInput(input: unknown): Readonly<{
  id: string;
  title: string;
  summary?: string;
  metadata?: JsonRecord;
  cells: readonly string[];
}> {
  const record = requireRecord(input, "jupyter-run-cells");
  const cells = record["cells"];
  if (!Array.isArray(cells) || cells.some((cell) => typeof cell !== "string")) {
    throw new TypeError("jupyter-run-cells: cells must be an array of strings");
  }
  const summary = optionalString(record, "summary");
  const metadata = optionalJsonRecord(record, "metadata");
  const admitted: {
    id: string;
    title: string;
    summary?: string;
    metadata?: JsonRecord;
    cells: readonly string[];
  } = {
    id: requiredNonemptyString(record, "id", "jupyter-run-cells"),
    title: requiredNonemptyString(record, "title", "jupyter-run-cells"),
    cells: Object.freeze([...cells] as readonly string[]),
  };
  if (summary !== undefined) admitted.summary = summary;
  if (metadata !== undefined) admitted.metadata = metadata;
  return Object.freeze(admitted);
}

function admitDefaultViewsInput(input: unknown): OrganizingDefaultJupyterViewsInput {
  const record = requireRecord(input, "jupyter-default-views");
  const exportedAt = optionalString(record, "exportedAt");
  const packageMesh = optionalJsonRecord(record, "packageMesh") as OrganizingDefaultJupyterViewsInput["packageMesh"] | undefined;
  const admitted: {
    instance: string;
    exportedAt?: string;
    witnessRows?: NonNullable<OrganizingDefaultJupyterViewsInput["witnessRows"]>;
    sessionEvents?: NonNullable<OrganizingDefaultJupyterViewsInput["sessionEvents"]>;
    camps?: NonNullable<OrganizingDefaultJupyterViewsInput["camps"]>;
    federationReports?: NonNullable<OrganizingDefaultJupyterViewsInput["federationReports"]>;
    accountableTransactions?: NonNullable<OrganizingDefaultJupyterViewsInput["accountableTransactions"]>;
    accountabilityReports?: NonNullable<OrganizingDefaultJupyterViewsInput["accountabilityReports"]>;
    accountableClaims?: NonNullable<OrganizingDefaultJupyterViewsInput["accountableClaims"]>;
    packageMesh?: NonNullable<OrganizingDefaultJupyterViewsInput["packageMesh"]>;
  } = {
    instance: requiredNonemptyString(record, "instance", "jupyter-default-views"),
  };
  if (exportedAt !== undefined) admitted.exportedAt = exportedAt;
  if (Array.isArray(record["witnessRows"])) admitted.witnessRows = record["witnessRows"] as NonNullable<OrganizingDefaultJupyterViewsInput["witnessRows"]>;
  if (Array.isArray(record["sessionEvents"])) admitted.sessionEvents = record["sessionEvents"] as NonNullable<OrganizingDefaultJupyterViewsInput["sessionEvents"]>;
  if (Array.isArray(record["camps"])) admitted.camps = record["camps"] as NonNullable<OrganizingDefaultJupyterViewsInput["camps"]>;
  if (Array.isArray(record["federationReports"])) admitted.federationReports = record["federationReports"] as NonNullable<OrganizingDefaultJupyterViewsInput["federationReports"]>;
  if (Array.isArray(record["accountableTransactions"])) admitted.accountableTransactions = record["accountableTransactions"] as NonNullable<OrganizingDefaultJupyterViewsInput["accountableTransactions"]>;
  if (Array.isArray(record["accountabilityReports"])) admitted.accountabilityReports = record["accountabilityReports"] as NonNullable<OrganizingDefaultJupyterViewsInput["accountabilityReports"]>;
  if (Array.isArray(record["accountableClaims"])) admitted.accountableClaims = record["accountableClaims"] as NonNullable<OrganizingDefaultJupyterViewsInput["accountableClaims"]>;
  if (packageMesh !== undefined) admitted.packageMesh = packageMesh;
  return admitted;
}

/** organize — the apex: three social faces → the interior organization (global section). */
export const organizeAction: Action = action({
  verb: "organize",
  inputFormat: "json",
  outputFormat: "json",
  options: ["identity"],
  summary: "Organize a plurality of agents into one collective: glue the three social faces into the interior organization.",
  description: "Domain: `{ socializing?, computing?, gaming? }`, an inter-agent membrane seed per face; --identity names the organization. Codomain: the interior organization — the global section glued from the sheaf of agents, `glued` (H¹=0) the adjudication condition (the plurality coheres into one body). organizing is this gluing node — the social-scale governing, the binder of which the operations chain is a downstream reading.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(ORGANIZATION_ID),
  run: (input: unknown, args: Record<string, unknown>): JsonValue => jsonResource(organize(admitBoundary(input as JsonValue, "organize"), optionsFromArgs(args)), "organization"),
});

/** social-becoming — the stage-1 social-descent reading: the individuals re-posed. */
export const socialBecomingAction: Action = action({
  verb: "social-becoming",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the social becoming of a boundary: the plurality of individuals re-posed as a someone-among-others, in pure social potential.",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`. Codomain: the social-becoming carrier — stage 1 of the social descent: the re-entered individuals (Simondon: settled below, open above; re-posed among other selves), nothing yet related, shared, or settled. The Gen-2 mirror of animating/becoming.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(SOCIAL_BECOMING_ID),
  run: (input: unknown): JsonValue => jsonResource(socialBecoming(admitBoundary(input as JsonValue, "social-becoming")), "social-becoming"),
});

/** relating — the social DOING reading: the directed bonds among agents. */
export const relatingAction: Action = action({
  verb: "relating",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the social doing of a boundary: relating — the directed acts among agents and the bonds they leave.",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`. Codomain: the relating carrier — stage 2 (doing) of the social descent: the bonds among agents (Buber's I–Thou, Lévinas's face-to-face), the social-scale analogue of speaking.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(RELATING_ID),
  run: (input: unknown): JsonValue => jsonResource(relate(admitBoundary(input as JsonValue, "relating")), "relating"),
});

/** community — the social WORKING reading: the shared field (Simondon's transindividual). */
export const communityAction: Action = action({
  verb: "community",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the social working of a boundary: community — the shared field among individuals (transindividual).",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`. Codomain: the community carrier — stage 3 (working) of the social descent: the shared social field accumulated relating builds, which settles into the institution (the organization). Simondon's transindividual: not an aggregate but the relation in which individuals are further individuated together.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(COMMUNITY_ID),
  run: (input: unknown): JsonValue => jsonResource(community(admitBoundary(input as JsonValue, "community")), "community"),
});

/** institute — the stage-4 social-governing reading: the settled social order. */
export const instituteAction: Action = action({
  verb: "institute",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the social governing of a boundary: the institution — the settled social order the plurality comes to rest as.",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`. Codomain: the institution carrier — stage 4 (governing) of the social descent: the settled, bounded, law-bearing order community settles into (Ostrom, Hobbes), `glued` iff the plurality coheres (H¹=0). The Gen-2 mirror of animating/governing — the order the organization IS, distinct from `adjudicate`, its proper act.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(INSTITUTION_ID),
  run: (input: unknown): JsonValue => jsonResource(institute(admitBoundary(input as JsonValue, "institute")), "institution"),
});

/** symmetrize — the organization's FSym(𝔸) membership symmetry: interchangeable roles
 *  (structural equivalence) vs mobile names (name-passing), consolidating gaming's arena Ẽ. */
export const symmetrizeAction: Action = action({
  verb: "symmetrize",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the organization's symmetry: which members are interchangeable (same role / structural equivalence) and which are mobile across constituents (name-passing).",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`. Codomain: the symmetry carrier (`organizing/symmetry`) — the FSym(𝔸) structure of the membership, the social-scale lift of gaming's arena symmetry groupoid Ẽ. It separates the two FSym(𝔸) phenomena (federation-is-parallel-composition.md): `interchangeable`/`roles` are the symmetry GROUPOID (members one could permute without changing the institution — structural equivalence, read negation-aware so an asserter and a denier of a predicate are different roles), while `mobile` is name-PASSING (entity-mobility across polities). `arenaUniform` consolidates the gaming face's own arena symmetry, which the bulk otherwise discards.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(SYMMETRY_ID),
  run: (input: unknown): JsonValue => jsonResource(socialSymmetry(admitBoundary(input as JsonValue, "symmetrize")), "symmetry"),
});

/** stance — the organization's collective LEAN on the truth order ≤_t, consolidated from the
 *  socializing (across/truth) face (the Gen-2 lift of the agent's stance). */
export const stanceAction: Action = action({
  verb: "stance",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the organization's collective stance: which way the society leans on the truth order ≤_t (consolidated from the socializing face).",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`. Codomain: the stance carrier (`organizing/stance`) — which way the collective leans on the bilattice TRUTH order ≤_t (the ∨_t truth-aggregate of the socializing/across face, negation-antitone): `potential` leans FOR, `active` leans AGAINST, `stable` polarized (torn), `absurd` uncommitted; `coordinationFree` says whether that lean glues with no coordination. The Gen-2 / social-scale lift of the animating agent's `stance`; the dual ≤_k axis is read by `community`/`adjudicate`.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(STANCE_ID),
  run: (input: unknown): JsonValue => jsonResource(socialStance(admitBoundary(input as JsonValue, "stance")), "stance"),
});

/** cohesion — the organization's structural balance (Cartwright–Harary factions), the scale-2
 *  lift of the agent's coherence: is the society's sentiment network balanced or factionally frustrated? */
export const cohesionAction: Action = action({
  verb: "cohesion",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read the organization's structural balance: does its sentiment network split into ≤2 stable factions (Cartwright–Harary), or is it factionally frustrated?",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`; sentiment ties are read off the socializing membrane (`agent|likes/trusts target` = +, `agent|dislikes/distrusts target` = −). Codomain: the cohesion carrier (`organizing/cohesion`) — Cartwright–Harary structural balance via the SAME signed-graph Z₂/H¹ obstruction knowing's `contextuality` reads: `balanced` ⟺ the society splits into ≤2 antagonistic factions (a stable polity); `dissonance` > 0 is factional instability no coalition can settle. The social-scale lift of the agent's `coherence`. Grounded in the bilattice signed cohomology + Cartwright–Harary 1956.",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(COHESION_ID),
  run: (input: unknown): JsonValue => jsonResource(cohesion(admitBoundary(input as JsonValue, "cohesion")), "cohesion"),
});

const GOVERNANCE_SCHEMA: JsonRecord = Object.freeze({
  title: "GovernanceInput",
  type: "object",
  description: "the three governance dimensions, each a membrane seed: `preferences` (voter|X>Y ballots), `knowledge` (agent|claim log), `dominance` (winner|loser outcomes). Any may be omitted.",
  properties: { preferences: SEED_SCHEMA, knowledge: SEED_SCHEMA, dominance: SEED_SCHEMA },
});

const ORGANIZATION_VERIFICATION_TOURNAMENT_SCHEMA: JsonRecord = Object.freeze({
  title: "OrganizationVerificationTournamentRequest",
  type: "object",
  description: "An organizing-owned organization/theatre signal plus an optional claim/refutation game to settle through gaming's verification tournament. When claims/refutations are omitted, active work-locus claims become claim strategies and claim conflicts become refutation strategies.",
  properties: {
    id: { type: "string" },
    organization: ref(ORGANIZATION_ID),
    organizationSignal: {
      type: "object",
      description: "An organizing theatre/capability signal such as organizing.theatre.agent-signal; gaming reads it structurally as the social roster.",
    },
    agents: { type: "array", items: { type: "string" } },
    swarm: { $ref: "gaming/libp2p-swarm" },
    claims: { type: "array", items: { type: "object" } },
    refutations: { type: "array", items: { type: "object" } },
    outcomes: { type: "array", items: { type: "object" } },
  },
});

function recordValue(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function recordArrayField(value: unknown, key: string): readonly JsonRecord[] {
  const record = recordValue(value);
  const found = record?.[key];
  return Array.isArray(found) ? Object.freeze(found.map(recordValue).filter((item): item is JsonRecord => item !== undefined)) : [];
}

function stringFieldValue(value: unknown, key: string): string | undefined {
  const found = recordValue(value)?.[key];
  return typeof found === "string" && found.trim() !== "" ? found.trim() : undefined;
}

function tournamentAgentFromSide(side: JsonRecord): string {
  const session = stringFieldValue(side, "session");
  const harness = stringFieldValue(side, "harness");
  if (session !== undefined) return harness === undefined ? session : `${harness}:${session}`;
  return stringFieldValue(side, "capability") ?? "organization";
}

function tournamentClaimIdFromSide(side: JsonRecord): string {
  return `claim:${stringFieldValue(side, "claimId") ?? tournamentAgentFromSide(side)}`;
}

function tournamentClaimFromWorkLocus(claim: JsonRecord): JsonRecord {
  const paths = Array.isArray(claim["paths"]) ? claim["paths"].filter((item): item is string => typeof item === "string" && item !== "") : [];
  const reason = stringFieldValue(claim, "reason");
  return Object.freeze({
    id: tournamentClaimIdFromSide(claim),
    agent: tournamentAgentFromSide(claim),
    text: reason ?? `work-locus claim ${stringFieldValue(claim, "claimId") ?? "unknown"}${paths.length === 0 ? "" : ` over ${paths.join(", ")}`}`,
  });
}

function tournamentRefutationFromConflict(conflict: JsonRecord): JsonRecord | undefined {
  const left = recordValue(conflict["left"]);
  const right = recordValue(conflict["right"]);
  if (left === undefined || right === undefined) return undefined;
  const path = stringFieldValue(conflict, "path") ?? stringFieldValue(left, "path") ?? stringFieldValue(right, "path") ?? "shared locus";
  const rightId = stringFieldValue(right, "claimId") ?? tournamentAgentFromSide(right);
  const leftId = stringFieldValue(left, "claimId") ?? tournamentAgentFromSide(left);
  return Object.freeze({
    id: `refute:${rightId}:against:${leftId}`,
    against: tournamentClaimIdFromSide(left),
    agent: tournamentAgentFromSide(right),
    text: stringFieldValue(conflict, "reason") ?? `work-locus overlap on ${path}`,
  });
}

function organizationTournamentSignal(record: JsonRecord): JsonValue | undefined {
  return record["organizationSignal"] ?? record["organization"];
}

function derivedTournamentClaims(record: JsonRecord): readonly JsonRecord[] {
  const signal = organizationTournamentSignal(record);
  return recordArrayField(signal, "activeClaims").map(tournamentClaimFromWorkLocus);
}

function derivedTournamentRefutations(record: JsonRecord): readonly JsonRecord[] {
  const signal = organizationTournamentSignal(record);
  const directConflicts = recordArrayField(signal, "claimConflicts");
  const fallbackConflicts = directConflicts.length === 0 ? recordArrayField(signal, "yourClaimConflicts") : [];
  const conflicts = directConflicts.length === 0 ? fallbackConflicts : directConflicts;
  return Object.freeze(conflicts.map(tournamentRefutationFromConflict).filter((item): item is JsonRecord => item !== undefined));
}

function admitOrganizationVerificationTournament(input: unknown): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("verification-tournament: expected { organization|organizationSignal, claims?, refutations? }");
  }
  const record = input as JsonRecord;
  if (record["organization"] === undefined && record["organizationSignal"] === undefined) {
    throw new TypeError("verification-tournament: expected organization or organizationSignal");
  }
  const claims = Array.isArray(record["claims"]) ? record["claims"] : derivedTournamentClaims(record);
  const refutations = Array.isArray(record["refutations"]) ? record["refutations"] : derivedTournamentRefutations(record);
  if (claims.length === 0) {
    throw new TypeError("verification-tournament: expected claims array or organizationSignal.activeClaims");
  }
  return Object.freeze({
    ...record,
    claims,
    refutations,
  }) as JsonRecord;
}

/** govern — the capstone consolidation: read all three faculties' impossibility-escapes at once. */
export const governAction: Action = action({
  verb: "govern",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Consolidate the organization's three impossibility-escapes (Arrow, FLP, best-response) into one governance verdict — governable, with the irreducible ⊤-core.",
  description: "Domain: `{ preferences?, knowledge?, dominance? }`, a membrane seed per governance dimension. Codomain: the governance carrier (`organizing/governance`) — organizing reads socializing's collective-preference (Arrow/Condorcet escape), computing's eventual-consistency (FLP/CALM escape), and gaming's reachability (best-response-cycle escape) AT ONCE. They are the SAME escape: the monotone ≤_k settling has no non-trivial periodic orbit, so it converges coordination-free and cycle-free, holding conflict as ⊤. `governable` = acyclic ∧ coordination-free ∧ reachable (the unified guarantee); `irreducible` = the total ⊤-core the three classical impossibility theorems are really about. Grounded in arrows-impossibility.md + cohomological-calm.md + equilibrium-concept.md + closure-monad-no-non-trivial-periodic-orbits.md.",
  domainSchema: GOVERNANCE_SCHEMA,
  codomainSchema: ref(GOVERNANCE_ID),
  run: (input: unknown): JsonValue => jsonResource(governance(admitGovernanceInput(input as JsonValue)), "governance"),
});

/** verification-tournament — run organizing's organization/theatre signal through gaming's claim/refutation game. */
export const verificationTournamentAction: Action = action({
  verb: "verification-tournament",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Settle an organization's claim/refutation contest through gaming's Dialectica/libp2p/matchmaking/equilibrium tournament.",
  description: "Domain: `{ organization|organizationSignal, claims?, refutations?, agents?, swarm?, outcomes? }`. organizing supplies the collective body or theatre signal; active work-locus claims can be lifted to claim strategies and claim conflicts to refutation strategies. gaming owns the FSym/libp2p concurrent game, Dialectica verification semantics, matchmaking, and Nash-style equilibrium certificate. Codomain: `gaming/verification-tournament`.",
  domainSchema: ORGANIZATION_VERIFICATION_TOURNAMENT_SCHEMA,
  codomainSchema: ref(GAMING_VERIFICATION_TOURNAMENT_ID),
  run: (input: unknown): JsonValue =>
    jsonResource(verificationTournament(admitOrganizationVerificationTournament(input)), "gaming verification tournament"),
});

/** social-factor — the social-scale act-factorization: the receiving dual of speaking. */
export const socialFactorAction: Action = action({
  verb: "social-factor",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Factor a Gen-2 face's act (adjudication) into locution/illocution/perlocution — the receiving dual of speaking — with its Belnap profile.",
  description: "Domain: `{ faculty, seed }` where faculty is socializing/computing/gaming and seed is its inter-agent membrane. Codomain: the social act-factorization — the RECEIVING dual of speaking: locution (the cover received), illocution (the charges held across agents), perlocution (the record converged), and the four-fold Belnap classification of the held charges. The Gen-2 mirror of animating's `factor`.",
  domainSchema: Object.freeze({
    title: "SocialFactorRequest",
    type: "object",
    required: ["faculty", "seed"],
    properties: { faculty: { enum: ["socializing", "computing", "gaming"] }, seed: SEED_SCHEMA },
  }),
  codomainSchema: ref(SOCIAL_FACTORIZATION_ID),
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("social-factor: expected a { faculty, seed } object");
    }
    const record = input as JsonRecord;
    const faculty = record["faculty"];
    if (faculty !== "socializing" && faculty !== "computing" && faculty !== "gaming") {
      throw new TypeError("social-factor: faculty must be socializing, computing, or gaming");
    }
    return jsonResource(socialFactor(faculty, descend(admitSeed(record["seed"] as JsonValue))), "social-factorization");
  },
});

/** assemble — the concrete spiral: real animating agents → one organization. */
export const assembleAction: Action = action({
  verb: "assemble",
  inputFormat: "json",
  outputFormat: "json",
  options: ["identity"],
  summary: "Assemble a plurality of real @emsenn/animating agents into one organization — the concrete spiral (Gen-1 outputs become the Gen-2 social base).",
  description: "Domain: `{ agents: [<agent carrier>...] }`, the JSON `animate`/`glue` emits from @emsenn/animating; --identity names the organization. Codomain: the interior organization, glued from those agents as its literal social base — each settled individual re-enters the social descent (`id|individuated`, exactly animating `reseed`'s emission) bringing its standing concern as a shared potential that bonds agents. So an animating agent is literally a member in organizing's social base.",
  domainSchema: Object.freeze({
    title: "Assembly",
    type: "object",
    required: ["agents"],
    properties: { agents: { type: "array", items: { $ref: "animating/becoming/doing/working/governing/agent" } } },
  }),
  codomainSchema: ref(ORGANIZATION_ID),
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || !Array.isArray((input as JsonRecord)["agents"])) {
      throw new TypeError("assemble: expected an { agents: [...] } object");
    }
    const raw = (input as JsonRecord)["agents"] as readonly JsonValue[];
    const agents = raw.map((item, index) => {
      if (item === null || typeof item !== "object" || Array.isArray(item) || (item as JsonRecord)["kind"] !== "animating.agent") {
        throw new TypeError(`assemble: agents[${index}] must be an @emsenn/animating agent carrier`);
      }
      return item as unknown as Agent;
    });
    return jsonResource(assemble(agents, optionsFromArgs(args)), "organization");
  },
});

/** adjudicate — the gluing act standalone: the one record-state many contributions form. */
export const adjudicateAction: Action = action({
  verb: "adjudicate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Adjudicate a social boundary: form one record-state from many agents' contributions (contested/open/monotone + H¹).",
  description: "Domain: a social boundary `{ socializing?, computing?, gaming? }`. Codomain: the adjudication — the receiving dual of speaking: conflicts held contested (Belnap), partial held open (silence ≠ denial), accumulation monotone, with the gluing obstruction H¹ (the consensus cost).",
  domainSchema: SOCIAL_SCHEMA,
  codomainSchema: ref(ADJUDICATION_ID),
  run: (input: unknown): JsonValue => jsonResource(adjudicate(admitBoundary(input as JsonValue, "adjudicate")), "adjudication"),
});

/** face — settle one faculty's inter-agent membrane into its boundary face. */
export const faceAction: Action = action({
  verb: "face",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Settle one Gen-2 faculty's inter-agent membrane into its boundary face (the local section over its cover).",
  description: "Domain: `{ faculty, seed }` where faculty is socializing/computing/gaming and seed is its inter-agent membrane. Codomain: the boundary face — the local section over that faculty's social cover.",
  domainSchema: Object.freeze({
    title: "FaceRequest",
    type: "object",
    required: ["faculty", "seed"],
    properties: { faculty: { enum: ["socializing", "computing", "gaming"] }, seed: SEED_SCHEMA },
  }),
  codomainSchema: ref(FACE_ID),
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("face: expected a { faculty, seed } object");
    }
    const record = input as JsonRecord;
    const faculty = record["faculty"];
    if (faculty !== "socializing" && faculty !== "computing" && faculty !== "gaming") {
      throw new TypeError("face: faculty must be socializing, computing, or gaming");
    }
    return jsonResource(face(faculty, record["seed"] as JsonValue | undefined), "face");
  },
});

/** project — restrict the organization to its three social boundary views (holographic). */
export const projectAction: Action = action({
  verb: "project",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project an organization to its three social faces — the holographic encoding (you see the bulk only through its boundary).",
  description: "Domain: an organization carrier. Codomain: the social projection — its socializing/computing/gaming faces, keyed, with the coordination reading; the interior bulk is never returned directly.",
  domainSchema: ref(ORGANIZATION_ID),
  codomainSchema: ref(PROJECTION_ID),
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || (input as JsonRecord)["kind"] !== "organizing.organization") {
      throw new TypeError("project: expected an organization carrier");
    }
    return jsonResource(project(input as unknown as Organization), "projection");
  },
});

/** reseed — re-pose a settled organization as a federation-scale institution node. */
export const reseedAction: Action = action({
  verb: "reseed",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Reseed an organization: re-pose its settled institution as a federation-scale relating node.",
  description: "Domain: an organization carrier. Codomain: a social-becoming carrier at `scale: federation`, with seed `[identity|institution]` byte-mirroring animating.reseed's `[identity|individuated]`.",
  domainSchema: ref(ORGANIZATION_ID),
  codomainSchema: ref(SOCIAL_BECOMING_ID),
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || (input as JsonRecord)["kind"] !== "organizing.organization") {
      throw new TypeError("reseed: expected an organization carrier");
    }
    return jsonResource(reseed(input as unknown as Organization), "social-becoming");
  },
});

/** federate — the next scale up: parallel-compose constituent societies into a federation. */
export const federateAction: Action = action({
  verb: "federate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Federate: parallel-compose (‖) a plurality of constituent societies into one federation, with name-passing overlap and the cross-arena Mayer–Vietoris reading.",
  description: "Domain: `{ polities: [<social boundary or organization carrier>...] }`. Organization carriers contribute their witnessed institution membrane, so callers do not have to re-supply their old boundaries. Codomain: the federation — the corpus's parallel composition ‖ (federation-is-parallel-composition.md): `nameMobility` counts members shared across constituents (nominal name-passing), and the cross-arena Mayer–Vietoris decomposes it into `shared` (lifts free), `contested` (tolerated disagreement, ker δ), and `federationOnly` (coker diff, the genuine obstruction); `glued` iff federationOnly=0, possibly Arrow-irreducible. Genuinely richer than the diagonal — one agent has no ‖.",
  domainSchema: Object.freeze({
    title: "FederationRequest",
    type: "object",
    required: ["polities"],
    properties: { polities: { type: "array", items: { oneOf: [SOCIAL_SCHEMA, ref(ORGANIZATION_ID)] } } },
  }),
  codomainSchema: ref(FEDERATION_ID),
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || !Array.isArray((input as JsonRecord)["polities"])) {
      throw new TypeError("federate: expected a { polities: [...] } object");
    }
    const polities = ((input as JsonRecord)["polities"] as readonly JsonValue[]).map((cover, index) =>
      admitFederationInput(cover, `federate: polities[${index}]`));
    return jsonResource(federate(polities), "federation");
  },
});

/** The package's actions — the source `induceBins` reads. The social gluing node
 *  (organize/adjudicate/assemble/project) is the apex; the four social-descent
 *  readings (social-becoming → relating → community → institution) and the social
 *  act-factorization are the substrate surface; federate is the spiral re-seed. */
/** office-eligibility - read office-conferred authority plus agent capabilities against requirements. */
export const officeEligibilityAction: Action = action({
  verb: "office-eligibility",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Decide social-scale eligibility from agent capabilities and office-conferred authorities.",
  description: "Domain: an organizing.office-eligibility-request carrier. Codomain: an organizing.office-eligibility-decision carrier. This is organizing's office/authority half of the old dispatch algebra: capabilities belong to the agent, authorities are conferred by the office, and the residuals remain diagnosable.",
  domainSchema: ref(OFFICE_ELIGIBILITY_REQUEST_ID),
  codomainSchema: ref(OFFICE_ELIGIBILITY_DECISION_ID),
  runTerm: officeEligibilityTerm,
  run: (input: unknown): JsonValue =>
    jsonResource(officeEligibility(admitOfficeEligibilityRequest(input as JsonValue, "office-eligibility")), "office-eligibility-decision"),
});

/** accounting-utterances - project accounting entries to finite relating utterances. */
export const accountingUtterancesAction: Action = action({
  verb: "accounting-utterances",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Normalize accounting entries into organizing.accounting.* relating utterances.",
  description: "Domain: an organizing.accounting-entry or array of entries. Codomain: organizing.accounting-utterances, the finite relating utterance projection of the record. Exact transaction conservation is the sibling accounting-balance read.",
  domainSchema: ACCOUNTING_INPUT_SCHEMA,
  codomainSchema: ref(ACCOUNTING_UTTERANCES_ID),
  run: (input: unknown): JsonValue =>
    jsonResource(accountingInputUtterances(admitAccountingInput(input as JsonValue, "accounting-utterances")), "accounting-utterances"),
});

/** accounting-balance - judge one transaction's exact per-commodity conservation. */
export const accountingBalanceAction: Action = action({
  verb: "accounting-balance",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a transaction's exact per-commodity conservation residual.",
  description: "Domain: an organizing.accounting-entry transaction. Codomain: organizing.accounting-balance, the exact graded conservation read over posting weights. This migrates the old accounting balance capability onto organizing while reusing relating's graded conservation law.",
  domainSchema: ref(ACCOUNTING_ENTRY_ID),
  codomainSchema: ref(ACCOUNTING_BALANCE_ID),
  run: (input: unknown): JsonValue => {
    const admitted = admitAccountingInput(input as JsonValue, "accounting-balance");
    if (Array.isArray(admitted)) throw new TypeError("accounting-balance: expected one transaction, not a journal array");
    return jsonResource(accountingBalance(admitAccountingTransaction(admitted as AccountingEntry, "accounting-balance")), "accounting-balance");
  },
});

function directoryFromInput(input: unknown, args: Record<string, unknown>): string {
  const fromArgs = args["directory"];
  if (typeof fromArgs === "string" && fromArgs.trim() !== "") return fromArgs.trim();
  if (typeof input === "string" && input.trim() !== "") return input.trim();
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const value = (input as JsonRecord)["directory"];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  throw new TypeError("organize-directory: expected --directory <path>, a string input, or { directory }");
}

/** organize-directory - read a directory as organizing's governed substrate. */
export const organizeDirectoryAction: Action = action({
  verb: "organize-directory",
  inputFormat: "string",
  outputFormat: "json",
  options: ["directory", "data-root", "content-root", "content-limit"],
  summary: "Read a directory root as organizing's governed substrate: workspace packages, RWIL chronicles, content tree, constituents, and work items.",
  description: "Domain: a directory path, passed as --directory or string input. Codomain: organizing/substrate/directory, a schema-backed intake reading whose packages come from local package manifests, chronicles from the RWIL/EAVT ledger, and content from the governed content tree.",
  domainSchema: Object.freeze({
    title: "DirectorySubstrateRequest",
    anyOf: [
      { type: "string", minLength: 1 },
      {
        type: "object",
        required: ["directory"],
        properties: { directory: { type: "string", minLength: 1 } },
      },
    ],
  }),
  codomain: directorySubstrateCarrier,
  codomainSchema: ref(DIRECTORY_SUBSTRATE_ID),
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const directory = directoryFromInput(input, args);
    const contentLimit = typeof args["content-limit"] === "string" && args["content-limit"].trim() !== ""
      ? Number.parseInt(args["content-limit"], 10)
      : undefined;
    return jsonResource(directorySubstrateResource(readDirectorySubstrate(directory, {
      ...(typeof args["data-root"] === "string" && args["data-root"].trim() !== "" ? { dataRoot: args["data-root"].trim() } : {}),
      ...(typeof args["content-root"] === "string" && args["content-root"].trim() !== "" ? { contentRoot: args["content-root"].trim() } : {}),
      ...(contentLimit === undefined || Number.isNaN(contentLimit) ? {} : { contentLimit }),
    })), "directory-substrate");
  },
});

/** jupyter-notebook - project an organizing notebook input to a real nbformat document. */
export const jupyterNotebookAction: Action = action({
  verb: "jupyter-notebook",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project an organizing notebook input to a Jupyter nbformat notebook.",
  description: "Domain: an organizing notebook input (id, title, optional summary/metadata/cells). Codomain: the organizing-owned Jupyter notebook carrier. This is the ICK-visible notebook projection, not a site-local ad hoc format.",
  domainSchema: JUPYTER_NOTEBOOK_INPUT_SCHEMA,
  codomain: jupyterNotebookCarrier,
  codomainSchema: JupyterNotebookSchema,
  run: (input: unknown): JsonValue => jsonResource(organizingNotebook(admitOrganizingNotebookInput(input, "jupyter-notebook")), "jupyter-notebook"),
});

/** jupyter-run-cells - settle a sequence of code cells into a notebook witness ledger. */
export const jupyterRunCellsAction: Action = action({
  verb: "jupyter-run-cells",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Run a sequence of code-cell sources through the organizing Jupyter witness-ledger model.",
  description: "Domain: `{ id, title, cells }`, with cells as code strings. Codomain: a Jupyter notebook whose code cells are the append-only execution log; this uses organizing/writing/jupyter's notebook-as-witness-ledger model.",
  domainSchema: JUPYTER_RUN_CELLS_SCHEMA,
  codomain: jupyterNotebookCarrier,
  codomainSchema: JupyterNotebookSchema,
  run: (input: unknown): JsonValue => {
    const admitted = admitRunCellsInput(input);
    return jsonResource(runCells(admitted.cells, {
      id: admitted.id,
      title: admitted.title,
      ...(admitted.summary === undefined ? {} : { summary: admitted.summary }),
      ...(admitted.metadata === undefined ? {} : { metadata: admitted.metadata }),
    }), "jupyter-notebook");
  },
});

/** jupyter-default-views - emit the default organizing notebook/data artifact bundle. */
export const jupyterDefaultViewsAction: Action = action({
  verb: "jupyter-default-views",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Emit the default organizing Jupyter notebook and data artifacts for an instance.",
  description: "Domain: an organizing default-view input carrying witness rows, session events, camps, package mesh, and accountability/cohomology reports. Codomain: a data/notebooks artifact bundle suitable for a lab habitat.",
  domainSchema: JUPYTER_DEFAULT_VIEWS_INPUT_SCHEMA,
  codomainSchema: ref(JUPYTER_DEFAULT_VIEW_ARTIFACTS_ID),
  run: (input: unknown): JsonValue =>
    jsonResource(organizingDefaultJupyterViewArtifacts(admitDefaultViewsInput(input)), "jupyter-default-view-artifacts"),
});

export const actions: readonly Action[] = Object.freeze([
  organizeAction,
  organizeDirectoryAction,
  jupyterNotebookAction,
  jupyterRunCellsAction,
  jupyterDefaultViewsAction,
  assembleAction,
  adjudicateAction,
  projectAction,
  reseedAction,
  socialBecomingAction,
  relatingAction,
  communityAction,
  instituteAction,
  symmetrizeAction,
  stanceAction,
  cohesionAction,
  governAction,
  verificationTournamentAction,
  socialFactorAction,
  faceAction,
  federateAction,
  officeEligibilityAction,
  accountingUtterancesAction,
  accountingBalanceAction,
  ...capitalActions,
  ...commodityActions,
  ...exchangeActions,
  ...strategyActions,
  ...valueActions,
  ...accountingInstitutionActions,
  ...x402Actions,
]);
