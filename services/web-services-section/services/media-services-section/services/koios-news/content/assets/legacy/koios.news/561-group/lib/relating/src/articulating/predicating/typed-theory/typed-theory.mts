import {
  predicationBaseObjectCoincidenceHolds,
  predicationPredicateCoincidenceHolds,
  predicationTermCoincidenceHolds,
} from "../../carriers.mjs";
import {
  isSpecializationMorphism,
  type BaseCategory,
  type Cell,
  type PredicationBaseObject,
  type PredicationPredicate,
  type PredicationTerm,
  type PredicationDatum,
} from "../../carriers.mjs";
import { count, natZero, type Natural } from "../../carriers.mjs";

/**
 * An inference morphism that specializes a predication base object along a
 * specialization edge: tagged with kind
 * "typedTheory.inferenceMorphism.specialization".
 */
export interface SpecializationInferenceMorphism {
  readonly kind: "typedTheory.inferenceMorphism.specialization";
}

/**
 * An inference morphism that swaps the subject and object of a predication
 * cell: tagged with kind "typedTheory.inferenceMorphism.converse".
 */
export interface ConverseInferenceMorphism {
  readonly kind: "typedTheory.inferenceMorphism.converse";
}

/**
 * An inference morphism that projects a predication cell onto its subject term:
 * tagged with kind "typedTheory.inferenceMorphism.subjectProjection".
 */
export interface SubjectProjectionInferenceMorphism {
  readonly kind: "typedTheory.inferenceMorphism.subjectProjection";
}

/**
 * An inference morphism that projects a predication cell onto its object term:
 * tagged with kind "typedTheory.inferenceMorphism.objectProjection".
 */
export interface ObjectProjectionInferenceMorphism {
  readonly kind: "typedTheory.inferenceMorphism.objectProjection";
}

/**
 * The discriminated union of inference morphism kinds: specialization,
 * converse, subject projection, and object projection.
 */
export type InferenceMorphism =
  | SpecializationInferenceMorphism
  | ConverseInferenceMorphism
  | SubjectProjectionInferenceMorphism
  | ObjectProjectionInferenceMorphism;

/**
 * A witness that two inference morphisms coincide: carries the left and right
 * morphisms compared.
 */
export interface InferenceMorphismIdentityWitness {
  readonly kind: "typedTheory.inferenceMorphismIdentity:witness";
  readonly left: InferenceMorphism;
  readonly right: InferenceMorphism;
}

/**
 * An obstruction recording that two inference morphisms differ: carries the
 * left and right morphisms compared.
 */
export interface InferenceMorphismIdentityObstruction {
  readonly kind: "typedTheory.inferenceMorphismIdentity-obstruction";
  readonly left: InferenceMorphism;
  readonly right: InferenceMorphism;
}

/**
 * The result of comparing two inference morphisms for identity: either a
 * witness of coincidence or an obstruction.
 */
export type InferenceMorphismIdentityJudgment = InferenceMorphismIdentityWitness | InferenceMorphismIdentityObstruction;

/**
 * A trace of inference morphisms composed in order: the morphisms field holds
 * the sequence applied to derive a rule.
 */
export interface InferenceTraceCarrier {
  readonly kind: "typedTheory.inferenceTrace";
  readonly morphisms: readonly InferenceMorphism[];
}

/**
 * An inference rule mapping a domain predication base object to a codomain via
 * a trace of inference morphisms.
 */
export interface InferenceRule {
  readonly kind: "typedTheory.inferenceRule";
  readonly domain: PredicationBaseObject;
  readonly trace: InferenceTraceCarrier;
  readonly codomain: PredicationBaseObject;
}

/**
 * A witness that two inference rules coincide: carries the left and right rules
 * compared.
 */
export interface InferenceRuleIdentityWitness {
  readonly kind: "typedTheory.inferenceRuleIdentity:witness";
  readonly left: InferenceRule;
  readonly right: InferenceRule;
}

/**
 * An obstruction recording that two inference rules differ: carries the left
 * and right rules compared.
 */
export interface InferenceRuleIdentityObstruction {
  readonly kind: "typedTheory.inferenceRuleIdentity-obstruction";
  readonly left: InferenceRule;
  readonly right: InferenceRule;
}

/**
 * The result of comparing two inference rules for identity: either a witness of
 * coincidence or an obstruction.
 */
