---
title: "From mark to settling: the predication category, derived"
description: >
  A mathematical account of the predication descent — mark, token/claim, utterance,
  articulating, predicating, positing, settling — as a chain of categorical
  generators. Every object and morphism is defined formally, the structure is
  derived from first principles, and each construction is located against the
  classical theory it generalizes: Frege on predication, Lawvere–Seely
  hyperdoctrines, Grothendieck fibrations, Belnap–Fitting–Avron bilattices, Scott
  domain theory, Knaster–Tarski / Kock–Zöberlein fixed points, Jung–Moshier / Jakl
  d-frames, and the Ghrist–Riess Tarski Laplacian.
status: explanation
kind: explanation
---

# From mark to settling: the predication category, derived

This is mathematics.
It walks the predication descent

$$ \textbf{mark} \;\rightsquigarrow\; \textbf{utterance} \;\xrightarrow{\ \text{articulating}\ }\; \textbf{predicating} \;\xrightarrow{\ \ }\; \textbf{positing} \;\xrightarrow{\ \ }\; \textbf{settling} $$

from the bottom up, defines each categorical object and each morphism precisely, derives why the structure must take the shape it does, and at every step names the classical theory it generalizes and the exact sense of the generalization.
The thesis the whole development defends is a theorem:

> Classical (Fregean, Boolean, two-valued) first-order logic is **not an alternative** to predication category theory.
> It is a **projection** — one fragment of the predication hyperdoctrine, recovered by a derivation, not postulated.

A reading note before we start.
The descent has two readings that run in *opposite* directions, and conflating them is the central error.

- **Generation** runs `articulating → predicating → positing → settling`.
  Each verb is a *generator* — a functor or category constructor — whose codomain is the category the next verb acts inside.
  Generation moves from the most permissive possibility space toward the most committed finite algebra.
- **Regime** is a property of a *finished settling*: how far its closure orbit had to run.
  The regimes — aperiodic, transfinite, Scott-continuous, finite — are indexed by a closure ordinal and form a chain.

The four stage names and the four regime names align (`aperiodic ↔ articulating`, …, `finite ↔ settling`), and the alignment is load-bearing, but a stage is a *constructor* and a regime is a *measurement*.
Keep them apart.

---

## 0. The value substrate, stated first

No object in the descent carries a Boolean truth value, and almost every later definition quantifies over the value space, so we fix it before anything else.

### 0.1 The parameter lattice $\mathbf{L}$

Fix an **integral commutative residuated lattice** $\mathbf{L} = (L, \wedge, \vee, \cdot, \to, 0, 1)$: a bounded lattice with a commutative monoid $(\cdot, 1)$ — *fusion* — whose multiplication is residuated by $\to$,

$$ a \cdot b \le c \iff a \le (b \to c). $$

$\mathbf{L}$ is the parameter lattice: it fixes, per cell and per polarity, *how much* evidence a single side can carry.
The Boolean case is $\mathbf{L} = \mathbf{2}$; nothing below requires it.

### 0.2 The twist product $\mathbf{L}^{\bowtie}$ — the bilattice

A predication's value is not a point of $\mathbf{L}$ but a point of the **twist product**

$$ \mathbf{L}^{\bowtie} \;=\; L \times L, \qquad v = \langle \alpha, \beta\rangle, $$

read as *(evidence for, evidence against)*, the two recorded **independently**.
This is Belnap's (1977) four-valued logic generalized over an arbitrary $\mathbf{L}$ in the Fitting (1991) / Avron (1996) bilattice tradition; Avron's interlaced-bilattice representation theorem says exactly that every bounded interlaced bilattice arises as such a twist product.

$\mathbf{L}^{\bowtie}$ carries **two transverse orders**:

- the **truth order** $\le_t$: $\langle\alpha,\beta\rangle \le_t \langle\gamma,\delta\rangle$ iff $\alpha \le \gamma$ and $\delta \le \beta$ ("more for, less against").
  Bottom $\mathbf f = \langle 0,1\rangle$, top $\mathbf t = \langle 1,0\rangle$.
- the **knowledge order** $\le_k$: $\langle\alpha,\beta\rangle \le_k \langle\gamma,\delta\rangle$ iff $\alpha\le\gamma$ and $\beta\le\delta$ ("more of both").
  Bottom $\bot = \langle 0,0\rangle$ (told nothing), top $\top = \langle 1,1\rangle$ (told both).

The orders are genuinely transverse: $\mathbf t,\mathbf f$ are $\le_t$-extreme but $\le_k$-incomparable middles, and $\bot,\top$ are $\le_k$-extreme but $\le_t$-incomparable middles.
On $\mathbf{L} = \mathbf 2$ this is the four-element bilattice $\mathbf{FOUR} = \{\bot, \mathbf t, \mathbf f, \top\}$, whose Hasse diagram under each order is the same diamond with "extreme" and "middle" exchanged.

Each order has meets and joins $\wedge_t,\vee_t$ and $\wedge_k,\vee_k$.
Two identities about disagreement do most of the later work:

$$ \mathbf t \wedge_t \mathbf f = \mathbf f \qquad\text{and}\qquad \mathbf t \wedge_k \mathbf f = \bot. $$

Truth-meet sends disagreement to falsity; knowledge-meet sends it to no-information.
Negation $\sim\langle\alpha,\beta\rangle = \langle\beta,\alpha\rangle$ swaps the poles (a $\le_t$-involution, a $\le_k$-automorphism); conflation $-$ (when $\mathbf{L}$ has a De Morgan involution) swaps the *roles* of the two orders.

### 0.3 Fusion and residual on the twist product

When $\mathbf{L}$ is residuated, $\mathbf{L}^{\bowtie}$ inherits a **twist-product fusion** $\odot$ and **right residual** $\Rightarrow$:

