import { fileURLToPath } from "node:url";

import { ACTOR, CONTEXT, digest, niSuffix, record } from "./boundary.mjs";

export const NEWSCABLE_ACTOR = "https://newscable-source-broker.invalid/activitypub/actor";
export const CORPUS_MANAGEMENT_ACTOR = "urn:ame:corpus-management-team";
export const WEB_SOURCE_ACTOR = "urn:ame:web-source-acquisition";
export const NEWSCABLE_SOURCE_BUNDLE_CONTRACT = "ni:///sha-256;ebrZ90_nZRpBkxaSQgcdu4hUd_ReVnu8YtU7CQ9QhXg";
export const WEB_SOURCE_TEXT_CONTRACT = "ni:///sha-256;I2k7lfS_yS2236-b3gijN3QgQz9W0KkPgbFEDEoNZ5c";
export const PRIOR_RESEARCH_CONTRACT = "ni:///sha-256;ugqKIc6VFzqzfbuJ6JNrMB4Gognt169Wm1ZC8cf3vj0";

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/iu;
// Six fully selected sources at this ceiling still fit comfortably inside the
// 200k Sonnet route, while preserving enough reporting for a real manuscript.
// The old 1,200-character cut routinely reduced a substantive article to a
// few paragraphs before the writer saw it.
const MAX_CURRENT_SOURCE_CONTEXT_CHARACTERS = 12_000;
const STOPWORDS = new Set([
  "about", "after", "amid", "and", "are", "for", "from", "how", "into",
  "its", "new", "not", "of", "on", "over", "the", "to", "under", "when", "with",
]);

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function strings(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function nonnegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function validInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) && !Number.isNaN(Date.parse(value));
}

const ISO_PUBLICATION_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/u;
const RFC_PUBLICATION_INSTANT = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), )?\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} (?:GMT|[+-]\d{4})$/u;

/** News providers lawfully carry ISO-8601 offsets and RFC feed dates. Normalize
 * only those two explicit grammars to the service's canonical UTC instant. */
function publicationInstant(value) {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim();
  if (!ISO_PUBLICATION_INSTANT.test(candidate) && !RFC_PUBLICATION_INSTANT.test(candidate)) return undefined;
  const timestamp = Date.parse(candidate);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

async function rejection(activity, reason, code, instant) {
  const result = Object.freeze({
    "@context": CONTEXT,
    type: "Reject",
    actor: ACTOR,
    target: activity?.actor,
    object: activity,
    published: instant,
    summary: reason,
    code,
  });
  await record("ni:///sha-256;B11kWEWjRCnFMxmTmLewWUQtGAybFAh8PKhaw-tojok.events", instant, { kind: "provider.refusal", service: "admissible-research-packet", code, reason, activityDigest: digest(activity) });
  return result;
}

function words(value) {
  return [...new Set(String(value).toLowerCase().split(/[^a-z0-9]+/u).filter((word) => word.length > 2 && !STOPWORDS.has(word)))];
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function textClaim(bundle, predicate) {
  for (const raw of Array.isArray(bundle?.claims) ? bundle.claims : []) {
    const claim = object(raw);
    const proposition = object(claim?.proposition);
    if (proposition?.predicate === predicate && typeof proposition.object === "string" && proposition.object.trim() !== "") return proposition.object.trim();
  }
  return undefined;
}

function assertedAt(bundle) {
  for (const raw of Array.isArray(bundle?.claims) ? bundle.claims : []) {
    const claim = object(raw);
    const time = object(claim?.time);
    if (typeof time?.asserted === "string" && validInstant(time.asserted)) return time.asserted;
  }
  return undefined;
}

function sourceUrl(bundle) {
  const direct = textClaim(bundle, "url");
  if (direct !== undefined && URL_PATTERN.test(direct)) return direct;
  for (const raw of Array.isArray(bundle?.claims) ? bundle.claims : []) {
    const citation = object(object(raw)?.provenance)?.citation;
    if (typeof citation === "string" && URL_PATTERN.test(citation)) return citation;
  }
  return undefined;
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./u, "").toLowerCase(); }
  catch { return undefined; }
}

