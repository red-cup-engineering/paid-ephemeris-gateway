---
title: Claims to Prose — Faithful Editorial Generation
description: A skeptical report arguing that prose generation from structured claims is not a function but a constrained licensed-realization relation, implemented as an auditable NLG pipeline under type/contract constraints, informed by argumentation and provenance, and optionally indexed by editorial context. Surveys NLG/data-to-text, discourse and pragmatics, argumentation and paraconsistency, journalism norms, and faithfulness evaluation; gives an error taxonomy (modality strengthening, attribution erasure, contradiction smoothing, headline overclaim) and a worked MCP example across wire/explainer/editorial/correction genres. Judges "claims-to-prose fiber algebra" justified only in a restricted indexed sense, not as a full theory.
date-created: 2026-06-19
date-modified: 2026-06-19
tags: [claims-to-prose, licensed-realization, natural-language-generation, attribution-preservation, modality-preservation, faithfulness, hallucination, argumentation, paraconsistent, discourse-planning, error-taxonomy, headline-discipline, indexed-realization]
---

# From Structured Claims to Prose: A Skeptical Research Report on Faithful Editorial Generation

## Abstract

The best-supported model is **not** a simple function from claims to prose. Existing research supports a **hybrid model**: a structured claim/evidence/provenance layer; a discourse and genre planning layer; a realization layer; and a verification/editorial gate layer. “Claims-to-prose fiber algebra” is **not an established term** in the relevant literature; exact searches returned mathematical uses of “fiber algebra,” not a known NLG, journalism, or discourse model. At most, a **restricted fibered/indexed model** may help describe how different editorial contexts license different families of prose realizations. It does not replace NLG, discourse theory, argumentation, provenance, semantics, or human editorial judgment.

The central finding: prose generation from evidence should be treated as a **constrained relation and planning problem**, not as direct translation. The output must preserve attribution, modality, uncertainty, contradiction, provenance, correction state, and stance boundaries while allowing genre-appropriate selection, aggregation, ordering, and compression.

---

## 1. The neutral claims-to-prose problem

The neutral problem is:

> Given a structured collection of source statements, observations, claims, evidence, provenance, uncertainty, contradictions, correction state, and editorial goals, produce a prose artifact that is readable and useful without asserting more than the evidence licenses.

This is adjacent to **natural language generation**, especially data-to-text, graph-to-text, RDF-to-text, document planning, discourse planning, and surface realization. Classic NLG already decomposes generation into tasks such as content determination, discourse planning, aggregation, lexicalization, referring-expression generation, and linguistic realization. Reiter and Dale’s applied NLG work is still the clearest pipeline reference point. See: https://www.cambridge.org/core/journals/natural-language-engineering/article/building-applied-natural-language-generation-systems/FEB374A3FF652F06D8567A6FAB2EF36E

The input is **not just facts**. It contains different kinds of items:

| Item | Meaning in this problem |
|---|---|
| **Source statement** | What a source said, wrote, measured, or published. |
| **Claim** | A proposition abstracted from one or more source statements. |
| **Assertion** | A commitment made by the publication’s prose. |
| **Evidence** | Material bearing on a claim’s support, refutation, or uncertainty. |
| **Observation** | A measurement or direct report, often still source-bound. |
| **Inference** | A derived claim licensed by rules, background, or editorial reasoning. |
| **Editorial judgment** | A decision about salience, framing, genre, order, emphasis, or risk. |
| **Interpretation** | A higher-level reading that may be plausible but not simply entailed. |
| **Frame / stance** | The organizing perspective or evaluative posture of the artifact. |
| **Prose sentence** | A linguistic realization that may assert, imply, presuppose, hedge, quote, or attribute. |
| **Headline** | A high-risk compressed artifact with special pragmatic force. |
| **Quotation** | Source wording reproduced under quotation norms. |
| **Paraphrase** | Source content restated in publication wording. |
| **Summary** | Selected compression of a larger evidence or claim set. |
| **Correction** | A later update identifying and repairing a prior error. |
| **Retraction** | Withdrawal of a prior publication or claim status. |
| **Publication artifact** | Story, brief, explainer, editorial, liveblog, correction notice. |
| **Metadata artifact** | Structured metadata describing the artifact. |
| **Search/discovery artifact** | Headline, snippet, schema markup, sitemap, feed entry, social card. |

What must be preserved is not only factual content. It includes **attribution**, **modality**, **evidentiality**, **uncertainty**, **contradiction**, **scope**, **time**, **source dependence**, **correction state**, and **the boundary between reported fact and editorial interpretation**.

What may be transformed includes selection, ordering, aggregation, lexical choice, genre structure, explanatory background, and compression. But compression becomes distortion when it changes the publication’s commitments.

A transformation error occurs when prose **asserts, implies, presupposes, or pragmatically suggests** something not licensed by the structured evidence and editorial rules.

---

## 2. Literature review

### 2.1 Natural language generation and data-to-text

Classic NLG treats generation as a pipeline: decide content, structure it, aggregate propositions, choose words, generate referring expressions, and realize surface syntax. This is directly relevant because claims-to-prose is not one operation; it is a sequence of decisions. Source: https://www.cambridge.org/core/journals/natural-language-engineering/article/building-applied-natural-language-generation-systems/FEB374A3FF652F06D8567A6FAB2EF36E

