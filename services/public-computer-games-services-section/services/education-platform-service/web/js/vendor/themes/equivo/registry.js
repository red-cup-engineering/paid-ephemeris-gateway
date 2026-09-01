/**
 * Equivo's checker registry -- equivo-design.md §3/§5. Six kinds, one checker per row of the
 * design's exercise-type table; every checker calls the real, unmodified `@lenticule-science/metrologic`
 * pipeline the design's §5 worked examples were run against, never a hand-authored answer key.
 * An equivalence judgment the player makes IS a computation the math package verifies.
 *
 * `distinguish`/`relate` (A/B) are real checkers here too, not stubs, because the design's own
 * §3 table already gives them real checker calls (`articulate`, `predicate(articulate(...))`)
 * with "Strong" evidence -- equivo-design.md's MVP cut ships them as "gate/warm-up content
 * reusing the platform's existing card-generation rules" only because THIS platform kernel
 * doesn't (yet) vendor Lantern's `cards.mts` warm-up rules; wiring them as genuine checkers here
 * is strictly more faithful to §1's four-stage loop, not less, and costs nothing extra to grade
 * for real. `repair` (F) is implemented and tested per §3's honesty note (the checker itself is
 * "mechanically well-defined") but ships in NO corpus content -- equivo-design.md §8 defers it
 * from the launch curriculum because no fair "genuine repair vs. evasion" rule exists yet; see
 * `repairChecker`'s own comment for the disclosed heuristic this build does NOT claim solves that.
 */
import { articulate, predicate, posit, settle } from '@lenticule-science/metrologic/bilattice';
import { cohomologyOfRelation } from '@lenticule-science/metrologic/obstruction/cochain';
import { settling, classify, h1 } from '@lenticule-science/metrologic/obstruction/settling';
                                                                      

// ---------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------

/** The FOUR-valued bilattice charge names, `bilattice/src/charge.mjs`'s own table:
 * [F,F] absurd, [T,F] potential, [F,T] active, [T,T] stable. */
export function nameOfCharge(value                             )         {
  const [pos, neg] = value;
  if (!pos && !neg) return 'absurd';
  if (pos && !neg) return 'potential';
  if (!pos && neg) return 'active';
  return 'stable';
}

