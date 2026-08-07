---
title: Accountable Agentic Newsrooms Research Agenda
description: A research agenda for warrant-preserving editorial infrastructure, where evidence, attribution, authority, judgment, genre, legal risk, correction, and accountability remain distinguishable as claims move through humans, agents, tools, prose, metadata, feeds, and downstream summaries. Frames the problem as controlled delegation rather than autonomous publication, names fifteen research questions (editorial judgment as gates not functions, authority graphs, source-power modeling, modality preservation, headline pragmatics, correction propagation, settlement of contested evidence, demand-not-evidence, genre contracts, omission ledgers, adversarial threat models), and proposes technical artifacts and a prioritized roadmap.
date-created: 2026-06-19
date-modified: 2026-06-19
tags: [agentic-newsroom, editorial-judgment, gate-algebra, authority-graph, source-power, modality-preservation, headline-pragmatics, correction-propagation, settlement, demand-not-evidence, genre-contract, omission-ledger, adversarial-editorial, controlled-delegation]
---

# Accountable Agentic Newsrooms: A Research Agenda for Warrant-Preserving Editorial Infrastructure

## Source note

This research agenda was prepared from three early memos supplied by the user:

- `news_topology_research_memo.md`
- `fiber-algebra-editorial-production.md`
- `claims_to_prose_research_report.md`

It also draws on journalism studies, editorial standards, computational journalism, provenance systems, structured news standards, discourse pragmatics, fact-checking research, and AI/agentic-system design. Where source URLs are included, they should be checked again for final publication use.

---

## Executive thesis

The deeper research problem is not “how do we automate news writing?” It is: **how do we design newsroom systems in which evidence, attribution, authority, judgment, genre, legal risk, correction, and public accountability remain distinguishable as claims move through humans, agents, tools, prose, metadata, feeds, platforms, archives, and downstream summaries?**

The three early memos point toward a serious formal program, but only if the formalism stays modest. The strongest version is not a grand mathematical theory of “news” as such. It is a **warrant-preserving editorial infrastructure**: a system in which attributed, time-indexed claims with provenance and status are transformed through context-bound editorial operations, then realized into genre-specific artifacts under explicit gates.

The “news topology” memo is right to treat the attributed, time-indexed claim with provenance and editorial status as more stable than “article” or “event,” while warning that topology cannot explain gatekeeping, framing, source power, platform incentives, or reader interpretation by itself.

The “fiber algebra” memo is strongest where it separates **context movement**, **editorial transformation**, and **artifact projection**. A jurisdictional restriction, legal review, copy edit, publication, correction, and feed serialization are different kinds of operation and should not share a single generic “transform” type.

The “claims-to-prose” memo is strongest where it rejects `claims → prose` as a function and instead treats prose as a **licensed realization relation** constrained by attribution, modality, evidentiality, contradiction, correction state, and stance.

The research frontier is therefore not autonomous publication. It is **controlled delegation**: deciding which parts of editorial work can be represented, checked, routed, audited, and assisted by software, and which must remain governed by reporters, editors, standards desks, lawyers, affected communities, and accountable institutions.

Existing journalism ethics already require verification, context, correction, and source transparency. SPJ, for example, says journalists should verify information before release, use original sources where possible, avoid oversimplification, and gather, update, and correct information throughout a story’s life. AP’s generative-AI guidance likewise treats AI output as unvetted source material that still requires editorial judgment and sourcing standards.

**Key sources:**

- SPJ Code of Ethics: <https://www.spj.org/spj-code-of-ethics/>
- AP generative AI standards: <https://www.ap.org/the-definitive-source/behind-the-news/standards-around-generative-ai/>

---

## What the current theory already gets right

First, it correctly chooses the **claim/provenance graph** rather than the finished article as the formal center. That is crucial because articles, headlines, schema markup, liveblog entries, newsletters, social cards, feeds, and AI summaries are all projections from a richer editorial state.

Second, it understands that **provenance is necessary but not sufficient**. W3C PROV-O can model entities, activities, agents, derivations, and responsibility, but it does not decide whether a claim is true, fair, contextualized, or legally safe. C2PA/Content Credentials can help establish origin and edit history for media, but provenance and authenticity are not the same as journalistic warrant.

Third, it treats **correction as a system event**, not merely a notice at the bottom of an article. A correction may need to invalidate article text, headline, captions, social cards, feed entries, JSON-LD, syndication packages, search snippets, archive records, downstream summaries, and internal claim dependencies.