export type InferenceRuleIdentityJudgment = InferenceRuleIdentityWitness | InferenceRuleIdentityObstruction;

/**
 * A typed theory: a collection of predication base objects together with the
 * inference rules generating arrows between them.
 */
export interface TypedTheoryCarrier {
  readonly kind: "typedTheory.carrier";
  readonly objects: readonly PredicationBaseObject[];
  readonly rules: readonly InferenceRule[];
}

/**
 * A single step in a derivation: applies one inference rule to a premise base
 * object to reach a conclusion base object.
 */
export interface DerivationStep {
  readonly kind: "typedTheory.derivationStep";
  readonly premise: PredicationBaseObject;
  readonly rule: InferenceRule;
  readonly conclusion: PredicationBaseObject;
}

/**
 * A derivation within a theory from a premise base object to a conclusion:
 * carries the ordered steps and their count as length.
 */
export interface Derivation {
  readonly kind: "typedTheory.derivation";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly steps: readonly DerivationStep[];
  readonly length: Natural;
}

/**
 * A witness that two derivations coincide: carries the left and right
 * derivations compared.
 */
export interface DerivationIdentityWitness {
  readonly kind: "typedTheory.derivationIdentity:witness";
  readonly left: Derivation;
  readonly right: Derivation;
}

/**
 * An obstruction recording that two derivations differ: carries the left and
 * right derivations compared.
 */
export interface DerivationIdentityObstruction {
  readonly kind: "typedTheory.derivationIdentity-obstruction";
  readonly left: Derivation;
  readonly right: Derivation;
}

/**
 * The result of comparing two derivations for identity: either a witness of
 * coincidence or an obstruction.
 */
export type DerivationIdentityJudgment = DerivationIdentityWitness | DerivationIdentityObstruction;

/**
 * A witness that a search found a derivation from premise to conclusion in a
 * theory: carries that derivation.
 */
export interface DerivationSearchWitness {
  readonly kind: "typedTheory.derivationSearch:witness";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly derivation: Derivation;
}

/**
 * An obstruction recording that no derivation from premise to conclusion was
 * found: carries the base objects explored and their count as rank.
 */
export interface DerivationSearchObstruction {
  readonly kind: "typedTheory.derivationSearch-obstruction";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly explored: readonly PredicationBaseObject[];
  readonly rank: Natural;
}

/**
 * The outcome of a derivation search: either a witness carrying a found
 * derivation or an obstruction over the explored frontier.
 */
export type DerivationSearchJudgment = DerivationSearchWitness | DerivationSearchObstruction;

/**
 * A witness that a conclusion is derivable from a premise in a theory: carries
 * the deriving derivation.
 */
export interface TypingJudgmentWitness {
  readonly kind: "typedTheory.typing:witness";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly derivation: Derivation;
}

/**
 * An obstruction recording that a conclusion is not derivable from a premise in
 * a theory: carries the underlying derivation search obstruction.
 */
export interface TypingJudgmentObstruction {
  readonly kind: "typedTheory.typing-obstruction";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly search: DerivationSearchObstruction;
}

/**
 * The result of asking whether a conclusion is derivable from a premise in a
 * theory: either a typing witness or an obstruction.
 */
export type TypingJudgment = TypingJudgmentWitness | TypingJudgmentObstruction;

/**
 * An obstruction recording that a derivation step is not justified by the
 * theory: carries the base object at which checking failed and the offending
 * step.
 */
export interface DerivationObstruction {
  readonly kind: "typedTheory.derivation-obstruction";
  readonly theory: TypedTheoryCarrier;
  readonly at: PredicationBaseObject;
  readonly step: DerivationStep;
}

/**
 * The composition closure of a theory's inference rules: carries the generated
 * rule set with its rank and the residual rules not present in the original
 * theory with their rank.
 */
export interface DerivationClosure {
  readonly kind: "typedTheory.derivationClosure";
  readonly theory: TypedTheoryCarrier;
  readonly generated: readonly InferenceRule[];
  readonly generatedRank: Natural;
  readonly residual: readonly InferenceRule[];
  readonly residualRank: Natural;
}

/**
 * A witness that a derivation is valid against a theory: carries the theory and
 * the checked derivation.
 */
export interface DerivationCheckWitness {
  readonly kind: "typedTheory.derivationCheck:witness";
  readonly theory: TypedTheoryCarrier;
  readonly derivation: Derivation;
}