Modern data-to-text and graph-to-text research extends this to RDF triples, tables, and knowledge graphs. The WebNLG challenge maps RDF triples to text and explicitly tests choices such as lexicalization, aggregation, referring-expression generation, and sentence segmentation. Source: https://aclanthology.org/W17-3518/ DART and ToTTo provide large structured-data-to-text datasets; ToTTo’s authors emphasize controlled table-to-text generation and note hallucination of unsupported phrases as a problem. Sources: https://aclanthology.org/2021.naacl-main.37/ and https://aclanthology.org/2020.emnlp-main.89/

The important lesson is that NLG can formalize **structured input → discourse plan → text**, but most systems do not fully preserve provenance, evidential status, contradiction, or correction history unless those are explicitly represented and constrained. Pipeline and hybrid systems often make these constraints more inspectable than end-to-end neural systems; comparative work on RDF-to-text found explicit intermediate planning could improve generalization and reduce hallucination. Source: https://arxiv.org/abs/1908.09022

### 2.2 Discourse theory, rhetoric, and pragmatics

Prose does not merely list claims. It organizes them using relations such as background, evidence, concession, elaboration, contrast, cause, consequence, and evaluation. Rhetorical Structure Theory models texts as relations among spans, often nucleus-satellite structures. Source: https://www.sfu.ca/rst/05bibliographies/bibs/Mann_Thompson_1988.pdf

This matters because discourse relations can themselves become **additional editorial assertions**. For example:

> “The protocol promises interoperability, but researchers warn of tool-poisoning risks.”

The word “but” introduces a contrast relation. That contrast may be licensed if the evidence really supports a tension between promise and risk; otherwise it is editorial framing disguised as neutral connection.

Formal semantics and pragmatics show why prose can accidentally strengthen claims. Presupposition theory studies information treated as taken for granted; implicature studies what a speaker suggests beyond literal content. Sources: https://plato.stanford.edu/archives/fall2014/entries/presupposition/ and https://plato.stanford.edu/entries/implicature/ Evidentiality and modality mark how a speaker knows something and how strongly it is asserted. English often expresses evidential distinctions through verbs and adverbs such as “alleged,” “reported,” “apparently,” “may,” and “warned.” Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC1890020/

Therefore, a claims-to-prose system must track not only proposition content but also **commitment strength**.

### 2.3 Argumentation, evidence, contradiction, and provenance

Computational argumentation distinguishes claims that support, attack, undercut, or defeat other claims. Dung’s abstract argumentation frameworks model conflict relations among arguments as directed graphs; structured argumentation adds premises, conclusions, and strict or defeasible inference rules. Source: https://ojs.aaai.org/index.php/AAAI/article/view/33651/35806 Defeasible reasoning is especially relevant because journalistic claims are often provisional: later evidence can defeat or qualify earlier support. Source: https://plato.stanford.edu/archives/fall2025/entries/reasoning-defeasible/

Contradiction should not always be resolved. Paraconsistent logics are relevant because they permit reasoning with inconsistent information without trivializing the system. Source: https://iep.utm.edu/para-log/ Provenance semiring work is also relevant: it studies how query results can retain information about the source tuples and derivations that produced them. Source: https://web.cs.ucdavis.edu/~green/papers/pods07.pdf

Fact-checking pipelines usually decompose the task into claim detection, evidence retrieval, and claim verification. Source: https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00454/109469/A-Survey-on-Automated-Fact-Checking FEVER labels claims as supported, refuted, or not enough information, with evidence sentences; AVeriTeC extends this with labels including conflicting evidence or cherry-picking. Sources: https://aclanthology.org/N18-1074/ and https://fever.ai/dataset/averitec.html

These labels are useful for claims-to-prose because prose often needs to say “evidence is mixed,” not force a binary verdict.

### 2.4 Journalism and computational journalism

Journalism already has professional norms for transforming facts and source statements into prose. The SPJ Code emphasizes verification, original sources, context, correction, and the continuing duty to update information. Source: https://www.spj.org/spj-code-of-ethics/ Reuters states principles of integrity, independence, and freedom from bias; its AI guidance stresses human input and disclosure where AI-generated content is involved. Source: https://www.thomsonreuters.com/en/about-us/trust-principles AP’s generative AI standards treat AI output as unvetted source material and say AP does not use tools like ChatGPT to create publishable content without editorial judgment and sourcing. Source: https://www.ap.org/the-definitive-source/behind-the-news/standards-around-generative-ai/

This literature implies that “faithful” prose is not merely logically entailed prose. It must also satisfy professional norms: clear attribution, fair representation, source transparency, correction propagation, headline fairness, and genre-appropriate framing.

Automated journalism research distinguishes template/pipeline approaches from neural approaches. The key relevance here is auditability: a system used for publication must expose what was selected, omitted, attributed, and inferred. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC10445913/

### 2.5 Factuality, faithfulness, and hallucination

Faithfulness is a major open problem in NLG. Surveys define unfaithful generation as text containing information not supported by the input or source material. Source: https://arxiv.org/abs/2203.05227

Several evaluation lines matter:

- **FactCC** checks whether summary claims are consistent with source documents and can identify support or inconsistency spans. Source: https://aclanthology.org/2020.emnlp-main.750/
- **QAGS** uses question answering to compare source and generated summary answers. Source: https://aclanthology.org/2020.acl-main.450/
- **SummaC** uses NLI over source and generated text with sentence-level decomposition and aggregation. Source: https://aclanthology.org/2022.tacl-1.10/
- **Attributable to Identified Sources** asks whether generated output pertaining to the external world is verified against provided source material. Source: https://aclanthology.org/2023.cl-4.2/

These methods are useful but insufficient. NLI models can mishandle presuppositions and implicatures, sometimes treating pragmatic inferences as entailments. Source: https://arxiv.org/abs/2004.03066 That is a serious issue for journalism, where headlines, hedges, and attribution verbs can change commitments without changing obvious factual tokens.

