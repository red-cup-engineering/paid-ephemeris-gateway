/**
 * The observation map — `settled information → CGS arena`, the first leg of the
 * SPOTCOMP pipeline (`cgs/specification.md` §1).
 *
 * A relationality *settled meme* is a predication cell paired with the charge it
 * settled to. The observation map turns a frontier of settled memes into a
 * polarized prime event structure — a CGS `Arena` — using the load-bearing
 * identity that **a polarity IS a charge value** (`games/src/algebra/polarity.mts`,
 * `chargePolarity`): the double-negation image of the effective-topos subobject
 * classifier lands in Belnap FOUR, and
 *
 *   - charge `potential` $= t = (1,0)$ commits **Player** (positive);
 *   - charge `active`    $= f = (0,1)$ commits **Opponent** (negative);
 *   - charge `absurd`/`stable` commit *no* polarity — a settled cell that is
 *     inconsistent or fully-told is not a move. Per spec §2 ("conflict is not the
 *     same as bilattice inconsistency") and §3, these are kept as *audit
 *     evidence* in the provenance, NOT forced into event-structure conflict.
 *
 * Causality (the settlement-frontier ordering) is supplied by the caller as
 * explicit dependency edges between cell ids — the spec is explicit that a finite
 * event table presents an arena only with its upstream obligations, so the
 * observation map does not *invent* an order it cannot derive from the carrier;
 * it takes the frontier's declared dependencies (default: none — all concurrent).
 *
 * Two entry points: `observe` takes settled `(cell, charge)` pairs the caller has
 * already read; `observeReading` takes a live `MemeTopologyFixedPointReading` —
 * what relationality's descent settles utterances into — and reads each cell's
 * charge through the package's own `readCharge`/`valueOf` verbs. Charge is always
 * *read* from the settled topology, never admitted (relationality's contract).
 */
import {
  type Arena,
  type Event,
  type EventPair,
  type Polarity,
  arena,
  chargePolarity,
  event,
  eventStructure,
} from "@emsenn/gaming";
import {
  cell,
  chargeValue,
  claim,
  mark,
  predicateOfClaim,
  token,
  valueOf,
  type Cell,
  type ChargeValue,
  type ChargeValueName,
} from "@emsenn/relating";
import {
  type MemeTopologyFixedPointReading,
  readCharge,
} from "@emsenn/relating";
import { type DerivationProvenance, derivationProvenance } from "./provenance.mjs";

/**
 * A settled meme: a predication `Cell` paired with the `ChargeValue` it settled
 * to — the unit the observation frontier delivers (relationality's settled cell
 * read, on the surfaced `Cell`/`ChargeValue` carriers).
 */
export interface SettledMeme {
  readonly cell: Cell;
  readonly charge: ChargeValue;
}

/** Build a settled meme from a cell and the charge it settled to. */
export const settledMeme = (cell: Cell, charge: ChargeValue): SettledMeme => Object.freeze({ cell, charge });

/**
 * A labeled finite outcome projected into the observation map. This is for
 * boundary packages that already have settled, named outcomes but should not
 * reconstruct the relationality cell machinery themselves.
 */
export interface LabeledSettledMemeInput {
  readonly id: string;
  readonly charge: ChargeValue | ChargeValueName;
  readonly predicate?: string;
  readonly object?: string;
}

const asChargeValue = (value: ChargeValue | ChargeValueName): ChargeValue =>
  typeof value === "string" ? chargeValue(value) : value;

/**
 * Promote a labeled outcome to a settled meme over the generic
 * `computing.observed-as` predicate. The label remains mark-opaque to the game
 * layer; `observe` decides whether its charge commits a polarity.
 */
export function labeledSettledMeme(input: LabeledSettledMemeInput): SettledMeme {
  const predicate = input.predicate ?? "computing.observed-as";
  const object = input.object ?? input.id;
  return settledMeme(
    cell(token(mark(input.id)), predicateOfClaim(claim(mark(predicate))), token(mark(object))),
    asChargeValue(input.charge),
  );
}

/**
 * Observe labeled finite outcomes by first promoting them to settled memes.
 * This is the parameterized boundary form of `observe`: callers supply labels
 * and charges; computing supplies the relational carrier shape and the
 * charge-to-polarity observation map.
 */
export function observeLabels(
  inputs: readonly LabeledSettledMemeInput[],
  options: { readonly causality?: readonly EventPair[]; readonly conflict?: readonly EventPair[] } = {},
): Observation {
  return observe(inputs.map(labeledSettledMeme), options);
}