$$ \langle\alpha,\beta\rangle \odot \langle\gamma,\delta\rangle = \big\langle\, \alpha\cdot\gamma,\ (\alpha\to\delta)\wedge(\gamma\to\beta)\,\big\rangle, \qquad \langle\alpha,\beta\rangle \Rightarrow \langle\gamma,\delta\rangle = \big\langle\, (\alpha\to\gamma)\wedge(\delta\to\beta),\ \alpha\cdot\delta \,\big\rangle, $$

with truth-order residuation $v\odot u \le_t w \iff u \le_t (v\Rightarrow w)$.
By Jakl (2025), Lemma 3.1, for a Heyting algebra $H$ the linear-logic connectives of the Chu construction $\mathrm{Chu}(H,0)$ are term-definable from the bilattice structure of $H^{\bowtie}$ — the Chu tensor *is* $\odot$, Chu's $\multimap$ *is* $\Rightarrow$ — and specializing to $H=\mathbf 2$ gives $\mathbf{FOUR}\cong\mathrm{Chu}(\mathbf 2,0)$ as residuated structures.
The fiber is, on the nose, a model of a fragment of linear logic: a paraconsistent, transfinitely valued linear logic of relations.

**Textbook anchor.** A Boolean algebra is the degenerate twist product in which $\beta = \neg\alpha$ is forced, collapsing $L\times L$ to its $\le_t$-diagonal $\{\mathbf t,\mathbf f\}$ and erasing $\le_k$.
Everything the bilattice adds — $\bot$, $\top$, the second order — is exactly what that collapse discards.

---

## 1. Mark

> **Definition (mark).** Fix a value object $\mathcal V$ (a set, or the underlying object of a free algebraic theory).
> A *mark* is an element of $\mathcal V$ — an atom.
> Relating does not inspect or compare elements of $\mathcal V$ directly.
> A mark becomes available to the descent only when borne by a carrier such as a token or a claim.

A mark is the floor of the recursion: the letter of the alphabet from which everything is generated, carrying no relation, no orientation, and no value beyond its own identity.
There is no core operation that decides arbitrary mark equality.
Coincidence is witnessed around marks by the carriers that bear them; the descent never compares mark payloads by ambient JavaScript identity, deep structure, JSON shape, or any other external value theory.

**Why a mark cannot carry a charge (first derivation obligation).** A bilattice charge $\langle\alpha,\beta\rangle$ is *relational* data: evidence *about a relation between terms*.
A mark is $0$-ary — one atom, with no subject and no object distinguished.
If a mark could carry a charge, charge would be admissible without predication, and the admission discipline (evidence enters only through articulating utterances) would have a side entrance.
The mark layer is therefore value-only by necessity: structural identity, nothing else.

**Textbook anchor.** A mark is a generator of a free structure — the atom before any operation acts on it, the letter prior to any word.
Every higher object is built from marks; marks are built from nothing.

---

## 2. Token and claim — the two non-assembling primitives

> **Definition (token, claim).** A *token* is a mark in the left (subject) role; a *claim* is a mark in the right (predicate) role.
> Each is a **type-stating atom**: it names a coordinate of the eventual relational index.
> The token/claim distinction is purely **positional** — both are marks-in-a-role, differing only by which side they occupy under the two-sided act of articulating.
> The atoms are **non-assembling**: no token is built from other tokens.

**Why exactly two, and why non-assembling (second derivation obligation).** Non-assembling atoms are what give the recursive articulation type *finite* inhabitants — without an atomic floor the constructor would not terminate.
And there must be *two*, not one: a single primitive yields only two articulation states (filled / unfilled), which cannot index the four positions an oriented binary predication needs (subject present/absent $\times$ object present/absent).
Two primitives give a two-sided carrier; the two sides become the two entity coordinates of the eventual predication cell.

**Textbook anchor — and the precise departure from Frege.** Frege's account of predication turns on *saturation*: a sentence splits into a **saturated** part (a name, an object, *gesättigt*) and an **unsaturated** part (a concept, a function with a gap, *ungesättigt*), and predication is the saturation of the gap.
The naive map would set `token = saturated object`, `claim = unsaturated concept`.

The development departs deliberately: **both** token and claim are type-stating atoms, and the asymmetry between them is *positional*, not a saturated/unsaturated type difference.
Frege's concept/object split is recovered *downstream*, at the predicate-category level, as the difference between an entity coordinate (drawn from $E$) and a predicate coordinate (drawn from $\Pi$) — not built into the primitives.
The reason is structural: Frege's split forces a concept to be true-or-false of an object, whereas predication must carry a *bilattice charge*, which the rigid function-application reading cannot express.
So the primitives are kept symmetric, and orientation and value emerge later, rather than baking Frege's asymmetry into the floor.

---

## 3. Utterance — the unit of admission

> **Definition (utterance).** An *utterance* is the ordered pair $\langle \text{token}, \text{claim}\rangle$ — equivalently an element of $\mathrm{Mark}\times \mathrm{Mark}$ with the left coordinate read as a token and the right as a claim.
> The ordered-pair structure is rigid: exactly two slots, no third.

The utterance is the **sole admission boundary** of the theory: evidence enters only by articulating utterances.
There is no operation that admits a charge, a polarity, or a relation directly; charges, edges, and contradictions are all *derived* by folding a collection of utterances through the descent and reading the result.
The asymmetry of the binary relation it will eventually charge is carried by the order of the pair.

**Textbook anchor.** Mathematically the utterance is the unit of the free construction on which articulating acts — the single generator-shaped input from which the entire generated category is built.

---

## 4. Articulating — the constitutive generator

Articulating is the first *generator*: a category constructor, not a value operation.