/**
 * The result of checking a derivation against a theory: either a validity
 * witness or a derivation obstruction.
 */
export type DerivationCheckJudgment = DerivationCheckWitness | DerivationObstruction;

/**
 * A proof carrier for a typed theory: pairs the theory and its derivation
 * closure with the typing judgments for every generated rule, the subset that
 * are obstructions, and the judgment count as rank.
 */
export interface TypedTheoryProofCarrier {
  readonly kind: "typedTheory.proof.carrier";
  readonly theory: TypedTheoryCarrier;
  readonly closure: DerivationClosure;
  readonly judgments: readonly TypingJudgment[];
  readonly obstructions: readonly TypingJudgmentObstruction[];
  readonly rank: Natural;
}

/**
 * A predicate word: an ordered sequence of predication predicates, modeling the
 * composition of predicates along a path.
 */
export type PredicateWord = readonly PredicationPredicate[];

/**
 * An arrow from a subject term to an object term labeled by a predicate word:
 * the word records the predicates composed along the arrow.
 */
export interface PredicateWordArrow {
  readonly kind: "typedTheory.predicateWordArrow";
  readonly subject: PredicationTerm;
  readonly word: PredicateWord;
  readonly object: PredicationTerm;
}

/** A collection of predicate word arrows. */
export interface PredicateWordCarrier {
  readonly kind: "typedTheory.predicateWord.carrier";
  readonly arrows: readonly PredicateWordArrow[];
}

/**
 * A potential set of predicate word arrows pending composition: carries the
 * candidate arrows in its potential field.
 */
export interface PredicateWordPotential {
  readonly kind: "typedTheory.predicateWordPotential";
  readonly potential: readonly PredicateWordArrow[];
}

/**
 * The residue of composing predicate words: carries the composition-saturated
 * carrier, the atomic (length-one) arrows it contains, and the composite
 * predicate words of length greater than one.
 */
export interface PredicateWordResidue {
  readonly kind: "typedTheory.predicateWordResidue";
  readonly saturated: PredicateWordCarrier;
  readonly atomic: PredicateWordCarrier;
  readonly composites: readonly PredicateWord[];
}

/**
 * Builds a predication cell from a subject term, predicate, and object term.
 */
export const cellOf = (subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): Cell => ({ subject, predicate, object });

const inferenceRule = (
  morphism: InferenceMorphism,
  domain: PredicationBaseObject,
  codomain: PredicationBaseObject,
  trace: InferenceTraceCarrier = inferenceTrace([morphism]),
): InferenceRule => Object.freeze({
  kind: "typedTheory.inferenceRule" as const,
  domain,
  trace,
  codomain,
});

/** Frozen specialization inference morphism. */
export const specializationInferenceMorphism: SpecializationInferenceMorphism = Object.freeze({
  kind: "typedTheory.inferenceMorphism.specialization" as const,
});

/** Frozen converse inference morphism. */
export const converseInferenceMorphism: ConverseInferenceMorphism = Object.freeze({
  kind: "typedTheory.inferenceMorphism.converse" as const,
});

/** Frozen subject projection inference morphism. */
export const subjectProjectionInferenceMorphism: SubjectProjectionInferenceMorphism = Object.freeze({
  kind: "typedTheory.inferenceMorphism.subjectProjection" as const,
});

/** Frozen object projection inference morphism. */
export const objectProjectionInferenceMorphism: ObjectProjectionInferenceMorphism = Object.freeze({
  kind: "typedTheory.inferenceMorphism.objectProjection" as const,
});

/**
 * Builds a frozen inference trace carrier from a sequence of inference
 * morphisms.
 */
export function inferenceTrace(morphisms: readonly InferenceMorphism[]): InferenceTraceCarrier {
  return Object.freeze({
    kind: "typedTheory.inferenceTrace" as const,
    morphisms: Object.freeze([...morphisms]),
  });
}

/**
 * Derives inference rules from predication data: each specialization morphism
 * yields one specialization rule, and each cell yields converse, subject
 * projection, and object projection rules.
 */
