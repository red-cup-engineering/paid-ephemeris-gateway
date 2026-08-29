---
type: morphism
class: derivation-act
status: draft
depends-on: [derivation, agent, witness, settling]
---

# Deriving

The morphism by which a [derivation](../concepts/derivation.md) (a workitem subtype) produces its result.
Deriving is *agent-driven* application of rules, proofs, or analyses to produce conclusions from premises.
The derivation's output is a substrate-recordable result-cell; deriving is what produces it.

Deriving differs from [settling](settling.md) (which is closure-driven, automatic, deterministic): deriving is deliberate.
An agent reads premises, applies their skill (a proof technique, an analysis method, an inference procedure), and produces a witness recording the derived result and its support-chain.

## Action

For an agent $A$ holding skill $\Sigma$ over a derivation $\Delta$ with premises $P$ at moment $\tau$:

$$\mathrm{deriving}_A \colon (\Delta, P, \Sigma) \;\longrightarrow\; w_{A,\Delta,\tau} \text{ recording the result and its support-chain in } P$$

The result cell carries provenance: which premises it depends on, what skill the agent applied, what intermediate cells were used.
Replay reproduces the derivation given the same premises and the same skill-invocation.

## Deriving and warrant

A derived cell's *warrant* is its support-chain.
Reading "why is X true?" against a derived cell traces back through deriving-witnesses to their premises, recursively, until the chain reaches axioms (charter cells, captain enactments, settled observations).

This is what makes derivations auditable: the chain-of-reasoning is system-resident, not in the agent's working memory.

## Deriving vs. settling

Both produce consequence cells; both follow rules.
The distinction:

- **Settling** is closure-driven: deterministic, automatic, fires whenever cells become unsettled, no agent attribution.
- **Deriving** is agent-driven: deliberate, agent-attributed, produces results that closure rules might not reach without the agent's choice of approach.

A theorem-proof is deriving (the prover chose a strategy); the propagation of cells under "if-A-then-B" closure rules is settling (it just fires).

## Deriving and skills

An agent can perform deriving only via a skill they hold.
Different skills support different derivation kinds: theorem-proving, code-analysis, audit-finding, inference.
The skill bounds what the agent can derive; deriving outside skill produces audit-rejected witnesses.

## What this morphism does not specify

- The schema of derivation-witnesses (per-skill currently).
- The discipline for revoking erroneous derivations (one finds a flaw in a proof; what happens to downstream cells that cited the result?).
- Multi-step derivations (a long proof decomposed across multiple deriving-events).
