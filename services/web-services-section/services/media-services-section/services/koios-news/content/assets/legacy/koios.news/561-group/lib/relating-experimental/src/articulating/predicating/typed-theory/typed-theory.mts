/**
 * predicating/typed-theory — consequence over predication base objects.
 *
 * The logic generated inside predicating: inference morphisms (specialization,
 * converse, subject/object projection) over base objects, inference rules and
 * their composition closure, breadth-first derivation search, typing judgments
 * (is the conclusion derivable from the premise?), derivation validity checking,
 * and predicate words (composition of predicates along a path). Self-contained
 * over predication coincidence and the exact `count`/`natZero`.
 */
import {
  baseObjectCoincides,
  predicateCoincides,
  termCoincides,
  isSpecializationMorphism,
  type BaseCategory,
  type Cell,
  type PredicationBaseObject,
  type PredicationPredicate,
  type PredicationTerm,
  type PredicationDatum,
} from "../predication.mjs";
import { count, natZero, type Natural } from "../positing/settling/analysis/exact-number.mjs";

/** An inference morphism specializing a base object along a specialization edge. */
export interface SpecializationInferenceMorphism { readonly kind: "typedTheory.inferenceMorphism.specialization"; }
/** An inference morphism swapping subject and object of a cell. */
export interface ConverseInferenceMorphism { readonly kind: "typedTheory.inferenceMorphism.converse"; }
/** An inference morphism projecting a cell onto its subject. */
export interface SubjectProjectionInferenceMorphism { readonly kind: "typedTheory.inferenceMorphism.subjectProjection"; }
/** An inference morphism projecting a cell onto its object. */
export interface ObjectProjectionInferenceMorphism { readonly kind: "typedTheory.inferenceMorphism.objectProjection"; }

/** The inference morphism kinds. */
export type InferenceMorphism =
  | SpecializationInferenceMorphism
  | ConverseInferenceMorphism
  | SubjectProjectionInferenceMorphism
  | ObjectProjectionInferenceMorphism;

/** Two inference morphisms coincide. */
export interface InferenceMorphismIdentityWitness { readonly kind: "typedTheory.inferenceMorphismIdentity:witness"; readonly left: InferenceMorphism; readonly right: InferenceMorphism; }
/** Two inference morphisms differ. */
export interface InferenceMorphismIdentityObstruction { readonly kind: "typedTheory.inferenceMorphismIdentity-obstruction"; readonly left: InferenceMorphism; readonly right: InferenceMorphism; }
/** The result of comparing two inference morphisms. */
export type InferenceMorphismIdentityJudgment = InferenceMorphismIdentityWitness | InferenceMorphismIdentityObstruction;

/** A trace of inference morphisms composed in order. */
export interface InferenceTraceCarrier { readonly kind: "typedTheory.inferenceTrace"; readonly morphisms: readonly InferenceMorphism[]; }

/** An inference rule: domain → codomain via a trace. */
export interface InferenceRule {
  readonly kind: "typedTheory.inferenceRule";
  readonly domain: PredicationBaseObject;
  readonly trace: InferenceTraceCarrier;
  readonly codomain: PredicationBaseObject;
}

/** Two inference rules coincide. */
export interface InferenceRuleIdentityWitness { readonly kind: "typedTheory.inferenceRuleIdentity:witness"; readonly left: InferenceRule; readonly right: InferenceRule; }
/** Two inference rules differ. */
export interface InferenceRuleIdentityObstruction { readonly kind: "typedTheory.inferenceRuleIdentity-obstruction"; readonly left: InferenceRule; readonly right: InferenceRule; }
/** The result of comparing two inference rules. */
export type InferenceRuleIdentityJudgment = InferenceRuleIdentityWitness | InferenceRuleIdentityObstruction;

/** A typed theory: base objects and the inference rules between them. */
export interface TypedTheoryCarrier {
  readonly kind: "typedTheory.carrier";
  readonly objects: readonly PredicationBaseObject[];
  readonly rules: readonly InferenceRule[];
}

/** One step of a derivation. */
export interface DerivationStep {
  readonly kind: "typedTheory.derivationStep";
  readonly premise: PredicationBaseObject;
  readonly rule: InferenceRule;
  readonly conclusion: PredicationBaseObject;
}