> **Definition (articulating).** Articulating is the functor $$ \mathrm{articulate} : \mathrm{Utterance} \longrightarrow \mathbf{AperCat}, $$ whose codomain object is the **aperiodic articulation category**, presented initially by an **aperiodic articulation cell**.
> An aperiodic articulation cell is the ordered pair $\langle u,\ (T, C)\rangle$ of a carrier utterance $u = \langle\text{token},\text{claim}\rangle$ and a *pairing term* $(T, C)$, where $T$ is a **token slot** and $C$ a **claim slot**.
> Each slot is empty or singleton: empty $=$ unarticulated, singleton $=$ that side fixed by the carrier utterance.
> Absence is *slot structure*, not a third primitive.

The carrier utterance fixes which token and claim are in play; the pairing term records *how much of the cell has been brought into being*.
Because each slot is independently empty-or-singleton, there are exactly $2\times 2 = 4$ articulation cells — the four phases:

| phase        | token slot | claim slot | reading                              |
|--------------|------------|------------|--------------------------------------|
| **potential**| $\varnothing$ | $\varnothing$ | both sides unarticulated (initial object) |
| **active**   | singleton  | $\varnothing$ | token-side articulated, claim-side not |
| **stable**   | $\varnothing$ | singleton  | claim-side articulated, token-side not |
| **absurd**   | singleton  | singleton  | both sides articulated               |

The generator $\mathrm{articulate}$ lands the initial presentation at the **potential** cell; the other three are reached by slot-filling morphisms *inside* the generated category.

**This 2×2 is the value diamond, one level down.** The four phases are the corners of a diamond indexed by (token present?, claim present?), and this is the same Klein-four / $\mathbf{FOUR}$ shadow that recurs at every categorical level: $\bot$ (potential, nothing articulated) $\leadsto \mathbf t, \mathbf f$ (potential, active — one side each) $\leadsto \top$ (absurd, both at once).
"Absurd" is the name of the $\top$-corner: both sides simultaneously articulated is the articulation-level image of the bilattice's overdetermined "told both."

**The regime.** Articulating generates the **aperiodic** predication category — the bare constructor of the predicational possibility space.
"Aperiodic" is the top regime ($\kappa\ge\omega_1$, §7): articulating commits to nothing about how far downstream closure will run, so it opens the most permissive category.
Consequently a finite settlement can never be read back as the *ontology* of articulating; it is only ever a downstream projection.

**Textbook anchor.** Articulating is the **free** constructor — the left-adjoint / initial-algebra move that brings a structure into being from generators with no relations imposed.
The generated category has the potential cell as **initial object**, and the three slot-fillings are the generating morphisms out of it.
Classical logic has no analogue, because it begins *after* this step, with relations already given; articulating is the act that posits the arena in which relations will later be valued.

---

## 5. Predicating — opening the predication category

> **Definition (predicating).** Predicating is the generator $$ \mathrm{predicate} : \mathbf{PotentialCell} \longrightarrow \mathbf{TransCat}, $$ taking a *potential* articulation cell to the **transfinite predication category** it generates.
> That category carries two data: a **predication cell set** $\Phi$ and a **predication fiber functor** $F$ (the contravariant value-assignment precursor that positing later packages as a fibration).

### 5.1 The predicate category $\mathcal C$ and the cell set $\Phi$

The cell set is

$$ \Phi \;=\; E \times \Pi \times E, $$

with $E$ a declared **entity set** and $\Pi$ a declared **predicate set**.
A single **predication cell** is the oriented triple

$$ \phi = (\text{subject},\ \text{predicate},\ \text{object}) \in E\times\Pi\times E, $$

subject and object from $E$ (the two token coordinates), predicate from $\Pi$ (the claim coordinate).
The cell admits exactly these three coordinates and carries **no value**, and the reason is structural: a cell with a value would make cell-identity valuation-dependent and collapse the fibration. *The cell is a position; the value lives elsewhere.* This is the cleanest break from Frege: predication is split into naming the relation slot (predicating) and charging it (positing).

The predicates $\Pi$ are the objects of the **predicate category** $\mathcal C$, a small category whose morphisms are generated by exactly four canonical classes, each a manipulation of the entity-pair index $E\times E$:

- **specialization** — one predicate refines another;
- **converse** — swap subject/object, $(s,o)\mapsto(o,s)$;
- **subject-projection** — collapse to subject, $(s,o)\mapsto(s,s)$;
- **object-projection** — collapse to object, $(s,o)\mapsto(o,o)$.

### 5.2 The exhaustiveness theorem (why *four*)

That there are exactly four is **proved**, not chosen.

> **Theorem (generator exhaustiveness).** For $|E|\ge 3$, every natural, bottom-preserving bilattice homomorphism $\varphi : A_q \to A_p$ between fiber algebras (§6.1) has the form $$ \varphi(v)(s,o) = \begin{cases}\psi\big(v(g(s,o))\big) & (s,o)\in D\\ \bot & (s,o)\notin D\end{cases} $$ for $g$ one of the four $\mathrm{Sym}(E)$-equivariant index maps (identity, swap, subject-collapse, object-collapse), $D$ a $\mathrm{Sym}(E)$-invariant sub-support, and $\psi$ a bounded bilattice endomorphism.
> Equivalently, $\varphi$ factors through a finite composite of the four generator classes.

The proof shows the four are *forced*.
Pointwise structure makes each evaluation $\mathrm{ev}_{(s',o')}$ a bilattice homomorphism, and a bottom-preserving homomorphism out of a pointwise twist product must factor through a single coordinate — atoms supported at distinct indices $\le_k$-meet to the everywhere-$\bot$ valuation, so at most one index contributes.
Naturality forces the index map $g$ to be $\mathrm{Sym}(E)$-equivariant; and for $|E|\ge 3$, equivariance on the two orbits of $E\times E$ — the diagonal $\Delta$ and the off-diagonal $\Delta^c$ — admits exactly four maps: the diagonal forces $g(s,s)=(s,s)$, while the off-diagonal stabilizer $\mathrm{Sym}(E\setminus\{s,o\})$ pins $g(s,o)\in\{s,o\}^2$, giving $(s,o),(o,s),(s,s),(o,o)$.
These are precisely the orbital relations of the **trivial coherent configuration** of $\mathrm{Sym}(E)\curvearrowright E\times E$.
The four generators are not a design decision; they are the natural transformations the value structure permits.

