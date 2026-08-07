// administrating/developing — Koios.News capability planning.
//
// This is an admin-office reading, not a ticket tracker. It makes the site's
// development intentions inspectable by operators and agents without changing
// reader privacy or production behavior before the needed policy/data exists.

import { SEED_KEYWORDS, type SeedKeyword } from "../../demand.mjs";
import { DEFAULT_A_ADS_UNITS } from "../../theme.mjs";

export type TopicFocusReading = Readonly<{
  topic: "climate" | "technology" | "politics" | "economy" | "ai" | "crypto";
  seedCount: number;
  highPriorityCount: number;
  terms: readonly string[];
}>;

export type DevelopingCapability = Readonly<{
  id: string;
  area: "topics" | "analytics" | "advertising" | "administration" | "upstream";
  status: "active" | "planned";
  intention: string;
  constraint: string;
}>;

export type EditorialMetricTask = Readonly<{
  id: string;
  status: "planned" | "active";
  metric: string;
  evidence: readonly string[];
  nextSurface: string;
  constraint: string;
}>;

export type TopologyConstructionPattern = Readonly<{
  id: string;
  status: "planned" | "active";
  upstream: readonly string[];
  construction: string;
  koiosUse: string;
  nextSurface: string;
  constraint: string;
}>;

export type DevelopingOfficeReading = Readonly<{
  office: "administrating.developing";
  principles: readonly string[];
  topicFocus: readonly TopicFocusReading[];
  analytics: Readonly<{
    stance: "first-party-aggregate";
    collected: readonly string[];
    excluded: readonly string[];
    plannedAdminSurfaces: readonly string[];
  }>;
  editorialMetricTasks: readonly EditorialMetricTask[];
  topologyConstruction: Readonly<{
    stance: "nested-derived-components";
    reviewed: readonly string[];
    patterns: readonly TopologyConstructionPattern[];
  }>;
  advertising: Readonly<{
    adsenseReady: boolean;
    providers: readonly Readonly<{
      id: "adsense" | "a-ads";
      status: "configured" | "planned";
      unitId?: string;
      unitIds?: readonly string[];
      intendedUse: string;
    }>[];
    plannedRouting: string;
    roiInputs: readonly string[];
  }>;
  capabilities: readonly DevelopingCapability[];
}>;

const TOPIC_MATCHERS: readonly Readonly<{
  topic: TopicFocusReading["topic"];
  words: readonly string[];
}>[] = Object.freeze([
  Object.freeze({ topic: "climate", words: Object.freeze(["climate", "heat", "water", "crop", "food", "insurance"]) }),
  Object.freeze({ topic: "technology", words: Object.freeze(["technology", "data center", "grid", "semiconductor", "satellite", "ai"]) }),
  Object.freeze({ topic: "politics", words: Object.freeze(["policy", "politic", "border", "state", "nationalism", "funding", "regulation", "geopolitics"]) }),
  Object.freeze({ topic: "economy", words: Object.freeze(["finance", "financial", "economy", "economic", "debt", "dollar", "commodity", "asset", "capital", "liquidity"]) }),
  Object.freeze({ topic: "ai", words: Object.freeze(["ai", "artificial intelligence"]) }),
  Object.freeze({ topic: "crypto", words: Object.freeze(["crypto", "stablecoin", "bitcoin"]) }),
]);