/** A derivation from premise to conclusion. */
export interface Derivation {
  readonly kind: "typedTheory.derivation";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly steps: readonly DerivationStep[];
  readonly length: Natural;
}

/** Two derivations coincide. */
export interface DerivationIdentityWitness { readonly kind: "typedTheory.derivationIdentity:witness"; readonly left: Derivation; readonly right: Derivation; }
/** Two derivations differ. */
export interface DerivationIdentityObstruction { readonly kind: "typedTheory.derivationIdentity-obstruction"; readonly left: Derivation; readonly right: Derivation; }
/** The result of comparing two derivations. */
export type DerivationIdentityJudgment = DerivationIdentityWitness | DerivationIdentityObstruction;

/** A derivation was found from premise to conclusion. */
export interface DerivationSearchWitness {
  readonly kind: "typedTheory.derivationSearch:witness";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly derivation: Derivation;
}

/** No derivation was found (the explored frontier). */
export interface DerivationSearchObstruction {
  readonly kind: "typedTheory.derivationSearch-obstruction";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly explored: readonly PredicationBaseObject[];
  readonly rank: Natural;
}

/** The outcome of a derivation search. */
export type DerivationSearchJudgment = DerivationSearchWitness | DerivationSearchObstruction;

/** A conclusion is derivable from a premise. */
export interface TypingJudgmentWitness {
  readonly kind: "typedTheory.typing:witness";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly derivation: Derivation;
}

/** A conclusion is not derivable from a premise. */
export interface TypingJudgmentObstruction {
  readonly kind: "typedTheory.typing-obstruction";
  readonly theory: TypedTheoryCarrier;
  readonly premise: PredicationBaseObject;
  readonly conclusion: PredicationBaseObject;
  readonly search: DerivationSearchObstruction;
}

/** The result of a typing judgment. */
export type TypingJudgment = TypingJudgmentWitness | TypingJudgmentObstruction;

/** A derivation step not justified by the theory. */
export interface DerivationObstruction {
  readonly kind: "typedTheory.derivation-obstruction";
  readonly theory: TypedTheoryCarrier;
  readonly at: PredicationBaseObject;
  readonly step: DerivationStep;
}

/** The composition closure of a theory's rules. */
export interface DerivationClosure {
  readonly kind: "typedTheory.derivationClosure";
  readonly theory: TypedTheoryCarrier;
  readonly generated: readonly InferenceRule[];
  readonly generatedRank: Natural;
  readonly residual: readonly InferenceRule[];
  readonly residualRank: Natural;
}

/** A valid derivation against a theory. */
export interface DerivationCheckWitness {
  readonly kind: "typedTheory.derivationCheck:witness";
  readonly theory: TypedTheoryCarrier;
  readonly derivation: Derivation;
}

/** The result of checking a derivation against a theory. */
export type DerivationCheckJudgment = DerivationCheckWitness | DerivationObstruction;

/** A proof carrier for a typed theory. */
export interface TypedTheoryProofCarrier {
  readonly kind: "typedTheory.proof.carrier";
  readonly theory: TypedTheoryCarrier;
  readonly closure: DerivationClosure;
  readonly judgments: readonly TypingJudgment[];
  readonly obstructions: readonly TypingJudgmentObstruction[];
  readonly rank: Natural;
}

/** A predicate word: an ordered sequence of predicates. */
export type PredicateWord = readonly PredicationPredicate[];

/** An arrow from a subject to an object labeled by a predicate word. */
export interface PredicateWordArrow {
  readonly kind: "typedTheory.predicateWordArrow";
  readonly subject: PredicationTerm;
  readonly word: PredicateWord;
  readonly object: PredicationTerm;
}

/** A collection of predicate word arrows. */
export interface PredicateWordCarrier { readonly kind: "typedTheory.predicateWord.carrier"; readonly arrows: readonly PredicateWordArrow[]; }

/** A potential set of predicate word arrows pending composition. */
export interface PredicateWordPotential { readonly kind: "typedTheory.predicateWordPotential"; readonly potential: readonly PredicateWordArrow[]; }