Fourth, it distinguishes **demand from evidence**. Search queries, social trends, reader questions, and analytics can justify an assignment, but they cannot support the factual proposition being assigned. Google’s structured-data and spam guidance is useful here: Article structured data helps search systems understand pages, while spam policies target manipulative scaled content and deceptive search practices; neither layer is evidence.

Fifth, it sees that **agent capability is not editorial authority**. MCP and A2A-type systems may expose tools, resources, tasks, and inter-agent communication, but they do not supply newsroom warrant, legal permission, source judgment, or publication authority. MCP’s tool specification recommends human-in-the-loop visibility and confirmation for tool invocations, which is a safety affordance, not an editorial decision procedure.

**Key sources:**

- W3C PROV-O: <https://www.w3.org/TR/prov-o/>
- C2PA: <https://c2pa.org/>
- Google article structured data: <https://developers.google.com/search/docs/appearance/structured-data/article>
- MCP tools specification: <https://modelcontextprotocol.io/specification/2025-06-18/server/tools>

---

## What the current theory under-theorizes

The current theory still under-theorizes **editorial power**. Gatekeeping is not just a sequence of validations; it is how institutions select, suppress, amplify, frame, and routinize public reality. Gatekeeping theory treats gates as decision points about selection, treatment, prominence, and exclusion, not merely technical pass/fail checks.

It also under-theorizes **source power**. A provenance graph may show that a statement came from a mayor, police department, company, community organizer, database, sensor, leaked memo, or LLM tool. It does not by itself model access journalism, intimidation, official-source dependency, anonymity, retaliation risk, community knowledge, or the long history of whose testimony becomes “credible.”

It under-theorizes **framing and omission**. Entman’s classic framing account defines framing as selecting some aspects of perceived reality and making them more salient in ways that promote problem definition, causal interpretation, moral evaluation, and treatment recommendation. That cannot be reduced to claim support edges.

It under-theorizes **headlines and distribution artifacts**. Headlines are not summaries with fewer words. They assert, imply, presuppose, invite clicks, shape memory, and travel separately from body text. Research on misleading headlines shows that headline/body incongruity is a distinct computational problem, and psychological work shows subtle headline misinformation can affect memory and inference.

It under-theorizes **legal risk**. A generated sentence that preserves source attribution may still defame, invade privacy, breach an embargo, identify a protected source, violate a court order, or create negligent republication risk. In U.S. defamation law, “actual malice” for public officials and public figures means knowledge of falsity or reckless disregard for truth, not personal ill will; that makes audit trails and ignored warnings legally material.

It under-theorizes **labor and accountability capture**. If every editorial act becomes a record, the system may improve accountability, but it may also intensify surveillance, deskill editors, hide human labor behind automation metrics, or produce bureaucratic compliance theater.

**Key sources:**

- Gatekeeping theory overview: <https://www.bmf.bt/wp-content/uploads/2018/11/Gatekeeping.pdf>
- Entman, “Framing: Toward Clarification of a Fractured Paradigm”: <https://academic.oup.com/joc/article/43/4/51/4160153>
- RCFP pre-publication review guide: <https://www.rcfp.org/resources/pre-publication-review-guide/>

---

## Major future research questions

### 1. What is editorial judgment, and which parts can be formalized without pretending judgment is mechanical?

**Why it matters editorially:** Editors make judgments about salience, proportionality, fairness, timing, placement, harm, public interest, and voice. These are not reducible to “claim supported / unsupported.”

**Why it matters technically:** The system needs to separate checkable constraints from noncanonical human decisions. A gate can block an unsupported claim; it cannot decide the only legitimate lede.

**Literatures and practices to study:** Gatekeeping theory, news values, objectivity studies, standards desks, copy desks, legal review, and breaking-news workflows. News values research asks what makes something newsworthy but also warns that news values are culturally and institutionally contingent.

**Likely artifact:** An **editorial gate algebra** with typed gates: support, attribution, legal, harm, rights, source-risk, standards-validity, and human-judgment-required. It should include override records that do not convert uncertainty into truth.

**If ignored:** The system will either automate judgment illegitimately or bury real judgment inside opaque scoring functions.

---

### 2. What is editorial authority in a newsroom with agents, tools, APIs, and humans?

**Why it matters editorially:** A tool may retrieve a document; an agent may draft a sentence; a reporter may verify; an editor may approve; a lawyer may block; a standards editor may require correction. These roles are not interchangeable.