**The regime.** Predicating generates the **transfinite** predication category.
The cell set is built around a Frege-*saturated* subject/predicate/object position, but the category opened over it is transfinite because the closure that later settles it may run past $\omega$ (§7).
Finite row-shaped records are finite *presentations inside* this layer, never its codomain.

**Textbook anchor.** $\Phi = E\times\Pi\times E$ is the signature of a binary relational structure, and $\mathcal C$ is the **base category of a hyperdoctrine** in Lawvere's (1969) sense — except that the base is generated by a named, exhaustively classified set of relation-manipulating morphisms rather than left arbitrary.
The fiber functor $F : \mathcal C^{\mathrm{op}} \to \mathbf{DBiLat}(\mathbf L)$ (distributive bilattices over $\mathbf L$) is the contravariant "predicates as propositions over contexts" assignment at the heart of categorical logic.
Positing makes it a fibration.

---

## 6. Positing — the fibration, the hyperdoctrine, and the value act

Positing is where charges appear.
It is at once (i) the generator that packages $F$ into a fibration, (ii) the hyperdoctrine structure on that fibration, and (iii) the value-adding morphism.

> **Definition (positing, as generator).** Positing is the generator $$ \mathrm{posit} : \mathbf{TransCat} \longrightarrow \mathbf{ScottPosCat}, $$ taking the transfinite predication category to the **Scott-continuous posit category**.
> Its objects are Scott-continuous posit traces over a fixed base $(\mathbf L,\mathcal C,E)$; its hom-classes are sub-singletons given by the pointwise-and-stepwise **knowledge-order** relation on valuations; and it contains, as an object, the **predication fibration** that packages $F$.

### 6.1 The fiber algebra

For each predicate $p\in\mathcal C$ the **predication fiber algebra** is

$$ A_p \;=\; \mathbf{L}^{\bowtie\,E\times E} \;=\; (L\times L)^{E\times E}. $$

An element is a function from entity pairs to bilattice charges — for each $(s,o)$, an independent (for, against) pair.
All bilattice operations ($\wedge_t,\vee_t,\wedge_k,\vee_k,\sim,\odot,\Rightarrow$) lift **pointwise** from $\mathbf{L}^{\bowtie}$ to $A_p$.
The subscript $p$ records *which* predicate's values are held; it is not a different algebra per predicate.

### 6.2 The predication fibration

> **Definition (predication fibration).** Over base parameters $(\mathbf L,\mathcal C,E)$ — $\mathbf L$ integral commutative residuated, $\mathcal C$ a small predicate category with finite limits, $E$ an entity set — a *predication fibration* is a cloven Grothendieck fibration $p:\mathcal E\twoheadrightarrow\mathcal C$ with: - **(A1) Fiber uniformity.** Each fiber $\mathcal E_q \cong A_q$, viewed as a thin category via its $\le_k$-poset. - **(A2) Generator action.** For each of the four generator classes $f:q\to p$, the reindexing $f^*:\mathcal E_p\to\mathcal E_q$ acts by the specified cellwise reindexing. - **(A3) Fiber structure preservation.** Every $f^*$ is a bilattice-residuated homomorphism: it preserves $\wedge_t,\vee_t,\wedge_k,\vee_k,\sim,\odot,\Rightarrow$ pointwise.

By the Grothendieck construction this is equivalent to the pseudofunctor $F:\mathcal C^{\mathrm{op}}\to\mathbf{DBiLat}(\mathbf L)$ of §5 — the fibration *is* the fiber functor, transposed.
Equivalently (Emmenegger et al. 2024), cloven fibrations over $\mathcal C$ are exactly pseudo-coalgebras for a lax-idempotent 2-comonad $\mathbb N$ on $\mathbf{Cat}/\mathcal C$, so a predication fibration is a pseudo-$\mathbb N$-coalgebra satisfying (A1)–(A3).
(Needed in §8.)

**Textbook anchor.** This is a **Lawvere hyperdoctrine's underlying fibration** — the indexed category of predicates-in-context — with fibers specialized from $\mathbf{Set}$/$\mathbf{Heyt}$ to bilattices and reindexing specialized to the four proved-exhaustive generators.
A reader fluent in fibered category theory (Jacobs, *Categorical Logic and Type Theory*) loses nothing by reading "predication fibration" as "cloven fibration whose fibers are twist-product bilattice algebras and whose reindexing is bilattice-residuated."

### 6.3 The predication hyperdoctrine — *two* parallel adjoint systems

This is the structurally distinctive theorem of the theory.

> **Definition (predication hyperdoctrine).** A predication fibration is a *predication hyperdoctrine* when, for every $f:q\to p$ in $\mathcal C$: - **(B1k)** $\le_k$-quantifier adjoints: $\exists_f^k \dashv f^* \dashv \forall_f^k$. - **(B1t)** $\le_t$-quantifier adjoints: $\exists_f^t \dashv f^* \dashv \forall_f^t$. - **(B2k/B2t)** Frobenius reciprocity for $\wedge_k$ and for $\wedge_t$: $\exists_f^\bullet(f^*\alpha \wedge_\bullet \phi) \cong \alpha \wedge_\bullet \exists_f^\bullet \phi$. - **(B3)** Beck–Chevalley for pullback squares, in *both* adjoint systems. - **(B4)** Comprehension, in both systems.