export function inferenceRules(witnesses: readonly PredicationDatum[]): readonly InferenceRule[] {
  const out: InferenceRule[] = [];
  for (const witness of witnesses) {
    if (isSpecializationMorphism(witness)) out.push(inferenceRule(specializationInferenceMorphism, witness.domain, witness.codomain));
    else {
      const cell = witness;
      const node = Object.freeze([cell.subject, cell.predicate, cell.object] as const);
      out.push(inferenceRule(converseInferenceMorphism, node, Object.freeze([cell.object, cell.predicate, cell.subject] as const)));
      out.push(inferenceRule(subjectProjectionInferenceMorphism, node, cell.subject));
      out.push(inferenceRule(objectProjectionInferenceMorphism, node, cell.object));
    }
  }
  return Object.freeze(out);
}

const ruleOfBaseEdge = (morphism: InferenceMorphism) => (edge: { readonly domain: PredicationBaseObject; readonly codomain: PredicationBaseObject }): InferenceRule =>
  inferenceRule(morphism, edge.domain, edge.codomain);

/**
 * Builds a typed theory from a base category: its objects become the theory's
 * objects and its specialization, converse, subject projection, and object
 * projection edges become inference rules.
 */
export function theoryOfBase(base: BaseCategory): TypedTheoryCarrier {
  return Object.freeze({
    kind: "typedTheory.carrier" as const,
    objects: base.objects,
    rules: Object.freeze([
      ...base.specialization.map(ruleOfBaseEdge(specializationInferenceMorphism)),
      ...base.converse.map(ruleOfBaseEdge(converseInferenceMorphism)),
      ...base.subjectProjection.map(ruleOfBaseEdge(subjectProjectionInferenceMorphism)),
      ...base.objectProjection.map(ruleOfBaseEdge(objectProjectionInferenceMorphism)),
    ]),
  });
}

/**
 * Builds a typed theory from predication data: derives the inference rules and
 * collects the distinct domain and codomain base objects they reference as the
 * theory's objects.
 */
export function theoryOfData(data: readonly PredicationDatum[]): TypedTheoryCarrier {
  const rules = inferenceRules(data);
  const objects: PredicationBaseObject[] = [];
  for (const rule of rules) {
    if (!objects.some((object) => predicationBaseObjectCoincidenceHolds(object, rule.domain))) objects.push(rule.domain);
    if (!objects.some((object) => predicationBaseObjectCoincidenceHolds(object, rule.codomain))) objects.push(rule.codomain);
  }
  return Object.freeze({
    kind: "typedTheory.carrier" as const,
    objects: Object.freeze(objects),
    rules,
  });
}

/**
 * Compares two inference morphisms, returning a witness when they share the
 * same kind and an obstruction otherwise.
 */
export function inferenceMorphismIdentity(left: InferenceMorphism, right: InferenceMorphism): InferenceMorphismIdentityJudgment {
  const witness = (): InferenceMorphismIdentityWitness => Object.freeze({
    kind: "typedTheory.inferenceMorphismIdentity:witness" as const,
    left,
    right,
  });
  const obstruction = (): InferenceMorphismIdentityObstruction => Object.freeze({
    kind: "typedTheory.inferenceMorphismIdentity-obstruction" as const,
    left,
    right,
  });
  switch (left.kind) {
    case "typedTheory.inferenceMorphism.specialization":
      switch (right.kind) {
        case "typedTheory.inferenceMorphism.specialization":
          return witness();
        default:
          return obstruction();
      }
    case "typedTheory.inferenceMorphism.converse":
      switch (right.kind) {
        case "typedTheory.inferenceMorphism.converse":
          return witness();
        default:
          return obstruction();
      }
    case "typedTheory.inferenceMorphism.subjectProjection":
      switch (right.kind) {
        case "typedTheory.inferenceMorphism.subjectProjection":
          return witness();
        default:
          return obstruction();
      }
    case "typedTheory.inferenceMorphism.objectProjection":
      switch (right.kind) {
        case "typedTheory.inferenceMorphism.objectProjection":
          return witness();
        default:
          return obstruction();
      }
  }
}

const inferenceMorphismsCoincide = (left: InferenceMorphism, right: InferenceMorphism): boolean =>
  inferenceMorphismIdentity(left, right).kind === "typedTheory.inferenceMorphismIdentity:witness";

const sameTrace = (left: InferenceTraceCarrier, right: InferenceTraceCarrier): boolean =>
  left.morphisms.length === right.morphisms.length
  && left.morphisms.every((morphism, index) => inferenceMorphismsCoincide(morphism, right.morphisms[index]!));

function inferenceRulesCoincide(left: InferenceRule, right: InferenceRule): boolean {
  return predicationBaseObjectCoincidenceHolds(left.domain, right.domain)
    && predicationBaseObjectCoincidenceHolds(left.codomain, right.codomain)
    && sameTrace(left.trace, right.trace);
}