**Why it matters technically:** Agent systems need explicit authority scopes: may observe, may draft, may classify, may recommend, may edit, may publish, may override, may retract.

**Literatures and practices to study:** AP and Reuters AI policies, newsroom roles, CMS permission systems, audit-log design, AI governance frameworks such as NIST AI RMF and ISO/IEC 42001. NIST’s AI RMF emphasizes validity, reliability, safety, security, accountability, transparency, explainability, privacy, and fairness as context-dependent socio-technical attributes.

**Likely artifact:** An **authority graph** linking people, agents, tools, claims, artifacts, gates, and actions.

**If ignored:** Technical capability will be mistaken for institutional authority, enabling agents to perform editorial acts no accountable person authorized.

**Key source:** NIST AI RMF: <https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf>

---

### 3. How should source power, source dependence, and source diversity be represented?

**Why it matters editorially:** A story sourced only to police, prosecutors, companies, campaigns, or platform PR may be well-provenanced but still structurally distorted.

**Why it matters technically:** Provenance graphs need source-role, affiliation, authority-scope, independence, access-condition, anonymity, conflict, and vulnerability fields.

**Literatures and practices to study:** Herbert Gans’s newsroom sociology, source-dependence studies, computational source-mixture analysis, anonymous-source standards, community-centered journalism, and Indigenous data sovereignty frameworks. Recent computational journalism work has modeled articles as mixtures of source types, which is a useful starting point but not a substitute for editorial interpretation.

**Likely artifact:** A **source authority and dependency model** that audits source concentration by beat, topic, institution, geography, and affected community.

**If ignored:** Agentic systems will reproduce official-source bias at machine speed while presenting it as neutral provenance.

---

### 4. How can modality, evidentiality, uncertainty, and attribution survive every prose transformation?

**Why it matters editorially:** “Police said,” “court records show,” “researchers estimate,” “the company claims,” “may,” “likely,” “unconfirmed,” and “disputed” carry different editorial commitments.

**Why it matters technically:** Claims need modality and attribution types; sentence plans need assertion-strength constraints; generated text needs post-hoc extraction and comparison.

**Literatures and practices to study:** NLG, attribution-aware generation, evidentiality, pragmatics, fact-checking, and editorial copy rules. AIS defines an attribution framework in which NLG output about the external world should be verifiable against identified sources. FEVER and AVeriTeC provide useful but incomplete verification labels, including supported/refuted/not-enough-info and conflicting-evidence/cherry-picking categories.

**Likely artifact:** A **modality-preserving sentence contract** and **claim-to-sentence alignment benchmark**.

**If ignored:** Allegations will become facts, estimates will become numbers, uncertainty will disappear, and summaries will overclaim.

**Key sources:**

- AIS: <https://aclanthology.org/2023.cl-4.2/>
- FEVER: <https://fever.ai/dataset/fever.html>
- AVeriTeC: <https://fever.ai/dataset/averitec.html>

---

### 5. What does a headline assert, imply, presuppose, and cause readers to remember?

**Why it matters editorially:** A body story can be careful while the headline misleads. Headlines also travel into push alerts, social cards, search results, newsletters, and AI answers.

**Why it matters technically:** Headline checking must compare not only literal entailment but also attribution loss, modality strengthening, presupposition, causal overclaim, quantifier broadening, and sensational framing.

**Literatures and practices to study:** Headline pragmatics, clickbait/misleading-headline detection, cognitive studies of misinformation, AP headline practice, SEO and platform distribution.

**Likely artifact:** A **headline pragmatics checker** that tests headline/body/claim-graph consistency and flags unsupported implication.

**If ignored:** The system will pass factuality checks while laundering misinformation through the most visible artifact.

---

### 6. How should corrections propagate across the whole publication and distribution graph?

**Why it matters editorially:** A correction is a promise to repair the public record, not just a ritual note.

**Why it matters technically:** Correction must be dependency-aware: claim → sentence → headline → caption → media metadata → JSON-LD → NewsML/ninjs → RSS/Atom/JSON Feed → social card → partner syndication → archive → downstream AI summary.

**Literatures and practices to study:** Corrections desks, wire-service update practices, feed standards, PROV-O, truth-maintenance systems, belief revision, Google structured-data guidance, and Trust Project transparency indicators. Trust Project principles include prompt corrections/clarifications and disclosure of methods and ownership.

