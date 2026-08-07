/**
 * Session types as propositions — the Caires-Pfenning correspondence.
 *
 * Corpus (concurrent-game-system journal, ~line 256; Caires-Pfenning 2010,
 * "Session Types as Intuitionistic Linear Propositions"; Wadler 2012,
 * "Propositions as Sessions"): a session type $S$ on a channel corresponds to a
 * CLL formula, a session-typed process $P \vdash x : S$ to a CLL proof, and
 * channel communication to cut-elimination. This package's `Proposition` carrier
 * is CLASSICAL (par + involutive `dualProp`), so we read the correspondence in
 * Wadler's classical convention: receive is $A^\perp \parr B$ (the intuitionistic
 * $A \multimap B$ of the corpus snippet, displayed there as $\multimap$).
 *
 * The map (a pure function `propositionOfSession`):
 *   - `send` (output $A$, continue $B$)       ↦ $A \otimes B$   (corpus: $A \otimes B$)
 *   - `recv` (input $A$, continue $B$)        ↦ $A^\perp \parr B$ (corpus: $A \multimap B$)
 *   - `select` (internal choice of branches)  ↦ $\bigoplus$       (Opponent's choice $\oplus$)
 *   - `offer`  (external choice of branches)  ↦ $\binampersand$   (Player's choice $\&$)
 *   - `end`   (close)                         ↦ $1$
 *   - `wait`  (wait for close)                ↦ $\bot$
 *   - `server` (replicated provider)          ↦ $!A$
 *   - `client` (replicated requester)         ↦ $?A$
 *
 * The correspondence is full and faithful (corpus sub-theorem): we realize only
 * the type-level half — the structural map of session vocabulary to connectives.
 * Endpoint duality is the CLL linear negation: send/receive, select/offer,
 * server/client, and close/wait are dual pairs.
 */
import {
  type Proposition,
  bottom,
  dualProp,
  ofCourse,
  one,
  par,
  plus,
  samePropositions,
  tensor,
  top,
  whyNot,
  withProp,
  zero,
} from "./proposition.mjs";

/**
 * A session type — the vocabulary of session-typed concurrency. `send`/`recv`
 * carry a payload and a continuation; `select`/`offer` carry labelled branches;
 * `end` is the terminated session; `server`/`client` are the replicated
 * exponentials.
 */
export type SessionType =
  | { readonly kind: "game.logic.session.end" }
  | { readonly kind: "game.logic.session.wait" }
  | { readonly kind: "game.logic.session.send"; readonly payload: SessionType; readonly continuation: SessionType }
  | { readonly kind: "game.logic.session.recv"; readonly payload: SessionType; readonly continuation: SessionType }
  | { readonly kind: "game.logic.session.select"; readonly branches: readonly SessionType[] }
  | { readonly kind: "game.logic.session.offer"; readonly branches: readonly SessionType[] }
  | { readonly kind: "game.logic.session.server"; readonly body: SessionType }
  | { readonly kind: "game.logic.session.client"; readonly body: SessionType };

export const sessionEnd = (): SessionType => Object.freeze({ kind: "game.logic.session.end" as const });

export const sessionWait = (): SessionType => Object.freeze({ kind: "game.logic.session.wait" as const });

export const sessionSend = (payload: SessionType, continuation: SessionType): SessionType =>
  Object.freeze({ kind: "game.logic.session.send" as const, payload, continuation });

export const sessionRecv = (payload: SessionType, continuation: SessionType): SessionType =>
  Object.freeze({ kind: "game.logic.session.recv" as const, payload, continuation });

export const sessionSelect = (branches: readonly SessionType[]): SessionType =>
  Object.freeze({ kind: "game.logic.session.select" as const, branches: Object.freeze([...branches]) });

export const sessionOffer = (branches: readonly SessionType[]): SessionType =>
  Object.freeze({ kind: "game.logic.session.offer" as const, branches: Object.freeze([...branches]) });

export const sessionServer = (body: SessionType): SessionType =>
  Object.freeze({ kind: "game.logic.session.server" as const, body });

export const sessionClient = (body: SessionType): SessionType =>
  Object.freeze({ kind: "game.logic.session.client" as const, body });

/**
 * The Caires-Pfenning map from a session type to its CLL proposition. Pure and
 * total. `select`/`offer` over branches fold with $\oplus$/$\&$; an empty
 * `select` is $0$ (unit of $\oplus$) and an empty `offer` is $\top$ (unit of
 * $\&$) by the standard nullary-choice convention.
 */
export function propositionOfSession(session: SessionType): Proposition {
  switch (session.kind) {
    case "game.logic.session.end":
      return one();
    case "game.logic.session.wait":
      return bottom();
    case "game.logic.session.send":
      return tensor(propositionOfSession(session.payload), propositionOfSession(session.continuation));
    case "game.logic.session.recv":
      return par(dualProp(propositionOfSession(session.payload)), propositionOfSession(session.continuation));
    case "game.logic.session.select":
      return foldBranches(session.branches, plus, "zero");
    case "game.logic.session.offer":
      return foldBranches(session.branches, withProp, "top");
    case "game.logic.session.server":
      return ofCourse(propositionOfSession(session.body));
    case "game.logic.session.client":
      return whyNot(propositionOfSession(session.body));
  }
}