/** The residue of composing predicate words. */
export interface PredicateWordResidue {
  readonly kind: "typedTheory.predicateWordResidue";
  readonly saturated: PredicateWordCarrier;
  readonly atomic: PredicateWordCarrier;
  readonly composites: readonly PredicateWord[];
}

/** Build a cell from subject, predicate, object. */
export const cellOf = (subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): Cell => ({ subject, predicate, object });

const inferenceRule = (
  morphism: InferenceMorphism,
  domain: PredicationBaseObject,
  codomain: PredicationBaseObject,
  trace: InferenceTraceCarrier = inferenceTrace([morphism]),
): InferenceRule => Object.freeze({ kind: "typedTheory.inferenceRule" as const, domain, trace, codomain });

/** Frozen specialization inference morphism. */
export const specializationInferenceMorphism: SpecializationInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.specialization" as const });
/** Frozen converse inference morphism. */
export const converseInferenceMorphism: ConverseInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.converse" as const });
/** Frozen subject projection inference morphism. */
export const subjectProjectionInferenceMorphism: SubjectProjectionInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.subjectProjection" as const });
/** Frozen object projection inference morphism. */
export const objectProjectionInferenceMorphism: ObjectProjectionInferenceMorphism = Object.freeze({ kind: "typedTheory.inferenceMorphism.objectProjection" as const });

/** A frozen inference trace from a sequence of morphisms. */
export function inferenceTrace(morphisms: readonly InferenceMorphism[]): InferenceTraceCarrier {
  return Object.freeze({ kind: "typedTheory.inferenceTrace" as const, morphisms: Object.freeze([...morphisms]) });
}

/** Derive inference rules from predication data. */
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

/** Build a typed theory from a base category. */
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

/** Build a typed theory from predication data. */
export function theoryOfData(data: readonly PredicationDatum[]): TypedTheoryCarrier {
  const rules = inferenceRules(data);
  const objects: PredicationBaseObject[] = [];
  for (const rule of rules) {
    if (!objects.some((object) => baseObjectCoincides(object, rule.domain))) objects.push(rule.domain);
    if (!objects.some((object) => baseObjectCoincides(object, rule.codomain))) objects.push(rule.codomain);
  }
  return Object.freeze({ kind: "typedTheory.carrier" as const, objects: Object.freeze(objects), rules });
}

