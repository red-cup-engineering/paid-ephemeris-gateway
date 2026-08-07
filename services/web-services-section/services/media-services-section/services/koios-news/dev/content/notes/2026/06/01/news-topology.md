---
title: Formal News Topology
description: A skeptical formal account of news as a composite system — a site of reportable contexts carrying presheaf/sheaf-like assignments of attributed claim-provenance graphs, with closure operators for entailment, syndication reach, and freshness, categorical morphisms for editorial and syndication acts, bilattice/paraconsistent status for contested evidence, and event-calculus/belief-revision handling of correction. Argues a single topology of "news" is false; topology belongs to the claim-provenance layer only, embedded in workflow categories, temporal logic, provenance graphs, validation gates, and media theory. Includes a worked rail-yard incident with claim graph, JSON-LD/ninjs/PROV emissions, and correction propagation.
date-created: 2026-06-19
date-modified: 2026-06-19
tags: [news-topology, claim-provenance-graph, sheaf, presheaf, closure-operator, paraconsistent, bilattice, event-calculus, belief-revision, correction, gatekeeping, editorial-morphism, schema-org, ninjs, prov-o]
---

# Toward a Formal News Topology: A Research Memo

## Abstract

A rigorous “news topology” is **plausible only in a restricted sense**. The strongest candidate is not a single topology on “news,” but a composite formal system: a site of reportable contexts, presheaf/sheaf-like assignments of locally supported claim graphs, closure operators for entailment, publication readiness, reach, and freshness, plus categorical morphisms for editorial and syndication transformations. It is **false** if it claims that all of news production, circulation, and interpretation is topological. Gatekeeping, framing, source power, platform incentives, and reader interpretation require order-theoretic, graph-theoretic, temporal, provenance, and sociological models alongside any topology.

The primitive should not be “article” or “event” alone. The most stable primitive for formalization is an **attributed, time-indexed claim with provenance and editorial status**, embedded in a larger system of observations, sources, events, artifacts, feeds, corrections, circulation traces, and reader-demand signals.

---

## 1. Problem

The formal problem is to model how a situation in the world becomes a public, machine-readable, mutable news object under semantic-web and agentic-web conditions.

Let a news system contain:

\[
\mathcal{N}=(E,O,S,C,A,G,P,F,R,D)
\]

where:

- \(E\): events or event hypotheses;
- \(O\): observations, documents, sensor records, interviews, official statements, scraped records;
- \(S\): sources, including humans, institutions, instruments, databases, and agents;
- \(C\): claims, assertions, denials, corrections, and retractions;
- \(A\): editorial acts;
- \(G\): gates, such as verification, legal review, rights clearance, publication approval;
- \(P\): published artifacts;
- \(F\): feeds, sitemaps, syndication, ActivityPub-like delivery, and search discovery traces;
- \(R\): reader, platform, search, and social circulation signals;
- \(D\): standards-level descriptions: RDF, JSON-LD, schema.org, IPTC, PROV, C2PA, SHACL, feeds.

Agentic news changes the problem because agents may now be sources, reporters, editors, readers, syndicators, adversarial manipulators, or provenance evaluators. Existing semantic-web machinery can identify entities, express claims, validate shapes, query graphs, and preserve provenance, but it does not by itself define editorial obligation, truth, adversarial robustness, or task-grounded authority. MCP, for example, standardizes tool/resource/prompt exposure for model applications and explicitly treats tool descriptions as untrusted, with user consent required for tool invocation; A2A standardizes discovery and communication among opaque agents by way of Agent Cards, JSON-RPC over HTTP(S), and task exchange. Those protocols are useful for agentic affordances, not sufficient as epistemic guarantees. ([modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-06-18))

The core formal question is therefore:

> Can news be modeled as transformations of attributed claim-provenance structures across reportable contexts, with mathematically meaningful covers, restrictions, gluing, closures, orders, and morphisms?

The answer is conditionally yes. But the topology belongs to **some layers** of the system, not all of it.

---

## 2. Existing standards landscape

### 2.1 News industry standards