By Kelly–Lack (1997), (B1)–(B4) are **property-like**: a predication fibration either has this structure or it does not; no further data is chosen.
The decisive feature is that *both* (B1k) and (B1t) hold — the fiber has two complete-lattice orders, each supporting a full Lawvere–Seely adjoint apparatus.
This separates the theory from Maruyama-style **single-adjoint** bilattice hyperdoctrines: it runs *two parallel internal logics on one fibration*.

The five functors $\{\exists^k_f,\exists^t_f,f^*,\forall^t_f,\forall^k_f\}$ form a **centered diamond**: $f^*$ at the center, two outer dyads.
One proves $f^*$ is the unique fixed point of the order-swap conjugation $\sigma_*$ (which carries $\le_k$-structure to $\le_t$-structure): $\sigma_*\circ f^* = f^*\circ\sigma_*$ because reindexing commutes with value-space conjugation, while $\sigma_*$ swaps $\exists^k\leftrightarrow\exists^t$ and $\forall^k\leftrightarrow\forall^t$.
This is the **bigraded diamond** at the predicate level: $\mathbf{FOUR}$ is its centerless $4$-element shadow, and $f^*$ is the center appearing one categorical level up.
(The tower of these diamonds is a *conjecture* on what a predication category fundamentally is — diagonal-$K_4$-equivariant $(\infty,1)$-categories based at $f^*$ with $\mathbf{FOUR}$ as coefficients — flagged as such.)

**One limitation, stated rather than hidden.** Frobenius for the *fusion* $\odot$ **fails**. $\odot$ is non-integral — its unit $\langle1,1\rangle=\top$ is not the $\le_t$-top $\mathbf t$, and its absorber $\mathbf f$ is not the $\le_k$-bottom $\bot$ — and Frobenius requires the connective's absorber to align with the extension value ($\bot$ for $\le_k$, $\mathbf f$ for $\le_t$).
The meets align; $\odot$ does not.
Fusion and residual therefore live at the fiber-algebra layer *beneath* the hyperdoctrine adjoints, not as hyperdoctrinal meets.

### 6.4 The positing morphism, and its naturality

Inside $\mathbf{ScottPosCat}$ the value-adding act is the **positing morphism**

$$ \mathrm{posit}_{(\phi,q)}(v) \;=\; v \;\vee_k\; \delta_{(\phi,q)}, $$

the **knowledge-order least extension** of valuation $v$ by datum $q\in \mathbf{L}^{\bowtie}$ at cell $\phi$, where $\delta_{(\phi,q)}$ is the point-charge equal to $q$ at $\phi$ and $\bot$ elsewhere.
It changes only the fiber for $\phi$'s predicate and only the entity-pair coordinate $\phi$ names; it is monotone, inflationary, and Scott-continuous in $v$.
It is the *first* morphism that places a charge anywhere — the predicating cells carry none; positing values them.

Positing is **natural** under reindexing — a 2-cell in the fibration 2-category.
For any $f:p'\to p$ in $\mathcal C$,

$$ f^*\big(\mathrm{posit}_{(\phi,q)}(v)\big) \;=\; \mathrm{posit}_{(f^*\phi,\,q)}\big(f^*v\big). $$

The datum $q$ is **value-side invariant**; only the cell location moves with the generator action.

**Textbook anchor — Scott / domain theory.** That positing is the *least* extension in $\le_k$, monotone and Scott-continuous, is the domain-theoretic discipline (Scott; Abramsky–Jung, *Domain Theory*): $A_p$ ordered by $\le_k$ is a dcpo, positing is a Scott-continuous inflationary map, and directed joins are unions of evidence.
Evidence accumulates monotonically and never retracts — the open-world, information-monotone reading that classical assertion, which can flip a truth value, cannot provide.

### 6.5 Classical and paraconsistent equality, *derived*

With two comprehension systems (B4), the same diagonal specialization $g:q\to p$ with $\mathrm{dom}(q)=\Delta_E=\{(s,s)\}$ yields **two** equality predicates:

$$ {=_E} := \exists^t_g(\mathbf 1^t_q),\quad {=_E}(s,o)=\begin{cases}\mathbf t & s=o\\ \mathbf f & s\ne o\end{cases} \qquad\text{(classical equality, the $\le_t$-Lawvere image)} $$

$$ \Delta^k_E := \exists^k_g(\mathbf 1^k_q),\quad \Delta^k_E(s,o)=\begin{cases}\top & s=o\\ \bot & s\ne o\end{cases} \qquad\text{(paraconsistent equality, the $\le_k$-Lawvere image).} $$

Both come from the same diagonal $\exists$; they differ only in which adjoint system supplies it. **Neither is postulated — both are forced.** This is the precise sense in which the bilattice first-order logics that *postulate* classical equality ($\mathrm{BD}\Delta$; Kamide–Zohar; Běhounek–Daňková–Dvořák) are subsumed: the theory recovers classical equality as Lawvere's (1969) diagonal-$\exists$ construction in the $\le_t$ system, and gets the $\le_k$-stable paraconsistent equality for free.

---

## 7. Settling — closure to a fixed point

> **Definition (settling).** Settling is the generator $$ \mathrm{settle} : \mathbf{ScottPosCat} \longrightarrow \mathbf{FinSetAlg}, $$ taking the Scott-continuous posit category to a **finite settlement algebra** — the finite projection of the closure orbit's fixed point.

### 7.1 Closure as a lax-idempotent 2-monad

Settling runs **closure** to ground.
Closure is a family $(\mathrm{cl}_p)_{p\in \mathcal C}$, one operator per fiber, each monotone, inflationary, and idempotent, and **$\mathcal C$-natural** in predicate-category morphisms.
The family assembles into the **closure 2-monad** $\mathrm{Cl}$ on the 2-category $\mathbf{PrFib}(\mathbf L,\mathcal C,E)$ of predication fibrations:

- unit $\eta_{\mathrm{Cl}}$ = inflationary inclusion $v \le_k \mathrm{cl}(v)$;
- multiplication $\mu$ = nested-closure collapse $\mathrm{cl}(\mathrm{cl}(v)) = \mathrm{cl}(v)$;
- algebras = $\mathcal C$-closed predication fibrations.

$\mathrm{Cl}$ is **lax-idempotent** (Kock–Zöberlein): one proves Kelly–Lack's (K1) — there is an adjunction $\mu\dashv\eta_{\mathrm{Cl}}$ with identity counit — so by (K2) being a $\mathrm{Cl}$-algebra is a *property* (a fibration is already closed or not), not extra data.
The settling endofunctor driving the orbit is

$$ F_U(\mathcal E)_\tau \;=\; \mathrm{Cl}(\mathcal E) \;\vee_k\; u_\tau, $$

closure-then-merge of the incoming evidence increment $u_\tau$; close-then-merge and merge-then-close agree because $\mathrm{cl}(\mathrm{cl}(X)\vee_k Y)=\mathrm{cl}(X\vee_k Y)$.

### 7.2 The Knaster–Tarski apex

> **Definition (settling apex).** The settlement of an orbit is the **least fixed point** of $F_U$ from the initial valuation: $$ \mathrm{Settle} \;=\; \mathrm{lfp}_{\le_k}\, F_U \;=\; \bigsqcup_{\tau<\kappa} F_U^\tau(\bot). $$

Each fiber under $\le_k$ is a complete lattice and $F_U$ is monotone, so **Knaster–Tarski** gives the least fixed point, reached by transfinite Kleene iteration from $\bot$.
A settlement is therefore not "whatever the orbit produced after running for a while": it is the least fixed point (or a declared finite projection of it).
Bounded iteration without fixed-point evidence is only a prefix.

**Textbook anchor.** This is Knaster–Tarski (least fixed points of monotone maps on complete lattices) and the Kleene fixed-point theorem (Scott-continuous maps reach the lfp by $\omega$-iteration).
The novelty is not the fixed-point theorem but *what* is closed — a bilattice-valued fibration, $\mathcal C$-naturally — and the analysis of *how long* it takes.

### 7.3 The four regimes — closure-ordinal stratification

The **closure ordinal** $\kappa$ — the stage at which $F_U^\tau(\bot)$ stabilizes — stratifies every settling into exactly one of four regimes (*proved*):

| regime | closure ordinal | trigger |
|---|---|---|
| **strict** | $\kappa<\omega$ | $\mathbf L, E, \mathcal C$ all finite (finite ascending chains) |
| **Scott-continuous** | $\kappa=\omega$ | Scott-continuous closure, some base infinite |
| **transfinite-bounded** | $\omega<\kappa<\omega_1$ | non-Scott-continuous, countable cofinality |
| **aperiodic** | $\omega_1\le\kappa$ | non-Scott-continuous, cofinality $\ge\omega_1$ |

These form a **total chain** that is a meet-semilattice: $\mathrm{strict} < \mathrm{scott} < \mathrm{transfinite} < \mathrm{aperiodic}$, with $R\sqcap R'=\min(R,R')$.
A settling at a higher closure ordinal needs the higher upstream categories not to have been projected away — which is *why* finite settlement must never be read back as upstream ontology.

The finite settlement algebra is one finite instance — e.g. $\mathbf{FOUR}^{\Phi}$, a finite cell-set's four-valued settlement. $\mathbf{FOUR}$ belongs **here**, at or below settling, as one finite algebra — never as the substrate of positing.

---

## 8. The bigraded KZ diamond — two disentangled closure axes

Settling lives on a 2-category carrying **two** lax-idempotent (Kock–Zöberlein) structures acting on **disjoint** data.

- **Fibration axis (cleavage).** The Gray–Street fibration 2-monad $\mathbb M$ on $\mathbf{Cat}/\mathcal C$ (dually the Emmenegger 2-comonad $\mathbb N$, with $\mathbb M\dashv\mathbb N$) generates fibrations; its (co)algebras are cloven Grothendieck fibrations.
  This axis touches *cleavage and indexing* — how fibers organize over $\mathcal C$ — and never the values.
- **Closure axis (saturation).** The closure 2-monad $\mathrm{Cl}$ on $\mathbf{PrFib}(\mathcal C)$; its algebras are the $\mathcal C$-closed fibrations.
  This axis touches *values* in $\mathbf{L}^{\bowtie\,E\times E}$ and never the cleavage.

> **Theorem (KZ-diamond strict commutation; status: sketch).** On the temporal 2-category $\mathbf T(\mathcal C,\lambda)$, $\mathrm{Cl}$ and $\mathbb N$ commute via a **strict** distributive law: the canonical 2-cell $\delta:\mathbb N\circ\mathrm{Cl} \Rightarrow \mathrm{Cl}\circ\mathbb N$ is the identity componentwise.

The reason is *axis orthogonality*: $\mathrm{Cl}$ advances values at fixed cleavage, $\mathbb N$ refines cleavage at fixed values, the two act on disjoint aspects of a settling, and the per-side lax-(co)idempotence forces the comparison 2-cell to identities.
This is structurally stronger than the standard Marmolejo machinery for two interacting Kock–Zöberlein doctrines, which needs *pseudo*-distributive laws with coherence cells; here the law is strict.
The corpus marks this **sketch**, with an explicit promotion path; I report its status faithfully rather than as settled.
Its downstream use is §9.3: strict commutation is what makes "iterate everyone-knows, then take the limit" equal "take the limit of the iterates."

---

## 9. Settling cohomology — consensus, disagreement, and the regimes, sheaf-theoretically

A multi-agent settling reads as a **cellular sheaf**, and its cohomology is genuine order-theoretic sheaf theory.

### 9.1 The site and the Tarski Laplacian

