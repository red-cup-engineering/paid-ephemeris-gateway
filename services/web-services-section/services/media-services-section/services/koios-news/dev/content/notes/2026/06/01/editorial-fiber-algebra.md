---
title: Restricted Fiber Algebra of Editorial Production
description: Models editorial production as an indexed family of editorial-state structures over reportable contexts — a Grothendieck fibration whose base is beats, jurisdictions, source sets, standards profiles, surfaces, audiences, and agent authority scopes, with restriction (pullback) of editorial states, opfibrational/bifibrational publication and projection, monoidal but partial fiberwise merge, and a bilattice-valued gate-and-settlement algebra. Argues the fiber structure is defensible for restriction, projection, validation, and provenance, but framing, synthesis, source credibility, legal judgment, and newsworthiness are not fibered without added policy. Includes typed operation tables, gate dispositions, and TypeScript-shaped interfaces.
date-created: 2026-06-19
date-modified: 2026-06-19
tags: [editorial-fiber-algebra, grothendieck-fibration, indexed-category, reindexing, bilattice, belnap-dunn, gate-algebra, settlement, provenance-monotone, correction, opfibration, bifibration, agentic-newsroom]
---

# A restricted fiber algebra of editorial production for agentic newsrooms

## Abstract

A “fiber algebra of editorial production” is plausible only in a restricted sense. The rigorous core is not “news as articles,” but an indexed family of editorial state structures over reportable contexts. For a base category \(B\) of contexts, an indexed category

\[
\mathcal E : B^{op}\to \mathbf{Cat}
\]

can model restriction of editorial states along narrower beats, jurisdictions, source sets, standards profiles, publication surfaces, audiences, or agent authority scopes. Its Grothendieck construction gives a fibration \(p:\int\mathcal E\to B\). Certain publication, syndication, and standards-projection operations are better treated covariantly, yielding local opfibrational or bifibrational structure. This works when the operations are explicitly typed, provenance-preserving, and policy-defined.

The theory fails if it treats editorial judgment as automatically canonical. Framing, synthesis, legal judgment, source credibility, and newsworthiness do not become categorical operations merely by naming them. They require additional policies, proof obligations, discourse semantics, or human authority. The defensible algebra is a typed, provenance-aware, partially ordered, partially effectful algebra of editorial acts over contexts, with gates as indexed predicates, modalities, closure/interior operators, and bilattice-valued settlement evaluations.

---

## 1. Problem

Let a **reportable context** be a structured object containing some combination of topic, time, place, jurisdiction, source availability, claim graph, audience, standards profile, artifact surface, agent authority, and demand signal. The formal problem is:

Given a category or family of categories \(B\) of reportable contexts, define for each \(b\in B\) a structured editorial fiber \(\mathcal E_b\) of editorial states over \(b\), and define how editorial states restrict, transport, merge, validate, publish, correct, retract, and serialize along morphisms in \(B\).

The guiding distinction is:

\[
\text{context movement} \neq \text{editorial transformation} \neq \text{artifact projection}.
\]

A topic restriction, a source-verification step, a standards projection, a draft rewrite, a legal check, and a correction are not the same kind of operation. Some are base morphisms, some are fiber morphisms, some are predicates, some are partial effects, and some are lossy projections.

A minimal formal object is:

\[
(B,\mathcal E, p, \otimes, G, P, R)
\]

where:

- \(B\) is a base category or indexed family of base categories.
- \(\mathcal E_b\) is the editorial fiber over \(b\).
- \(p:\int\mathcal E\to B\) is the projection from total editorial states to their base contexts.
- \(\otimes_b\) is a partial fiberwise merge/product of compatible editorial states.
- \(G_b\) is a family of gates/predicates over \(\mathcal E_b\).
- \(P\) is a provenance trace algebra.
- \(R\) is a revision/correction system over time and artifact versions.

The formal literature supports this direction: fibrations over a category \(B\) encode contravariant indexed categories \(B^{op}\to\mathbf{Cat}\), and the Grothendieck construction gives the correspondence between indexed categories and fibrations.

---

## 2. Standards and workflow landscape

Editorial production touches several standards layers, none of which alone gives the full algebra.

| Standard or system | Layer described | Formal role | What it cannot express |
|---|---:|---|---|
| IPTC Media Topics / NewsCodes | Topic vocabulary, news classification | Beat base; SKOS-like concept order | Claim support, legal readiness, public truth |
| IPTC NewsML-G2 | XML news exchange, package/item management | Artifact context, standards profile, serialization target | Internal claim settlement or full editorial reasoning |
| IPTC ninjs | JSON news representation and distribution | Artifact projection; JSON news item fiber | Full provenance logic unless extended |
| schema.org `NewsArticle`, `Claim`, `ClaimReview` | Public web structured data | Public artifact projection; search-readable claim/review layer | Internal gate history, contested evidence graph |
| RDF / RDFS / OWL / SKOS / SPARQL / SHACL / JSON-LD | Graph data, vocabularies, ontology, query, validation, linked-data serialization | Claim/provenance graph substrate; standards validation | Editorial truth, legal permission, source trust |
| PROV-O | Entities, activities, agents, derivation | Provenance trace algebra | Normative sufficiency or source credibility |
| C2PA / Content Credentials | Cryptographic content provenance | Media provenance artifact and validation gate | Whether the content is true, fair, or editorially warranted |
| RSS / Atom / JSON Feed / WebSub | Feed syndication and update propagation | Syndication projection | Claim-level support, correction logic beyond extensions |
| ActivityStreams / ActivityPub | Social/federated activity representation | Public/social activity projection | Newsroom-internal support graph |
| HTTP / URI / Link / caching / content negotiation | Resource identity, canonicality, freshness, representation negotiation | Artifact identity, versioning, reach, cache/freshness layer | Editorial warrant |
| Google structured data / News sitemaps / canonicalization / spam policies | Search discovery and eligibility | Demand/circulation constraints and validation gates | Evidence or truth |
| MCP / A2A / OpenAPI | Agent/tool/API interoperability | Agent/tool context, tool-use provenance | Editorial authority, truth, gate satisfaction |

IPTC NewsML-G2 is an IPTC news exchange standard for structuring, describing, managing, and exchanging news and events data, with XML schemas. IPTC ninjs is a JSON format for news distribution; version 3.2 was released in November 2025 and includes features such as `digitalSourceType` for human or generative-AI source-type information. IPTC Media Topics provide a maintained multilingual taxonomy of more than 1,200 news topics and are available in RDF and NewsML-G2 forms, making them suitable as a beat/category base.

The semantic web stack supplies machine-checkable graph structure. RDF graphs are sets of subject-predicate-object triples; PROV-O provides classes and properties for provenance; SHACL validates RDF data graphs against shapes; JSON-LD serializes linked data in JSON. These standards support graph representation and validation, but they do not decide whether a claim is sufficiently reported.