function foldBranches(
  branches: readonly SessionType[],
  combine: (left: Proposition, right: Proposition) => Proposition,
  emptyUnit: "zero" | "top",
): Proposition {
  if (branches.length === 0) {
    // standard nullary convention: empty internal choice = 0, empty external = top
    return emptyUnit === "zero" ? zero() : top();
  }
  const head = propositionOfSession(branches[0]!);
  return branches.slice(1).reduce<Proposition>((accumulator, branch) => combine(accumulator, propositionOfSession(branch)), head);
}

/**
 * Endpoint duality for session protocols. The payload type is the message type
 * and is not dualized when send/receive swap; the continuation is the peer
 * endpoint and is dualized.
 */
export function dualSession(session: SessionType): SessionType {
  switch (session.kind) {
    case "game.logic.session.end":
      return sessionWait();
    case "game.logic.session.wait":
      return sessionEnd();
    case "game.logic.session.send":
      return sessionRecv(session.payload, dualSession(session.continuation));
    case "game.logic.session.recv":
      return sessionSend(session.payload, dualSession(session.continuation));
    case "game.logic.session.select":
      return sessionOffer(session.branches.map(dualSession));
    case "game.logic.session.offer":
      return sessionSelect(session.branches.map(dualSession));
    case "game.logic.session.server":
      return sessionClient(dualSession(session.body));
    case "game.logic.session.client":
      return sessionServer(dualSession(session.body));
  }
}

/** Structural equality of session types. */
export function sameSessionTypes(left: SessionType, right: SessionType): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "game.logic.session.end":
    case "game.logic.session.wait":
      return true;
    case "game.logic.session.send":
    case "game.logic.session.recv": {
      const r = right as typeof left;
      return sameSessionTypes(left.payload, r.payload)
        && sameSessionTypes(left.continuation, r.continuation);
    }
    case "game.logic.session.select":
    case "game.logic.session.offer": {
      const r = right as typeof left;
      return left.branches.length === r.branches.length
        && left.branches.every((branch, index) => sameSessionTypes(branch, r.branches[index]!));
    }
    case "game.logic.session.server":
    case "game.logic.session.client": {
      const r = right as typeof left;
      return sameSessionTypes(left.body, r.body);
    }
  }
}

export interface SessionDualityWitness {
  readonly kind: "game.logic.sessionDuality:witness";
  readonly session: SessionType;
  readonly dual: SessionType;
  readonly proposition: Proposition;
  readonly dualProposition: Proposition;
}

export interface SessionDualityObstruction {
  readonly kind: "game.logic.sessionDuality-obstruction";
  readonly session: SessionType;
  readonly dual: SessionType;
  readonly proposition: Proposition;
  readonly dualProposition: Proposition;
  readonly reason: string;
}

export type SessionDualityJudgment = SessionDualityWitness | SessionDualityObstruction;

/** Witness that `dualSession` maps to CLL linear negation under `propositionOfSession`. */
export function sessionDualityJudgment(session: SessionType): SessionDualityJudgment {
  const proposition = propositionOfSession(session);
  const dual = dualSession(session);
  const dualProposition = propositionOfSession(dual);
  return samePropositions(dualProposition, dualProp(proposition))
    ? Object.freeze({
        kind: "game.logic.sessionDuality:witness" as const,
        session,
        dual,
        proposition,
        dualProposition,
      })
    : Object.freeze({
        kind: "game.logic.sessionDuality-obstruction" as const,
        session,
        dual,
        proposition,
        dualProposition,
        reason: "session dual does not map to CLL linear negation",
      });
}

export interface SessionCompatibilityWitness {
  readonly kind: "game.logic.sessionCompatibility:witness";
  readonly left: SessionType;
  readonly right: SessionType;
  readonly cut: Proposition;
}

export interface SessionCompatibilityObstruction {
  readonly kind: "game.logic.sessionCompatibility-obstruction";
  readonly left: SessionType;
  readonly right: SessionType;
  readonly expectedRight: SessionType;
  readonly reason: string;
}

export type SessionCompatibilityJudgment =
  | SessionCompatibilityWitness
  | SessionCompatibilityObstruction;

/**
 * Channel compatibility: two endpoints can communicate exactly when one is the
 * dual of the other. The `cut` proposition records the CLL cut boundary
 * `A ⊗ A^⊥`, the proof-theoretic side of channel composition.
 */
export function sessionCompatibilityJudgment(left: SessionType, right: SessionType): SessionCompatibilityJudgment {
  const expectedRight = dualSession(left);
  if (!sameSessionTypes(right, expectedRight)) {
    return Object.freeze({
      kind: "game.logic.sessionCompatibility-obstruction" as const,
      left,
      right,
      expectedRight,
      reason: "right endpoint is not the dual session of left",
    });
  }
  return Object.freeze({
    kind: "game.logic.sessionCompatibility:witness" as const,
    left,
    right,
    cut: tensor(propositionOfSession(left), propositionOfSession(right)),
  });
}

export interface SessionCorrespondenceWitness {
  readonly kind: "game.logic.sessionCorrespondence:witness";
  readonly session: SessionType;
  readonly proposition: Proposition;
}

/**
 * Witness the Caires-Pfenning correspondence for a given session type: the
 * session and its CLL proposition image, paired. Always a witness (the map is
 * total); the carrier records the realized correspondence.
 */
export function sessionCorrespondence(session: SessionType): SessionCorrespondenceWitness {
  return Object.freeze({
    kind: "game.logic.sessionCorrespondence:witness" as const,
    session,
    proposition: propositionOfSession(session),
  });
}

export function isSessionType(value: unknown): value is SessionType {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { readonly kind?: unknown };
  return typeof candidate.kind === "string" && candidate.kind.startsWith("game.logic.session.");
}