The **settling-associated sheaf** $\mathcal F_U$ lives on a **bitopological settling site** built from **d-frames** — Jung–Moshier's (2006) algebraic duals of bitopological spaces, developed in Jakl's (2018) thesis.
A d-frame $\mathbb L=(L_+,L_-,\mathrm{con},\mathrm{tot})$ is two frames (positive/negative evidence — the truth-axis dyad) plus a **consistency** and a **totality** relation on $L_+\times L_-$ (the knowledge-axis dyad).
By the Jung–Rivieccio correspondence a d-frame is a coordinate-chart presentation of a distributive bilattice — the same $\mathbf{L}^{\bowtie}$ data, charted so the four roles appear as two object types.

Cohomology of lattice-valued cellular sheaves is computed by Ghrist–Riess's (2022) **Tarski Laplacian**: an order-preserving endomorphism of the cochain complex whose fixed points (harmonic cochains) are the cohomology, convergence guaranteed by *Tarski's* fixed-point theorem — the same order-theoretic machinery as the closure 2-monad, which is why the two fit.
In degree zero it agrees with the global section functor:

$$ H^0 \;=\; \text{global sections} \;=\; \textbf{consensus}. $$

### 9.2 What the cohomology sees

- **$H^0$ is consensus.** For a multi-observer system $V:\hat G\to \mathrm{Settlings}_B$ on an agent graph $G$ (incidence poset $\hat G$), the limit of the d-frame-valued network sheaf is the **consensus d-frame**: $L_+$ truth-side consensus, $L_-$ falsity-side consensus (*proved*).
- **Con-failure is the $\top$ disagreement witness.** The cellwise $\vee_k$-merge over agents fails the $\mathrm{con}$ relation exactly at cells where one agent has the cell in $L_+$ and another in $L_-$; that con-failure cell receives the value $\top$, recording disagreement as a representable value, not an error.
- **Mayer–Vietoris vanishing is convergence.** $\delta^0=0$ on each shadow component is the statement that replicated settlings converge regardless of merge order — the order-independence of the $\vee_k$-merge, read cohomologically.
- **$H^1$ detects the regime.** $H^1$ of the settling-associated sheaf **vanishes** in the strict and Scott-continuous regimes and is **non-trivial** in the transfinite-bounded and aperiodic regimes.
  Cohomology is not an extra invariant; it is the *signature of which categorical depth the settling inhabits*.
  The lower two regimes are cohomologically calm; the upper two carry orbit invariants unrecoverable from any finite or $\omega$-bounded prefix.
- **Vanishing above degree 1.** $H^n(\mathbf T^*,\mathcal F_U)=0$ for all $n\ge2$ (*proved*, via a Leray spectral sequence: the fiber part is a sum of skyscraper sheaves on Stone spaces — acyclic — and the base poset $\mathcal C^{\mathrm{op}}$ has cohomological dimension $\le1$ for categories built from the four generators).
  All the content lives in $H^0$ (consensus) and $H^1$ (regime obstruction), nowhere higher.

### 9.3 Bigraded common knowledge

Because the hyperdoctrine has two adjoint systems, common knowledge **bigrades**.
There are two everyone-knows operators and two greatest-fixed-point common-knowledge operators:

$$ C^t\phi = \mathrm{gfp}_{\le_t}\,\psi.\,\phi\wedge_t E^t\psi, \qquad C^k\phi = \mathrm{gfp}_{\le_k}\,\psi.\,\phi\wedge_k E^k\psi, $$