**Likely artifact:** A **correction propagation graph** with regression tests that fail if a corrected claim persists in any public or machine-readable surface.

**If ignored:** Errors will survive in snippets, summaries, partner copies, and training/evaluation corpora after the newsroom thinks it has corrected them.

**Key source:** Trust Project: <https://thetrustproject.org/about/>

---

### 7. What is the difference between provenance, authenticity, credibility, warrant, and truth?

**Why it matters editorially:** “This image is authentic,” “this source really said it,” “this source is credible,” “this evidence warrants publication,” and “this claim is true” are different.

**Why it matters technically:** The system needs separate layers: cryptographic provenance, source identity, chain of custody, credibility notes, evidentiary support, editorial warrant, and truth-status.

**Literatures and practices to study:** PROV-O, C2PA, digital forensics, fact-checking methodology, legal evidence, records management, authenticity studies. C2PA is important but should be treated carefully; recent C2PA security critiques are emerging preprints and should be verified before being treated as settled.

**Likely artifact:** A **provenance/warrant ontology** that prevents “signed,” “verified origin,” “credible,” and “true” from collapsing into one field.

**If ignored:** A cryptographically signed falsehood, staged image, or official lie will be treated as epistemically safe.

---

### 8. How does contested evidence become publishable without false balance or false settlement?

**Why it matters editorially:** Journalism often publishes before full settlement: breaking news, scientific uncertainty, legal disputes, elections, war, disasters, allegations, and investigations.

**Why it matters technically:** Claim graphs need support, refutation, undercutting, denial, scope, and temporal status. Prose needs settlement forms such as “officials said,” “records show,” “accounts differ,” “evidence reviewed by X supports,” or “the available evidence does not establish.”

**Literatures and practices to study:** Argumentation theory, paraconsistent logic, fact-check verdicts, court reporting, science journalism, conflict reporting, and standards on allegations.

**Likely artifact:** A **settlement model** with states such as unsupported, attributed-only, supported, refuted, contested, under investigation, corrected, retracted, and legally blocked.

**If ignored:** Systems will either publish false consensus or perform false balance between well-supported and bad-faith claims.

---

### 9. How can reader demand create assignments without becoming evidence?

**Why it matters editorially:** Audience questions can reveal public information needs. Search trends can reveal confusion. But demand cannot prove the answer.

**Why it matters technically:** Demand signals should create tasks: investigate, explain, update, localize, debunk, monitor. They should not create support edges.

**Literatures and practices to study:** Agenda-setting, audience analytics, SEO, Google Search policies, public-interest journalism, service journalism, platformization. Agenda-setting research shows that news placement and prominence shape what audiences perceive as important, which means demand loops must be treated as power loops, not neutral signals.

**Likely artifact:** A **demand-to-assignment model** with public-interest, evidence-availability, anti-spam, and harm gates.

**If ignored:** The system becomes a content farm: queries generate articles, articles generate more queries, and evidence becomes optional.

---

### 10. What are genre contracts for every editorial surface?

**Why it matters editorially:** Wire briefs, explainers, investigations, liveblogs, analysis, editorials, corrections, obituaries, fact checks, newsletters, topic pages, structured metadata, and social cards make different promises to readers.

**Why it matters technically:** A genre contract should specify allowed stance, attribution density, uncertainty handling, update cadence, headline constraints, evidence thresholds, correction behavior, and metadata obligations.

**Literatures and practices to study:** Genre theory, discourse planning, NLG document planning, IPTC NewsML-G2/ninjs, schema.org `NewsArticle` and `ClaimReview`, liveblog practice, wire-service standards. IPTC NewsML-G2 is designed to exchange individual items and packages of text, images, video, audio news, event, and sports data; schema.org `NewsArticle` and `ClaimReview` are public web metadata types, not internal editorial logic.

**Likely artifact:** A **genre contract schema** and validation suite.

**If ignored:** Opinion will leak into straight news, analysis will be flattened into fact, and metadata will misrepresent the article’s actual editorial status.

**Key sources:**

- IPTC NewsML-G2: <https://iptc.org/standards/newsml-g2/>
- schema.org NewsArticle: <https://schema.org/NewsArticle>
- schema.org ClaimReview: <https://schema.org/ClaimReview>

---

### 11. How should omission be represented as an editorial act?

**Why it matters editorially:** Omission is not always failure; it can protect sources, avoid harm, respect privacy, maintain focus, or fit space. But omission can also hide exculpatory evidence, erase affected communities, or distort proportionality.