### 2.6 Standards and structured publication artifacts

Relevant standards divide into several groups.

**Publication and discovery metadata.** Schema.org `NewsArticle` models news articles and related metadata; `ClaimReview` models fact-checking reviews of claims. Sources: https://schema.org/NewsArticle and https://schema.org/ClaimReview Google has changed how ClaimReview appears in Search, but still supports it in Fact Check Explorer. Source: https://developers.google.com/search/docs/appearance/structured-data/factcheck

**News exchange formats.** IPTC NewsML-G2 supports exchange of news items and packages with rich metadata; IPTC ninjs provides a JSON representation for news. Source: https://iptc.org/standards/newsml-g2/ IPTC Media Topics provides a taxonomy for categorization. Source: https://iptc.org/standards/media-topics/

**Provenance and validation.** W3C PROV-O represents provenance; SHACL validates RDF graphs against shapes; RDF represents information as triples and, in RDF 1.2, datasets with named graphs. Sources: https://www.w3.org/TR/prov-o/ and https://www.w3.org/TR/shacl/ and https://www.w3.org/TR/rdf12-concepts/

**Content provenance.** C2PA Content Credentials describe manifests, assertions, claims, and signatures for content provenance, but C2PA’s technical “claim” is not the same as a journalistic claim. Source: https://spec.c2pa.org/specifications/specifications/2.4/index.html

**Syndication and distribution.** ActivityPub/ActivityStreams, Atom, JSON Feed, and Google structured data/news sitemap requirements help distribute artifacts but do not, by themselves, preserve claim-to-sentence alignment. Source: https://www.w3.org/TR/activitypub/

The standards landscape can represent articles, metadata, provenance, categories, and fact-check reviews. It does **not** provide a complete standard for claim-to-prose alignment, modality preservation, contradiction handling, or editorial stance tracking.

---

## 3. Candidate models

| Model | What it is | What it models well | What it fails to model | Miniature example | Verdict |
|---|---|---|---|---|---|
| **Function** | `claims → prose` | Deterministic template generation in narrow domains. | Many valid outputs; genre variation; omission; editorial choice; uncertainty. | Same evidence can yield a wire brief, explainer, editorial, or correction. | Too simple except for constrained templates. |
| **Relation** | `Licensed(claim_base, prose)` | Many possible faithful realizations; allows constraints. | Needs separate planning and checking machinery. | “Researchers warn of risks” and “A paper reports risks” may both be licensed. | Core formal view. |
| **Pipeline** | Content selection → discourse plan → realization. | Matches classic NLG; inspectable intermediate choices. | Does not automatically preserve provenance or modality unless designed in. | Select claims C1, C3, C9; order as lede/background/risk. | Necessary but not sufficient. |
| **Planning problem** | Choose content and rhetorical structure under constraints. | Genre, salience, readability, risk tradeoffs. | Objective functions encode editorial values; optimization can hide bias. | Maximize relevance while requiring uncertainty markers. | Useful when paired with contracts. |
| **Type system / contract** | Every sentence plan carries support, attribution, modality, and allowed transformations. | Checkability and audit trail. | Cannot decide newsworthiness or fairness alone. | A sentence with modality `certain` cannot realize a claim with modality `possible`. | Strongly recommended. |
| **Logic / entailment** | Generated assertions must be entailed by claims plus allowed background. | Good for simple factual consistency. | Too strict for summaries, attributions, explanations, and pragmatic effects. | “The company said X” is entailed by a source statement; “X is true” may not be. | Use as one checker, not full model. |
| **Argumentation framework** | Claims support, attack, undercut, or defeat others. | Contradiction, contested claims, corrections. | Does not generate prose structure by itself. | Security paper attacks company’s implied “safe integration” framing. | Combine with discourse planning. |
| **Probabilistic / decision-theoretic** | Optimize expected usefulness, faithfulness, readability, and risk. | Uncertainty and ranking among possible realizations. | Can launder editorial values as numbers. | Penalize unsupported additions and high-risk headlines. | Useful as ranking layer. |
| **Category / fibration / indexed model** | Contexts index families of licensed realizations. | Genre/audience/platform variation; reindexing when context changes. | Not a surface realization theory; little direct empirical support in NLG. | The “wire” fiber licenses neutral attribution; “editorial” fiber licenses explicit stance. | Restricted use only. |
| **Sheaf / gluing model** | Local evidence contexts are checked for compatible global narratives. | Partial, local, contradictory evidence; source-context compatibility. | More plausible for claim graphs than for prose generation itself. | Local legal/security/company accounts may not glue into one settled narrative. | Interesting but mostly auxiliary. |

The best overall model is:

> a **licensed-relation model** implemented as an **auditable NLG pipeline**, constrained by **type/contracts**, informed by **argumentation/provenance**, evaluated by **faithfulness and editorial review**, and optionally indexed by editorial context.

---

## 4. What must be preserved

A faithful claims-to-prose system needs preservation obligations.

1. **Attribution preservation**  
   A source’s statement must not become the publication’s unqualified assertion.

2. **Modality preservation**  
   “May,” “could,” “alleges,” “warns,” “preliminary,” “unconfirmed,” and “according to” must not be strengthened into settled fact.

3. **Evidentiality preservation**  
   Observation, report, inference, estimate, expert interpretation, and company claim must remain distinguishable.

4. **Uncertainty preservation**  
   Unknowns must remain unknown; absence of evidence must not become evidence of absence.