each existing by Knaster–Tarski on its complete lattice.
They **generically diverge** — to *different bottoms* — on any non-trivial multi-agent frame: the truth axis collapses disagreement to $\mathbf f$ via $\mathbf t\wedge_t\mathbf f=\mathbf f$, the knowledge axis to $\bot$ via $\mathbf t\wedge_k\mathbf f=\bot$.
This holds *even on Boolean frames* with non-trivial accessibility — the divergence is structural, not a paraconsistent curiosity.
Halpern–Moses classical common knowledge ($C\phi=\bigwedge_n E^n\phi$) is the $\le_t$ shadow; the $\le_k$ operator ("the agents commonly have no evidence") is the genuinely new object, and the two cannot be substituted.
(Status: the two operators exist by Knaster–Tarski, and their divergence follows directly from $\mathbf t\wedge_t\mathbf f=\mathbf f$ versus $\mathbf t\wedge_k\mathbf f=\bot$ at any cell where one agent's evidence is $\mathbf t$ and another's is $\mathbf f$ — witnessed by a three-world frame with two agents accessing disjoint worlds, and elementary. It does *not* rest on §8's strict-commutation sketch; filing it there was an error.)

---

## 10. The payoff: classical logic is a projection, by theorem

The unifying fact, stated precisely.
Classical / Fregean / Boolean first-order logic is the **sub-doctrine** of the predication hyperdoctrine obtained by:

1. choosing $\mathbf L=\mathbf 2$;
2. restricting fiber values to the $\le_t$-classical sub-poset $\{\mathbf t,\mathbf f\}=\{\langle1,0\rangle,\langle0,1\rangle\}$ (dropping $\bot$ and $\top$);
3. working in the $\le_t$ adjoint system only (dropping the entire $\le_k$ system);
4. using $=_E$ — itself the $\le_t$-Lawvere image of the diagonal $\exists$ — as equality.

Under exactly these restrictions, every classical first-order theory recovers as a sub-doctrine, with quantifier adjoints, Frobenius, Beck–Chevalley, and comprehension specializing to their classical Lawvere (1969) forms.
Boolean is not a parallel framework; **Boolean is what is left when you project out everything the bilattice theory adds** — the $\le_k$ axis, the $\bot$ and $\top$ values, paraconsistent equality, the second internal logic.

That is the descent in reverse: a mark is an atom with no relation; an utterance is the only way relation-bearing data enters; articulating opens the arena; predicating names the relation slots and proves there are exactly four ways to move between them; positing charges them in a doubly-ordered bilattice fibration whose two adjoint systems make classical and paraconsistent logic two faces of one structure; and settling runs a Kock–Zöberlein closure to a Knaster–Tarski fixed point whose regime — measured by closure ordinal, seen through Tarski-Laplacian cohomology — measures how much of the structure had to stay alive to reach it.

---

## Appendix A. Objects and morphisms, with signatures

| name | kind | signature / data | gloss |
|---|---|---|---|
| mark | object (setoid) | element of $\mathcal V$; identity = equality | atom; floor of the recursion |
| token / claim | object | a mark in the left / right role | positionally-typed primitive |
| utterance | object | $\langle\text{token},\text{claim}\rangle\in\mathrm{Mark}^2$ | the only admission unit |
| articulating | generator | $\mathrm{Utterance}\to\mathbf{AperCat}$ | opens the aperiodic possibility space |
| articulation cell | object | $\langle u,(T,C)\rangle$, slots $\in\{\varnothing,\text{singleton}\}$ | the 2×2 phase carrier |
| potential / active / stable / absurd | objects | $(\varnothing,\varnothing)/(\bullet,\varnothing)/(\varnothing,\bullet)/(\bullet,\bullet)$ | four phases = FOUR shadow |
| predicating | generator | $\mathbf{PotentialCell}\to\mathbf{TransCat}$ | opens the transfinite predication category |
| predicate category $\mathcal C$ | category | objects $\Pi$; 4 generator classes | base of the hyperdoctrine |
| predication cell | object | $\phi=(s,p,o)\in E\times\Pi\times E$, **value-free** | the relation slot |
| four generators | morphisms | specialization, converse, subject-/object-projection | proved exhaustive ($|E|\ge3$) |
| fiber algebra $A_p$ | object | $\mathbf{L}^{\bowtie\,E\times E}$ | per-predicate bilattice values |
| predication fibration | object | cloven Groth. fib. $\mathcal E\twoheadrightarrow\mathcal C$, (A1–A3) | indexed bilattice algebra |
| reindexing $f^*$ | morphism | bilattice-residuated fiber hom | substitution along a generator |
| predication hyperdoctrine | object | fibration + (B1k,B1t,B2,B3,B4) | two parallel adjoint systems |
| $\exists^\bullet_f\dashv f^*\dashv\forall^\bullet_f$ | adjoints | $\bullet\in\{k,t\}$ | quantifiers, per order |
| positing | generator / 2-cell | $\mathrm{posit}_{(\phi,q)}(v)=v\vee_k\delta_{(\phi,q)}$ | $\le_k$-least extension; natural under $f^*$ |
| settling | generator | $\mathbf{ScottPosCat}\to\mathbf{FinSetAlg}$ | closure to a fixed point |
| closure 2-monad $\mathrm{Cl}$ | 2-monad | lax-idempotent (KZ) on $\mathbf{PrFib}$ | saturation under inference |
| settlement apex | object | $\mathrm{lfp}_{\le_k}F_U$ | Knaster–Tarski fixed point |
| $\mathbb M\dashv\mathbb N$ | 2-(co)monad | Gray–Street / Emmenegger on $\mathbf{Cat}/\mathcal C$ | fibration / cleavage axis |
| settling-associated sheaf $\mathcal F_U$ | sheaf | on the bitopological d-frame site | $H^0$=consensus, $H^1$=regime obstruction |
| $C^t,C^k$ | gfp operators | $\mathrm{gfp}_{\le_t},\mathrm{gfp}_{\le_k}$ | bigraded common knowledge |

## Appendix B. Lineage

External theory the development generalizes, by section:

- **§0 (values).** Belnap (1977), *A useful four-valued logic*; Fitting (1991), bilattices and logic programming; Avron (1996), interlaced-bilattice representation; Jakl (2025), $\mathbf{FOUR}\cong\mathrm{Chu}(\mathbf 2,0)$ and the linear-logic reading.
- **§2 (primitives).** Frege, concept/object and saturation — and the deliberate departure (positional, not saturated/unsaturated, primitives).
- **§5–6 (predicate category, fibration, hyperdoctrine).** Lawvere (1969), *Adjointness in foundations* (hyperdoctrines, equality as the diagonal-$\exists$ Lawvere image); Lawvere (1970); Maruyama (single-adjoint bilattice hyperdoctrines, contrasted); Grothendieck fibrations (Jacobs); Emmenegger et al. (2024), fibrations as $\mathbb N$-coalgebras; Kelly–Lack (1997), property-likeness.
- **§6.4 (positing).** Scott; Abramsky–Jung, *Domain Theory* (dcpos, Scott continuity, least extension).
- **§7–8 (settling, KZ diamond).** Knaster–Tarski and Kleene fixed-point theorems; Kock–Zöberlein / lax-idempotent 2-monads; Gray–Street and Emmenegger fibration 2-(co)monads.
- **§9 (cohomology).** Jung–Moshier (2006) and Jakl (2018), d-frames and the bitopological Stone duality; Ghrist–Riess (2022), *Cellular Sheaves of Lattices and the Tarski Laplacian*; Halpern–Moses (common knowledge, recovered as the $\le_t$ shadow).

> **Status note.** Where a result is *proved* (generator exhaustiveness, the four-regime dichotomy, regime chain order, closure lax-idempotence, network-sheaf consensus, cohomology vanishing above degree 1, the bigraded common-knowledge divergence) it is stated as such.
> Where a result is *sketch* (KZ-diamond strict commutation) or *conjecture* (the bigraded-diamond tower as the definition of a predication category) it is marked explicitly.
> This account explains and connects; the bigraded common-knowledge divergence is the one result whose status it sharpens — from the corpus's sketch to the elementary frame argument of §9.3 — and it upgrades nothing else.
