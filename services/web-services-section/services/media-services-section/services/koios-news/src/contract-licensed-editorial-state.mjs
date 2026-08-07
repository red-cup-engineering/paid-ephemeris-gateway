import { fileURLToPath } from "node:url";

import { ACTOR, CONTEXT, digest, niSuffix, record } from "./boundary.mjs";

export { ACTOR, CONTEXT, digest } from "./boundary.mjs";

const STOPWORDS = new Set([
  "about", "after", "amid", "and", "are", "for", "from", "how", "into",
  "its", "new", "not", "of", "on", "over", "the", "to", "under", "when", "with",
]);

function validInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) && !Number.isNaN(Date.parse(value));
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
  await record("ni:///sha-256;IqbDn9g94vxuccRscpcVHMWUfJ_jBGLflkwOzgJOdTo.events", instant, { kind: "provider.refusal", code, reason, activityDigest: digest(activity) });
  return result;
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function strings(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function words(value) {
  return [...new Set(String(value).toLowerCase().split(/[^a-z0-9]+/u).filter((word) => word.length > 2 && !STOPWORDS.has(word)))];
}

function sourceDomain(value) {
  try { return new URL(value).hostname.replace(/^www\./u, "").toLowerCase(); }
  catch { return undefined; }
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

function demandFrom(activity) {
  const source = object(activity?.object)?.sourceActivity;
  const demand = object(source)?.object;
  if (object(source)?.type !== "Create" || object(demand)?.type !== "LicensedEditorialStateDemand") return undefined;
  return { source, demand };
}

function inspectDemand(demand) {
  const assignment = object(demand?.assignment);
  const packet = object(demand?.researchPacket);
  const genreRequirements = object(demand?.genreRequirements);
  const targetWords = object(genreRequirements?.targetWords);
  const sectionPurposes = strings(genreRequirements?.sectionPurposes);
  const writerPromptLaws = strings(demand?.writerPromptLaws);
  const assignmentUrls = strings(assignment?.sourceUrls);
  const packetUrls = strings(packet?.sourceUrls);
  if (!assignment || !packet || !assignmentUrls || !packetUrls) {
    return { error: { code: "invalid-demand", reason: "assignment and research packet with source URL arrays are required", failureLayer: "contract", requiredMove: "repair-demand-carrier", replayFrom: "contract-solicitation" } };
  }
  for (const field of ["assignmentId", "term", "beat", "summary", "angle"]) {
    if (typeof assignment[field] !== "string" || assignment[field].trim() === "") {
      return { error: { code: "invalid-assignment", reason: `assignment.${field} is required`, failureLayer: "assignment", requiredMove: "repair-assignment-carrier", replayFrom: "assignment" } };
    }
  }
  if (typeof demand.genreId !== "string" || demand.genreId.trim() === "" || typeof demand.genreLawDigest !== "string" || typeof demand.publicationPolicyDigest !== "string") {
    return { error: { code: "missing-law", reason: "genre-law and publication-policy digests are required", failureLayer: "contract", requiredMove: "attach-exact-law-digests", replayFrom: "contract-solicitation" } };
  }
  if (!genreRequirements
    || !targetWords
    || positiveInteger(targetWords.minimum) === undefined
    || positiveInteger(targetWords.maximum) === undefined
    || positiveInteger(genreRequirements.minimumDistinctAssertions) === undefined
    || positiveInteger(genreRequirements.minimumPrimaryAssertions) === undefined
    || positiveInteger(genreRequirements.minimumIndependentSources) === undefined
    || positiveInteger(genreRequirements.maximumWordsPerAssertion) === undefined
    || positiveInteger(genreRequirements.minimumSections) === undefined
    || !sectionPurposes
    || sectionPurposes.length < genreRequirements.minimumSections
    || !writerPromptLaws
    || targetWords.maximum < targetWords.minimum) {
    return { error: { code: "invalid-genre-requirements", reason: "the exact genre evidence budget is required and must carry positive word and assertion bounds", failureLayer: "contract", requiredMove: "attach-exact-genre-evidence-budget", replayFrom: "contract-solicitation" } };
  }
  if (assignmentUrls.length === 0 || assignmentUrls.some((url) => !packetUrls.includes(url))) {
    return { error: { code: "unadmitted-source", reason: "every assignment source URL must be admitted by the research packet", failureLayer: "source-admission", requiredMove: "admit-or-remove-unlicensed-source", replayFrom: "source-admission" } };
  }
  if (!Array.isArray(packet.intakeSources) || !Array.isArray(packet.claims)) {
    return { error: { code: "invalid-packet", reason: "research packet must carry intake sources and source-bound claims", failureLayer: "sources", requiredMove: "rebuild-research-packet", replayFrom: "research-packet" } };
  }
  return { assignment, packet, assignmentUrls, genreRequirements, sectionPurposes, writerPromptLaws };
}

function refused(code, reason, diagnosis) {
  return Object.freeze({
    status: "refused",
    code,
    reason,
    diagnosis: Object.freeze(diagnosis),
  });
}

function sourceAssertions(packet, assignmentUrls) {
  const sources = packet.intakeSources.flatMap((value) => {
    const source = object(value);
    return source && typeof source.url === "string" && assignmentUrls.includes(source.url) ? [source] : [];
  });
  const assertions = [];
  for (const source of sources) {
    const packetSummary = packet.claims.find((value) => {
      const claim = object(value);
      return claim?.sourceUrl === source.url && claim?.predicate === "summary" && claim?.status !== "refuted";
    });
    const evidence = object(packetSummary)?.object ?? source.summary;
    if (typeof evidence !== "string") continue;
    const sourceId = String(source.subject ?? digest(source.url).slice(-16));
    for (const [index, text] of assertionSentences(evidence).entries()) {
      assertions.push(Object.freeze({
        id: `claim:${sourceId}:${index + 1}`,
        sourceSubject: sourceId,
        sourceUrl: source.url,
        sourceTitle: String(source.title ?? source.url),
        text,
        force: "alleges",
        status: "source-supported",
        attribution: "required",
        scope: "no broader than this source assertion",
        ...(typeof source.published === "string" ? { sourcePublished: source.published } : {}),
      }));
    }
  }
  return assertions;
}

export function formLicensedEditorialState(demand, instant = new Date().toISOString()) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const inspected = inspectDemand(demand);
  if (inspected.error) return refused(inspected.error.code, inspected.error.reason, {
    failureLayer: inspected.error.failureLayer,
    requiredMove: inspected.error.requiredMove,
    replayFrom: inspected.error.replayFrom,
  });
  const { assignment, packet, assignmentUrls, genreRequirements, sectionPurposes, writerPromptLaws } = inspected;
  const assertions = sourceAssertions(packet, assignmentUrls);
  const primary = packet.intakeSources.find((value) => object(value)?.url === assignmentUrls[0]);
  const required = words(assignment.term);
  const primaryEvidence = primary ? `${primary.title ?? ""} ${primary.summary ?? ""}`.toLowerCase() : "";
  const missingTerms = required.filter((word) => !primaryEvidence.includes(word));
  if (!primary || missingTerms.length > 0) {
    return refused(
      "assignment-exceeds-primary-source",
      `the primary admitted source does not carry the whole assignment lens; unsupported terms: ${missingTerms.join(", ") || "unknown"}`,
      {
        failureLayer: "assignment",
        requiredMove: "narrow-assignment-to-primary-event-or-acquire-matching-source",
        replayFrom: "assignment",
        evidence: Object.freeze({ unsupportedTerms: Object.freeze(missingTerms) }),
        ...(primary === undefined ? {} : { suggestedAssignment: Object.freeze({
          term: String(primary.title),
          summary: `Report the event “${String(primary.title)}” from the admitted primary source.`,
          angle: "Establish the reported event first. Add systems interpretation only where the admitted source warrants it.",
          sourceUrls: Object.freeze([String(primary.url)]),
        }) }),
      },
    );
  }
  const primaryTitle = String(primary.title ?? "").toLowerCase();
  const titleAnchors = required.filter((word) => primaryTitle.includes(word));
  const requiredTitleAnchors = Math.min(required.length, Math.max(1, Math.ceil(required.length / 2)));
  if (titleAnchors.length < requiredTitleAnchors) {
    return refused(
      "assignment-lacks-event-spine",
      `the assignment terms occur only in broad source context; the primary report title anchors ${titleAnchors.length} of ${required.length} distinctive terms`,
      {
        failureLayer: "assignment",
        requiredMove: "form-assignment-from-primary-reported-event",
        replayFrom: "assignment",
        evidence: Object.freeze({ titleAnchorCount: titleAnchors.length, distinctiveTermCount: required.length }),
        suggestedAssignment: Object.freeze({
          term: String(primary.title),
          summary: `Report the event “${String(primary.title)}” from the admitted primary source.`,
          angle: "Establish the reported event first. Add systems interpretation only where the admitted source warrants it.",
          sourceUrls: Object.freeze([String(primary.url)]),
        }),
      },
    );
  }
  const primaryClaims = assertions.filter((claim) => claim.sourceUrl === assignmentUrls[0]);
  if (primaryClaims.length < 3 || assertions.length < 3) {
    return refused(
      "reporting-needed",
      "the admitted sources do not carry three distinct source assertions for a reported-analysis spine",
      { failureLayer: "sources", requiredMove: "acquire-additional-reporting", replayFrom: "source-acquisition" },
    );
  }
  const independentDomains = new Set(assignmentUrls.flatMap((url) => sourceDomain(url) ?? []));
  if (independentDomains.size < genreRequirements.minimumIndependentSources) {
    return refused(
      "independent-sourcing-insufficient",
      `${demand.genreId} requires ${genreRequirements.minimumIndependentSources} independently admitted source domains; the assignment carries ${independentDomains.size}`,
      {
        failureLayer: "sources",
        requiredMove: "acquire-corroborating-or-contrary-reporting",
        replayFrom: "source-acquisition",
        evidence: Object.freeze({ admittedSourceCount: assignmentUrls.length, independentSourceDomainCount: independentDomains.size, minimumIndependentSources: genreRequirements.minimumIndependentSources }),
      },
    );
  }
  const minimumDistinctAssertions = genreRequirements.minimumDistinctAssertions;
  const minimumPrimaryAssertions = genreRequirements.minimumPrimaryAssertions;
  const maximumWordsPerAssertion = genreRequirements.maximumWordsPerAssertion;
  const targetMinimumWords = genreRequirements.targetWords.minimum;
  const targetMaximumWords = genreRequirements.targetWords.maximum;
  const licensedMaximumWords = Math.min(targetMaximumWords, assertions.length * maximumWordsPerAssertion);
  const evidenceDeficits = [
    ...(assertions.length < minimumDistinctAssertions
      ? [`carries ${assertions.length} distinct assertions but requires ${minimumDistinctAssertions}`]
      : []),
    ...(primaryClaims.length < minimumPrimaryAssertions
      ? [`carries ${primaryClaims.length} primary-source assertions but requires ${minimumPrimaryAssertions}`]
      : []),
    ...(licensedMaximumWords < targetMinimumWords
      ? [`licenses at most ${licensedMaximumWords} words, below the ${targetMinimumWords}-word floor`]
      : []),
  ];
  if (assertions.length < minimumDistinctAssertions
    || primaryClaims.length < minimumPrimaryAssertions
    || licensedMaximumWords < targetMinimumWords) {
    return refused(
      "evidence-budget-insufficient",
      `the admitted evidence budget is insufficient: ${evidenceDeficits.join("; ")}`,
      {
        failureLayer: "sources",
        requiredMove: "acquire-fuller-primary-reporting-or-narrow-commissioned-genre",
        replayFrom: "research-packet",
        evidence: Object.freeze({
          distinctAssertionCount: assertions.length,
          primaryAssertionCount: primaryClaims.length,
          minimumDistinctAssertions,
          minimumPrimaryAssertions,
          maximumWordsPerAssertion,
          targetMinimumWords,
          licensedMaximumWords,
        }),
      },
    );
  }
  const contextClaims = assertions.filter((claim) => claim.sourceUrl !== assignmentUrls[0]);
  const plannedClaims = [...primaryClaims, ...contextClaims];
  const minimumSections = genreRequirements.minimumSections;
  const sections = sectionPurposes.slice(0, minimumSections).map((purpose, index) => {
    const start = Math.floor((plannedClaims.length * index) / minimumSections);
    const end = Math.floor((plannedClaims.length * (index + 1)) / minimumSections);
    return Object.freeze({ id: `passage-${index + 1}`, purpose, claimIds: plannedClaims.slice(start, end).map(({ id }) => id) });
  }).filter((section) => section.claimIds.length > 0);
  if (sections.length < minimumSections) {
    return refused(
      "reporting-needed",
      `the evidence cannot license ${minimumSections} nonempty ${demand.genreId} passages`,
      { failureLayer: "sources", requiredMove: "acquire-additional-reporting", replayFrom: "source-acquisition" },
    );
  }
  const state = Object.freeze({
    kind: "koios-news.licensed-editorial-state",
    version: 1,
    formedAt: instant,
    assignment: Object.freeze({
      assignmentId: assignment.assignmentId,
      term: assignment.term,
      beat: assignment.beat,
      demandStatus: "attention-pressure-not-evidence",
    }),
    law: Object.freeze({
      genreLawDigest: demand.genreLawDigest,
      publicationPolicyDigest: demand.publicationPolicyDigest,
      invariant: "no public factual commitment absent from admitted source evidence",
    }),
    assertions: Object.freeze(assertions),
    plan: Object.freeze({
      genre: demand.genreId,
      evidenceBudget: Object.freeze({
        targetWords: Object.freeze({ minimum: targetMinimumWords, maximum: targetMaximumWords }),
        licensedMaximumWords,
        distinctAssertionCount: assertions.length,
        primaryAssertionCount: primaryClaims.length,
        maximumWordsPerAssertion,
        status: "cleared",
      }),
      headline: Object.freeze({
        subject: assignment.term,
        claimIds: primaryClaims.slice(0, 2).map(({ id }) => id),
        law: "intensify relevance, never certainty; preserve material attribution, modality, scope, uncertainty, and correction state",
      }),
      ledeClaimIds: primaryClaims.slice(0, 2).map(({ id }) => id),
      sections: Object.freeze(sections),
      interpretation: Object.freeze({
        requestedAngle: assignment.angle,
        authority: "editorial-purpose-only",
        law: "systems interpretation may organize supported assertions but may not supply facts, causes, motives, consequences, trends, or analogies",
      }),
      writerPromptLaws: Object.freeze(writerPromptLaws),
    }),
    prohibitions: Object.freeze([
      "do not treat the assignment, beat, requested angle, reader demand, or search term as evidence",
      "do not combine assertions from different events into one causal or thematic factual claim",
      "do not drop attribution or strengthen source modality",
      "do not introduce a factual sentence that cannot name its licensing claim IDs",
    ]),
    correctionPolicy: packet.accountableAttention?.correctionSurfacePolicy ?? "invalidate and regenerate every dependent circulation surface",
  });
  return Object.freeze({ status: "licensed", state, stateDigest: digest(state) });
}

export async function solicitLicensedEditorialState(activity, instant = new Date().toISOString()) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Offer" || activity?.target !== ACTOR || object(activity?.object)?.type !== "ServiceSolicitation") {
    return rejection(activity, "solicitation must be an ActivityStreams Offer<ServiceSolicitation> addressed to this provider", "invalid-solicitation", instant);
  }
  const found = demandFrom(activity);
  if (!found) return rejection(activity, "solicitation carries no licensed-editorial-state demand", "invalid-demand", instant);
  const inspected = inspectDemand(found.demand);
  if (inspected.error) return rejection(activity, inspected.error.reason, inspected.error.code, instant);
  const demandDigest = digest(found.demand);
  const offer = Object.freeze({
    "@context": CONTEXT,
    id: `urn:koios-news-service-section:offer:${niSuffix(demandDigest)}`,
    type: "Offer",
    actor: ACTOR,
    target: activity.actor,
    published: instant,
    object: Object.freeze({
      type: "ServiceOffer",
      service: "licensed-editorial-state",
      demandDigest,
      sourceActivity: found.source,
      capability: Object.freeze({ type: "AttenuatedCapability", effect: "form-licensed-editorial-state", demandDigest }),
      price: Object.freeze({ amount: 0, currency: "USD" }),
    }),
  });
  await record("ni:///sha-256;IqbDn9g94vxuccRscpcVHMWUfJ_jBGLflkwOzgJOdTo.events", instant, { kind: "provider.offer", offerId: offer.id, demandDigest });
  return offer;
}