/**
 * Compares two inference rules, returning a witness when their domains,
 * codomains, and traces coincide and an obstruction otherwise.
 */
export function inferenceRuleIdentity(left: InferenceRule, right: InferenceRule): InferenceRuleIdentityJudgment {
  return inferenceRulesCoincide(left, right)
    ? Object.freeze({
      kind: "typedTheory.inferenceRuleIdentity:witness" as const,
      left,
      right,
    })
    : Object.freeze({
      kind: "typedTheory.inferenceRuleIdentity-obstruction" as const,
      left,
      right,
    });
}

const sameGeneratedRule = (left: InferenceRule, right: InferenceRule): boolean =>
  predicationBaseObjectCoincidenceHolds(left.domain, right.domain)
  && predicationBaseObjectCoincidenceHolds(left.codomain, right.codomain);

const composeRule = (left: InferenceRule, right: InferenceRule): InferenceRule =>
  Object.freeze({
    kind: "typedTheory.inferenceRule" as const,
    domain: left.domain,
    trace: inferenceTrace([...left.trace.morphisms, ...right.trace.morphisms]),
    codomain: right.codomain,
  });

/**
 * Closes a set of inference rules under one round of composition: appends each
 * composite of two rules whose codomain meets the next rule's domain, skipping
 * composites with a domain/codomain pair already present.
 */
export function composeInferenceRules(rules: readonly InferenceRule[]): readonly InferenceRule[] {
  const out: InferenceRule[] = [...rules];
  for (const left of rules) {
    for (const right of rules) {
      if (!predicationBaseObjectCoincidenceHolds(left.codomain, right.domain)) continue;
      const rule = composeRule(left, right);
      if (!out.some((existing) => sameGeneratedRule(existing, rule))) out.push(rule);
    }
  }
  return Object.freeze(out);
}

/**
 * Computes the composition closure of a theory's rules by iterating composition
 * to a fixed point: returns the closed theory, the generated rule set with its
 * rank, and the residual rules absent from the original theory with their rank.
 */
export function derivationClosure(theory: TypedTheoryCarrier): DerivationClosure {
  let rules = Object.freeze([...theory.rules]);
  for (;;) {
    const next = composeInferenceRules(rules);
    if (sameGeneratedRuleSet(next, rules)) {
      const closedTheory = Object.freeze({ ...theory, rules });
      const residual = Object.freeze(rules.filter((rule) => !theory.rules.some((original) => sameGeneratedRule(original, rule))));
      return Object.freeze({
        kind: "typedTheory.derivationClosure" as const,
        theory: closedTheory,
        generated: rules,
        generatedRank: count(rules),
        residual,
        residualRank: count(residual),
      });
    }
    rules = next;
  }
}

const sameGeneratedRuleSet = (left: readonly InferenceRule[], right: readonly InferenceRule[]): boolean =>
  left.length === right.length && left.every((rule) => right.some((other) => sameGeneratedRule(rule, other)));

const derivationSearchWitness = (
  theory: TypedTheoryCarrier,
  premise: PredicationBaseObject,
  conclusion: PredicationBaseObject,
  derivation: Derivation,
): DerivationSearchWitness => Object.freeze({
  kind: "typedTheory.derivationSearch:witness" as const,
  theory,
  premise,
  conclusion,
  derivation,
});

const derivationSearchObstruction = (
  theory: TypedTheoryCarrier,
  premise: PredicationBaseObject,
  conclusion: PredicationBaseObject,
  explored: readonly PredicationBaseObject[],
): DerivationSearchObstruction => Object.freeze({
  kind: "typedTheory.derivationSearch-obstruction" as const,
  theory,
  premise,
  conclusion,
  explored: Object.freeze([...explored]),
  rank: count(explored),
});

/**
 * Searches a theory for a derivation from premise to conclusion via
 * breadth-first application of inference rules: returns a search witness with
 * the found derivation, or an obstruction listing the base objects explored.
 */