**Why it matters technically:** Systems need a way to record salient known-but-omitted material without making every omission public.

**Literatures and practices to study:** Framing, agenda-setting, source diversity, harm minimization, legal redaction, public-record withholding, trauma-informed reporting.

**Likely artifact:** An **omission ledger** with private/public layers: omitted claim, reason, risk, affected interpretation, reviewer, and whether omission must be disclosed.

**If ignored:** The system will audit only what was said, not what was systematically left unsaid.

---

### 12. How should adversarial manipulation be modeled in agentic editorial systems?

**Why it matters editorially:** Sources, campaigns, PR firms, state actors, platform manipulators, malicious tool providers, and even analytics dashboards can shape what agents see and do.

**Why it matters technically:** Agents need threat models for prompt injection, tool poisoning, source spoofing, forged provenance, SEO spam, document poisoning, social-signal manipulation, and correction suppression.

**Literatures and practices to study:** Information disorder, adversarial ML, MCP security, newsroom verification, platform manipulation, OSINT verification. MCP-related security papers from 2026 report tool poisoning, prompt injection, and description-code mismatch risks; because much of this literature is new, it should be treated as potential research needing replication and operational validation.

**Likely artifact:** An **editorial adversary model** and red-team corpus for agentic newsroom workflows.

**If ignored:** Agents will become scalable attack surfaces for publishing, syndication, and correction infrastructure.

---

### 13. How much editorial process should be exposed to readers?

**Why it matters editorially:** Transparency can build trust, but too much disclosure can expose sources, legal strategy, trauma details, or internal deliberation that readers cannot interpret.

**Why it matters technically:** Public provenance needs redaction, summarization, role labeling, confidence language, and UX testing. It should distinguish “how we know,” “what we do not know,” “what changed,” and “who is accountable.”

**Literatures and practices to study:** Trust Project indicators, fact-checker methodology pages, audience research, source protection, privacy, legal risk, explainable AI. IFCN principles emphasize transparency of methodology, including how fact checks are selected, researched, written, edited, published, and corrected.

**Likely artifact:** A **public provenance UX model** with reader-facing layers and protected internal layers.

**If ignored:** The newsroom may create transparency theater, expose vulnerable sources, or overwhelm readers with unusable audit data.

**Key sources:**

- IFCN Code of Principles: <https://ifcncodeofprinciples.poynter.org/the-commitments>
- Trust Project: <https://thetrustproject.org/about/>

---

### 14. What legal and harm gates are required before publication automation is even considered?

**Why it matters editorially:** Editors and lawyers care about defamation, privacy, source protection, court orders, copyright, minors, victims, security-sensitive information, embargoes, and foreseeable harm.

**Why it matters technically:** Legal gates must be jurisdiction-specific, claim-specific, source-specific, and artifact-specific. They should route to humans; they should not “auto-clear” risky material.

**Literatures and practices to study:** Media law, pre-publication review, rights management, privacy law, copyright, shield laws, newsroom legal escalation, safety practices.

**Likely artifact:** A **legal/harm risk gate** with blockers, warnings, escalation roles, and immutable review history.

**If ignored:** An autonomous system may publish defamatory, privacy-invasive, or dangerous claims faster than humans can detect.

---

### 15. What benchmark would show that an agentic newsroom system preserves attribution, uncertainty, correction state, and accountability?

**Why it matters editorially:** A serious benchmark must reflect real newsroom failure modes, not just factoid QA.

**Why it matters technically:** The benchmark should include source records, conflicting evidence, protected sources, genre targets, correction events, headlines, metadata, feeds, syndication, and downstream summaries.

**Literatures and practices to study:** AIS, FEVER, AVeriTeC, factual consistency metrics such as QAGS and SummaC, newsroom test desks, standards validation, legal hypotheticals. Current benchmarks are useful but insufficient because they rarely test correction propagation, headline pragmatics, stance boundaries, protected-source handling, or multi-surface publication.

**Likely artifact:** An **Accountable Newsroom Agent Benchmark** with end-to-end tasks: ingest → claim graph → draft → headline → metadata → correction → regenerated downstream artifacts.

**If ignored:** Vendors will optimize for fluent article generation and shallow citation accuracy while failing the actual newsroom accountability problem.

---

## Proposed next papers

### 1. “Editorial Judgment Is Not a Function: Gates, Overrides, and Human Authority in Agentic Newsrooms”