IPTC already treats news as structured exchange material rather than merely prose. NewsML-G2 is an IPTC standard for exchanging text, images, video, audio, event data, sports data, and packages with rich metadata; the News Architecture provides the conceptual and processing model behind NewsML-G2 and EventsML-G2. ([iptc.org](https://iptc.org/standards/newsml-g2/?utm_source=chatgpt.com))

ninjs, “News in JSON,” gives a JSON representation for news exchange, with schema support and versioned evolution; IPTC announced ninjs 3.1 in 2025, including a Digital Source Type property. This makes ninjs suitable as a serialization target for a computational news object, but not as the underlying formal primitive. ([iptc.org](https://iptc.org/standards/ninjs/?utm_source=chatgpt.com))

IPTC NewsCodes and Media Topics provide controlled vocabularies. Media Topics is a multilingual taxonomy with more than 1,200 terms, and IPTC NewsCodes are expressed using SKOS, extended by IPTC mechanisms for retired and faceted concepts. These are important for topic fibers, beat classification, and concept lattices. ([iptc.org](https://iptc.org/standards/media-topics/?utm_source=chatgpt.com))

rNews annotates news-specific metadata in HTML, while RightsML encodes machine-readable rights expressions. These are artifact-layer and rights-layer standards, not claim semantics. ([iptc.org](https://www.iptc.org/standards/rnews/?utm_source=chatgpt.com))

### 2.2 Web semantic standards

RDF represents information as graphs of subject-predicate-object triples using IRIs, blank nodes, and literals. JSON-LD serializes linked data in JSON. SPARQL queries RDF graphs, OWL supports richer ontology reasoning, SKOS represents concept schemes, SHACL validates RDF graphs against shapes, PROV-O expresses provenance in OWL, and DCAT describes datasets and data catalogs. These standards give a strong representational substrate for news metadata, claim graphs, source graphs, topic vocabularies, and validation gates. ([w3.org](https://www.w3.org/TR/rdf11-concepts/?utm_source=chatgpt.com))

However, RDF/OWL are mostly monotonic and open-world; news correction, contradiction, and retraction are often nonmonotonic and closed-world at editorial gates. SHACL is therefore better suited to “is this publishable under this house schema?” than OWL is to “is this story true?”

### 2.3 schema.org, search, and discovery

schema.org defines `NewsArticle` as an article reporting news or providing supporting background. It also defines `Claim` and `ClaimReview` for fact-checking contexts, and `CreativeWork` as a general supertype for creative artifacts. ([schema.org](https://schema.org/NewsArticle?utm_source=chatgpt.com))

Google’s article structured-data documentation frames structured data as a way to help Search, Google News, and Assistant understand article pages; sitemaps and news sitemaps help crawlers discover pages, dates, and relationships. This means search visibility is a circulation/discovery layer, not a truth layer. ([developers.google.com](https://developers.google.com/search/docs/appearance/structured-data/article?utm_source=chatgpt.com))

### 2.4 Feeds, HTTP, and syndication

Atom is an IETF-standard syndication format; JSON Feed is a pragmatic JSON syndication format. WebSub defines publisher-hub-subscriber notification. HTTP core semantics and caching define how resources are requested, represented, cached, and invalidated. Web Linking defines typed links among web resources. ([datatracker.ietf.org](https://datatracker.ietf.org/doc/html/rfc4287?utm_source=chatgpt.com))

For news topology, these standards model **circulation traces**: publication, update, feed exposure, cache state, canonical links, alternate representations, and reachability. They do not model editorial sufficiency or truth.

### 2.5 ActivityStreams, ActivityPub, and social circulation

ActivityStreams defines activities and objects; ActivityPub uses ActivityStreams for decentralized client-server and federated server-server delivery. This is relevant for modeling publication, update, boost/share, reply, correction, and retraction as activities. ([w3.org](https://www.w3.org/TR/activitystreams-vocabulary/?utm_source=chatgpt.com))

ActivityPub-like systems are formally closer to event logs than to article schemas. They can record that an artifact was created, updated, announced, or deleted. They do not determine whether the artifact’s claims are justified.

### 2.6 Provenance and authenticity

PROV-O models entities, activities, agents, derivation, attribution, generation, and use. It is a good basis for editorial provenance: an article was generated by an editing activity, used interviews and documents, and was associated with a reporter or editor. ([w3.org](https://www.w3.org/TR/prov-o/?utm_source=chatgpt.com))

C2PA / Content Credentials aim to preserve origin and edit history for digital content using signed manifests, claims, assertions, credentials, and signatures. The C2PA manifest model is relevant for media authenticity, especially images, audio, and video. ([c2pa.org](https://c2pa.org/?utm_source=chatgpt.com))

But provenance is not truth. A cryptographically signed false claim is still false; an unsigned true observation may still be epistemically valuable. Recent security analyses of C2PA are also a warning that authenticity systems should not be treated as complete evidentiary systems without adversarial review; those specific references should be treated as needing ongoing verification because the security literature is still developing. ([arxiv.org](https://arxiv.org/abs/2604.24890?utm_source=chatgpt.com))

### 2.7 Agentic protocols

MCP and A2A matter because agentic news systems need machine-readable capabilities, tool calls, delegated actions, task state, and audit logs. MCP supplies a model in which servers expose tools, resources, and prompts to model clients; A2A supplies agent discovery and task collaboration among opaque agents. ([modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-06-18))

For news, these protocols require additional metadata:

- source authority;
- tool-use provenance;
- human/agent authorship distinction;
- task-specific epistemic contracts;
- proof-carrying or evidence-carrying claims;
- editorial gate results;
- adversarial risk annotations;
- citation graph requirements;
- machine-checkable correction obligations.

Existing semantic web standards are sufficient for representing many of these fields. They are not sufficient for enforcing them.

---

## 3. Existing theory landscape

Gatekeeping theory studies how possible information is selected, blocked, transformed, and passed through institutional channels. Formally, it suggests state transitions and partial orders over editorial admissibility: raw input, assigned lead, verified claim, edited draft, legal-cleared artifact, published artifact. Translation fails if “gate” is reduced to a neutral function, because gatekeeping theory concerns power, institutional routines, ownership, source access, and professional norms. ([scholarcommons.scu.edu](https://scholarcommons.scu.edu/cgi/viewcontent.cgi?article=1033&context=crt&utm_source=chatgpt.com))

Agenda-setting theory concerns the relation between media salience and public salience. Formally, it suggests a time-indexed prominence function over topics, entities, and issues: \(a(t,x)\), with measurements such as placement, repetition, headline weight, homepage duration, push alerts, or feed rank. Translation fails at causal interpretation: salience correlation is not itself proof of public opinion formation. ([academic.oup.com](https://academic.oup.com/poq/article/36/2/176/1853310?utm_source=chatgpt.com))

Framing theory, especially Entman’s formulation, concerns selection and salience in presenting aspects of reality for problem definition, causal interpretation, moral evaluation, and treatment recommendation. Formally, framing can be modeled as a projection or weighting on a claim/event graph plus narrative role assignments. Translation fails because rhetoric, affect, genre, and political interpretation are not reducible to graph structure. ([onlinelibrary.wiley.com](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1460-2466.1993.tb01304.x?utm_source=chatgpt.com))

News-values research, from Galtung and Ruge through Harcup and O’Neill, identifies criteria by which events become newsworthy. Formally, news values suggest scoring, ranking, and threshold functions over candidate events: negativity, proximity, elite actors, conflict, surprise, relevance, shareability, and similar attributes. Translation fails when cultural and institutional judgments are treated as universal metrics. ([journals.sagepub.com](https://journals.sagepub.com/doi/10.1177/002234336500200104?utm_source=chatgpt.com))

Objectivity studies, including Tuchman’s “objectivity as strategic ritual,” suggest that objectivity can be modeled procedurally: attribution, balance conventions, quotation, documentary evidence, separation of news and opinion, and editorial verification. Translation fails if procedural objectivity is confused with metaphysical neutrality. ([journals.uchicago.edu](https://www.journals.uchicago.edu/doi/abs/10.1086/225193?utm_source=chatgpt.com))

Source-dependence theory, including Gans’s newsroom studies, suggests a bipartite or hypergraph between journalists, sources, institutions, beats, routines, and publishable stories. Formally, this supports source-reliance graphs and dependency measures. Translation fails where silence, intimidation, access journalism, and informal backgrounding are not recorded. ([semanticscholar.org](https://www.semanticscholar.org/paper/Deciding-What%27s-News%3A-A-Study-of-CBS-Evening-News%2C-Gans/124fe5a22edb6cdc7e5a9c415c2b8c4fd658bdce?utm_source=chatgpt.com))

Wire services and syndication suggest functors from newsroom packages to downstream artifacts, feeds, partner publications, and platform indexes. Corrections and updates suggest belief revision, truth maintenance, and versioned provenance. Computational journalism suggests pipelines for data extraction, document analysis, algorithmic accountability, and public-interest tooling. ([fredturner.stanford.edu](https://fredturner.stanford.edu/sites/g/files/sbiybj27111/files/media/file/cohen-hamilton-turner-computational-journalism-cacm-10-111.pdf?utm_source=chatgpt.com))

Platformization and SEO incentives belong to the circulation layer. They are modeled by reach, ranking, referral, and optimization traces, not by epistemic support. Work on platform power emphasizes that news organizations and platforms are structurally entangled; a formal news model must therefore distinguish editorial publication from platform discovery. ([reutersinstitute.politics.ox.ac.uk](https://reutersinstitute.politics.ox.ac.uk/news/power-platforms?utm_source=chatgpt.com))

Propaganda, misinformation, and epistemic trust require adversarial modeling. Wardle and Derakhshan’s “information disorder” framework distinguishes mis-, dis-, and mal-information; Vosoughi, Roy, and Aral’s Science study found that false news diffused farther, faster, deeper, and more broadly than true news on Twitter in their dataset. Formally, this motivates adversarial provenance, diffusion graphs, trust logics, and paraconsistent claim states. ([edoc.coe.int](https://edoc.coe.int/en/media/7495-information-disorder-toward-an-interdisciplinary-framework-for-research-and-policy-making.html?utm_source=chatgpt.com))

---

## 4. Candidate primitives

### 4.1 Event

An event is a hypothesized or observed occurrence:

\[
e=(\tau,\lambda,\mathsf{participants},\mathsf{type},\mathsf{uncertainty})
\]

where \(\tau\) is temporal extent, \(\lambda\) is location or jurisdiction, and type comes from a controlled vocabulary when possible.

Events are not always primitive. In breaking news, the event is often inferred from claims: “there was an explosion,” “there was no explosion,” “officials report a fire,” “witnesses report smoke.” Therefore, event objects should usually be **constructed from claims**, not assumed as ground truth.

### 4.2 Observation

An observation is a source-bound evidentiary item:

\[
o=(s,m,t,\rho,d)
\]

where \(s\) is source, \(m\) is method, \(t\) is observation time, \(\rho\) is raw record, and \(d\) is provenance.

Examples: interview recording, agency statement, FOIA document, sensor reading, photograph, livestream capture, agent retrieval trace.

### 4.3 Source

A source is an agent, institution, instrument, document, dataset, or delegated computational process that can produce observations or assertions.

\[
s=(id,type,authority,access,history,rights,risk)
\]

The model must separate **identity**, **authority**, **reliability history**, and **current assertion**. A source may be authentic and wrong, anonymous and right, automated and reliable, or human and adversarial.

### 4.4 Claim

A claim is the best central primitive:

\[
c=(p,\sigma,\tau,\alpha,\pi,\kappa)
\]

where:

- \(p\): proposition-like content;
- \(\sigma\): scope: event/entity/place/topic/jurisdiction;
- \(\tau\): valid or asserted time;
- \(\alpha\): assertion force: alleges, confirms, denies, estimates, quotes, corrects;
- \(\pi\): provenance/support;
- \(\kappa\): editorial status: unverified, supported, contested, corrected, retracted.

Claims are not just RDF triples. Some can be triples, but many are modal, temporal, vague, quoted, probabilistic, or jurisdiction-bound.

### 4.5 Assertion

An assertion is a source’s commitment to a claim under a communicative force:

\[
a=(source,claim,force,time,medium,context)
\]

This distinguishes “the mayor said X” from “X is true.”

### 4.6 Story

A story is an editorially ordered package of claims, entities, sources, context, narrative frame, and prominence choices. It is not merely a set of claims.

\[
story=(C',order,frame,headline,lede,background,omissions,gates)
\]

The formal model can track the claim set and provenance. It cannot fully formalize rhetorical force without additional discourse semantics.

### 4.7 Published artifact

A published artifact is a concrete representation:

\[
p=(uri,content,format,hash,version,metadata,rights,canonicalization)
\]

Examples: article page, AMP page, PDF, video package, podcast, wire item, JSON-LD block, ninjs item, NewsML-G2 package.

### 4.8 Feed item and syndication trace

A feed item is a projection of a published artifact into a circulation channel:

\[
f=(feed,id,item,updated,published,links,summary)
\]

A syndication trace is a graph path from origin to downstream artifacts, partners, caches, search indexes, and social activities.

### 4.9 Correction, update, retraction

A correction is an editorial act modifying claim status or artifact content while preserving lineage.

\[
corr=(target,reason,oldClaims,newClaims,time,agent,visibility)
\]

A correction is not just a new article. It is a transformation in the versioned claim-provenance graph.

### 4.10 Reader demand signal

A reader demand signal is a circulation-side observation: click, dwell, search query, share, subscription open, comment, referral, alert open. It should be modeled separately from truth and editorial value.

---

## 5. Formal constructions

### 5.1 Categorical construction

Define a category \(\mathbf{NewsTrace}\).

**Objects.** Versioned news states:

\[
X=(C,E,O,S,P,\Pi,G)
\]

where \(C\) is a claim graph, \(E\) an event hypothesis graph, \(O\) observations, \(S\) sources, \(P\) artifacts, \(\Pi\) provenance, and \(G\) gate states.

**Morphisms.** Editorial and circulation acts:

\[
f:X\to Y
\]

such as ingest, assign, transcribe, normalize, entity-resolve, verify, edit, fact-check, package, publish, syndicate, correct, retract.

**Identity.** The identity morphism preserves all claims, artifacts, provenance, and gate states.

**Composition.** If \(f:X\to Y\) and \(g:Y\to Z\), then \(g\circ f:X\to Z\) is the sequential editorial trace. Composition is valid only when preconditions match: for example, `publish` requires a publishable gate state; `correct` requires an existing target.

This category models workflow and transformation well. It fails if morphisms are treated as pure deterministic functions. Editorial acts may be nondeterministic, lossy, probabilistic, legally constrained, and value-laden. More accurate versions use:

- a **Kleisli category** for side effects, uncertainty, and audit logs;
- a **double category** with editorial transformations horizontally and representation/projection transformations vertically;
- a **fibration** over beats, topics, jurisdictions, publication surfaces, or standards.

A functor

\[
F_{\text{schema}}:\mathbf{NewsTrace}\to\mathbf{RDFGraph}
\]

maps internal news states to public RDF/JSON-LD graphs. A functor

\[
F_{\text{ninjs}}:\mathbf{NewsTrace}\to\mathbf{JSON}
\]

maps them to ninjs items. A functor

\[
F_{\text{feed}}:\mathbf{NewsTrace}\to\mathbf{Feed}
\]

maps published artifacts to feed entries.

A natural transformation between \(F_{\text{ninjs}}\) and \(F_{\text{schema}}\) would preserve selected invariants: URI, title/headline, publication time, modification time, authorship, source links, correction links, and topic identifiers. It will not preserve all semantics, because the target standards do not express exactly the same distinctions.

**Adjunction candidate.** Let \(U\) forget editorial structure from a publishable story to its underlying claim graph. A left adjoint \(L\), if it exists, would construct the “free publishable story” from a claim graph subject to editorial constraints. In real journalism this usually fails: there is no canonical minimal story because framing, lede choice, sourcing convention, legal risk, and audience relevance are not universal constructions.

### 5.2 Sheaf/topological construction

Define a site \((\mathcal{C},J)\).

An object \(u\in\mathcal{C}\) is a reportable context:

\[
u=(T_u,L_u,Q_u,S_u,K_u)
\]

where \(T_u\) is a time interval, \(L_u\) a location/jurisdiction, \(Q_u\) a set of entities/topics, \(S_u\) an admissible source set, and \(K_u\) a standards/publication context.

A morphism \(v\to u\) is a refinement: narrower time, location, topic, source set, or publication surface.

A covering family \(\{u_i\to u\}\in J(u)\) is valid when the \(u_i\) jointly satisfy a source-and-context coverage policy. Example: for a hazardous-material incident, a valid cover might require local official source, emergency response source, eyewitness or sensor evidence, and affected-area context.

Define a presheaf:

\[
\mathcal{F}:\mathcal{C}^{op}\to\mathbf{Poset}
\]

where \(\mathcal{F}(u)\) is the partially ordered set of claim graphs supported in context \(u\). The order may be informational refinement: \(x\leq y\) if \(y\) contains all claims and support in \(x\), plus additional compatible support or status refinement.

Restriction maps:

\[
\rho_{uv}:\mathcal{F}(u)\to\mathcal{F}(v)
\]

forget claims, sources, or provenance outside the smaller context \(v\), or weaken support when evidence leaves scope.

**Separatedness.** If two local claim sections agree on all overlaps, they represent the same local news state modulo entity normalization.

**Gluing.** A compatible family \(\{s_i\in\mathcal{F}(u_i)\}\) glues to \(s\in\mathcal{F}(u)\) when overlap restrictions agree and no hard incompatibility blocks synthesis.

This construction models local-to-global reporting, source-context compatibility, and editorial synthesis. It fails for full stories: two editors can construct different valid stories from the same compatible claim graph. Therefore, the sheaf candidate is strongest for **canonical claim-provenance graphs**, not for prose stories.

Contradiction can be handled two ways:

1. Boolean claim sheaf: contradictions obstruct gluing.
2. Paraconsistent claim sheaf: contradictions glue into a contested value rather than exploding.

The second is better for breaking news.

### 5.3 Topology and closure systems

Several closure operators are meaningful.

**Semantic entailment closure.**

\[
cl_{\vdash}(C)=\{d:C\vdash d\}
\]

This is extensive, monotone, and idempotent under a fixed entailment regime.

**Publication-readiness closure.**

\[
cl_G(C)=C\cup\{\text{gate certificates derivable from }C\}
\]

This is closure-like if gates are monotone. It fails when new evidence can remove readiness, as in legal risk, contradiction, or source withdrawal. Then \(cl_G\) must be indexed by time:

\[
cl_{G,t}
\]

**Syndication reach closure.**

Given a directed syndication graph \(H\), \(cl_H(p)\) is the set of artifacts, feeds, caches, and downstream items reachable from \(p\). This is a genuine reachability closure on a graph.

**Freshness interior.**

Freshness is usually not closure. It contracts with time. Define:

\[
int_{\Delta,t}(P)=\{p\in P:\text{age}_t(p)<\Delta \text{ and no superseding correction exists}\}
\]

This behaves more like a time-indexed interior or viability predicate.

**Search visibility closure.** This is only weakly topological. Crawling and indexing have reachability aspects, but ranking, canonicalization, freshness, and policy interventions are opaque and nonmonotone.

### 5.4 Order, lattice, and paraconsistent construction

Define an editorial state lattice:

\[
\mathsf{State}=
\mathsf{Completeness}\times
\mathsf{Verification}\times
\mathsf{Rights}\times
\mathsf{Risk}\times
\mathsf{Freshness}
\]

A package is publishable if it lies above a threshold in required dimensions and below a risk bound. This models gates better than a linear workflow.

For truth status, use a bilattice:

- \(\bot\): neither supported nor refuted;
- \(T\): supported true;
- \(F\): supported false;
- \(\top\): both supported and refuted / contested.

There are two orders:

- truth order: \(F \leq \bot \leq T\), with contested handled separately;
- knowledge order: \(\bot \leq T,F \leq \top\).

This models contested claims without trivial explosion. It fails to model source prestige, framing, and salience unless extended with weights and discourse structure.

### 5.5 Formal concept analysis

A formal context is:

\[
K=(G,M,I)
\]

where \(G\) is a set of objects, \(M\) attributes, and \(I\subseteq G\times M\).

For news:

- \(G\): claims, articles, sources, events, or reader queries;
- \(M\): topics, entities, source types, news values, locations, jurisdictions, formats;
- \(I\): incidence relation.

The resulting concept lattice groups extents and intents: for example, all claims involving “chemical spill,” “rail,” “public safety,” and “official source.” Formal concept analysis is useful for beat maps, coverage gaps, source dependence, entity-topic clusters, and audience-demand comparison. It fails for narrative sequence, temporal correction, and contradiction unless combined with temporal and paraconsistent structures. Ganter and Wille’s work is the standard reference for FCA as a mathematical theory of concept lattices. ([philpapers.org](https://philpapers.org/rec/GANFCA-2?utm_source=chatgpt.com))

### 5.6 Graph, hypergraph, and provenance construction

Define a typed hypergraph:

\[
H=(V,E,\tau)
\]

Nodes include claims, events, sources, observations, artifacts, agents, topics, entities, and standards. Hyperedges include:

- `supports(source, observation, claim)`;
- `contradicts(claim_a, claim_b)`;
- `quotes(article, assertion)`;
- `derivedFrom(artifact, claims...)`;
- `corrects(correction, artifact, claim)`;
- `syndicates(origin, downstream_item)`;
- `mentions(article, entity)`;
- `uses(activity, entity)`.

PROV supplies entity/activity/agent lineage. Provenance semirings supply algebra for how support accumulates: \(+\) for alternative support, \(\times\) for joint derivation. Green, Karvounarakis, and Tannen’s provenance semiring work shows how relational provenance, incomplete databases, probabilistic databases, bags, and why-provenance can be treated uniformly by semiring annotation. ([dl.acm.org](https://dl.acm.org/doi/10.1145/1265530.1265535?utm_source=chatgpt.com))

This construction is strong for auditability. It fails if semiring weights are interpreted as truth without epistemic theory.

### 5.7 Temporal logic and event calculus

News has at least six relevant times:

1. event occurrence time;
2. observation time;
3. assertion time;
4. editorial decision time;
5. publication/update/correction time;
6. crawl, index, feed, and reader-exposure time.

Event calculus is appropriate for fluents such as:

- `HoldsAt(Published(article), t)`;
- `HoldsAt(Supported(claim, source), t)`;
- `HoldsAt(Retracted(claim), t)`;
- `Initiates(correction, Corrected(article), t)`;
- `Terminates(correction, Current(article_v1), t)`.

Kowalski and Sergot’s event calculus was designed for reasoning about events, time periods, and database updates, making it directly relevant to corrections and evolving news states. ([doc.ic.ac.uk](https://www.doc.ic.ac.uk/~rak/papers/event%20calculus.pdf?utm_source=chatgpt.com))

Belief revision and truth maintenance handle correction, contradiction, and retraction. AGM belief revision supplies a canonical tradition for rational belief change, while Doyle’s truth-maintenance systems record and maintain reasons for beliefs. ([plato.stanford.edu](https://plato.stanford.edu/entries/logic-belief-revision/?utm_source=chatgpt.com))

### 5.8 RDF, Datalog, SHACL, and validation

A semantic-web layer should use named graphs:

- one graph per source observation;
- one graph per claim version;
- one graph per article version;
- one graph per correction;
- one graph per syndication projection;
- one graph per validation result.

SHACL validates publication contracts. SPARQL queries support paths and correction lineage. Datalog handles recursive reachability, contradiction propagation, and rule-based gates.

Example Datalog rules:

```prolog id="w931cz"
supported(C) :- assertion(A,C), source(A,S), trusted_for(S,Topic), about(C,Topic).
contested(C) :- contradicts(C,D), supported(C), supported(D).
derived_artifact(P,C) :- artifact_uses(P,C).
needs_update(P) :- derived_artifact(P,C), corrected(C).
reachable(X,Y) :- syndicates(X,Y).
reachable(X,Z) :- syndicates(X,Y), reachable(Y,Z).
```

OWL/RDFS inference is useful for type hierarchies and vocabulary alignment, but correction and publication gates usually need closed-world validation and nonmonotonic update logic.

---

## 6. Worked example

### 6.1 Scenario

At 10:05 America/Chicago on June 10, 2026, an incident is reported near the Riverbend rail yard.

Sources:

- \(S_1\): city fire department statement at 10:20.
- \(S_2\): transit agency statement at 10:25.
- \(S_3\): eyewitness video uploaded at 10:30.

Claims:

- \(c_1\): “A chemical plume is visible near Riverbend rail yard.”
- \(c_2\): “Officials ordered a one-mile evacuation.”
- \(c_3\): “No railcar derailed.”
- \(c_4\): “Two tank cars derailed.”

Support:

- \(S_1\) supports \(c_1,c_2\).
- \(S_2\) supports \(c_3\).
- \(S_3\) supports \(c_1,c_4\).

Contradiction:

\[
c_3 \perp c_4
\]

because “no railcar derailed” conflicts with “two tank cars derailed.”

### 6.2 Claim graph

```json id="402cam"
{
  "claims": [
    {
      "id": "claim:c1",
      "text": "A chemical plume is visible near Riverbend rail yard.",
      "status": "supported",
      "supportedBy": ["obs:fire-1020", "obs:video-1030"]
    },
    {
      "id": "claim:c2",
      "text": "Officials ordered a one-mile evacuation.",
      "status": "supported",
      "supportedBy": ["obs:fire-1020"]
    },
    {
      "id": "claim:c3",
      "text": "No railcar derailed.",
      "status": "contested",
      "supportedBy": ["obs:transit-1025"],
      "contradicts": ["claim:c4"]
    },
    {
      "id": "claim:c4",
      "text": "Two tank cars derailed.",
      "status": "contested",
      "supportedBy": ["obs:video-1030"],
      "contradicts": ["claim:c3"]
    }
  ]
}
```

A Boolean sheaf of claims cannot glue \(c_3\) and \(c_4\) into a consistent global section. A paraconsistent claim sheaf can glue them into a global section with derailment status \(\top\), meaning contested.

### 6.3 Editorial synthesis

The editor publishes:

> Officials order one-mile evacuation after chemical plume near Riverbend rail yard; cause remains disputed.

This story includes \(c_1\) and \(c_2\) as supported, and includes the derailment question as contested rather than resolved.

Categorically:

\[
X_0 \xrightarrow{\text{ingest}} X_1
\xrightarrow{\text{verify/fire}} X_2
\xrightarrow{\text{mark-contested}} X_3
\xrightarrow{\text{publish}} X_4
\]

The invariant is that every public claim in \(X_4\) has either support, quotation attribution, or contested status.

### 6.4 Standards emission

The JSON-LD layer is artifact metadata, not the full formal object:

```json id="o36k8f"
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "@id": "https://example.news/riverbend-plume#v1",
  "headline": "Officials order one-mile evacuation after chemical plume near Riverbend rail yard",
  "datePublished": "2026-06-10T10:55:00-05:00",
  "dateModified": "2026-06-10T10:55:00-05:00",
  "author": { "@type": "Person", "name": "Reporter A" },
  "publisher": { "@type": "Organization", "name": "Example News" },
  "about": [
    { "@id": "claim:c1" },
    { "@id": "claim:c2" },
    { "@id": "claim:c3" },
    { "@id": "claim:c4" }
  ],
  "citation": [
    "obs:fire-1020",
    "obs:transit-1025",
    "obs:video-1030"
  ],
  "creativeWorkStatus": "Published"
}
```

schema.org and Google structured-data conventions are appropriate for public web exposure and search interpretation, while IPTC formats are better suited for professional news exchange. ([schema.org](https://schema.org/NewsArticle?utm_source=chatgpt.com))

An illustrative ninjs-like emission:

```json id="q7dhh3"
{
  "uri": "https://example.news/riverbend-plume#v1",
  "type": "text",
  "title": "Officials order one-mile evacuation after chemical plume near Riverbend rail yard",
  "versioncreated": "2026-06-10T10:55:00-05:00",
  "version": "1",
  "body_text": "Officials ordered a one-mile evacuation after a chemical plume was reported near Riverbend rail yard. Accounts differ on whether railcars derailed.",
  "subjects": [
    { "code": "medtop:disaster-accident", "name": "accident and emergency incident" }
  ],
  "associations": [
    { "type": "claimGraph", "uri": "urn:claimgraph:riverbend:v1" }
  ]
}
```

This is an illustrative mapping, not a conformance specimen; exact field names and controlled values must be checked against the chosen ninjs version and IPTC vocabulary.

A feed item exposes the publication/update state:

```json id="qgeg4y"
{
  "id": "https://example.news/riverbend-plume#v1",
  "url": "https://example.news/riverbend-plume",
  "title": "Officials order one-mile evacuation after chemical plume near Riverbend rail yard",
  "date_published": "2026-06-10T10:55:00-05:00",
  "date_modified": "2026-06-10T10:55:00-05:00"
}
```

Feed formats represent subscription and update delivery, not full claim semantics. ([datatracker.ietf.org](https://datatracker.ietf.org/doc/html/rfc4287?utm_source=chatgpt.com))

PROV records derivation:

```turtle id="tblkqv"
:article_v1 a prov:Entity ;
  prov:wasGeneratedBy :publish_v1 ;
  prov:wasDerivedFrom :claim_c1, :claim_c2, :claim_c3, :claim_c4 .

:publish_v1 a prov:Activity ;
  prov:used :obs_fire_1020, :obs_transit_1025, :obs_video_1030 ;
  prov:wasAssociatedWith :editor_1 .

:obs_fire_1020 a prov:Entity ;
  prov:wasAttributedTo :fire_department .
```

PROV is strong for lineage but does not decide which claim is true. ([w3.org](https://www.w3.org/TR/prov-o/?utm_source=chatgpt.com))

### 6.5 Later correction

At 11:15, the railroad confirms: one tank car derailed, not two. Create:

- \(c_5\): “One tank car derailed.”
- mark \(c_3\) false/corrected;
- mark \(c_4\) over-specific and corrected;
- update article to version \(v_2\);
- emit correction notice;
- propagate update to feed, sitemap, structured data, partner syndication, and downstream claim graph.

Belief revision:

\[
K' = (K \setminus \{c_3,c_4^{exact}\}) \cup \{c_5,\mathsf{corrects}(c_5,c_3),\mathsf{corrects}(c_5,c_4)\}
\]

Truth maintenance records why the prior belief was held and why it was revised.

---

## 7. What is actually topological?

The following parts are genuinely topological or sheaf-like:

1. **Reportable-context covers.** A breaking-news context can be covered by local source/time/entity neighborhoods.
2. **Restriction.** Claims and support can be restricted to narrower contexts.
3. **Compatibility.** Local claim graphs can agree or fail to agree on overlaps.
4. **Gluing.** Compatible local claim graphs can form a larger claim graph.
5. **Obstruction.** Contradiction, missing provenance, incompatible timestamps, unresolved entity identity, or rights restrictions can block gluing.
6. **Closure.** Semantic entailment, syndication reach, and some validation saturations satisfy closure-like properties.
7. **Interior/freshness.** Fresh currently valid artifacts can be treated by time-indexed interior-like operators.

The following parts are not inherently topological:

1. **Prose story form.** Two stories can be valid over the same claim graph and still differ in frame, lede, emphasis, and omission.
2. **Editorial judgment.** Gatekeeping is order-theoretic and institutional, not merely topological.
3. **Truth.** Topology does not decide truth; it structures local support and compatibility.
4. **Audience interpretation.** Reader uptake requires pragmatics, psychology, politics, platform studies, and media theory.
5. **Search rank.** Crawling has graph structure, but ranking and visibility are policy-laden and nonmonotone.
6. **Agent reliability.** Agent capability discovery is not epistemic warrant.

The disciplined conclusion: a “news topology” can be defined as a **site of reportable contexts with sheaves or presheaves of supported claim-provenance graphs**, plus closure/interior operators for entailment, reach, validation, and freshness. It cannot replace provenance, temporal logic, paraconsistent logic, or media theory.

---

## 8. Implementation sketch

### 8.1 TypeScript core

```ts id="sfsoe0"
type URI = string;
type ISODateTime = string;

type ClaimStatus =
  | "unassessed"
  | "supported"
  | "contested"
  | "corrected"
  | "retracted"
  | "false"
  | "unknown";

type EditorialActType =
  | "ingest"
  | "assign"
  | "observe"
  | "assert"
  | "verify"
  | "edit"
  | "fact_check"
  | "publish"
  | "syndicate"
  | "update"
  | "correct"
  | "retract";

interface TimeInterval {
  start?: ISODateTime;
  end?: ISODateTime;
}

interface Source {
  id: URI;
  kind: "human" | "institution" | "document" | "dataset" | "sensor" | "agent";
  label: string;
  authorityScope?: URI[];
  reliabilityProfile?: URI;
  rights?: URI;
}

interface Observation {
  id: URI;
  source: URI;
  observedAt: ISODateTime;
  method: URI;
  rawRecord?: URI;
  provenanceGraph?: URI;
  c2paManifest?: URI;
}

interface Assertion {
  id: URI;
  source: URI;
  claim: URI;
  force: "states" | "denies" | "estimates" | "quotes" | "confirms" | "alleges";
  assertedAt: ISODateTime;
  observation?: URI;
}

interface Claim {
  id: URI;
  text: string;
  normalized?: {
    subject?: URI;
    predicate?: URI;
    object?: unknown;
  };
  about: URI[];
  validTime?: TimeInterval;
  status: ClaimStatus;
  assertions: URI[];
  supports?: URI[];
  contradicts?: URI[];
  corrects?: URI[];
  correctedBy?: URI[];
}

interface EditorialGateResult {
  gate: URI;
  passed: boolean;
  checkedAt: ISODateTime;
  reasons: string[];
}

interface EditorialAct {
  id: URI;
  type: EditorialActType;
  agent: URI;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  inputs: URI[];
  outputs: URI[];
  gateResults?: EditorialGateResult[];
  provActivity?: URI;
}

interface Artifact {
  id: URI;
  canonicalUrl: URI;
  version: string;
  format: "html" | "jsonld" | "ninjs" | "newsmlg2" | "atom" | "jsonfeed";
  generatedFromClaims: URI[];
  publishedAt?: ISODateTime;
  modifiedAt?: ISODateTime;
  correctionOf?: URI;
}
```

### 8.2 RDF / JSON-LD model

Use named graphs:

- `graph:source-observations`;
- `graph:claims-v1`;
- `graph:article-v1`;
- `graph:prov-v1`;
- `graph:validation-v1`;
- `graph:correction-v2`.

Map:

- schema.org for public article metadata;
- PROV-O for lineage;
- SKOS/IPTC Media Topics for classification;
- C2PA references for media authenticity;
- custom claim ontology for assertion force, contradiction, correction, and gate state.

### 8.3 Claim graph algorithms

Core algorithms:

1. normalize incoming artifacts to canonical claim graph;
2. entity-resolve sources, places, institutions, and topics;
3. compute support edges;
4. detect contradiction candidates;
5. assign bilattice truth states;
6. run editorial gate validation;
7. emit artifacts;
8. propagate correction to derived artifacts and feed items.

Contradiction detection should not be only lexical. It needs temporal scope, modality, attribution, and entity resolution.

### 8.4 Editorial gate algebra

Let a gate be:

\[
g:X\to \{\mathsf{pass},\mathsf{fail},\mathsf{warn}\}\times Reasons
\]

Gate composition:

- \(g_1\wedge g_2\): both required;
- \(g_1\vee g_2\): alternative satisfaction;
- \(g_1;g_2\): sequential dependency;
- \(\neg g\): generally unsafe for editorial gates unless used only as a diagnostic.

Example gates:

- every factual claim has support or attribution;
- every anonymous source has editor approval;
- every image has provenance or disclosure;
- every correction has target artifact and explanation;
- every agent-generated claim has tool-use trace and human-review status.

### 8.5 Closure and freshness computation

```ts id="zi3qcy"
function reachabilityClosure(start: URI, edges: Array<[URI, URI]>): Set<URI> {
  const seen = new Set<URI>([start]);
  const queue = [start];

  while (queue.length > 0) {
    const x = queue.shift()!;
    for (const [a, b] of edges) {
      if (a === x && !seen.has(b)) {
        seen.add(b);
        queue.push(b);
      }
    }
  }

  return seen;
}

function freshnessScore(
  publishedAt: Date,
  now: Date,
  halfLifeMinutes: number,
  superseded: boolean
): number {
  if (superseded) return 0;
  const ageMinutes = (now.getTime() - publishedAt.getTime()) / 60000;
  return Math.pow(0.5, ageMinutes / halfLifeMinutes);
}
```

Test closure operators for:

- extensity: \(A\subseteq cl(A)\);
- monotonicity: \(A\subseteq B\Rightarrow cl(A)\subseteq cl(B)\);
- idempotence: \(cl(cl(A))=cl(A)\).

Do not claim a process is topological unless these tests pass or the failure is explicit.

### 8.6 SHACL validation

Use SHACL for closed-world publication constraints:

- `NewsArticle` must have headline, datePublished, author/publisher, canonical URI;
- factual claims must have source attribution or explicit uncertainty;
- corrections must point to corrected artifact and corrected claim;
- generated media must have provenance or disclosure;
- feed item must correspond to a published artifact;
- agent-authored material must have agent identity and tool-use trace.

### 8.7 SPARQL / Datalog query layer

Representative questions:

- Which claims in this article are contested?
- Which downstream feed items derive from a corrected claim?
- Which sources support this claim?
- Which articles depend on a source later marked unreliable?
- Which artifacts are stale under freshness threshold \(\Delta\)?
- Which agent-generated assertions lack tool-use provenance?

### 8.8 Testing strategy

Use four test classes:

1. **Algebraic tests:** identity and composition of editorial morphisms; closure laws where asserted.
2. **Sheaf tests:** compatible local claim graphs glue; contradictory Boolean sections fail; paraconsistent sections glue as contested.
3. **Standards tests:** JSON-LD, ninjs, feeds, PROV, SHACL validation against versioned fixtures.
4. **Adversarial tests:** missing provenance, malicious agent tool description, stripped C2PA metadata, forged source identity, late correction, platform cache stale state.

---

## 9. Open problems

1. **Claim individuation.** Natural-language claims do not have canonical boundaries.
2. **Event individuation.** Events can be split, merged, renamed, or retroactively reclassified.
3. **Attribution semantics.** Quotation, paraphrase, allegation, confirmation, denial, and inference require different logics.
4. **Correction semantics.** Corrections are not always simple replacement; they may narrow, weaken, contextualize, or retract.
5. **Nonmonotonic semantic web.** RDF/OWL do not natively fit evolving correction states.
6. **Formal covers.** Source diversity and evidentiary sufficiency are institutional norms, not obvious Grothendieck topologies.
7. **Gluing uniqueness.** Claim graphs may glue uniquely; stories usually do not.
8. **Framing formalization.** Formal models risk erasing ideology, rhetoric, and genre.
9. **Agent accountability.** Agent protocols describe capabilities and tasks, but not epistemic responsibility.
10. **Provenance security.** Signed provenance can be absent, stripped, misleading, or cryptographically valid but journalistically false.
11. **Platform opacity.** Search and social visibility are partially observable and policy-dependent.
12. **Rights and safety.** Publication gates include legal, ethical, privacy, and harm considerations that are not reducible to truth.
13. **Benchmarks.** A test corpus would need source observations, claim graphs, article versions, corrections, feeds, provenance, and circulation traces.

---

## 10. Annotated bibliography

### Primary standards and technical sources

**IPTC NewsML-G2, News Architecture, ninjs, NewsCodes, Media Topics, RightsML, rNews.** Core professional-news exchange standards and vocabularies. Use these for package structure, JSON serialization, controlled topics, rights metadata, and newsroom exchange. They are not sufficient as claim logic. ([iptc.org](https://iptc.org/standards/newsml-g2/?utm_source=chatgpt.com))

**schema.org `NewsArticle`, `Claim`, `ClaimReview`, `CreativeWork`.** Public web metadata vocabulary useful for article exposure, claim review markup, citations, authorship, and publication dates. It is artifact-centered and search-oriented. ([schema.org](https://schema.org/NewsArticle?utm_source=chatgpt.com))

**RDF, JSON-LD, SPARQL, OWL, SKOS, SHACL, PROV-O, DCAT.** Semantic-web substrate for graph representation, linked-data serialization, query, ontology reasoning, concept vocabularies, validation, provenance, and dataset catalogs. ([w3.org](https://www.w3.org/TR/rdf11-concepts/?utm_source=chatgpt.com))

**Atom, JSON Feed, WebSub, HTTP, Web Linking.** Circulation and web-architecture standards for feed items, update delivery, caching, resource semantics, and typed links. Use these for publication and syndication traces, not claim truth. ([datatracker.ietf.org](https://datatracker.ietf.org/doc/html/rfc4287?utm_source=chatgpt.com))

**ActivityStreams and ActivityPub.** Useful for decentralized publication, update, announcement, and retraction activities. They model social circulation events more than editorial epistemology. ([w3.org](https://www.w3.org/TR/activitystreams-vocabulary/?utm_source=chatgpt.com))

**C2PA / Content Credentials.** Important for signed media provenance and authenticity manifests. Should be used as one evidentiary layer, not as a truth guarantee. ([c2pa.org](https://c2pa.org/?utm_source=chatgpt.com))

**MCP and A2A.** Agentic protocol sources for tool exposure, resources, prompts, agent discovery, and cross-agent task exchange. They motivate affordance profiles and audit requirements for agentic news. ([modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-06-18))

### Scholarly and theoretical sources

**McCombs and Shaw, agenda-setting.** Supports formal salience functions over topics and time, while warning that prominence is not truth. ([academic.oup.com](https://academic.oup.com/poq/article/36/2/176/1853310?utm_source=chatgpt.com))

**Entman, framing.** Supports modeling selection, salience, and interpretive role assignment, but not reducing meaning to graph structure. ([onlinelibrary.wiley.com](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1460-2466.1993.tb01304.x?utm_source=chatgpt.com))

**Tuchman, objectivity as strategic ritual.** Supports procedural modeling of attribution and verification, while preserving critique of objectivity as institutional practice. ([journals.uchicago.edu](https://www.journals.uchicago.edu/doi/abs/10.1086/225193?utm_source=chatgpt.com))

**Gans, source dependence and newsroom routines.** Supports source-news bipartite graphs and institutional dependency analysis. ([semanticscholar.org](https://www.semanticscholar.org/paper/Deciding-What%27s-News%3A-A-Study-of-CBS-Evening-News%2C-Gans/124fe5a22edb6cdc7e5a9c415c2b8c4fd658bdce?utm_source=chatgpt.com))

**Galtung and Ruge; Harcup and O’Neill, news values.** Supports formal ranking and selection functions for newsworthiness, with cultural and institutional limitations. ([journals.sagepub.com](https://journals.sagepub.com/doi/10.1177/002234336500200104?utm_source=chatgpt.com))

**Cohen, Hamilton, and Turner; Diakopoulos.** Computational journalism and algorithmic accountability sources for document analysis, data extraction, public-interest tooling, and investigation of computational power. ([fredturner.stanford.edu](https://fredturner.stanford.edu/sites/g/files/sbiybj27111/files/media/file/cohen-hamilton-turner-computational-journalism-cacm-10-111.pdf?utm_source=chatgpt.com))

**Wardle and Derakhshan; Vosoughi, Roy, and Aral.** Information disorder and diffusion evidence motivating adversarial provenance, trust logic, and spread modeling. ([edoc.coe.int](https://edoc.coe.int/en/media/7495-information-disorder-toward-an-interdisciplinary-framework-for-research-and-policy-making.html?utm_source=chatgpt.com))

**Green, Karvounarakis, and Tannen, provenance semirings.** Formal basis for support accumulation and transformation annotations. ([dl.acm.org](https://dl.acm.org/doi/10.1145/1265530.1265535?utm_source=chatgpt.com))

**Ganter and Wille, formal concept analysis.** Basis for concept lattices over topics, entities, sources, claims, and demand signals. ([philpapers.org](https://philpapers.org/rec/GANFCA-2?utm_source=chatgpt.com))

**Kowalski and Sergot, event calculus.** Basis for event, update, correction, and fluent reasoning over time. ([doc.ic.ac.uk](https://www.doc.ic.ac.uk/~rak/papers/event%20calculus.pdf?utm_source=chatgpt.com))

**AGM belief revision and Doyle truth maintenance.** Basis for correction, retraction, contradiction management, and reason-tracking. ([plato.stanford.edu](https://plato.stanford.edu/entries/logic-belief-revision/?utm_source=chatgpt.com))

---

The earned hypothesis is therefore:

\[
\boxed{
\text{News topology} =
\text{a site of reportable contexts}
+
\text{presheaves/sheaves of claim-provenance graphs}
+
\text{closure/interior operators}
}
\]

but only when embedded in categorical workflow, temporal logic, paraconsistent status, provenance graphs, validation gates, and media-theoretic constraints.