const EDITORIAL_METRIC_TASKS: readonly EditorialMetricTask[] = Object.freeze([
  Object.freeze({
    id: "internal-link-density",
    status: "active" as const,
    metric: "Internal links per article, per 800 words, with same-site target diversity and stale-link detection.",
    evidence: Object.freeze(["published Markdown body", "same-site route inventory", "tag/category taxonomy"]),
    nextSurface: "/operators/content/quality.json",
    constraint: "Internal links are editorial warrant signals, not automatic SEO stuffing; count only links that still resolve.",
  }),
  Object.freeze({
    id: "external-reference-sufficiency",
    status: "active" as const,
    metric: "External CSL reference count, cited-reference count, citation-domain diversity, and thin-reference warnings.",
    evidence: Object.freeze(["references frontmatter", "body citations", "bibliography domain readings"]),
    nextSurface: "/operators/content/quality.json",
    constraint: "Only references are publication citations; intake sources stay source-cycle material until promoted to CSL records.",
  }),
  Object.freeze({
    id: "claim-evidence-settlement",
    status: "active" as const,
    metric: "Paragraph claim cells, evidence-bearing citation cells, unsupported cells, contradiction surfaces, and settlement depth.",
    evidence: Object.freeze(["article body", "CSL references", "research-packet claims", "source-cycle run traces"]),
    nextSurface: "/operators/content/predication.json",
    constraint: "Predication metrics are editor diagnostics and must not pretend to be automatic truth or reader surveillance.",
  }),
  Object.freeze({
    id: "freshness-and-revision-yield",
    status: "planned" as const,
    metric: "Freshness decay by topic, correction/revision rate, and yield from revision packets to improved published articles.",
    evidence: Object.freeze(["article date", "correction records", "assignment events", "content revision packets"]),
    nextSurface: "/operators/content/revisions.json",
    constraint: "Do not penalize evergreen explainers merely because they are older; freshness is topic-sensitive.",
  }),
  Object.freeze({
    id: "source-cycle-cost-and-friction",
    status: "active" as const,
    metric: "Feed writes/skips/errors, demand-pull obstructions, gate failures, token cost, candidate write collisions, and manual repair distance to publication.",
    evidence: Object.freeze(["source-cycle readings", "farm run traces", "candidate write-collision readings", "standards reviews", "published manuscripts"]),
    nextSurface: "/operators/source-cycle/repairs.json",
    constraint: "Friction metrics should improve operator workflow and source quality; they must not encourage unsafe automatic publishing.",
  }),
  Object.freeze({
    id: "topic-graph-centrality",
    status: "active" as const,
    metric: "Article graph centrality by tag, category, cited domain, same-site links, and source-packet query terms.",
    evidence: Object.freeze(["tags", "categories", "references", "same-site links", "research packets"]),
    nextSurface: "/operators/content/graph.json",
    constraint: "Graph centrality should reveal coverage gaps and isolated articles, not flatten editorial judgment into a single score.",
  }),
]);