**Summary:** Argues that editorial judgment should be modeled as a combination of checkable gates, noncanonical human decisions, and accountable override records.

**Key research questions:** Which editorial decisions are formalizable? Which are reviewable but not computable? What constitutes a valid override?

**Primary literatures:** Gatekeeping, news values, objectivity studies, standards desks, AI governance.

**Technical implications:** Gate algebra, override schema, human-governed publication state.

---

### 2. “From Provenance to Warrant: Why Authenticity Infrastructure Is Not Enough for Journalism”

**Summary:** Separates provenance, authenticity, source credibility, evidentiary support, editorial warrant, and truth.

**Key research questions:** What does C2PA prove? What does PROV-O represent? What must a newsroom add?

**Primary literatures:** Provenance systems, media forensics, fact-checking, epistemology, legal evidence.

**Technical implications:** Provenance/warrant ontology and validation profiles.

---

### 3. “Headline Pragmatics for Computational Journalism”

**Summary:** Treats headlines as high-risk speech acts with assertion, implication, presupposition, and distribution effects.

**Key research questions:** When is a headline licensed by a claim graph? How do headlines preserve attribution and uncertainty?

**Primary literatures:** Pragmatics, discourse analysis, cognitive misinformation studies, headline/body incongruity detection.

**Technical implications:** Headline checker, headline benchmark, headline/body/claim alignment dataset.

---

### 4. “Correction as Dependency Invalidation: A Truth-Maintenance Model for Newsrooms”

**Summary:** Models corrections as graph updates that invalidate dependent claims, artifacts, feeds, structured data, and downstream summaries.

**Key research questions:** Which dependencies must be tracked? How should corrections propagate through syndication and archives?

**Primary literatures:** Truth maintenance, belief revision, corrections practice, feeds, PROV-O, CMS architecture.

**Technical implications:** Correction propagation graph and regression tests.

---

### 5. “The Omission Ledger: Representing What Newsroom Systems Know but Do Not Publish”

**Summary:** Develops a private/public model of omission as an accountable editorial act.

**Key research questions:** Which omissions require internal rationale? Which require public disclosure? Which must remain protected?

**Primary literatures:** Framing, source protection, legal redaction, harm minimization, public-interest ethics.

**Technical implications:** Omission ledger, salience audits, protected-source redaction policies.

---

### 6. “Demand Is Not Evidence: Assignment Generation Under Search and Social Pressure”

**Summary:** Formalizes how search, social, and audience signals can create assignments without creating factual support.

**Key research questions:** How can query clusters generate reporting tasks? How should SEO pressure be bounded by public-interest gates?

**Primary literatures:** Agenda-setting, platform studies, SEO, audience analytics, service journalism.

**Technical implications:** Demand-to-assignment model, anti-content-farm gate.

---

### 7. “Source Power Graphs: Auditing Official-Source Dependence in Agentic Reporting”

**Summary:** Builds a model for source roles, institutional dependency, independence, anonymity, and affected-community representation.

**Key research questions:** How do automated systems reproduce source hierarchies? What is fair sourcing across beats?

**Primary literatures:** Newsroom sociology, source studies, computational source modeling, community journalism.

**Technical implications:** Source-dependency dashboard and source-role ontology.

---

### 8. “Genre Contracts for Machine-Readable News”

**Summary:** Defines formal contracts for wire briefs, explainers, analysis, opinion, liveblogs, corrections, social cards, feeds, and metadata.

**Key research questions:** What commitments does each genre make? What transformations are forbidden?

**Primary literatures:** Genre theory, discourse planning, NLG, IPTC, schema.org, news standards.

**Technical implications:** Genre contract schema and validation engine.

---

### 9. “Adversarial Editorial Infrastructure: Threat Models for Agentic Newsrooms”

**Summary:** Treats agentic newsroom systems as adversarial environments where sources, tools, prompts, documents, and platforms can be manipulated.

**Key research questions:** What are the newsroom-specific equivalents of prompt injection, tool poisoning, source spoofing, and provenance forgery?

**Primary literatures:** Information disorder, OSINT verification, adversarial ML, MCP security, platform manipulation.

**Technical implications:** Red-team suite, adversary taxonomy, tool/source trust gates.

---

## Proposed technical artifacts

### Authority graph

Solves role confusion among reporters, editors, agents, tools, lawyers, sources, and publishers. It must not decide who has moral legitimacy or final editorial authority automatically.