export function derive(theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject): DerivationSearchJudgment {
  if (predicationBaseObjectCoincidenceHolds(premise, conclusion)) {
    const derivation = Object.freeze({
      kind: "typedTheory.derivation" as const,
      theory,
      premise,
      conclusion,
      steps: Object.freeze([]),
      length: natZero,
    });
    return derivationSearchWitness(theory, premise, conclusion, derivation);
  }
  const queue: Array<{ readonly object: PredicationBaseObject; readonly steps: readonly DerivationStep[] }> = [{ object: premise, steps: [] }];
  const seen: PredicationBaseObject[] = [premise];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    for (const rule of theory.rules.filter((candidate) => predicationBaseObjectCoincidenceHolds(candidate.domain, current.object))) {
      if (seen.some((object) => predicationBaseObjectCoincidenceHolds(object, rule.codomain))) continue;
      const step = Object.freeze({
        kind: "typedTheory.derivationStep" as const,
        premise: current.object,
        rule,
        conclusion: rule.codomain,
      });
      const steps = Object.freeze([...current.steps, step]);
      if (predicationBaseObjectCoincidenceHolds(rule.codomain, conclusion)) {
        const derivation = Object.freeze({
          kind: "typedTheory.derivation" as const,
          theory,
          premise,
          conclusion,
          steps,
          length: count(steps),
        });
        return derivationSearchWitness(theory, premise, conclusion, derivation);
      }
      seen.push(rule.codomain);
      queue.push({ object: rule.codomain, steps });
    }
  }
  return derivationSearchObstruction(theory, premise, conclusion, seen);
}

/**
 * Searches for a derivation from premise to conclusion in the theory built from
 * a base category.
 */
export function deriveInBase(base: BaseCategory, premise: PredicationBaseObject, conclusion: PredicationBaseObject): DerivationSearchJudgment {
  return derive(theoryOfBase(base), premise, conclusion);
}

/**
 * Judges whether a conclusion is derivable from a premise in a theory: returns
 * a typing witness carrying the derivation on success, or a typing obstruction
 * wrapping the failed search.
 */
export function typing(theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject): TypingJudgment {
  const search = derive(theory, premise, conclusion);
  return search.kind === "typedTheory.derivationSearch:witness"
    ? Object.freeze({
      kind: "typedTheory.typing:witness" as const,
      theory,
      premise,
      conclusion,
      derivation: search.derivation,
    })
    : Object.freeze({
      kind: "typedTheory.typing-obstruction" as const,
      theory,
      premise,
      conclusion,
      search,
    });
}

/**
 * Checks that each step of a derivation is justified by a theory rule whose
 * domain, codomain, and trace match the running base object and step: returns a
 * check witness on success, or a derivation obstruction at the first
 * unjustified step.
 */
export function derivationValidity(theory: TypedTheoryCarrier, derivation: Derivation): DerivationCheckJudgment {
  let current = derivation.premise;
  for (const step of derivation.steps) {
    const generated = theory.rules.some((rule) =>
      inferenceRulesCoincide(rule, step.rule)
      && predicationBaseObjectCoincidenceHolds(step.premise, current)
      && predicationBaseObjectCoincidenceHolds(rule.domain, current)
      && predicationBaseObjectCoincidenceHolds(rule.codomain, step.conclusion));
    if (!generated) {
      return Object.freeze({
        kind: "typedTheory.derivation-obstruction" as const,
        theory,
        at: current,
        step,
      });
    }
    current = step.conclusion;
  }
  return Object.freeze({
    kind: "typedTheory.derivationCheck:witness" as const,
    theory,
    derivation,
  });
}

/**
 * Compares two derivations, returning a witness when their premises,
 * conclusions, and step-by-step rules and conclusions coincide and an
 * obstruction otherwise.
 */
export function derivationIdentity(left: Derivation, right: Derivation): DerivationIdentityJudgment {
  const same = predicationBaseObjectCoincidenceHolds(left.premise, right.premise)
    && predicationBaseObjectCoincidenceHolds(left.conclusion, right.conclusion)
    && left.steps.length === right.steps.length
    && left.steps.every((step, index) => {
      const other = right.steps[index]!;
      return inferenceRulesCoincide(step.rule, other.rule) && predicationBaseObjectCoincidenceHolds(step.conclusion, other.conclusion);
    });
  return same
    ? Object.freeze({
      kind: "typedTheory.derivationIdentity:witness" as const,
      left,
      right,
    })
    : Object.freeze({
      kind: "typedTheory.derivationIdentity-obstruction" as const,
      left,
      right,
    });
}

/**
 * Builds a proof carrier for a theory: takes its derivation closure, computes a
 * typing judgment for every generated rule, and collects those judgments, the
 * obstruction subset, and the judgment count as rank.
 */