export async function invokeLicensedEditorialState(activity, instant = new Date().toISOString()) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const contract = object(activity?.object);
  const offer = object(contract?.offer);
  const offerObject = object(offer?.object);
  if (activity?.["@context"] !== CONTEXT || activity?.type !== "Accept" || activity?.target !== ACTOR || contract?.type !== "ServiceContract" || offer?.actor !== ACTOR || offerObject?.service !== "licensed-editorial-state") {
    return rejection(activity, "invocation must accept this provider's exact licensed-editorial-state offer", "invalid-invocation", instant);
  }
  const source = object(offerObject.sourceActivity);
  const demand = object(source?.object);
  if (!demand || digest(demand) !== offerObject.demandDigest || object(offerObject.capability)?.demandDigest !== offerObject.demandDigest) {
    return rejection(activity, "offer demand or capability digest changed", "changed-demand", instant);
  }
  const result = formLicensedEditorialState(demand, instant);
  const exchangeId = niSuffix(digest({ offer: offer.id, instant })).slice(0, 24);
  const providerExchange = Object.freeze({
    exchangeId,
    provider: "koios-news-service-section",
    service: "licensed-editorial-state",
    price: Object.freeze({ amount: 0, currency: "USD" }),
    demandDigest: offerObject.demandDigest,
    resultDigest: digest(result),
    disposition: result.status,
    recordedAt: instant,
  });
  const response = Object.freeze({
    "@context": CONTEXT,
    type: result.status === "licensed" ? "Accept" : "Reject",
    actor: ACTOR,
    target: activity.actor,
    published: instant,
    object: Object.freeze({ type: "LicensedEditorialStateDelivery", result, providerExchange }),
  });
  await record("ni:///sha-256;IqbDn9g94vxuccRscpcVHMWUfJ_jBGLflkwOzgJOdTo.events", instant, { kind: "provider.delivery", ...providerExchange });
  return response;
}

const invokedAs = process.argv[1]?.split("/").at(-1);
if (process.argv[1] === fileURLToPath(import.meta.url) || ["solicit-licensed-editorial-state", "invoke-licensed-editorial-state"].includes(invokedAs)) {
  const binCommand = invokedAs === "solicit-licensed-editorial-state" ? "solicit-service" : invokedAs === "invoke-licensed-editorial-state" ? "invoke-service" : undefined;
  const command = binCommand ?? process.argv[2];
  const instant = (binCommand === undefined ? process.argv[3] : process.argv[2]) ?? new Date().toISOString();
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const activity = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const result = command === "solicit-service"
    ? await solicitLicensedEditorialState(activity, instant)
    : command === "invoke-service"
      ? await invokeLicensedEditorialState(activity, instant)
      : await rejection(activity, `unknown command: ${command}`, "unknown-command", instant);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