5. **Contradiction preservation**  
   Conflicting evidence must not be smoothed into false consensus.

6. **Provenance preservation**  
   Claims must remain traceable to source records, derivations, and versions.

7. **Correction and retraction state**  
   Corrected or retracted claims must not be reused as current evidence without warning.

8. **Temporal scope**  
   “As of November 2024,” “in the 2025-11-25 specification,” and “in a 2026 security paper” are different commitments.

9. **Stance boundary**  
   Reported fact, analysis, and editorial recommendation must be separated.

10. **Discourse relation licensing**  
    Cause, contrast, concession, trend, and consequence relations must be supported, not smuggled in.

11. **Headline discipline**  
    A headline must not assert more strongly than the story body.

12. **Distribution-layer separation**  
    Search intent, audience fit, platform optimization, and ad suitability are publication constraints, not evidence. They should not alter evidential force.

---

## 5. Error taxonomy

| Error | Definition | Example | Detection / prevention |
|---|---|---|---|
| **Hallucination** | Generated content unsupported by source. | “MCP is a W3C standard” when sources do not say that. | Source alignment, AIS, NLI/QA checks, human review. |
| **Unsupported addition** | Plausible background added as fact. | “The protocol is widely adopted” without adoption evidence. | Require background-claim records. |
| **Omitted qualifier** | Dropping limiting language. | “Researchers found MCP unsafe” from “some clients may be vulnerable.” | Modality contract check. |
| **False certainty** | Uncertain claim presented as settled. | “MCP creates vulnerabilities” instead of “researchers report risks.” | Modality/evidentiality checker. |
| **Modality strengthening** | “May/could/alleged” becomes “is/did.” | “Could expose users” → “exposes users.” | Typed modality lattice. |
| **Attribution erasure** | Source claim becomes publication claim. | “MCP replaces fragmented integrations” instead of “Anthropic says it aims to…” | Attribution map required per sentence. |
| **Quote distortion** | Quotation altered or context removed. | Pulling a phrase to imply a stronger claim. | Quote span verification; source context review. |
| **Paraphrase drift** | Rewording changes meaning. | “Security principles” becomes “security guarantees.” | Paraphrase entailment plus human review. |
| **Causal overclaim** | Cause asserted from mere association or sequence. | “MCP caused new attacks” from “researchers identified risks.” | Discourse-relation license check. |
| **Temporal overclaim** | Time scope broadened. | “The latest spec says…” from an older draft. | Versioned source records. |
| **Entity conflation** | Distinct actors collapsed. | Anthropic, MCP maintainers, Linux Foundation, and implementers treated as one actor. | Entity resolution and role typing. |
| **Contradiction smoothing** | Conflict removed for readability. | Company promise and security critique presented as harmonious. | Argumentation graph must expose attacks/undercuts. |
| **Contested claim as settled** | Disputed proposition stated as fact. | “MCP is secure” despite security critiques. | Claim status: supported/refuted/mixed/insufficient. |
| **Source claim as fact** | A source’s self-description becomes fact. | “Open standard” without independent standard-body context. | Source-type-aware attribution. |
| **Correlation as causation** | Association becomes causal relation. | “Adoption increased because of security controls” without evidence. | Causal relation requires explicit support. |
| **Isolated case as trend** | Single example generalized. | “MCP clients are vulnerable” from one tested client. | Quantifier/scope checker. |
| **Search-demand distortion** | SEO framing alters evidential emphasis. | “Is MCP dangerous?” headline when evidence supports narrower risks. | Distribution metadata separated from article assertions. |
| **Editorial stance disguised as reported fact** | Opinion encoded as neutral report. | “MCP needs regulation” in a news brief without attribution. | Stance labeling and genre contract. |
| **Misleading headline** | Headline stronger than body. | “AI protocol exposes users” while article says “researchers warn of possible risks.” | Headline-body entailment and pragmatic review. |
| **Correction not propagated** | Old error remains in downstream artifacts. | Feed snippet still says “W3C standard” after correction. | Correction propagation tests. |
| **Provenance loss** | Claim no longer traceable. | Sentence has no source alignment. | Required claim alignment and PROV validation. |

The taxonomy is supported by NLG faithfulness literature, summarization consistency work, attribution-aware generation, fact-checking pipelines, and journalism correction/verification norms.

---

## 6. Worked example: agentic web technology

### 6.1 Source records

The example uses Model Context Protocol, because it has a company announcement, a technical specification, and active security analysis.

| Source | Relevant content |
|---|---|
| **S1: Company announcement** | Anthropic announced MCP in November 2024 as an open-source protocol for connecting AI assistants to systems where data lives, aiming to replace fragmented integrations with a standard protocol. Source: https://www.anthropic.com/news/model-context-protocol |
| **S2: Technical specification** | The MCP specification describes an open protocol for integrating LLM applications with external data sources and tools, using hosts, clients, servers, JSON-RPC, resources, prompts, and tools; it also states security principles around consent, access controls, tool safety, and privacy. Source: https://modelcontextprotocol.io/specification/2025-11-25 |
| **S3: Critical/security analysis** | Security researchers have analyzed MCP risks including tool poisoning, prompt injection, capability attestation gaps, and trust propagation, while proposing mitigations such as metadata analysis, decision-path tracking, transparency, and other controls. Source: https://arxiv.org/abs/2603.22489 |

### 6.2 Claim base