const TOPOLOGY_CONSTRUCTION_PATTERNS: readonly TopologyConstructionPattern[] = Object.freeze([
  Object.freeze({
    id: "source-to-reference-fibration",
    status: "active" as const,
    upstream: Object.freeze([
      "lib/content/src/topology/news/index.mts",
      "lib/content-production/src/cable",
      "content/triage/2026/06/14/topology_sheaf_geometry_of_documents.md",
    ]),
    construction: "Treat intake sources as local observations over a story base; references are the cited cut promoted from those observations into manuscript-local CSL cells.",
    koiosUse: "Keep source-cycle packets, research packets, CSL references, body citations, and bibliography pages as distinct but linked layers in one documentary fibration.",
    nextSurface: "/operators/source-cycle/repairs.json",
    constraint: "Never collapse source observations into publication references without a witnessed promotion step.",
  }),
  Object.freeze({
    id: "desk-chain-as-nested-component",
    status: "active" as const,
    upstream: Object.freeze([
      "lib/content/src/topology/news/index.mts",
      "lib/gaming/src/running/game.mts",
      "content/triage/2026/06/15/games-are-computers-are-games-mud-notes.md",
    ]),
    construction: "Model researching -> writing -> editing -> publishing -> managing as nested offices whose outputs become the next office's local section, with publication as a tick/adjudication rather than a direct mutation.",
    koiosUse: "Work queues, publication candidates, revision packets, correction register, and ad-routing policy should all read from the same nested production trace instead of independent task stores.",
    nextSurface: "/operators/work-queue.json",
    constraint: "Only approved publication/repair actions write manuscripts; diagnostics and queues remain projections.",
  }),
  Object.freeze({
    id: "article-sheaf-and-cosheaf",
    status: "active" as const,
    upstream: Object.freeze([
      "content/triage/2026/06/14/topology_sheaf_geometry_of_documents.md",
      "lib/relating/src/articulating/predicating/bilattice-relation.mts",
      "lib/content/src/topology/index.mts",
    ]),
    construction: "Read each article as paragraph, claim, citation, tag, section, and link stalks; restrictions test local-to-global coherence while cosheaf aggregation accumulates evidence and summaries upward.",
    koiosUse: "Unify content graph, predication, quality, internal-link placement, and bibliography-domain pages as views over a paragraph/article/corpus complex.",
    nextSurface: "/operators/content/predication.json",
    constraint: "The reading is an editorial geometry, not automatic fact-checking or personalized ranking.",
  }),
  Object.freeze({
    id: "swarm-hands-for-newsroom-agents",
    status: "planned" as const,
    upstream: Object.freeze([
      "content/triage/2026/05/24/claude-code-harness/README.md",
      "content/triage/2026/05/24/claude-code-harness/lifecycle.mjs",
      "content/triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-capture-shp-conductor-mcp.md",
      "lib/computing-with-llm-agents/src/harness/index.mts",
    ]),
    construction: "Split agents into sensing hands that crawl feeds/web/repo and learning hands that consolidate traces, with a human conductor approving writes and publishing.",
    koiosUse: "Run source refresh, research, draft, edit, and publish as operator-visible swarm contributions, where disagreement becomes repair demand rather than hidden retry noise.",
    nextSurface: "/operators/workbench.json",
    constraint: "LLM or swarm output may create candidates and repair packets, but publication remains gated by standards and human approval.",
  }),
  Object.freeze({
    id: "semantic-hypertext-packets",
    status: "active" as const,
    upstream: Object.freeze([
      "content/triage/2026/05/24/claude-code-harness/README.md",
      "content/triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-capture-shp-conductor-mcp.md",
      "lib/computing-with-the-web/src/topology/index.mts",
    ]),
    construction: "Project settled article and work-order frontiers as HTML packets carrying finite EAVT-like coordinates for other agents, while keeping Markdown as the human authoring layer.",
    koiosUse: "Make source-cycle repair packets and content revision packets portable between newsroom agents and external web agents through scriptless HTML packet exports; extend the same pattern to research packets and bibliography-domain readings next.",
    nextSurface: "/operators/source-cycle/repairs/{slug}.packet.html",
    constraint: "Packets must be scriptless, deterministic, and sourced from settled readings.",
  }),
  Object.freeze({
    id: "aperiodic-dream-budgeting",
    status: "planned" as const,
    upstream: Object.freeze([
      "lib/computing-with-llm-agents/src/dreaming/index.mts",
      "lib/content-production/src/content-farm/service.mts",
    ]),
    construction: "Use cheap deterministic projections for finite/scott-continuous consolidation and reserve LLM calls for aperiodic generator introduction: new angles, unfamiliar tokens, and contested repair hypotheses.",
    koiosUse: "Lower source-cycle cost by doing more claim extraction, packet assembly, and gate repair deterministically before asking the NVIDIA endpoint to write or arbitrate.",
    nextSurface: "/operators/source-cycle/plan.json",
    constraint: "Cost reduction must not convert uncited generated text into published references.",
  }),
]);