export function typedTheoryProofCarrier(theory: TypedTheoryCarrier): TypedTheoryProofCarrier {
  const closure = derivationClosure(theory);
  const judgments = Object.freeze(closure.generated.map((rule) => typing(closure.theory, rule.domain, rule.codomain)));
  const obstructions = Object.freeze(judgments.filter((item): item is TypingJudgmentObstruction =>
    item.kind === "typedTheory.typing-obstruction"));
  return Object.freeze({
    kind: "typedTheory.proof.carrier" as const,
    theory: closure.theory,
    closure,
    judgments,
    obstructions,
    rank: count(judgments),
  });
}

/**
 * Builds a predicate word arrow from a subject term to an object term whose
 * word is the single given predicate.
 */
export function predicateWordArrow(subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): PredicateWordArrow {
  return Object.freeze({
    kind: "typedTheory.predicateWordArrow" as const,
    subject,
    word: Object.freeze([predicate] as const),
    object,
  });
}

const predicateWordCarrier = (arrows: readonly PredicateWordArrow[]): PredicateWordCarrier => Object.freeze({
  kind: "typedTheory.predicateWord.carrier" as const,
  arrows: Object.freeze(arrows),
});

const samePredicateWord = (left: PredicateWord, right: PredicateWord): boolean =>
  left.length === right.length && left.every((predicate, index) => predicationPredicateCoincidenceHolds(predicate, right[index]!));

const samePredicateWordArrow = (left: PredicateWordArrow, right: PredicateWordArrow): boolean =>
  predicationTermCoincidenceHolds(left.subject, right.subject)
  && samePredicateWord(left.word, right.word)
  && predicationTermCoincidenceHolds(left.object, right.object);

const atomicPredicateWord = (arrow: PredicateWordArrow): boolean => arrow.word.length === 1;

/**
 * Closes a predicate word carrier under composition: appends the concatenated
 * word arrow for each ordered pair whose left object coincides with the right
 * subject, skipping duplicates.
 */
export function composePredicateWords(input: PredicateWordCarrier): PredicateWordCarrier {
  const arrows: PredicateWordArrow[] = [...input.arrows];
  for (let leftIndex = 0; leftIndex < input.arrows.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < input.arrows.length; rightIndex += 1) {
      if (leftIndex === rightIndex) continue;
      const left = input.arrows[leftIndex]!;
      const right = input.arrows[rightIndex]!;
      if (!predicationTermCoincidenceHolds(left.object, right.subject)) continue;
      const composite = Object.freeze({
        kind: "typedTheory.predicateWordArrow" as const,
        subject: left.subject,
        word: Object.freeze([...left.word, ...right.word]),
        object: right.object,
      });
      if (!arrows.some((arrow) => samePredicateWordArrow(arrow, composite))) arrows.push(composite);
    }
  }
  return predicateWordCarrier(arrows);
}

/**
 * Composes the arrows of a predicate word potential and returns the composed
 * arrows as a new potential.
 */
export function composePredicateWordPotential(input: PredicateWordPotential): PredicateWordPotential {
  const composed = composePredicateWords(Object.freeze({ kind: "typedTheory.predicateWord.carrier" as const, arrows: input.potential }));
  return Object.freeze({
    kind: "typedTheory.predicateWordPotential" as const,
    potential: composed.arrows,
  });
}

/**
 * Filters a predicate word carrier down to its atomic arrows, those whose word
 * has length one.
 */
export function atomicPredicateWords(input: PredicateWordCarrier): PredicateWordCarrier {
  return predicateWordCarrier(input.arrows.filter(atomicPredicateWord));
}

/**
 * Computes the predicate word residue of a set of arrows: saturates them under
 * composition, extracts the atomic arrows, and lists the composite words of
 * length greater than one.
 */
export function predicateWordResidue(input: { readonly arrows: readonly PredicateWordArrow[] }): PredicateWordResidue {
  const saturated = composePredicateWords(predicateWordCarrier(input.arrows));
  const atomic = atomicPredicateWords(saturated);
  return Object.freeze({
    kind: "typedTheory.predicateWordResidue" as const,
    saturated,
    atomic,
    composites: Object.freeze(saturated.arrows.filter((arrow) => arrow.word.length > 1).map((arrow) => Object.freeze(arrow.word))),
  });
}