C2PA is especially important for agentic and synthetic-media workflows. It wraps provenance assertions into signed claims and manifests, but the specification explicitly says C2PA should not make a value judgment about whether provenance data is good or bad; it validates association, form, and tamper evidence, not truth.

Journalism ethics standards add normative constraints. The SPJ Code emphasizes verification before release, accountability, transparency, source identification where feasible, correction of mistakes, and minimization of harm. It is a guide rather than a legally enforceable rule set. Reuters’ Trust Principles identify integrity, independence, and freedom from bias as core commitments. These are not formal schemas, but they constrain gate design.

---

## 3. Candidate base categories

There is no single obvious base. A practical system should use several small base categories and a Grothendieck-style assembly, rather than one enormous undifferentiated category.

### 3.1 `Beat`

**Objects.** Topics, desks, coverage areas, IPTC Media Topics, SKOS concepts, local newsroom concepts.

**Morphisms.** A morphism \(u:b'\to b\) means \(b'\) is a refinement, narrowing, mapping, or localization of \(b\): for example “C2PA provenance” \(\to\) “media technology.”

**Identity.** The identity topic map preserves the same topic.

**Composition.** Refinements compose: “C2PA provenance” \(\to\) “media standards” \(\to\) “technology.”

**Preserves.** Topical inclusion and classification ancestry.

**Forgets or weakens.** A broadening map forgets specificity; a crosswalk may weaken meaning.

**Enriches.** A narrowing map may add local beat constraints.

**Failure case.** Editorial beats are not always taxonomies. “Climate justice,” “AI accountability,” or “Indigenous data sovereignty” may cut across IPTC categories.

### 3.2 `Context`

**Objects.** Tuples:

\[
(t,\ell,j,d,r,a)
\]

where \(t\) is time interval, \(\ell\) place, \(j\) jurisdiction, \(d\) deadline, \(r\) risk regime, and \(a\) source availability.

**Morphisms.** Restriction, time advance, jurisdiction change, deadline tightening, risk escalation.

**Identity.** No contextual change.

**Composition.** Tuplewise composition where defined.

**Preserves.** The context dimensions explicitly carried.

**Forgets.** Projection to a public context may remove protected source availability or private risk notes.

**Failure case.** Legal and safety regimes are not always monotone. Moving from one jurisdiction to another can invalidate prior permissions.

### 3.3 `SourceContext`

**Objects.** Source inventories:

\[
S=(\text{sources},\text{rights},\text{access},\text{authority},\text{history},\text{constraints})
\]

**Morphisms.** Add source, filter source, anonymize source, verify source, rights-clear source, embargo-lift source.

**Identity.** Same source set and metadata.

**Composition.** Source transformations compose if identifiers remain traceable.

**Preserves.** Source identity, access provenance, rights history.

**Forgets.** Public projection may remove raw source identity.

**Enriches.** Verification adds evidence about source authority.

**Failure case.** Source reliability is not a total order and cannot be reduced to a scalar without policy loss.

### 3.4 `ClaimContext`

**Objects.** Claim graphs:

\[
Q=(C,A,E,\vdash,\#)
\]

where \(C\) are normalized propositions, \(A\) attributed assertions, \(E\) evidence/provenance edges, \(\vdash\) support/entailment relations, and \(\#\) contradiction or attack relations.

**Morphisms.** Graph homomorphisms, entity-resolution quotients, paraphrase maps, contradiction refinements, standards translations.

**Identity.** Same claim graph.

**Composition.** Graph maps compose when proposition identity is preserved.

**Preserves.** Explicit claim identifiers and support/attack edges.

**Forgets.** A summary map may collapse fine-grained claim distinctions.

**Failure case.** Paraphrase may alter truth conditions. There is no safe morphism unless semantic preservation is checked.

### 3.5 `ArtifactContext`

**Objects.** Article page, CMS item, wire item, feed item, NewsML-G2 package, ninjs object, JSON-LD object, ActivityStreams object.

**Morphisms.** Projection, serialization, transcode, update, canonicalization, feed emission, deletion tombstone.

**Identity.** Same artifact representation.

**Composition.** JSON-LD projection followed by HTML embedding; ninjs projection followed by wire distribution.

**Preserves.** Public identifiers, title, timestamps, selected content, selected provenance.

**Forgets.** Internal reasoning, rejected claims, protected sources, gate details.

**Failure case.** Some transformations are many-to-one and not invertible.

### 3.6 `AudienceContext`

**Objects.** Language, accessibility profile, reader intent, platform, reading surface, audience risk.

**Morphisms.** Translation, localization, simplification, accessibility adaptation, platform shift.

**Preserves.** Intended information need and public claim commitments.

**Forgets.** Tone, nuance, legal disclaimers, source context may be weakened.

**Failure case.** Translation can change legal and epistemic meaning.

### 3.7 `StandardsContext`

**Objects.** Standards profiles: NewsML-G2, ninjs, schema.org, PROV-O, C2PA manifest profile, ActivityStreams, RSS, Atom, JSON Feed, SHACL shape set.

**Morphisms.** Profile inclusion, projection, validation-shape refinement, vocabulary mapping.

**Preserves.** Structural constraints and declared semantics.

**Forgets.** Anything outside the profile.

**Failure case.** Standards validity is not editorial validity. A false story can be valid JSON-LD.

### 3.8 `AgentContext`

**Objects.** Human reporter, editor, LLM agent, assignment agent, tool-using agent, fact-check assistant, adversarial agent, provenance evaluator.

**Morphisms.** Delegation, authorization narrowing, capability discovery, audit projection, revocation.

**Preserves.** Authority scope, accountability edges, capability declarations.

**Forgets.** Internal cognition or opaque model behavior.

**Failure case.** Agent capability descriptions can be untrusted or misleading.

### 3.9 `DemandContext`

**Objects.** Keyword, query cluster, search intent, freshness pressure, traffic opportunity, public-interest value, spam risk, ad suitability.

**Morphisms.** Query clustering, intent refinement, channel shift, localization, deduplication.

**Preserves.** Demand evidence and reader-need relation.

**Forgets.** Individual queries or platform-specific signals.

**Failure case.** Demand is not evidence. A high-volume query cannot support a factual claim.

---

## 4. Candidate editorial fibers

For a base object \(b\), define the editorial fiber \(\mathcal E_b\) as a category whose objects are editorial states over \(b\). A state is minimally:

\[
e_b=(S,O,C,A,P,G,D,R,F)
\]

where:

- \(S\): source observations.
- \(O\): normalized observations.
- \(C\): claim set.
- \(A\): attributed assertions.
- \(P\): provenance trace.
- \(G\): gate results and obligations.
- \(D\): draft/public artifact candidates.
- \(R\): rights, legal, privacy, and correction constraints.
- \(F\): freshness, salience, confidence, risk annotations.

A fiber morphism

\[
m:e\to e'
\]

is an editorial transformation over the same base context if it preserves source/provenance identifiers, respects authority constraints, and emits an audit record. Some morphisms are partial.

### Classification of candidate contents

| Item | Best formal location | Reason |
|---|---|---|
| Source observations | Fiber object | They are state over a context. |
| Attributed assertions | Fiber object and claim graph edge | They connect source, agent, claim, time. |
| Claim graphs | Fiber object | Core epistemic/editorial state. |
| Contradiction relations | Fiber object; also gate input | Needed for settlement. |
| Evidentiary support | Fiber object; provenance semiring annotation | Supports gate evaluation. |
| Provenance traces | Fiber object plus monotone trace algebra | Must persist through operations. |
| Gate states | Indexed predicates over fibers | Gate result depends on context. |
| Editorial obligations | Closure-generated fiber component | Gates can create obligations. |
| Legal/privacy/rights constraints | Fiber plus permission predicate | Some are state, some are gates. |
| Frame candidates | Fiber annotations or separate discourse structure | Not canonical claim operations. |
| Draft artifacts | Fiber object over artifact or story context | Drafts are not public claims by default. |
| Correction obligations | Closure over provenance and public artifact versions | Triggered by revision. |
| Publication readiness | Derived predicate/interior, not raw truth | Depends on epistemic, legal, standards gates. |
| Standards-valid output projections | Artifact fiber plus validation predicate | Validity is profile-relative. |
| Agent tool-use traces | Provenance fiber over agent/source context | Tool calls are activities. |
| Confidence/salience/freshness/risk | External annotation or ordered fiber dimension | Must not be collapsed into truth. |
| Demand signals | Separate indexed demand/circulation fiber | Demand must not create evidence. |

The fiber may be a category, preorder, lattice, or algebra depending on the layer. The safest implementation uses a category of typed states and partial morphisms, with several internal preorders: support order, provenance inclusion order, readiness order, permission order, and reach/circulation order.

---

## 5. Fibration and indexed-category constructions

### 5.1 Indexed editorial category

Let \(B\) be a category of reportable contexts. Define:

\[
\mathcal E:B^{op}\to\mathbf{Cat}.
\]

For a morphism \(u:b'\to b\), where \(b'\) is a more specific or restricted context, define a reindexing functor:

\[
u^*:\mathcal E_b\to\mathcal E_{b'}.
\]

Examples:

- Narrowing “technology” to “C2PA provenance” restricts claims and sources to the relevant subtopic.
- Moving from “global audience” to “EU audience” pulls back legal/privacy obligations.
- Moving from “internal claim graph” to “schema.org profile” pulls back only claims expressible in that profile.
- Moving from “all sources” to “publicly attributable sources” restricts source references.

This is contravariant because a base refinement induces a restriction of editorial state.

### 5.2 Grothendieck fibration

The total category \(\int\mathcal E\) has:

- Objects: pairs \((b,e)\), where \(e\in\mathcal E_b\).
- Morphisms: \((u,\alpha):(b',e')\to(b,e)\), where \(u:b'\to b\) in \(B\) and \(\alpha:e'\to u^*e\) in \(\mathcal E_{b'}\).
- Projection: \(p(b,e)=b\), \(p(u,\alpha)=u\).

A cartesian morphism over \(u:b'\to b\) is the universal restriction:

\[
(b',u^*e)\to(b,e).
\]

This satisfies the fibration condition when restrictions are functorial up to coherent isomorphism. This is the most defensible “fiber” structure in the theory. The categorical background matches the standard correspondence between indexed categories and Grothendieck fibrations.

### 5.3 Opfibration for publication and projection

Some editorial movement is covariant. A publication projection has the form:

\[
u_!:\mathcal E_b \rightharpoonup \mathcal E_{b'}
\]

where \(b'\) is a public artifact context, feed context, or standards context.

Examples:

- Internal story state \(\to\) public article artifact.
- Published article \(\to\) RSS item.
- Published article \(\to\) ActivityStreams `Create`.
- Internal provenance graph \(\to\) public PROV-O subset.

This is only an opfibration when the pushforward is canonical relative to a fixed projection policy and has the appropriate universal property. Many publication acts are partial, lossy, and authority-dependent, so they are better modeled as partial opcartesian lifts or effectful morphisms, not automatic functors.

### 5.4 Bifibration

A bifibration is plausible where both restriction and projection exist and satisfy adjoint-like laws:

\[
u_! \dashv u^*
\]

Examples:

- Standards profile inclusion and best-effort projection.
- Public artifact projection and inclusion of public facts back into internal state.
- Jurisdictional restriction and aggregation of permitted public claims.

Failure case: editorial synthesis normally lacks a universal property. A summary is not necessarily a colimit unless a newsroom defines a deterministic synthesis policy.

### 5.5 Double category or equipment

A double category is useful when evidence is relational rather than functional.

- Objects: contexts.
- Vertical arrows: context refinement or projection.
- Horizontal arrows: evidence/reporting relations between sources, claims, agents, and artifacts.
- 2-cells: audits showing that one evidentiary relation refines, validates, or projects another.

This is useful for source-to-claim and claim-to-artifact relations, where a function is too strict.

### 5.6 Monoidal fibration

Within a fiber, compatible states may combine:

\[
e_1\otimes_b e_2
\]

where \(\otimes_b\) merges source observations, claim graphs, obligations, and provenance traces.

Laws should hold only under compatibility conditions:

- Associativity up to canonical graph isomorphism.
- Unit is the empty editorial state over \(b\).
- Provenance trace union is monotone.
- Contradictions are preserved, not erased.
- Rights and legal constraints combine by meet, not by optimistic union.

Failure case: two drafts over the same context may be rhetorically incompatible, legally incompatible, or claim-inconsistent. The product must be partial or conflict-aware.

### 5.7 Doctrine or hyperdoctrine

Editorial gates are indexed predicates:

\[
G_b:\mathcal E_b\to \mathsf{GateResult}.
\]

A doctrine can model predicates such as:

- Every public factual claim has support.
- Every anonymous source claim has editor approval.
- Some authorized source supports the attribution.
- All quoted text has a source pointer.
- No blocked legal/privacy constraint is active.

SHACL plays this role for RDF graph shape validation: it checks that a data graph conforms to a shapes graph, but does not establish truth.

### 5.8 Sheaf or stack-like structure

A sheaf-style account is plausible for local reporting contexts. Suppose a story context is covered by jurisdictions, source sets, or subtopics. Local editorial states can glue if they agree on overlaps:

\[
e_i|_{U_i\cap U_j}\cong e_j|_{U_i\cap U_j}.
\]

Failure cases are common:

- Entity identifiers disagree.
- Source rights differ by jurisdiction.
- A claim is publishable in one context but blocked in another.
- Local reports contradict each other.
- Anonymous-source constraints prevent descent.

Therefore, sheaf language is useful for diagnosing gluing failures, but not all editorial production is sheaf-like.

---

## 6. Algebra of editorial operations

Let an editorial operation be typed as:

\[
op:\mathcal E_b \rightharpoonup \mathcal E_{b'}
\]

with explicit domain, codomain, variance, audit output, and laws.

| Operation | Domain → codomain | Formal type | Algebraic properties | Invariants and audit | Failure cases |
|---|---|---|---|---|---|
| `ingest` | External resource → source observation fiber | Partial effectful morphism | Provenance-inflationary; lossy if normalized | URI, fetch time, hash, license, headers, agent/tool | Unreachable source, rights block, malformed input |
| `observe` | Source/tool event → assertion trace | Effectful observation | Adds trace; does not imply truth | Who/what/when/tool/input/output | Tool hallucination, unverifiable output |
| `normalize` | Raw observation → normalized observation | Endomorphism | Idempotent if canonical | Raw pointer preserved | Parse error, destructive cleanup |
| `entityResolve` | Claim/source graph → quotient/refined graph | Graph rewrite | Monotone in trace; nonmonotone in entity identity | Mapping, confidence, reviewer | Ambiguous or wrong merge |
| `assign` | Beat/demand/source context → story context | Section creation / context morphism | Priority-changing; not truth-changing | Assigning agent, authority, rationale | Demand without evidence |
| `report` | Source context → claim fiber | Fiber morphism | Trace-inflationary | Notes, observations, source links | Unsupported assertion |
| `attribute` | Claim → attributed claim | Fiber morphism | Preserves claim text and source link | Source identity or anonymity reason | Misattribution |
| `quote` | Source text → quoted assertion | Extraction morphism | Should preserve literal span | Span offsets, source hash | Fabricated or decontextualized quote |
| `paraphrase` | Assertion → rewritten assertion | Semantic rewrite | Not automatically idempotent or reversible | Source claim link, semantic check | Meaning drift |
| `synthesize` | Multiple claim states → draft state | Partial gluing or rewrite | Not canonical unless policy-defined | Claims used, excluded, contested | Unsupported inference |
| `frame` | Claim/draft state → framed draft | Discourse operation | Noncanonical; may be nonmonotone | Editorial rationale, affected claims | Bias, distortion, unsupported angle |
| `verify` | Claim graph → evaluated claim graph | Gate/closure process | Trace-inflationary; status may change | Evidence reviewed, reviewer/tool | Insufficient evidence |
| `factCheck` | Public or draft claims → support statuses | Gate predicate plus status update | May mark supported/refuted/contested | Claim IDs, evidence, standard used | Ambiguous claim, missing context |
| `copyEdit` | Draft artifact → draft artifact | Endomorphism | Should preserve claim commitments | Text diff, editor | Alters claim meaning |
| `standardsCheck` | Artifact → validation result | Predicate | Idempotent on fixed artifact/profile | Profile, schema, errors | Invalid schema/profile drift |
| `legalCheck` | Draft/state → permission result | Modal predicate | May block; not truth-changing | Legal basis, jurisdiction | Unresolved risk |
| `riskAssess` | Draft/state → risk annotation | Predicate/annotation | May be nonmonotone | Risk factors, affected groups | Incomplete harm model |
| `rightsClear` | Source/artifact → rights permission | Predicate/effect | Can enrich permissions | License, consent, embargo | Rights unknown |
| `publish` | Internal state → public artifact | Partial pushforward/projection | Lossy, effectful, versioned | URL, version, hash, gates passed | Gate failure |
| `syndicate` | Published artifact → feed/social item | Functor/projection | Usually lossy; preserves canonical ID | Feed ID, timestamp, target | Surface constraint failure |
| `update` | Public artifact v1 → v2 | Version morphism | Public content changes; trace grows | Diff, reason, modified time | Silent overwrite |
| `correct` | Artifact/claim state → corrected state | Revision plus obligation closure | Claim content nonmonotone; provenance monotone | Correction note, affected claims | Concealed correction |
| `retract` | Public artifact → retracted artifact | Retraction operation | Availability/content nonmonotone; trace monotone | Retraction reason, replacement, notices | Legal conflict, incomplete syndication |
| `archive` | Published artifact → archived artifact | Reach/state morphism | Does not alter support | Archive URI, cache policy | Broken canonical record |
| `deindex/noindex` | Artifact → circulation-restricted artifact | Circulation operation | Reach-deflationary | Robots/meta/header, reason | Search cache lag |
| `discloseAIUse` | Artifact/provenance → disclosed artifact | Monotone provenance extension | Idempotent by disclosure key | AI system, role, human review | Vague or false disclosure |
| `attachProvenance` | Artifact → artifact + provenance | Monotone annotation | Append-only where possible | PROV/C2PA/ninjs metadata | Privacy/source protection |
| `validateAgainstSchema` | Standards artifact → validation result | Predicate | Idempotent for fixed profile | Schema/shape version | Closed/open-world mismatch |
| `generateStructuredData` | Public artifact → JSON-LD/RDF | Projection | Lossy; profile-relative | Mapping profile, validation | Misleading structured data |
| `generateFeedItem` | Public artifact → RSS/Atom/JSON Feed | Projection/functor | Preserves item identity and dates | Feed ID, canonical URL | Feed consumers lose detail |
| `generateSocialItem` | Public artifact → ActivityStreams item | Projection | Surface-specific, lossy | Activity type, actor, object | Context collapse |

The invariant running through all operations is:

\[
\text{No public factual commitment may be created without either support, attribution, or explicit contestation.}
\]

A second invariant is:

\[
\text{Editorial content may revise nonmonotonically, but provenance must grow monotonically except for lawful redaction with an audit marker.}
\]

---

## 7. Gate and settlement algebra

A gate must not collapse truth, support, legality, permission, readiness, and standards validity into one flag.

For each claim \(p\), define a four-valued support status:

\[
\sigma(p)=(s,r)\in\{0,1\}^2
\]

where \(s\) means some support exists and \(r\) means some refutation or denial exists.

| Status | Pair | Meaning |
|---|---:|---|
| `unmentioned` / `no evidence` | \((0,0)\) | No current support or refutation |
| `affirmed` / `supported` | \((1,0)\) | Supported and not currently refuted |
| `denied` / `refuted` | \((0,1)\) | Refuted or denied |
| `contradicted` / `contested` | \((1,1)\) | Both support and refutation/denial exist |

This follows the Belnap-Dunn/FDE tradition of reasoning with incomplete and inconsistent information, and bilattices provide a formal setting for reasoning with two orders, such as truth and information/knowledge.

Define separate evaluations:

\[
\begin{aligned}
K_b(e) &: \text{epistemic support}\\
P_b(e) &: \text{editorial permission}\\
L_b(e) &: \text{legal permission}\\
V_b(e) &: \text{standards validity}\\
R_b(e) &: \text{publication readiness}\\
T_b(e) &: \text{public truth-claim status}\\
A_b(e) &: \text{attributed reportability}
\end{aligned}
\]

A gate result is:

```ts
type GateDisposition =
  | "pass"
  | "warn"
  | "block"
  | "overrideRequired";

interface GateResult {
  disposition: GateDisposition;
  obligations: string[];
  evidence: string[];
  blockers: string[];
  warnings: string[];
  overrideRoles?: string[];
}
```

Gate composition:

- **All gates required:** meet operation; any blocker blocks.
- **Alternative gates:** join operation; at least one sufficient path passes.
- **Warnings:** accumulate monotonically.
- **Override:** does not turn false into true; it records authorized publication despite unresolved gate state.
- **Emergency publication:** allowed only as a separate modality producing extra obligations.
- **Correction-triggered invalidation:** any changed claim, source, or provenance edge invalidates dependent gate results.

Important operators:

| Operator | Type | Meaning |
|---|---|---|
| `supportClosure` | Closure | Adds claims entailed or supported by accepted evidence policy |
| `obligationClosure` | Closure | Adds required requests for comment, disclosure, correction, rights review |
| `publicationInterior` | Interior | Removes or marks nonpublishable parts |
| `settlement` | Modal/selection operator | Converts contested evidence into publishable attributed form |
| `validationShape` | Predicate | SHACL/JSON Schema structural validation |
| `truthMaintenance` | Dependency update | Recomputes consequences after evidence changes |

Truth-maintenance systems maintain reasons for beliefs and update downstream beliefs when supporting reasons change; provenance semirings provide algebraic tools for recording how data depends on source derivations. Argumentation frameworks also matter: Dung-style abstract argumentation models arguments and attack relations, which is close to contested editorial traces. Belief revision contributes the formal distinction between adding information and revising a theory after conflict.

---

## 8. Agentic editorial fibers

An agent can appear in several roles:

- source;
- reporter;
- editor;
- assignment desk;
- standards checker;
- fact-check assistant;
- search/demand analyst;
- syndicator;
- reader;
- adversary;
- provenance evaluator.

For an agent context \(g\), define the fiber \(\mathcal A_g\) with objects:

\[
a_g=(\text{identity},\text{capabilities},\text{authority},\text{tools},\text{policies},\text{memory},\text{assertions},\text{tool traces},\text{responsibility})
\]

An agent’s **editorial authority** is not its technical capability. Authority is a permission object:

\[
\mathrm{Auth}(g)=
(\text{may observe},\text{may draft},\text{may assert},\text{may approve},\text{may publish},\text{may override})
\]

A tool call is formally a provenance activity:

\[
\text{ToolCall} =
(\text{input},\text{tool},\text{schema},\text{resource},\text{output},\text{error},\text{agent},\text{time})
\]

It becomes an observation only if the tool/resource is an observational source. It becomes an assertion only if an agent extracts or states a claim from it. It becomes editorially publishable only if the claim passes support, attribution, and permission gates.

MCP specifies model-invocable tools exposed by servers, with names, descriptions, schemas, and human-in-the-loop safety expectations. A2A describes an interoperability protocol for opaque agentic applications, including discovery of capabilities and structured communication without exposing internal state or tools. OpenAPI describes API surfaces and semantics in a machine-readable format. These protocols describe capability and communication, not editorial warrant.

A minimal agentic provenance record:

```ts
interface ToolUseTrace {
  id: URI;
  agentId: URI;
  responsibility: "human" | "agent" | "shared" | "unknown";
  inputPromptHash: string;
  inputPromptRedacted?: string;
  toolName: string;
  toolSchemaHash: string;
  toolServerId?: URI;
  resourceAccessed?: URI;
  argumentsHash: string;
  outputHash?: string;
  error?: string;
  extractedClaims: URI[];
  assertionsMade: URI[];
  gatesAffected: URI[];
  startedAt: string;
  endedAt: string;
}
```

Agentic failure handling:

- Hallucinated drafts are separated from claim assertions.
- Tool descriptions are treated as untrusted assertions until verified.
- A public claim must have a support edge to a source observation or be explicitly attributed as a report.
- Human consent is represented as an authorization edge, not as prose.
- Tool outputs that affect gates are recorded as gate dependencies.
- Adversarial or unreliable agents receive authority restrictions, not merely lower confidence.

---

## 9. Search and demand fibers

Demand must be modeled separately from epistemic support.

Define a demand fiber \(\mathcal D_b\) over a context \(b\):

\[
d_b=(\text{queries},\text{clusters},\text{intent},\text{freshness pressure},\text{traffic opportunity},\text{public interest},\text{spam risk},\text{evidence relation})
\]

Demand can induce assignment priority:

\[
\mathrm{Plan}_b:\mathcal D_b\to \mathcal E_b
\]

but only into assignment obligations, not into factual support.

Invariants:

1. Demand creates no evidence edges.
2. Demand may create a reporting obligation: “investigate whether \(p\).”
3. Demand may select an audience context.
4. Demand may not convert a query into a claim.
5. Search optimization must pass a public-interest and anti-spam gate.

Google’s structured data guidelines recommend JSON-LD for structured data and warn that misleading or nonrepresentative structured data can make a page ineligible for rich results or be treated as spam. Google also defines scaled content abuse as producing many pages primarily to manipulate rankings rather than help users. News sitemaps, canonicalization, and article structured data are circulation and discovery tools, not evidence.

A query cluster can be treated as a cover of reader information needs:

\[
\{q_i\to d\}_{i\in I}
\]

but gluing those needs into a story assignment requires compatibility: common topic, public-interest warrant, non-duplication, available evidence, and spam-risk acceptance.

---

## 10. Worked example

### Scenario

An agentic newsroom monitors the topic “content provenance and AI-generated media.” It ingests:

1. An official organizational statement: a newsroom partner says it will add Content Credentials to certain image workflows.
2. A technical standard: the C2PA specification.
3. A search/social signal: users are asking whether Content Credentials prove that an image is real.

The sources support some claims and refute others.

### 10.1 Base objects

```ts
const beatB = {
  kind: "Beat",
  topic: "media technology/content provenance",
  vocabulary: "IPTC Media Topics + local newsroom concept"
};

const sourceB = {
  kind: "SourceContext",
  sources: ["officialStatement", "c2paSpec", "searchDemandSignal"]
};

const claimB = {
  kind: "ClaimContext",
  graph: "content-provenance-claims"
};

const standardsB = {
  kind: "StandardsContext",
  profiles: ["schema.org NewsArticle", "PROV-O", "ninjs", "JSON Feed"]
};

const artifactB = {
  kind: "ArtifactContext",
  surfaces: ["wireItem", "canonicalWebArticle", "jsonFeedItem"]
};
```

### 10.2 Claims

| Claim | Status | Support/refutation |
|---|---|---|
| \(c_1\): C2PA manifests contain signed provenance assertions. | supported | C2PA spec describes assertions, claims, manifests, and signatures. |
| \(c_2\): C2PA validation proves the factual truth of a media asset. | refuted | C2PA says it should not make value judgments about whether provenance is good or bad. |
| \(c_3\): The partner says it will deploy Content Credentials in a workflow. | attributed-supported | Official statement supports attribution, not independent success. |
| \(c_4\): All AI-generated images can be detected by Content Credentials. | unsupported/contested | Not established by the sources. |

C2PA supports \(c_1\) and refutes \(c_2\)’s overclaim.

### 10.3 Reindexing operations

1. **Beat restriction**

   \[
   u^*:\mathcal E_{\text{media technology}}\to\mathcal E_{\text{content provenance}}
   \]

   keeps claims about C2PA and provenance, drops unrelated media-tech claims.

2. **Public-source restriction**

   \[
   v^*:\mathcal E_{\text{all sources}}\to\mathcal E_{\text{publicly attributable sources}}
   \]

   removes private notes and protected source identifiers.

3. **Standards-profile restriction**

   \[
   w^*:\mathcal E_{\text{internal graph}}\to\mathcal E_{\text{schema.org + PROV-O + ninjs}}
   \]

   keeps only fields expressible in the target standards or extensions.

### 10.4 Editorial morphisms

```ts
ingest(officialStatement) -> SourceObservation
ingest(c2paSpec) -> SourceObservation
ingest(searchDemandSignal) -> DemandObservation

entityResolve("Content Credentials", "C2PA manifest") -> EntityMap

factCheck(draftClaims) -> {
  c1: "supported",
  c2: "refuted",
  c3: "attributed-supported",
  c4: "unsupported"
}

frame(draft, "what Content Credentials do and do not prove") -> DraftArtifact
```

The frame is allowed only because it does not create a stronger claim than the support graph permits.

### 10.5 Gate

A support gate over the claim fiber:

\[
G_{\mathrm{support}}(e)=
\begin{cases}
\text{pass} & \text{if every public factual claim is supported or attributed}\\
\text{warn} & \text{if a claim is contested and marked as contested}\\
\text{block} & \text{if an unsupported claim is asserted as fact}
\end{cases}
\]

The draft sentence “Content Credentials prove an image is real” is blocked. A settled sentence is permitted:

> The C2PA specification supports verifying provenance assertions and tamper evidence, but it does not itself judge whether the underlying content is true.

### 10.6 Publication pushforward

\[
\pi_!:\mathcal E_{\text{internal editorial state}}\rightharpoonup
\mathcal E_{\text{public artifact}}
\]

This creates:

- wire item;
- canonical article;
- JSON-LD structured data;
- PROV-O subset;
- ninjs item;
- JSON Feed item.

It loses:

- private prompt text;
- internal legal notes;
- rejected claim \(c_4\) unless disclosed as a misconception;
- raw search logs;
- internal source reliability scores;
- full gate deliberation.

### 10.7 Serialization sketches

JSON-LD public article:

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "What Content Credentials can and cannot prove",
  "datePublished": "2026-06-10T14:00:00-05:00",
  "dateModified": "2026-06-10T14:00:00-05:00",
  "isBasedOn": [
    { "@type": "CreativeWork", "name": "C2PA Technical Specification" },
    { "@type": "CreativeWork", "name": "Official deployment statement" }
  ],
  "about": [
    { "@type": "Thing", "name": "C2PA" },
    { "@type": "Thing", "name": "Content Credentials" }
  ]
}
```

PROV-style trace:

```json
{
  "@context": {
    "prov": "http://www.w3.org/ns/prov#"
  },
  "@graph": [
    {
      "@id": "source:c2pa-spec",
      "@type": "prov:Entity"
    },
    {
      "@id": "activity:factcheck-001",
      "@type": "prov:Activity",
      "prov:used": "source:c2pa-spec"
    },
    {
      "@id": "artifact:wire-v1",
      "@type": "prov:Entity",
      "prov:wasGeneratedBy": "activity:publish-001",
      "prov:wasDerivedFrom": ["source:c2pa-spec", "source:official-statement"]
    }
  ]
}
```

ninjs-style sketch:

```json
{
  "uri": "urn:newsroom:wire:content-credentials-001",
  "type": "text",
  "versionCreated": "2026-06-10T14:00:00-05:00",
  "firstCreated": "2026-06-10T14:00:00-05:00",
  "headlines": {
    "main": "What Content Credentials can and cannot prove"
  },
  "subjects": [
    {
      "name": "media technology",
      "code": "local:media-technology"
    }
  ],
  "digitalSourceType": "humanEditedAgentAssisted",
  "bodies": [
    {
      "role": "main",
      "value": "Content Credentials can carry provenance assertions, but they do not by themselves establish that an image is true."
    }
  ]
}
```

JSON Feed item:

```json
{
  "id": "urn:newsroom:wire:content-credentials-001",
  "url": "https://example.news/content-credentials-can-cannot-prove",
  "title": "What Content Credentials can and cannot prove",
  "date_published": "2026-06-10T14:00:00-05:00",
  "date_modified": "2026-06-10T14:00:00-05:00",
  "content_text": "Content Credentials can carry provenance assertions, but they do not by themselves establish that an image is true."
}
```

JSON Feed requires active item identifiers, supports update metadata, and is designed as a JSON syndication format. Atom and RSS provide XML feed forms, while ActivityStreams and ActivityPub describe activity-oriented social/federated publication.

### 10.8 Correction

Later, the official partner corrects its deployment date. The newsroom revises \(c_3\).

Formal operation:

\[
\mathrm{correct}:
(e_{\text{public},v1}, c_3=\text{date}_1)
\to
(e_{\text{public},v2}, c_3=\text{date}_2)
\]

Properties:

- Claim content changes nonmonotonically.
- Provenance trace grows monotonically.
- Public artifact receives `dateModified`.
- Feed item keeps active `id` but updates modified date.
- Syndication traces receive update notices.
- Prior version is not silently erased.

---

## 11. Implementation sketch

### 11.1 Core types

```ts
type URI = string;

type ContextKind =
  | "Beat"
  | "Context"
  | "SourceContext"
  | "ClaimContext"
  | "ArtifactContext"
  | "AudienceContext"
  | "StandardsContext"
  | "AgentContext"
  | "DemandContext";

interface BaseContext {
  id: URI;
  kind: ContextKind;
  facets: Record<string, unknown>;
}

interface BaseMorphism {
  id: URI;
  from: URI;
  to: URI;
  kind:
    | "restriction"
    | "projection"
    | "translation"
    | "version"
    | "delegation"
    | "profileMap";
  preserves: string[];
  forgets?: string[];
  enriches?: string[];
}
```

### 11.2 Claim and provenance graph

```ts
type FourStatus = "none" | "supported" | "refuted" | "contested";

interface Claim {
  id: URI;
  propositionKey: string;
  text: string;
  entities: URI[];
  status: FourStatus;
  publicMode: "asserted" | "attributed" | "question" | "withheld";
}

interface SourceObservation {
  id: URI;
  sourceId: URI;
  observedAt: string;
  rawRef: URI;
  hash?: string;
  rights?: string;
  access: "public" | "private" | "embargoed" | "anonymous";
}

interface AssertionTrace {
  id: URI;
  claimId: URI;
  sourceObservationId: URI;
  agentId: URI;
  polarity: "support" | "refute" | "mention";
  quoteSpan?: {
    start: number;
    end: number;
    hash: string;
  };
  activityId: URI;
  createdAt: string;
}

interface ClaimSet {
  claims: Map<URI, Claim>;
  assertions: AssertionTrace[];
  contradicts: Array<[URI, URI]>;
  supports: Array<[URI, URI]>;
}
```

### 11.3 Editorial fiber

```ts
interface EditorialState {
  id: URI;
  contextId: URI;
  sources: SourceObservation[];
  claims: ClaimSet;
  drafts: DraftArtifact[];
  obligations: EditorialObligation[];
  gates: GateResult[];
  provenance: ProvenanceEvent[];
  annotations: Record<string, unknown>;
}

interface EditorialFiber<B extends BaseContext = BaseContext> {
  base: B;

  identity(state: EditorialState): EditorialMorphism;

  compose(
    f: EditorialMorphism,
    g: EditorialMorphism
  ): EditorialMorphism;

  tensor(
    left: EditorialState,
    right: EditorialState
  ): Result<EditorialState, FiberError>;

  restrict(
    morphism: BaseMorphism,
    state: EditorialState
  ): Result<EditorialState, FiberError>;
}
```

### 11.4 Reindexing

```ts
interface Reindex {
  baseMorphism: BaseMorphism;

  pullback(
    state: EditorialState
  ): Result<EditorialState, FiberError>;

  pushforward?(
    state: EditorialState,
    target: BaseContext
  ): Result<EditorialState, FiberError>;
}
```

### 11.5 Gates

```ts
type GateDisposition =
  | "pass"
  | "warn"
  | "block"
  | "overrideRequired";

interface GateResult {
  gateId: URI;
  disposition: GateDisposition;
  evidence: URI[];
  obligations: URI[];
  warnings: string[];
  blockers: string[];
  overrideRoles?: string[];
  evaluatedAt: string;
}

interface Gate {
  id: URI;
  scope:
    | "claim"
    | "draft"
    | "artifact"
    | "source"
    | "agent"
    | "standards"
    | "legal"
    | "demand";

  dependencies(state: EditorialState): URI[];

  evaluate(
    state: EditorialState,
    context: BaseContext
  ): GateResult;

  monotonicity:
    | "monotone"
    | "antitone"
    | "nonmonotone"
    | "idempotent";
}
```

### 11.6 Editorial morphisms

```ts
interface AuditRecord {
  id: URI;
  operation: string;
  actor: URI;
  startedAt: string;
  endedAt?: string;
  inputs: URI[];
  outputs: URI[];
  toolUse?: URI[];
  rationale?: string;
}

interface EditorialMorphism {
  id: URI;
  fromContext: URI;
  toContext: URI;
  domainState: URI;
  codomainState?: URI;
  operation: string;

  apply(
    state: EditorialState
  ): Promise<Result<EditorialState, EditorialError>>;

  audit: AuditRecord;

  laws: {
    provenanceMonotone: boolean;
    preservesClaimIds?: boolean;
    preservesPublicMeaning?: boolean;
    lossy?: boolean;
    partial?: boolean;
  };
}
```

### 11.7 Publication and standards projection

```ts
type StandardsKind =
  | "NewsML-G2"
  | "ninjs"
  | "schema.org"
  | "PROV-O"
  | "C2PA"
  | "RSS"
  | "Atom"
  | "JSONFeed"
  | "ActivityStreams";

interface StandardsArtifact {
  id: URI;
  kind: StandardsKind;
  mediaType: string;
  payload: unknown;
  sourceState: URI;
  generatedAt: string;
  validation: GateResult[];
  lossReport: string[];
}

interface PublishProjection {
  id: URI;
  target: StandardsKind;

  project(
    state: EditorialState
  ): Result<StandardsArtifact, ProjectionError>;

  validate(
    artifact: StandardsArtifact
  ): GateResult;
}
```

### 11.8 Correction propagation

```ts
interface ClaimRevision {
  claimId: URI;
  oldText: string;
  newText: string;
  reason: string;
  sourceObservationId: URI;
}

interface Correction {
  id: URI;
  artifactId: URI;
  fromVersion: string;
  toVersion: string;
  revisions: ClaimRevision[];
  publicNotice: string;
  createdAt: string;
  responsibleAgent: URI;
}

function applyCorrection(
  state: EditorialState,
  correction: Correction
): Result<EditorialState, EditorialError> {
  // 1. Update affected claims.
  // 2. Mark prior artifact version superseded.
  // 3. Append provenance activity.
  // 4. Recompute dependent gates.
  // 5. Regenerate public artifact projections.
  // 6. Emit feed/update/syndication notices.
  throw new Error("sketch");
}
```

### 11.9 Test suite plan

1. Identity and composition laws for base morphisms.
2. Pullback functor laws: \((v\circ u)^*=u^*\circ v^*\).
3. Provenance monotonicity for ingest, report, verify, publish, correct.
4. Copy-edit preservation of claim references.
5. Publish rejects unsupported public factual claims.
6. Contested claims require attributed/contested language.
7. Standards projection produces valid JSON-LD, ninjs, feed, or RDF profile.
8. Correction invalidates dependent gates and regenerates affected artifacts.
9. Demand signals cannot create support edges.
10. Agent tool-use records include schema hash, input/output hashes, resource, and affected claims.
11. Feed updates preserve stable item identity.
12. Retraction/deindex operations change reach without deleting audit history.

---

## 12. What is actually fibered?

### Strongly fibered

These satisfy the indexed-category or fibration account reasonably well:

- Restricting editorial states along topic, jurisdiction, source-access, audience, or standards-profile refinements.
- Pulling claim graphs back to narrower contexts.
- Restricting artifact projections to public-safe fields.
- Evaluating gates as predicates indexed by context.
- Maintaining provenance subgraphs under context restriction.
- Standards validation over profile-indexed artifact fibers.

### Locally opfibered or bifibered

These work only under fixed policies:

- Publishing internal state to a public artifact.
- Projecting public artifacts to RSS, Atom, JSON Feed, ActivityStreams, NewsML-G2, or ninjs.
- Translating internal graphs to schema.org or PROV-O.
- Propagating corrections through versioned artifacts and syndication surfaces.

The required condition is that the projection be deterministic or policy-canonical enough to satisfy a universal property. Otherwise it is just a partial effectful operation.

### Monoidal but partial

Fiberwise merge is plausible for:

- source observations;
- provenance traces;
- compatible claim graphs;
- nonconflicting obligations.

It must be partial or conflict-aware because contradictions, rights restrictions, and incompatible frames cannot be silently merged.

### Not genuinely fibered without extra structure

These do not automatically satisfy fibration laws:

- framing;
- narrative synthesis;
- source credibility judgment;
- legal-risk judgment;
- newsworthiness;
- paraphrase;
- “angle” selection;
- AI hallucination detection;
- audience sensitivity;
- public-interest balancing.

They can be formalized only after adding explicit policy, semantics, authority, and testing criteria.

### Counterexamples

- A schema.org-valid `NewsArticle` can contain a false claim.
- A C2PA-valid image can still be misleading.
- A high-demand query can be unsupported by evidence.
- A paraphrase can preserve surface topic while changing truth conditions.
- Broadening a beat cannot reconstruct omitted sources.
- Two local reports may fail to glue because source rights differ across jurisdictions.
- A feed item cannot preserve the internal contradiction graph without extensions.

---

## 13. Open problems

1. **Base design.** Whether the best \(B\) is one category, a product of categories, a double category, or a fibred multicategory remains unresolved.
2. **Partiality.** Editorial operations are often partial and effectful. A total functor model is too strong.
3. **Canonical synthesis.** There is no general universal property for narrative synthesis or framing.
4. **Semantic preservation.** Paraphrase and translation need claim-level semantic checking.
5. **Rights and privacy.** These behave like modalities with jurisdictional dependence, not simple booleans.
6. **Correction algebra.** Public content revision is nonmonotone, while provenance should remain monotone; implementing both cleanly is difficult.
7. **Standards gaps.** Existing public standards do not fully express claim-level support, gate history, AI tool-use provenance, or correction dependencies.
8. **Agent authority.** Tool capability, agent output, and editorial authority must be formally separated.
9. **Search pressure.** Demand must influence assignment without becoming evidence.
10. **Trust metrics.** Source reliability, confidence, and risk should not be collapsed into scalar scores without a declared policy.
11. **Descent and gluing.** Local reports often fail sheaf conditions because identities, rights, and contradictions do not agree.
12. **Validation versus truth.** SHACL, JSON Schema, C2PA, and schema.org validate structure or provenance integrity, not editorial truth.

---

## 14. Annotated bibliography

- **IPTC NewsML-G2.** Primary XML-based IPTC standard for news exchange, packaging, events, metadata, and management. Use as an artifact and standards-context target, not as an internal claim-set proof system. https://iptc.org/std/NewsML-G2/
- **IPTC ninjs.** JSON news representation standard. Useful for wire and API-oriented artifact projection; recent versions include fields relevant to digital source type and AI-aware production. https://www.iptc.org/std/ninjs/
- **IPTC NewsCodes and Media Topics.** Controlled vocabularies and topic taxonomies suitable for beat bases and SKOS-like morphisms. https://iptc.org/standards/newscodes/ and https://iptc.org/standards/media-topics/
- **schema.org `NewsArticle`, `Claim`, `ClaimReview`.** Public structured-data vocabulary for articles and fact-checkable claims. Useful for web artifact projection and search readability, not full internal editorial provenance. https://schema.org/NewsArticle
- **RDF, RDFS, OWL, SKOS, SPARQL, SHACL, JSON-LD.** Graph substrate, vocabulary, ontology, query, validation, and JSON serialization stack. Use for claim/provenance graphs and profile validation, while remembering that graph validity is not truth. https://www.w3.org/TR/rdf11-concepts/
- **PROV-O.** W3C provenance ontology for entities, activities, agents, and derivations. Essential for audit traces and tool-use provenance. https://www.w3.org/TR/prov-o/
- **C2PA.** Content provenance and authenticity infrastructure for media assets. Important for signed manifests and tamper evidence; explicitly not a truth or editorial-value judgment system. https://spec.c2pa.org/
- **RSS, Atom, JSON Feed, WebSub.** Feed and update-distribution standards. Useful as syndication projections, but lossy relative to internal editorial fibers. https://www.rssboard.org/rss-specification and https://www.rfc-editor.org/info/rfc4287 and https://www.jsonfeed.org/version/1.1/
- **ActivityStreams and ActivityPub.** Social/federated activity vocabulary and protocol. Useful for social publication and update/delete activities, not internal reporting logic. https://www.w3.org/TR/activitystreams-core/ and https://www.w3.org/TR/activitypub/
- **HTTP semantics, caching, and Web Linking.** Provide resource identity, representation negotiation, caching, canonical links, and relation links. These support artifact/version/reach contexts. https://datatracker.ietf.org/doc/html/rfc9110
- **Google Search structured data, News sitemaps, canonicalization, and spam policies.** Important for discovery and circulation gates; not evidence. https://developers.google.com/search/docs/appearance/structured-data/article
- **SPJ Code of Ethics, Reuters Trust Principles, IFCN Code, Trust Project indicators.** Normative editorial constraints: verification, independence, transparency, accountability, correction, source handling. These become gate policies and obligations, not schemas alone. https://www.spj.org/spj-code-of-ethics/
- **Grothendieck fibrations, indexed categories, categorical logic.** Provide the mathematical basis for treating context restriction as an indexed category and total editorial states as a fibration. Example reference: Emily Riehl, notes on fibrations, https://emilyriehl.github.io/files/fibrations.pdf
- **Belnap-Dunn logic and bilattices.** Provide formal tools for incomplete and inconsistent evidence: supported, refuted, neither, or both.
- **Truth-maintenance, belief revision, argumentation, provenance semirings.** Provide computational models for dependency tracking, revision after contradiction, attack/support relations, and algebraic provenance.
- **MCP, A2A, OpenAPI.** Agent/tool/API standards and protocols. They describe invocation and interoperability, but editorial authority and claim support require an added newsroom-specific formal layer. https://modelcontextprotocol.io/ and https://github.com/a2aproject/A2A and https://swagger.io/specification/