function deepEqual(a         , b         )          {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------------------
// A -- distinguish: articulate(utterance)
// ---------------------------------------------------------------------------------------

                                  
                                
 
                                    
                                
 

/** Player names the two atoms (token, claim) in a scenario, in order. The checker runs the real
 * `articulate` on the spec's utterance -- if it throws (malformed input), that itself is
 * diagnostic; otherwise the player's proposed `potential` pair must match exactly. */
export function distinguishChecker(spec                 , answer                   )          {
  let result                          ;
  try {
    result = articulate(spec.utterance);
  } catch (err) {
    return { pass: false, diagnosis: `the utterance itself is malformed: ${err instanceof Error ? err.message : String(err)}` };
  }
  const pass = deepEqual(result.potential, answer.potential);
  return {
    pass,
    diagnosis: pass
      ? `correct -- articulate witnesses [${result.potential.join(', ')}] as the potential`
      : `articulate witnesses [${result.potential.join(', ')}] as the potential; you answered [${answer.potential.join(', ')}]`,
  };
}

// ---------------------------------------------------------------------------------------
// B -- relate: predicate(articulate(utterance))
// ---------------------------------------------------------------------------------------

                             
                                
 
                               
                      
                        
 

/** Player builds the subject/predicate/object cell-set from a token+claim. The checker runs the
 * real `predicate(articulate(utterance))` and compares the resulting cell-set's entity-set and
 * predicate-set to the player's answer -- structural, not string, match. */
export function relateChecker(spec            , answer              )          {
  const category = predicate(articulate(spec.utterance));
  const cellSet = (category                                                                                                         )['cell-set'];
  const actual = { entities: cellSet['entity-set'].entities, predicates: cellSet['predicate-set'].predicates };
  const pass = deepEqual(actual.entities, answer.entities) && deepEqual(actual.predicates, answer.predicates);
  return {
    pass,
    diagnosis: pass
      ? `correct -- predicate witnesses entities=[${actual.entities.join(', ')}] predicates=[${actual.predicates.join(', ')}]`
      : `predicate witnesses entities=[${actual.entities.join(', ')}] predicates=[${actual.predicates.join(', ')}]; you answered entities=[${answer.entities.join(', ')}] predicates=[${answer.predicates.join(', ')}]`,
  };
}

// ---------------------------------------------------------------------------------------
// C -- measure: posit(predicate(articulate(utterance))), settled charge value
// ---------------------------------------------------------------------------------------

                              
                                
 
                                
                            
 

/** equivo-design.md §5.1, reproduced as the shipped checker verbatim (down to the settled-cell
 * read path). Player assigns a FOUR-value charge from evidence; the checker runs the real
 * descent (posit -> settle) and compares the settled cell's `charge.value` bits to the player's
 * claim. */
export function measureChecker(spec             , answer               )          {
  const category = posit(predicate(articulate(spec.utterance)));
  const settled = settle(category                                );
  const cell = (settled                                                                                                                                   )
    .sheaf.section['fiber-algebras'][0]?.assignments[0];
  if (!cell) return { pass: false, diagnosis: 'the descent produced no settled cell -- malformed spec' };
  const actual = cell.charge.value;
  const pass = actual[0] === answer.value[0] && actual[1] === answer.value[1];
  return {
    pass,
    diagnosis: pass
      ? `correct -- settles to [${actual}] (${nameOfCharge(actual)}), evidence positive=${JSON.stringify(cell.charge.evidence[0])}`
      : `the descent settles to [${actual}] (${nameOfCharge(actual)}), you answered [${answer.value}] (${nameOfCharge(answer.value)})`,
  };
}

// ---------------------------------------------------------------------------------------
// D -- settle/equivalence: cohomologyOfRelation(cells), H0.rank === 1
// ---------------------------------------------------------------------------------------

                               
                   
                     
                  
 
                             
                        
 
                               
                                                                   
 

/** equivo-design.md §5.2, reproduced as the shipped checker verbatim. Player claims whether a
 * proposed relation settles to one connected component (one equivalence class); the checker runs
 * the real `cohomologyOfRelation` and reads `H0.rank === 1` off the graph's own connectivity. */
export function settleChecker(spec            , answer              )          {
  const result = cohomologyOfRelation(spec.cells);
  const actuallyEquivalent = result.H0.rank === 1;
  const pass = actuallyEquivalent === answer.claim;
  return {
    pass,
    diagnosis: pass
      ? `correct -- H0 rank ${result.H0.rank} (${actuallyEquivalent ? 'one component, equivalent' : `${result.H0.rank} components, NOT equivalent`}), H1 rank ${result.H1.rank}`
      : `you claimed ${answer.claim ? 'equivalent' : 'not equivalent'}, but H0 rank is ${result.H0.rank} over ${result.entities.length} entities and ${spec.cells.length} cells -- it ${actuallyEquivalent ? 'DOES' : 'does NOT'} settle to one component`,
  };
}

// ---------------------------------------------------------------------------------------
// E -- observe/regime: classify(settling) + h1(settling)
// ---------------------------------------------------------------------------------------

                                    
                        
                  
 
                              
                              
                                     
 
                                
                 
                      
 

/** equivo-design.md §5.3, reproduced as the shipped checker verbatim. Player classifies a
 * settling's regime and whether H¹ vanishes; the checker runs the real `settling`/`classify`/`h1`
 * and compares both fields to the player's claim. */
export function observeChecker(spec             , answer               )          {
  const v = settling(spec.stages, spec.opts ?? {});
  const cls = classify(v);
  const obstruction = h1(v);
  const pass = answer.regime === cls.regime && answer.h1Vanishes === obstruction.vanishes;
  return {
    pass,
    diagnosis: pass
      ? `correct -- regime "${cls.regime}" at depth ${cls.depth}, H1 rank ${obstruction.rank} (vanishes=${obstruction.vanishes})`
      : `you answered regime="${answer.regime}" h1Vanishes=${answer.h1Vanishes}; the settling is actually regime="${cls.regime}" (depth ${cls.depth}), H1 rank ${obstruction.rank} (vanishes=${obstruction.vanishes})`,
  };
}

// ---------------------------------------------------------------------------------------
// F -- repair: re-run cohomologyOfRelation on the player's edited cells
// ---------------------------------------------------------------------------------------

                             
                        
 
                               
                                                        
 

/**
 * equivo-design.md §3's honesty note, implemented as designed and NOT softened: the checker is
 * mechanically well-defined (re-run `cohomologyOfRelation`, require `H1.rank === 0`), but "what
 * counts as a good repair" has no corpus-attested vocabulary. This build adds ONE disclosed,
 * admittedly weak heuristic against the trivial evasion the design calls out (deleting the
 * obstructing cell entirely): the player's edited entity set must be a SUPERSET of the original's
 * (a repair that removes an entity outright cannot be told apart from "avoided the disagreement
 * by erasing part of the question," so it is rejected). This does NOT solve "genuine repair vs.
 * evasion" in general -- equivo-design.md §8 defers type F from the launch curriculum for exactly
 * this reason, and no corpus content in this build ships a repair exercise. Kept here, tested,
 * disclosed, and unused in play -- the honest state the design doc itself describes.
 */
export function repairChecker(spec            , answer              )          {
  const before = cohomologyOfRelation(spec.cells);
  const after = cohomologyOfRelation(answer.cells);
  const beforeEntities = new Set(before.entities);
  const afterEntities = new Set(after.entities);
  const keptEveryEntity = [...beforeEntities].every((e) => afterEntities.has(e));
  const resolved = after.H1.rank === 0;
  const pass = resolved && keptEveryEntity;
  if (!resolved) {
    return { pass: false, diagnosis: `the edited relation still carries an obstruction: H1 rank ${after.H1.rank}` };
  }
  if (!keptEveryEntity) {
    return { pass: false, diagnosis: 'the obstruction is gone, but only because an original entity was deleted rather than reconciled -- see this checker\'s own disclosed limitation' };
  }
  return { pass: true, diagnosis: `repaired -- H1 rank now 0, every original entity retained (H0 rank ${after.H0.rank})` };
}

// ---------------------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------------------

export const equivoCheckers                  = {
  distinguish: distinguishChecker                           ,
  relate: relateChecker                           ,
  measure: measureChecker                           ,
  settle: settleChecker                           ,
  observe: observeChecker                           ,
  repair: repairChecker                           ,
};

/** The kinds this build actually authors corpus content for (equivo-design.md §8's MVP cut:
 * A/B as warm-up, C/D/E as the graded core; F deferred entirely). Exposed so the content
 * validator (test/content-validate.test.mts) can assert no room ships a `repair` exercise. */
export const MVP_KINDS                    = ['distinguish', 'relate', 'measure', 'settle', 'observe'];