### Source authority model

Tracks source identity, role, affiliation, authority scope, independence, anonymity, risk, and reliability history. It must not reduce credibility to a single universal score.

### Settlement model

Converts contested evidence into publishable forms such as attributed dispute, unresolved claim, supported narrow claim, or retraction. It must not settle politically or legally contested claims by optimization.

### Headline pragmatics checker

Tests whether a headline overstates, presupposes, causalizes, sensationalizes, or strips attribution from the body and claim graph. It must not write the final headline unaided.

### Omission ledger

Records important known material excluded from publication and why. It must not force disclosure of protected sources or sensitive legal deliberation.

### Genre contract schema

Encodes obligations for wire, explainer, analysis, editorial, correction, liveblog, social card, feed, and structured data. It must not decide newsworthiness.

### Correction propagation graph

Tracks dependencies from claim to all public and machine-readable artifacts. It must not silently rewrite the public record without notice.

### Demand-to-assignment model

Converts queries and social signals into reporting tasks under public-interest and anti-spam gates. It must not treat popularity as evidence.

### Agent/tool/source role taxonomy

Distinguishes observation, assertion, retrieval, inference, drafting, editing, approval, publication, and audit roles. It must not treat tool output as a source unless the tool actually observed or retrieved something.

### Editorial gate algebra

Composes support, attribution, legal, harm, rights, correction, standards, and publication-readiness gates. It must not collapse all gates into one “safe” score.

### Claim-to-sentence alignment benchmark

Tests whether generated prose preserves support, attribution, modality, scope, contradiction, and correction state. It must not rely only on generic NLI.

### Public provenance UX model

Shows readers enough about sourcing, uncertainty, correction, and AI assistance to support accountability. It must not expose private source identities, raw notes, or legally privileged reasoning.

### Adversarial newsroom red-team suite

Tests prompt injection, tool poisoning, forged documents, manipulated analytics, fake sources, and stale corrections. It must not become a checklist substitute for security review.

---

## Risks and critiques

The first risk is **overformalization**. Category theory, topology, fibers, and algebra are useful where they reveal invariants: restriction, projection, dependency, correction, provenance, compatibility, and gate composition. They become harmful when they make framing, judgment, source credibility, or public interest look more canonical than they are.

The second risk is **proceduralism masquerading as truth**. A system can have perfect provenance, valid JSON-LD, a C2PA manifest, a passed SHACL shape, and a signed audit log, while still publishing a misleading or unjust story. Standards validity is not editorial validity; a schema.org-valid `NewsArticle` can contain a false claim.

The third risk is **reproducing newsroom power**. If the system is trained on existing newsroom routines without critique, it will encode official-source dependence, police/prosecutor framing, metropolitan bias, English-language dominance, and historic exclusions as “normal workflow.”

The fourth risk is **labor erasure**. Agentic systems may make editorial labor look like a sequence of machine operations while hiding the judgment, emotional labor, community trust, source cultivation, legal negotiation, and standards work that make journalism accountable.

The fifth risk is **accountability capture**. More records can improve oversight, but they can also become surveillance of reporters, bureaucratic compliance theater, or internal tools for management discipline rather than public accountability.

The sixth risk is **content-farm capture**. The same infrastructure that preserves attribution and corrections could be used to mass-produce SEO-shaped, minimally reported, syntactically well-provenanced articles. Google’s scaled-content and spam policies are a warning that large-scale publication can be manipulative even when individual pages look formally structured.

The seventh risk is **autonomy creep**. A drafting assistant becomes an assignment agent; an assignment agent becomes a publishing recommender; a recommender becomes an autopublisher. The distinction between editorial support software and autonomous publication must remain explicit.

---

## Prioritized roadmap

### Study first

Start with real correction workflows, headline workflows, standards desks, legal review, and source handling. These are the places where the theory’s invariants meet newsroom consequences. Also study failed corrections, misleading headlines, AI-assisted errors, syndication mistakes, and stories where official-source dependence distorted coverage.

### Prototype first

Prototype the **correction propagation graph**, **modality-preserving sentence plan**, **authority graph**, and **genre contract schema** before any autonomous drafting system. These artifacts support accountability even in human-written newsrooms.

### Benchmark first