| ID | Claim | Status |
|---|---|---|
| C1 | Anthropic introduced MCP in November 2024. | Supported by S1. |
| C2 | MCP is presented as an open protocol for connecting AI assistants or LLM applications to external data sources and tools. | Supported by S1/S2. |
| C3 | MCP uses a host/client/server architecture. | Supported by S2. |
| C4 | MCP uses JSON-RPC and exposes capabilities such as resources, prompts, and tools. | Supported by S2. |
| C5 | The specification includes security principles around consent, access controls, privacy, and tool safety. | Supported by S2. |
| C6 | The specification’s security principles require implementation choices; the protocol description itself is not equivalent to a security guarantee. | Inference from S2; must be marked as interpretation unless directly quoted from spec language. |
| C7 | Security researchers report risks such as tool poisoning, prompt injection, and trust-propagation problems. | Supported by S3. |
| C8 | These risks do not establish that every MCP deployment is unsafe. | Editorially important negative constraint; supported by scope of S3. |
| C9 | MCP may become important infrastructure for agentic systems. | Plausible interpretation; requires attribution or evidence. |
| C10 | Stronger governance/security controls may be needed. | Editorial judgment, not source fact. |

### 6.3 Output A: wire brief

**Prose**

> Anthropic introduced the Model Context Protocol in November 2024 as an open protocol for connecting AI assistants to external data sources and tools. The current specification describes a host-client-server architecture using JSON-RPC and capabilities such as resources, prompts and tools. The specification also lists security principles including user consent, access controls, privacy and tool safety. Recent security analyses warn that MCP implementations can face risks such as tool poisoning and prompt-injection attacks. The available evidence supports the narrower claim that implementations need careful security controls; it does not show that all MCP deployments are unsafe.

**Selected claims:** C1, C2, C3, C4, C5, C7, C8.  
**Omitted claims:** C9 and C10, because a wire brief should avoid unneeded editorial projection.  
**Discourse structure:** lede → technical background → security caveat → scope limitation.  
**Attribution/uncertainty:** “Anthropic introduced,” “specification describes,” “security analyses warn,” “does not show.”  
**Risk:** “current specification” must be versioned in a real newsroom system.  
**Licensed?** Yes, if “current” is bound to the retrieved specification version.

### 6.4 Output B: explanatory article

**Prose**

> Model Context Protocol, or MCP, is a proposed common way for AI applications to connect with external data sources and tools. Anthropic introduced it in 2024, and the specification describes a system in which a host application connects through clients to MCP servers. Those servers can expose resources, prompts and tools over JSON-RPC.  
>
> The appeal is interoperability. Instead of each AI application building a separate connector for every database, repository or business tool, MCP offers a shared pattern for exposing capabilities to an AI system.  
>
> The same design also creates security questions. A tool interface can become a path for prompt injection, excessive permissions, misleading tool descriptions or other forms of trust abuse. The MCP specification includes security principles such as consent and access controls, but those principles still have to be implemented by hosts, clients and servers.  
>
> The safest summary is therefore mixed: MCP addresses a real integration problem, but the evidence does not justify describing it as either a security solution or a security failure. It is an integration protocol whose safety depends heavily on implementation, review and governance.

**Selected claims:** C1–C8.  
**Introduced background:** “interoperability” and “shared pattern” as explanatory framing, licensed by S1/S2 but still interpretive.  
**Discourse structure:** definition → motivation → risk → balanced synthesis.  
**Risk:** The final paragraph is an interpretive synthesis; it should be labeled as analysis if published outside a straight explainer.  
**Licensed?** Mostly yes, provided claim C6 is retained as interpretation rather than specification fact.

### 6.5 Output C: editorial / critical article

**Prose**

> MCP should be treated as security-sensitive infrastructure, not as neutral plumbing. The protocol’s goal is attractive: a common way for AI applications to reach tools and data sources. But a common interface also gives attackers a common target.  
>
> The company announcement and the specification frame MCP around interoperability. Security analyses complicate that framing by identifying risks such as tool poisoning, prompt injection and implicit trust propagation. Those risks do not prove that MCP is unsafe in every deployment, but they do show that implementation choices, permission boundaries and tool metadata deserve more scrutiny than a normal developer-integration story would suggest.  
>
> The editorial judgment is this: publications should avoid describing MCP as a “safe standard” unless they can separately verify the implementation, threat model and governance controls in question.

**Selected claims:** C1, C2, C5, C7, C8.  
**Introduced editorial claims:** “security-sensitive infrastructure,” “not neutral plumbing,” “deserve more scrutiny.”  
**Discourse structure:** thesis → evidence contrast → policy/editorial recommendation.  
**Risk:** Could overstate security risk if headline says “MCP is dangerous.”  
**Licensed?** Yes only as an explicitly labeled editorial/analysis piece. Not licensed as a neutral news brief.

### 6.6 Output D: correction / update notice

**Prose**

> **Correction, June 10, 2026:** An earlier version described Model Context Protocol as a “W3C standard” and said it “guarantees safe tool use.” That was inaccurate. The sources reviewed describe MCP as an open protocol introduced by Anthropic and specified by the MCP project; they do not establish W3C standard status. The specification includes security principles, but those principles do not by themselves guarantee safe implementations. The headline and two body sentences have been revised to restore attribution and add the missing security qualification.

**Claims selected:** C1, C2, C5, C6, C8.  
**Corrected false claims:** “W3C standard,” “guarantees safe tool use.”  
**Discourse structure:** error → correction → reason → propagation notice.  
**Risk:** The correction must propagate to headline, social card, feed item, schema metadata, and internal claim store.  
**Licensed?** Yes, assuming the earlier error occurred.

---

## 7. Evaluation methods

A claims-to-prose system needs multiple evaluation layers.