function compact(value, maximum = 1200) {
  const text = String(value).replace(/\s+/gu, " ").trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 3).trimEnd()}...`;
}

function stripMarkup(value) {
  return String(value)
    .replace(/<[^>]*>/gu, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/\s+/gu, " ")
    .trim();
}

// Keep this deterministic sentence license aligned with the downstream
// Licensed Editorial State. The packet provider must prove that a commission
// is supportable before the publication creates the assignment; discovering
// this deficit after commissioning leaves dead work in the newsroom.
function assertionSentences(value) {
  const clean = stripMarkup(value);
  const pieces = clean.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/gu) ?? [];
  const seen = new Set();
  return pieces.map((piece) => piece.trim()).filter((piece) => {
    const key = piece.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
    if (piece.length < 35 || key === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

// Public Web Source's textDigest is a digest of the exact UTF-8 text bytes,
// not the JSON serialization of a JavaScript string. Object deliveries remain
// canonically digested by this service's ordinary digest function.
function publicWebTextDigest(value) {
  return digest(value);
}

function demandFrom(activity) {
  const source = object(activity?.object)?.sourceActivity;
  const demand = object(source)?.object;
  if (object(source)?.type !== "Create" || object(demand)?.type !== "AdmissibleResearchPacketDemand") return undefined;
  return { source, demand };
}

function inspectDemand(demand) {
  const assignment = object(demand?.assignment);
  const freshness = object(demand?.freshness);
  const budget = object(demand?.evidenceBudget);
  const currentEvidence = object(demand?.currentEvidence);
  const publicWebEvidenceSupplied = demand !== undefined && Object.prototype.hasOwnProperty.call(demand, "publicWebEvidence");
  const publicWebEvidence = publicWebEvidenceSupplied ? object(demand.publicWebEvidence) : undefined;
  const priorResearch = object(demand?.priorResearch);
  const primarySourceUrls = strings(demand?.primarySourceUrls);
  if (!assignment || !freshness || !budget || !priorResearch || !primarySourceUrls || currentEvidence === undefined && publicWebEvidence === undefined) {
    return { error: { code: "invalid-demand", reason: "assignment, freshness, evidence budget, primary-source URLs, prior research, and at least one exact current-evidence provider delivery are required" } };
  }
  if (publicWebEvidenceSupplied && publicWebEvidence === undefined) return { error: { code: "public-web-custody-unproven", reason: "supplied public Web evidence must be an ActivityStreams record" } };
  for (const field of ["assignmentId", "term", "beat"]) {
    if (typeof assignment[field] !== "string" || assignment[field].trim() === "") return { error: { code: "invalid-assignment", reason: `assignment.${field} is required` } };
  }
  if (typeof assignment.leadSourceUrl !== "string" || !URL_PATTERN.test(assignment.leadSourceUrl)) {
    return { error: { code: "invalid-assignment", reason: "assignment.leadSourceUrl must name the exact event-spine source" } };
  }
  if (typeof demand.sourcePolicyDigest !== "string" || !demand.sourcePolicyDigest.startsWith("ni:///sha-256;")) {
    return { error: { code: "missing-source-policy", reason: "the customer source-policy digest is required" } };
  }
  const maximumAgeHours = positiveInteger(freshness.maximumAgeHours);
  const minimumCurrentSources = positiveInteger(budget.minimumCurrentSources);
  const maximumCurrentSources = positiveInteger(budget.maximumCurrentSources);
  const minimumPrimarySources = nonnegativeInteger(budget.minimumPrimarySources);
  const minimumIndependentDomains = positiveInteger(budget.minimumIndependentDomains);
  const minimumDistinctAssertions = positiveInteger(budget.minimumDistinctAssertions);
  const minimumLeadAssertions = positiveInteger(budget.minimumLeadAssertions);
  const targetMinimumWords = positiveInteger(budget.targetMinimumWords);
  const maximumWordsPerAssertion = positiveInteger(budget.maximumWordsPerAssertion);
  if (maximumAgeHours === undefined || minimumCurrentSources === undefined || maximumCurrentSources === undefined || minimumPrimarySources === undefined || minimumIndependentDomains === undefined || minimumDistinctAssertions === undefined || minimumLeadAssertions === undefined || targetMinimumWords === undefined || maximumWordsPerAssertion === undefined || minimumCurrentSources > maximumCurrentSources || minimumPrimarySources > maximumCurrentSources || minimumIndependentDomains > maximumCurrentSources || minimumLeadAssertions > minimumDistinctAssertions) {
    return { error: { code: "invalid-evidence-budget", reason: "positive freshness, source, assertion, and word-license bounds plus a coherent nonnegative originating-source floor are required" } };
  }
  if (primarySourceUrls.length < minimumPrimarySources || primarySourceUrls.some((url) => !URL_PATTERN.test(url))) {
    return { error: { code: "invalid-primary-source-declaration", reason: "the customer must name enough exact primary-source URLs for its requested evidence budget" } };
  }
  let delivery;
  if (currentEvidence !== undefined) {
    if (currentEvidence["@context"] !== CONTEXT || currentEvidence.type !== "Accept" || currentEvidence.actor !== NEWSCABLE_ACTOR || object(currentEvidence.object)?.type !== "SourceBundleDelivery") {
      return { error: { code: "retrieval-treaty-unavailable", reason: "supplied Newscable evidence must be an exact SourceBundleDelivery from the separately contracted provider" } };
    }
    delivery = object(currentEvidence.object);
    if (!Array.isArray(delivery.bundles) || digest(delivery.bundles) !== delivery.deliveryDigest) {
      return { error: { code: "current-evidence-custody-unproven", reason: "Newscable bundle delivery digest does not bind the delivered values" } };
    }
  }
  let publicWebDelivery;
  if (publicWebEvidence !== undefined) {
    if (publicWebEvidence["@context"] !== CONTEXT || publicWebEvidence.type !== "Accept" || publicWebEvidence.actor !== WEB_SOURCE_ACTOR || object(publicWebEvidence.object)?.type !== "PublicWebSourceDelivery") {
      return { error: { code: "public-web-custody-unproven", reason: "public Web evidence must be an exact accepted PublicWebSourceDelivery from the separately contracted provider" } };
    }
    publicWebDelivery = object(publicWebEvidence.object);
    const results = Array.isArray(publicWebDelivery.results) ? publicWebDelivery.results : undefined;
    const obstructions = Array.isArray(publicWebDelivery.obstructions) ? publicWebDelivery.obstructions : undefined;
    if (!results || !obstructions || digest({ results, obstructions }) !== publicWebDelivery.deliveryDigest) {
      return { error: { code: "public-web-custody-unproven", reason: "public Web delivery digest does not bind its acquired results and obstructions" } };
    }
    for (const raw of results) {
      const result = object(raw);
      if (!result || typeof result.requestedUrl !== "string" || typeof result.text !== "string" || publicWebTextDigest(result.text) !== result.textDigest) {
        return { error: { code: "public-web-custody-unproven", reason: "public Web result text is not bound to its declared digest and requested URL" } };
      }
    }
  }
  if (priorResearch["@context"] !== CONTEXT || priorResearch.type !== "Accept" || priorResearch.actor !== CORPUS_MANAGEMENT_ACTOR) {
    return { error: { code: "prior-research-custody-unproven", reason: "prior research must be an exact accepted result from Corpus Management" } };
  }
  const prior = object(priorResearch.object);
  if (!prior || !["PriorResearchRecoveryResult", "PriorResearchProjectionResult"].includes(prior.type)
    || !object(prior.contextualBundle) || !object(prior.gapBundle)
    || digest(prior.contextualBundle) !== prior.contextualBundleDigest
    || digest(prior.gapBundle) !== prior.gapBundleDigest) {
    return { error: { code: "prior-research-custody-unproven", reason: "Corpus Management result does not bind its contextual and gap bundles" } };
  }
  return { assignment, freshness: { maximumAgeHours }, budget: { minimumCurrentSources, maximumCurrentSources, minimumPrimarySources, minimumIndependentDomains, minimumDistinctAssertions, minimumLeadAssertions, targetMinimumWords, maximumWordsPerAssertion }, primarySourceUrls, currentEvidence, delivery, publicWebEvidence, publicWebDelivery, priorResearch, prior };
}

function refused(code, reason, diagnosis) {
  return Object.freeze({ status: "refused", code, reason, diagnosis: Object.freeze(diagnosis) });
}

function bundleSource(raw, wire, termWords, explicitPrimary, instant) {
  const delivery = object(raw);
  const bundle = object(delivery?.bundle);
  if (!delivery || !bundle || typeof delivery.subject !== "string" || typeof delivery.digest !== "string" || digest(bundle) !== delivery.digest) return undefined;
  const url = sourceUrl(bundle);
  const title = textClaim(bundle, "title");
  const summary = textClaim(bundle, "summary") ?? "";
  if (url === undefined || title === undefined) return undefined;
  const publicationClaim = textClaim(bundle, "published");
  const published = publicationInstant(publicationClaim);
  const asserted = assertedAt(bundle);
  // A provider's ingestion/assertion time is a freshness fallback only when it
  // made no publication-time claim. It must never launder an invalid or old
  // publication date into current evidence.
  const evidenceInstant = publicationClaim === undefined ? asserted : published;
  const matchedTerms = termWords.filter((term) => `${title}\n${summary}`.toLowerCase().includes(term));
  const primary = explicitPrimary.has(url);
  const score = (primary ? 50 : 0) + matchedTerms.length * 10 + (title.toLowerCase().includes(termWords.join(" ")) ? 20 : 0);
  const ageHours = evidenceInstant === undefined ? Number.POSITIVE_INFINITY : (Date.parse(instant) - Date.parse(evidenceInstant)) / 3_600_000;
  return Object.freeze({ delivery, bundle, url, title, summary, published, asserted, evidenceInstant, ageHours, matchedTerms, score, wire, primary, publicWeb: false });
}

/** Turn an exact PublicWebSourceDelivery result into a source candidate. The
 * provider result, not model prose or customer assertion, supplies every
 * field. Retrieval time is custody time, never a substitute for a source's
 * publication time. */
function publicWebSource(raw, wire, termWords, explicitPrimary, instant) {
  const result = object(raw);
  if (!result || typeof result.requestedUrl !== "string" || typeof result.text !== "string" || typeof result.textDigest !== "string" || publicWebTextDigest(result.text) !== result.textDigest) return undefined;
  const finalUrl = typeof result.finalUrl === "string" && URL_PATTERN.test(result.finalUrl) ? result.finalUrl : result.requestedUrl;
  if (!URL_PATTERN.test(finalUrl)) return undefined;
  const title = typeof result.title === "string" && result.title.trim() !== "" ? result.title.trim() : undefined;
  const published = publicationInstant(result.published);
  if (title === undefined || published === undefined) return undefined;
  const requestedUrl = result.requestedUrl;
  const summary = result.text;
  const matchedTerms = termWords.filter((term) => `${title}\n${summary}`.toLowerCase().includes(term));
  const primary = explicitPrimary.has(requestedUrl) || explicitPrimary.has(finalUrl);
  const score = (primary ? 50 : 0) + matchedTerms.length * 10 + (title.toLowerCase().includes(termWords.join(" ")) ? 20 : 0);
  const ageHours = (Date.parse(instant) - Date.parse(published)) / 3_600_000;
  const subject = `public-web:${niSuffix(digest({ requestedUrl, finalUrl, textDigest: result.textDigest }))}`;
  const claims = [
    ["title", title],
    ["url", finalUrl],
    ["published", published],
    ["summary", summary],
  ].map(([predicate, value], index) => Object.freeze({ id: `${subject}:${index + 1}`, proposition: Object.freeze({ predicate, object: value }), force: "reports", status: "source-supported", provenance: Object.freeze({ citation: finalUrl }), time: Object.freeze({ asserted: published }) }));
  const bundle = Object.freeze({ subject, claims: Object.freeze(claims) });
  const delivery = Object.freeze({ wire, subject, digest: digest(bundle), bundle });
  return Object.freeze({ delivery, bundle, url: finalUrl, requestedUrl, title, summary, published, asserted: published, evidenceInstant: published, ageHours, matchedTerms, score, wire, primary, publicWeb: true, textDigest: result.textDigest });
}

function bundleClaims(candidate) {
  return (Array.isArray(candidate.bundle.claims) ? candidate.bundle.claims : []).flatMap((raw, index) => {
    const claim = object(raw);
    const proposition = object(claim?.proposition);
    if (typeof proposition?.predicate !== "string" || typeof proposition.object !== "string" || proposition.object.trim() === "") return [];
    const evidenceObject = proposition.predicate === "summary" ? candidate.summary : proposition.object;
    return [Object.freeze({
      kind: "producing-content.farm.research-packet.claim",
      sourceSubject: candidate.delivery.subject,
      sourceUrl: candidate.url,
      id: typeof claim.id === "string" ? claim.id : `claim:${candidate.delivery.subject}:${index + 1}`,
      predicate: proposition.predicate,
      // The summary claim is the report's evidentiary body. Preserve the same
      // substantive cut carried to the writer so the licensed editorial state
      // can authorize details beyond an arbitrary opening excerpt. Metadata
      // claims remain compact.
      object: compact(evidenceObject, proposition.predicate === "summary" ? MAX_CURRENT_SOURCE_CONTEXT_CHARACTERS : 1200),
      ...(typeof claim.force === "string" ? { force: claim.force } : { force: "alleges" }),
      ...(typeof claim.status === "string" ? { status: claim.status } : { status: "source-supported" }),
      ...(candidate.asserted === undefined ? {} : { assertedAt: candidate.asserted }),
    })];
  });
}

function priorContext(prior) {
  const sources = Array.isArray(prior.contextualBundle.sources) ? prior.contextualBundle.sources : [];
  return sources.flatMap((raw) => {
    const source = object(raw);
    const snippets = Array.isArray(source?.snippets) ? source.snippets : [];
    const sourceDigest = typeof source?.digest === "string" ? source.digest : "digest-unavailable";
    const sourceName = typeof source?.relativeToRoot === "string" ? source.relativeToRoot : typeof source?.path === "string" ? source.path : "unnamed prior record";
    return snippets.flatMap((rawSnippet) => {
      const snippet = object(rawSnippet);
      if (typeof snippet?.text !== "string" || snippet.text.trim() === "") return [];
      return [`Prior research (${sourceName}, ${sourceDigest}): ${compact(snippet.text, 700)}`];
    });
  });
}

function warrant(sources, claims) {
  const domains = uniqueStrings(sources.flatMap((source) => source.domain === undefined ? [] : [source.domain]));
  const supported = claims.filter((claim) => /support|allege|report|assert/iu.test(`${claim.status ?? ""} ${claim.force ?? ""}`)).length;
  const refuted = claims.filter((claim) => /refut|deny|disput|false|unsupported/iu.test(`${claim.status ?? ""} ${claim.force ?? ""}`)).length;
  return Object.freeze({
    status: "research-intake",
    supportClaimCount: supported,
    refutationClaimCount: refuted,
    uncertainClaimCount: Math.max(0, claims.length - supported - refuted),
    sourceDomainCount: domains.length,
    sourceDomains: Object.freeze(domains),
    note: "Current-provider claims are source-bound research intake. Prior-corpus excerpts are context only and license no public factual claim.",
  });
}

export function formAdmissibleResearchPacket(demand, instant = new Date().toISOString()) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const inspected = inspectDemand(demand);
  if (inspected.error) return refused(inspected.error.code, inspected.error.reason, { failureLayer: "contract", requiredMove: "repair-demand-or-provider-custody", replayFrom: "contract-solicitation" });
  const termWords = words(inspected.assignment.term);
  const explicitPrimary = new Set(inspected.primarySourceUrls);
  const publicResults = Array.isArray(inspected.publicWebDelivery?.results) ? inspected.publicWebDelivery.results : [];
  const publicTexts = new Map(publicResults.flatMap((raw) => {
    const result = object(raw);
    if (!result || typeof result.requestedUrl !== "string" || typeof result.text !== "string") return [];
    const keys = [result.requestedUrl, ...(typeof result.finalUrl === "string" ? [result.finalUrl] : [])];
    return keys.map((key) => [key, result.text]);
  }));
  const minimumMatchedTerms = Math.min(2, termWords.length);
  const cableCandidates = (inspected.delivery?.bundles ?? []).flatMap((raw) => {
    const wire = typeof object(raw)?.wire === "string" ? object(raw).wire : inspected.assignment.beat;
    const value = bundleSource(raw, wire, termWords, explicitPrimary, instant);
    if (value === undefined) return [];
    const acquiredText = publicTexts.get(value.url);
    return [acquiredText === undefined || acquiredText.length <= value.summary.length ? value : Object.freeze({ ...value, summary: acquiredText, publicWebText: true })];
  });
  const publicWebCandidates = publicResults.flatMap((raw) => {
    const value = publicWebSource(raw, inspected.assignment.beat, termWords, explicitPrimary, instant);
    return value === undefined ? [] : [value];
  });
  const candidates = [...cableCandidates, ...publicWebCandidates]
    .filter((source) => source.primary || source.matchedTerms.length >= minimumMatchedTerms)
    .sort((left, right) => right.score - left.score || (Date.parse(right.evidenceInstant ?? "") || 0) - (Date.parse(left.evidenceInstant ?? "") || 0) || left.url.localeCompare(right.url));
  const fresh = candidates.filter((source) => source.ageHours >= 0 && source.ageHours <= inspected.freshness.maximumAgeHours);
  const selected = [];
  const selectedUrls = new Set();
  const selectedDomains = new Set();
  const admit = (source) => {
    if (selected.length >= inspected.budget.maximumCurrentSources || selectedUrls.has(source.url)) return;
    selected.push(source);
    selectedUrls.add(source.url);
    const domain = domainOf(source.url);
    if (domain !== undefined) selectedDomains.add(domain);
  };
  for (const source of fresh.filter((candidate) => candidate.primary)) admit(source);
  for (const source of fresh) {
    const domain = domainOf(source.url);
    if (domain !== undefined && !selectedDomains.has(domain)) admit(source);
    if (selectedDomains.size >= inspected.budget.minimumIndependentDomains) break;
  }
  for (const source of fresh) admit(source);
  const primaryCount = selected.filter((source) => source.primary).length;
  if (selected.length < inspected.budget.minimumCurrentSources || primaryCount < inspected.budget.minimumPrimarySources || selectedDomains.size < inspected.budget.minimumIndependentDomains) {
    return refused("fresh-evidence-insufficient", `the contracted evidence carries ${selected.length} fresh relevant sources, ${primaryCount} customer-declared primary sources, and ${selectedDomains.size} independent source domains`, {
      failureLayer: "source-acquisition",
      requiredMove: "refresh-current-sources-or-narrow-the-reporting-question",
      replayFrom: "provider-procurement",
      evidence: Object.freeze({ candidateCount: candidates.length, freshSourceCount: selected.length, primarySourceCount: primaryCount, independentSourceDomainCount: selectedDomains.size, minimumIndependentDomains: inspected.budget.minimumIndependentDomains, maximumAgeHours: inspected.freshness.maximumAgeHours }),
    });
  }
  const eventSpine = selected.find((source) => termWords.every((term) => source.matchedTerms.includes(term)));
  if (eventSpine === undefined) {
    return refused("assignment-lens-unsupported", "no fresh current source supports the whole named assignment lens", {
      failureLayer: "source-acquisition",
      requiredMove: "acquire-a-source-for-the-named-event-or-reform-the-assignment",
      replayFrom: "provider-procurement",
      evidence: Object.freeze({ candidateCount: candidates.length, freshSourceCount: fresh.length, requiredTerms: Object.freeze(termWords) }),
    });
  }
  const assertionCount = selected.reduce((count, source) => count + assertionSentences(source.summary).length, 0);
  const leadAssertionCount = selected
    .filter((source) => source.url === inspected.assignment.leadSourceUrl || source.requestedUrl === inspected.assignment.leadSourceUrl)
    .reduce((count, source) => count + assertionSentences(source.summary).length, 0);
  const licensedMaximumWords = assertionCount * inspected.budget.maximumWordsPerAssertion;
  const evidenceDeficits = [
    ...(assertionCount < inspected.budget.minimumDistinctAssertions
      ? [`carries ${assertionCount} distinct source assertions but requires ${inspected.budget.minimumDistinctAssertions}`]
      : []),
    ...(leadAssertionCount < inspected.budget.minimumLeadAssertions
      ? [`carries ${leadAssertionCount} lead-source assertions but requires ${inspected.budget.minimumLeadAssertions}`]
      : []),
    ...(licensedMaximumWords < inspected.budget.targetMinimumWords
      ? [`licenses at most ${licensedMaximumWords} words, below the ${inspected.budget.targetMinimumWords}-word commission floor`]
      : []),
  ];
  if (evidenceDeficits.length > 0) {
    return refused("commission-evidence-budget-insufficient", `the contracted reporting cannot yet support this commission: ${evidenceDeficits.join("; ")}`, {
      failureLayer: "source-acquisition",
      requiredMove: "acquire-fuller-reporting-or-narrow-the-commissioned-genre",
      replayFrom: "provider-procurement",
      evidence: Object.freeze({
        assertionCount,
        leadAssertionCount,
        licensedMaximumWords,
        minimumDistinctAssertions: inspected.budget.minimumDistinctAssertions,
        minimumLeadAssertions: inspected.budget.minimumLeadAssertions,
        targetMinimumWords: inspected.budget.targetMinimumWords,
        maximumWordsPerAssertion: inspected.budget.maximumWordsPerAssertion,
      }),
    });
  }
  const intakeSources = selected.map((source) => Object.freeze({
    kind: "producing-content.farm.research-packet.source",
    subject: source.delivery.subject,
    wire: source.wire,
    path: source.publicWeb ? `urn:public-web-source:${niSuffix(source.textDigest)}` : `urn:newscable-bundle:${niSuffix(source.delivery.digest)}`,
    title: source.title,
    url: source.url,
    ...(domainOf(source.url) === undefined ? {} : { domain: domainOf(source.url) }),
    ...(source.published === undefined ? {} : { published: source.published }),
    ...(source.asserted === undefined ? {} : { assertedAt: source.asserted }),
    score: source.score,
    primary: source.primary,
    matchedTerms: Object.freeze(source.matchedTerms),
    ...(source.summary === "" ? {} : { summary: compact(source.summary, MAX_CURRENT_SOURCE_CONTEXT_CHARACTERS) }),
  }));
  const claims = selected.flatMap(bundleClaims);
  const priorLines = priorContext(inspected.prior);
  const gaps = Array.isArray(inspected.prior.gapBundle.gaps) ? inspected.prior.gapBundle.gaps : [];
  const sourceDomains = uniqueStrings(intakeSources.flatMap((source) => source.domain === undefined ? [] : [source.domain]));
  const risks = [
    Object.freeze({ code: "demand-is-not-evidence", severity: "note", message: "The assignment and search terms select attention but license no factual claim." }),
    Object.freeze({ code: "prior-research-is-context-only", severity: "note", message: "Recovered prior research may guide reporting but is not promoted into source claims by this service." }),
    ...(primaryCount === 0 ? [Object.freeze({ code: "primary-source-unproven", severity: "warning", message: "No current source in this packet has been established as a primary record. Do not describe the lead article as primary; seek the originating document or state the limitation." })] : []),
    ...(gaps.length === 0 ? [] : [Object.freeze({ code: "prior-research-gaps", severity: "warning", message: `Corpus Management reported ${gaps.length} explicit recovery gaps; do not infer that omitted or unmatched material is absent from the wider corpus.` })]),
    ...(sourceDomains.length === 1 && intakeSources.length > 1 ? [Object.freeze({ code: "single-domain-source-concentration", severity: "warning", message: "All current sources come from one domain; repetition is not independent corroboration." })] : []),
  ];
  const packet = Object.freeze({
    kind: "producing-content.farm.research-packet",
    generatedAt: instant,
    term: inspected.assignment.term,
    beat: inspected.assignment.beat,
    queryTerms: Object.freeze(termWords),
    sourceCount: candidates.length,
    selectedCount: intakeSources.length,
    intakeSources: Object.freeze(intakeSources),
    claims: Object.freeze(claims),
    warrant: warrant(intakeSources, claims),
    editorialRisks: Object.freeze(risks),
    sourceUrls: Object.freeze(intakeSources.map((source) => source.url)),
    candidateReferences: Object.freeze(intakeSources.map((source) => Object.freeze({ id: `source-${digest({ url: source.url, title: source.title }).slice(-12)}`, type: "webpage", title: source.title, URL: source.url, ...(source.domain === undefined ? {} : { "container-title": source.domain }) }))),
    context: Object.freeze([...intakeSources.map((source, index) => `[${index + 1}] ${source.title} (${source.domain ?? source.url}, ${source.published ?? source.assertedAt ?? "undated"})${source.summary === undefined ? "" : ` - ${source.summary}`}`), ...priorLines]),
    accountableAttention: Object.freeze({
      rule: "make-the-click-preserve-the-warrant",
      headlineMustPreserve: Object.freeze(["attribution", "modality", "scope", "uncertainty", "correction state"]),
      forbiddenStrengthenings: Object.freeze(["source claim to newsroom fact", "may/could/alleged to does/did/proves", "single case to trend", "correlation to causation", "reader demand to evidence"]),
      correctionSurfacePolicy: "Any later correction to a cited claim must propagate to body copy, headline, social cards, feeds, JSON-LD, and syndicated packets.",
    }),
    constraints: Object.freeze([
      "This packet is research intake, not a publishable article.",
      "Only current-provider claims are admitted as source-bound factual evidence.",
      "Prior-corpus excerpts are contextual leads until separately sourced and admitted.",
      "Publication still requires a licensed editorial state, exact-manuscript judgment, and explicit publishing action.",
    ]),
  });
  const custody = Object.freeze({
    ...(inspected.delivery === undefined ? {} : { currentEvidence: Object.freeze({ provider: NEWSCABLE_ACTOR, deliveryDigest: inspected.delivery.deliveryDigest, selectedBundleDigests: Object.freeze(selected.filter((source) => !source.publicWeb).map((source) => source.delivery.digest)) }) }),
    ...(inspected.publicWebDelivery === undefined ? {} : { publicWebEvidence: Object.freeze({ provider: WEB_SOURCE_ACTOR, deliveryDigest: inspected.publicWebDelivery.deliveryDigest, selectedTextDigests: Object.freeze(selected.flatMap((source) => {
      if (source.publicWeb && typeof source.textDigest === "string") return [source.textDigest];
      const result = (inspected.publicWebDelivery.results ?? []).map(object).find((candidate) => candidate?.requestedUrl === source.url || candidate?.finalUrl === source.url);
      return typeof result?.textDigest === "string" ? [result.textDigest] : [];
    })), treatment: "source-bound-current-evidence" }) }),
    priorResearch: Object.freeze({ provider: CORPUS_MANAGEMENT_ACTOR, resultId: inspected.prior.id ?? null, contextualBundleDigest: inspected.prior.contextualBundleDigest, gapBundleDigest: inspected.prior.gapBundleDigest, treatment: "context-only" }),
    sourcePolicyDigest: demand.sourcePolicyDigest,
    customerTerritoryMutation: false,
  });
  return Object.freeze({ status: "admitted", packet, packetDigest: digest(packet), custody, custodyDigest: digest(custody) });
}

export async function solicitAdmissibleResearchPacket(activity, instant = new Date().toISOString()) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Offer" || activity?.target !== ACTOR || object(activity?.object)?.type !== "ServiceSolicitation") return rejection(activity, "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider", "invalid-solicitation", instant);
  const found = demandFrom(activity);
  if (!found) return rejection(activity, "solicitation carries no admissible-research-packet demand", "invalid-demand", instant);
  const inspected = inspectDemand(found.demand);
  if (inspected.error) return rejection(activity, inspected.error.reason, inspected.error.code, instant);
  const demandDigest = digest(found.demand);
  const offer = Object.freeze({
    "@context": CONTEXT,
    id: `urn:koios-news-service-section:research-packet-offer:${niSuffix(demandDigest)}`,
    type: "Offer",
    actor: ACTOR,
    target: activity.actor,
    published: instant,
    object: Object.freeze({
      type: "ServiceOffer",
      service: "admissible-research-packet",
      demandDigest,
      sourceActivity: found.source,
      capability: Object.freeze({ type: "AttenuatedCapability", effect: "form-admissible-research-packet", demandDigest }),
      dependencies: Object.freeze([
        Object.freeze({ providers: ["newscable-source-broker", "web-source-acquisition"], contracts: [NEWSCABLE_SOURCE_BUNDLE_CONTRACT, WEB_SOURCE_TEXT_CONTRACT], evidence: "SourceBundleDelivery|PublicWebSourceDelivery", mode: "one-or-both-current-evidence-carriers" }),
        Object.freeze({ provider: "corpus-management-team", contract: PRIOR_RESEARCH_CONTRACT, evidence: "PriorResearchRecoveryResult|PriorResearchProjectionResult" }),
      ]),
      price: Object.freeze({ amount: 0, currency: "USD" }),
    }),
  });
  await record("ni:///sha-256;B11kWEWjRCnFMxmTmLewWUQtGAybFAh8PKhaw-tojok.events", instant, { kind: "provider.offer", service: "admissible-research-packet", offerId: offer.id, demandDigest });
  return offer;
}

export async function invokeAdmissibleResearchPacket(activity, instant = new Date().toISOString()) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const contract = object(activity?.object);
  const offer = object(contract?.offer);
  const offerObject = object(offer?.object);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Accept" || activity?.target !== ACTOR || contract?.type !== "ServiceContract" || offer?.actor !== ACTOR || offerObject?.service !== "admissible-research-packet") return rejection(activity, "invocation must accept this provider's exact admissible-research-packet offer", "invalid-invocation", instant);
  const source = object(offerObject.sourceActivity);
  const demand = object(source?.object);
  if (!demand || digest(demand) !== offerObject.demandDigest || object(offerObject.capability)?.demandDigest !== offerObject.demandDigest) return rejection(activity, "offer demand or capability digest changed", "changed-demand", instant);
  const result = formAdmissibleResearchPacket(demand, instant);
  const exchangeId = niSuffix(digest({ offer: offer.id, instant })).slice(0, 24);
  const providerExchange = Object.freeze({ exchangeId, provider: "koios-news-service-section", service: "admissible-research-packet", price: Object.freeze({ amount: 0, currency: "USD" }), demandDigest: offerObject.demandDigest, resultDigest: digest(result), disposition: result.status, recordedAt: instant });
  const response = Object.freeze({ "@context": CONTEXT, type: result.status === "admitted" ? "Accept" : "Reject", actor: ACTOR, target: activity.actor, published: instant, object: Object.freeze({ type: "AdmissibleResearchPacketDelivery", result, providerExchange }) });
  await record("ni:///sha-256;B11kWEWjRCnFMxmTmLewWUQtGAybFAh8PKhaw-tojok.events", instant, { kind: "provider.delivery", ...providerExchange });
  return response;
}

const invokedAs = process.argv[1]?.split("/").at(-1);
if (process.argv[1] === fileURLToPath(import.meta.url) || ["solicit-admissible-research-packet", "invoke-admissible-research-packet"].includes(invokedAs)) {
  const binCommand = invokedAs === "solicit-admissible-research-packet" ? "solicit-service" : invokedAs === "invoke-admissible-research-packet" ? "invoke-service" : undefined;
  const command = binCommand ?? process.argv[2];
  const instant = (binCommand === undefined ? process.argv[3] : process.argv[2]) ?? new Date().toISOString();
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const activity = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const result = command === "solicit-service"
    ? await solicitAdmissibleResearchPacket(activity, instant)
    : command === "invoke-service"
      ? await invokeAdmissibleResearchPacket(activity, instant)
      : await rejection(activity, `unknown command: ${command}`, "unknown-command", instant);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