function matchesTopicWord(term: string, word: string): boolean {
  if (/^[a-z0-9]{1,3}$/.test(word)) return new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`).test(term);
  return term.includes(word);
}

function topicTerms(seeds: readonly SeedKeyword[], words: readonly string[]): readonly SeedKeyword[] {
  return Object.freeze(seeds.filter((seed) => {
    const term = seed.term.toLowerCase();
    return words.some((word) => matchesTopicWord(term, word));
  }));
}

function topicFocus(seeds: readonly SeedKeyword[]): readonly TopicFocusReading[] {
  return Object.freeze(TOPIC_MATCHERS.map((matcher) => {
    const matches = topicTerms(seeds, matcher.words);
    return Object.freeze({
      topic: matcher.topic,
      seedCount: matches.length,
      highPriorityCount: matches.filter((seed) => seed.priority >= 8).length,
      terms: Object.freeze(matches.map((seed) => seed.term)),
    });
  }));
}

export function developingOfficeReading(input: Readonly<{ adSenseEnabled?: boolean }> = {}): DevelopingOfficeReading {
  return Object.freeze({
    office: "administrating.developing",
    principles: Object.freeze([
      "Prefer first-party aggregate measurements over user-level tracking.",
      "Make admin-only planning surfaces explicit before adding behavior.",
      "Use upstream package carriers for production, web, content, and analytics whenever they fit.",
      "Treat advertising as a managed publication policy, not a page template accident.",
      "Construct topology from nested components that witness how they were formed from prior components.",
    ]),
    topicFocus: topicFocus(SEED_KEYWORDS),
    analytics: Object.freeze({
      stance: "first-party-aggregate" as const,
      collected: Object.freeze(["page path", "referrer host", "day stamp", "aggregate counts"]),
      excluded: Object.freeze(["IP address", "user agent", "cookie", "browser fingerprint", "cross-site identifier", "per-reader profile"]),
      plannedAdminSurfaces: Object.freeze([
        "topic demand by beat",
        "article, section, and tag performance through /operators/content/performance.json",
        "article content-quality metrics through /operators/content/quality.json: internal links, external references, citation-domain diversity, topic depth, headline-warrant preservation, SEO repetition, heading integrity, and correction-surface coverage",
        "active content-predication metrics through /operators/content/predication.json: claim cells by paragraph, evidence-bearing reference cells, same-site relation cells, unsupported cells, settlement depth, freshness, and graph centrality",
        "active content graph metrics through /operators/content/graph and /operators/content/graph.json: same-site article nodes, edges, section buckets, orphaned articles, isolated articles, and suggested internal targets",
        "planned editorial-shape metrics for contradiction surfaces, citation-domain entropy, source-to-reference promotion loss, and revision yield",
        "source-cycle friction metrics: feed writes/skips/errors, demand-pull obstructions, candidate gate failures, manual edit distance to publishability, and model token cost per published article",
        "source-cycle repair packets through /operators/source-cycle/repairs.json and /operators/source-cycle/repairs, derived from farm gate failures and intake obstructions",
        "per-candidate source-cycle repair packet details through /operators/source-cycle/repairs/{slug}.json and /operators/source-cycle/repairs/{slug}",
        "operator-approved source-cycle repair assignment creation through POST /operators/source-cycle/repairs/{slug}/assign",
        "deployment readiness probe through pnpm run deploy:probe: listener-ready timing, local probe success rate, and post-deploy public/newsroom route evidence",
        "operator-approved heading/body repair through POST /operators/manuscripts/{slug}/headings/repair",
        "operator-approved SEO-heading repair through POST /operators/manuscripts/{slug}/headings/seo",
        "ranked publication candidates through /operators/publication-candidates and /operators/publication-candidates.json, derived from manuscript standards distance to publication",
        "prioritized article revision packets through /operators/content/revisions.json, derived from quality findings into operator editing tasks",
        "operator-approved revision assignment creation through POST /operators/content/revisions/{slug}/assign",
        "human manuscript queue through /operators/manuscripts.html beside machine inventory /operators/manuscripts.json",
        "human assignment queue through /operators/assignments.html beside machine inventory /operators/assignments.json",
        "combined operator work queue through /operators/work-queue and /operators/work-queue.json across assignments, manuscripts, revision packets, and source-cycle repairs",
        "assignment work orders through /operators/assignments/{assignmentId}.json with operator notes, evidence, source URLs, and next-action links",
        "assignment activity timelines through /operators/assignments/{assignmentId}/activity.json from append-only assignment events and derived manuscript artifacts",
        "internal assignment notes through POST /operators/assignments/{assignmentId}/notes, kept separate from public copy, sources, and references",
        "operator-approved assignment completion through POST /operators/assignments/{assignmentId}/complete",
        "operator-reviewed internal link opportunities through /operators/content/internal-links.json",
        "paragraph-level internal link placement packets through /operators/content/internal-link-placements.json",
        "operator-approved internal link application through POST /operators/content/internal-link-placements",
        "draft-time same-site link guidance through /operators/writing/internal-link-guidance.json and /operators/assignments/{assignmentId}/link-guidance.json",
        "assignment conversion from demand to draft to publication",
        "aggregate ad revenue by provider, section, and tag through /operators/advertising/performance.json",
      ]),
    }),
    editorialMetricTasks: EDITORIAL_METRIC_TASKS,
    topologyConstruction: Object.freeze({
      stance: "nested-derived-components" as const,
      reviewed: Object.freeze([
        "lib/relating",
        "lib/animating",
        "lib/gaming",
        "lib/computing",
        "lib/content",
        "lib/content-production",
        "lib/computing-with-llm-agents",
        "lib/computing-with-agents",
        "lib/computing-with-the-web",
        "lib/computing-with-the-living-web",
        "content/triage/2026/05/24/claude-code-harness",
        "content/triage/2026/06/14/topology_sheaf_geometry_of_documents.md",
        "content/triage/2026/06/15/games-are-computers-are-games-mud-notes.md",
      ]),
      patterns: TOPOLOGY_CONSTRUCTION_PATTERNS,
    }),
    advertising: Object.freeze({
      adsenseReady: input.adSenseEnabled === true,
      providers: Object.freeze([
        Object.freeze({
          id: "adsense" as const,
          status: input.adSenseEnabled === true ? "configured" as const : "planned" as const,
          intendedUse: "Default standards-compliant display ads once approved and configured.",
        }),
        Object.freeze({
          id: "a-ads" as const,
          status: input.adSenseEnabled === true ? "planned" as const : "configured" as const,
          unitId: DEFAULT_A_ADS_UNITS[0]!,
          unitIds: DEFAULT_A_ADS_UNITS,
          intendedUse: "Default display inventory until AdSense is approved, then economics and crypto-adjacent inventory when aggregate ROI beats AdSense.",
        }),
      ]),
      plannedRouting: "For pages tagged under economics, choose the ad provider with the higher aggregate ROI for that tag or section; never route by reader identity.",
      roiInputs: Object.freeze(["provider", "page path", "section", "tag", "day", "impressions", "clicks", "estimated revenue"]),
    }),
    capabilities: Object.freeze([
      Object.freeze({
        id: "expand-ai-crypto-economy-topics",
        area: "topics" as const,
        status: "active" as const,
        intention: "Keep climate, technology, politics, and economy coverage seeded with explicit AI and crypto terms.",
        constraint: "Terms still need sourced events and standards review before becoming copy.",
      }),
      Object.freeze({
        id: "aggregate-admin-analytics",
        area: "analytics" as const,
        status: "active" as const,
        intention: "Give operators article, section, tag, topic, assignment, publication-performance, and aggregate ad-performance readings.",
        constraint: "No user-level tracking or identifiers; ad records are provider/path/section/tag/day aggregates only.",
      }),
      Object.freeze({
        id: "content-quality-metrics",
        area: "analytics" as const,
        status: "active" as const,
        intention: "Expose Yoast/Squirrly-like editorial metrics for Koios content quality: internal links, outgoing reference links, citation diversity, topic coverage, claim-to-headline warrant preservation, SEO repetition, heading integrity, correction propagation, readable structure, and source-to-reference promotion loss.",
        constraint: "Use article text, references, taxonomy, bibliography, source-cycle records, and publication artifacts only; do not add visitor tracking or reader profiles.",
      }),
      Object.freeze({
        id: "predicate-graph-content-metrics",
        area: "analytics" as const,
        status: "planned" as const,
        intention: "Model articles as predicate graphs so editors can inspect claim cells, evidence cells, relation cells, unsupported cells, contradiction surfaces, graph centrality, freshness decay, and settlement depth before publication.",
        constraint: "Metrics must remain editorial diagnostics over published text and cited references; they do not become automatic truth, ranking manipulation, or reader surveillance.",
      }),
      Object.freeze({
        id: "source-cycle-gate-repair",
        area: "administration" as const,
        status: "active" as const,
        intention: "Turn source-cycle gate failures into explicit repair packets and durable editing assignments for SEO-term mismatch, overstuffing, insufficient references, description length, unsupported speculative framing, and intake obstruction before a human publishes.",
        constraint: "Repairs and assignment creation need operator approval and must preserve the ontology split: intake sources remain research material, published references remain CSL records.",
      }),
      Object.freeze({
        id: "deployment-readiness-probes",
        area: "administration" as const,
        status: "active" as const,
        intention: "Make redeploy readiness observable with listener-ready timing, route probes, and public evidence for the homepage, article, feeds, bibliography, and newsroom workbench.",
        constraint: "The service should not report operational readiness merely because systemd has spawned the build wrapper.",
      }),
      Object.freeze({
        id: "content-revision-backlog",
        area: "administration" as const,
        status: "active" as const,
        intention: "Turn quality findings into prioritized operator revision packets and durable editing assignments for citation cleanup, copy editing, internal linking, reference enrichment, SEO revision, and structure repair.",
        constraint: "Assignment creation and completion are idempotent and operator-approved; revision packets do not themselves rewrite or publish copy.",
      }),
      Object.freeze({
        id: "internal-link-enrichment",
        area: "analytics" as const,
        status: "active" as const,
        intention: "Expose same-site link opportunities and paragraph-level placement packets with shared-topic evidence, matched terms, reviewed Markdown patch suggestions, and an operator-approved apply action for article enrichment.",
        constraint: "The apply action re-derives the current placement and refuses stale, ambiguous, or non-conservative patches; operators must still review local warrant before applying.",
      }),
      Object.freeze({
        id: "draft-internal-link-guidance",
        area: "administration" as const,
        status: "active" as const,
        intention: "Move same-site link awareness earlier into research packets, assignment work orders, and draft forms so writers can include warranted Koios links before publication.",
        constraint: "Guidance is read-only composition support; it must not be treated as citation support or as an automatic edit.",
      }),
      Object.freeze({
        id: "economics-ad-roi-router",
        area: "advertising" as const,
        status: "planned" as const,
        intention: "Route economics-tagged pages between AdSense and A-Ads by aggregate ROI.",
        constraint: "Requires provider configuration, aggregate revenue import, and a privacy review before serving.",
      }),
      Object.freeze({
        id: "admin-only-workbench",
        area: "administration" as const,
        status: "active" as const,
        intention: "Expose planning, work management, prioritized operator queue, and policy readings through the newsroom web, OpenAPI, and MCP surfaces.",
        constraint: "Admin surfaces stay on the newsroom app and remain separate from public product data.",
      }),
      Object.freeze({
        id: "upstream-library-review",
        area: "upstream" as const,
        status: "active" as const,
        intention: "Review upstream packages and 561 content for reusable topology carriers before adding local models; current derived plan lives in topologyConstruction.",
        constraint: "Local code should remain publication policy over upstream carriers where possible, with topology formed from nested witnessed components instead of flattened graphs.",
      }),
    ]),
  });
}