| Layer | What can be checked automatically | What needs human review |
|---|---|---|
| **Claim extraction** | Extract propositions from generated prose and map them to source claims. | Whether the extracted claim captures pragmatic force. |
| **Source alignment** | Each sentence has source IDs, claim IDs, attribution, and modality. | Whether the chosen source mix is fair. |
| **Factual consistency** | NLI, QA-based checks, AIS-style attribution, contradiction detection. | Whether entailment misses presupposition, implicature, or framing. |
| **Citation verification** | Cited source contains support span; citation is not decorative. | Whether the source is authoritative enough. |
| **Provenance validation** | PROV-O/SHACL/RDF graph constraints; version checks. | Whether provenance is editorially sufficient. |
| **Discourse validation** | Check that causal/contrast/concession relations have licensed relation records. | Whether framing is fair. |
| **Correction propagation** | Regression tests ensure corrected claims do not reappear in snippets, summaries, feeds, or schema. | Whether correction wording is adequate. |
| **Adversarial testing** | Try contradictory sources, missing qualifiers, misleading headlines, SEO pressure, stale retractions. | Whether the system behaves responsibly in novel cases. |
| **Readability/usefulness** | Basic readability, coverage, redundancy, genre fit. | Whether article serves the audience without distortion. |
| **Editorial gate** | Checklist completion. | Final publication decision. |

Existing benchmarks help but do not solve the newsroom case. WebNLG, DART, ToTTo, and E2E test structured-data-to-text generation. FEVER and AVeriTeC test claim verification. SummaC, FactCC, QAGS, and AIS test factuality or attribution.

An agentic newsroom would need a new benchmark with:

- source records, not just clean facts;
- versioned claims and corrections;
- conflicting evidence;
- required genre outputs;
- sentence-level claim alignment;
- headline and metadata artifacts;
- provenance graphs;
- human editorial judgments;
- adversarial examples for modality, attribution, contradiction, and stance.

---

## 8. Implementation sketch

A minimal architecture should not start with category theory. It should start with auditability.

### 8.1 Components

1. **Source store**  
   Stores announcements, papers, interviews, legal records, datasets, corrections, retractions, and standards documents.

2. **Claim store**  
   Normalizes source statements into claim records with modality, attribution, scope, time, and status.

3. **Provenance graph**  
   Links claims to source spans, derivations, versions, corrections, and downstream prose artifacts.

4. **Argumentation layer**  
   Represents support, attack, undercutting, contradiction, defeaters, and unresolved disagreement.

5. **Editorial status model**  
   Tracks draft, verified, contested, corrected, retracted, embargoed, opinion, analysis, sponsored, or unsuitable-for-ad contexts.

6. **Genre/discourse planner**  
   Produces wire brief, explainer, editorial, liveblog, correction, headline, social summary, or metadata plan.

7. **Sentence planner**  
   Creates sentence-level obligations: claim IDs, attribution phrase, modality, discourse relation, source span, and risk flags.

8. **Realization engine**  
   Could be template-based, rule-based, neural, or hybrid. For high-risk domains, templates and constrained decoding should dominate.

9. **Attribution and stance tracker**  
   Ensures “source says,” “evidence suggests,” “publication concludes,” and “editorial argues” remain distinct.

10. **Generated-prose claim extractor**  
    Re-extracts claims from output and compares them with planned claims.

11. **Faithfulness checker**  
    Uses entailment, QA, citation checking, source-span matching, modality checks, contradiction checks, and human review routing.

12. **Correction propagator**  
    Finds all dependent artifacts when a source or claim changes.

13. **Standards emitter**  
    Emits Schema.org, NewsML-G2/ninjs, PROV-O, C2PA, feeds, and sitemaps where appropriate.

14. **Editorial gate evaluator**  
    Requires checklist completion before publication.

### 8.2 TypeScript-like interfaces

```ts
type ID = string;

type Modality =
  | "certain"
  | "probable"
  | "possible"
  | "alleged"
  | "reported"
  | "disputed"
  | "unknown";

type ClaimStatus =
  | "supported"
  | "refuted"
  | "mixed"
  | "insufficient_evidence"
  | "corrected"
  | "retracted"
  | "editorial_judgment";

type SourceKind =
  | "company_announcement"
  | "technical_standard"
  | "research_paper"
  | "legal_record"
  | "interview"
  | "dataset"
  | "news_report"
  | "correction"
  | "retraction";

interface SourceRecord {
  id: ID;
  kind: SourceKind;
  title: string;
  publisher: string;
  publishedAt?: string;
  retrievedAt: string;
  version?: string;
  url?: string;
  provenance: ProvenanceNode[];
  reliabilityNotes?: string[];
}

interface SourceStatement {
  id: ID;
  sourceId: ID;
  spanRef?: string;
  text: string;
  speaker?: string;
  assertedAt?: string;
}

interface Claim {
  id: ID;
  proposition: string;
  sourceStatements: ID[];
  modality: Modality;
  status: ClaimStatus;
  attribution?: string;
  temporalScope?: string;
  entities: string[];
  support: Evidence[];
  attacks: Evidence[];
  qualifiers: string[];
  correctionState?: "current" | "superseded" | "corrected" | "retracted";
}

interface Evidence {
  id: ID;
  sourceId: ID;
  claimId: ID;
  relation: "supports" | "refutes" | "qualifies" | "undercuts";
  strength?: "weak" | "moderate" | "strong";
  notes?: string;
}

interface EditorialStatus {
  genre: "wire" | "explainer" | "analysis" | "editorial" | "correction";
  stance: "neutral_report" | "analysis" | "opinion";
  audience?: string;
  publicationSurface: "article" | "headline" | "feed" | "social" | "schema";
  riskLevel: "low" | "medium" | "high";
}

interface DiscourseRelation {
  type:
    | "background"
    | "elaboration"
    | "evidence"
    | "contrast"
    | "concession"
    | "cause"
    | "consequence"
    | "correction";
  licensedBy: ID[];
}

interface SentencePlan {
  id: ID;
  realizesClaims: ID[];
  sourceIds: ID[];
  requiredAttribution?: string;
  requiredModality: Modality;
  discourseRelation?: DiscourseRelation;
  introducedBackgroundClaims?: ID[];
  riskFlags: string[];
}

interface ProseArtifact {
  id: ID;
  genre: EditorialStatus["genre"];
  title?: string;
  body: string;
  sentencePlans: SentencePlan[];
  metadataArtifacts: ID[];
  createdAt: string;
}

interface ClaimAlignment {
  sentenceId: ID;
  claimIds: ID[];
  sourceSpanRefs: string[];
  assertionStrength: Modality;
  attributionPreserved: boolean;
}

interface FaithfulnessReport {
  artifactId: ID;
  unsupportedClaims: string[];
  modalityStrengthening: string[];
  attributionLosses: string[];
  contradictionSmoothing: string[];
  correctionPropagationFailures: string[];
  requiresHumanReview: boolean;
}

interface CorrectionPlan {
  correctedClaimIds: ID[];
  affectedArtifacts: ID[];
  affectedMetadata: ID[];
  requiredNotices: string[];
}
```

