/**
 * The Caires-Pfenning session-typed paradigm $\mathbf{CGS}_{\mathrm{CLL}}$ —
 * session-typed concurrency (the session $\pi$-calculus) as a full
 * sub-$*$-autonomous-category of $\mathbf{CGS}$, with cut-elimination = channel
 * communication = strategy composition.
 *
 * `games/logic/embeddings.mts::cairesPfenning` names the cut: arenas
 * corresponding to classical-linear-logic propositions (the CLL fragment), with
 * the object-map the reused `propositionOfSession`. This module makes membership
 * *executable*: a session type is in the paradigm iff the CLL proposition it maps
 * to actually lies in the CLL fragment of the fragment lattice — checked via the
 * reused `inFragment(·, "CLL")` classifier (`games/logic/fragment.mts`). No
 * connective set is re-encoded; the games proof layer decides fragment membership
 * and we read off the verdict.
 *
 * The session $\mapsto$ proposition $\mapsto$ fragment pipeline is the whole
 * content of the embedding's object component, run end-to-end on real carriers.
 */
import {
  type Embedding,
  type Proposition,
  type SessionType,
  cairesPfenning,
  classifyFragment,
  inFragment,
  propositionOfSession,
  sessionDualityJudgment,
  type SessionDualityJudgment,
} from "@emsenn/gaming";

export interface SessionWitness {
  readonly kind: "computing.paradigm.session:witness";
  readonly session: SessionType;
  /** The CLL proposition the session maps to (object-map image). */
  readonly proposition: Proposition;
  /** The tightest fragment the proposition inhabits (≤ CLL). */
  readonly fragment: string;
  /** Endpoint duality checked against CLL linear negation. */
  readonly duality: SessionDualityJudgment;
}

export interface SessionObstruction {
  readonly kind: "computing.paradigm.session-obstruction";
  readonly session: SessionType;
  readonly proposition: Proposition;
  readonly fragment: string;
  readonly duality: SessionDualityJudgment;
  readonly reason: string;
}

export type SessionJudgment = SessionWitness | SessionObstruction;

/**
 * Membership of a session type in the Caires-Pfenning sub-category: its image
 * under `propositionOfSession` lies in the CLL fragment. The proposition and its
 * tightest fragment are recorded; `inFragment(·, "CLL")` is the reused decider.
 * (Every session type's image is in CLL by construction, so this is a witness in
 * practice — but the check is real, run on the actual proposition carrier, and an
 * out-of-fragment proposition would obstruct.)
 */
export function sessionMembership(session: SessionType): SessionJudgment {
  const proposition = propositionOfSession(session);
  const tightest = classifyFragment(proposition).name;
  const duality = sessionDualityJudgment(session);
  const judgment = inFragment(proposition, "CLL");
  if (judgment.kind === "game.logic.inFragment:witness"
    && duality.kind === "game.logic.sessionDuality:witness") {
    return Object.freeze({
      kind: "computing.paradigm.session:witness" as const,
      session,
      proposition,
      fragment: tightest,
      duality,
    });
  }
  const reason = judgment.kind === "game.logic.inFragment:witness"
    ? "session duality does not map to CLL linear negation"
    : `session image is not in the CLL fragment: ${judgment.reason}`;
  return Object.freeze({
    kind: "computing.paradigm.session-obstruction" as const,
    session,
    proposition,
    fragment: tightest,
    duality,
    reason,
  });
}

/** Whether a session type is a Caires-Pfenning (CLL) game. */
export const isSession = (session: SessionType): boolean =>
  sessionMembership(session).kind === "computing.paradigm.session:witness";

/** The object-map of the embedding, reused verbatim: a session type to its CLL proposition. */
export const propositionOfSessionType = (session: SessionType): Proposition => propositionOfSession(session);

/** The reused `games/logic` embedding carrier naming $\mathbf{CGS}_{\mathrm{CLL}} \hookrightarrow \mathbf{CGS}$. */
export const sessionEmbedding = (): Embedding => cairesPfenning();