/** Stringify a predication term/predicate via its underlying mark value. */
const termId = (term: { readonly mark: { readonly value: unknown } }): string => String(term.mark.value);

/** The stable event id of a settled cell: `subject|predicate|object`. */
export const cellEventId = (cell: Cell): string =>
  `${termId(cell.subject)}|${termId(cell.predicate)}|${termId(cell.object)}`;

/** The polarity a settled meme commits, or `null` for `absurd`/`stable` (no commitment). */
export const memePolarity = (meme: SettledMeme): Polarity | null => chargePolarity(meme.charge);

/** A settled CGS observation: the polarized arena and the finite-restriction provenance. */
export interface Observation {
  readonly kind: "computing.computer.observation";
  readonly arena: Arena;
  readonly provenance: DerivationProvenance;
}

/**
 * Admit an already presented CGS arena as an observation carrier.
 *
 * This is the script document composition boundary: upstream gaming may have
 * already decoded or admitted the arena. Computing should not re-observe that
 * carrier through synthetic labels; it preserves the arena and records its
 * event ids as the finite observed frontier.
 */
export function observeArena(a: Arena, auditedCells: readonly string[] = []): Observation {
  return Object.freeze({
    kind: "computing.computer.observation" as const,
    arena: a,
    provenance: derivationProvenance(a.structure.events.map((event: Event) => event.id), auditedCells),
  });
}

/**
 * The observation map. Each settled meme that commits a polarity becomes one
 * polarized event (id = `cellEventId`); memes committing no polarity are recorded
 * as audited cells in the provenance. `causality` is the settlement-frontier
 * dependency relation between event ids (default none); conflicts may be supplied
 * the same way when the game declares a play cannot contain both events (spec §2).
 */
export function observe(
  memes: readonly SettledMeme[],
  options: { readonly causality?: readonly EventPair[]; readonly conflict?: readonly EventPair[] } = {},
): Observation {
  const events = [];
  const observedEvents: string[] = [];
  const auditedCells: string[] = [];
  for (const meme of memes) {
    const id = cellEventId(meme.cell);
    const pol = memePolarity(meme);
    if (pol === null) {
      auditedCells.push(id);
      continue;
    }
    events.push(event(id, pol));
    observedEvents.push(id);
  }
  const present = new Set(observedEvents);
  // keep only dependency/conflict edges whose endpoints are both observed events.
  const keep = (pair: EventPair): boolean => present.has(pair[0]) && present.has(pair[1]);
  const causality = (options.causality ?? []).filter(keep);
  const conflict = (options.conflict ?? []).filter(keep);
  const structure = eventStructure(Object.freeze([...events]), causality, conflict);
  return Object.freeze({
    kind: "computing.computer.observation" as const,
    arena: arena(structure),
    provenance: derivationProvenance(observedEvents, auditedCells),
  });
}

/**
 * The settled meme a fixed-point reading assigns to a cell: read the cell's
 * charge out of the reading's extremum section (`readCharge`) and classify it to
 * a `ChargeValue` (`valueOf`) — both relationality's own reading verbs, so the
 * charge is *read* from the settled topology, never admitted. This is the
 * contract-faithful bridge: a `MemeTopologyFixedPointReading` is what the
 * relationality descent settles to, and the observation map consumes it directly.
 */
export const settledMemeOfReading = (reading: MemeTopologyFixedPointReading, cell: Cell): SettledMeme =>
  settledMeme(cell, valueOf(readCharge(reading, cell)));

/**
 * The observation map run straight off a settled fixed-point reading: read each
 * cell's charge from the reading and observe the resulting settled frontier. The
 * loop is closed end-to-end — relationality settles utterances into a
 * `MemeTopologyFixedPointReading`, this reads each cell's charge with the
 * package's own `readCharge`/`valueOf`, and `observe` turns the charged frontier
 * into a polarized arena. The caller names which cells form the observation
 * frontier (the reading is total over its cells; an arena is a finite window).
 */
export function observeReading(
  reading: MemeTopologyFixedPointReading,
  cells: readonly Cell[],
  options: { readonly causality?: readonly EventPair[]; readonly conflict?: readonly EventPair[] } = {},
): Observation {
  return observe(cells.map((cell) => settledMemeOfReading(reading, cell)), options);
}

export function isObservation(value: unknown): value is Observation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Observation>;
  return candidate.kind === "computing.computer.observation";
}