Build the **Accountable Newsroom Agent Benchmark** around hard cases: contested evidence, allegations, corrections, headline/body mismatch, source attribution loss, AI/tool provenance, structured-data drift, and feed/syndication updates. Existing AIS, FEVER, AVeriTeC, QAGS, and SummaC-style tasks can be components, but the benchmark must be newsroom-native rather than generic factuality testing.

### Keep human-governed

Publication approval, legal-risk overrides, source anonymity, harm minimization, newsworthiness, framing, final headline approval, correction wording, retraction decisions, and editorial stance must remain human-governed. Agents can surface conflicts, draft options, check constraints, and trace dependencies; they should not own public accountability.

### Answer before publication automation is safe

Before any publication automation, the system must answer these questions reliably:

- Who authorized this artifact?
- Which claims does it assert?
- Which sources support each claim?
- Which claims are attributed rather than asserted?
- What uncertainty was preserved?
- What was omitted and why?
- What gates passed or failed?
- What legal or harm risks remain?
- What downstream artifacts will update if this changes?
- Who is accountable if it is wrong?

Until those questions are machine-checkable and institutionally governed, “agentic newsroom” should mean **editorial support infrastructure**, not autonomous journalism.

---

## Reference links and starting bibliography

### Journalism ethics, standards, and trust

- SPJ Code of Ethics: <https://www.spj.org/spj-code-of-ethics/>
- AP generative AI standards: <https://www.ap.org/the-definitive-source/behind-the-news/standards-around-generative-ai/>
- Reuters Trust Principles: <https://www.thomsonreuters.com/en/about-us/trust-principles.html>
- IFCN Code of Principles: <https://ifcncodeofprinciples.poynter.org/the-commitments>
- Trust Project: <https://thetrustproject.org/about/>

### News standards and structured publishing

- IPTC NewsML-G2: <https://iptc.org/standards/newsml-g2/>
- IPTC ninjs: <https://iptc.org/standards/ninjs/>
- IPTC Media Topics: <https://iptc.org/standards/media-topics/>
- schema.org NewsArticle: <https://schema.org/NewsArticle>
- schema.org ClaimReview: <https://schema.org/ClaimReview>
- Google Article structured data: <https://developers.google.com/search/docs/appearance/structured-data/article>
- Google spam policies: <https://developers.google.com/search/docs/essentials/spam-policies>

### Provenance, metadata, and web standards

- W3C PROV-O: <https://www.w3.org/TR/prov-o/>
- W3C RDF Concepts: <https://www.w3.org/TR/rdf11-concepts/>
- W3C SHACL: <https://www.w3.org/TR/shacl/>
- C2PA: <https://c2pa.org/>
- ActivityPub: <https://www.w3.org/TR/activitypub/>
- ActivityStreams Vocabulary: <https://www.w3.org/TR/activitystreams-vocabulary/>
- Atom: <https://datatracker.ietf.org/doc/html/rfc4287>
- JSON Feed: <https://www.jsonfeed.org/version/1.1/>

### Computational journalism, fact-checking, and NLG

- AIS, “Attributable to Identified Sources”: <https://aclanthology.org/2023.cl-4.2/>
- FEVER dataset: <https://fever.ai/dataset/fever.html>
- AVeriTeC dataset: <https://fever.ai/dataset/averitec.html>
- QAGS: <https://aclanthology.org/2020.acl-main.450/>
- SummaC: <https://aclanthology.org/2022.tacl-1.10/>
- FactCC: <https://aclanthology.org/2020.emnlp-main.750/>
- WebNLG: <https://aclanthology.org/W17-3518/>
- DART: <https://aclanthology.org/2021.naacl-main.37/>
- ToTTo: <https://aclanthology.org/2020.emnlp-main.89/>

### Media theory and sociology

- Entman, framing: <https://academic.oup.com/joc/article/43/4/51/4160153>
- McCombs and Shaw, agenda-setting: <https://www.jstor.org/stable/2747787>
- Harcup and O’Neill, news values: <https://www.tandfonline.com/doi/abs/10.1080/1461670X.2016.1150193>
- Tuchman, objectivity as strategic ritual: <https://www.journals.uchicago.edu/doi/abs/10.1086/225193>

### AI governance and agent/tool systems

- NIST AI Risk Management Framework: <https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf>
- MCP tools specification: <https://modelcontextprotocol.io/specification/2025-06-18/server/tools>
- OpenAPI Specification: <https://swagger.io/specification/>

### Legal and safety

- RCFP pre-publication review guide: <https://www.rcfp.org/resources/pre-publication-review-guide/>