The key design principle: prose generation should produce **sentence plans first**, not free text first. Free text should be checked against the plan and the source graph.

---

## 9. Is “fiber algebra of claims to prose” justified?

### 9.1 No: existing NLG/discourse theory is sufficient

This is partly true. NLG, discourse planning, argumentation, provenance, semantics, factuality evaluation, and journalism standards already provide most necessary concepts. Calling the whole system “fiber algebra” risks obscuring established terms.

### 9.2 Partially: fiber language helps model context variation

This is plausible. Different publication contexts license different prose:

- wire brief;
- explainer;
- editorial;
- headline;
- correction;
- social summary;
- schema metadata;
- search snippet;
- ad-sensitive surface.

A fibered or indexed view could model each context as having a family of allowed realizations and contracts.

### 9.3 Yes, restricted: indexed licensed realizations over editorial contexts

This is the best-supported answer.

A restricted formalization might be:

- base objects: editorial contexts, genres, surfaces, audiences, legal/risk states;
- fiber over a context: licensed discourse and sentence plans for a claim base in that context;
- reindexing: changing from explainer to headline, article to feed, pre-correction to post-correction;
- algebraic operations: select, aggregate, hedge, attribute, contrast, quote, correct, summarize;
- invariants: no unsupported assertion, no modality strengthening, provenance retained, correction propagated, stance marked.

This could clarify **families of licensed outputs**, but it does not generate prose by itself.

### 9.4 Yes, strong: genuine algebraic/fibered formalism gives new invariants

The literature reviewed here does not justify the strong claim. Category-theoretic and sheaf-theoretic work exists in data integration and local-to-global consistency, including functorial data migration and applied sheaf models. Source: https://arxiv.org/abs/1009.1166 But there is not enough evidence that a “claims-to-prose fiber algebra” provides new computable checks beyond existing provenance graphs, type contracts, argumentation frameworks, discourse planning, and validation constraints.

### Final verdict

**Restricted yes, but not strong yes.**

“Claims-to-prose fiber algebra” is a useful name only if it means:

> an indexed family of licensed prose/discourse realizations over editorial contexts, with preservation laws for attribution, modality, provenance, contradiction, correction state, and stance.

It is misleading if it means:

> a complete formal theory of how claims become prose, a deterministic function from evidence to article, or a replacement for NLG, discourse theory, semantics, journalism practice, and human editorial review.

The practical name I would use in a research or engineering setting is:

> **attribution-preserving, provenance-aware, discourse-planned data-to-text generation for editorial artifacts.**

The shorter technical name could be:

> **licensed claim-to-prose realization.**

---

## 10. Annotated bibliography

### Natural language generation and data-to-text

- **Reiter & Dale, “Building applied natural language generation systems.”** Classic account of applied NLG tasks including content determination, discourse planning, aggregation, lexicalization, referring-expression generation, and realization. Source: https://www.cambridge.org/core/journals/natural-language-engineering/article/building-applied-natural-language-generation-systems/FEB374A3FF652F06D8567A6FAB2EF36E
- **Reiter & Dale, *Building Natural Language Generation Systems*.** Standard book-length treatment of document planning, microplanning, and surface realization. Source: https://books.google.com/books/about/Building_Natural_Language_Generation_Sys.html?id=qnWQU9C8bDkC
- **WebNLG Challenge.** RDF-to-text benchmark focused on lexicalization, aggregation, referring expressions, and realization from triples. Source: https://aclanthology.org/W17-3518/
- **DART.** Open-domain structured-data-to-text dataset. Useful for claim/table/record-to-text work but not sufficient for provenance-heavy journalism. Source: https://aclanthology.org/2021.naacl-main.37/
- **ToTTo.** Controlled table-to-text benchmark; important because it explicitly identifies hallucination of unsupported phrases in structured-data generation. Source: https://aclanthology.org/2020.emnlp-main.89/
- **Ferreira et al., pipeline vs. end-to-end RDF-to-text.** Evidence that explicit intermediate representations can improve generalization and reduce hallucination. Source: https://arxiv.org/abs/1908.09022

