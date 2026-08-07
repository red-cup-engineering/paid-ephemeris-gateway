// researching/sourcing/taxonomy — public topic and section enrichment.
//
// Articles carry tags/categories as facts. This module reads those facts back
// through Koios's editorial frame so taxonomy pages are not empty index pages:
// each topic gets a short definition, coverage frame, related beats, and seed
// terms that can be exposed to readers and machines.

import { SEED_KEYWORDS, type KoiosBeat, type SeedKeyword } from "../../demand.mjs";

export type TaxonomyKind = "section" | "tag";

export type TaxonomyReading = Readonly<{
  kind: "koios.taxonomy";
  taxonomy: TaxonomyKind;
  slug: string;
  title: string;
  description: string;
  editorialFrame: string;
  beat?: KoiosBeat;
  relatedBeats: readonly KoiosBeat[];
  seedTerms: readonly string[];
  count: number;
  latestPublished?: string;
  url: string;
}>;

type TopicProfile = Readonly<{
  title: string;
  description: string;
  editorialFrame: string;
  beat?: KoiosBeat;
  relatedBeats?: readonly KoiosBeat[];
  seedHints?: readonly string[];
}>;

function beats(...items: KoiosBeat[]): readonly KoiosBeat[] {
  return Object.freeze(items);
}

const TOPICS: Readonly<Record<string, TopicProfile>> = Object.freeze({
  "climate": Object.freeze({
    title: "Climate",
    description: "Climate coverage follows heat, water, crops, disasters, insurance retreat, and the physical limits that push other systems out of their expected ranges.",
    editorialFrame: "Koios.News covers the environment as an IPTC top-level subject; the collapse lens — climate breakdown as upstream pressure on economy, technology, and politics — emerges across that coverage rather than branding it.",
    beat: "environment",
    relatedBeats: beats("economy", "politics", "technology"),
    seedHints: Object.freeze(["climate", "heat", "water", "crop", "insurance", "disaster", "food"]),
  }),
  "climate-breakdown": Object.freeze({
    title: "Climate Breakdown",
    description: "Climate breakdown names the compounding failure of weather, infrastructure, insurance, food, and governance assumptions under physical stress.",
    editorialFrame: "Stories in this topic ask which institutions still behave as if the old climate baseline exists, and what breaks when that assumption stops pricing reality.",
    beat: "environment",
    relatedBeats: beats("economy", "politics", "technology"),
    seedHints: Object.freeze(["climate", "insurance", "crop", "grid", "disaster"]),
  }),
  "technology": Object.freeze({
    title: "Technology",
    description: "Technology coverage follows AI, data centers, semiconductors, satellites, automation, and the infrastructure appetite of computation.",
    editorialFrame: "Koios.News reads technology as material infrastructure: energy, water, chips, labor, logistics, regulation, capital expenditure, and political power.",
    beat: "technology",
    relatedBeats: beats("environment", "economy", "politics"),
    seedHints: Object.freeze(["technology", "data center", "semiconductor", "satellite", "grid", "automation"]),
  }),
  "ai": Object.freeze({
    title: "AI",
    description: "AI coverage follows model infrastructure, automation, labor displacement, data-center load, regulation, and the firms turning prediction into governance.",
    editorialFrame: "Koios.News treats AI as a climate, labor, capital, and state-capacity story before it treats it as a product category.",
    beat: "technology",
    relatedBeats: beats("economy", "politics", "environment"),
    seedHints: Object.freeze(["ai", "artificial intelligence", "data center", "labor", "automation"]),
  }),
  "crypto": Object.freeze({
    title: "Crypto",
    description: "Crypto coverage follows stablecoins, DeFi, liquidity, exchanges, regulation, sanctions, energy demand, and speculative market structure.",
    editorialFrame: "Koios.News reads crypto as financial infrastructure and attention machinery: a way capital, politics, and technical systems test each other under stress.",
    beat: "economy",
    relatedBeats: beats("technology", "politics", "environment"),
    seedHints: Object.freeze(["crypto", "stablecoin", "bitcoin", "liquidity", "defi"]),
  }),
  "defi": Object.freeze({
    title: "DeFi",
    description: "DeFi coverage follows on-chain leverage, yield, liquidity incentives, bridge risk, governance, and the fragility of automated financial promises.",
    editorialFrame: "Koios.News asks what happens when financial infrastructure tries to remove institutions but keeps credit, leverage, attention, and crisis dynamics.",
    beat: "economy",
    relatedBeats: beats("technology", "politics"),
    seedHints: Object.freeze(["defi", "liquidity", "stablecoin", "crypto", "yield"]),
  }),
  "economy": Object.freeze({
    title: "Economy",
    description: "Economy coverage follows debt, commodities, insurance, capital expenditure, labor, liquidity, and the cost of maintaining old promises.",
    editorialFrame: "Koios.News treats economic indicators as pressure gauges for physical, political, and technological constraints arriving on balance sheets.",
    beat: "economy",
    relatedBeats: beats("environment", "politics", "technology"),
    seedHints: Object.freeze(["economy", "economic", "finance", "debt", "commodity", "capital", "liquidity"]),
  }),
  "crypto-finance": Object.freeze({
    title: "Crypto Finance",
    description: "Crypto finance follows the meeting point of digital assets, market structure, liquidity incentives, regulation, and speculative capital flows.",
    editorialFrame: "Koios.News treats this section as finance reporting first: who carries risk, where liquidity is manufactured, and what breaks when confidence moves.",
    beat: "economy",
    relatedBeats: beats("technology", "politics"),
    seedHints: Object.freeze(["crypto", "finance", "stablecoin", "bitcoin", "liquidity", "defi"]),
  }),
  "politics": Object.freeze({
    title: "Politics",
    description: "Politics coverage follows state capacity, borders, disaster funding, resource nationalism, legitimacy, regulation, and administrative stress.",
    editorialFrame: "Koios.News reads politics as the visible negotiation of systems under constraint: what states promise, what they can still deliver, and who is abandoned.",
    beat: "politics",
    relatedBeats: beats("environment", "economy", "technology"),
    seedHints: Object.freeze(["policy", "politic", "border", "state", "regulation", "geopolitics"]),
  }),
  "degrowth": Object.freeze({
    title: "Degrowth",
    description: "Degrowth coverage follows planned economic contraction, sufficiency, wellbeing economies, localization, and the limits-to-growth tradition as live responses to ecological overshoot.",
    editorialFrame: "Koios.News reads degrowth not as austerity but as the question collapse forces: which throughput a finite, warming world can still support, and how a managed descent differs from an unmanaged one.",
    beat: "degrowth",
    relatedBeats: beats("economy", "environment", "politics", "decolonization"),
    seedHints: Object.freeze(["degrowth", "post-growth", "growth", "wellbeing", "sufficiency", "localization", "limits"]),
  }),
  "decolonization": Object.freeze({
    title: "Decolonization",
    description: "Decolonization coverage follows climate reparations, extraction and the global south, Indigenous land and sovereignty, sovereign debt, and the afterlives of empire in trade and governance.",
    editorialFrame: "Koios.News reads decolonization as a collapse story about who bears the cost of breakdown they did least to cause, and which colonial arrangements are most likely to be contested or undone as systems fracture.",
    beat: "decolonization",
    relatedBeats: beats("politics", "environment", "economy", "degrowth"),
    seedHints: Object.freeze(["decolon", "reparations", "global south", "indigenous", "extraction", "neocolonial", "sovereign"]),
  }),
  "newsroom": Object.freeze({
    title: "Newsroom",
    description: "Newsroom coverage explains Koios.News as a publication system: its editorial standards, autonomous tools, feeds, source surfaces, and operating constraints.",
    editorialFrame: "These stories make the machinery visible so readers and operators can inspect how the site turns sourced evidence into public news objects.",
    beat: "technology",
    relatedBeats: beats("politics", "economy"),
    seedHints: Object.freeze(["publishing", "ai", "automation", "news"]),
  }),
  "autonomous-newsroom": Object.freeze({
    title: "Autonomous Newsroom",
    description: "Autonomous newsroom coverage follows the tools, standards, work queues, and machine-readable surfaces that let Koios.News operate as an agentic publication.",
    editorialFrame: "The goal is not to hide automation behind a brand voice, but to make the production process inspectable enough for readers and operators to trust the work.",
    beat: "technology",
    relatedBeats: beats("politics", "economy"),
    seedHints: Object.freeze(["ai", "automation", "publishing", "newsroom"]),
  }),
});

function slugLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function seedMatches(seed: SeedKeyword, profile: TopicProfile, slug: string, title: string): boolean {
  const term = seed.term.toLowerCase();
  const hints = profile.seedHints ?? Object.freeze([]);
  return seed.beat === profile.beat ||
    hints.some((hint) => term.includes(hint.toLowerCase()) || hint.toLowerCase().includes(term)) ||
    term.includes(slug.replaceAll("-", " ")) ||
    term.includes(title.toLowerCase());
}

function fallbackProfile(taxonomy: TaxonomyKind, title: string): TopicProfile {
  const subject = title.toLowerCase();
  return Object.freeze({
    title,
    description: `${title} coverage from Koios.News follows sourced events where ${subject} becomes a signal of climate, technology, politics, or economic systems under stress.`,
    editorialFrame: `Koios.News reads ${subject} as part of a compounding collapse frame: the question is what the event reveals about infrastructure, state capacity, capital, and physical limits.`,
    relatedBeats: beats("environment", "technology", "economy", "politics", "degrowth", "decolonization"),
  });
}

function profileFor(taxonomy: TaxonomyKind, slug: string, title: string): TopicProfile {
  return TOPICS[slug] ?? TOPICS[slugLabel(title)] ?? fallbackProfile(taxonomy, title);
}

export function taxonomyReading(input: Readonly<{
  taxonomy: TaxonomyKind;
  slug: string;
  title: string;
  count: number;
  url: string;
  latestPublished?: string;
  seeds?: readonly SeedKeyword[];
}>): TaxonomyReading {
  const profile = profileFor(input.taxonomy, input.slug, input.title);
  const seeds = (input.seeds ?? SEED_KEYWORDS)
    .filter((seed) => seedMatches(seed, profile, input.slug, input.title))
    .map((seed) => seed.term);
  return Object.freeze({
    kind: "koios.taxonomy" as const,
    taxonomy: input.taxonomy,
    slug: input.slug,
    title: profile.title,
    description: profile.description,
    editorialFrame: profile.editorialFrame,
    ...(profile.beat === undefined ? {} : { beat: profile.beat }),
    relatedBeats: Object.freeze(profile.relatedBeats ?? (profile.beat === undefined ? [] : [profile.beat])),
    seedTerms: Object.freeze([...new Set(seeds)].sort()),
    count: input.count,
    ...(input.latestPublished === undefined ? {} : { latestPublished: input.latestPublished }),
    url: input.url,
  });
}