/** Compare two inference morphisms (by kind). */
export function inferenceMorphismIdentity(left: InferenceMorphism, right: InferenceMorphism): InferenceMorphismIdentityJudgment {
  return left.kind === right.kind
    ? Object.freeze({ kind: "typedTheory.inferenceMorphismIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "typedTheory.inferenceMorphismIdentity-obstruction" as const, left, right });
}

const inferenceMorphismsCoincide = (left: InferenceMorphism, right: InferenceMorphism): boolean =>
  inferenceMorphismIdentity(left, right).kind === "typedTheory.inferenceMorphismIdentity:witness";

const sameTrace = (left: InferenceTraceCarrier, right: InferenceTraceCarrier): boolean =>
  left.morphisms.length === right.morphisms.length && left.morphisms.every((morphism, index) => inferenceMorphismsCoincide(morphism, right.morphisms[index]!));

function inferenceRulesCoincide(left: InferenceRule, right: InferenceRule): boolean {
  return baseObjectCoincides(left.domain, right.domain) && baseObjectCoincides(left.codomain, right.codomain) && sameTrace(left.trace, right.trace);
}

/** Compare two inference rules (domain, codomain, trace). */
export function inferenceRuleIdentity(left: InferenceRule, right: InferenceRule): InferenceRuleIdentityJudgment {
  return inferenceRulesCoincide(left, right)
    ? Object.freeze({ kind: "typedTheory.inferenceRuleIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "typedTheory.inferenceRuleIdentity-obstruction" as const, left, right });
}

const sameGeneratedRule = (left: InferenceRule, right: InferenceRule): boolean =>
  baseObjectCoincides(left.domain, right.domain) && baseObjectCoincides(left.codomain, right.codomain);

const composeRule = (left: InferenceRule, right: InferenceRule): InferenceRule =>
  Object.freeze({
    kind: "typedTheory.inferenceRule" as const,
    domain: left.domain,
    trace: inferenceTrace([...left.trace.morphisms, ...right.trace.morphisms]),
    codomain: right.codomain,
  });

/** Close a set of inference rules under one round of composition. */
export function composeInferenceRules(rules: readonly InferenceRule[]): readonly InferenceRule[] {
  const out: InferenceRule[] = [...rules];
  for (const left of rules) {
    for (const right of rules) {
      if (!baseObjectCoincides(left.codomain, right.domain)) continue;
      const rule = composeRule(left, right);
      if (!out.some((existing) => sameGeneratedRule(existing, rule))) out.push(rule);
    }
  }
  return Object.freeze(out);
}

const sameGeneratedRuleSet = (left: readonly InferenceRule[], right: readonly InferenceRule[]): boolean =>
  left.length === right.length && left.every((rule) => right.some((other) => sameGeneratedRule(rule, other)));

/** The composition closure of a theory's rules (to a fixed point). */
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

const derivationSearchWitness = (theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject, derivation: Derivation): DerivationSearchWitness =>
  Object.freeze({ kind: "typedTheory.derivationSearch:witness" as const, theory, premise, conclusion, derivation });

const derivationSearchObstruction = (theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject, explored: readonly PredicationBaseObject[]): DerivationSearchObstruction =>
  Object.freeze({ kind: "typedTheory.derivationSearch-obstruction" as const, theory, premise, conclusion, explored: Object.freeze([...explored]), rank: count(explored) });

/** Breadth-first search for a derivation from premise to conclusion. */
export function derive(theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject): DerivationSearchJudgment {
  if (baseObjectCoincides(premise, conclusion)) {
    const derivation = Object.freeze({ kind: "typedTheory.derivation" as const, theory, premise, conclusion, steps: Object.freeze([]), length: natZero });
    return derivationSearchWitness(theory, premise, conclusion, derivation);
  }
  const queue: Array<{ readonly object: PredicationBaseObject; readonly steps: readonly DerivationStep[] }> = [{ object: premise, steps: [] }];
  const seen: PredicationBaseObject[] = [premise];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    for (const rule of theory.rules.filter((candidate) => baseObjectCoincides(candidate.domain, current.object))) {
      if (seen.some((object) => baseObjectCoincides(object, rule.codomain))) continue;
      const step = Object.freeze({ kind: "typedTheory.derivationStep" as const, premise: current.object, rule, conclusion: rule.codomain });
      const steps = Object.freeze([...current.steps, step]);
      if (baseObjectCoincides(rule.codomain, conclusion)) {
        const derivation = Object.freeze({ kind: "typedTheory.derivation" as const, theory, premise, conclusion, steps, length: count(steps) });
        return derivationSearchWitness(theory, premise, conclusion, derivation);
      }
      seen.push(rule.codomain);
      queue.push({ object: rule.codomain, steps });
    }
  }
  return derivationSearchObstruction(theory, premise, conclusion, seen);
}

/** Search for a derivation in the theory built from a base category. */
export function deriveInBase(base: BaseCategory, premise: PredicationBaseObject, conclusion: PredicationBaseObject): DerivationSearchJudgment {
  return derive(theoryOfBase(base), premise, conclusion);
}

/** Judge whether a conclusion is derivable from a premise. */
export function typing(theory: TypedTheoryCarrier, premise: PredicationBaseObject, conclusion: PredicationBaseObject): TypingJudgment {
  const search = derive(theory, premise, conclusion);
  return search.kind === "typedTheory.derivationSearch:witness"
    ? Object.freeze({ kind: "typedTheory.typing:witness" as const, theory, premise, conclusion, derivation: search.derivation })
    : Object.freeze({ kind: "typedTheory.typing-obstruction" as const, theory, premise, conclusion, search });
}

/** Check that each step of a derivation is justified by a theory rule. */
export function derivationValidity(theory: TypedTheoryCarrier, derivation: Derivation): DerivationCheckJudgment {
  let current = derivation.premise;
  for (const step of derivation.steps) {
    const generated = theory.rules.some((rule) =>
      inferenceRulesCoincide(rule, step.rule)
      && baseObjectCoincides(step.premise, current)
      && baseObjectCoincides(rule.domain, current)
      && baseObjectCoincides(rule.codomain, step.conclusion));
    if (!generated) return Object.freeze({ kind: "typedTheory.derivation-obstruction" as const, theory, at: current, step });
    current = step.conclusion;
  }
  return Object.freeze({ kind: "typedTheory.derivationCheck:witness" as const, theory, derivation });
}

/** Compare two derivations. */
export function derivationIdentity(left: Derivation, right: Derivation): DerivationIdentityJudgment {
  const same = baseObjectCoincides(left.premise, right.premise)
    && baseObjectCoincides(left.conclusion, right.conclusion)
    && left.steps.length === right.steps.length
    && left.steps.every((step, index) => {
      const other = right.steps[index]!;
      return inferenceRulesCoincide(step.rule, other.rule) && baseObjectCoincides(step.conclusion, other.conclusion);
    });
  return same
    ? Object.freeze({ kind: "typedTheory.derivationIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "typedTheory.derivationIdentity-obstruction" as const, left, right });
}

/** Build a proof carrier for a theory (typing judgment for every generated rule). */
export function typedTheoryProofCarrier(theory: TypedTheoryCarrier): TypedTheoryProofCarrier {
  const closure = derivationClosure(theory);
  const judgments = Object.freeze(closure.generated.map((rule) => typing(closure.theory, rule.domain, rule.codomain)));
  const obstructions = Object.freeze(judgments.filter((item): item is TypingJudgmentObstruction => item.kind === "typedTheory.typing-obstruction"));
  return Object.freeze({ kind: "typedTheory.proof.carrier" as const, theory: closure.theory, closure, judgments, obstructions, rank: count(judgments) });
}

/** A predicate word arrow with a single-predicate word. */
export function predicateWordArrow(subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): PredicateWordArrow {
  return Object.freeze({ kind: "typedTheory.predicateWordArrow" as const, subject, word: Object.freeze([predicate] as const), object });
}

const predicateWordCarrier = (arrows: readonly PredicateWordArrow[]): PredicateWordCarrier =>
  Object.freeze({ kind: "typedTheory.predicateWord.carrier" as const, arrows: Object.freeze(arrows) });

const samePredicateWord = (left: PredicateWord, right: PredicateWord): boolean =>
  left.length === right.length && left.every((predicate, index) => predicateCoincides(predicate, right[index]!));

const samePredicateWordArrow = (left: PredicateWordArrow, right: PredicateWordArrow): boolean =>
  termCoincides(left.subject, right.subject) && samePredicateWord(left.word, right.word) && termCoincides(left.object, right.object);

const atomicPredicateWord = (arrow: PredicateWordArrow): boolean => arrow.word.length === 1;

/** Close a predicate word carrier under composition. */
export function composePredicateWords(input: PredicateWordCarrier): PredicateWordCarrier {
  const arrows: PredicateWordArrow[] = [...input.arrows];
  for (let leftIndex = 0; leftIndex < input.arrows.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < input.arrows.length; rightIndex += 1) {
      if (leftIndex === rightIndex) continue;
      const left = input.arrows[leftIndex]!;
      const right = input.arrows[rightIndex]!;
      if (!termCoincides(left.object, right.subject)) continue;
      const composite = Object.freeze({ kind: "typedTheory.predicateWordArrow" as const, subject: left.subject, word: Object.freeze([...left.word, ...right.word]), object: right.object });
      if (!arrows.some((arrow) => samePredicateWordArrow(arrow, composite))) arrows.push(composite);
    }
  }
  return predicateWordCarrier(arrows);
}

/** Compose the arrows of a predicate word potential. */
export function composePredicateWordPotential(input: PredicateWordPotential): PredicateWordPotential {
  const composed = composePredicateWords(Object.freeze({ kind: "typedTheory.predicateWord.carrier" as const, arrows: input.potential }));
  return Object.freeze({ kind: "typedTheory.predicateWordPotential" as const, potential: composed.arrows });
}

/** Filter a predicate word carrier to its atomic (length-one) arrows. */
export function atomicPredicateWords(input: PredicateWordCarrier): PredicateWordCarrier {
  return predicateWordCarrier(input.arrows.filter(atomicPredicateWord));
}

/** The predicate word residue: saturated, atomic, and composite words. */
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