### Discourse, semantics, and pragmatics

- **Mann & Thompson, Rhetorical Structure Theory.** Foundational model of discourse relations among text spans. Source: https://www.sfu.ca/rst/05bibliographies/bibs/Mann_Thompson_1988.pdf
- **RST and computational text planning work.** Shows how discourse relations can support text planning. Source: https://link.springer.com/chapter/10.1007/978-94-009-3645-4_7
- **Centering theory.** Relevant to coherence and reference tracking, though limited for full editorial reasoning. Source: https://arxiv.org/abs/2210.14678
- **Stanford Encyclopedia of Philosophy, Presupposition.** Useful for understanding hidden commitments in prose and headlines. Source: https://plato.stanford.edu/archives/fall2014/entries/presupposition/
- **Stanford Encyclopedia of Philosophy, Implicature.** Useful for distinguishing literal assertion from suggested meaning. Source: https://plato.stanford.edu/entries/implicature/
- **Evidentiality research.** Relevant to marking information source and strength. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC1890020/

### Argumentation, evidence, and contradiction

- **Dung abstract argumentation frameworks.** Foundational graph model of arguments and attacks. Source: https://ojs.aaai.org/index.php/AAAI/article/view/33651/35806
- **Structured computational argumentation surveys.** Relevant to premises, conclusions, strict and defeasible inference. Source: https://arxiv.org/html/2401.03454v1
- **Defeasible reasoning.** Important for claims that can be overturned by later evidence. Source: https://plato.stanford.edu/archives/fall2025/entries/reasoning-defeasible/
- **Paraconsistent logic.** Relevant for preserving contradiction without explosion. Source: https://iep.utm.edu/para-log/
- **Provenance semirings.** Formal work on retaining derivation/source information in query results. Source: https://web.cs.ucdavis.edu/~green/papers/pods07.pdf
- **FEVER.** Claim verification dataset with supported/refuted/not-enough-information labels and evidence. Source: https://aclanthology.org/N18-1074/
- **AVeriTeC.** Fact-checking benchmark with labels including conflicting evidence and cherry-picking. Source: https://fever.ai/dataset/averitec.html

### Journalism and computational journalism

- **SPJ Code of Ethics.** Verification, source clarity, context, and correction duties. Source: https://www.spj.org/spj-code-of-ethics/
- **Reuters Trust Principles and AI guidance.** Integrity, independence, freedom from bias, human input, and disclosure norms. Source: https://www.thomsonreuters.com/en/about-us/trust-principles
- **AP generative AI standards.** Treats AI output as unvetted source material requiring editorial judgment and sourcing. Source: https://www.ap.org/the-definitive-source/behind-the-news/standards-around-generative-ai/
- **Automated journalism surveys.** Useful background on template, pipeline, and neural approaches to news automation. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC10445913/

### Faithfulness, factuality, and hallucination

- **Faithfulness in NLG survey.** Frames unfaithful generation as a central NLG problem. Source: https://arxiv.org/abs/2203.05227
- **Hallucination in NLG survey.** Broad taxonomy of hallucination across generation tasks. Source: https://dl.acm.org/doi/10.1145/3571730
- **FactCC.** Factual consistency checking for abstractive summarization. Source: https://aclanthology.org/2020.emnlp-main.750/
- **QAGS.** QA-based factual consistency evaluation. Source: https://aclanthology.org/2020.acl-main.450/
- **SummaC.** NLI-based summarization consistency benchmark and method. Source: https://aclanthology.org/2022.tacl-1.10/
- **Attributable to Identified Sources.** Directly relevant to source-grounded generation and attribution-preserving prose. Source: https://aclanthology.org/2023.cl-4.2/

### Standards and metadata

- **Schema.org `NewsArticle` and `ClaimReview`.** Publication and fact-check metadata, not full claim-to-prose alignment. Sources: https://schema.org/NewsArticle and https://schema.org/ClaimReview
- **IPTC NewsML-G2, ninjs, and Media Topics.** News exchange and classification standards. Source: https://iptc.org/standards/newsml-g2/
- **W3C PROV-O.** Provenance representation. Source: https://www.w3.org/TR/prov-o/
- **RDF and SHACL.** Graph representation and validation constraints. Sources: https://www.w3.org/TR/rdf12-concepts/ and https://www.w3.org/TR/shacl/
- **C2PA Content Credentials.** Content provenance infrastructure; useful but not a complete claim-veracity model. Source: https://spec.c2pa.org/specifications/specifications/2.4/index.html
- **ActivityPub/ActivityStreams, Atom, JSON Feed, Google article metadata.** Distribution and discovery standards, not evidence-preservation systems. Source: https://www.w3.org/TR/activitypub/

### Category-theoretic and sheaf-adjacent work

- **Spivak, functorial data migration.** Shows how category theory can model schemas and structure-preserving data migration. Relevant by analogy to provenance and context-indexed artifacts, not directly to prose generation. Source: https://arxiv.org/abs/1009.1166
- **Applied sheaf theory for data integration.** Useful for local-to-global consistency and incompatible local evidence contexts; less directly useful for surface prose. Source: https://people.cs.uchicago.edu/~ericschmid/schmid-applied-sheaf-theory.pdf
- **Exact search for “claims-to-prose fiber algebra.”** No established literature result was found under that phrase; search results concerned unrelated mathematical uses of fibers and fiber algebras. Example: https://math.stackexchange.com/questions/2506909/what-is-the-original-source-of-fiber-in-mathematics
